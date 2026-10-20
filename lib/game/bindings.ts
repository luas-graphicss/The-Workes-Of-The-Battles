import { BIND_ACTIONS, cloneKeys, DEFAULT_KEYS, settings, type BindAction, type Keymap } from './settings'

export const BIND_LABEL: Record<BindAction, string> = {
  up: 'Cima',
  down: 'Baixo',
  left: 'Esquerda',
  right: 'Direita',
  attack: 'Golpe',
  shoot: 'Tiro',
  guard: 'Defender',
  dodge: 'Esquiva',
  interact: 'Interagir',
  missions: 'Missões',
  pause: 'Pausa',
  card1: 'Carta 1',
  card2: 'Carta 2',
  card3: 'Carta 3',
  card4: 'Chuva',
  card5: 'Titã',
  card6: 'Fantasma',
  card7: 'Sobrecarga',
  card8: 'Prisma',
  card9: 'Enxame',
  card10: 'Raízes',
  card11: 'Orvalho',
  gear1: 'Chip 1',
  gear2: 'Chip 2',
  gear3: 'Chip 3',
  mount1: 'Montagem 1',
  mount2: 'Montagem 2',
  fury: 'Fúria',
}

export const BIND_GROUPS: { title: string; actions: BindAction[] }[] = [
  { title: 'Explorar', actions: ['up', 'down', 'left', 'right', 'interact', 'missions', 'pause'] },
  { title: 'Lutar', actions: ['attack', 'shoot', 'guard', 'dodge'] },
  { title: 'Mão de cartas', actions: ['card1', 'card2', 'card3'] },
  { title: 'Mecânica dos Irmãos', actions: ['gear1', 'gear2', 'gear3', 'mount1', 'mount2', 'fury'] },
]

export const CARD_ACTIONS: readonly BindAction[] = ['card1', 'card2', 'card3', 'card4', 'card5', 'card6', 'card7', 'card8', 'card9', 'card10', 'card11']

export const HAND_ACTIONS: readonly BindAction[] = ['card1', 'card2', 'card3']

export const GEAR_ACTIONS: readonly BindAction[] = ['gear1', 'gear2', 'gear3']

export const MOUNT_ACTIONS: readonly BindAction[] = ['mount1', 'mount2']

export const RESERVED_CODES: ReadonlySet<string> = new Set(['Escape', 'KeyM', 'Tab', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight', 'ContextMenu', 'Enter', 'NumpadEnter'])

const CODE_LABEL: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift Dir',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl Dir',
  AltLeft: 'Alt',
  AltRight: 'Alt Dir',
  Space: 'Espaço',
  Escape: 'Esc',
  Enter: 'Enter',
  NumpadEnter: 'Enter Num',
  Backspace: 'Backspace',
  CapsLock: 'Caps',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Slash: '/',
  IntlBackslash: '\\',
  IntlRo: 'ろ',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  Insert: 'Ins',
  Delete: 'Del',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
}

export function keyLabel(code: string | undefined): string {
  if (!code) return '—'
  if (CODE_LABEL[code]) return CODE_LABEL[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`
  return code
}

let cachedKeys: Keymap | null = null
let reverse = new Map<string, BindAction>()

function index(): Map<string, BindAction> {
  const keys = settings.value.keys
  if (keys !== cachedKeys) {
    cachedKeys = keys
    reverse = new Map()
    for (const action of BIND_ACTIONS) for (const code of keys[action]) if (!reverse.has(code)) reverse.set(code, action)
  }
  return reverse
}

export function actionFor(code: string): BindAction | null {
  return index().get(code) ?? null
}

const PANEL_CODE = /^(?:Key[ADEQRSWX]|Enter|NumpadEnter|Space|Escape|Arrow(?:Up|Down|Left|Right)|Digit\d|Numpad\d)$/

export function panelKey(event: KeyboardEvent, code: string): KeyboardEvent {
  if (PANEL_CODE.test(event.code) || actionFor(event.code) !== 'interact') return event
  return new KeyboardEvent('keydown', { code, repeat: event.repeat })
}

export function codesFor(action: BindAction): readonly string[] {
  return settings.value.keys[action]
}

export function labelFor(action: BindAction, slot = 0): string {
  return keyLabel(settings.value.keys[action][slot])
}

export function isBound(action: BindAction, code: string): boolean {
  return settings.value.keys[action].includes(code)
}

export function bindKey(action: BindAction, slot: number, code: string) {
  const next = cloneKeys(settings.value.keys)
  for (const other of BIND_ACTIONS) next[other] = next[other].filter((entry) => entry !== code)
  const codes = next[action]
  if (slot < codes.length) codes[slot] = code
  else codes.push(code)
  next[action] = codes.slice(0, 2)
  settings.set('keys', next)
}

export function clearKey(action: BindAction, slot: number) {
  const next = cloneKeys(settings.value.keys)
  next[action] = next[action].filter((_, i) => i !== slot)
  settings.set('keys', next)
}

export function resetKeys() {
  settings.set('keys', cloneKeys(DEFAULT_KEYS))
}

export function isDefaultKeys(): boolean {
  const keys = settings.value.keys
  return BIND_ACTIONS.every((action) => keys[action].length === DEFAULT_KEYS[action].length && keys[action].every((code, i) => code === DEFAULT_KEYS[action][i]))
}

export function onKeysChange(listener: () => void): () => void {
  let last = settings.value.keys
  return settings.subscribe((value) => {
    if (value.keys === last) return
    last = value.keys
    listener()
  })
}
