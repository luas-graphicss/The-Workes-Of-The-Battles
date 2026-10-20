import { CLEARING_TRAIL_HALF, CLEARINGS, TERRAIN, terrainAt, TEXEL, type Clearing, type ClearingId } from '../../world-data'
import { drawArt, drawGlow, pushLight, type Entry, type Frame } from '../city'
import { canvasOf, GOLD, INK, METAL, pixel } from '../fx/plate'
import type { RGB } from '../fx/textures'

const ART = TEXEL
const RIM = 14
const SHADE = 18

export type ClearingView = {
  looted(id: ClearingId): boolean
  unlocked(id: ClearingId): boolean
}

type Theme = { grass: RGB[]; dirt: RGB[]; rim: RGB; detail: RGB; glow: RGB; motes: number }

const THEMES: Record<ClearingId, Theme> = {
  orvalho: { grass: [[58, 104, 60], [72, 124, 70], [98, 150, 84]], dirt: [[92, 72, 50], [110, 86, 60], [132, 104, 74]], rim: [20, 36, 26], detail: [226, 248, 255], glow: [190, 236, 255], motes: 7 },
  raizes: { grass: [[56, 86, 48], [72, 104, 58], [94, 126, 70]], dirt: [[80, 58, 40], [100, 74, 50], [124, 92, 62]], rim: [18, 30, 16], detail: [120, 84, 52], glow: [255, 196, 120], motes: 6 },
  vagalumes: { grass: [[40, 74, 52], [52, 90, 62], [70, 112, 76]], dirt: [[74, 58, 44], [92, 73, 54], [113, 90, 66]], rim: [12, 24, 16], detail: [214, 70, 58], glow: [176, 255, 160], motes: 10 },
}

const hash = (x: number, y: number, seed: number) => {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function segmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t))
}

function boundsOf({ center, radius, trail }: Clearing) {
  const pad = CLEARING_TRAIL_HALF + SHADE
  const xs = [center[0] - radius, center[0] + radius, ...trail.map(([x]) => x)]
  const ys = [center[1] - radius, center[1] + radius, ...trail.map(([, y]) => y)]
  const x0 = Math.floor((Math.min(...xs) - pad) / ART) * ART
  const y0 = Math.floor((Math.min(...ys) - pad) / ART) * ART
  return { x0, y0, x1: Math.ceil((Math.max(...xs) + pad) / ART) * ART, y1: Math.ceil((Math.max(...ys) + pad) / ART) * ART }
}

function paintGround(clearing: Clearing, box: ReturnType<typeof boundsOf>, theme: Theme): HTMLCanvasElement {
  const width = (box.x1 - box.x0) / ART
  const height = (box.y1 - box.y0) / ART
  const paint = canvasOf(width, height)
  const image = paint.createImageData(width, height)
  const data = image.data
  const [cx, cy] = clearing.center
  const points = [...clearing.trail, clearing.center]
  const seed = clearing.id.length * 31
  const put = (index: number, [r, g, b]: RGB, alpha = 255) => {
    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
    data[index + 3] = alpha
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wx = box.x0 + (x + 0.5) * ART
      const wy = box.y0 + (y + 0.5) * ART
      const wobble = (hash(x >> 1, y >> 1, seed) - 0.5) * 10
      const fromCenter = Math.hypot(wx - cx, wy - cy)
      const clearingEdge = fromCenter - clearing.radius + wobble
      let trailEdge = Infinity
      for (let step = 0; step < points.length - 1; step++) {
        const [ax, ay] = points[step]
        const [bx, by] = points[step + 1]
        trailEdge = Math.min(trailEdge, segmentDistance(wx, wy, ax, ay, bx, by) - CLEARING_TRAIL_HALF + wobble)
      }
      const edge = Math.min(clearingEdge, trailEdge)
      const index = (y * width + x) * 4
      if (edge > SHADE) continue
      const forest = terrainAt(wx, wy) === TERRAIN.forest
      if (edge > 0) {
        if (forest) put(index, theme.rim, Math.round(150 * (1 - edge / SHADE)))
        continue
      }
      if (edge > -RIM * 0.5) {
        put(index, forest ? theme.rim : theme.dirt[0], forest ? 255 : 150)
        continue
      }
      const noise = hash(x, y, seed + 7)
      const onTrail = trailEdge < clearingEdge
      if (edge > -RIM) {
        put(index, theme.grass[0])
        continue
      }
      if (onTrail) {
        const shade = noise > 0.86 ? 2 : noise > 0.42 ? 1 : 0
        put(index, noise > 0.985 ? theme.grass[2] : theme.dirt[shade])
        continue
      }
      const ring = fromCenter / clearing.radius
      if (clearing.id === 'raizes') {
        const angle = Math.atan2(wy - cy, wx - cx)
        const ray = Math.abs(((angle / (Math.PI / 3) + 6.5) % 1) - 0.5)
        const circle = Math.abs(ring - 0.58) < 0.05
        if ((ring > 0.18 && ring < 0.78 && ray < 0.035 + 0.02 * (1 - ring)) || circle) {
          put(index, noise > 0.5 ? theme.detail : theme.dirt[0])
          continue
        }
      }
      if (ring < 0.22) {
        put(index, noise > 0.7 ? theme.dirt[2] : theme.dirt[1])
        continue
      }
      if (noise > 0.992 - (clearing.id === 'vagalumes' && ring > 0.7 ? 0.012 : 0)) {
        put(index, theme.detail)
        continue
      }
      put(index, theme.grass[noise > 0.82 ? 2 : noise > 0.3 ? 1 : 0])
    }
  }
  paint.putImageData(image, 0, 0)
  return paint.canvas
}

type RelicState = 'sealed' | 'ready' | 'empty'

function paintRelic(state: RelicState, glow: RGB): HTMLCanvasElement {
  const paint = canvasOf(15, 22)
  pixel(paint, 1, 20, 'rgba(10, 14, 12, 0.45)', 13, 2)
  pixel(paint, 2, 14, INK, 11, 7)
  pixel(paint, 3, 15, METAL[2], 9, 5)
  pixel(paint, 3, 15, METAL[3], 9, 1)
  pixel(paint, 3, 19, METAL[1], 9, 1)
  pixel(paint, 1, 12, INK, 13, 3)
  pixel(paint, 2, 13, METAL[3], 11, 1)
  pixel(paint, 5, 17, METAL[1], 5, 1)
  if (state === 'empty') {
    pixel(paint, 6, 11, METAL[1], 3, 1)
    return paint.canvas
  }
  const core = state === 'ready' ? `rgb(${glow[0]} ${glow[1]} ${glow[2]})` : METAL[1]
  const light = state === 'ready' ? '#ffffff' : METAL[2]
  pixel(paint, 6, 2, INK, 3, 10)
  pixel(paint, 5, 4, INK, 5, 6)
  pixel(paint, 6, 4, core, 3, 6)
  pixel(paint, 7, 3, core, 1, 8)
  pixel(paint, 6, 5, light, 1, 2)
  pixel(paint, 4, 11, state === 'ready' ? GOLD[2] : METAL[2], 7, 1)
  if (state === 'sealed') {
    for (const [x, y] of [
      [3, 7],
      [11, 7],
      [4, 3],
      [10, 3],
    ]) {
      pixel(paint, x, y, GOLD[0])
    }
    pixel(paint, 4, 8, METAL[3], 7, 1)
  }
  return paint.canvas
}

const nightly = (strength: number) => Math.min(1, Math.max(0, (strength - 1) / 1.2))

function drawMotes(frame: Frame, clearing: Clearing, theme: Theme, strength: number) {
  const [cx, cy] = clearing.center
  const { context } = frame
  const size = Math.max(1, Math.round(frame.scale))
  const base = 0.55 + 0.45 * nightly(strength)
  for (let k = 0; k < theme.motes; k++) {
    const phase = k * 2.399
    const t = frame.time * (clearing.id === 'vagalumes' ? 0.35 : 0.22) + phase
    let x: number
    let y: number
    let alpha: number
    if (clearing.id === 'raizes') {
      const life = (t * 0.6) % 1
      x = cx + Math.sin(phase * 3.1) * clearing.radius * 0.55 + Math.sin(t * 2) * 10
      y = cy + Math.cos(phase * 1.7) * clearing.radius * 0.4 - life * 120
      alpha = Math.sin(life * Math.PI)
    } else if (clearing.id === 'orvalho') {
      x = cx + Math.sin(phase * 4.7) * clearing.radius * 0.75
      y = cy + Math.cos(phase * 2.3) * clearing.radius * 0.6
      alpha = Math.max(0, Math.sin(t * 3.4)) ** 6
    } else {
      x = cx + Math.sin(t * 0.9 + phase) * clearing.radius * 0.7
      y = cy + Math.sin(t * 1.3 + phase * 1.9) * clearing.radius * 0.5 - 40
      alpha = 0.45 + 0.55 * Math.max(0, Math.sin(t * 5 + phase))
    }
    if (alpha <= 0.04) continue
    drawGlow(frame, theme.glow, x, y, 26, alpha * base * 0.8)
    context.globalAlpha = Math.min(1, alpha * base + 0.2)
    context.fillStyle = `rgb(${theme.glow[0]} ${theme.glow[1]} ${theme.glow[2]})`
    context.fillRect(Math.round(frame.originX + Math.round(x / ART) * frame.scale), Math.round(frame.originY + Math.round(y / ART) * frame.scale), size, size)
    context.globalAlpha = 1
  }
}

export function clearingEntries(view: ClearingView): Entry[] {
  return CLEARINGS.flatMap((clearing): Entry[] => {
    const theme = THEMES[clearing.id]
    const box = boundsOf(clearing)
    const ground = paintGround(clearing, box, theme)
    const relics: Record<RelicState, HTMLCanvasElement> = {
      sealed: paintRelic('sealed', theme.glow),
      ready: paintRelic('ready', theme.glow),
      empty: paintRelic('empty', theme.glow),
    }
    const [rx, ry] = clearing.relic
    const state = (): RelicState => (view.looted(clearing.id) ? 'empty' : view.unlocked(clearing.id) ? 'ready' : 'sealed')
    return [
      {
        depth: -1e7,
        ...box,
        cover: null,
        draw: (frame) => drawArt(frame, ground, box.x0, box.y0, 0, 0),
        glow: (frame, strength) => drawMotes(frame, clearing, theme, strength),
      },
      {
        depth: ry,
        x0: rx - 90,
        y0: ry - 160,
        x1: rx + 90,
        y1: ry + 40,
        cover: null,
        draw: (frame) => drawArt(frame, relics[state()], rx, ry, 7, 21),
        glow: (frame, strength) => {
          if (state() !== 'ready') return
          const pulse = 0.82 + 0.18 * Math.sin(frame.time * 2.6)
          drawGlow(frame, theme.glow, rx, ry - 44, 110, (0.28 + 0.3 * nightly(strength)) * pulse)
          drawGlow(frame, [255, 255, 255], rx, ry - 44, 34, 0.35 * pulse)
        },
        light: (frame, out, night) => {
          if (state() === 'ready') pushLight(frame, out, rx, ry - 30, 360, theme.glow, 0.6 * night)
        },
      },
    ]
  })
}
