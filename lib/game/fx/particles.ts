export type Blend = 'normal' | 'add' | 'haze'

export type Bounds = { left: number; top: number; right: number; bottom: number }

export type ParticleSpec = {
  x: number
  y: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
  life: number
  size: number
  sizeEnd?: number
  alpha?: number
  fadeIn?: number
  drag?: number
  gravity?: number
  rise?: number
  wobble?: number
  spin?: number
  angle?: number
  bounce?: number
  shadow?: boolean
  stretch?: number
  sprite: CanvasImageSource | readonly CanvasImageSource[]
  blend?: Blend
}

type Particle = Required<Omit<ParticleSpec, 'sprite'>> & {
  sprite: CanvasImageSource | readonly CanvasImageSource[]
  age: number
  seed: number
}

export class Particles {
  private readonly items: Particle[] = []
  private readonly spare: Particle[] = []

  constructor(private readonly limit = 1400) {}

  get count() {
    return this.items.length
  }

  spawn(spec: ParticleSpec) {
    if (this.items.length >= this.limit) return
    const particle = this.spare.pop() ?? ({} as Particle)
    particle.x = spec.x
    particle.y = spec.y
    particle.z = spec.z ?? 0
    particle.vx = spec.vx ?? 0
    particle.vy = spec.vy ?? 0
    particle.vz = spec.vz ?? 0
    particle.life = spec.life
    particle.size = spec.size
    particle.sizeEnd = spec.sizeEnd ?? spec.size
    particle.alpha = spec.alpha ?? 1
    particle.fadeIn = spec.fadeIn ?? 0.08
    particle.drag = spec.drag ?? 0
    particle.gravity = spec.gravity ?? 0
    particle.rise = spec.rise ?? 0
    particle.wobble = spec.wobble ?? 0
    particle.spin = spec.spin ?? 0
    particle.angle = spec.angle ?? 0
    particle.bounce = spec.bounce ?? 0
    particle.shadow = spec.shadow ?? false
    particle.stretch = spec.stretch ?? 0
    particle.sprite = spec.sprite
    particle.blend = spec.blend ?? 'normal'
    particle.age = 0
    particle.seed = Math.random() * 100
    this.items.push(particle)
  }

  update(dt: number) {
    const items = this.items
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i]
      p.age += dt
      if (p.age >= p.life) {
        items[i] = items[items.length - 1]
        items.pop()
        this.spare.push(p)
        continue
      }
      if (p.drag) {
        const damping = Math.exp(-p.drag * dt)
        p.vx *= damping
        p.vy *= damping
      }
      p.x += p.vx * dt
      p.y += (p.vy - p.rise) * dt
      if (p.wobble) p.x += Math.sin(p.age * 5 + p.seed) * p.wobble * dt
      if (p.gravity || p.z > 0 || p.vz) {
        p.vz -= p.gravity * dt
        p.z += p.vz * dt
        if (p.z <= 0) {
          p.z = 0
          if (p.bounce && p.vz < -120) {
            p.vz = -p.vz * p.bounce
            p.vx *= 0.55
            p.vy *= 0.55
            p.spin *= 0.5
          } else {
            p.vz = 0
            p.gravity = 0
            p.vx *= 0.2
            p.vy *= 0.2
            p.spin = 0
          }
        }
      }
      p.angle += p.spin * dt
    }
  }

  draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, blend: Blend): Bounds | null {
    const width = context.canvas.width
    const height = context.canvas.height
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const p of this.items) {
      if (p.blend !== blend) continue
      const t = p.age / p.life
      const size = (p.size + (p.sizeEnd - p.size) * t) * zoom
      if (size < 0.6) continue
      const fade = t < p.fadeIn ? t / p.fadeIn : Math.pow(1 - (t - p.fadeIn) / (1 - p.fadeIn), 1.4)
      const alpha = p.alpha * fade
      if (alpha <= 0.004) continue
      const x = originX + p.x * zoom
      const groundY = originY + p.y * zoom
      const y = groundY - p.z * zoom
      const reach = size * (1 + p.stretch * 900)
      if (x < -reach || y < -reach || x > width + reach || y > height + reach) continue
      left = Math.min(left, x - reach)
      top = Math.min(top, y - reach)
      right = Math.max(right, x + reach)
      bottom = Math.max(bottom, groundY + reach)

      if (p.shadow && p.z > 1) {
        context.globalAlpha = alpha * 0.35 * Math.max(0.2, 1 - p.z / 900)
        context.fillStyle = '#120d0a'
        context.beginPath()
        context.ellipse(x, groundY, size * 0.45, size * 0.2, 0, 0, Math.PI * 2)
        context.fill()
      }

      const sprite = Array.isArray(p.sprite)
        ? (p.sprite as readonly CanvasImageSource[])[Math.min(p.sprite.length - 1, Math.floor(t * p.sprite.length))]
        : (p.sprite as CanvasImageSource)
      context.globalAlpha = Math.min(1, alpha)
      if (p.stretch) {
        const speed = Math.hypot(p.vx, p.vy - p.rise)
        const length = size * (1 + speed * p.stretch)
        const angle = Math.atan2(p.vy - p.rise, p.vx)
        context.setTransform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), x, y)
        context.drawImage(sprite, -length / 2, -size / 2, length, size)
        context.setTransform(1, 0, 0, 1, 0, 0)
      } else if (p.angle) {
        context.setTransform(Math.cos(p.angle), Math.sin(p.angle), -Math.sin(p.angle), Math.cos(p.angle), x, y)
        context.drawImage(sprite, -size / 2, -size / 2, size, size)
        context.setTransform(1, 0, 0, 1, 0, 0)
      } else {
        context.drawImage(sprite, x - size / 2, y - size / 2, size, size)
      }
    }
    context.globalAlpha = 1
    return left <= right ? { left, top, right, bottom } : null
  }

  clear() {
    while (this.items.length) this.spare.push(this.items.pop() as Particle)
  }
}
