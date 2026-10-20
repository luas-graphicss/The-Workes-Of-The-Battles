import { ARENA, HOUSE, secretSpotById, secretSpotUnlocked } from '../../world-data'
import type { Sound } from '../audio'
import {
  BODY_NAME,
  computeStats,
  formatCredits,
  isSecret,
  partById,
  SECRET_PARTS,
  SLOT_SINGULAR,
  SLOTS,
  speedMultiplier,
  STAT_KEYS,
  STAT_LABEL,
  STAT_MAX,
  type Loadout,
  type Part,
} from '../robot/parts'
import { CONDITION_MAX, conditionOf, conditionTier, DAMAGED_AT, repairCost, TIER_LABEL, TIER_NOTE, WORN_AT, type Condition } from '../robot/condition'
import { buyUpgrade, equipPart, repairAll, repairPart, type Progress } from '../robot/progress'
import type { RobotComposer } from '../robot/sprites'
import { describeEffect, partLevel, upgradeCost, upgradeLevel, upgradesFor, type Upgrade, type UpgradeLevels } from '../robot/upgrades'
import { Turntable } from '../shop/turntable'
import { cellCanvas } from '../ui/cell'
import { creditHtml, element, emblemPath, holdToConfirm, ICONS, revealSelection, type EmblemName, type HoldControl } from '../ui/kit'

export type HouseOptions = {
  composer: RobotComposer
  progress: Progress
  sound: Sound
  assetBase: string
  touch: boolean
  onChange(loadout: Loadout): void
}

export type House = {
  readonly visible: boolean
  show(): void
  hide(): void
  onExit(listener: () => void): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  tick(dt: number): void
  destroy(): void
}

type Room = 'bench' | 'shelf' | 'capsule'

type Spot = {
  label: string
  sub: string
  emblem: EmblemName
  area: { left: number; top: number; width: number; height: number }
  pin: [number, number]
  focus: [number, number]
}

const ROOMS: readonly Room[] = ['bench', 'shelf', 'capsule']

const SPOTS: Record<Room, Spot> = {
  bench: { label: 'Bancada', sub: 'Melhorias', emblem: 'workshop', area: { left: 24, top: 56, width: 46, height: 26 }, pin: [46, 62], focus: [0.47, 0.66] },
  shelf: { label: 'Estante', sub: 'Peças secretas', emblem: 'secret', area: { left: 0, top: 9, width: 23, height: 38 }, pin: [11, 21], focus: [0.18, 0.32] },
  capsule: { label: 'Cápsula', sub: 'Reparo', emblem: 'capsule', area: { left: 69, top: 40, width: 25, height: 44 }, pin: [82, 48], focus: [0.81, 0.6] },
}

const HOME: [number, number] = [0.5, 0.52]
const ZOOM = { wide: 1.3, narrow: 1.12 }

const TOAST_MS = 2600
const ITEM_ICON = 56
const DETAIL_ICON = 72
const SLOT_ICON = 40
const TAB_ICON = 28
const COLUMNS = 3
const HOLD_MS = 700

const PIN_GAP = 10
const EDGE = 8
const MIN_SHELF = 48

type Box = { left: number; top: number; right: number; bottom: number }

const overlaps = (a: Box, b: Box, gap: number) =>
  a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap

const MAXED_LINE = 'Nível máximo'
const POOR_LINE = 'Faltam créditos para esta melhoria. As batalhas pagam o resto.'
const POOR_REPAIR_LINE = 'Faltam créditos para este reparo. A sucata da próxima luta ajuda a pagar.'
const EMPTY_BENCH = 'A bancada está vazia: compre peças na Oficina do Cristal ou encontre as secretas pela cidade.'
const EMPTY_CAPSULE = 'A Cápsula está vazia: ela repara as peças que você já tem. Compre peças na Oficina ou encontre as secretas.'

export function createHouse(surface: HTMLElement, options: HouseOptions): House {
  const { composer, progress, sound } = options
  const interior = `${options.assetBase}assets/house/interior.png`
  const root = element('section', 'shop home')
  root.dataset.visible = 'false'
  root.dataset.shelf = 'none'
  root.dataset.side = 'right'
  root.dataset.layout = 'wide'
  root.dataset.touch = String(options.touch)
  root.setAttribute('aria-label', HOUSE.name)
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="shop-stage">
      <div class="shop-painting">
        <img class="shop-art" src="${interior}" alt="" draggable="false" decoding="async">
        <div class="shop-zones" aria-hidden="true"></div>
        <div class="shop-pins"></div>
      </div>
      <div class="shop-shade" aria-hidden="true"></div>
    </div>

    <header class="shop-top">
      <div class="shop-title">
        <img class="shop-title-emblem" src="${emblemPath(options.assetBase, 'house')}" alt="" width="48" height="48" decoding="async">
        <div>
          <span class="ui-kicker">${HOUSE.district}</span>
          <h2 class="shop-name">${HOUSE.name}</h2>
        </div>
      </div>
      <div class="shop-top-right">
        <div class="shop-credits ui-panel" aria-live="polite">
          <img src="${emblemPath(options.assetBase, 'credit')}" alt="" width="30" height="30" decoding="async">
          <span class="shop-credits-text"><span class="shop-credits-value"></span><span class="shop-credits-label">créditos</span></span>
        </div>
        <button type="button" class="shop-exit ui-btn">${ICONS.close}<span>Sair</span>${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
      </div>
    </header>

    <aside class="shop-bench ui-panel" aria-label="Seu robô">
      <div class="shop-bench-robot"><span class="shop-pedestal" aria-hidden="true"></span></div>
      <div class="shop-bench-main">
        <header class="shop-bench-head">
          <span class="ui-kicker">Seu robô</span>
          <h3 class="shop-bench-name">${BODY_NAME}</h3>
        </header>
        <ul class="shop-slots" aria-label="Peças equipadas"></ul>
        <p class="shop-speed"></p>
      </div>
      <ul class="shop-stats" aria-label="Atributos"></ul>
    </aside>

    <aside class="shop-panel ui-panel" data-open="false" aria-label="Canto da casa">
      <header class="shop-panel-head">
        <div class="shop-panel-robot"></div>
        <div class="shop-panel-titles">
          <span class="ui-kicker" data-mark>Casa</span>
          <h3 class="shop-panel-title"></h3>
        </div>
        <button type="button" class="shop-back ui-btn" aria-label="Fechar">${ICONS.close}${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
      </header>
      <nav class="shop-tabs" role="tablist" aria-label="Cantos da casa"></nav>
      <p class="home-summary" aria-live="polite"></p>
      <div class="home-repair-all" data-visible="false"></div>
      <div class="shop-items" role="list"></div>
      <div class="shop-detail" data-visible="false"></div>
    </aside>

    <nav class="shop-dock" aria-label="Cantos da casa"></nav>
    <footer class="shop-hints" aria-hidden="true"></footer>
    <div class="shop-toast" role="status" aria-live="assertive" data-visible="false">
      <span class="shop-toast-icon"></span>
      <span class="shop-toast-text"><span class="ui-kicker">Melhoria instalada</span><strong class="shop-toast-name"></strong></span>
    </div>
  `
  surface.append(root)

  const stage = root.querySelector('.shop-stage') as HTMLElement
  const painting = root.querySelector('.shop-painting') as HTMLElement
  const zonesBox = root.querySelector('.shop-zones') as HTMLElement
  const pinsBox = root.querySelector('.shop-pins') as HTMLElement
  const topBar = root.querySelector('.shop-top') as HTMLElement
  const titleBox = root.querySelector('.shop-title') as HTMLElement
  const topRightBox = root.querySelector('.shop-top-right') as HTMLElement
  const creditsBox = root.querySelector('.shop-credits') as HTMLElement
  const creditsValue = root.querySelector('.shop-credits-value') as HTMLElement
  const exitButton = root.querySelector('.shop-exit') as HTMLButtonElement
  const bench = root.querySelector('.shop-bench') as HTMLElement
  const benchRobot = root.querySelector('.shop-bench-robot') as HTMLElement
  const slotsList = root.querySelector('.shop-slots') as HTMLElement
  const speedNote = root.querySelector('.shop-speed') as HTMLElement
  const statsList = root.querySelector('.shop-stats') as HTMLElement
  const panel = root.querySelector('.shop-panel') as HTMLElement
  const panelRobot = root.querySelector('.shop-panel-robot') as HTMLElement
  const panelKicker = root.querySelector('.shop-panel-titles .ui-kicker') as HTMLElement
  const panelTitle = root.querySelector('.shop-panel-title') as HTMLElement
  const backButton = root.querySelector('.shop-back') as HTMLButtonElement
  const tabsBox = root.querySelector('.shop-tabs') as HTMLElement
  const summary = root.querySelector('.home-summary') as HTMLElement
  const repairAllBox = root.querySelector('.home-repair-all') as HTMLElement
  const itemsBox = root.querySelector('.shop-items') as HTMLElement
  const detailBox = root.querySelector('.shop-detail') as HTMLElement
  const dock = root.querySelector('.shop-dock') as HTMLElement
  const hints = root.querySelector('.shop-hints') as HTMLElement
  const toast = root.querySelector('.shop-toast') as HTMLElement
  const toastIcon = root.querySelector('.shop-toast-icon') as HTMLElement
  const toastKicker = root.querySelector('.shop-toast-text .ui-kicker') as HTMLElement
  const toastName = root.querySelector('.shop-toast-name') as HTMLElement

  const preview = new Turntable(composer, 'Seu robô girando, com as peças equipadas')
  benchRobot.append(preview.canvas)

  let visible = false
  let rest = { x: 0, y: 0 }
  let openRoom: Room | null = null
  let selected: Part | null = null
  let hoveredUpgrade: Upgrade | null = null
  let hoveredRepair: Part | 'all' | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  const holds = new Map<string, HoldControl>()
  let holdingKey: string | null = null
  const exitListeners: (() => void)[] = []
  const pins = new Map<Room, HTMLButtonElement>()
  const zones = new Map<Room, HTMLElement>()
  const tabs = new Map<Room, HTMLButtonElement>()
  const dockButtons = new Map<Room, HTMLButtonElement>()
  const itemButtons = new Map<string, HTMLButtonElement>()
  const pinnedDetail = () => getComputedStyle(detailBox).position === 'sticky'

  function narrow() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    return width < 900 || width / Math.max(1, height) < 1.12
  }

  function freeArea(width: number, height: number) {
    const left = 0
    let right = width
    const top = topBar.offsetTop + topBar.offsetHeight
    let bottom = height
    if (root.dataset.layout === 'narrow') {
      bottom = openRoom ? panel.offsetTop : Math.min(bench.offsetTop, dock.offsetTop || height)
    } else {
      bottom = bench.offsetTop
      if (openRoom) right = panel.offsetLeft
    }
    return { x: (left + right) / 2, y: (top + Math.max(top + 40, bottom)) / 2 }
  }

  function frame(animate = true) {
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (!width || !height) return
    root.dataset.layout = narrow() ? 'narrow' : 'wide'
    const base = Math.max(width, height)
    painting.style.width = `${base}px`
    painting.style.height = `${base}px`
    root.style.setProperty('--pw', `${base}px`)
    const zoom = openRoom ? ZOOM[root.dataset.layout as 'wide' | 'narrow'] : 1
    const [fx, fy] = openRoom ? SPOTS[openRoom].focus : HOME
    const target = freeArea(width, height)
    const size = base * zoom
    const x = Math.min(0, Math.max(width - size, target.x - fx * size))
    const y = Math.min(0, Math.max(height - size, target.y - fy * size))
    painting.dataset.animate = String(animate)
    painting.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${zoom})`
    if (!openRoom) rest = { x, y }
    fitPins()
  }

  function fitPins() {
    if (!visible || openRoom) return
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (!width || !height) return
    const obstacles: Box[] = [titleBox, topRightBox, bench, hints, dock]
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => {
        const { left, top, right, bottom } = node.getBoundingClientRect()
        return { left, top, right, bottom }
      })

    for (const [room, pin] of pins) {
      const zone = zones.get(room) as HTMLElement
      const shelf: Box = {
        left: rest.x + zone.offsetLeft,
        top: rest.y + zone.offsetTop,
        right: rest.x + zone.offsetLeft + zone.offsetWidth,
        bottom: rest.y + zone.offsetTop + zone.offsetHeight,
      }
      const shows = Math.min(shelf.right, width) - Math.max(shelf.left, 0) >= MIN_SHELF && Math.min(shelf.bottom, height) - Math.max(shelf.top, 0) >= MIN_SHELF
      const em = parseFloat(getComputedStyle(pin).fontSize) || 14
      const anchorX = rest.x + pin.offsetLeft
      const anchorY = rest.y + pin.offsetTop
      const left = anchorX - em
      const box: Box = { left, top: anchorY - pin.offsetHeight / 2, right: left + pin.offsetWidth, bottom: anchorY + pin.offsetHeight / 2 }
      const at = (dx: number, dy: number): Box => ({ left: box.left + dx, right: box.right + dx, top: box.top + dy, bottom: box.bottom + dy })
      const fits = ([dx, dy]: [number, number]) => {
        const moved = at(dx, dy)
        return (
          moved.left >= EDGE &&
          moved.right <= width - EDGE &&
          moved.top >= EDGE &&
          moved.bottom <= height - EDGE &&
          anchorX + dx >= shelf.left &&
          anchorX + dx <= shelf.right &&
          anchorY + dy >= shelf.top &&
          anchorY + dy <= shelf.bottom
        )
      }

      let offset: [number, number] = [
        Math.min(Math.max(0, EDGE - box.left), width - EDGE - box.right),
        Math.min(Math.max(0, EDGE - box.top), height - EDGE - box.bottom),
      ]
      for (let pass = 0; pass <= obstacles.length; pass++) {
        const [dx, dy] = offset
        const current = at(dx, dy)
        const hit = obstacles.find((obstacle) => overlaps(current, obstacle, PIN_GAP))
        if (!hit) break
        const choices = (
          [
            [dx, dy + hit.top - PIN_GAP - current.bottom],
            [dx, dy + hit.bottom + PIN_GAP - current.top],
            [dx + hit.left - PIN_GAP - current.right, dy],
            [dx + hit.right + PIN_GAP - current.left, dy],
          ] as [number, number][]
        ).filter(fits)
        if (!choices.length) break
        offset = choices.reduce((a, b) => (Math.hypot(...a) <= Math.hypot(...b) ? a : b))
      }
      const [dx, dy] = offset
      const placed = at(dx, dy)
      const clear = shows && fits(offset) && !obstacles.some((obstacle) => overlaps(placed, obstacle, PIN_GAP / 2))
      pin.dataset.offstage = String(!clear)
      pin.style.setProperty('--nudge-x', `${Math.round(dx)}px`)
      pin.style.setProperty('--nudge-y', `${Math.round(dy)}px`)
    }
  }

  function settle(event: Event) {
    if (event.target === bench || event.target === painting) fitPins()
  }
  root.addEventListener('transitionend', settle)
  root.addEventListener('animationend', settle)

  const observer = new ResizeObserver(() => {
    if (visible) frame(false)
  })
  observer.observe(root)

  function depot(): Part[] {
    const parts = progress.owned.map((id) => partById(id)).filter((part): part is Part => part !== null)
    return parts.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot))
  }

  const wornOf = (part: Part) => conditionOf(progress.condition, part.id)
  const equippedNow = (part: Part) => progress.equipped[part.slot] === part.id

  function capsuleQueue(): Part[] {
    return depot().sort((a, b) => {
      const gap = wornOf(a) - wornOf(b)
      if (gap !== 0) return gap
      if (equippedNow(a) !== equippedNow(b)) return equippedNow(a) ? -1 : 1
      return SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)
    })
  }

  function listed(): Part[] {
    return openRoom === 'bench' ? depot() : openRoom === 'shelf' ? [...SECRET_PARTS] : openRoom === 'capsule' ? capsuleQueue() : []
  }

  const found = (part: Part) => progress.owned.includes(part.id)
  const wornParts = () => depot().filter((part) => wornOf(part) < CONDITION_MAX)
  const needsRepair = () => SLOTS.some((slot) => {
    const part = partById(progress.equipped[slot])
    return part !== null && wornOf(part) < WORN_AT
  })

  function repairPlan() {
    const queue = wornParts()
      .map((part) => ({ part, cost: repairCost(part, wornOf(part)) }))
      .sort((a, b) => a.cost - b.cost)
    const parts: Part[] = []
    let cost = 0
    for (const entry of queue) {
      if (cost + entry.cost > progress.credits) break
      cost += entry.cost
      parts.push(entry.part)
    }
    return { parts, cost, total: queue.reduce((sum, entry) => sum + entry.cost, 0), worn: queue.length }
  }

  function winsToReveal(part: Part): number {
    if (part.secret?.kind !== 'hidden') return 0
    const spot = secretSpotById(part.secret.spot)
    if (!spot || secretSpotUnlocked(spot, progress.missions.main)) return 0
    return spot.wins - progress.missions.main
  }

  function sealedClue(part: Part): string {
    const wins = winsToReveal(part)
    return `A estante só revela esta pista depois de mais ${wins} ${wins === 1 ? 'vitória' : 'vitórias'} na Liga de Robôs.`
  }

  function previewLevels(): UpgradeLevels {
    if (!hoveredUpgrade || !selected) return progress.upgrades
    const level = upgradeLevel(progress.upgrades, selected.id, hoveredUpgrade.id)
    if (level >= hoveredUpgrade.max) return progress.upgrades
    return { ...progress.upgrades, [selected.id]: { ...(progress.upgrades[selected.id] ?? {}), [hoveredUpgrade.id]: level + 1 } }
  }

  function previewCondition(): Condition {
    if (!hoveredRepair) return progress.condition
    const fixed = hoveredRepair === 'all' ? repairPlan().parts : [hoveredRepair]
    const next = { ...progress.condition }
    for (const part of fixed) delete next[part.id]
    return next
  }

  function originLine(part: Part): string {
    if (!part.secret) return ''
    if (part.secret.kind === 'mission') return 'Prêmio pela primeira vitória em uma missão secundária'
    if (part.secret.kind === 'clearing') return 'Encontrada numa clareira secreta da floresta'
    if (part.secret.kind === 'vendor') return 'Comprada no Sucata & Segredos, dentro da Liga de Robôs'
    if (part.secret.kind === 'camp') return 'Encontrada num acampamento da floresta profunda'
    return 'Encontrada em um esconderijo da cidade'
  }

  function renderCredits() {
    creditsValue.textContent = formatCredits(progress.credits)
  }

  function roomCount(room: Room) {
    if (room === 'capsule') {
      if (!progress.owned.length) return 'sem peças'
      const worn = wornParts().length
      return worn ? `${worn} para reparar` : 'tudo em ordem'
    }
    if (room === 'bench') {
      const parts = depot()
      const levels = parts.reduce((sum, part) => sum + partLevel(progress.upgrades, part.id).level, 0)
      if (!parts.length) return 'depósito vazio'
      return levels > 0 ? `${parts.length} peça${parts.length > 1 ? 's' : ''} · ${levels} ${levels > 1 ? 'níveis' : 'nível'}` : `${parts.length} peça${parts.length > 1 ? 's' : ''}`
    }
    const owned = SECRET_PARTS.filter(found).length
    return `${owned} de ${SECRET_PARTS.length}`
  }

  function renderRooms() {
    const urgent = needsRepair()
    for (const room of ROOMS) {
      const active = String(openRoom === room)
      const alert = String(room === 'capsule' && urgent)
      const pin = pins.get(room)
      if (pin) {
        ;(pin.querySelector('small') as HTMLElement).textContent = roomCount(room)
        pin.dataset.active = active
        pin.dataset.alert = alert
      }
      zones.get(room)?.setAttribute('data-active', active)
      const tab = tabs.get(room)
      if (tab) {
        tab.setAttribute('aria-selected', active)
        tab.tabIndex = openRoom === room ? 0 : -1
        tab.dataset.alert = alert
      }
      const dockButton = dockButtons.get(room)
      dockButton?.setAttribute('aria-pressed', active)
      if (dockButton) dockButton.dataset.alert = alert
    }
  }

  function renderStats() {
    const current = computeStats(progress.equipped, progress.upgrades, progress.condition)
    const levels = previewLevels()
    const health = previewCondition()
    const next = computeStats(progress.equipped, levels, health)
    statsList.replaceChildren(
      ...STAT_KEYS.map((key) => {
        const item = element('li', 'shop-stat')
        const from = current[key]
        const to = next[key]
        const delta = to - from
        item.dataset.delta = delta > 0 ? 'gain' : delta < 0 ? 'loss' : 'same'
        const segments = Array.from({ length: STAT_MAX }, (_, index) => {
          const level = index + 1
          let state = 'empty'
          if (level <= Math.min(from, to)) state = 'filled'
          else if (level <= to) state = 'gain'
          else if (level <= from) state = 'loss'
          return `<i data-state="${state}"></i>`
        }).join('')
        const value = delta === 0 ? `${from}` : `${from}<span class="shop-stat-arrow">›</span><b>${to}</b>`
        item.innerHTML = `<span class="shop-stat-label">${STAT_LABEL[key]}</span><span class="shop-stat-bar" aria-hidden="true">${segments}</span><span class="shop-stat-value">${value}</span>`
        item.setAttribute('aria-label', `${STAT_LABEL[key]}: ${to} de ${STAT_MAX}`)
        return item
      }),
    )
    const factor = speedMultiplier(progress.equipped, levels, health)
    speedNote.textContent = factor === 1 ? 'Passo padrão do B-01' : `Passo ${factor > 1 ? 'mais rápido' : 'mais lento'} · ×${factor.toFixed(2).replace('.', ',')}`
    speedNote.dataset.delta = factor > speedMultiplier(progress.equipped, progress.upgrades, progress.condition) ? 'gain' : 'same'
  }

  function renderSlots() {
    slotsList.replaceChildren(
      ...SLOTS.map((slot) => {
        const item = element('li', 'shop-slot')
        const part = partById(progress.equipped[slot])
        const value = part ? wornOf(part) : CONDITION_MAX
        item.dataset.filled = String(part !== null)
        item.dataset.preview = 'false'
        item.dataset.slot = slot
        item.dataset.tier = conditionTier(value)
        item.title = `${SLOT_SINGULAR[slot]}: ${part ? `${part.name} · ${TIER_LABEL[conditionTier(value)].toLowerCase()} (${value}%)` : 'vazio'}`
        const frameBox = element('span', 'shop-slot-frame')
        if (part) frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', SLOT_ICON))
        if (part && value < CONDITION_MAX) frameBox.append(wearGauge(value))
        item.append(frameBox, element('span', 'shop-slot-label', SLOT_SINGULAR[slot]))
        return item
      }),
    )
  }

  function renderSummary() {
    if (openRoom === 'bench') {
      const parts = depot()
      summary.textContent = parts.length ? 'Cada peça aceita duas melhorias próprias. Escolha uma peça do depósito.' : EMPTY_BENCH
    } else if (openRoom === 'shelf') {
      const owned = SECRET_PARTS.filter(found).length
      const sealed = SECRET_PARTS.filter((part) => !found(part) && winsToReveal(part) > 0).length
      summary.textContent =
        owned === SECRET_PARTS.length
          ? 'A coleção está completa: todas as peças secretas de Bosque Alto estão na sua estante.'
          : `${owned} de ${SECRET_PARTS.length} peças secretas encontradas. As demais deixam pistas${sealed ? `; ${sealed} ${sealed === 1 ? 'pista ainda está lacrada' : 'pistas ainda estão lacradas'} até você vencer mais na arena` : ''}.`
    } else if (openRoom === 'capsule') {
      const plan = repairPlan()
      summary.textContent = !progress.owned.length
        ? EMPTY_CAPSULE
        : !plan.worn
          ? 'Todas as peças estão inteiras. Cada luta desgasta o que estiver equipado; volte depois das batalhas.'
          : `${plan.worn} ${plan.worn === 1 ? 'peça precisa' : 'peças precisam'} de reparo. A Cápsula devolve cada uma a 100% e o preço cresce com o estrago.`
    } else {
      summary.textContent = ''
    }
  }

  function wearGauge(value: number) {
    const gauge = element('i', 'home-wear')
    gauge.dataset.tier = conditionTier(value)
    gauge.style.setProperty('--wear', String(value))
    gauge.setAttribute('aria-hidden', 'true')
    return gauge
  }

  function unknownFrame(className: string) {
    const frameBox = element('span', className)
    frameBox.dataset.unknown = 'true'
    frameBox.innerHTML = '<span class="home-unknown" aria-hidden="true">?</span>'
    return frameBox
  }

  function renderItems() {
    itemButtons.clear()
    const parts = listed()
    itemsBox.replaceChildren(
      ...parts.map((part) => {
        const known = openRoom === 'bench' || found(part)
        const equipped = progress.equipped[part.slot] === part.id
        const card = element('button', 'shop-item')
        card.type = 'button'
        card.setAttribute('role', 'listitem')
        card.dataset.owned = String(known)
        card.dataset.equipped = String(equipped)
        card.dataset.secret = String(isSecret(part))
        card.dataset.known = String(known)
        card.dataset.affordable = 'true'
        card.dataset.selected = String(selected?.id === part.id)
        card.tabIndex = selected?.id === part.id ? 0 : -1
        if (known) {
          const frameBox = element('span', 'shop-item-frame')
          frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', ITEM_ICON))
          card.append(frameBox, element('span', 'shop-item-name', part.name))
        } else {
          card.append(unknownFrame('shop-item-frame'), element('span', 'shop-item-name', 'Peça secreta'))
        }
        const foot = element('span', 'shop-item-price')
        if (openRoom === 'bench') {
          const { level, max } = partLevel(progress.upgrades, part.id)
          foot.innerHTML = equipped ? `${ICONS.check}<span>Nv ${level}/${max}</span>` : `<span>Nv ${level}/${max}</span>`
          card.setAttribute('aria-label', `${part.name}, nível ${level} de ${max}${equipped ? ', equipada' : ''}`)
        } else if (openRoom === 'capsule') {
          const value = wornOf(part)
          const tier = conditionTier(value)
          const cost = repairCost(part, value)
          card.dataset.tier = tier
          card.querySelector('.shop-item-frame')?.append(wearGauge(value))
          foot.innerHTML = `${equipped ? ICONS.check : ''}<span>${value >= CONDITION_MAX ? 'Inteira' : `${value}%`}</span>`
          card.setAttribute(
            'aria-label',
            `${part.name}, ${TIER_LABEL[tier].toLowerCase()}, ${value}%${equipped ? ', equipada' : ''}${cost ? `, reparo por ${formatCredits(cost)} créditos` : ''}`,
          )
        } else {
          const sealed = !known && winsToReveal(part) > 0
          card.dataset.sealed = String(sealed)
          foot.innerHTML = !known ? `${ICONS.lock}<span>${sealed ? 'Lacrada' : 'Pista'}</span>` : equipped ? `${ICONS.check}<span>Equipada</span>` : '<span>Na estante</span>'
          card.setAttribute('aria-label', known ? `${part.name}, ${equipped ? 'equipada' : 'na estante'}` : sealed ? 'Peça secreta com pista lacrada; vença mais na arena' : 'Peça secreta ainda não encontrada; ver pista')
        }
        card.append(foot)
        card.addEventListener('click', () => {
          selectPart(part)
          revealSelection(panel, card, detailBox, { pointer: true, sticky: pinnedDetail() })
        })
        card.addEventListener('focus', () => {
          if (selected?.id !== part.id) selectPart(part, true)
        })
        itemButtons.set(part.id, card)
        return card
      }),
    )
  }

  function bonusList(part: Part) {
    const bonuses = STAT_KEYS.filter((key) => (part.stats[key] ?? 0) !== 0)
    if (!bonuses.length && !(part.speed && part.speed !== 1)) return null
    const list = element('ul', 'shop-bonuses')
    list.setAttribute('aria-label', 'Efeitos da peça')
    for (const key of bonuses) {
      const value = part.stats[key] ?? 0
      const chip = element('li', 'shop-bonus', `<span>${STAT_LABEL[key]}</span><b>${value > 0 ? '+' : ''}${value}</b>`)
      chip.dataset.sign = value > 0 ? 'gain' : 'loss'
      list.append(chip)
    }
    if (part.speed && part.speed !== 1) {
      const chip = element('li', 'shop-bonus', `<span>Passo</span><b>×${part.speed.toFixed(2).replace('.', ',')}</b>`)
      chip.dataset.sign = part.speed > 1 ? 'gain' : 'loss'
      list.append(chip)
    }
    return list
  }

  function equipButton(part: Part, code: string) {
    const equipped = progress.equipped[part.slot] === part.id
    const key = options.touch ? '' : `<kbd>${code}</kbd>`
    const button = element('button', 'ui-btn shop-buy', `<span>${equipped ? 'Remover do robô' : 'Equipar'}</span>${key}`)
    button.type = 'button'
    if (!equipped) button.dataset.variant = 'primary'
    button.addEventListener('click', () => (equipped ? strip(part) : wear(part)))
    return button
  }

  function upgradeRow(part: Part, upgrade: Upgrade, index: number) {
    const level = upgradeLevel(progress.upgrades, part.id, upgrade.id)
    const maxed = level >= upgrade.max
    const cost = maxed ? 0 : upgradeCost(part, level + 1)
    const affordable = progress.credits >= cost
    const row = element('div', 'home-upgrade')
    row.dataset.state = maxed ? 'maxed' : affordable ? 'buy' : 'poor'
    const pips = Array.from({ length: upgrade.max }, (_, step) => `<i data-on="${step < level}"></i>`).join('')
    row.innerHTML = `
      <div class="home-upgrade-head">
        <b class="home-upgrade-name">${upgrade.name}</b>
        <span class="home-pips" aria-label="Nível ${level} de ${upgrade.max}">${pips}</span>
      </div>
      <p class="home-upgrade-text">${upgrade.description}</p>
      <p class="home-upgrade-effect">${describeEffect(upgrade.effect, STAT_LABEL).join(' · ')} por nível</p>
    `
    const foot = element('div', 'home-upgrade-foot')
    if (maxed) {
      foot.append(element('span', 'home-maxed', `${ICONS.check}<span>${MAXED_LINE}</span>`))
    } else {
      const code = index === 0 ? 'E' : 'R'
      const key = options.touch ? '' : `<kbd>${code}</kbd>`
      const button = element('button', 'ui-btn shop-buy home-improve')
      button.type = 'button'
      button.dataset.variant = affordable ? 'primary' : ''
      button.setAttribute('aria-disabled', String(!affordable))
      button.innerHTML = affordable
        ? `<span>Segure para melhorar</span>${creditHtml(options.assetBase, formatCredits(cost))}${key}`
        : `${ICONS.lock}<span>Faltam ${formatCredits(cost - progress.credits)}</span>${creditHtml(options.assetBase, formatCredits(cost))}`
      const hold = holdToConfirm(button, {
        duration: HOLD_MS,
        canStart: () => progress.credits >= upgradeCost(part, upgradeLevel(progress.upgrades, part.id, upgrade.id) + 1),
        onDeny: () => deny(),
        onStart: () => sound.cue('select'),
        onConfirm: () => improve(part, upgrade),
      })
      holds.set(code, hold)
      const hover = (on: boolean) => hoverUpgrade(on ? upgrade : null)
      button.addEventListener('pointerenter', () => hover(true))
      button.addEventListener('pointerleave', () => hover(false))
      button.addEventListener('focus', () => hover(true))
      button.addEventListener('blur', () => hover(false))
      foot.append(button)
    }
    row.append(foot)
    return row
  }

  function clearHolds() {
    for (const hold of holds.values()) hold.destroy()
    holds.clear()
    holdingKey = null
  }

  function previewOnHover(button: HTMLElement, target: Part | 'all') {
    const hover = (on: boolean) => hoverRepair(on ? target : null)
    button.addEventListener('pointerenter', () => hover(true))
    button.addEventListener('pointerleave', () => hover(false))
    button.addEventListener('focus', () => hover(true))
    button.addEventListener('blur', () => hover(false))
  }

  function conditionGauge(part: Part) {
    const value = wornOf(part)
    const tier = conditionTier(value)
    const gauge = element('div', 'home-condition')
    gauge.dataset.tier = tier
    gauge.style.setProperty('--wear', String(value))
    gauge.innerHTML = `
      <div class="home-condition-head">
        <span class="home-condition-tier">${TIER_LABEL[tier]}</span>
        <b class="home-condition-value">${value}<small>%</small></b>
      </div>
      <span class="home-condition-bar" role="meter" aria-label="Condição da peça" aria-valuemin="0" aria-valuemax="${CONDITION_MAX}" aria-valuenow="${value}" aria-valuetext="${value}%, ${TIER_LABEL[tier].toLowerCase()}">
        <i></i><b style="--at:${DAMAGED_AT}"></b><b style="--at:${WORN_AT}"></b>
      </span>
      <p class="home-condition-note">${TIER_NOTE[tier]}</p>
    `
    return gauge
  }

  function repairButton(part: Part) {
    const cost = repairCost(part, wornOf(part))
    const affordable = progress.credits >= cost
    const key = options.touch ? '' : '<kbd>E</kbd>'
    const button = element('button', 'ui-btn shop-buy home-improve home-repair')
    button.type = 'button'
    button.dataset.variant = affordable ? 'primary' : ''
    button.setAttribute('aria-disabled', String(!affordable))
    button.innerHTML = affordable
      ? `<span>Segure para reparar</span>${creditHtml(options.assetBase, formatCredits(cost))}${key}`
      : `${ICONS.lock}<span>Faltam ${formatCredits(cost - progress.credits)}</span>${creditHtml(options.assetBase, formatCredits(cost))}`
    holds.set(
      'E',
      holdToConfirm(button, {
        duration: HOLD_MS,
        canStart: () => progress.credits >= repairCost(part, wornOf(part)),
        onDeny: () => deny(POOR_REPAIR_LINE),
        onStart: () => sound.cue('select'),
        onConfirm: () => mend(part),
      }),
    )
    previewOnHover(button, part)
    return button
  }

  function renderRepairAll() {
    const plan = openRoom === 'capsule' ? repairPlan() : null
    if (!plan || plan.worn < 2) {
      repairAllBox.dataset.visible = 'false'
      repairAllBox.replaceChildren()
      return
    }
    const affordable = plan.parts.length > 0
    const complete = plan.parts.length === plan.worn
    repairAllBox.dataset.visible = 'true'
    repairAllBox.dataset.state = complete ? 'full' : affordable ? 'partial' : 'poor'
    const text = element(
      'div',
      'home-repair-all-text',
      `<span class="ui-kicker">${complete ? 'Reparo completo' : affordable ? 'Reparo parcial' : 'Reparo completo'}</span><b>${
        complete ? `${plan.worn} peças voltam a 100%` : affordable ? `Dá para reparar ${plan.parts.length} de ${plan.worn} peças` : `${plan.worn} peças desgastadas`
      }</b>`,
    )
    const key = options.touch ? '' : '<kbd>R</kbd>'
    const button = element('button', 'ui-btn shop-buy home-improve')
    button.type = 'button'
    button.dataset.variant = affordable ? 'primary' : ''
    button.setAttribute('aria-disabled', String(!affordable))
    button.innerHTML = affordable
      ? `<span>${complete ? 'Segure para reparar tudo' : `Segure para reparar ${plan.parts.length}`}</span>${creditHtml(options.assetBase, formatCredits(plan.cost))}${key}`
      : `${ICONS.lock}<span>Faltam ${formatCredits(plan.total - progress.credits)}</span>${creditHtml(options.assetBase, formatCredits(plan.total))}`
    holds.set(
      'R',
      holdToConfirm(button, {
        duration: HOLD_MS,
        canStart: () => repairPlan().parts.length > 0,
        onDeny: () => deny(POOR_REPAIR_LINE),
        onStart: () => sound.cue('select'),
        onConfirm: () => mendAll(),
      }),
    )
    previewOnHover(button, 'all')
    repairAllBox.replaceChildren(text, button)
  }

  function renderDetail() {
    clearHolds()
    renderRepairAll()
    const part = selected
    if (!part || !openRoom) {
      detailBox.dataset.visible = 'false'
      detailBox.replaceChildren()
      return
    }
    const known = openRoom === 'bench' || found(part)
    const equipped = progress.equipped[part.slot] === part.id
    detailBox.dataset.visible = 'true'
    detailBox.dataset.state = known ? (equipped ? 'equipped' : 'owned') : 'hidden'
    detailBox.replaceChildren()
    const head = element('div', 'shop-detail-head')
    const titles = element('div', 'shop-detail-titles')
    if (!known) {
      const sealed = winsToReveal(part) > 0
      head.append(unknownFrame('shop-detail-frame'))
      titles.append(element('span', 'ui-kicker', sealed ? 'Pista lacrada' : 'Pista'), element('h4', 'shop-detail-name', 'Peça secreta'))
      head.append(titles)
      const clue = element('p', 'shop-detail-text home-clue', sealed ? sealedClue(part) : (part.secret?.hint ?? ''))
      clue.dataset.sealed = String(sealed)
      detailBox.append(head, clue)
      return
    }
    const frameBox = element('span', 'shop-detail-frame')
    frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', DETAIL_ICON))
    const { level, max } = partLevel(progress.upgrades, part.id)
    titles.append(element('span', 'ui-kicker', `${SLOT_SINGULAR[part.slot]}${isSecret(part) ? ' · secreta' : ''}`), element('h4', 'shop-detail-name', part.name))
    const tag =
      openRoom === 'capsule'
        ? equipped
          ? 'Equipada · desgasta a cada luta'
          : 'No depósito · parada, não desgasta'
        : `${equipped ? 'Equipada' : 'No depósito'} · nível ${level} de ${max}`
    titles.append(element('span', 'shop-detail-tag', tag))
    head.append(frameBox, titles)
    detailBox.append(head)
    if (openRoom === 'shelf') {
      detailBox.append(element('p', 'shop-detail-text', part.description))
      const bonuses = bonusList(part)
      if (bonuses) detailBox.append(bonuses)
      detailBox.append(element('p', 'home-origin', originLine(part)))
      const actions = element('div', 'shop-actions')
      actions.append(equipButton(part, 'E'))
      detailBox.append(actions)
      return
    }
    if (openRoom === 'capsule') {
      detailBox.append(conditionGauge(part))
      const actions = element('div', 'shop-actions')
      actions.append(wornOf(part) < CONDITION_MAX ? repairButton(part) : element('span', 'home-maxed', `${ICONS.check}<span>Pronta para a arena</span>`))
      detailBox.append(actions)
      return
    }
    const list = element('div', 'home-upgrades')
    upgradesFor(part.id).forEach((upgrade, index) => list.append(upgradeRow(part, upgrade, index)))
    detailBox.append(list)
    const actions = element('div', 'shop-actions')
    actions.append(equipButton(part, 'Q'))
    detailBox.append(actions)
  }

  function renderHints() {
    if (options.touch) {
      hints.replaceChildren()
      return
    }
    const hint = (keys: string[], label: string, range = false) =>
      `<span class="shop-hint">${keys.map((k) => `<kbd>${k}</kbd>`).join(range ? '<i>–</i>' : '')}<span>${label}</span></span>`
    if (!openRoom) {
      hints.innerHTML = `${hint(['1'], 'Bancada')}${hint(['2'], 'Estante')}${hint(['3'], 'Cápsula')}${hint(['Esc'], 'Sair de casa')}`
      return
    }
    const part = selected
    let action = ''
    if (part && openRoom === 'bench') {
      const open = upgradesFor(part.id).filter((upgrade) => upgradeLevel(progress.upgrades, part.id, upgrade.id) < upgrade.max)
      action = `${open.length ? hint(['E', 'R'], 'Segure para melhorar') : ''}${hint(['Q'], progress.equipped[part.slot] === part.id ? 'Remover' : 'Equipar')}`
    } else if (openRoom === 'capsule') {
      action = `${part && wornOf(part) < CONDITION_MAX ? hint(['E'], 'Segure para reparar') : ''}${repairAllBox.dataset.visible === 'true' ? hint(['R'], 'Reparar tudo') : ''}`
    } else if (part && found(part)) {
      action = hint(['E'], progress.equipped[part.slot] === part.id ? 'Remover' : 'Equipar')
    }
    hints.innerHTML = `${hint(['↑', '↓', '←', '→'], 'Navegar')}${action}${hint(['1', '3'], 'Trocar canto', true)}${hint(['Esc'], 'Voltar')}`
  }

  function refresh() {
    renderCredits()
    renderRooms()
    renderStats()
    renderSlots()
    renderSummary()
    renderItems()
    renderDetail()
    renderHints()
    preview.show(progress.equipped)
  }

  function placePreview() {
    const target = root.dataset.layout === 'narrow' && openRoom ? panelRobot : benchRobot
    if (preview.canvas.parentElement !== target) target.append(preview.canvas)
  }

  function showToast(part: Part, kicker: string, name: string) {
    toastIcon.replaceChildren(cellCanvas(composer, part.id, part.name, 'shop-cell', ITEM_ICON))
    toastKicker.textContent = kicker
    toastName.textContent = name
    toast.dataset.visible = 'false'
    void toast.offsetWidth
    toast.dataset.visible = 'true'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.dataset.visible = 'false'
    }, TOAST_MS)
  }

  function openCorner(room: Room) {
    if (openRoom === room) return
    openRoom = room
    hoveredUpgrade = null
    hoveredRepair = null
    const parts = listed()
    selected = room === 'bench' ? (parts.find((part) => part.id === progress.equipped[part.slot]) ?? parts[0] ?? null) : (parts.find(found) ?? parts[0] ?? null)
    root.dataset.shelf = room
    panelKicker.textContent = SPOTS[room].sub
    panelTitle.textContent = SPOTS[room].label
    panel.dataset.open = 'true'
    sound.cue('select')
    refresh()
    placePreview()
    frame()
    panel.scrollTop = 0
    const card = selected ? itemButtons.get(selected.id) : undefined
    card?.focus({ preventScroll: true })
    if (card) revealSelection(panel, card, detailBox, { pointer: true, sticky: pinnedDetail() })
  }

  function closeCorner() {
    if (!openRoom) return
    const room = openRoom
    openRoom = null
    selected = null
    hoveredUpgrade = null
    hoveredRepair = null
    root.dataset.shelf = 'none'
    panel.dataset.open = 'false'
    refresh()
    placePreview()
    frame()
    ;(root.dataset.layout === 'narrow' ? dockButtons.get(room) : pins.get(room))?.focus({ preventScroll: true })
  }

  function selectPart(part: Part, quiet = false) {
    selected = part
    hoveredUpgrade = null
    hoveredRepair = null
    if (!quiet) sound.cue('select')
    for (const [id, button] of itemButtons) {
      button.dataset.selected = String(id === part.id)
      button.tabIndex = id === part.id ? 0 : -1
    }
    renderStats()
    renderDetail()
    renderHints()
  }

  function hoverUpgrade(upgrade: Upgrade | null) {
    if (hoveredUpgrade === upgrade) return
    hoveredUpgrade = upgrade
    renderStats()
  }

  function hoverRepair(target: Part | 'all' | null) {
    if (hoveredRepair === target) return
    hoveredRepair = target
    renderStats()
  }

  function step(dx: number, dy: number) {
    const parts = listed()
    if (!parts.length) return
    const index = Math.max(0, parts.findIndex((part) => part.id === selected?.id))
    const columns = root.dataset.layout === 'narrow' ? Math.min(COLUMNS, parts.length) : COLUMNS
    let next = index + dx + dy * columns
    if (next < 0 || next >= parts.length) next = (next + parts.length) % parts.length
    const part = parts[next]
    if (!part) return
    selectPart(part)
    const card = itemButtons.get(part.id)
    card?.focus({ preventScroll: true })
    if (card) revealSelection(panel, card, detailBox, { sticky: pinnedDetail() })
  }

  function deny(line = POOR_LINE) {
    sound.cue('deny')
    summary.textContent = line
    creditsBox.dataset.shake = 'false'
    void creditsBox.offsetWidth
    creditsBox.dataset.shake = 'true'
  }

  function flashRobot() {
    benchRobot.dataset.flash = 'false'
    void benchRobot.offsetWidth
    benchRobot.dataset.flash = 'true'
  }

  function improve(part: Part, upgrade: Upgrade) {
    const result = buyUpgrade(progress, part.id, upgrade.id)
    if (result === 'poor') {
      deny()
      return
    }
    if (result !== 'bought') return
    sound.cue('buy')
    hoveredUpgrade = null
    options.onChange(progress.equipped)
    const level = upgradeLevel(progress.upgrades, part.id, upgrade.id)
    showToast(part, 'Melhoria instalada', `${upgrade.name} · nível ${level}`)
    if (progress.equipped[part.slot] === part.id) flashRobot()
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function wear(part: Part) {
    if (!equipPart(progress, part.slot, part.id)) return
    sound.cue('equip')
    options.onChange(progress.equipped)
    showToast(part, 'Peça equipada', part.name)
    flashRobot()
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function strip(part: Part) {
    equipPart(progress, part.slot, null)
    sound.cue('equip')
    options.onChange(progress.equipped)
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function mend(part: Part) {
    const result = repairPart(progress, part.id)
    if (result === 'poor') {
      deny(POOR_REPAIR_LINE)
      return
    }
    if (result !== 'repaired') return
    sound.cue('buy')
    hoveredRepair = null
    options.onChange(progress.equipped)
    showToast(part, 'Peça reparada', `${part.name} · 100%`)
    if (equippedNow(part)) flashRobot()
    refresh()
    keepInView(part)
  }

  function keepInView(part: Part | null) {
    const card = part ? itemButtons.get(part.id) : undefined
    if (!card) return
    card.focus({ preventScroll: true })
    revealSelection(panel, card, detailBox, { sticky: pinnedDetail() })
  }

  function mendAll() {
    const worst = capsuleQueue()[0]
    const { repaired, spent } = repairAll(progress, wornParts().map((part) => part.id))
    if (!repaired || !worst) {
      deny(POOR_REPAIR_LINE)
      return
    }
    sound.cue('buy')
    hoveredRepair = null
    options.onChange(progress.equipped)
    showToast(worst, repaired > 1 ? 'Reparo completo' : 'Peça reparada', `${repaired} ${repaired === 1 ? 'peça' : 'peças'} a 100% · ${formatCredits(spent)} créditos`)
    flashRobot()
    refresh()
    keepInView(selected)
  }

  function keyAction(code: string) {
    const part = selected
    if (!part || !openRoom) return false
    const letter = code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space' ? 'E' : code === 'KeyR' ? 'R' : code === 'KeyQ' ? 'Q' : null
    if (!letter) return false
    if (openRoom === 'shelf') {
      if (letter !== 'E' || !found(part)) return letter === 'E'
      if (progress.equipped[part.slot] === part.id) strip(part)
      else wear(part)
      return true
    }
    if (openRoom === 'capsule' && letter === 'Q') return false
    if (letter === 'Q') {
      if (progress.equipped[part.slot] === part.id) strip(part)
      else wear(part)
      return true
    }
    const hold = holds.get(letter)
    if (!hold) return true
    holdingKey = code
    hold.start()
    return true
  }

  function requestExit() {
    for (const listener of exitListeners) listener()
  }

  for (const [index, room] of ROOMS.entries()) {
    const spot = SPOTS[room]
    const zone = element('div', 'shop-zone')
    zone.dataset.slot = room
    zone.style.left = `${spot.area.left}%`
    zone.style.top = `${spot.area.top}%`
    zone.style.width = `${spot.area.width}%`
    zone.style.height = `${spot.area.height}%`
    zone.addEventListener('click', () => openCorner(room))
    zonesBox.append(zone)
    zones.set(room, zone)

    const pin = element('button', 'shop-pin')
    pin.type = 'button'
    pin.dataset.slot = room
    pin.dataset.side = 'left'
    pin.style.left = `${spot.pin[0]}%`
    pin.style.top = `${spot.pin[1]}%`
    pin.setAttribute('aria-label', `${spot.label}: ${spot.sub.toLowerCase()}`)
    pin.innerHTML = `<span class="shop-pin-mark" aria-hidden="true"><i></i></span><span class="shop-pin-label"><b>${spot.label}</b><small></small></span>${options.touch ? '' : `<kbd>${index + 1}</kbd>`}`
    pin.addEventListener('click', () => openCorner(room))
    pinsBox.append(pin)
    pins.set(room, pin)

    const hot = (on: boolean) => {
      zone.dataset.hot = String(on)
      pin.dataset.hot = String(on)
    }
    for (const node of [zone, pin]) {
      node.addEventListener('pointerenter', () => hot(true))
      node.addEventListener('pointerleave', () => hot(false))
    }
    pin.addEventListener('focus', () => hot(true))
    pin.addEventListener('blur', () => hot(false))

    const tab = element('button', 'shop-tab')
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.dataset.slot = room
    tab.innerHTML = `<img src="${emblemPath(options.assetBase, spot.emblem)}" alt="" width="${TAB_ICON}" height="${TAB_ICON}" decoding="async">`
    tab.append(element('span', 'shop-tab-label', spot.label))
    if (!options.touch) tab.append(element('kbd', '', String(index + 1)))
    tab.addEventListener('click', () => openCorner(room))
    tabsBox.append(tab)
    tabs.set(room, tab)

    const dockButton = element('button', 'shop-dock-button')
    dockButton.type = 'button'
    dockButton.dataset.slot = room
    dockButton.innerHTML = `<img src="${emblemPath(options.assetBase, spot.emblem)}" alt="" width="${TAB_ICON}" height="${TAB_ICON}" decoding="async">`
    dockButton.append(element('span', '', spot.label))
    dockButton.addEventListener('click', () => (openRoom === room ? closeCorner() : openCorner(room)))
    dock.append(dockButton)
    dockButtons.set(room, dockButton)
  }

  exitButton.addEventListener('click', requestExit)
  backButton.addEventListener('click', closeCorner)
  root.addEventListener('pointerdown', (event) => event.stopPropagation())

  return {
    get visible() {
      return visible
    },
    show() {
      visible = true
      openRoom = null
      selected = null
      hoveredUpgrade = null
      hoveredRepair = null
      root.dataset.shelf = 'none'
      panel.dataset.open = 'false'
      root.dataset.visible = 'true'
      root.setAttribute('aria-hidden', 'false')
      refresh()
      frame(false)
      placePreview()
      exitButton.focus({ preventScroll: true })
    },
    hide() {
      visible = false
      for (const hold of holds.values()) hold.cancel()
      holdingKey = null
      root.dataset.visible = 'false'
      root.setAttribute('aria-hidden', 'true')
    },
    onExit(listener) {
      exitListeners.push(listener)
    },
    handleKey(event) {
      if (!visible) return false
      const code = event.code
      if (event.repeat) return code === 'KeyE' || code === 'KeyR' || code === 'Enter' || code === 'Space' || code.startsWith('Arrow')
      if (code === 'Escape') {
        if (openRoom) closeCorner()
        else requestExit()
        return true
      }
      const digit = /^(?:Digit|Numpad)([1-3])$/.exec(code)
      if (digit) {
        const room = ROOMS[Number(digit[1]) - 1]
        if (openRoom === room) closeCorner()
        else openCorner(room)
        return true
      }
      if (!openRoom) {
        if (code === 'KeyE') {
          requestExit()
          return true
        }
        return false
      }
      if (keyAction(code)) return true
      if (code === 'ArrowLeft' || code === 'KeyA') step(-1, 0)
      else if (code === 'ArrowRight' || code === 'KeyD') step(1, 0)
      else if (code === 'ArrowUp' || code === 'KeyW') step(0, -1)
      else if (code === 'ArrowDown' || code === 'KeyS') step(0, 1)
      else return false
      return true
    },
    handleKeyUp(event) {
      if (holdingKey && event.code === holdingKey) {
        holdingKey = null
        for (const hold of holds.values()) hold.cancel()
      }
    },
    tick(dt) {
      if (!visible) return
      preview.tick(dt)
    },
    destroy() {
      clearHolds()
      if (toastTimer) clearTimeout(toastTimer)
      observer.disconnect()
      root.remove()
    },
  }
}
