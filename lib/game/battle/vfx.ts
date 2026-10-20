import type { Particles, ParticleSpec } from '../fx/particles'
import { glowTexture, puffTexture, ringTexture, seeded, type RGB } from '../fx/textures'
import { ELEMENTS, rgba, type Ailment, type Element } from './elements'

export type BoltStyle = 'pulse' | 'heavy' | 'thin'

export type BoltLook = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  height: number
  element: Element
  style: BoltStyle
  seed: number
}

export type MeteorLook = { x: number; y: number; radius: number; delay: number; total: number; element: Element; seed: number }

type Decal = { x: number; y: number; element: Element; size: number; age: number; life: number; seed: number }
type FxRing = { x: number; y: number; radius: number; age: number; life: number; color: RGB; additive: boolean }
type Arc = { x1: number; y1: number; x2: number; y2: number; age: number; life: number; color: RGB; seed: number }

const MAX_DECALS = 48
const TAU = Math.PI * 2

const sprites = new Map<string, HTMLCanvasElement>()

function paint(key: string, size: number, draw: (context: CanvasRenderingContext2D, size: number) => void) {
  let sprite = sprites.get(key)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = size
    sprite.height = size
    const context = sprite.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível para os efeitos elementais.')
    draw(context, size)
    sprites.set(key, sprite)
  }
  return sprite
}

const glow = (color: RGB, size = 32) => glowTexture(color, size)

function embers(element: Element) {
  const def = ELEMENTS[element]
  return [glow(def.glow), glow(def.color), glow(def.dark)]
}

function droplet() {
  return paint('droplet', 24, (context, size) => {
    const c = size / 2
    context.fillStyle = 'rgba(30, 90, 190, 0.95)'
    context.beginPath()
    context.arc(c, c + 1, c * 0.62, 0, TAU)
    context.fill()
    context.fillStyle = 'rgba(120, 200, 255, 1)'
    context.beginPath()
    context.arc(c, c, c * 0.5, 0, TAU)
    context.fill()
    context.fillStyle = 'rgba(255, 255, 255, 0.9)'
    context.beginPath()
    context.arc(c - 3, c - 3, c * 0.18, 0, TAU)
    context.fill()
  })
}

function chips() {
  return [0, 1, 2].map((variant) =>
    paint(`chip:${variant}`, 28, (context, size) => {
      const random = seeded(311 + variant * 97)
      const c = size / 2
      const corners = 5 + variant
      const points: [number, number][] = []
      for (let i = 0; i < corners; i++) {
        const angle = (i / corners) * TAU + random() * 0.5
        const distance = c * (0.55 + random() * 0.35)
        points.push([c + Math.cos(angle) * distance, c + Math.sin(angle) * distance])
      }
      const shape = () => {
        context.beginPath()
        points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
        context.closePath()
      }
      shape()
      context.fillStyle = ['#7a5332', '#8e6440', '#6b4a2c'][variant]
      context.fill()
      context.lineWidth = 2
      context.strokeStyle = '#3f2814'
      context.stroke()
      context.save()
      shape()
      context.clip()
      context.fillStyle = 'rgba(232, 196, 140, 0.55)'
      context.fillRect(0, 0, size, c * 0.8)
      context.restore()
    }),
  )
}

function shard() {
  return paint('shard', 28, (context, size) => {
    const c = size / 2
    context.beginPath()
    context.moveTo(c, 2)
    context.lineTo(c + 6, c)
    context.lineTo(c, size - 2)
    context.lineTo(c - 6, c)
    context.closePath()
    context.fillStyle = 'rgba(170, 228, 255, 0.95)'
    context.fill()
    context.lineWidth = 1.5
    context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    context.stroke()
    context.beginPath()
    context.moveTo(c, 4)
    context.lineTo(c, size - 4)
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    context.stroke()
  })
}

function star(color: RGB) {
  return paint(`star:${color}`, 32, (context, size) => {
    const c = size / 2
    const gradient = context.createRadialGradient(c, c, 0, c, c, c)
    gradient.addColorStop(0, rgba([255, 255, 255], 1))
    gradient.addColorStop(0.25, rgba(color, 0.9))
    gradient.addColorStop(1, rgba(color, 0))
    context.fillStyle = gradient
    for (const [w, h] of [
      [c * 0.22, c],
      [c, c * 0.22],
    ]) {
      context.beginPath()
      context.ellipse(c, c, w, h, 0, 0, TAU)
      context.fill()
    }
  })
}

const PUFF: Record<Element, RGB> = {
  fogo: [60, 46, 40],
  agua: [170, 210, 240],
  terra: [138, 108, 78],
  vento: [210, 240, 232],
  raio: [120, 120, 150],
  gelo: [220, 240, 255],
  luz: [255, 246, 214],
  sombra: [46, 22, 76],
}

export class ElementFx {
  private readonly decals: Decal[] = []
  private readonly rings: FxRing[] = []
  private readonly arcs: Arc[] = []
  private readonly trailClocks = new WeakMap<object, number>()

  constructor(private readonly particles: Particles) {}

  update(dt: number) {
    for (const list of [this.decals, this.rings, this.arcs] as { age: number; life: number }[][]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].age += dt
        if (list[i].age >= list[i].life) list.splice(i, 1)
      }
    }
  }

  clear() {
    this.decals.length = 0
    this.rings.length = 0
    this.arcs.length = 0
  }

  private spawn(spec: ParticleSpec) {
    this.particles.spawn(spec)
  }

  ring(x: number, y: number, radius: number, life: number, color: RGB, additive = true) {
    this.rings.push({ x, y, radius, age: 0, life, color, additive })
  }

  arc(x1: number, y1: number, x2: number, y2: number, color: RGB = ELEMENTS.raio.glow, life = 0.16) {
    this.arcs.push({ x1, y1, x2, y2, age: 0, life, color, seed: Math.random() * 1000 })
  }

  decal(element: Element, x: number, y: number, size: number) {
    if (element === 'vento') return
    this.decals.push({ x, y, element, size, age: 0, life: element === 'agua' || element === 'gelo' ? 5 : 4, seed: Math.random() * 1000 })
    if (this.decals.length > MAX_DECALS) this.decals.shift()
  }

  sparks(color: RGB, x: number, y: number, z: number, count: number, power: number) {
    const sprite = glow(color)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU
      const speed = power * (0.4 + Math.random() * 0.8)
      this.spawn({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5,
        vz: 120 + Math.random() * 260,
        gravity: 900,
        life: 0.35 + Math.random() * 0.4,
        size: 14 + Math.random() * 10,
        sizeEnd: 3,
        drag: 2.5,
        stretch: 0.0012,
        sprite,
        blend: 'add',
        fadeIn: 0.02,
      })
    }
  }

  puff(element: Element, x: number, y: number, amount: number) {
    const color = PUFF[element]
    for (let i = 0; i < Math.round(3 * amount); i++) {
      const angle = Math.random() * TAU
      this.spawn({
        x: x + Math.cos(angle) * 16,
        y: y + Math.sin(angle) * 8,
        vx: Math.cos(angle) * 60 * amount,
        vy: Math.sin(angle) * 24 * amount,
        rise: element === 'fogo' || element === 'sombra' ? 50 : 16,
        life: 0.6 + Math.random() * 0.5,
        size: 40 * amount,
        sizeEnd: 120 * amount,
        alpha: element === 'luz' ? 0.25 : 0.4,
        drag: 2.5,
        sprite: puffTexture(color, i % 2),
        blend: 'haze',
        fadeIn: 0.1,
      })
    }
  }

  muzzle(element: Element, x: number, y: number, z: number, angle: number, scale = 1) {
    const def = ELEMENTS[element]
    this.spawn({ x, y, z, life: 0.12, size: 70 * scale, sizeEnd: 30 * scale, sprite: glow(def.glow, 64), blend: 'add', fadeIn: 0.01 })
    const sprite = element === 'terra' ? chips() : element === 'agua' ? droplet() : element === 'gelo' ? shard() : glow(def.color)
    const solid = element === 'terra' || element === 'agua' || element === 'gelo'
    for (let i = 0; i < 5; i++) {
      const spread = angle + (Math.random() - 0.5) * 1.1
      const speed = (260 + Math.random() * 260) * scale
      this.spawn({
        x,
        y,
        z,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed * 0.6,
        vz: solid ? 80 + Math.random() * 120 : 0,
        gravity: solid ? 900 : 0,
        drag: 4,
        life: 0.2 + Math.random() * 0.15,
        size: (solid ? 12 : 16) * scale,
        sizeEnd: 4,
        spin: solid ? (Math.random() - 0.5) * 12 : 0,
        stretch: solid ? 0 : 0.001,
        sprite,
        blend: solid ? 'normal' : 'add',
        fadeIn: 0.02,
      })
    }
  }

  trail(bolt: BoltLook & object, dt: number) {
    const def = ELEMENTS[bolt.element]
    const rate = bolt.style === 'heavy' ? 70 : bolt.style === 'thin' ? 55 : 45
    let clock = (this.trailClocks.get(bolt) ?? 0) + dt * rate
    const z = bolt.height
    const back = Math.atan2(bolt.vy, bolt.vx) + Math.PI
    const scale = bolt.style === 'heavy' ? 1.5 : 1
    while (clock >= 1) {
      clock -= 1
      const jitter = (Math.random() - 0.5) * bolt.size * 0.8
      const x = bolt.x + Math.cos(back + Math.PI / 2) * jitter
      const y = bolt.y + Math.sin(back + Math.PI / 2) * jitter * 0.6
      switch (bolt.element) {
        case 'fogo':
          this.spawn({ x, y, z, vx: Math.cos(back) * 60, vy: Math.sin(back) * 30, rise: 70, wobble: 40, life: 0.35 + Math.random() * 0.25, size: 26 * scale, sizeEnd: 6, sprite: embers('fogo'), blend: 'add', fadeIn: 0.05 })
          if (Math.random() < 0.15) this.spawn({ x, y, z, rise: 60, life: 0.8, size: 24 * scale, sizeEnd: 70 * scale, alpha: 0.28, sprite: puffTexture(PUFF.fogo, 0), blend: 'haze', fadeIn: 0.2 })
          break
        case 'agua':
          this.spawn({ x, y, z, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 40, vz: 40, gravity: 700, life: 0.4, size: 9 * scale, sizeEnd: 5, sprite: droplet(), blend: 'normal', fadeIn: 0.05 })
          if (Math.random() < 0.3) this.spawn({ x, y, z, life: 0.3, size: 20 * scale, sizeEnd: 8, alpha: 0.6, sprite: glow(def.glow), blend: 'add' })
          break
        case 'terra':
          if (Math.random() < 0.4) this.spawn({ x, y, z: z * 0.6, vx: (Math.random() - 0.5) * 60, vz: 60, gravity: 900, spin: 8, life: 0.5, size: 8 * scale, sizeEnd: 6, sprite: chips()[Math.floor(Math.random() * 3)], blend: 'normal', shadow: true })
          this.spawn({ x, y, z: z * 0.5, rise: 12, life: 0.55, size: 20 * scale, sizeEnd: 60 * scale, alpha: 0.32, sprite: puffTexture(PUFF.terra, 1), blend: 'haze', fadeIn: 0.15 })
          break
        case 'vento':
          this.spawn({ x, y, z, vx: Math.cos(back) * 160, vy: Math.sin(back) * 80, life: 0.22, size: 14 * scale, sizeEnd: 4, stretch: 0.004, sprite: glow(def.glow), blend: 'add', alpha: 0.7 })
          break
        case 'raio':
          this.spawn({ x, y, z, vx: (Math.random() - 0.5) * 420, vy: (Math.random() - 0.5) * 240, drag: 6, life: 0.14, size: 10 * scale, sizeEnd: 2, stretch: 0.003, sprite: glow(def.glow), blend: 'add' })
          break
        case 'gelo':
          this.spawn({ x, y, z, vx: (Math.random() - 0.5) * 40, vz: 20, gravity: 300, life: 0.5, size: 10 * scale, sizeEnd: 3, sprite: star(def.color), blend: 'add', fadeIn: 0.05 })
          if (Math.random() < 0.2) this.spawn({ x, y, z, life: 0.6, size: 18 * scale, sizeEnd: 50 * scale, alpha: 0.3, sprite: puffTexture(PUFF.gelo, 0), blend: 'haze' })
          break
        case 'luz':
          this.spawn({ x, y, z, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 30, life: 0.35, size: 14 * scale, sizeEnd: 2, spin: 6, angle: Math.random() * TAU, sprite: star(def.color), blend: 'add' })
          break
        case 'sombra':
          this.spawn({ x, y, z, vx: (Math.random() - 0.5) * 40, rise: 30, wobble: 60, life: 0.6, size: 22 * scale, sizeEnd: 48 * scale, alpha: 0.5, sprite: puffTexture(PUFF.sombra, Math.floor(Math.random() * 2)), blend: 'haze', fadeIn: 0.1 })
          if (Math.random() < 0.4) this.spawn({ x, y, z, rise: 40, life: 0.4, size: 12, sizeEnd: 3, sprite: glow(def.glow), blend: 'add', alpha: 0.8 })
          break
      }
    }
    this.trailClocks.set(bolt, clock)
  }

  impact(element: Element, x: number, y: number, z: number, power = 1) {
    const def = ELEMENTS[element]
    this.spawn({ x, y, z, life: 0.16, size: 120 * power, sizeEnd: 40 * power, sprite: glow(def.glow, 64), blend: 'add', fadeIn: 0.01 })
    this.ring(x, y, 70 + 70 * power, 0.32, def.color)
    const count = Math.round(12 * Math.min(1.8, power))
    switch (element) {
      case 'fogo': {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const speed = (180 + Math.random() * 320) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, rise: 120, wobble: 30, drag: 3.5, life: 0.4 + Math.random() * 0.4, size: (22 + Math.random() * 18) * power, sizeEnd: 4, sprite: embers('fogo'), blend: 'add', fadeIn: 0.03 })
        }
        for (let i = 0; i < 3; i++) this.spawn({ x: x + (Math.random() - 0.5) * 30, y, z: z + 10, rise: 140, life: 0.45, size: 60 * power, sizeEnd: 16, sprite: embers('fogo'), blend: 'add', fadeIn: 0.05 })
        this.puff('fogo', x, y, 0.8 * power)
        break
      }
      case 'agua': {
        for (let i = 0; i < count + 4; i++) {
          const angle = Math.random() * TAU
          const speed = (140 + Math.random() * 240) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, vz: 200 + Math.random() * 320, gravity: 1300, bounce: 0.2, shadow: true, life: 0.6 + Math.random() * 0.3, size: (10 + Math.random() * 8) * power, sizeEnd: 6, sprite: droplet(), blend: 'normal', fadeIn: 0.02 })
        }
        this.ring(x, y, 110 * power, 0.5, def.glow, false)
        this.puff('agua', x, y, 0.7 * power)
        break
      }
      case 'terra': {
        const set = chips()
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const speed = (120 + Math.random() * 260) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, vz: 260 + Math.random() * 360, gravity: 1500, bounce: 0.35, shadow: true, spin: (Math.random() - 0.5) * 18, life: 0.9 + Math.random() * 0.4, size: (12 + Math.random() * 12) * power, sizeEnd: 9, sprite: set[i % 3], blend: 'normal', fadeIn: 0.01 })
        }
        this.puff('terra', x, y, 1.2 * power)
        break
      }
      case 'vento': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * TAU
          const speed = (380 + Math.random() * 260) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.55, drag: 4, life: 0.3, size: 18 * power, sizeEnd: 4, stretch: 0.003, sprite: glow(def.glow), blend: 'add', alpha: 0.85 })
        }
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * TAU
          this.spawn({ x: x + Math.cos(angle) * 40, y: y + Math.sin(angle) * 20, z, vx: -Math.sin(angle) * 260, vy: Math.cos(angle) * 130, drag: 3, life: 0.45, size: 26, sizeEnd: 6, alpha: 0.5, sprite: glow([255, 255, 255]), blend: 'add' })
        }
        this.ring(x, y, 150 * power, 0.35, def.glow)
        break
      }
      case 'raio': {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const speed = (400 + Math.random() * 500) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, vz: 100 + Math.random() * 200, gravity: 700, drag: 3, life: 0.25 + Math.random() * 0.2, size: 12, sizeEnd: 2, stretch: 0.002, sprite: glow(def.glow), blend: 'add' })
        }
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * TAU
          const length = (60 + Math.random() * 80) * power
          this.arc(x, y - z, x + Math.cos(angle) * length, y - z + Math.sin(angle) * length * 0.6)
        }
        break
      }
      case 'gelo': {
        const sprite = shard()
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const speed = (160 + Math.random() * 260) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, vz: 220 + Math.random() * 300, gravity: 1400, bounce: 0.3, shadow: true, spin: (Math.random() - 0.5) * 16, angle: Math.random() * TAU, life: 0.7 + Math.random() * 0.3, size: (14 + Math.random() * 10) * power, sizeEnd: 8, sprite, blend: 'normal', fadeIn: 0.01 })
        }
        for (let i = 0; i < 8; i++) this.spawn({ x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 30, z: z * Math.random(), rise: 20, life: 0.8, size: 12, sizeEnd: 2, sprite: star(def.color), blend: 'add' })
        this.puff('gelo', x, y, 0.8 * power)
        break
      }
      case 'luz': {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * TAU
          this.spawn({ x, y, z, vx: Math.cos(angle) * 520 * power, vy: Math.sin(angle) * 260 * power, drag: 5, life: 0.3, size: 20 * power, sizeEnd: 4, stretch: 0.004, sprite: glow(def.glow), blend: 'add' })
        }
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const speed = (80 + Math.random() * 200) * power
          this.spawn({ x, y, z, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, rise: 30, drag: 2, spin: 5, life: 0.6 + Math.random() * 0.3, size: (16 + Math.random() * 10) * power, sizeEnd: 2, sprite: star(def.color), blend: 'add' })
        }
        this.spawn({ x, y, z, life: 0.28, size: 260 * power, sizeEnd: 120, alpha: 0.6, sprite: glow([255, 255, 240], 64), blend: 'add', fadeIn: 0.02 })
        break
      }
      case 'sombra': {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * TAU
          const distance = (70 + Math.random() * 60) * power
          this.spawn({ x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance * 0.5, z, vx: -Math.cos(angle) * distance * 3, vy: -Math.sin(angle) * distance * 1.5, life: 0.33, size: 16, sizeEnd: 3, sprite: glow(def.glow), blend: 'add', fadeIn: 0.1 })
        }
        this.puff('sombra', x, y, 1.1 * power)
        this.ring(x, y, 120 * power, 0.45, def.dark, false)
        break
      }
    }
    this.decal(element, x, y, 60 + 50 * power)
  }

  swing(element: Element, x: number, y: number, angle: number, radius: number, heavy: boolean) {
    const def = ELEMENTS[element]
    const steps = heavy ? 9 : 6
    for (let i = 0; i < steps; i++) {
      const a = angle - 0.9 + (i / (steps - 1)) * 1.8
      const px = x + Math.cos(a) * radius
      const py = y + Math.sin(a) * radius * 0.7
      const tangent = a + Math.PI / 2
      const speed = 160 + Math.random() * 120
      const base = { x: px, y: py + 40, z: 40, vx: Math.cos(tangent) * speed, vy: Math.sin(tangent) * speed * 0.6 }
      switch (element) {
        case 'fogo':
          this.spawn({ ...base, rise: 80, drag: 3, life: 0.35, size: 22, sizeEnd: 4, sprite: embers('fogo'), blend: 'add' })
          break
        case 'agua':
          this.spawn({ ...base, vz: 160, gravity: 1100, life: 0.45, size: 10, sizeEnd: 5, sprite: droplet(), blend: 'normal', shadow: true })
          break
        case 'terra':
          if (i % 2 === 0) this.spawn({ ...base, vz: 200, gravity: 1400, bounce: 0.3, spin: 10, life: 0.6, size: 12, sizeEnd: 8, sprite: chips()[i % 3], blend: 'normal', shadow: true })
          break
        case 'vento':
          this.spawn({ ...base, vx: base.vx * 2, vy: base.vy * 2, drag: 4, life: 0.25, size: 16, sizeEnd: 3, stretch: 0.004, sprite: glow(def.glow), blend: 'add' })
          break
        case 'raio':
          this.spawn({ ...base, vx: base.vx * 2.4, vy: base.vy * 2.4, drag: 5, life: 0.18, size: 10, sizeEnd: 2, stretch: 0.003, sprite: glow(def.glow), blend: 'add' })
          break
        case 'gelo':
          this.spawn({ ...base, vz: 140, gravity: 900, spin: 10, life: 0.45, size: 12, sizeEnd: 6, sprite: shard(), blend: 'normal' })
          break
        case 'luz':
          this.spawn({ ...base, life: 0.35, spin: 6, size: 16, sizeEnd: 2, sprite: star(def.color), blend: 'add' })
          break
        case 'sombra':
          this.spawn({ ...base, rise: 40, life: 0.5, size: 24, sizeEnd: 40, alpha: 0.45, sprite: puffTexture(PUFF.sombra, i % 2), blend: 'haze' })
          break
      }
    }
    if (element === 'raio' && Math.random() < 0.7) {
      const a = angle + (Math.random() - 0.5)
      this.arc(x, y, x + Math.cos(a) * radius * 1.3, y + Math.sin(a) * radius)
    }
  }

  shockwave(element: Element, x: number, y: number, radius: number) {
    const def = ELEMENTS[element]
    this.ring(x, y, radius, 0.5, def.color)
    this.ring(x, y, radius * 0.7, 0.38, def.glow)
    this.ring(x, y, radius * 1.05, 0.6, def.dark, false)
    const count = 26
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU
      const speed = radius * 2.2
      const spec: ParticleSpec = { x, y, z: 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.6, drag: 3.2, life: 0.5, size: 30, sizeEnd: 8, sprite: glow(def.color), blend: 'add', fadeIn: 0.02 }
      this.spawn(spec)
      if (i % 3 === 0) this.impactBit(element, x + Math.cos(angle) * radius * 0.6, y + Math.sin(angle) * radius * 0.36)
    }
    this.puff(element, x, y, 1.6)
    this.decal(element, x, y, radius * 0.9)
  }

  private impactBit(element: Element, x: number, y: number) {
    const def = ELEMENTS[element]
    switch (element) {
      case 'terra':
        this.spawn({ x, y, vz: 380, gravity: 1500, bounce: 0.3, spin: 12, shadow: true, life: 0.8, size: 16, sizeEnd: 10, sprite: chips()[Math.floor(Math.random() * 3)], blend: 'normal' })
        break
      case 'agua':
        this.spawn({ x, y, vz: 320, gravity: 1300, shadow: true, life: 0.6, size: 12, sizeEnd: 6, sprite: droplet(), blend: 'normal' })
        break
      case 'gelo':
        this.spawn({ x, y, vz: 300, gravity: 1300, spin: 10, shadow: true, life: 0.7, size: 16, sizeEnd: 8, sprite: shard(), blend: 'normal' })
        break
      default:
        this.spawn({ x, y, rise: 120, life: 0.5, size: 26, sizeEnd: 4, sprite: element === 'luz' ? star(def.color) : embers(element), blend: 'add' })
    }
  }

  ailment(ailment: Ailment, x: number, y: number, height: number) {
    const top = height
    switch (ailment) {
      case 'queimadura':
        this.spawn({ x: x + (Math.random() - 0.5) * 50, y, z: top * (0.3 + Math.random() * 0.6), rise: 110, wobble: 30, life: 0.5, size: 22, sizeEnd: 4, sprite: embers('fogo'), blend: 'add' })
        break
      case 'encharcado':
        this.spawn({ x: x + (Math.random() - 0.5) * 50, y, z: top * (0.4 + Math.random() * 0.5), vz: -40, gravity: 900, life: 0.5, size: 9, sizeEnd: 6, sprite: droplet(), blend: 'normal' })
        break
      case 'abalado':
        this.spawn({ x: x + (Math.random() - 0.5) * 60, y: y + 4, rise: 10, life: 0.5, size: 30, sizeEnd: 60, alpha: 0.3, sprite: puffTexture(PUFF.terra, 0), blend: 'haze' })
        break
      case 'arrastado':
        this.spawn({ x: x - 60, y, z: top * Math.random(), vx: 320, life: 0.25, size: 14, sizeEnd: 3, stretch: 0.004, sprite: glow(ELEMENTS.vento.glow), blend: 'add' })
        break
      case 'choque': {
        this.spawn({ x: x + (Math.random() - 0.5) * 60, y, z: top * Math.random(), vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 120, drag: 6, life: 0.15, size: 12, sizeEnd: 2, stretch: 0.003, sprite: glow(ELEMENTS.raio.glow), blend: 'add' })
        if (Math.random() < 0.35) this.arc(x - 30, y - top * 0.5, x + 30, y - top * 0.7, ELEMENTS.raio.glow, 0.1)
        break
      }
      case 'congelado':
        this.spawn({ x: x + (Math.random() - 0.5) * 56, y, z: top * Math.random(), rise: 14, life: 0.7, size: 12, sizeEnd: 2, sprite: star(ELEMENTS.gelo.color), blend: 'add' })
        break
      case 'ofuscado': {
        const angle = Math.random() * TAU
        this.spawn({ x: x + Math.cos(angle) * 36, y: y + Math.sin(angle) * 12, z: top + 16, vx: -Math.sin(angle) * 80, vy: Math.cos(angle) * 30, life: 0.5, size: 16, sizeEnd: 4, spin: 6, sprite: star(ELEMENTS.luz.color), blend: 'add' })
        break
      }
      case 'drenado':
        this.spawn({ x: x + (Math.random() - 0.5) * 50, y, z: top * Math.random(), rise: 70, wobble: 40, life: 0.6, size: 18, sizeEnd: 36, alpha: 0.5, sprite: puffTexture(PUFF.sombra, 0), blend: 'haze' })
        break
    }
  }

  aura(color: RGB, x: number, y: number, height: number, amount = 1) {
    this.spawn({
      x: x + (Math.random() - 0.5) * 70,
      y: y + (Math.random() - 0.5) * 12,
      z: height * Math.random() * 0.8,
      rise: 90 + Math.random() * 60,
      wobble: 30,
      life: 0.5 + Math.random() * 0.4,
      size: 14 * amount + Math.random() * 10,
      sizeEnd: 2,
      sprite: glow(color),
      blend: 'add',
      fadeIn: 0.1,
    })
  }

  drawGround(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    for (const decal of this.decals) this.drawDecal(context, originX, originY, zoom, decal)
    for (const ring of this.rings) if (!ring.additive) this.drawRing(context, originX, originY, zoom, ring)
  }

  drawGlow(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number) {
    for (const ring of this.rings) if (ring.additive) this.drawRing(context, originX, originY, zoom, ring)
    for (const arc of this.arcs) this.drawArc(context, originX, originY, zoom, arc, time)
    for (const decal of this.decals) {
      if (decal.element !== 'fogo' && decal.element !== 'raio') continue
      const heat = 1 - decal.age / decal.life
      if (heat <= 0.3) continue
      const sprite = glow(ELEMENTS[decal.element].color, 64)
      const size = decal.size * 1.4 * zoom
      context.globalAlpha = (heat - 0.3) * 0.5
      context.drawImage(sprite, originX + decal.x * zoom - size / 2, originY + decal.y * zoom - size * 0.3, size, size * 0.6)
    }
    context.globalAlpha = 1
  }

  private drawRing(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, ring: FxRing) {
    const t = ring.age / ring.life
    const eased = 1 - Math.pow(1 - t, 3)
    const radius = ring.radius * eased * zoom
    const alpha = (ring.additive ? 0.9 : 0.55) * (1 - t) * (1 - t)
    if (alpha <= 0.01 || radius < 1) return
    context.globalAlpha = alpha
    context.drawImage(ringTexture(ring.color), originX + ring.x * zoom - radius, originY + ring.y * zoom - radius * 0.62, radius * 2, radius * 1.24)
    context.globalAlpha = 1
  }

  private drawArc(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, arc: Arc, time: number) {
    const t = arc.age / arc.life
    const random = seeded(Math.floor(arc.seed + time * 30))
    const x1 = originX + arc.x1 * zoom
    const y1 = originY + arc.y1 * zoom
    const x2 = originX + arc.x2 * zoom
    const y2 = originY + arc.y2 * zoom
    const length = Math.hypot(x2 - x1, y2 - y1)
    const nx = -(y2 - y1) / (length || 1)
    const ny = (x2 - x1) / (length || 1)
    const points: [number, number][] = [[x1, y1]]
    const segments = 6
    for (let i = 1; i < segments; i++) {
      const f = i / segments
      const offset = (random() - 0.5) * length * 0.35
      points.push([x1 + (x2 - x1) * f + nx * offset, y1 + (y2 - y1) * f + ny * offset])
    }
    points.push([x2, y2])
    const trace = () => {
      context.beginPath()
      points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
    }
    context.lineJoin = 'round'
    context.globalAlpha = (1 - t) * 0.8
    context.strokeStyle = rgba(arc.color, 1)
    context.lineWidth = Math.max(2, 7 * zoom)
    trace()
    context.stroke()
    context.globalAlpha = 1 - t
    context.strokeStyle = '#ffffff'
    context.lineWidth = Math.max(1, 2.5 * zoom)
    trace()
    context.stroke()
    context.globalAlpha = 1
  }

  private drawDecal(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, decal: Decal) {
    const fade = Math.min(1, (decal.life - decal.age) / 1.2) * Math.min(1, decal.age / 0.08)
    if (fade <= 0.01) return
    const x = originX + decal.x * zoom
    const y = originY + decal.y * zoom
    const rx = decal.size * zoom
    const ry = rx * 0.55
    const def = ELEMENTS[decal.element]
    context.save()
    context.globalAlpha = fade
    switch (decal.element) {
      case 'fogo':
      case 'raio': {
        const gradient = context.createRadialGradient(x, y, 0, x, y, rx)
        gradient.addColorStop(0, 'rgba(18, 12, 10, 0.6)')
        gradient.addColorStop(0.6, 'rgba(30, 20, 14, 0.35)')
        gradient.addColorStop(1, 'rgba(30, 20, 14, 0)')
        context.fillStyle = gradient
        context.setTransform(1, 0, 0, 0.55, 0, y * 0.45)
        context.beginPath()
        context.arc(x, y, rx, 0, TAU)
        context.fill()
        break
      }
      case 'agua': {
        context.fillStyle = 'rgba(60, 130, 220, 0.32)'
        context.beginPath()
        context.ellipse(x, y, rx * 0.9, ry * 0.8, 0, 0, TAU)
        context.fill()
        context.strokeStyle = 'rgba(190, 230, 255, 0.4)'
        context.lineWidth = Math.max(1, 2 * zoom)
        context.stroke()
        break
      }
      case 'terra': {
        const random = seeded(Math.floor(decal.seed))
        context.strokeStyle = 'rgba(40, 26, 14, 0.7)'
        context.lineWidth = Math.max(1, 3 * zoom)
        context.lineCap = 'round'
        for (let i = 0; i < 6; i++) {
          let angle = random() * TAU
          let px = x
          let py = y
          context.beginPath()
          context.moveTo(px, py)
          for (let s = 0; s < 3; s++) {
            angle += (random() - 0.5) * 0.9
            const step = rx * (0.25 + random() * 0.2)
            px += Math.cos(angle) * step
            py += Math.sin(angle) * step * 0.55
            context.lineTo(px, py)
          }
          context.stroke()
        }
        break
      }
      case 'gelo': {
        context.fillStyle = 'rgba(200, 236, 255, 0.35)'
        context.beginPath()
        context.ellipse(x, y, rx * 0.85, ry * 0.8, 0, 0, TAU)
        context.fill()
        const random = seeded(Math.floor(decal.seed))
        context.strokeStyle = 'rgba(240, 252, 255, 0.7)'
        context.lineWidth = Math.max(1, 2 * zoom)
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * TAU + random() * 0.3
          const length = rx * (0.5 + random() * 0.4)
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length * 0.55)
          context.stroke()
        }
        break
      }
      case 'luz': {
        context.strokeStyle = rgba(def.dark, 0.5)
        context.lineWidth = Math.max(1, 2 * zoom)
        context.beginPath()
        context.ellipse(x, y, rx * 0.7, ry * 0.7, 0, 0, TAU)
        context.stroke()
        context.beginPath()
        context.ellipse(x, y, rx * 0.45, ry * 0.45, 0, 0, TAU)
        context.stroke()
        break
      }
      case 'sombra': {
        const gradient = context.createRadialGradient(x, y, 0, x, y, rx)
        gradient.addColorStop(0, 'rgba(26, 8, 46, 0.6)')
        gradient.addColorStop(1, 'rgba(26, 8, 46, 0)')
        context.fillStyle = gradient
        context.setTransform(1, 0, 0, 0.55, 0, y * 0.45)
        context.beginPath()
        context.arc(x, y, rx, 0, TAU)
        context.fill()
        break
      }
    }
    context.restore()
  }

  drawBoltCore(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, bolt: BoltLook, time: number) {
    const x = originX + bolt.x * zoom
    const y = originY + (bolt.y - bolt.height) * zoom
    const r = Math.max(2, bolt.size * 0.5 * zoom * (bolt.style === 'heavy' ? 1.25 : 1))
    const angle = Math.atan2(bolt.vy, bolt.vx)
    context.fillStyle = 'rgba(16, 12, 10, 0.28)'
    context.beginPath()
    context.ellipse(originX + bolt.x * zoom, originY + bolt.y * zoom, r * 1.5, r * 0.6, 0, 0, TAU)
    context.fill()
    if (bolt.style === 'thin') {
      this.drawBeam(context, x, y, r, bolt, zoom)
      return
    }
    switch (bolt.element) {
      case 'fogo':
        drawFire(context, x, y, r, angle, time, bolt.seed)
        break
      case 'agua':
        drawWater(context, x, y, r, angle, time)
        break
      case 'terra':
        drawRock(context, x, y, r * 1.15, time * 9 + bolt.seed, bolt.seed)
        break
      case 'vento':
        drawCrescent(context, x, y, r, angle)
        break
      case 'raio':
        drawBolt(context, x, y, r, bolt, zoom, time)
        break
      case 'gelo':
        drawCrystal(context, x, y, r, time * 7 + bolt.seed)
        break
      case 'luz':
        drawLance(context, x, y, r, angle, time)
        break
      case 'sombra':
        drawOrb(context, x, y, r, angle, time, bolt.seed)
        break
    }
  }

  private drawBeam(context: CanvasRenderingContext2D, x: number, y: number, r: number, bolt: BoltLook, zoom: number) {
    const def = ELEMENTS[bolt.element]
    const speed = Math.hypot(bolt.vx, bolt.vy) || 1
    const length = Math.min(260, speed * 0.075) * zoom
    const tx = x - (bolt.vx / speed) * length
    const ty = y - (bolt.vy / speed) * length
    context.lineCap = 'round'
    context.strokeStyle = rgba(bolt.element === 'sombra' ? [24, 8, 44] : def.color, 0.95)
    context.lineWidth = r * 1.3
    context.beginPath()
    context.moveTo(tx, ty)
    context.lineTo(x, y)
    context.stroke()
    context.strokeStyle = bolt.element === 'sombra' ? rgba(def.glow, 0.9) : '#fffdf4'
    context.lineWidth = r * 0.5
    context.stroke()
  }

  drawBoltGlow(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, bolt: BoltLook) {
    const def = ELEMENTS[bolt.element]
    if (bolt.element === 'terra' && bolt.style !== 'thin') return
    const sprite = glowTexture(def.color, 64)
    const x = originX + bolt.x * zoom
    const y = originY + (bolt.y - bolt.height) * zoom
    const size = bolt.size * (bolt.style === 'heavy' ? 6.5 : 5) * zoom
    const angle = Math.atan2(bolt.vy, bolt.vx)
    const speed = Math.hypot(bolt.vx, bolt.vy)
    const length = size * (1.4 + speed / 900) * (bolt.style === 'thin' ? 1.8 : 1)
    context.setTransform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), x, y)
    context.globalAlpha = bolt.element === 'sombra' ? 0.55 : 0.85
    context.drawImage(sprite, -length * 0.8, -size / 2, length, size)
    context.globalAlpha = 0.6
    context.drawImage(glowTexture(def.glow, 64), -size * 0.35, -size * 0.35, size * 0.7, size * 0.7)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
  }

  drawMeteorMark(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, meteor: MeteorLook, time: number, hostile: boolean) {
    const def = ELEMENTS[meteor.element]
    const x = originX + meteor.x * zoom
    const y = originY + meteor.y * zoom
    const progress = 1 - Math.max(0, meteor.delay) / meteor.total
    const rx = meteor.radius * zoom
    const ry = rx * 0.6
    const color = hostile ? ([255, 96, 80] as RGB) : def.color
    context.fillStyle = rgba(color, 0.08 + progress * 0.14)
    context.beginPath()
    context.ellipse(x, y, rx, ry, 0, 0, TAU)
    context.fill()
    context.strokeStyle = rgba(color, 0.5 + 0.4 * Math.abs(Math.sin(time * 12)))
    context.lineWidth = Math.max(1.5, 3 * zoom)
    context.stroke()
    context.fillStyle = rgba(color, 0.25 + 0.3 * progress)
    context.beginPath()
    context.ellipse(x, y, rx * progress, ry * progress, 0, 0, TAU)
    context.fill()
  }

  drawMeteorFall(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, meteor: MeteorLook, time: number) {
    const fall = 0.32
    if (meteor.delay > fall || meteor.delay < 0) return
    const t = 1 - meteor.delay / fall
    const height = (1 - t) * 900
    const drift = (1 - t) * 260
    const look: BoltLook = {
      x: meteor.x - drift,
      y: meteor.y,
      vx: 800,
      vy: 2600,
      age: 0,
      life: 1,
      size: 34,
      height,
      element: meteor.element,
      style: 'heavy',
      seed: meteor.seed,
    }
    this.drawBoltCore(context, originX, originY, zoom, look, time)
  }

  drawMeteorGlow(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, meteor: MeteorLook) {
    const fall = 0.32
    if (meteor.delay > fall || meteor.delay < 0) return
    const t = 1 - meteor.delay / fall
    const look: BoltLook = { x: meteor.x - (1 - t) * 260, y: meteor.y, vx: 800, vy: 2600, age: 0, life: 1, size: 34, height: (1 - t) * 900, element: meteor.element, style: 'heavy', seed: meteor.seed }
    this.drawBoltGlow(context, originX, originY, zoom, look)
  }
}

function circle(context: CanvasRenderingContext2D, x: number, y: number, r: number) {
  context.beginPath()
  context.arc(x, y, Math.max(0.5, r), 0, TAU)
  context.fill()
}

function drawFire(context: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, time: number, seed: number) {
  const back = angle + Math.PI
  const side = back + Math.PI / 2
  for (let i = 5; i >= 1; i--) {
    const distance = r * 0.6 * i
    const wobble = Math.sin(time * 30 + seed + i * 1.7) * r * 0.12 * i
    const px = x + Math.cos(back) * distance + Math.cos(side) * wobble
    const py = y + Math.sin(back) * distance + Math.sin(side) * wobble
    context.fillStyle = i > 3 ? 'rgba(170, 40, 20, 0.5)' : i > 1 ? 'rgba(255, 96, 32, 0.75)' : 'rgba(255, 150, 50, 0.9)'
    circle(context, px, py, r * (1 - i * 0.13))
  }
  context.fillStyle = '#ff7a26'
  circle(context, x, y, r)
  context.fillStyle = '#ffc94e'
  circle(context, x + Math.cos(angle) * r * 0.15, y + Math.sin(angle) * r * 0.15, r * 0.68)
  context.fillStyle = '#fff6d8'
  circle(context, x + Math.cos(angle) * r * 0.25, y + Math.sin(angle) * r * 0.25, r * 0.36)
}

function drawWater(context: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, time: number) {
  const squash = 1 + Math.sin(time * 24) * 0.08
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.fillStyle = 'rgba(28, 96, 210, 0.92)'
  context.beginPath()
  context.ellipse(0, 0, r * 1.2 * squash, r * 0.95 / squash, 0, 0, TAU)
  context.fill()
  context.fillStyle = 'rgba(110, 190, 255, 0.95)'
  context.beginPath()
  context.ellipse(r * 0.12, 0, r * 0.88 * squash, r * 0.72 / squash, 0, 0, TAU)
  context.fill()
  context.fillStyle = 'rgba(255, 255, 255, 0.9)'
  context.beginPath()
  context.ellipse(r * 0.3, -r * 0.34, r * 0.3, r * 0.16, -0.4, 0, TAU)
  context.fill()
  context.restore()
}

function drawRock(context: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number, seed: number) {
  const random = seeded(Math.floor(seed * 1000) + 7)
  const corners = 7
  const points: [number, number][] = []
  for (let i = 0; i < corners; i++) {
    const angle = (i / corners) * TAU + spin
    const distance = r * (0.8 + random() * 0.35)
    points.push([x + Math.cos(angle) * distance, y + Math.sin(angle) * distance])
  }
  const shape = () => {
    context.beginPath()
    points.forEach(([px, py], index) => (index ? context.lineTo(px, py) : context.moveTo(px, py)))
    context.closePath()
  }
  shape()
  context.fillStyle = '#8a5e36'
  context.fill()
  context.lineWidth = Math.max(1, r * 0.18)
  context.strokeStyle = '#3f2814'
  context.stroke()
  context.save()
  shape()
  context.clip()
  context.fillStyle = 'rgba(232, 196, 140, 0.55)'
  context.beginPath()
  context.arc(x - r * 0.35, y - r * 0.35, r * 0.7, 0, TAU)
  context.fill()
  context.restore()
}

function drawCrescent(context: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
  const radius = r * 1.8
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.fillStyle = 'rgba(228, 255, 246, 0.9)'
  context.beginPath()
  context.arc(-r * 0.6, 0, radius, -1.15, 1.15)
  context.arc(-r * 1.1, 0, radius * 0.82, 1.02, -1.02, true)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(200, 255, 240, 0.55)'
  context.lineWidth = Math.max(1, r * 0.2)
  context.lineCap = 'round'
  for (const offset of [-0.5, 0.5]) {
    context.beginPath()
    context.moveTo(-r * 1.3, offset * r)
    context.lineTo(-r * 3.2, offset * r * 1.4)
    context.stroke()
  }
  context.restore()
}

function drawBolt(context: CanvasRenderingContext2D, x: number, y: number, r: number, bolt: BoltLook, zoom: number, time: number) {
  const speed = Math.hypot(bolt.vx, bolt.vy) || 1
  const length = Math.min(150, speed * 0.07) * zoom
  const ux = bolt.vx / speed
  const uy = bolt.vy / speed
  const random = seeded(Math.floor(bolt.seed * 977 + time * 28))
  const points: [number, number][] = []
  const segments = 5
  for (let i = 0; i <= segments; i++) {
    const f = i / segments
    const offset = i === 0 || i === segments ? 0 : (random() - 0.5) * r * 2.4
    points.push([x - ux * length * (1 - f) - uy * offset, y - uy * length * (1 - f) + ux * offset])
  }
  const trace = () => {
    context.beginPath()
    points.forEach(([px, py], index) => (index ? context.lineTo(px, py) : context.moveTo(px, py)))
  }
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.strokeStyle = 'rgba(255, 220, 60, 0.85)'
  context.lineWidth = r * 1.1
  trace()
  context.stroke()
  context.strokeStyle = '#ffffff'
  context.lineWidth = r * 0.42
  trace()
  context.stroke()
  context.fillStyle = '#fffbe0'
  circle(context, x, y, r * 0.6)
}

function drawCrystal(context: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  const diamond = (cx: number, cy: number, size: number, rotation: number) => {
    context.save()
    context.translate(cx, cy)
    context.rotate(rotation)
    context.beginPath()
    context.moveTo(0, -size * 1.3)
    context.lineTo(size * 0.72, 0)
    context.lineTo(0, size * 1.3)
    context.lineTo(-size * 0.72, 0)
    context.closePath()
    context.fillStyle = 'rgba(160, 226, 255, 0.95)'
    context.fill()
    context.lineWidth = Math.max(1, size * 0.16)
    context.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    context.stroke()
    context.beginPath()
    context.moveTo(0, -size * 1.1)
    context.lineTo(0, size * 1.1)
    context.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    context.stroke()
    context.restore()
  }
  diamond(x, y, r, spin)
  for (let i = 0; i < 2; i++) {
    const angle = spin * 1.7 + i * Math.PI
    diamond(x + Math.cos(angle) * r * 1.7, y + Math.sin(angle) * r * 1.0, r * 0.38, -spin * 2)
  }
}

function drawLance(context: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, time: number) {
  context.save()
  context.translate(x, y)
  context.rotate(angle)
  context.fillStyle = 'rgba(255, 240, 180, 0.85)'
  context.beginPath()
  context.ellipse(-r * 1.4, 0, r * 2.6, r * 0.7, 0, 0, TAU)
  context.fill()
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.ellipse(-r * 1.1, 0, r * 2.1, r * 0.34, 0, 0, TAU)
  context.fill()
  context.restore()
  context.save()
  context.translate(x, y)
  context.rotate(time * 6)
  context.fillStyle = 'rgba(255, 255, 255, 0.95)'
  for (let i = 0; i < 2; i++) {
    context.rotate(Math.PI / 2)
    context.beginPath()
    context.ellipse(0, 0, r * 1.6, r * 0.16, 0, 0, TAU)
    context.fill()
  }
  context.restore()
}

function drawOrb(context: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number, time: number, seed: number) {
  const back = angle + Math.PI
  context.strokeStyle = 'rgba(150, 90, 235, 0.85)'
  context.lineWidth = Math.max(1, r * 0.26)
  context.lineCap = 'round'
  for (let i = -1; i <= 1; i++) {
    const wave = Math.sin(time * 14 + seed + i * 2.1) * r * 0.9
    const spread = back + i * 0.45
    const ex = x + Math.cos(spread) * r * 3
    const ey = y + Math.sin(spread) * r * 3
    const cx = x + Math.cos(back) * r * 1.5 + Math.cos(back + Math.PI / 2) * wave
    const cy = y + Math.sin(back) * r * 1.5 + Math.sin(back + Math.PI / 2) * wave
    context.beginPath()
    context.moveTo(x, y)
    context.quadraticCurveTo(cx, cy, ex, ey)
    context.stroke()
  }
  context.fillStyle = '#16082a'
  circle(context, x, y, r)
  context.lineWidth = Math.max(1, r * 0.24)
  context.strokeStyle = '#a066ff'
  context.beginPath()
  context.arc(x, y, r, 0, TAU)
  context.stroke()
  context.fillStyle = 'rgba(220, 180, 255, 0.9)'
  circle(context, x - r * 0.3, y - r * 0.3, r * 0.2)
}
