import { PIXEL, spaceSize, type Point } from '../world-data'

export type View = { width: number; height: number; scale: number }

export type Lens = { x: number; y: number; zoom: number }

export type Inset = { right: number; bottom: number }

export const NO_INSET: Inset = { right: 0, bottom: 0 }

export const LOOK_ABOVE_FEET = 70
const STIFFNESS = 9

const ZOOM_STIFFNESS = 2.6

export const TOUCH_ZOOM = 1.35

export function pickScale(cssWidth: number, cssHeight: number, ratio: number, boost = 1) {
  const shorter = Math.min(cssWidth, cssHeight)
  const cssScale = Math.min(4.5, Math.max(2.4, shorter / 270)) * boost
  const ideal = cssScale * ratio
  const lower = Math.max(2, 2 * Math.floor(ideal / 2))
  const upper = lower + 2
  return ideal >= Math.sqrt(lower * upper) ? upper : lower
}

export function playZoom(view: View) {
  return view.scale / PIXEL
}

export function clampLens(lens: Lens, view: View, inset: Inset = NO_INSET): Lens {
  const halfWidth = view.width / lens.zoom / 2
  const halfHeight = view.height / lens.zoom / 2
  const size = spaceSize()
  return {
    x: clampAxis(lens.x, halfWidth, size.width, inset.right / lens.zoom),
    y: clampAxis(lens.y, halfHeight, size.height, inset.bottom / lens.zoom),
    zoom: lens.zoom,
  }
}

export class Camera {
  x: number
  y: number

  boost = 1
  private boostTarget = 1

  constructor([x, y]: Point) {
    this.x = x
    this.y = y - LOOK_ABOVE_FEET
  }

  setBoost(target: number) {
    this.boostTarget = Math.max(1, target)
  }

  follow(target: { x: number; y: number }, dt: number, view: View, snap = false, inset: Inset = NO_INSET) {
    const blend = snap ? 1 : 1 - Math.exp(-dt * STIFFNESS)
    const ease = snap ? 1 : 1 - Math.exp(-dt * ZOOM_STIFFNESS)
    this.boost += (this.boostTarget - this.boost) * ease
    if (Math.abs(this.boostTarget - this.boost) < 0.0015) this.boost = this.boostTarget
    const zoom = this.zoom(view)
    const goalX = target.x + inset.right / zoom / 2
    const goalY = target.y - LOOK_ABOVE_FEET + inset.bottom / zoom / 2
    this.x += (goalX - this.x) * blend
    this.y += (goalY - this.y) * blend
    const clamped = clampLens({ x: this.x, y: this.y, zoom }, view, inset)
    this.x = clamped.x
    this.y = clamped.y
  }

  zoom(view: View) {
    return playZoom(view) * this.boost
  }

  lens(view: View): Lens {
    return { x: this.x, y: this.y, zoom: this.zoom(view) }
  }
}

function clampAxis(value: number, half: number, size: number, slack = 0) {
  if (half * 2 - slack >= size) return (size + slack) / 2
  return Math.min(size - half + slack, Math.max(half, value))
}
