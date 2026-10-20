import { build } from 'esbuild'
import { readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bundled = await build({
  stdin: {
    contents: `export * as world from './lib/world-data'; export * as layout from './lib/city/layout'`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
})
const { world, layout: L } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`)
const { WORLD, TEXEL, TERRAIN, HOME_START, EMERGE_POINT, METEOR_SITE, ROCKS, CRATER, terrainAt, isWalkable, isBlockedByRock, createCollisionMap } = world

const standable = (x, y) => isWalkable(x - 20, y) && isWalkable(x + 20, y) && isWalkable(x - 20, y - 14) && isWalkable(x + 20, y - 14)

const STEP = 16
const SIDE = WORLD.width / STEP
const reached = new Uint8Array(SIDE * SIDE)
{
  const queue = [Math.floor(HOME_START[1] / STEP) * SIDE + Math.floor(HOME_START[0] / STEP)]
  reached[queue[0]] = 1
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head]
    const column = cell % SIDE
    const row = (cell - column) / SIDE
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = column + dx
      const r = row + dy
      if (c < 0 || r < 0 || c >= SIDE || r >= SIDE) continue
      const next = r * SIDE + c
      if (reached[next]) continue
      reached[next] = 2
      if (!standable(c * STEP + STEP / 2, r * STEP + STEP / 2)) continue
      reached[next] = 1
      queue.push(next)
    }
  }
}
const reachable = (x, y) => reached[Math.floor(y / STEP) * SIDE + Math.floor(x / STEP)] === 1
const reachableNear = (x, y, radius = 32) => {
  for (let dy = -radius; dy <= radius; dy += STEP) for (let dx = -radius; dx <= radius; dx += STEP) if (reachable(x + dx, y + dy)) return true
  return false
}
const reachedShare = reached.reduce((sum, value) => sum + (value === 1 ? 1 : 0), 0) / reached.length

const samples = (rect, step = 16) => {
  const points = []
  for (let y = rect.y + 2; y < rect.y + rect.h; y += step) for (let x = rect.x + 2; x < rect.x + rect.w; x += step) points.push([x, y])
  return points
}
const doors = L.BUILDINGS.map((b) => [b.x + (b.door ?? b.w / 2), b.y + b.h])
const lamps = L.PROPS.filter((p) => p.kind === 'lamp')
const bases = L.LANDMARKS.filter((l) => l.base)
const magicKinds = L.LANDMARKS.reduce((counts, l) => ({ ...counts, [l.kind]: (counts[l.kind] ?? 0) + 1 }), {})

let agree = 0
let compared = 0
for (let i = 0; i < 40000; i++) {
  const x = ((i * 7919) % WORLD.width) + 0.5
  const y = ((i * 104729) % WORLD.height) + 0.5
  const expected = L.BRIDGES.some((b) => x >= b.rect.x && x < b.rect.x + b.rect.w && y >= b.rect.y && y < b.rect.y + b.rect.h)
    ? TERRAIN.ground
    : L.isWater(x, y)
      ? TERRAIN.water
      : L.isLand(x, y)
        ? TERRAIN.ground
        : TERRAIN.forest
  const blockedExpected = expected !== TERRAIN.ground
  const blockedBaked = terrainAt(x, y) !== TERRAIN.ground
  compared++
  if (blockedExpected === blockedBaked) agree++
}

const { loadImage, createCanvas } = createRequire(path.join(root, 'package.json'))('@napi-rs/canvas')

const craterImage = await loadImage(path.join(root, 'public/game/assets/fx/crater.webp'))
const craterPixels = (() => {
  const canvas = createCanvas(craterImage.width, craterImage.height)
  const context = canvas.getContext('2d')
  context.drawImage(craterImage, 0, 0)
  return context.getImageData(0, 0, craterImage.width, craterImage.height).data
})()
const craterAlpha = (x, y) => {
  const cx = Math.floor(((x - CRATER.x) / CRATER.width) * craterImage.width)
  const cy = Math.floor(((y - CRATER.y) / CRATER.height) * craterImage.height)
  if (cx < 0 || cy < 0 || cx >= craterImage.width || cy >= craterImage.height) return 0
  return craterPixels[(cy * craterImage.width + cx) * 4 + 3] / 255
}
const campPoints = []
for (const tent of L.TENTS) {
  for (let y = tent.y - tent.h; y <= tent.y; y += 8) {
    const half = (tent.w / 2) * (0.25 + (0.75 * (y - (tent.y - tent.h))) / tent.h)
    for (let x = tent.x - half; x <= tent.x + half; x += 8) campPoints.push([x, y])
  }
}
for (let i = 0; i < 48; i++) {
  const angle = (i / 48) * Math.PI * 2
  campPoints.push([L.CAMPFIRE[0] + Math.cos(angle) * 256, L.CAMPFIRE[1] - 24 + Math.sin(angle) * 200])
}
const campHidden = campPoints.filter(([x, y]) => craterAlpha(x, y) > 0.9).length / campPoints.length

const tileDir = path.join(root, 'public/game', WORLD.map.folder)
const tiles = (await readdir(tileDir)).filter((file) => file.endsWith('.webp'))
const tileSize = WORLD.map.tile + WORLD.map.gutter * 2
const tileSizes = await Promise.all(tiles.map(async (file) => {
  const image = await loadImage(path.join(tileDir, file))
  return image.width === tileSize && image.height === tileSize
}))
const collisionMap = createCollisionMap()

const propFootprint = (prop) => {
  switch (prop.kind) {
    case 'bench-h':
      return { x: prop.x - 44, y: prop.y - 40, w: 88, h: 42 }
    case 'well':
      return { x: prop.x - 44, y: prop.y - 36, w: 88, h: 44 }
    case 'crates':
      return { x: prop.x - 32, y: prop.y - 72, w: 88, h: 72 }
    case 'barrels':
      return { x: prop.x - 32, y: prop.y - 44, w: 84, h: 46 }
    case 'cart':
      return { x: prop.x - 56, y: prop.y - 64, w: 144, h: 66 }
    default:
      return null
  }
}
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const inset = (rect, by) => ({ x: rect.x + by, y: rect.y + by, w: Math.max(1, rect.w - by * 2), h: Math.max(1, rect.h - by * 2) })
const furniture = L.PROPS.map((prop) => ({ prop, rect: propFootprint(prop) })).filter((entry) => entry.rect)
const fenceRects = L.FENCES.flatMap((fence) => {
  const rects = []
  for (let i = 0; i < fence.points.length - 1; i++) {
    const [ax, ay] = fence.points[i]
    const [bx, by] = fence.points[i + 1]
    rects.push(ay === by ? { x: Math.min(ax, bx), y: ay - 16, w: Math.abs(bx - ax), h: 16 } : { x: ax - 8, y: Math.min(ay, by) - 16, w: 16, h: Math.abs(by - ay) + 16 })
  }
  return rects
})
const outskirtsTargets = [
  ['Praça da Vila do Riacho', L.VILLAGE_SQUARE],
  ['Encruzilhada dos Campos do Sul', L.FARM_CROSSING],
  ...L.RESTS.map((rest) => [rest.name, rest.center]),
  ['Ponte da Vila do Riacho', [9940, 6190]],
  ['Pomar dos Campos do Sul', [4000, 11040]],
  ['Açude dos Campos do Sul', [5540, 10960]],
]
const villageCorners = [
  [9000, 5200],
  [11300, 5200],
  [11400, 7600],
  [8700, 7600],
]

const checks = [
  ['O jogo começa em casa, em chão livre diante da porta', standable(...HOME_START)],
  ['Os Visitantes saem entre as duas metades do meteoro', standable(...EMERGE_POINT) && !isBlockedByRock(...EMERGE_POINT)],
  ['O meteoro cai dentro da clareira do acampamento', terrainAt(...METEOR_SITE) === TERRAIN.ground && L.isLand(...METEOR_SITE)],
  [`Depois do impacto nada do acampamento aparece fora da cratera (${(campHidden * 100).toFixed(1)}% coberto)`, campHidden === 1],
  ['As metades do meteoro bloqueiam a passagem', ROCKS.every((rock) => !isWalkable(rock.x, rock.y))],
  [
    'A floresta fechada ao redor da cidade, dos arredores e entre os bosques está bloqueada',
    [
      [200, 4000], [4000, 300], [8000, 4000], [4000, 8400], [7800, 800], [12000, 12000], [1000, 12000], [7600, 8600], ...villageCorners,
      [15800, 600], [15200, 3800], [15900, 10400], [12600, 9400], [8400, 12400], [10200, 14200], [8600, 15800], [600, 15800],
    ].every(([x, y]) => !isWalkable(x, y)),
  ],
  ['O canal, o lago, o riacho, o ribeirão da vila e o açude estão bloqueados', [[5520, 1500], [6360, 4400], [6440, 6100], [7700, 6300], [9400, 6210], [10600, 6230], [5900, 10950]].every(([x, y]) => !isWalkable(x, y))],
  ['As pontes são caminháveis e alcançáveis', L.BRIDGES.every((b) => reachable(b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2))],
  [`As trilhas levam a todos os arredores (${outskirtsTargets.map(([name]) => name).join(', ')})`, outskirtsTargets.every(([, [x, y]]) => reachableNear(x, y, 64))],
  ['Todo segredo escondido fica em chão alcançável', world.SECRET_SPOTS.every((spot) => reachableNear(spot.at[0], spot.at[1], 16))],
  ['Toda clareira secreta continua alcançável pela sua trilha', world.CLEARINGS.every((clearing) => reachableNear(clearing.relic[0], clearing.relic[1] + 60, 48))],
  ['O baú de cada acampamento da floresta pode ser vasculhado a pé', world.CAMPS.every((camp) => reachableNear(camp.cache[0], camp.cache[1] + 60, 48))],
  ['Bancos, poços, caixotes, barris e carroças não invadem prédios, cercas, barracas, água nem floresta', furniture.every(({ rect }) => L.BUILDINGS.every((b) => !overlaps(rect, b)) && fenceRects.every((f) => !overlaps(rect, f)) && L.STALLS.every((s) => !overlaps(rect, s)) && samples(rect, 8).every(([x, y]) => !L.isWater(x, y) && L.isLand(x, y)))],
  [
    'Postes e árvores não ficam em cima de bancos, poços, caixotes, barris e carroças',
    furniture.every(({ rect }) => {
      const near = { x: rect.x - 20, y: rect.y - 20, w: rect.w + 40, h: rect.h + 40 }
      const hits = (x, y) => x >= near.x && x <= near.x + near.w && y >= near.y && y <= near.y + near.h
      return lamps.every((lamp) => !hits(lamp.x, lamp.y)) && L.TREES.every((tree) => !hits(tree.x, tree.y))
    }),
  ],
  ['Campos de cultivo ficam em terra firme, fora de ruas, água e prédios', L.FIELDS.every((f) => samples(inset(f.rect, 24), 24).every(([x, y]) => L.isLand(x, y) && !L.isWater(x, y) && !L.isPaved(x, y)) && L.BUILDINGS.every((b) => !overlaps(f.rect, b)))],
  ['Canteiros de flores ficam em terra firme, fora da água e de prédios (podem beirar um caminho)', L.GARDENS.every((g) => samples(inset(g.rect, 12), 16).every(([x, y]) => L.isLand(x, y) && !L.isWater(x, y)) && L.BUILDINGS.every((b) => !overlaps(g.rect, b)))],
  [
    'A trilha liga a cratera à cidade inteira (praça, mercado, parque, lago, mirante, torre, moinhos)',
    [
      [L.PLAZA_CENTER[0], L.PLAZA_CENTER[1] + 300],
      [L.MARKET.x + L.MARKET.w / 2, L.MARKET.y + L.MARKET.h - 40],
      [L.LUME_PLAZA[0], L.LUME_PLAZA[1] + 160],
      [L.LOOKOUT[0], L.LOOKOUT[1]],
      [L.TOWER_GARDEN[0], L.TOWER_GARDEN[1] + 200],
      [2040, L.STREETS.pomar],
      [6200, 6930],
    ].every(([x, y]) => reachableNear(x, y)),
  ],
  ['Toda porta dá para rua, praça ou caminho alcançável', doors.every(([x, y]) => L.isPaved(x, y + 32) && reachableNear(x, y + 32))],
  ['Nenhum prédio invade rua, calçada, praça ou água', L.BUILDINGS.every((b) => samples(b).every(([x, y]) => !L.isPaved(x, y) && !L.isWater(x, y)))],
  ['Prédios alinhados à grade do desenho, sem rotação e sem sobreposição', L.BUILDINGS.every((b, i) => [b.x, b.y, b.w, b.h].every((v) => Number.isInteger(v / 4)) && L.BUILDINGS.every((o, j) => j <= i || b.x >= o.x + o.w || o.x >= b.x + b.w || b.y >= o.y + o.h || o.y >= b.y + b.h))],
  ['Nenhum prédio encosta na borda da floresta', L.BUILDINGS.every((b) => [[b.x - 48, b.y - 48], [b.x + b.w + 48, b.y - 48], [b.x - 48, b.y + b.h + 48], [b.x + b.w + 48, b.y + b.h + 48]].every(([x, y]) => L.isLand(x, y)))],
  [
    'Moinhos e torre ficam fora das calçadas; a árvore-lume é o centro da própria praça',
    bases.every((l) => (l.kind === 'lume-tree' ? Math.hypot(l.x - L.LUME_PLAZA[0], l.y - L.LUME_PLAZA[1]) < 40 : samples(l.base).every(([x, y]) => !L.isPaved(x, y)))),
  ],
  ['Postes ficam na calçada e longe das portas', lamps.every((p) => L.isPaved(p.x, p.y) && doors.every(([x, y]) => Math.hypot(p.x - x, p.y - y) > 70))],
  ['Árvores não nascem em calçadas, na água nem fora da cidade', L.TREES.every((t) => t.kind === 'lume' || (!L.isPaved(t.x, t.y, 40) && !L.isWater(t.x, t.y) && L.isLand(t.x, t.y)))],
  [
    'Poucos marcos mágicos, cada um único (fonte, lanternas, torre, ilhas, árvore-lume e até 5 moinhos)',
    L.LANDMARKS.length <= 10 && (magicKinds.windmill ?? 0) <= 5 && ['crystal-fountain', 'lanterns', 'ring-tower', 'islands', 'lume-tree'].every((kind) => magicKinds[kind] === 1),
  ],
  [`A colisão assada confere com o desenho (${((agree / compared) * 100).toFixed(1)}% das amostras)`, agree / compared > 0.98],
  [`Os ${WORLD.map.columns * WORLD.map.rows} tiles do mapa existem no tamanho certo`, tiles.length === WORLD.map.columns * WORLD.map.rows && tileSizes.every(Boolean)],
  ['O mapa em alta resolução cobre o mundo inteiro', WORLD.map.columns * WORLD.map.tile === WORLD.map.width && WORLD.map.width * TEXEL === WORLD.width && L.SIZE === WORLD.width],
  [`O mapa de colisão tem ${WORLD.rows} x ${WORLD.columns} células`, collisionMap.length === WORLD.rows && collisionMap.every((row) => row.length === WORLD.columns)],
  ['A área alcançável a pé fica entre 20% e 60% do mundo', reachedShare > 0.2 && reachedShare < 0.6],
]

let failed = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? 'ok ' : 'ERRO'}  ${label}`)
  if (!ok) failed++
}
console.log(`${checks.length - failed}/${checks.length} verificações passaram · ${(reachedShare * 100).toFixed(1)}% do mundo é alcançável a pé`)
process.exit(failed ? 1 : 0)
