import { actionFor } from './bindings'
import type { BindAction } from './settings'

export type Vector = { x: number; y: number }
export type Movement = Vector & { magnitude: number }

const AXIS: Partial<Record<BindAction, Vector>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const GAMEPAD_DEAD_ZONE = 0.22

export function createKeyboard(target: Window = window) {
  const pressed = new Set<string>()

  function down(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) return
    const action = actionFor(event.code)
    if (!action || !AXIS[action]) return
    pressed.add(event.code)
    event.preventDefault()
  }
  function up(event: KeyboardEvent) {
    pressed.delete(event.code)
  }
  function clear() {
    pressed.clear()
  }

  target.addEventListener('keydown', down)
  target.addEventListener('keyup', up)
  target.addEventListener('blur', clear)

  return {
    read(): Vector {
      let x = 0
      let y = 0
      for (const code of pressed) {
        const action = actionFor(code)
        const axis = action ? AXIS[action] : null
        if (!axis) continue
        x += axis.x
        y += axis.y
      }
      return { x: Math.sign(x), y: Math.sign(y) }
    },
    clear,
    destroy() {
      target.removeEventListener('keydown', down)
      target.removeEventListener('keyup', up)
      target.removeEventListener('blur', clear)
      pressed.clear()
    },
  }
}

export type MouseButtons = { primary: boolean; secondary: boolean }

export type Pointer = {
  readonly position: Vector | null
  readonly mouse: boolean
  readonly held: MouseButtons
  consume(): MouseButtons
  setEnabled(value: boolean): void
  destroy(): void
}

export function createPointer(surface: HTMLElement): Pointer {
  const position: Vector = { x: 0, y: 0 }
  let seen = false
  let inside = false
  let enabled = true
  const held: MouseButtons = { primary: false, secondary: false }
  const edges: MouseButtons = { primary: false, secondary: false }

  function track(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    const bounds = surface.getBoundingClientRect()
    position.x = event.clientX - bounds.left
    position.y = event.clientY - bounds.top
    seen = true
    inside = true
  }
  function down(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    track(event)
    if (!enabled) return
    if (event.button === 0) {
      held.primary = true
      edges.primary = true
    } else if (event.button === 2) {
      held.secondary = true
      edges.secondary = true
    }
  }
  function up(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    if (event.button === 0) held.primary = false
    if (event.button === 2) held.secondary = false
  }
  function leave(event: PointerEvent) {
    if (event.pointerType === 'mouse') inside = false
  }
  function release() {
    held.primary = false
    held.secondary = false
  }
  function contextMenu(event: Event) {
    event.preventDefault()
  }

  surface.addEventListener('pointermove', track)
  surface.addEventListener('pointerdown', down)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  surface.addEventListener('pointerleave', leave)
  surface.addEventListener('contextmenu', contextMenu)
  window.addEventListener('blur', release)

  return {
    get position() {
      return seen && inside ? position : null
    },
    get mouse() {
      return seen
    },
    get held() {
      return held
    },
    consume() {
      const out = { primary: edges.primary, secondary: edges.secondary }
      edges.primary = false
      edges.secondary = false
      return out
    },
    setEnabled(value) {
      enabled = value
      if (!value) {
        release()
        edges.primary = false
        edges.secondary = false
      }
    },
    destroy() {
      surface.removeEventListener('pointermove', track)
      surface.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      surface.removeEventListener('pointerleave', leave)
      surface.removeEventListener('contextmenu', contextMenu)
      window.removeEventListener('blur', release)
    },
  }
}

export function readGamepad(): Vector {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return { x: 0, y: 0 }
  let pads: (Gamepad | null)[] = []
  try {
    pads = navigator.getGamepads()
  } catch {
    return { x: 0, y: 0 }
  }
  for (const pad of pads) {
    if (!pad) continue
    let x = pad.axes[0] ?? 0
    let y = pad.axes[1] ?? 0
    if (Math.hypot(x, y) < GAMEPAD_DEAD_ZONE) {
      x = 0
      y = 0
    }
    if (pad.buttons[12]?.pressed) y -= 1
    if (pad.buttons[13]?.pressed) y += 1
    if (pad.buttons[14]?.pressed) x -= 1
    if (pad.buttons[15]?.pressed) x += 1
    if (x !== 0 || y !== 0) return { x, y }
  }
  return { x: 0, y: 0 }
}

export type PadDirection = 'up' | 'down' | 'left' | 'right'

export type PadButtons = {
  attack: boolean
  shoot: boolean
  guard: boolean
  dodge: boolean
  card: boolean
  modifier: boolean
  gear: number
  mount: number
  fury: boolean
  direction: PadDirection | null
}

export const NO_PAD_BUTTONS: PadButtons = {
  attack: false,
  shoot: false,
  guard: false,
  dodge: false,
  card: false,
  modifier: false,
  gear: -1,
  mount: -1,
  fury: false,
  direction: null,
}

const PAD_FLICK = 0.6

function padDirection(pad: Gamepad, held: (index: number) => boolean): PadDirection | null {
  if (held(12)) return 'up'
  if (held(13)) return 'down'
  if (held(14)) return 'left'
  if (held(15)) return 'right'
  const x = pad.axes[0] ?? 0
  const y = pad.axes[1] ?? 0
  if (Math.max(Math.abs(x), Math.abs(y)) < PAD_FLICK) return null
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right'
  return y < 0 ? 'up' : 'down'
}

export function readGamepadButtons(): PadButtons {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return NO_PAD_BUTTONS
  try {
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue
      const held = (index: number) => !!pad.buttons[index]?.pressed
      const base = { attack: held(0), shoot: held(2) || held(7), dodge: held(1), card: held(3), direction: padDirection(pad, held) }
      if (held(6)) {
        return {
          ...base,
          guard: false,
          modifier: true,
          gear: held(0) ? 0 : held(2) ? 1 : held(3) ? 2 : -1,
          mount: held(4) ? 0 : held(5) ? 1 : -1,
          fury: held(1),
        }
      }
      return { ...base, guard: held(4) || held(5), modifier: false, gear: -1, mount: -1, fury: false }
    }
  } catch {
    return NO_PAD_BUTTONS
  }
  return NO_PAD_BUTTONS
}

export function readGamepadConfirm(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return false
  try {
    return navigator.getGamepads().some((pad) => !!pad && [0, 1, 9].some((index) => pad.buttons[index]?.pressed))
  } catch {
    return false
  }
}

export function mergeMovement(...vectors: Vector[]): Movement {
  let x = 0
  let y = 0
  for (const vector of vectors) {
    x += vector.x
    y += vector.y
  }
  const length = Math.hypot(x, y)
  if (length > 1) {
    x /= length
    y /= length
  }
  return { x, y, magnitude: Math.min(1, length) }
}
