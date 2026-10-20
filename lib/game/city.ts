import atlas from '../city/atlas.json'
import baked from '../city/baked.json'
import type { Light } from './fx/lighting'
import { glowTexture, type RGB } from './fx/textures'
import { paintingQuality } from './map'

type SpriteBox = readonly number[]

const SPRITES = atlas.sprites as Record<string, SpriteBox>
const EXTRA = atlas.extra as Record<string, Record<string, number | number[]>>
const ART = baked.art

const LAMP_GLOW: RGB = [150, 240, 228]
const HUB_GLOW: RGB = [150, 255, 236]
const CRYSTAL_GLOW: RGB = [184, 164, 255]
const CRYSTAL_CORE: RGB = [232, 224, 255]
const LANTERN_GLOW: RGB = [255, 196, 112]
const LUME_GLOW: RGB = [126, 255, 224]
const SPARK: RGB = [214, 255, 244]
const RUNE_GLOW: RGB = [140, 255, 236]

const SEE_THROUGH = 0.45
const COVER_SHARE = 0.2
const FADE_RATE = 12

export type Frame = {
  context: CanvasRenderingContext2D
  image: HTMLImageElement
  originX: number
  originY: number
  zoom: number
  scale: number
  time: number
  alpha: number
}

export type Rect = { x0: number; y0: number; x1: number; y1: number }

export type Entry = Rect & {
  depth: number
  cover?: Rect | null
  opacity?: number
  draw?(frame: Frame): void
  glow?(frame: Frame, strength: number): void
  light?(frame: Frame, out: Light[], night: number): void
}

function box(name: string): SpriteBox {
  const sprite = SPRITES[name]
  if (!sprite) throw new Error(`Sprite ausente no atlas: ${name}`)
  return sprite
}

function spriteBounds(name: string, x: number, y: number, pad = 0) {
  const [, , width, height, anchorX, anchorY] = box(name)
  const left = (Math.round(x / ART) - anchorX) * ART
  const top = (Math.round(y / ART) - anchorY) * ART
  return { x0: left - pad, y0: top - pad, x1: left + width * ART + pad, y1: top + height * ART + pad }
}

function core({ x0, y0, x1, y1 }: Rect, side: number, top = 0): Rect {
  const width = x1 - x0
  return { x0: x0 + width * side, y0: y0 + (y1 - y0) * top, x1: x1 - width * side, y1 }
}

function drawSprite(frame: Frame, name: string, x: number, y: number) {
  const [sx, sy, width, height, anchorX, anchorY] = box(name)
  const px = Math.round(x / ART) - anchorX
  const py = Math.round(y / ART) - anchorY
  const left = Math.round(frame.originX + px * frame.scale)
  const top = Math.round(frame.originY + py * frame.scale)
  const right = Math.round(frame.originX + (px + width) * frame.scale)
  const bottom = Math.round(frame.originY + (py + height) * frame.scale)
  frame.context.drawImage(frame.image, sx, sy, width, height, left, top, right - left, bottom - top)
}

function drawDot(frame: Frame, x: number, y: number, width = 1, height = 1) {
  const px = Math.round(x / ART)
  const py = Math.round(y / ART)
  const left = Math.round(frame.originX + px * frame.scale)
  const top = Math.round(frame.originY + py * frame.scale)
  frame.context.fillRect(left, top, Math.max(1, Math.round(width * frame.scale)), Math.max(1, Math.round(height * frame.scale)))
}

export function drawGlow(frame: Frame, color: RGB, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0.01) return
  const size = radius * 2 * frame.zoom
  const context = frame.context
  context.globalAlpha = Math.min(1, alpha)
  context.drawImage(glowTexture(color, 64), frame.originX + x * frame.zoom - size / 2, frame.originY + y * frame.zoom - size / 2, size, size)
  context.globalAlpha = 1
}

export function pushLight(frame: Frame, out: Light[], x: number, y: number, radius: number, color: RGB, intensity: number) {
  out.push({ x: frame.originX + x * frame.zoom, y: frame.originY + y * frame.zoom, radius: radius * frame.zoom, color, intensity })
}

export function drawArt(frame: Frame, art: HTMLCanvasElement, x: number, y: number, anchorX: number, anchorY: number) {
  const px = Math.round(x / ART) - anchorX
  const py = Math.round(y / ART) - anchorY
  const left = Math.round(frame.originX + px * frame.scale)
  const top = Math.round(frame.originY + py * frame.scale)
  const right = Math.round(frame.originX + (px + art.width) * frame.scale)
  const bottom = Math.round(frame.originY + (py + art.height) * frame.scale)
  frame.context.drawImage(art, 0, 0, art.width, art.height, left, top, right - left, bottom - top)
}

const fraction = (value: number) => value - Math.floor(value)
const wave = (time: number, speed: number, phase: number) => Math.sin(time * speed + phase)

function trees(): Entry[] {
  return (baked.trees as [string, number, number, number][]).map(([kind, variant, x, y]) => {
    const name = `tree:${kind}:${variant}`
    const bounds = spriteBounds(name, x, y)
    return {
      depth: y,
      ...bounds,
      cover: kind === 'bush' ? null : core(bounds, 0.18, 0.08),
      draw: (frame) => drawSprite(frame, name, x, y),
    }
  })
}

function lamps(): Entry[] {
  return (baked.lamps as [number, number][]).map(([x, y]) => {
    const headY = y - 40 * ART
    return {
      depth: y,
      ...spriteBounds('lamp', x, y, 60),
      cover: spriteBounds('lamp', x, y),
      draw: (frame) => drawSprite(frame, 'lamp', x, y),
      glow: (frame, strength) => drawGlow(frame, LAMP_GLOW, x, headY, 64, 0.2 * strength),
      light: (frame, out, night) => pushLight(frame, out, x, headY + 60, 320, LAMP_GLOW, 0.7 * night),
    }
  })
}

type LandmarkData = { kind: string; id: string; x: number; y: number; points: number[][] }

function windmill({ x, y }: LandmarkData, index: number): Entry[] {
  const [, , , , anchorX, anchorY] = box('windmill')
  const hubX = x + (Number(EXTRA.windmill.hubX) - anchorX) * ART
  const hubY = y + (Number(EXTRA.windmill.hubY) - anchorY + 3) * ART
  const phase = index * 2.7
  const bob = (time: number) => Math.round(wave(time, 1.1, phase) * 1.5) * ART
  return [
    {
      depth: y,
      ...spriteBounds('windmill', x, y),
      cover: core(spriteBounds('windmill', x, y), 0.22),
      draw: (frame) => drawSprite(frame, 'windmill', x, y),
    },
    {
      depth: y + 1,
      ...spriteBounds('rotor:0', hubX, hubY, 80),
      cover: core(spriteBounds('rotor:0', hubX, hubY), 0.25, 0.25),
      draw: (frame) => drawSprite(frame, `rotor:${Math.floor(frame.time * 6 + phase) % 8}`, hubX, hubY + bob(frame.time)),
      glow: (frame, strength) => drawGlow(frame, HUB_GLOW, hubX, hubY + bob(frame.time), 56, (0.4 + 0.12 * wave(frame.time, 2.3, phase)) * strength),
      light: (frame, out, night) => pushLight(frame, out, hubX, hubY + 200, 300, HUB_GLOW, 0.45 * night),
    },
  ]
}

function ringTower({ x, y }: LandmarkData): Entry[] {
  const [, , , height, , anchorY] = box('ring-tower')
  const rings = EXTRA['ring-tower'].rings as number[]
  const top = y - anchorY * ART
  const tipY = top + 3 * ART
  const RUNES = 10
  const runes = (frame: Frame, front: boolean) => {
    const out: [number, number][] = []
    for (let r = 0; r < rings.length; r += 3) {
      const ring = r / 3
      const speed = ring === 0 ? 0.55 : -0.4
      const centerY = top + (rings[r] + Math.round(wave(frame.time, 1.3, ring * 2) * 1.5)) * ART
      for (let k = 0; k < RUNES; k++) {
        const angle = (k / RUNES) * Math.PI * 2 + frame.time * speed
        if (Math.sin(angle) > 0 !== front) continue
        out.push([x + Math.cos(angle) * rings[r + 1] * ART, centerY + Math.sin(angle) * rings[r + 2] * ART])
      }
    }
    return out
  }
  const reach = 46 * ART
  const bounds = { x0: x - reach, y0: top, x1: x + reach, y1: top + height * ART }
  return [
    { depth: y - 1, ...bounds, draw: (frame) => runes(frame, false).forEach(([rx, ry]) => drawSprite(frame, 'rune-dim', rx, ry)) },
    {
      depth: y,
      ...spriteBounds('ring-tower', x, y, 40),
      cover: core(spriteBounds('ring-tower', x, y), 0.2),
      draw: (frame) => drawSprite(frame, 'ring-tower', x, y),
      glow: (frame, strength) => drawGlow(frame, HUB_GLOW, x, tipY, 60, (0.45 + 0.15 * wave(frame.time, 1.7, 0)) * strength),
      light: (frame, out, night) => pushLight(frame, out, x, y - 120, 520, HUB_GLOW, 0.6 * night),
    },
    {
      depth: y + 2,
      ...bounds,
      draw: (frame) => runes(frame, true).forEach(([rx, ry]) => drawSprite(frame, 'rune', rx, ry)),
      glow: (frame, strength) => runes(frame, true).forEach(([rx, ry]) => drawGlow(frame, RUNE_GLOW, rx, ry, 22, 0.3 * strength)),
    },
  ]
}

function crystalFountain({ x, y }: LandmarkData): Entry[] {
  const DROPS = 10
  const center = (time: number) => y - 34 * ART + Math.round(wave(time, 1.6, 0) * 2.5) * ART
  const shards = (time: number, front: boolean, cy: number) => {
    const out: [number, number][] = []
    for (let k = 0; k < 3; k++) {
      const angle = time * 0.8 + (k * Math.PI * 2) / 3
      if (Math.sin(angle) > 0 === front) out.push([x + Math.cos(angle) * 20 * ART, cy + (6 + Math.sin(angle) * 6) * ART])
    }
    return out
  }
  return [
    {
      depth: y + 1,
      x0: x - 48 * ART,
      y0: y - 66 * ART,
      x1: x + 48 * ART,
      y1: y + 12 * ART,
      cover: { x0: x - 24 * ART, y0: y - 62 * ART, x1: x + 24 * ART, y1: y - 6 * ART },
      draw: (frame) => {
        const { context, time } = frame
        const cy = center(time)
        context.fillStyle = 'rgba(206, 242, 255, 0.85)'
        for (let k = 0; k < DROPS; k++) {
          const p = fraction(time * 0.32 + k / DROPS)
          const angle = p * Math.PI * 2.5 + (k * Math.PI * 2) / DROPS
          const radius = (28 - p * 22) * ART
          const dropY = y + 4 * ART - p * (y + 4 * ART - (cy + 8 * ART))
          context.globalAlpha = frame.alpha * Math.sin(p * Math.PI)
          drawDot(frame, x + Math.cos(angle) * radius, dropY + Math.sin(angle) * radius * 0.35)
        }
        context.globalAlpha = frame.alpha
        for (const [sx, sy] of shards(time, false, cy)) drawSprite(frame, 'shard', sx, sy)
        drawSprite(frame, 'crystal', x, cy)
        for (const [sx, sy] of shards(time, true, cy)) drawSprite(frame, 'shard', sx, sy)
      },
      glow: (frame, strength) => {
        const cy = center(frame.time)
        drawGlow(frame, CRYSTAL_GLOW, x, cy, 110, (0.5 + 0.12 * wave(frame.time, 2, 0)) * strength)
        drawGlow(frame, CRYSTAL_CORE, x, cy, 36, 0.35 * strength)
      },
      light: (frame, out, night) => pushLight(frame, out, x, y - 40, 760, CRYSTAL_GLOW, 0.85 * night),
    },
  ]
}

function lanterns({ x, y, points }: LandmarkData): Entry[] {
  return points.map(([dx, dy, height], index) => {
    const groundX = x + dx
    const groundY = y + dy
    const position = (time: number): [number, number] => [
      groundX + Math.round(wave(time, 0.7, index)) * ART,
      groundY - height + Math.round(wave(time, 1.2, index * 1.9) * 2) * ART,
    ]
    return {
      depth: groundY,
      x0: groundX - 80,
      y0: groundY - height - 90,
      x1: groundX + 80,
      y1: groundY + 20,
      cover: spriteBounds('lantern', groundX, groundY - height),
      draw: (frame: Frame) => {
        const context = frame.context
        context.fillStyle = 'rgba(28, 24, 20, 0.14)'
        context.beginPath()
        context.ellipse(frame.originX + groundX * frame.zoom, frame.originY + groundY * frame.zoom, 7 * ART * frame.zoom, 2.5 * ART * frame.zoom, 0, 0, Math.PI * 2)
        context.fill()
        const [lx, ly] = position(frame.time)
        drawSprite(frame, 'lantern', lx, ly)
      },
      glow: (frame: Frame, strength: number) => {
        const [lx, ly] = position(frame.time)
        drawGlow(frame, LANTERN_GLOW, lx, ly + 2 * ART, 72, (0.45 + 0.06 * wave(frame.time, 9, index)) * strength)
      },
      light: (frame: Frame, out: Light[], night: number) => pushLight(frame, out, groundX, groundY - height * 0.5, 380, LANTERN_GLOW, 0.7 * night),
    }
  })
}

function islands({ x, y, points }: LandmarkData): Entry[] {
  return points.map(([dx, dy, height], index) => {
    const name = `island:${index}`
    const [, , width, spriteHeight, anchorX, anchorY] = box(name)
    const extra = EXTRA[name]
    const groundX = x + dx
    const groundY = y + dy
    const top = (time: number) => groundY - height + Math.round(wave(time, 0.6, index * 2.1) * 3) * ART
    const springX = groundX + (Number(extra.springX) - anchorX) * ART
    return {
      depth: groundY,
      x0: groundX - (anchorX + 12) * ART,
      y0: groundY - height - (anchorY + 8) * ART,
      x1: groundX + (width - anchorX + 12) * ART,
      y1: Math.max(groundY + 16 * ART, groundY - height + (spriteHeight - anchorY) * ART),
      draw: (frame: Frame) => {
        const { context, time } = frame
        const islandTop = top(time)
        context.fillStyle = 'rgba(12, 30, 44, 0.22)'
        context.beginPath()
        context.ellipse(frame.originX + groundX * frame.zoom, frame.originY + (groundY + 4 * ART) * frame.zoom, width * 0.34 * ART * frame.zoom, width * 0.1 * ART * frame.zoom, 0, 0, Math.PI * 2)
        context.fill()

        const springY = islandTop + (Number(extra.springY) - anchorY) * ART
        const waterY = groundY + 2 * ART
        const fall = Math.max(0, waterY - springY)
        context.fillStyle = 'rgba(176, 226, 255, 0.55)'
        drawDot(frame, springX - ART, springY, 2, fall / ART)
        context.fillStyle = 'rgba(236, 250, 255, 0.85)'
        for (let k = 0; k < 4; k++) {
          const offset = fraction(time * 1.4 + k / 4) * fall
          drawDot(frame, springX - ART, springY + offset, 2, Math.min(3, (fall - offset) / ART))
        }
        context.strokeStyle = 'rgba(226, 246, 255, 0.7)'
        context.lineWidth = Math.max(1, frame.scale * 0.75)
        for (let k = 0; k < 2; k++) {
          const p = fraction(time * 0.8 + k / 2)
          const radius = (2 + p * 9) * ART * frame.zoom
          context.globalAlpha = frame.alpha * (1 - p) * 0.8
          context.beginPath()
          context.ellipse(frame.originX + springX * frame.zoom, frame.originY + waterY * frame.zoom, radius, radius * 0.35, 0, 0, Math.PI * 2)
          context.stroke()
        }
        context.globalAlpha = frame.alpha
        drawSprite(frame, name, groundX, islandTop)
      },
    }
  })
}

function lumeTree({ x, y }: LandmarkData): Entry[] {
  const [, , , , , anchorY] = box('tree:lume:0')
  const canopyY = y - (anchorY - 40) * ART
  const SPARKS = 16
  return [
    {
      depth: y + 1,
      x0: x - 300,
      y0: canopyY - 360,
      x1: x + 300,
      y1: y + 60,
      glow: (frame, strength) => {
        const { context, time } = frame
        drawGlow(frame, LUME_GLOW, x, canopyY, 250, (0.26 + 0.08 * wave(time, 1.4, 0)) * strength)
        context.fillStyle = 'rgba(226, 255, 248, 0.9)'
        for (let k = 0; k < SPARKS; k++) {
          const period = 2.6 + (k % 5) * 0.45
          const p = fraction(time / period + k * 0.618)
          const sx = x + (fraction(k * 0.7548) - 0.5) * 84 * ART + wave(time, 1.3, k) * 4 * ART
          const sy = canopyY + (22 - p * 70) * ART
          const alpha = Math.sin(p * Math.PI)
          drawGlow(frame, SPARK, sx, sy, 16, 0.7 * alpha * strength)
          context.globalAlpha = alpha * Math.min(1, strength)
          drawDot(frame, sx, sy)
        }
        context.globalAlpha = 1
      },
      light: (frame, out, night) => pushLight(frame, out, x, canopyY + 80, 820, LUME_GLOW, 0.9 * night),
    },
  ]
}

function landmarks(): Entry[] {
  let windmills = 0
  return (baked.landmarks as LandmarkData[]).flatMap((landmark) => {
    switch (landmark.kind) {
      case 'windmill':
        return windmill(landmark, windmills++)
      case 'ring-tower':
        return ringTower(landmark)
      case 'crystal-fountain':
        return crystalFountain(landmark)
      case 'lanterns':
        return lanterns(landmark)
      case 'islands':
        return islands(landmark)
      case 'lume-tree':
        return lumeTree(landmark)
      default:
        return []
    }
  })
}

const byDepth = (a: Entry, b: Entry) => a.depth - b.depth

export class CityLayer {
  private readonly entries: Entry[]
  private readonly visible: Entry[] = []
  private cursor = 0
  private frame: Frame | null = null
  private crisp = false
  private explorer: (Rect & { depth: number }) | null = null
  private readonly explorerBox: Rect & { depth: number } = { x0: 0, y0: 0, x1: 0, y1: 0, depth: 0 }
  private lastTime: number | null = null
  private step = 0

  private reachAbove = 0
  private reachBelow = 0

  constructor(
    private readonly image: HTMLImageElement,
    extra: Entry[] = [],
    options: { baked?: boolean } = {},
  ) {
    const baked = options.baked ?? true
    this.entries = [...(baked ? [...trees(), ...lamps(), ...landmarks()] : []), ...extra].sort(byDepth)
    this.measureReach()
  }

  add(entries: Entry[]) {
    this.entries.push(...entries)
    this.entries.sort(byDepth)
    this.measureReach()
  }

  remove(entry: Entry) {
    const index = this.entries.indexOf(entry)
    if (index >= 0) this.entries.splice(index, 1)
  }

  private measureReach() {
    let above = 0
    let below = 0
    for (const entry of this.entries) {
      above = Math.max(above, entry.depth - entry.y0)
      below = Math.max(below, entry.y1 - entry.depth)
    }
    this.reachAbove = above
    this.reachBelow = below
  }

  private lowerBound(depth: number) {
    const entries = this.entries
    let low = 0
    let high = entries.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (entries[middle].depth < depth) low = middle + 1
      else high = middle
    }
    return low
  }

  begin(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, width: number, height: number, time: number) {
    const scale = zoom * ART
    this.frame = { context, image: this.image, originX, originY, zoom, scale, time, alpha: 1 }
    this.crisp = scale >= 1 && Math.abs(scale - Math.round(scale)) < 0.001
    this.step = this.lastTime === null ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime))
    this.lastTime = time
    this.explorer = null
    const left = -originX / zoom
    const top = -originY / zoom
    const right = (width - originX) / zoom
    const bottom = (height - originY) / zoom
    this.visible.length = 0
    const entries = this.entries
    const first = this.lowerBound(top - this.reachBelow)
    const last = this.lowerBound(bottom + this.reachAbove)
    for (let index = first; index < last; index++) {
      const entry = entries[index]
      if (entry.x1 > left && entry.x0 < right && entry.y1 > top && entry.y0 < bottom) this.visible.push(entry)
    }
    this.cursor = 0
  }

  revealExplorer(x0: number, y0: number, x1: number, y1: number, depth: number) {
    const body = this.explorerBox
    body.x0 = x0
    body.y0 = y0
    body.x1 = x1
    body.y1 = y1
    body.depth = depth
    this.explorer = body
  }

  drawUntil(depth: number) {
    const frame = this.frame
    if (!frame) return
    const { context } = frame
    let started = false
    while (this.cursor < this.visible.length && this.visible[this.cursor].depth < depth) {
      const entry = this.visible[this.cursor++]
      if (!entry.draw) continue
      if (!started) {
        started = true
        context.imageSmoothingEnabled = !this.crisp
        context.imageSmoothingQuality = paintingQuality(frame.scale)
      }
      frame.alpha = this.opacity(entry)
      context.globalAlpha = frame.alpha
      entry.draw(frame)
    }
    if (started) {
      frame.alpha = 1
      context.globalAlpha = 1
      context.imageSmoothingQuality = 'low'
      context.imageSmoothingEnabled = true
    }
  }

  private opacity(entry: Entry) {
    const target = this.hidesExplorer(entry) ? SEE_THROUGH : 1
    const current = entry.opacity ?? 1
    const next = current + (target - current) * Math.min(1, this.step * FADE_RATE)
    entry.opacity = Math.abs(next - target) < 0.01 ? target : next
    return entry.opacity
  }

  private hidesExplorer(entry: Entry) {
    const body = this.explorer
    if (!body || entry.cover === null || entry.depth <= body.depth) return false
    const cover = entry.cover ?? entry
    const width = Math.min(cover.x1, body.x1) - Math.max(cover.x0, body.x0)
    const height = Math.min(cover.y1, body.y1) - Math.max(cover.y0, body.y0)
    return width > 0 && height > 0 && width * height >= COVER_SHARE * (body.x1 - body.x0) * (body.y1 - body.y0)
  }

  drawGlows(strength: number) {
    const frame = this.frame
    if (!frame || strength <= 0) return
    for (const entry of this.visible) entry.glow?.(frame, strength)
  }

  pushLights(out: Light[], night: number) {
    const frame = this.frame
    if (!frame || night <= 0.01) return
    for (const entry of this.visible) entry.light?.(frame, out, night)
  }
}
