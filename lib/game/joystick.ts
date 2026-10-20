import type { Vector } from './input'

export type StickMode = 'fixed' | 'float'

const RADIUS = 52
const FIXED_RADIUS = 60
const DEAD_ZONE = 0.12
const ZONE_WIDTH = 0.5
const ZONE_TOP = 0.34

export function createJoystick(surface: HTMLElement) {
  const root = document.createElement('div')
  root.className = 'joystick'
  root.dataset.active = 'false'
  root.dataset.mode = 'fixed'
  root.dataset.enabled = 'false'
  root.setAttribute('aria-hidden', 'true')
  const base = document.createElement('div')
  base.className = 'joystick-base'
  const knob = document.createElement('div')
  knob.className = 'joystick-knob'
  root.append(base, knob)
  surface.append(root)

  let pointerId: number | null = null
  let originX = 0
  let originY = 0
  let enabled = false
  let mode: StickMode = 'fixed'
  const vector: Vector = { x: 0, y: 0 }

  function place(x: number, y: number) {
    root.style.setProperty('--joystick-x', `${x}px`)
    root.style.setProperty('--joystick-y', `${y}px`)
  }
  function moveKnob(x: number, y: number) {
    knob.style.setProperty('--knob-x', `${x}px`)
    knob.style.setProperty('--knob-y', `${y}px`)
  }
  function local(event: PointerEvent): [number, number] {
    const bounds = surface.getBoundingClientRect()
    return [event.clientX - bounds.left, event.clientY - bounds.top]
  }
  function radius() {
    return mode === 'fixed' ? FIXED_RADIUS : RADIUS
  }
  function anchor() {
    const bounds = surface.getBoundingClientRect()
    const rect = base.getBoundingClientRect()
    originX = rect.left + rect.width / 2 - bounds.left
    originY = rect.top + rect.height / 2 - bounds.top
  }
  function inZone(x: number, y: number) {
    const width = surface.clientWidth
    const height = surface.clientHeight
    return x <= width * ZONE_WIDTH && y >= height * ZONE_TOP
  }
  function apply(dx: number, dy: number) {
    const limit = radius()
    const length = Math.hypot(dx, dy)
    const magnitude = Math.min(1, length / limit)
    if (magnitude < DEAD_ZONE || length === 0) {
      vector.x = 0
      vector.y = 0
      moveKnob(dx, dy)
      return
    }
    const scaled = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE)
    vector.x = (dx / length) * scaled
    vector.y = (dy / length) * scaled
    const clamp = Math.min(length, limit)
    moveKnob((dx / length) * clamp, (dy / length) * clamp)
  }

  function down(event: PointerEvent) {
    if (!enabled || pointerId !== null || event.pointerType === 'mouse') return
    surface.dataset.touch = 'true'
    const [x, y] = local(event)
    if (mode === 'fixed') {
      if (!inZone(x, y)) return
      anchor()
      pointerId = event.pointerId
      apply(x - originX, y - originY)
    } else {
      pointerId = event.pointerId
      originX = x
      originY = y
      place(x, y)
      moveKnob(0, 0)
    }
    root.dataset.active = 'true'
    try {
      surface.setPointerCapture(event.pointerId)
    } catch {
    }
    event.preventDefault()
  }

  function move(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    const [x, y] = local(event)
    let dx = x - originX
    let dy = y - originY
    if (mode === 'float') {
      const distance = Math.hypot(dx, dy)
      if (distance > RADIUS) {
        const overflow = distance - RADIUS
        originX += (dx / distance) * overflow
        originY += (dy / distance) * overflow
        dx = (dx / distance) * RADIUS
        dy = (dy / distance) * RADIUS
        place(originX, originY)
      }
    }
    apply(dx, dy)
  }

  function up(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    reset()
  }

  function reset() {
    pointerId = null
    vector.x = 0
    vector.y = 0
    root.dataset.active = 'false'
    moveKnob(0, 0)
  }

  surface.addEventListener('pointerdown', down)
  surface.addEventListener('pointermove', move)
  surface.addEventListener('pointerup', up)
  surface.addEventListener('pointercancel', up)
  surface.addEventListener('lostpointercapture', up)

  return {
    read(): Vector {
      return vector
    },
    get active() {
      return pointerId !== null
    },
    setMode(next: StickMode) {
      if (next === mode) return
      mode = next
      root.dataset.mode = next
      root.style.removeProperty('--joystick-x')
      root.style.removeProperty('--joystick-y')
      reset()
    },
    setEnabled(value: boolean) {
      enabled = value
      root.dataset.enabled = String(value)
      if (!value && pointerId !== null) reset()
    },
    destroy() {
      surface.removeEventListener('pointerdown', down)
      surface.removeEventListener('pointermove', move)
      surface.removeEventListener('pointerup', up)
      surface.removeEventListener('pointercancel', up)
      surface.removeEventListener('lostpointercapture', up)
      root.remove()
    },
  }
}
