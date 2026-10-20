export const HEART_ART = { width: 48, height: 80, anchorX: 24, anchorY: 76, coreX: 24, coreY: 35 } as const
export const CORE_SIZE = 18

const INK = '#07050d'
const STONE = ['#100b1c', '#1b142e', '#281f45', '#3a2d60', '#544483']
const VEIN = ['#4a2a96', '#8e62f0', '#c6a4ff', '#f6eeff']
const CORE = ['#3a0a33', '#8a1677', '#d6339f', '#ff6fd0', '#ffc2ef', '#fff6fd']
const EMBER = ['#2a0c10', '#5e1a1b', '#b03c27', '#ff9a52']

type Grid = (string | null)[][]

export type HeartSprites = {
  body: HTMLCanvasElement
  broken: HTMLCanvasElement
  cores: [HTMLCanvasElement, HTMLCanvasElement]
  roots: HTMLCanvasElement
  dome: HTMLCanvasElement
  beam: HTMLCanvasElement
  shards: HTMLCanvasElement[]
}

function grid(width: number, height: number): Grid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => null))
}

function put(target: Grid, x: number, y: number, color: string) {
  const px = Math.round(x)
  const py = Math.round(y)
  if (py < 0 || py >= target.length || px < 0 || px >= target[0].length) return
  target[py][px] = color
}

function get(target: Grid, x: number, y: number) {
  if (y < 0 || y >= target.length || x < 0 || x >= target[0].length) return null
  return target[y][x]
}

function rasterize(target: Grid): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = target[0].length
  canvas.height = target.length
  const context = canvas.getContext('2d')
  if (!context) return canvas
  for (let y = 0; y < target.length; y++) {
    for (let x = 0; x < target[y].length; x++) {
      const color = target[y][x]
      if (!color) continue
      context.fillStyle = color
      context.fillRect(x, y, 1, 1)
    }
  }
  return canvas
}

function outline(target: Grid, color = INK) {
  const marks: [number, number][] = []
  for (let y = 0; y < target.length; y++) {
    for (let x = 0; x < target[y].length; x++) {
      if (target[y][x]) continue
      if (get(target, x - 1, y) || get(target, x + 1, y) || get(target, x, y - 1) || get(target, x, y + 1)) marks.push([x, y])
    }
  }
  for (const [x, y] of marks) target[y][x] = color
}

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function curve(from: readonly [number, number], control: readonly [number, number], to: readonly [number, number], t: number): [number, number] {
  const u = 1 - t
  return [u * u * from[0] + 2 * u * t * control[0] + t * t * to[0], u * u * from[1] + 2 * u * t * control[1] + t * t * to[1]]
}

type Rib = { from: readonly [number, number]; control: readonly [number, number]; to: readonly [number, number]; base: number; tip: number; shade: number; side: -1 | 0 | 1 }

const RIBS: readonly Rib[] = [
  { from: [24, 64], control: [24, 40], to: [24, 5], base: 3.2, tip: 1, shade: 1, side: 0 },
  { from: [16, 65], control: [3, 38], to: [21, 9], base: 4.4, tip: 1.6, shade: 2, side: -1 },
  { from: [32, 65], control: [45, 38], to: [27, 9], base: 4.4, tip: 1.6, shade: 2, side: 1 },
]

function paintRib(target: Grid, rib: Rib, reach: number, mask?: Set<string>) {
  for (let step = 0; step <= 120; step++) {
    const t = (step / 120) * reach
    const [x, y] = curve(rib.from, rib.control, rib.to, t)
    const radius = (rib.base + (rib.tip - rib.base) * t) / 2
    for (let oy = -Math.ceil(radius); oy <= Math.ceil(radius); oy++) {
      for (let ox = -Math.ceil(radius); ox <= Math.ceil(radius); ox++) {
        if (ox * ox + oy * oy > radius * radius + 0.35) continue
        const lit = rib.side === 1 ? ox < -radius * 0.2 : ox < -radius * 0.25
        const shadow = ox > radius * 0.45
        const color = lit ? STONE[rib.shade + 1] : shadow ? STONE[Math.max(0, rib.shade - 1)] : STONE[rib.shade]
        put(target, x + ox, y + oy, color)
        mask?.add(`${Math.round(x + ox)},${Math.round(y + oy)}`)
      }
    }
  }
}

function paintBase(target: Grid, random: () => number, glowing: boolean) {
  const tops: number[] = []
  for (let x = 9; x <= 39; x++) {
    const across = (x - 24) / 15
    const dome = 59 + Math.pow(Math.abs(across), 1.6) * 9
    const tooth = x % 4 === 0 ? -2 - Math.round(random() * 2) : Math.round(random() * 1.4)
    tops.push(Math.round(dome + tooth))
  }
  for (let x = 9; x <= 39; x++) {
    const top = tops[x - 9]
    const across = (x - 9) / 30
    const bottom = 76 - Math.round(Math.pow(Math.abs(across - 0.5) * 2, 3) * 3)
    for (let y = top; y <= bottom; y++) {
      const depth = (y - top) / Math.max(1, bottom - top)
      const level = y === top ? 4 : across < 0.3 ? (depth < 0.5 ? 3 : 2) : across > 0.72 ? (depth < 0.3 ? 2 : 1) : depth < 0.25 ? 3 : depth > 0.75 ? 1 : 2
      put(target, x, y, STONE[level])
    }
    if (top < 60 && random() < 0.6) put(target, x, top + 1, STONE[4])
  }
  for (const [x, y, tall] of [
    [12, 64, 4],
    [36, 63, 5],
    [19, 61, 3],
    [30, 61, 3],
  ] as const) {
    for (let k = 0; k < tall; k++) {
      put(target, x, y - k, k === tall - 1 ? STONE[4] : STONE[2])
      if (k < tall - 2) put(target, x + 1, y - k, STONE[1])
    }
  }
  const veins = glowing ? VEIN : EMBER
  for (let branch = 0; branch < 5; branch++) {
    let x = 24 + (random() - 0.5) * 6
    let y = 62
    const drift = (branch - 2) * 0.9 + (random() - 0.5) * 0.6
    for (let step = 0; step < 14; step++) {
      put(target, x, y, step < 4 ? veins[3] : step < 9 ? veins[2] : veins[1])
      x += drift * (0.5 + random() * 0.6)
      y += 0.8 + random() * 0.5
      if (y > 76) break
    }
  }
}

function paintCrown(target: Grid, glowing: boolean) {
  for (let y = 0; y <= 9; y++) put(target, 24, y, y < 3 ? (glowing ? VEIN[3] : STONE[3]) : STONE[2])
  put(target, 23, 4, STONE[1])
  put(target, 25, 4, STONE[3])
  for (const [x, y] of [
    [18, 7],
    [17, 5],
    [30, 7],
    [31, 5],
  ] as const)
    put(target, x, y, STONE[2])
}

function paintNodes(target: Grid, glowing: boolean) {
  const colors = glowing ? VEIN : EMBER
  for (const rib of RIBS.slice(1)) {
    for (const t of [0.28, 0.52, 0.76]) {
      const [x, y] = curve(rib.from, rib.control, rib.to, t)
      put(target, x, y, colors[3])
      put(target, x + rib.side * -1, y, colors[2])
      put(target, x, y + 1, colors[1])
    }
  }
}

function paintRim(target: Grid) {
  for (let y = 18; y <= 52; y++) {
    for (let x = 10; x <= 38; x++) {
      if (!target[y][x]) continue
      const towardCore = x < 24 ? get(target, x + 1, y) === null : get(target, x - 1, y) === null
      if (!towardCore) continue
      const near = Math.abs(y - 35) < 11
      target[y][x] = near ? (y % 3 === 0 ? CORE[4] : CORE[3]) : CORE[2]
    }
  }
}

function paintBody(): HTMLCanvasElement {
  const random = seeded(7)
  const target = grid(HEART_ART.width, HEART_ART.height)
  paintRib(target, RIBS[0], 1)
  for (let y = 21; y <= 49; y++) {
    const half = Math.sin(((y - 21) / 28) * Math.PI) * 8
    for (let x = Math.round(24 - half); x <= Math.round(24 + half); x++) if (!target[y][x]) target[y][x] = y % 2 === 0 ? '#160c26' : '#1b1030'
  }
  paintRib(target, RIBS[1], 1)
  paintRib(target, RIBS[2], 1)
  paintBase(target, random, true)
  paintCrown(target, true)
  outline(target)
  paintRim(target)
  paintNodes(target, true)
  return rasterize(target)
}

function paintBroken(): HTMLCanvasElement {
  const random = seeded(11)
  const target = grid(HEART_ART.width, HEART_ART.height)
  const tilt = (rib: Rib, dx: number): Rib => ({ ...rib, control: [rib.control[0] + dx, rib.control[1] + 6], to: [rib.to[0] + dx * 2, rib.to[1] + 14] })
  paintRib(target, tilt(RIBS[0], 2), 0.58)
  paintRib(target, tilt(RIBS[1], -5), 0.46)
  paintRib(target, tilt(RIBS[2], 6), 0.34)
  for (const rib of [tilt(RIBS[0], 2), tilt(RIBS[1], -5), tilt(RIBS[2], 6)].map((entry, index) => ({ entry, reach: [0.58, 0.46, 0.34][index] }))) {
    const [x, y] = curve(rib.entry.from, rib.entry.control, rib.entry.to, rib.reach)
    put(target, x - 1, y - 1, STONE[3])
    put(target, x + 1, y - 2, STONE[2])
    put(target, x, y - 3, STONE[1])
    put(target, x, y, EMBER[3])
    put(target, x + 1, y + 1, EMBER[2])
  }
  paintBase(target, random, false)
  for (let index = 0; index < 10; index++) {
    const x = 6 + random() * 36
    const y = 66 + random() * 11
    put(target, x, y, random() < 0.3 ? CORE[1] : STONE[3])
    put(target, x + 1, y, STONE[1])
  }
  outline(target)
  for (let y = 40; y < 66; y++) {
    for (let x = 4; x < 44; x++) {
      if (target[y][x] === STONE[2] && random() < 0.05) target[y][x] = EMBER[2]
    }
  }
  return rasterize(target)
}

function paintCore(bright: boolean): HTMLCanvasElement {
  const size = CORE_SIZE
  const target = grid(size, size)
  const ramp = bright ? CORE.slice(1) : CORE.slice(0, 5)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * 2.5 - 1.25
      const y = 1.15 - ((py + 0.5) / size) * 2.5
      const value = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y
      if (value > 0) continue
      const light = Math.hypot(x + 0.42, y - 0.4)
      const shade = Math.hypot(x - 0.55, y + 0.55)
      const level = light < 0.32 ? 4 : light < 0.72 ? 3 : shade < 0.55 ? 1 : 2
      target[py][px] = ramp[Math.max(0, Math.min(ramp.length - 1, level))]
    }
  }
  outline(target, bright ? CORE[1] : CORE[0])
  target[4][5] = CORE[5]
  target[5][5] = CORE[5]
  target[4][6] = CORE[4]
  return rasterize(target)
}

function paintRoots(): HTMLCanvasElement {
  const width = 132
  const height = 60
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const random = seeded(23)
  const cx = width / 2
  const cy = height / 2
  for (let branch = 0; branch < 14; branch++) {
    const angle = (branch / 14) * Math.PI * 2 + random() * 0.3
    let x = cx
    let y = cy
    let heading = angle
    const length = 18 + random() * 34
    for (let step = 0; step < length; step++) {
      heading += (random() - 0.5) * 0.5
      x += Math.cos(heading)
      y += Math.sin(heading) * 0.5
      const fade = 1 - step / length
      context.fillStyle = `rgba(${step < 6 ? '246, 238, 255' : '198, 164, 255'}, ${0.25 + fade * 0.75})`
      context.fillRect(Math.round(x), Math.round(y), 1, 1)
      if (random() < 0.08 && step > 6) {
        let bx = x
        let by = y
        let bh = heading + (random() < 0.5 ? 0.9 : -0.9)
        for (let k = 0; k < 8; k++) {
          bh += (random() - 0.5) * 0.4
          bx += Math.cos(bh)
          by += Math.sin(bh) * 0.5
          context.fillStyle = `rgba(142, 98, 240, ${0.6 * (1 - k / 8) * fade})`
          context.fillRect(Math.round(bx), Math.round(by), 1, 1)
        }
      }
    }
  }
  return canvas
}

function paintDome(): HTMLCanvasElement {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const cx = size / 2
  const cy = size / 2
  const rx = size * 0.46
  const ry = size * 0.46
  const fill = context.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx)
  fill.addColorStop(0, 'rgba(180, 120, 255, 0)')
  fill.addColorStop(0.72, 'rgba(180, 120, 255, 0.08)')
  fill.addColorStop(0.94, 'rgba(214, 170, 255, 0.42)')
  fill.addColorStop(1, 'rgba(214, 170, 255, 0)')
  context.fillStyle = fill
  context.beginPath()
  context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  context.fill()
  context.save()
  context.beginPath()
  context.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2)
  context.clip()
  context.strokeStyle = 'rgba(214, 180, 255, 0.22)'
  context.lineWidth = 1.2
  const hex = 15
  for (let row = -10; row <= 10; row++) {
    for (let column = -10; column <= 10; column++) {
      const hx = cx + column * hex * 1.5
      const hy = cy + row * hex * 1.732 + (column % 2 ? hex * 0.866 : 0)
      context.beginPath()
      for (let corner = 0; corner <= 6; corner++) {
        const a = (corner / 6) * Math.PI * 2
        const px = hx + Math.cos(a) * hex * 0.92
        const py = hy + Math.sin(a) * hex * 0.92
        if (corner === 0) context.moveTo(px, py)
        else context.lineTo(px, py)
      }
      context.stroke()
    }
  }
  context.restore()
  return canvas
}

function paintBeam(): HTMLCanvasElement {
  const width = 64
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const image = context.createImageData(width, height)
  for (let y = 0; y < height; y++) {
    const along = y / (height - 1)
    const fade = Math.pow(along, 1.6)
    for (let x = 0; x < width; x++) {
      const across = Math.abs(x - (width - 1) / 2) / ((width - 1) / 2)
      const core = Math.pow(Math.max(0, 1 - across), 3)
      const alpha = Math.min(1, core * fade * 1.1)
      const index = (y * width + x) * 4
      image.data[index] = 200 + 55 * core
      image.data[index + 1] = 140 + 100 * core * core
      image.data[index + 2] = 255
      image.data[index + 3] = Math.round(alpha * 255)
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

function paintShard(seed: number): HTMLCanvasElement {
  const random = seeded(seed)
  const target = grid(7, 9)
  const tall = 3 + Math.round(random() * 4)
  for (let y = 0; y <= tall + 1; y++) {
    const half = y <= 1 ? 0 : y > tall ? 0 : 1 + (y > 2 && y < tall ? Math.round(random()) : 0)
    for (let x = 3 - half; x <= 3 + half; x++) put(target, x, y + 1, x < 3 ? VEIN[2] : x > 3 ? VEIN[0] : VEIN[1])
  }
  put(target, 3, 2, VEIN[3])
  outline(target)
  return rasterize(target)
}

let cached: HeartSprites | null = null

export function heartSprites(): HeartSprites {
  cached ??= {
    body: paintBody(),
    broken: paintBroken(),
    cores: [paintCore(false), paintCore(true)],
    roots: paintRoots(),
    dome: paintDome(),
    beam: paintBeam(),
    shards: [paintShard(3), paintShard(5), paintShard(9)],
  }
  return cached
}

export function heartbeat(time: number, period: number): number {
  const phase = (time % period) / period
  const lub = Math.exp(-phase * 14)
  const dub = phase > 0.24 ? Math.exp(-(phase - 0.24) * 16) * 0.7 : 0
  return Math.min(1, lub + dub)
}
