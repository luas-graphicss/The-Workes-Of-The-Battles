import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))
const minW = Number(args.get('min-w') ?? 600)
const minH = Number(args.get('min-h') ?? 480)
const CELL = Number(args.get('cell') ?? 32)

const bundled = await build({
  stdin: { contents: `export * as layout from './lib/city/layout'`, resolveDir: root, loader: 'ts' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
})
const { layout: L } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)

const SIDE = L.SIZE / CELL
const inRect = (r, x, y, m = 0) => x >= r.x - m && x < r.x + r.w + m && y >= r.y - m && y < r.y + r.h + m
const landmarkRects = L.LANDMARKS.map((l) => L.landmarkSpriteRect(l)).filter(Boolean)

function blocked(x, y) {
  if (!L.isLand(x, y)) return true
  if (L.isWater(x, y)) return true
  if (L.isPaved(x, y, 8)) return true
  if (L.BUILDINGS.some((b) => inRect(b, x, y, 16))) return true
  if (L.STALLS.some((s) => inRect(s, x, y, 40))) return true
  if (L.FIELDS.some((f) => inRect(f.rect, x, y, 16))) return true
  if (L.GARDENS.some((g) => inRect(g.rect, x, y, 16))) return true
  if (L.TENTS.some((t) => Math.hypot(t.x - x, t.y - y) < 260)) return true
  if (landmarkRects.some((r) => inRect(r, x, y, 40))) return true
  if (L.LANDMARKS.some((l) => Math.hypot(l.x - x, l.y - y) < (l.kind === "islands" ? 0 : 220))) return true
  for (const fence of L.FENCES) {
    for (let i = 0; i < fence.points.length - 1; i++) {
      const [ax, ay] = fence.points[i]
      const [bx, by] = fence.points[i + 1]
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)))
      if (Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) < 40) return true
    }
  }
  for (const [dx, dy] of [[-64, 0], [64, 0], [0, -64], [0, 64]]) if (!L.isLand(x + dx, y + dy)) return true
  return false
}

const grid = new Uint8Array(SIDE * SIDE)
for (let r = 0; r < SIDE; r++) for (let c = 0; c < SIDE; c++) grid[r * SIDE + c] = blocked(c * CELL + CELL / 2, r * CELL + CELL / 2) ? 0 : 1

const needW = Math.ceil(minW / CELL)
const needH = Math.ceil(minH / CELL)
const taken = new Uint8Array(SIDE * SIDE)
const found = []
for (let r = 0; r < SIDE - needH; r++) {
  for (let c = 0; c < SIDE - needW; c++) {
    if (!grid[r * SIDE + c] || taken[r * SIDE + c]) continue
    let w = 0
    while (c + w < SIDE && grid[r * SIDE + c + w] && !taken[r * SIDE + c + w]) w++
    if (w < needW) continue
    let h = 0
    outer: while (r + h < SIDE) {
      for (let k = 0; k < w; k++) if (!grid[(r + h) * SIDE + c + k] || taken[(r + h) * SIDE + c + k]) break outer
      h++
    }
    if (h < needH) continue
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) taken[(r + yy) * SIDE + c + xx] = 1
    found.push({ x: c * CELL, y: r * CELL, w: w * CELL, h: h * CELL })
  }
}
found.sort((a, b) => b.w * b.h - a.w * a.h)
console.log(`Retângulos livres ≥ ${minW}x${minH} (célula ${CELL}):`)
for (const box of found.slice(0, 40)) {
  const nearest = L.PAVING.filter((p) => p.shape === 'stroke').map((p) => p.kind).join(',')
  console.log(`  x ${box.x}..${box.x + box.w}  y ${box.y}..${box.y + box.h}  (${box.w}x${box.h})`)
}
