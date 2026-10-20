import { Particles } from '../fx/particles'
import { Prescaled } from '../fx/prescale'
import type { Profiler } from '../fx/profile'
import { fillGlow, glowTexture, seeded, type RGB } from '../fx/textures'
import { drawFireball, type MeteorArt } from '../meteor'
import { clamp01, easeInOutCubic, lerp, smoothstep } from './easing'

export type SkyArt = { sky: HTMLImageElement; trees: HTMLImageElement; meteor: MeteorArt }

const SIZE = 1024
const TREES_TOP = 510
const ZOOM_BASE = 1.04
const ZOOM_PUSH = 0.1

const PATH = { start: [1000, -70], control: [840, 260], end: [540, 965] } as const

export const SKY = { appear: 1, whiteout: 5.15, cut: 5.55 } as const

const HEAD_LIGHT: RGB = [255, 150, 84]
const HORIZON_GLOW: RGB = [255, 170, 100]

const FIRE: RGB[] = [
  [255, 250, 226],
  [255, 206, 120],
  [255, 138, 56],
  [210, 70, 34],
]

type Star = { x: number; y: number; size: number; speed: number; phase: number }
type Head = { x: number; y: number; dx: number; dy: number; size: number; trail: number; progress: number; visible: boolean }

export class SkyShot {
  private readonly particles = new Particles(600)
  private readonly stars: Star[] = []
  private readonly fireSprites: HTMLCanvasElement[]
  private readonly sparkSprite: HTMLCanvasElement
  private readonly skyLayer: Prescaled
  private readonly treesLayer: Prescaled
  private emitClock = 0
  private readonly head: Head = { x: PATH.start[0], y: PATH.start[1], dx: -1, dy: 1, size: 0, trail: 0, progress: 0, visible: false }

  constructor(private readonly art: SkyArt) {
    this.skyLayer = new Prescaled(art.sky)
    this.treesLayer = new Prescaled(art.trees)
    const random = seeded(2718)
    while (this.stars.length < 70) {
      const x = random() * SIZE
      const y = random() * 520
      if (x > 110 && x < 320 && y > 70 && y < 270) continue
      this.stars.push({ x, y, size: 4 + random() * 7, speed: 0.6 + random() * 1.8, phase: random() * Math.PI * 2 })
    }
    this.fireSprites = FIRE.map((color) => glowTexture(color, 64))
    this.sparkSprite = glowTexture([255, 226, 160], 32)
  }

  get progress() {
    return this.head.progress
  }

  update(dt: number, time: number) {
    const u = clamp01((time - SKY.appear) / (SKY.cut - SKY.appear))
    const eased = Math.pow(u, 1.3)
    const head = this.head
    head.visible = time >= SKY.appear && u < 1
    head.progress = u
    const [x, y] = bezier(eased)
    const [tx, ty] = tangent(eased)
    head.dx = tx
    head.dy = ty
    head.x = x
    head.y = y
    head.size = lerp(2.6, 15, Math.pow(eased, 1.5))
    head.trail = lerp(70, 340, eased)

    if (head.visible) {
      this.emitClock += dt
      const length = Math.hypot(tx, ty) || 1
      const nx = tx / length
      const ny = ty / length
      while (this.emitClock > 0.012) {
        this.emitClock -= 0.012
        this.particles.spawn({
          x: x + (Math.random() - 0.5) * head.size * 0.6,
          y: y + (Math.random() - 0.5) * head.size * 0.6,
          vx: -nx * (40 + Math.random() * 40) + (Math.random() - 0.5) * 24,
          vy: -ny * (40 + Math.random() * 40) + (Math.random() - 0.5) * 24,
          life: 0.35 + Math.random() * 0.4,
          size: head.size * (1.8 + Math.random()),
          sizeEnd: head.size * 0.4,
          sprite: this.fireSprites,
          blend: 'add',
          alpha: 0.8,
        })
        if (Math.random() < 0.35) {
          this.particles.spawn({
            x,
            y,
            vx: -nx * 60 + (Math.random() - 0.5) * 140,
            vy: -ny * 60 + (Math.random() - 0.5) * 140 + 30,
            drag: 1.2,
            life: 0.5 + Math.random() * 0.7,
            size: 2.2 + Math.random() * 1.8,
            sizeEnd: 0.8,
            stretch: 0.03,
            sprite: this.sparkSprite,
            blend: 'add',
          })
        }
      }
    }
    this.particles.update(dt)
  }

  draw(context: CanvasRenderingContext2D, width: number, height: number, time: number, clock: number, shakeX: number, shakeY: number, probe?: Profiler) {
    const lens = this.lens(time, width, height)
    const zoom = lens.zoom
    const originX = Math.round(width / 2 - lens.x * zoom + shakeX)
    const originY = Math.round(height / 2 - lens.y * zoom + shakeY)
    const size = SIZE * zoom

    const layerSize = SIZE * this.maxZoom(width, height)

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'low'
    context.drawImage(this.skyLayer.at(layerSize), originX, originY, size, size)
    probe?.mark(context, 'sky-bg')

    context.globalCompositeOperation = 'lighter'
    this.drawStars(context, originX, originY, zoom, clock)
    probe?.mark(context, 'stars')

    const head = this.head
    const eased = Math.pow(head.progress, 1.3)

    if (head.visible) {
      const radius = (130 + 420 * eased) * zoom
      fillGlow(context, HEAD_LIGHT, originX + head.x * zoom, originY + head.y * zoom, radius, 0.34 * smoothstep(0, 0.12, head.progress))
    }
    const horizon = smoothstep(0.62, 1, head.progress)
    if (horizon > 0) {
      const radius = (360 + 420 * horizon) * zoom
      fillGlow(context, HORIZON_GLOW, originX + 540 * zoom, originY + 890 * zoom, radius, 0.55 * horizon)
    }
    context.globalAlpha = 1
    probe?.mark(context, 'sky-glow')
    this.particles.draw(context, originX, originY, zoom, 'add')
    probe?.mark(context, 'sky-p')
    if (head.visible) {
      drawFireball(
        context,
        this.art.meteor,
        originX + head.x * zoom,
        originY + head.y * zoom,
        head.dx,
        head.dy,
        head.size * zoom,
        head.trail * zoom,
        time * 5,
        smoothstep(0, 0.1, head.progress),
      )
    }

    probe?.mark(context, 'fireball')

    context.globalCompositeOperation = 'source-over'
    const trees = this.art.trees
    const treeScale = size / (trees.naturalWidth || 1)
    context.drawImage(this.treesLayer.at(layerSize), originX, originY + TREES_TOP * zoom, size, trees.naturalHeight * treeScale)
    probe?.mark(context, 'trees')
  }

  release() {
    this.skyLayer.release()
    this.treesLayer.release()
  }

  private maxZoom(width: number, height: number) {
    return Math.max(width / SIZE, height / SIZE) * (ZOOM_BASE + ZOOM_PUSH)
  }

  private drawStars(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number) {
    for (const star of this.stars) {
      const twinkle = Math.pow(Math.max(0, Math.sin(time * star.speed + star.phase)), 8)
      if (twinkle < 0.02) continue
      const x = originX + star.x * zoom
      const y = originY + star.y * zoom
      const size = star.size * zoom
      context.globalAlpha = twinkle
      context.drawImage(this.sparkSprite, x - size / 2, y - size / 2, size, size)
      if (star.size > 7) {
        context.globalAlpha = twinkle * 0.7
        context.drawImage(this.sparkSprite, x - size * 1.6, y - size * 0.08, size * 3.2, size * 0.16)
        context.drawImage(this.sparkSprite, x - size * 0.08, y - size * 1.6, size * 0.16, size * 3.2)
      }
    }
    context.globalAlpha = 1
  }

  private lens(time: number, width: number, height: number) {
    const cover = Math.max(width / SIZE, height / SIZE)
    const zoom = cover * (ZOOM_BASE + ZOOM_PUSH * easeInOutCubic(clamp01((time - 0.6) / 5)))
    const viewWidth = width / zoom
    const viewHeight = height / zoom
    const top = viewHeight / 2 + 10
    const bottom = 900 - viewHeight * 0.14
    const follow = smoothstep(SKY.appear, SKY.appear + 0.8, time)
    const target = Math.min(bottom, Math.max(top, this.head.y + viewHeight * 0.18))
    const y = lerp(top, target, follow)
    let x = lerp(SIZE / 2 + 40, 560, this.head.progress)
    if (viewWidth < SIZE * 0.8) x = lerp(x, this.head.x, 0.7 * follow)
    return {
      zoom,
      x: Math.min(SIZE - viewWidth / 2, Math.max(viewWidth / 2, x)),
      y: Math.min(SIZE - viewHeight / 2, Math.max(viewHeight / 2, y)),
    }
  }
}

function bezier(t: number): [number, number] {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return [
    a * PATH.start[0] + b * PATH.control[0] + c * PATH.end[0],
    a * PATH.start[1] + b * PATH.control[1] + c * PATH.end[1],
  ]
}

function tangent(t: number): [number, number] {
  return [
    2 * (1 - t) * (PATH.control[0] - PATH.start[0]) + 2 * t * (PATH.end[0] - PATH.control[0]),
    2 * (1 - t) * (PATH.control[1] - PATH.start[1]) + 2 * t * (PATH.end[1] - PATH.control[1]),
  ]
}
