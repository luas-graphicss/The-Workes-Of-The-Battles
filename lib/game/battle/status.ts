import { AILMENTS, type Ailment } from './elements'

export const BURN_TICK = 0.5

export class Status {
  private readonly timers = new Map<Ailment, number>()
  private burnClock = 0

  has(ailment: Ailment) {
    return (this.timers.get(ailment) ?? 0) > 0
  }

  left(ailment: Ailment) {
    return this.timers.get(ailment) ?? 0
  }

  apply(ailment: Ailment, scale = 1): boolean {
    const fresh = !this.has(ailment)
    this.timers.set(ailment, Math.max(this.left(ailment), AILMENTS[ailment].duration * scale))
    if (ailment === 'queimadura' && fresh) this.burnClock = BURN_TICK
    return fresh
  }

  cure(ailment: Ailment) {
    this.timers.delete(ailment)
  }

  clear() {
    this.timers.clear()
    this.burnClock = 0
  }

  update(dt: number): number {
    let ticks = 0
    if (this.has('queimadura')) {
      this.burnClock -= dt
      while (this.burnClock <= 0) {
        ticks++
        this.burnClock += BURN_TICK
      }
    }
    for (const [ailment, seconds] of this.timers) {
      const next = seconds - dt
      if (next <= 0) this.timers.delete(ailment)
      else this.timers.set(ailment, next)
    }
    return ticks
  }

  get speed() {
    let factor = 1
    if (this.has('encharcado')) factor *= 0.72
    if (this.has('congelado')) factor *= 0.5
    return factor
  }

  get recovery() {
    return this.has('congelado') ? 0.55 : 1
  }

  get stunned() {
    return this.has('choque')
  }

  get blinded() {
    return this.has('ofuscado')
  }

  get conductive() {
    return this.has('encharcado')
  }

  get drained() {
    return this.has('drenado')
  }

  get dizzy() {
    return this.has('arrastado')
  }

  list(): Ailment[] {
    return [...this.timers.entries()]
      .filter(([, seconds]) => seconds > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([ailment]) => ailment)
  }
}
