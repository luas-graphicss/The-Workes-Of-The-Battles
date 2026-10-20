import { clampLens, playZoom, type Lens, type View } from '../camera'
import type { Player } from '../player'
import type { Scene, WorldDraw } from '../scene'
import { clamp01, lerp, smoothstep } from './easing'

export type CinemaKey = { at: number; x: number; y: number; zoom: number; ease?: (t: number) => number }

export type CinemaCue = { at: number; run: () => void }

export type CinemaScript = {
  duration: number
  keys: readonly CinemaKey[]
  cuts?: readonly number[]
  cues?: readonly CinemaCue[]
  frame?: (t: number, dt: number) => void
  glow?: WorldDraw
  shake?: (t: number) => number
  fadeIn?: number
  fadeOut?: number
  finish?: () => void
  skip?: () => void
}

export class Cinema {
  time = 0
  finished = false
  private readonly fired = new Set<number>()
  private readonly previousGlow: WorldDraw | undefined

  constructor(
    private readonly scene: Scene,
    private readonly script: CinemaScript,
  ) {
    this.previousGlow = scene.hooks.glow
    if (script.glow) scene.hooks = { ...scene.hooks, glow: script.glow }
  }

  update(dt: number) {
    if (this.finished) return
    this.time = Math.min(this.script.duration, this.time + dt)
    const cues = this.script.cues ?? []
    for (let index = 0; index < cues.length; index++) {
      if (this.time >= cues[index].at && !this.fired.has(index)) {
        this.fired.add(index)
        cues[index].run()
      }
    }
    this.script.frame?.(this.time, dt)
    const amount = this.script.shake?.(this.time) ?? 0
    this.scene.shakeX = amount > 0.4 ? (Math.random() - 0.5) * 2 * amount : 0
    this.scene.shakeY = amount > 0.4 ? (Math.random() - 0.5) * 2 * amount * 0.7 : 0
    this.scene.update(dt)
    if (this.time >= this.script.duration) this.close()
  }

  lens(view: View): Lens {
    const { x, y, zoom } = keyed(this.script.keys, this.time)
    return clampLens({ x, y, zoom: playZoom(view) * zoom }, view)
  }

  bars() {
    const out = this.script.duration
    return smoothstep(0, 0.8, this.time) * (1 - smoothstep(out - 0.6, out, this.time))
  }

  render(context: CanvasRenderingContext2D, view: View, player: Player, now: number) {
    this.scene.render(context, view, this.lens(view), player, now)
    const black = this.blackout()
    if (black <= 0.001) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = Math.min(1, black)
    context.fillStyle = '#050608'
    context.fillRect(0, 0, view.width, view.height)
    context.globalAlpha = 1
  }

  skip() {
    if (this.finished) return
    this.script.skip?.()
    this.close()
  }

  private blackout() {
    const t = this.time
    let black = 0
    for (const cut of this.script.cuts ?? []) {
      if (t >= cut - 0.45 && t < cut) black = Math.max(black, smoothstep(cut - 0.45, cut, t))
      else if (t >= cut && t < cut + 0.6) black = Math.max(black, 1 - smoothstep(cut, cut + 0.6, t))
    }
    const fadeIn = this.script.fadeIn ?? 0
    if (fadeIn > 0) black = Math.max(black, 1 - smoothstep(0, fadeIn, t))
    const fade = this.script.fadeOut ?? 0
    if (fade > 0) black = Math.max(black, smoothstep(this.script.duration - fade, this.script.duration, t))
    return black
  }

  private close() {
    if (this.finished) return
    this.finished = true
    this.scene.shakeX = 0
    this.scene.shakeY = 0
    if (this.script.glow && this.scene.hooks.glow === this.script.glow) this.scene.hooks = { ...this.scene.hooks, glow: this.previousGlow }
    this.script.finish?.()
  }
}

function keyed(keys: readonly CinemaKey[], t: number) {
  let index = keys.findIndex((key) => key.at > t)
  if (index === -1) index = keys.length - 1
  const to = keys[index]
  const from = keys[Math.max(0, index - 1)]
  const amount = to === from ? 1 : (to.ease ?? smooth)(clamp01((t - from.at) / Math.max(0.0001, to.at - from.at)))
  return { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount), zoom: lerp(from.zoom, to.zoom, amount) }
}

function smooth(t: number) {
  return t * t * (3 - 2 * t)
}
