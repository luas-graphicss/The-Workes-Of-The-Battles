export type BindAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'attack'
  | 'shoot'
  | 'guard'
  | 'dodge'
  | 'interact'
  | 'missions'
  | 'pause'
  | 'card1'
  | 'card2'
  | 'card3'
  | 'card4'
  | 'card5'
  | 'card6'
  | 'card7'
  | 'card8'
  | 'card9'
  | 'card10'
  | 'card11'
  | 'gear1'
  | 'gear2'
  | 'gear3'
  | 'mount1'
  | 'mount2'
  | 'fury'

export type Keymap = Record<BindAction, string[]>

export type Settings = {
  master: number
  ambience: number
  effects: number
  muted: boolean
  uiScale: number
  motion: 'full' | 'reduced'
  shake: number
  hud: boolean
  marker: boolean
  hints: boolean
  fps: boolean
  mouseAim: boolean
  mouseSwap: boolean
  stick: 'fixed' | 'float'
  keys: Keymap
}

export type SettingsStore = {
  readonly value: Readonly<Settings>
  set<K extends keyof Settings>(key: K, value: Settings[K]): void
  reset(): void
  subscribe(listener: (settings: Readonly<Settings>) => void): () => void
}

export const UI_SCALES = [90, 100, 115, 130] as const
export const SHAKE_LEVELS = [0, 50, 100] as const

export const BIND_ACTIONS: readonly BindAction[] = [
  'up',
  'down',
  'left',
  'right',
  'attack',
  'shoot',
  'guard',
  'dodge',
  'interact',
  'missions',
  'pause',
  'card1',
  'card2',
  'card3',
  'card4',
  'card5',
  'card6',
  'card7',
  'card8',
  'card9',
  'card10',
  'card11',
  'gear1',
  'gear2',
  'gear3',
  'mount1',
  'mount2',
  'fury',
]

export const DEFAULT_KEYS: Keymap = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ'],
  shoot: ['KeyK'],
  guard: ['KeyL'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'],
  missions: ['KeyQ'],
  pause: ['KeyP'],
  card1: ['Digit1', 'Numpad1'],
  card2: ['Digit2', 'Numpad2'],
  card3: ['Digit3', 'Numpad3'],
  card4: ['Digit4', 'Numpad4'],
  card5: ['Digit5', 'Numpad5'],
  card6: ['Digit6', 'Numpad6'],
  card7: ['Digit7', 'Numpad7'],
  card8: ['Digit8', 'Numpad8'],
  card9: ['Digit9', 'Numpad9'],
  card10: ['Digit0', 'Numpad0'],
  card11: ['Minus', 'NumpadSubtract'],
  gear1: ['KeyU'],
  gear2: ['KeyI'],
  gear3: ['KeyO'],
  mount1: ['KeyY'],
  mount2: ['KeyH'],
  fury: ['KeyF'],
}

const STORAGE_KEY = 'bosque-alto:settings:v2'
const LEGACY_KEY = 'bosque-alto:settings:v1'
const MAX_CODES = 2

export const DEFAULT_SETTINGS: Settings = {
  master: 90,
  ambience: 80,
  effects: 100,
  muted: false,
  uiScale: 100,
  motion: 'full',
  shake: 100,
  hud: true,
  marker: true,
  hints: true,
  fps: false,
  mouseAim: true,
  mouseSwap: false,
  stick: 'fixed',
  keys: DEFAULT_KEYS,
}

const percent = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : fallback
const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
const oneOf = <T extends number>(list: readonly T[], value: unknown, fallback: T) => (list.includes(value as T) ? (value as T) : fallback)

function systemPrefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function cloneKeys(keys: Keymap): Keymap {
  const out = {} as Keymap
  for (const action of BIND_ACTIONS) out[action] = [...keys[action]]
  return out
}

function readKeys(data: unknown): Keymap {
  const out = cloneKeys(DEFAULT_KEYS)
  if (!data || typeof data !== 'object') return out
  const used = new Set<string>()
  for (const action of BIND_ACTIONS) {
    const raw = (data as Record<string, unknown>)[action]
    if (!Array.isArray(raw)) {
      out[action] = DEFAULT_KEYS[action].filter((code) => !used.has(code))
      for (const code of out[action]) used.add(code)
      continue
    }
    const codes = raw.filter((code): code is string => typeof code === 'string' && /^[A-Za-z0-9]{1,24}$/.test(code) && !used.has(code)).slice(0, MAX_CODES)
    for (const code of codes) used.add(code)
    out[action] = codes
  }
  return out
}

function freshDefaults(): Settings {
  return { ...DEFAULT_SETTINGS, motion: systemPrefersReducedMotion() ? 'reduced' : 'full', keys: cloneKeys(DEFAULT_KEYS) }
}

function load(): Settings {
  const fallback = freshDefaults()
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return fallback
    const data = JSON.parse(raw) as Partial<Settings>
    return {
      master: percent(data.master, fallback.master),
      ambience: percent(data.ambience, fallback.ambience),
      effects: percent(data.effects, fallback.effects),
      muted: flag(data.muted, fallback.muted),
      uiScale: oneOf(UI_SCALES, data.uiScale, 100),
      motion: data.motion === 'reduced' || data.motion === 'full' ? data.motion : fallback.motion,
      shake: oneOf(SHAKE_LEVELS, data.shake, 100),
      hud: flag(data.hud, fallback.hud),
      marker: flag(data.marker, fallback.marker),
      hints: flag(data.hints, fallback.hints),
      fps: flag(data.fps, fallback.fps),
      mouseAim: flag(data.mouseAim, fallback.mouseAim),
      mouseSwap: flag(data.mouseSwap, fallback.mouseSwap),
      stick: data.stick === 'float' || data.stick === 'fixed' ? data.stick : fallback.stick,
      keys: readKeys(data.keys),
    }
  } catch {
    return fallback
  }
}

function createSettingsStore(): SettingsStore {
  let current: Settings | null = null
  const listeners = new Set<(settings: Readonly<Settings>) => void>()

  const read = () => (current ??= load())

  function commit(next: Settings) {
    current = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
    }
    for (const listener of listeners) listener(next)
  }

  return {
    get value() {
      return read()
    },
    set(key, value) {
      const settings = read()
      if (settings[key] === value) return
      commit({ ...settings, [key]: value })
    },
    reset() {
      commit(freshDefaults())
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(read())
      return () => listeners.delete(listener)
    },
  }
}

export const settings = createSettingsStore()
