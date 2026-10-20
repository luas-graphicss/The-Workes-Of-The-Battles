import { TEXEL } from '../../world-data'
import type { Particles } from '../fx/particles'
import { drawCell } from '../fx/supersample'
import { glowTexture, seeded } from '../fx/textures'
import type { Actor } from '../scene'
import type { RingDef } from './ring'

const CELL = { width: 10, height: 13 }
const VARIANTS = 12
const SEATS = [-26, 0, 26]

type Spectator = { x: number; y: number; variant: number; phase: number; pace: number; eager: number; jump: number; vz: number }

const INK = '#141a18'
const SKIN = ['#f1c7a0', '#d9a679', '#a8714a', '#7a4c2e', '#ffd9b8']
const HAIR = ['#2b1c12', '#5a3a1e', '#c58b3c', '#1b1b22', '#7b2f1e', '#d8d2c4']
const SHIRT = ['#3f8f7a', '#c4563f', '#d9a84a', '#4b6fb0', '#8a5aa8', '#e2e2d4', '#5f7f3a', '#b84d78']
const METAL = ['#8d9aa6', '#c9a24a', '#6f7f8c', '#b0b8a0']
const EYES = ['#7effd9', '#ffd66e', '#ff8a6e']

export class Crowd {
  private readonly sheet: HTMLCanvasElement
  private readonly people: Spectator[] = []
  private readonly flashes: { x: number; y: number; age: number }[] = []
  private seats: Actor[] = []
  private excitement = 0
  private time = 0
  private confettiLeft = 0
  private celebrated = false
  private readonly confetti: HTMLCanvasElement[]

  constructor(
    private readonly particles: Particles,
    readonly ring: RingDef,
  ) {
    this.sheet = paintSheet()
    this.confetti = ['#ffd66e', '#7effd9', '#ff6b5c', '#c9a6ff', '#ffffff', '#8cff9e'].map((color) => {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 5
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      context.fillStyle = color
      context.fillRect(0, 0, 8, 5)
      return canvas
    })
    const random = seeded(20261001)
    for (const [bx, by] of ring.benches) {
      for (const dx of SEATS) {
        if (random() < 0.18) continue
        this.people.push({
          x: bx + dx + (random() - 0.5) * 6,
          y: by - 6,
          variant: Math.floor(random() * VARIANTS),
          phase: random() * Math.PI * 2,
          pace: 5 + random() * 4,
          eager: 0.4 + random() * 0.6,
          jump: 0,
          vz: 0,
        })
      }
    }
  }

  update(dt: number, excitement: number, victory: boolean) {
    for (const person of this.people) {
      if (person.jump > 0 || person.vz !== 0) {
        person.vz -= 1600 * dt
        person.jump = Math.max(0, person.jump + person.vz * dt)
        if (person.jump === 0) person.vz = 0
      } else if ((victory || excitement > 0.85) && Math.random() < dt * 2.4 * person.eager) {
        person.vz = 260 + Math.random() * 160
      }
    }
    if (Math.random() < dt * (0.6 + excitement * 7)) {
      const person = this.people[Math.floor(Math.random() * this.people.length)]
      if (person) this.flashes.push({ x: person.x, y: person.y - 40, age: 0 })
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].age += dt
      if (this.flashes[i].age > 0.18) this.flashes.splice(i, 1)
    }
    if (victory && !this.celebrated) {
      this.celebrated = true
      this.confettiLeft = 2.4
    }
    if (this.confettiLeft > 0) {
      this.confettiLeft -= dt
      for (let i = 0; i < 3; i++) if (Math.random() < dt * 22) this.throwConfetti()
    }
  }

  private throwConfetti() {
    const [cx, cy] = this.ring.center
    const side = Math.random() < 0.5 ? -1 : 1
    const fromX = cx + side * (this.ring.ring.w / 2 + 60)
    this.particles.spawn({
      x: fromX + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * this.ring.ring.h,
      z: 120,
      vx: -side * (120 + Math.random() * 260),
      vy: (Math.random() - 0.5) * 120,
      vz: 380 + Math.random() * 260,
      gravity: 420,
      drag: 1.2,
      wobble: 90,
      spin: (Math.random() - 0.5) * 16,
      angle: Math.random() * Math.PI,
      life: 1.8 + Math.random() * 0.8,
      size: 14,
      sizeEnd: 12,
      sprite: this.confetti[Math.floor(Math.random() * this.confetti.length)],
      blend: 'normal',
      fadeIn: 0.02,
    })
  }

  actors(out: Actor[], excitement: number, now: number) {
    this.excitement = excitement
    this.time = now / 1000
    if (this.seats.length !== this.people.length) {
      this.seats = this.people.map((person) => ({
        depth: person.y,
        draw: (context, originX, originY, zoom) => this.drawPerson(context, originX, originY, zoom, person, this.excitement, this.time),
      }))
    }
    for (const seat of this.seats) out.push(seat)
  }

  private drawPerson(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, person: Spectator, excitement: number, time: number) {
    const scale = zoom * TEXEL
    const sway = Math.sin(time * person.pace + person.phase)
    const bounce = Math.max(0, sway) * (1 + excitement * 3) * person.eager
    const cheering = person.jump > 0 || (excitement > 0.55 && Math.sin(time * 3 + person.phase * 2) > 0.2 - excitement * 0.6)
    const width = CELL.width * scale
    const height = CELL.height * scale
    const x = originX + person.x * zoom - width / 2
    const y = originY + (person.y - person.jump - bounce * 2) * zoom - height
    context.globalAlpha = 1
    drawCell(context, this.sheet, (cheering ? 1 : 0) * CELL.width, person.variant * CELL.height, CELL.width, CELL.height, x, y, width, height)
  }

  drawGlow(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    const sprite = glowTexture([255, 252, 240], 64)
    for (const flash of this.flashes) {
      const t = flash.age / 0.18
      const size = (60 + 50 * (1 - t)) * zoom
      context.globalAlpha = (1 - t) * 0.9
      context.drawImage(sprite, originX + flash.x * zoom - size / 2, originY + flash.y * zoom - size / 2, size, size)
    }
    context.globalAlpha = 1
  }
}

function paintSheet(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CELL.width * 2
  canvas.height = CELL.height * VARIANTS
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const random = seeded(77)
  const dot = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color
    context.fillRect(x, y, w, h)
  }
  for (let variant = 0; variant < VARIANTS; variant++) {
    const robot = variant % 4 === 3
    const skin = SKIN[Math.floor(random() * SKIN.length)]
    const hair = HAIR[Math.floor(random() * HAIR.length)]
    const shirt = SHIRT[Math.floor(random() * SHIRT.length)]
    const metal = METAL[Math.floor(random() * METAL.length)]
    const eye = EYES[Math.floor(random() * EYES.length)]
    const hat = !robot && random() < 0.3
    for (const cheering of [false, true]) {
      const left = cheering ? CELL.width : 0
      const top = variant * CELL.height
      const ox = left + 2
      dot(ox - 1, top + 6, 8, 7, INK)
      dot(ox, top + 7, 6, 6, robot ? metal : shirt)
      dot(ox, top + 7, 6, 1, 'rgba(255,255,255,0.25)')
      const arm = robot ? metal : skin
      if (cheering) {
        dot(ox - 2, top + 1, 2, 7, INK)
        dot(ox + 6, top + 1, 2, 7, INK)
        dot(ox - 1, top + 2, 1, 5, arm)
        dot(ox + 6, top + 2, 1, 5, arm)
      } else {
        dot(ox - 2, top + 7, 2, 5, INK)
        dot(ox + 6, top + 7, 2, 5, INK)
        dot(ox - 1, top + 8, 1, 3, arm)
        dot(ox + 6, top + 8, 1, 3, arm)
      }
      if (robot) {
        dot(ox - 1, top + 1, 8, 6, INK)
        dot(ox, top + 2, 6, 4, metal)
        dot(ox + 1, top + 3, 4, 2, '#1d2624')
        dot(ox + 1, top + 3, 1, 1, eye)
        dot(ox + 4, top + 3, 1, 1, eye)
        dot(ox + 2, top, 2, 1, INK)
      } else {
        dot(ox, top + 1, 6, 6, INK)
        dot(ox + 1, top + 2, 4, 4, skin)
        dot(ox + 1, top + 2, 4, 1, hair)
        if (hat) {
          dot(ox, top + 1, 6, 1, '#3a2a1c')
          dot(ox - 1, top + 2, 8, 1, '#3a2a1c')
        }
      }
    }
  }
  return canvas
}
