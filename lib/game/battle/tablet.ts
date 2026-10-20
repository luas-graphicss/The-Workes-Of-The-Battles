import { ARENA, siteById } from '../../world-data'
import { GEAR_ACTIONS, HAND_ACTIONS, labelFor, MOUNT_ACTIONS, onKeysChange } from '../bindings'
import { upgradeDef, upgradeIcon, type UpgradeId } from '../garage/catalog'
import { NO_INSET, type Inset } from '../camera'
import type { BindAction } from '../settings'
import { MAIN_MISSIONS, SIDE_MISSIONS, type Mission } from '../missions/data'
import { WORLD_SIZE, worldOf, WORLDS } from '../missions/ladder'
import { currentLevel, ladderCycle, mainStatus, missionReward, sideClears, sideUnlocked } from '../missions/progress'
import { FRIEND_LEVELS, FRIEND_MAX, friendship, lessonDone, MASTERS, RIVALS } from '../npcs/data'
import { formatCredits } from '../robot/parts'
import type { Progress } from '../robot/progress'
import type { Battle } from './battle'
import { CLASSES } from './classes'
import { CARDS, CARD_IDS, HAND_SIZE, isSecretCard, SECRET_CARDS, type CardId } from './deck'
import { classEmblem, emblem } from './dossier'
import { AILMENTS, ELEMENTS } from './elements'
import { AILMENT_TAG } from './render'

export type TabletMode = 'hidden' | 'battle' | 'missions'

export type TabletAction = 'attack' | 'shoot' | 'guard' | 'dodge'

export type TabletOptions = {
  assetBase: string
  touch: boolean
  progress: Progress
  onAction(action: TabletAction, pressed: boolean): void
  onCard(card: CardId): void
  onClose(): void
  onOpen(): void

  onTrail(): void
  onGadget(id: UpgradeId): void
  onFury(): void
}

export type Tablet = {
  readonly mode: TabletMode
  readonly inset: Inset
  showBattle(battle: Battle): void
  showMissions(): void
  hide(): void
  setToggleVisible(visible: boolean): void
  refresh(): void
  tick(): void
  gain(credits: number): void
  destroy(): void
}

const ICONS = {
  attack:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>',
  shoot:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>',
  guard:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
  dodge:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>',
  tablet:
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
} as const

const ACTIONS: { action: TabletAction; label: string }[] = [
  { action: 'attack', label: 'Atacar' },
  { action: 'shoot', label: 'Atirar' },
  { action: 'guard', label: 'Defender' },
  { action: 'dodge', label: 'Esquivar' },
]

const GAIN_MS = 1400
const SCREEN = { left: 15.53, top: 15.92, right: 15.53, bottom: 27.54 } as const

const rgb = ([r, g, b]: readonly number[]) => `${r} ${g} ${b}`

export function createTablet(surface: HTMLElement, options: TabletOptions): Tablet {
  const core = options.progress.core
  const root = document.createElement('aside')
  root.className = 'tablet'
  root.dataset.mode = 'hidden'
  root.dataset.touch = String(options.touch)
  root.setAttribute('aria-label', 'Tablet de combate')
  const chip = (id: CardId, slot: number) => {
    const card = CARDS[id]
    return `
      <button type="button" class="tablet-card" data-card="${id}" data-kind="${card.kind}" data-secret="${isSecretCard(id)}" style="--card-art: url('${options.assetBase}${card.art}'); --accent: ${rgb(card.accent)}" aria-label="${card.name}">
        <span class="tablet-card-art" aria-hidden="true"></span>
        <span class="tablet-card-cool" aria-hidden="true"></span>
        <kbd class="tablet-card-key" data-key="${HAND_ACTIONS[slot]}"></kbd>
        <span class="tablet-card-name">${card.short}</span>
        <span class="tablet-card-cost"></span>
      </button>`
  }
  root.innerHTML = `
    <div class="tablet-device" style="--tablet-image: url('${options.assetBase}assets/ui/tablet.png'); --screen-left: ${SCREEN.left}%; --screen-top: ${SCREEN.top}%; --screen-right: ${SCREEN.right}%; --screen-bottom: ${SCREEN.bottom}%">
      <div class="tablet-screen">
        <section class="tablet-app tablet-battle" aria-label="Painel de combate">
          <header class="tablet-head">
            <div class="tablet-head-text">
              <span class="tablet-kicker tablet-mission-kind"></span>
              <strong class="tablet-title tablet-mission-title"></strong>
            </div>
            <span class="tablet-round" aria-live="polite"></span>
          </header>
          <div class="tablet-core" style="--el: ${rgb(ELEMENTS[core.element].color)}">
            ${emblem(options, core.element, 'emblem tablet-emblem')}
            ${classEmblem(options, core.cls, 'emblem tablet-emblem')}
            <span class="tablet-core-name"><b>${ELEMENTS[core.element].name}</b> · ${CLASSES[core.cls].name}</span>
            <span class="tablet-tags" aria-label="Condições"></span>
            <span class="tablet-form" hidden><b class="tablet-form-name"></b><i class="tablet-form-left"></i></span>
          </div>
          <div class="tablet-vitals">
            <div class="tablet-bar" data-kind="health">
              <span class="tablet-reserve" aria-hidden="true"></span>
              <span class="tablet-bar-label">Núcleo</span>
              <div class="tablet-bar-track"><i class="tablet-bar-ghost"></i><i class="tablet-bar-fill"></i></div>
              <span class="tablet-bar-value"></span>
            </div>
            <div class="tablet-bar" data-kind="energy">
              <span class="tablet-bar-label">Energia</span>
              <div class="tablet-bar-track"><i class="tablet-bar-ghost"></i><i class="tablet-bar-fill"></i></div>
              <span class="tablet-bar-value"></span>
            </div>
            <div class="tablet-bar" data-kind="charge">
              <span class="tablet-bar-label">Carga</span>
              <div class="tablet-bar-track"><i class="tablet-bar-ghost"></i><i class="tablet-bar-fill"></i></div>
              <span class="tablet-bar-value"></span>
            </div>
          </div>
          <div class="tablet-actions" role="group" aria-label="Ações de combate">
            ${ACTIONS.map(
              ({ action, label }) => `
              <button type="button" class="tablet-action" data-action="${action}" aria-label="${label}">
                <span class="tablet-action-icon">${ICONS[action]}</span>
                <span class="tablet-action-name">${label}</span>
                <kbd class="tablet-action-key" data-key="${action}"></kbd>
              </button>`,
            ).join('')}
          </div>
          <div class="tablet-deck" role="group" aria-label="Mão de cartas">
            <div class="tablet-deck-row" data-kind="hand"></div>
          </div>
          <footer class="tablet-foot">
            <span class="tablet-credits"><b class="tablet-credits-value"></b> ¢</span>
            <span class="tablet-gain" aria-live="polite"></span>
          </footer>
        </section>
        <section class="tablet-app tablet-missions" aria-label="Missões">
          <header class="tablet-head">
            <div class="tablet-head-text">
              <span class="tablet-kicker">${ICONS.flag} App</span>
              <strong class="tablet-title">Missões</strong>
            </div>
            <button type="button" class="tablet-close">Fechar ${options.touch ? '' : '<kbd data-key="missions"></kbd>'}</button>
          </header>
          <div class="tablet-scroll">
            <h3 class="tablet-section">Seu núcleo</h3>
            <div class="tablet-profile" style="--el: ${rgb(ELEMENTS[core.element].color)}">
              <div class="tablet-profile-row">
                ${emblem(options, core.element, 'emblem tablet-profile-emblem')}
                <span><b>${ELEMENTS[core.element].name}</b><small>${ELEMENTS[core.element].description}</small></span>
              </div>
              <div class="tablet-profile-row">
                ${classEmblem(options, core.cls, 'emblem tablet-profile-emblem')}
                <span><b>${CLASSES[core.cls].name} · ${CLASSES[core.cls].title}</b><small>${CLASSES[core.cls].perk} ${CLASSES[core.cls].flaw}</small></span>
              </div>
            </div>
            <h3 class="tablet-section">Baralho · mão de ${HAND_SIZE} cartas, montada na Oficina</h3>
            <ul class="tablet-collection">
              ${CARD_IDS.map((id) => {
                const card = CARDS[id]
                return `<li data-card="${id}" data-secret="${isSecretCard(id)}" style="--card-art: url('${options.assetBase}${card.art}'); --accent: ${rgb(card.accent)}" title="${card.description}"><span class="tablet-collection-art" aria-hidden="true"><i class="tablet-collection-slot"></i></span><b>${card.short}</b><small>${card.kind === 'special' ? `${card.cost} energia` : 'Carga cheia'}</small></li>`
              }).join('')}
            </ul>
            <p class="tablet-secret-note"></p>
            <div class="tablet-section-row">
              <h3 class="tablet-section tablet-section-main">Trilha · ${ARENA.name}</h3>
              <button type="button" class="ui-btn tablet-trail-button" data-variant="primary"><span>Ver a trilha</span>${options.touch ? '' : '<kbd>T</kbd>'}</button>
            </div>
            <p class="tablet-world-note"></p>
            <ol class="tablet-list tablet-list-main"></ol>
            <h3 class="tablet-section">Secundárias · pela cidade</h3>
            <ul class="tablet-list tablet-list-side"></ul>
            <p class="tablet-record"></p>
            <h3 class="tablet-section">Cidade · mestres e robôs fugitivos</h3>
            <ul class="tablet-town"></ul>
          </div>
        </section>
      </div>
    </div>
  `
  surface.append(root)

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'tablet-toggle'
  toggle.dataset.visible = 'false'
  toggle.setAttribute('aria-label', 'Abrir o tablet de missões')
  toggle.style.setProperty('--tablet-art', `url('${options.assetBase}assets/ui/tablet.png')`)
  toggle.innerHTML = `
    <span class="tablet-toggle-label">
      <span class="tablet-toggle-kicker">Tablet</span>
      <span class="tablet-toggle-name">Missões${options.touch ? '' : '<kbd data-key="missions"></kbd>'}</span>
    </span>
    <span class="tablet-toggle-device" aria-hidden="true">
      <span class="tablet-toggle-screen"><i></i><i></i><i></i></span>
      <span class="tablet-toggle-ping"></span>
    </span>
  `
  surface.append(toggle)

  const dock = document.createElement('div')
  dock.className = 'gear-dock'
  dock.dataset.visible = 'false'
  dock.dataset.touch = String(options.touch)
  dock.setAttribute('role', 'group')
  dock.setAttribute('aria-label', 'Mecânica dos Irmãos')
  dock.innerHTML = `
    <div class="gear-fury" hidden>
      <span class="gear-fury-label">Fúria</span>
      <span class="gear-fury-track"><i></i></span>
      <span class="gear-fury-value"></span>
    </div>
    <div class="gear-row"></div>
  `
  surface.append(dock)

  function syncKeys() {
    for (const node of [root, toggle, dock]) {
      for (const label of node.querySelectorAll<HTMLElement>('kbd[data-key]')) label.textContent = labelFor(label.dataset.key as BindAction)
    }
  }
  syncKeys()
  const unsubscribeKeys = onKeysChange(syncKeys)

  function refreshAlert() {
    const fresh = SIDE_MISSIONS.some((mission) => sideUnlocked(options.progress, mission) && sideClears(options.progress, mission) === 0)
    toggle.dataset.alert = String(fresh)
  }

  const query = <T extends Element>(selector: string) => root.querySelector(selector) as T
  const kind = query<HTMLElement>('.tablet-mission-kind')
  const title = query<HTMLElement>('.tablet-mission-title')
  const roundLabel = query<HTMLElement>('.tablet-round')
  const credits = query<HTMLElement>('.tablet-credits-value')
  const gainLabel = query<HTMLElement>('.tablet-gain')
  const tags = query<HTMLElement>('.tablet-tags')
  const formChip = query<HTMLElement>('.tablet-form')
  const formName = query<HTMLElement>('.tablet-form-name')
  const formLeft = query<HTMLElement>('.tablet-form-left')
  const bars = {
    health: bar('health'),
    energy: bar('energy'),
    charge: bar('charge'),
  }
  const buttons = new Map<TabletAction, HTMLButtonElement>()
  for (const { action } of ACTIONS) buttons.set(action, query<HTMLButtonElement>(`[data-action="${action}"]`))
  const chips = new Map<CardId, { element: HTMLButtonElement; cost: HTMLElement; cool: number; state: string }>()
  const handRow = query<HTMLElement>('.tablet-deck-row')
  let chipCleanup: (() => void)[] = []
  const reserveBox = query<HTMLElement>('.tablet-reserve')
  const gearRow = dock.querySelector('.gear-row') as HTMLElement
  const furyMeter = dock.querySelector('.gear-fury') as HTMLElement
  const furyFill = dock.querySelector('.gear-fury-track i') as HTMLElement
  const furyValue = dock.querySelector('.gear-fury-value') as HTMLElement
  const gear = new Map<UpgradeId, { element: HTMLElement; count: HTMLElement | null; state: HTMLElement; key: string }>()
  let furyButton: HTMLElement | null = null
  let furyKey = ''
  let reserveKey = ''
  let gearCleanup: (() => void)[] = []
  const mainList = query<HTMLElement>('.tablet-list-main')
  const mainSection = query<HTMLElement>('.tablet-section-main')
  const worldNote = query<HTMLElement>('.tablet-world-note')
  const sideList = query<HTMLElement>('.tablet-list-side')
  const record = query<HTMLElement>('.tablet-record')
  const collection = query<HTMLElement>('.tablet-collection')
  const secretNote = query<HTMLElement>('.tablet-secret-note')
  const townList = query<HTMLElement>('.tablet-town')
  const closeButton = query<HTMLButtonElement>('.tablet-close')

  function bar(name: 'health' | 'energy' | 'charge') {
    const element = query<HTMLElement>(`.tablet-bar[data-kind="${name}"]`)
    return {
      element,
      fill: element.querySelector('.tablet-bar-fill') as HTMLElement,
      ghost: element.querySelector('.tablet-bar-ghost') as HTMLElement,
      value: element.querySelector('.tablet-bar-value') as HTMLElement,
    }
  }

  let mode: TabletMode = 'hidden'
  let battle: Battle | null = null
  let gainTotal = 0
  let gainTimer: ReturnType<typeof setTimeout> | null = null
  let tagKey = ''
  let inset: Inset = NO_INSET
  const held = new Set<TabletAction>()

  function press(action: TabletAction, event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!battle) return
    const button = buttons.get(action)
    try {
      button?.setPointerCapture(event.pointerId)
    } catch {
    }
    held.add(action)
    button?.setAttribute('data-pressed', 'true')
    options.onAction(action, true)
  }
  function release(action: TabletAction, event: Event) {
    event.stopPropagation()
    if (!held.has(action)) return
    held.delete(action)
    buttons.get(action)?.removeAttribute('data-pressed')
    options.onAction(action, false)
  }
  function releaseAll() {
    for (const action of [...held]) {
      held.delete(action)
      buttons.get(action)?.removeAttribute('data-pressed')
      options.onAction(action, false)
    }
  }
  const swallow = (event: Event) => event.stopPropagation()

  const listeners: (() => void)[] = []
  for (const [action, button] of buttons) {
    const down = (event: PointerEvent) => press(action, event)
    const up = (event: Event) => release(action, event)
    button.addEventListener('pointerdown', down)
    button.addEventListener('pointerup', up)
    button.addEventListener('pointercancel', up)
    button.addEventListener('lostpointercapture', up)
    button.addEventListener('contextmenu', swallow)
    listeners.push(() => {
      button.removeEventListener('pointerdown', down)
      button.removeEventListener('pointerup', up)
      button.removeEventListener('pointercancel', up)
      button.removeEventListener('lostpointercapture', up)
      button.removeEventListener('contextmenu', swallow)
    })
  }
  function buildHand(hand: readonly CardId[]) {
    for (const remove of chipCleanup) remove()
    chipCleanup = []
    chips.clear()
    handRow.dataset.count = String(hand.length)
    if (!hand.length) {
      handRow.innerHTML = '<p class="tablet-hand-empty">Mão vazia. Monte a sua na Oficina do Cristal.</p>'
      return
    }
    handRow.innerHTML = hand.map((id, slot) => chip(id, slot)).join('')
    for (const id of hand) {
      const element = handRow.querySelector<HTMLButtonElement>(`.tablet-card[data-card="${id}"]`)
      if (!element) continue
      chips.set(id, { element, cost: element.querySelector('.tablet-card-cost') as HTMLElement, cool: -1, state: '' })
      const down = (event: PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!battle) return
        element.setAttribute('data-pressed', 'true')
        setTimeout(() => element.removeAttribute('data-pressed'), 140)
        options.onCard(id)
      }
      element.addEventListener('pointerdown', down)
      element.addEventListener('contextmenu', swallow)
      chipCleanup.push(() => {
        element.removeEventListener('pointerdown', down)
        element.removeEventListener('contextmenu', swallow)
      })
    }
    syncKeys()
  }
  function buildGear(current: Battle) {
    for (const remove of gearCleanup) remove()
    gearCleanup = []
    gear.clear()
    furyButton = null
    furyKey = ''
    const views = current.gadgets.views()
    const fury = current.gadgets.perks.imprevisivel > 0
    furyMeter.hidden = !fury
    dock.dataset.empty = String(!views.length && !fury)
    gearRow.innerHTML =
      views
        .map((view) => {
          const def = upgradeDef(view.id)
          const action = view.slot === 'chip' ? GEAR_ACTIONS[view.index] : MOUNT_ACTIONS[view.index]
          const tag = view.active ? 'button' : 'span'
          return `<${tag} ${view.active ? 'type="button"' : ''} class="gear-slot" data-id="${view.id}" data-slot="${view.slot}" data-active="${view.active}" aria-label="${def.name}, ${def.tagline}">
            <span class="gear-slot-icon" style="background-image: url('${upgradeIcon(options.assetBase, view.id)}')" aria-hidden="true"></span>
            <span class="gear-slot-cool" aria-hidden="true"></span>
            ${view.active ? (options.touch ? '' : `<kbd class="gear-slot-key" data-key="${action}"></kbd>`) : '<i class="gear-slot-auto">AUTO</i>'}
            ${view.count !== null ? '<b class="gear-slot-count"></b>' : ''}
            <span class="gear-slot-name">${def.name}</span>
            <span class="gear-slot-state"></span>
          </${tag}>`
        })
        .join('') +
      (fury
        ? `<button type="button" class="gear-slot gear-slot-fury" data-active="true" aria-label="Fúria do Imprevisível">
            <span class="gear-slot-icon" style="background-image: url('${upgradeIcon(options.assetBase, 'imprevisivel')}')" aria-hidden="true"></span>
            <span class="gear-slot-cool" aria-hidden="true"></span>
            ${options.touch ? '' : '<kbd class="gear-slot-key" data-key="fury"></kbd>'}
            <span class="gear-slot-name">Fúria</span>
            <span class="gear-slot-state"></span>
          </button>`
        : '')
    for (const view of views) {
      const element = gearRow.querySelector<HTMLElement>(`.gear-slot[data-id="${view.id}"]`)
      if (!element) continue
      gear.set(view.id, { element, count: element.querySelector('.gear-slot-count'), state: element.querySelector('.gear-slot-state') as HTMLElement, key: '' })
      if (!view.active) continue
      const id = view.id
      const down = (event: PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!battle) return
        element.dataset.pressed = 'true'
        setTimeout(() => element.removeAttribute('data-pressed'), 140)
        options.onGadget(id)
      }
      element.addEventListener('pointerdown', down)
      element.addEventListener('contextmenu', swallow)
      gearCleanup.push(() => {
        element.removeEventListener('pointerdown', down)
        element.removeEventListener('contextmenu', swallow)
      })
    }
    furyButton = gearRow.querySelector<HTMLElement>('.gear-slot-fury')
    if (furyButton) {
      const button = furyButton
      const down = (event: PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()
        if (!battle) return
        button.dataset.pressed = 'true'
        setTimeout(() => button.removeAttribute('data-pressed'), 140)
        options.onFury()
      }
      button.addEventListener('pointerdown', down)
      gearCleanup.push(() => button.removeEventListener('pointerdown', down))
    }
    syncKeys()
  }

  function tickGear(current: Battle) {
    if (gear.size) {
      for (const view of current.gadgets.views()) {
        const entry = gear.get(view.id)
        if (!entry) continue
        const key = `${view.ready}|${view.running}|${view.state}|${view.count}|${Math.round(view.cool * 40)}`
        if (key === entry.key) continue
        entry.key = key
        entry.element.style.setProperty('--cool', view.cool.toFixed(3))
        entry.element.dataset.ready = String(view.ready)
        entry.element.dataset.running = String(view.running)
        entry.state.textContent = view.state
        if (entry.count) entry.count.textContent = view.count === null ? '' : `${view.count}`
      }
    }
    if (!furyButton) return
    const fury = current.gadgets.fury
    const ready = current.gadgets.furyReady
    const running = current.gadgets.qteView !== null
    const key = `${Math.floor(fury)}|${ready}|${running}`
    if (key === furyKey) return
    furyKey = key
    furyButton.style.setProperty('--cool', ready ? '0' : (1 - fury / 100).toFixed(3))
    furyButton.dataset.ready = String(ready)
    furyButton.dataset.running = String(running)
    const label = running ? 'EM FÚRIA' : ready ? 'PRONTA' : `${Math.floor(fury)}%`
    ;(furyButton.querySelector('.gear-slot-state') as HTMLElement).textContent = label
    furyFill.style.setProperty('--amount', (fury / 100).toFixed(3))
    furyValue.textContent = label
    furyMeter.dataset.full = String(ready)
  }

  function renderReserve(current: Battle) {
    const { reserve, reserveMax, barSize } = current.gadgets
    const count = barSize > 0 ? Math.round(reserveMax / barSize) : 0
    const key = `${count}|${Math.ceil(reserve)}`
    if (key === reserveKey) return
    reserveKey = key
    bars.health.element.dataset.reserve = String(count > 0)
    reserveBox.innerHTML = Array.from({ length: count }, (_, index) => `<i style="--amount: ${Math.max(0, Math.min(1, (reserve - index * barSize) / barSize)).toFixed(3)}"></i>`).join('')
  }

  root.addEventListener('pointerdown', swallow)
  toggle.addEventListener('pointerdown', swallow)
  dock.addEventListener('pointerdown', swallow)
  const onClose = (event: Event) => {
    event.stopPropagation()
    options.onClose()
  }
  const onOpen = (event: Event) => {
    event.stopPropagation()
    options.onOpen()
  }
  const onTrail = (event: Event) => {
    event.stopPropagation()
    options.onTrail()
  }
  const trailButton = query<HTMLButtonElement>('.tablet-trail-button')
  closeButton.addEventListener('click', onClose)
  trailButton.addEventListener('click', onTrail)
  toggle.addEventListener('click', onOpen)
  window.addEventListener('blur', releaseAll)
  window.addEventListener('resize', measure)

  function refresh() {
    if (!battle || mode !== 'battle') return
    const health = battle.health / battle.maxHealth
    const energy = battle.energy / battle.maxEnergy
    const charge = battle.charge / 100
    setBar(bars.health, health, `${Math.ceil(battle.health)}`)
    setBar(bars.energy, energy, battle.overheat > 0 ? 'QUENTE' : `${Math.floor(battle.energy)}`)
    bars.energy.element.dataset.overheat = String(battle.overheat > 0)
    setBar(bars.charge, charge, charge >= 1 ? 'MAX' : `${Math.floor(battle.charge)}%`)
    bars.health.element.dataset.low = String(health <= 0.3)
    bars.charge.element.dataset.full = String(charge >= 1)
    roundLabel.textContent = battle.rounds > 1 ? `Rodada ${battle.round + 1}/${battle.rounds}` : battle.mode === 'ring' ? 'Rodada única' : 'Fuga'
    credits.textContent = formatCredits(options.progress.credits)
    root.dataset.action = battle.action
    root.dataset.phase = battle.phase
    buttons.get('shoot')?.toggleAttribute('data-disabled', battle.energy < battle.shotCost)
    buttons.get('dodge')?.toggleAttribute('data-disabled', battle.energy < battle.dodgeCost)
    buttons.get('guard')?.toggleAttribute('data-disabled', battle.energy <= 0)
    const ailments = battle.status.list()
    const adapted = battle.adaptation > 0 ? Math.round((1 - battle.adaptationFactor) * 100) : 0
    const key = `${ailments.join(',')}|${adapted}`
    if (key !== tagKey) {
      tagKey = key
      const adaptedTag = adapted
        ? `<span class="tablet-tag" style="--tag: 190 196 204" title="Os adversários se adaptaram ao tablet: cartas especiais causam ${adapted}% menos dano até você lutar um tempo sem elas">Adaptados −${adapted}%</span>`
        : ''
      tags.innerHTML =
        ailments
          .map((ailment) => `<span class="tablet-tag" style="--tag: ${rgb(ELEMENTS[elementOf(ailment)].color)}" title="${AILMENTS[ailment].name}: ${AILMENTS[ailment].effect}">${AILMENT_TAG[ailment]}</span>`)
          .join('') + adaptedTag
    }
    renderReserve(battle)
    tick()
  }

  function tick() {
    if (!battle || mode !== 'battle') return
    for (const [id, entry] of chips) {
      const locked = isSecretCard(id) && !battle.unlockedCards.has(id)
      const state = battle.cardState(id)
      const cool = Math.round(state.cooldown * 40) / 40
      if (cool !== entry.cool) {
        entry.cool = cool
        entry.element.style.setProperty('--cool', cool.toFixed(3))
      }
      const label = locked ? '?' : CARDS[id].kind === 'transform' ? (state.active ? 'ATIVA' : state.affordable ? 'PRONTA' : 'CARGA') : `${state.cost}`
      const next = `${locked}|${state.ready}|${state.active}|${state.affordable}|${label}`
      if (next !== entry.state) {
        entry.state = next
        entry.element.dataset.locked = String(locked)
        entry.element.dataset.ready = String(state.ready && !locked)
        entry.element.dataset.active = String(state.active)
        entry.element.dataset.affordable = String(state.affordable && !locked)
        entry.cost.textContent = label
        entry.element.setAttribute(
          'aria-label',
          locked
            ? `Carta secreta trancada: encontre a ${CARDS[id].origin ?? 'clareira'} na floresta`
            : `${CARDS[id].name}: ${CARDS[id].kind === 'special' ? `${state.cost} de energia` : 'gasta a Carga inteira'}${state.ready ? ', pronta' : ''}`,
        )
      }
    }
    tickGear(battle)
    if (battle.form) {
      formChip.hidden = false
      formName.textContent = CARDS[battle.form].short
      formLeft.style.setProperty('--amount', (battle.formTimer / Math.max(0.01, battle.formTotal)).toFixed(3))
      formChip.style.setProperty('--accent', rgb(CARDS[battle.form].accent))
    } else if (!formChip.hidden) {
      formChip.hidden = true
    }
  }

  function setBar(target: ReturnType<typeof bar>, fraction: number, label: string) {
    const amount = Math.max(0, Math.min(1, fraction))
    target.fill.style.setProperty('--amount', amount.toFixed(3))
    const ghost = Number(target.ghost.style.getPropertyValue('--amount') || '1')
    if (amount < ghost) {
      target.ghost.style.setProperty('--amount', ghost.toFixed(3))
      requestAnimationFrame(() => target.ghost.style.setProperty('--amount', amount.toFixed(3)))
    } else {
      target.ghost.style.setProperty('--amount', amount.toFixed(3))
    }
    target.value.textContent = label
  }

  function gain(amount: number) {
    gainTotal += amount
    gainLabel.textContent = `+${formatCredits(gainTotal)}`
    gainLabel.dataset.visible = 'true'
    credits.textContent = formatCredits(options.progress.credits)
    if (gainTimer) clearTimeout(gainTimer)
    gainTimer = setTimeout(() => {
      gainLabel.dataset.visible = 'false'
      gainTotal = 0
      gainTimer = null
    }, GAIN_MS)
  }

  function renderMissions() {
    const { progress } = options
    const level = currentLevel(progress)
    const world = worldOf(level)
    const data = WORLDS[world - 1]
    const start = (world - 1) * WORLD_SIZE
    const cycle = ladderCycle(progress)
    mainSection.textContent = `Trilha · ${data.kicker} · ${data.name}`
    worldNote.textContent = `Níveis ${start + 1} a ${start + WORLD_SIZE} de ${MAIN_MISSIONS.length}${cycle > 1 ? ` · ${cycle}º ciclo` : ''}. ${data.flavor}`
    mainList.replaceChildren(...MAIN_MISSIONS.slice(start, start + WORLD_SIZE).map((mission, index) => missionItem(mission, start + index + 1)))
    sideList.replaceChildren(...SIDE_MISSIONS.map((mission) => missionItem(mission, null)))
    const { wins, losses, kills } = progress.missions
    record.textContent = `${wins} ${wins === 1 ? 'vitória' : 'vitórias'} · ${losses} ${losses === 1 ? 'derrota' : 'derrotas'} · ${kills} ${kills === 1 ? 'robô sucateado' : 'robôs sucateados'} · ${formatCredits(progress.credits)} ¢`
    for (const id of CARD_IDS) {
      const item = collection.querySelector<HTMLElement>(`[data-card="${id}"]`)
      if (!item) continue
      const slot = progress.hand.indexOf(id)
      item.dataset.hand = String(slot >= 0)
      const badge = item.querySelector('.tablet-collection-slot')
      if (badge) badge.textContent = slot >= 0 ? String(slot + 1) : ''
    }
    for (const id of SECRET_CARDS) {
      const item = collection.querySelector<HTMLElement>(`[data-card="${id}"]`)
      if (!item) continue
      const locked = !progress.cards.includes(id)
      const card = CARDS[id]
      item.dataset.locked = String(locked)
      item.title = locked ? `Carta secreta: escondida na ${card.origin ?? 'floresta'}` : card.description
      const name = item.querySelector('b')
      const note = item.querySelector('small')
      if (name) name.textContent = locked ? '???' : card.short
      if (note) note.textContent = locked ? (card.origin ?? 'Clareira') : card.kind === 'special' ? `${card.cost} energia` : 'Carga cheia'
    }
    const found = SECRET_CARDS.filter((id) => progress.cards.includes(id)).length
    secretNote.textContent =
      found === SECRET_CARDS.length
        ? 'As três cartas secretas das clareiras já estão no baralho. Leve as que quiser na mão, pela Oficina do Cristal.'
        : `${found} de ${SECRET_CARDS.length} cartas secretas encontradas. As outras dormem nas clareiras escondidas da floresta; as pistas ficam na estante de casa. A mão de ${HAND_SIZE} cartas se monta na Oficina do Cristal.`
    renderTown()
  }

  function townRow(kind: 'master' | 'rival', name: string, note: string, done: boolean, state: string | HTMLElement) {
    const item = document.createElement('li')
    item.dataset.kind = kind
    item.dataset.done = String(done)
    const text = document.createElement('span')
    const title = document.createElement('b')
    title.textContent = name
    const small = document.createElement('small')
    small.textContent = note
    text.append(title, small)
    const mark = typeof state === 'string' ? Object.assign(document.createElement('span'), { className: 'tablet-town-state', textContent: state }) : state
    item.append(text, mark)
    return item
  }

  function renderTown() {
    const { progress } = options
    const masters = MASTERS.map((master) => {
      const done = lessonDone(progress, master.id)
      return townRow('master', master.name, `${master.title} · ${master.district}`, done, done ? 'Lição feita' : 'Lição nova')
    })
    const rivals = RIVALS.map((rival) => {
      const { level } = friendship(progress, rival.id)
      const hearts = document.createElement('span')
      hearts.className = 'tablet-town-hearts'
      hearts.setAttribute('aria-label', `Amizade: ${FRIEND_LEVELS[level]}`)
      for (let step = 0; step < FRIEND_MAX; step++) {
        const heart = document.createElement('i')
        heart.dataset.on = String(step < level)
        hearts.append(heart)
      }
      return townRow('rival', level ? rival.name : 'Robô fugitivo', `${level ? FRIEND_LEVELS[level] : 'Ainda não se conheceram'} · ${rival.district}`, level >= FRIEND_MAX, hearts)
    })
    townList.replaceChildren(...masters, ...rivals)
  }

  function missionItem(mission: Mission, index: number | null) {
    const { progress } = options
    const item = document.createElement('li')
    item.className = 'tablet-mission'
    let status: string
    let badge: string
    let meta: string
    if (mission.kind === 'main') {
      status = mainStatus(progress, mission)
      badge = status === 'done' ? ICONS.check : status === 'locked' ? ICONS.lock : mission.boss ? ICONS.bolt : `${index}`
      meta = status === 'done' ? 'vencida' : `${formatCredits(missionReward(progress, mission))} ¢`
      item.dataset.boss = String(Boolean(mission.boss))
    } else {
      const clears = sideClears(progress, mission)
      status = sideUnlocked(progress, mission) ? (clears > 0 ? 'done' : 'open') : 'locked'
      badge = status === 'locked' ? ICONS.lock : clears > 0 ? `${clears}×` : ICONS.flag
      meta = status === 'locked' ? 'avance na arena' : `${formatCredits(mission.reward)} ¢${clears === 0 && mission.firstBonus ? ` +${formatCredits(mission.firstBonus)}` : ''}`
    }
    item.dataset.status = status
    const site = mission.site ? siteById(mission.site) : null
    const where = mission.kind === 'main' ? `${mission.boss ? 'Campeão do mundo' : `Nível ${mission.level}`} · ${ARENA.name}` : site ? `${site.name} · ${site.district}` : ''
    item.innerHTML = `
      <span class="tablet-mission-badge">${badge}</span>
      <div class="tablet-mission-text">
        <strong>${mission.title}</strong>
        <span>${status === 'locked' && mission.kind === 'main' ? 'Vença a anterior para desbloquear.' : mission.tagline}</span>
        <small>${where}</small>
      </div>
      <span class="tablet-mission-meta">${meta}</span>
    `
    return item
  }

  function setMode(next: TabletMode) {
    mode = next
    root.dataset.mode = next
    dock.dataset.visible = String(next === 'battle' && dock.dataset.empty !== 'true')
    if (next !== 'battle') releaseAll()
    toggle.dataset.visible = String(toggleAllowed && next === 'hidden')
    measure()
  }
  let toggleAllowed = false

  function measure() {
    if (mode !== 'battle') {
      inset = NO_INSET
      return
    }
    const width = surface.clientWidth
    const height = surface.clientHeight
    const right = Math.max(0, width - root.offsetLeft)
    const bottom = Math.max(0, height - root.offsetTop)
    inset = (width - right) * height >= width * (height - bottom) ? { right, bottom: 0 } : { right: 0, bottom }
  }

  return {
    get mode() {
      return mode
    },
    get inset() {
      return inset
    },
    showBattle(next) {
      battle = next
      kind.textContent = next.mission.kind === 'main' ? 'Missão principal' : `Secundária · ${next.site?.name ?? 'cidade'}`
      title.textContent = next.mission.title
      buildHand(next.hand)
      buildGear(next)
      reserveKey = ''
      tagKey = '-'
      for (const entry of chips.values()) {
        entry.cool = -1
        entry.state = ''
      }
      for (const target of Object.values(bars)) {
        target.ghost.style.setProperty('--amount', '1')
        target.fill.style.setProperty('--amount', '1')
      }
      setMode('battle')
      refresh()
    },
    showMissions() {
      renderMissions()
      setMode('missions')
    },
    hide() {
      battle = null
      setMode('hidden')
    },
    setToggleVisible(visible) {
      toggleAllowed = visible
      if (visible) refreshAlert()
      toggle.dataset.visible = String(visible && mode === 'hidden')
    },
    refresh,
    tick,
    gain,
    destroy() {
      for (const remove of listeners) remove()
      for (const remove of chipCleanup) remove()
      for (const remove of gearCleanup) remove()
      root.removeEventListener('pointerdown', swallow)
      toggle.removeEventListener('pointerdown', swallow)
      dock.removeEventListener('pointerdown', swallow)
      closeButton.removeEventListener('click', onClose)
    trailButton.removeEventListener('click', onTrail)
      toggle.removeEventListener('click', onOpen)
      window.removeEventListener('blur', releaseAll)
      window.removeEventListener('resize', measure)
      unsubscribeKeys()
      if (gainTimer) clearTimeout(gainTimer)
      root.remove()
      toggle.remove()
      dock.remove()
    },
  }
}

function elementOf(ailment: keyof typeof AILMENT_TAG) {
  return (Object.keys(ELEMENTS) as (keyof typeof ELEMENTS)[]).find((id) => ELEMENTS[id].ailment === ailment) ?? 'fogo'
}
