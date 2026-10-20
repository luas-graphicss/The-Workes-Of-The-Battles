import { SHOP } from '../../world-data'
import type { Sound } from '../audio'
import { currentWorld } from '../missions/progress'
import {
  BODY_NAME,
  computeStats,
  formatCredits,
  isSecret,
  partById,
  partTier,
  partUnlocked,
  SECRET_PARTS,
  shopPartsInSlot,
  SLOT_LABEL,
  SLOT_SINGULAR,
  SLOTS,
  speedMultiplier,
  STAT_KEYS,
  STAT_LABEL,
  STAT_MAX,
  type Loadout,
  type Part,
  type Slot,
} from '../robot/parts'
import { buyPart, equipPart, type Progress } from '../robot/progress'
import type { RobotComposer } from '../robot/sprites'
import { cellCanvas } from '../ui/cell'
import { creditHtml, element, emblemPath, holdToConfirm, ICONS, revealSelection } from '../ui/kit'
import { createHandBuilder } from './hand'
import { Turntable } from './turntable'

export type ShopOptions = {
  composer: RobotComposer
  progress: Progress
  sound: Sound
  assetBase: string
  touch: boolean
  reducedMotion: boolean
  textDelay(): number
  onLoadoutChange(loadout: Loadout): void
}

export type Shop = {
  readonly visible: boolean
  show(): void
  hide(): void
  onExit(listener: () => void): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  tick(dt: number): void
  destroy(): void
}

type Shelf = {
  area: { left: number; top: number; width: number; height: number }
  pin: [number, number]
  focus: [number, number]
  side: 'left' | 'right'
}

const SHELVES: Record<Slot, Shelf> = {
  helmet: { area: { left: 0.5, top: 20, width: 22, height: 47 }, pin: [11.5, 35], focus: [0.15, 0.42], side: 'left' },
  weapon: { area: { left: 77.5, top: 23, width: 22, height: 32 }, pin: [88.5, 31], focus: [0.86, 0.4], side: 'right' },
  mobility: { area: { left: 0, top: 66, width: 35, height: 33 }, pin: [15, 72], focus: [0.18, 0.78], side: 'left' },
  module: { area: { left: 62, top: 60, width: 38, height: 39 }, pin: [84, 70], focus: [0.8, 0.77], side: 'right' },
}

const HOME: [number, number] = [0.5, 0.5]
const ZOOM = { wide: 1.34, narrow: 1.14 }

const KEEPER: Loadout = { helmet: 'helmet-cap', weapon: 'weapon-claw', mobility: 'move-tracks', module: 'module-antenna' }

const GREETINGS = [
  'Bem-vindo à Oficina do Cristal! Escolha uma prateleira e vamos conversar.',
  'Ora, um B-01 novinho em folha! Que tal deixá-lo mais forte?',
  'Peças de primeira, preços de amigo. Dê uma olhada com calma.',
]
const SHELF_LINES: Record<Slot, string> = {
  helmet: 'Capacetes protegem o núcleo e, cá entre nós, dão muito estilo.',
  weapon: 'Armas para as batalhas que virão. Escolha com carinho.',
  mobility: 'Rodas, molas, esteiras... cada uma muda o seu passo pela cidade.',
  module: 'Módulos para as costas: energia, escudo e até um jetpack.',
}
const BOUGHT_LINES = ['Negócio fechado! Já instalei para você.', 'Boa escolha. Aperto os parafusos e pronto!', 'Vendido! Cuide bem dessa peça.']
const POOR_LINES = ['Faltam créditos, amigo. As batalhas vão render mais.', 'Ainda não dá. Quem sabe depois da próxima aventura?']
const EQUIP_LINE = 'Trocado! Assim que sair, sinta a diferença.'
const UNEQUIP_LINE = 'Guardei a peça no seu depósito. Volte a equipar quando quiser.'
const AFFORD_LINE = 'Essa cabe no seu bolso. Quer que eu instale?'
const EXPENSIVE_LINE = 'Essa ainda está salgada para você. Volte com mais créditos.'
const OWNED_LINE = 'Essa já é sua. Posso trocar agora mesmo.'
const LOCKED_LINE = 'Essa ainda está encaixotada. Chega à prateleira quando você vencer o campeão do mundo anterior.'

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

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function createShop(surface: HTMLElement, options: ShopOptions): Shop {
  const { composer, progress, sound } = options
  const interior = `${options.assetBase}assets/shop/interior.png`
  const root = element('section', 'shop')
  root.dataset.visible = 'false'
  root.dataset.shelf = 'none'
  root.dataset.layout = 'wide'
  root.dataset.touch = String(options.touch)
  root.setAttribute('aria-label', SHOP.name)
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="shop-stage">
      <div class="shop-painting">
        <img class="shop-art" src="${interior}" alt="" draggable="false" decoding="async">
        <div class="shop-zones" aria-hidden="true"></div>
        <div class="shop-keeper">
          <div class="shop-bubble" role="status" aria-live="polite"><span class="shop-bubble-text"><span class="shop-bubble-typed"></span><span class="shop-bubble-rest" aria-hidden="true"></span></span></div>
        </div>
        <div class="shop-pins"></div>
      </div>
      <div class="shop-shade" aria-hidden="true"></div>
    </div>

    <header class="shop-top">
      <div class="shop-title">
        <img class="shop-title-emblem" src="${emblemPath(options.assetBase, 'workshop')}" alt="" width="48" height="48" decoding="async">
        <div>
          <span class="ui-kicker">Praça do Cristal</span>
          <h2 class="shop-name">${SHOP.name}</h2>
        </div>
      </div>
      <div class="shop-top-right">
        <button type="button" class="shop-deck ui-btn" aria-label="Abrir o baralho e montar a mão de combate">
          <span class="shop-deck-thumbs" aria-hidden="true"></span>
          <span class="shop-deck-label"><small>Baralho</small><b>Mão de combate</b></span>
          ${options.touch ? '' : '<kbd>B</kbd>'}
        </button>
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

    <aside class="shop-panel ui-panel" data-open="false" aria-label="Prateleira">
      <header class="shop-panel-head">
        <div class="shop-panel-robot"></div>
        <div class="shop-panel-titles">
          <span class="ui-kicker" data-mark>Prateleira</span>
          <h3 class="shop-panel-title"></h3>
        </div>
        <button type="button" class="shop-back ui-btn" aria-label="Fechar prateleira">${ICONS.close}${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
      </header>
      <nav class="shop-tabs" role="tablist" aria-label="Prateleiras"></nav>
      <div class="shop-items" role="list"></div>
      <div class="shop-detail" data-visible="false"></div>
    </aside>

    <div class="shop-bark"></div>
    <nav class="shop-dock" aria-label="Prateleiras"></nav>
    <footer class="shop-hints" aria-hidden="true"></footer>
    <div class="shop-toast" role="status" aria-live="assertive" data-visible="false">
      <span class="shop-toast-icon"></span>
      <span class="shop-toast-text"><span class="ui-kicker">Peça instalada</span><strong class="shop-toast-name"></strong></span>
    </div>
  `
  surface.append(root)

  const stage = root.querySelector('.shop-stage') as HTMLElement
  const painting = root.querySelector('.shop-painting') as HTMLElement
  const zonesBox = root.querySelector('.shop-zones') as HTMLElement
  const pinsBox = root.querySelector('.shop-pins') as HTMLElement
  const keeperBox = root.querySelector('.shop-keeper') as HTMLElement
  const bubble = root.querySelector('.shop-bubble') as HTMLElement
  const bubbleTyped = root.querySelector('.shop-bubble-typed') as HTMLElement
  const bubbleRest = root.querySelector('.shop-bubble-rest') as HTMLElement
  const topBar = root.querySelector('.shop-top') as HTMLElement
  const titleBox = root.querySelector('.shop-title') as HTMLElement
  const topRightBox = root.querySelector('.shop-top-right') as HTMLElement
  const creditsBox = root.querySelector('.shop-credits') as HTMLElement
  const creditsValue = root.querySelector('.shop-credits-value') as HTMLElement
  const exitButton = root.querySelector('.shop-exit') as HTMLButtonElement
  const deckButton = root.querySelector('.shop-deck') as HTMLButtonElement
  const deckThumbs = root.querySelector('.shop-deck-thumbs') as HTMLElement
  const bench = root.querySelector('.shop-bench') as HTMLElement
  const benchRobot = root.querySelector('.shop-bench-robot') as HTMLElement
  const slotsList = root.querySelector('.shop-slots') as HTMLElement
  const speedNote = root.querySelector('.shop-speed') as HTMLElement
  const statsList = root.querySelector('.shop-stats') as HTMLElement
  const panel = root.querySelector('.shop-panel') as HTMLElement
  const panelRobot = root.querySelector('.shop-panel-robot') as HTMLElement
  const panelTitle = root.querySelector('.shop-panel-title') as HTMLElement
  const backButton = root.querySelector('.shop-back') as HTMLButtonElement
  const tabsBox = root.querySelector('.shop-tabs') as HTMLElement
  const itemsBox = root.querySelector('.shop-items') as HTMLElement
  const detailBox = root.querySelector('.shop-detail') as HTMLElement
  const bark = root.querySelector('.shop-bark') as HTMLElement
  const dock = root.querySelector('.shop-dock') as HTMLElement
  const hints = root.querySelector('.shop-hints') as HTMLElement
  const toast = root.querySelector('.shop-toast') as HTMLElement
  const toastIcon = root.querySelector('.shop-toast-icon') as HTMLElement
  const toastName = root.querySelector('.shop-toast-name') as HTMLElement

  const preview = new Turntable(composer, 'Seu robô girando, com as peças equipadas')
  benchRobot.append(preview.canvas)
  const keeper = new Turntable(composer, 'A mecânica da oficina, um robô de boné')
  keeper.canvas.classList.add('shop-keeper-sprite')
  keeper.setWalking(false)
  keeper.show(KEEPER)
  keeperBox.prepend(keeper.canvas)

  const handBuilder = createHandBuilder(root, {
    assetBase: options.assetBase,
    touch: options.touch,
    progress,
    sound,
    onChange: () => paintDeck(),
    onClose: () => closeDeck(),
  })

  function paintDeck() {
    handBuilder.paintThumbs(deckThumbs)
  }

  function openDeck() {
    if (handBuilder.open) return
    holdControl?.cancel()
    root.dataset.deck = 'open'
    handBuilder.show()
  }

  function closeDeck() {
    if (!handBuilder.open) return
    handBuilder.hide()
    root.dataset.deck = 'closed'
    sound.cue('select')
    deckButton.focus({ preventScroll: true })
  }

  let visible = false
  let rest = { x: 0, y: 0 }
  let openSlot: Slot | null = null
  let selected: Part | null = null
  let hovered: Part | null = null
  let typeTimer: ReturnType<typeof setInterval> | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let keeperTurn = 0
  let holdControl: ReturnType<typeof holdToConfirm> | null = null
  let holdingKey: string | null = null
  const exitListeners: (() => void)[] = []
  const pins = new Map<Slot, HTMLButtonElement>()
  const zones = new Map<Slot, HTMLElement>()
  const tabs = new Map<Slot, HTMLButtonElement>()
  const dockButtons = new Map<Slot, HTMLButtonElement>()
  const itemButtons = new Map<string, HTMLButtonElement>()

  function narrow() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    return width < 900 || width / Math.max(1, height) < 1.12
  }

  function freeArea(width: number, height: number) {
    let left = 0
    let right = width
    let top = topBar.offsetTop + topBar.offsetHeight
    let bottom = height
    if (root.dataset.layout === 'narrow') {
      if (openSlot) bottom = panel.offsetTop
      else bottom = Math.min(bench.offsetTop, dock.offsetTop || height)
    } else {
      bottom = bench.offsetTop
      if (openSlot) {
        if (root.dataset.side === 'right') right = panel.offsetLeft
        else left = panel.offsetLeft + panel.offsetWidth
      }
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
    const zoom = openSlot ? ZOOM[root.dataset.layout as 'wide' | 'narrow'] : 1
    const [fx, fy] = openSlot ? SHELVES[openSlot].focus : HOME
    const target = freeArea(width, height)
    const size = base * zoom
    const x = Math.min(0, Math.max(width - size, target.x - fx * size))
    const y = Math.min(0, Math.max(height - size, target.y - fy * size))
    painting.dataset.animate = String(animate)
    painting.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${zoom})`
    if (!openSlot) rest = { x, y }
    placeBubble(width, height, target.x)
    fitPins()
  }

  function placeBubble(width: number, height: number, centre: number) {
    const subtitle = openSlot !== null
    const parent = subtitle ? bark : keeperBox
    if (bubble.parentElement !== parent) parent.append(bubble)
    bubble.dataset.speaker = subtitle ? 'Mecânica' : ''
    if (!subtitle) return
    const floor = root.dataset.layout === 'narrow' ? panel.offsetTop : bench.offsetTop
    bark.style.left = `${Math.round(centre)}px`
    bark.style.bottom = `${Math.round(height - floor + 18)}px`
    bark.style.maxWidth = `${Math.round(Math.min(560, width - 32))}px`
  }

  function fitPins() {
    if (!visible || openSlot) return
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (!width || !height) return
    const art = painting.getBoundingClientRect()
    const scale = art.width / Math.max(1, painting.offsetWidth)
    const settled = (box: DOMRect): Box => ({
      left: rest.x + (box.left - art.left) / scale,
      top: rest.y + (box.top - art.top) / scale,
      right: rest.x + (box.right - art.left) / scale,
      bottom: rest.y + (box.bottom - art.top) / scale,
    })
    const obstacles: Box[] = [titleBox, topRightBox, bench, hints, dock]
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => {
        const { left, top, right, bottom } = node.getBoundingClientRect()
        return { left, top, right, bottom }
      })
    if (bubble.dataset.visible === 'true' && bubble.parentElement === keeperBox) obstacles.push(settled(bubble.getBoundingClientRect()))

    for (const [slot, pin] of pins) {
      const zone = zones.get(slot) as HTMLElement
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
      const left = pin.dataset.side === 'right' ? anchorX + em - pin.offsetWidth : anchorX - em
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
    if (event.target === bench || event.target === painting || event.target === bubble) fitPins()
  }
  root.addEventListener('transitionend', settle)
  root.addEventListener('animationend', settle)

  const observer = new ResizeObserver(() => {
    if (visible) frame(false)
  })
  observer.observe(root)

  function say(text: string) {
    if (typeTimer) clearInterval(typeTimer)
    typeTimer = null
    bubble.dataset.visible = 'true'
    const delay = options.reducedMotion ? 0 : options.textDelay()
    bubbleTyped.textContent = delay <= 0 ? text : ''
    bubbleRest.textContent = delay <= 0 ? '' : text
    fitPins()
    if (delay <= 0) return
    let shown = 0
    typeTimer = setInterval(() => {
      shown++
      bubbleTyped.textContent = text.slice(0, shown)
      bubbleRest.textContent = text.slice(shown)
      if (shown >= text.length && typeTimer) {
        clearInterval(typeTimer)
        typeTimer = null
      }
    }, delay)
  }

  function showToast(part: Part, kicker: string) {
    toastIcon.replaceChildren(cellCanvas(composer, part.id, part.name, 'shop-cell', ITEM_ICON))
    ;(toast.querySelector('.ui-kicker') as HTMLElement).textContent = kicker
    toastName.textContent = part.name
    toast.dataset.visible = 'false'
    void toast.offsetWidth
    toast.dataset.visible = 'true'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.dataset.visible = 'false'
    }, TOAST_MS)
  }

  function previewLoadout(): Loadout {
    const part = hovered ?? selected
    if (!part || progress.equipped[part.slot] === part.id) return progress.equipped
    return { ...progress.equipped, [part.slot]: part.id }
  }

  function applyLoadout() {
    options.onLoadoutChange(progress.equipped)
  }

  function renderCredits() {
    creditsValue.textContent = formatCredits(progress.credits)
  }

  function shelfParts(slot: Slot) {
    const world = currentWorld(progress)
    const stock = shopPartsInSlot(slot).sort((a, b) => Number(!partUnlocked(a, world)) - Number(!partUnlocked(b, world)) || partTier(a) - partTier(b) || a.price - b.price)
    return [...stock, ...SECRET_PARTS.filter((part) => part.slot === slot && progress.owned.includes(part.id))]
  }

  function isLocked(part: Part) {
    return !progress.owned.includes(part.id) && !partUnlocked(part, currentWorld(progress))
  }

  function shelfCount(slot: Slot) {
    const parts = shelfParts(slot).filter((part) => !isLocked(part))
    const owned = parts.filter((part) => progress.owned.includes(part.id)).length
    return owned > 0 ? `${parts.length} peças · ${owned} sua${owned > 1 ? 's' : ''}` : `${parts.length} peças`
  }

  function renderShelves() {
    for (const slot of SLOTS) {
      const active = String(openSlot === slot)
      const pin = pins.get(slot)
      if (pin) {
        ;(pin.querySelector('small') as HTMLElement).textContent = shelfCount(slot)
        pin.dataset.active = active
      }
      zones.get(slot)?.setAttribute('data-active', active)
      const tab = tabs.get(slot)
      if (tab) {
        tab.setAttribute('aria-selected', active)
        tab.tabIndex = openSlot === slot ? 0 : -1
      }
      dockButtons.get(slot)?.setAttribute('aria-pressed', active)
    }
  }

  function renderStats() {
    const current = computeStats(progress.equipped, progress.upgrades, progress.condition)
    const next = computeStats(previewLoadout(), progress.upgrades, progress.condition)
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
    const factor = speedMultiplier(previewLoadout(), progress.upgrades, progress.condition)
    speedNote.textContent = factor === 1 ? 'Passo padrão do B-01' : `Passo ${factor > 1 ? 'mais rápido' : 'mais lento'} · ×${factor.toFixed(2).replace('.', ',')}`
    speedNote.dataset.delta = factor > 1 ? 'gain' : factor < 1 ? 'loss' : 'same'
  }

  function renderSlots() {
    const loadout = previewLoadout()
    slotsList.replaceChildren(
      ...SLOTS.map((slot) => {
        const item = element('li', 'shop-slot')
        const part = partById(loadout[slot])
        item.dataset.filled = String(part !== null)
        item.dataset.preview = String(part !== null && progress.equipped[slot] !== part.id)
        item.dataset.slot = slot
        item.title = `${SLOT_SINGULAR[slot]}: ${part ? part.name : 'vazio'}`
        const frameBox = element('span', 'shop-slot-frame')
        if (part) frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', SLOT_ICON))
        item.append(frameBox, element('span', 'shop-slot-label', SLOT_SINGULAR[slot]))
        return item
      }),
    )
  }

  function renderItems() {
    itemButtons.clear()
    if (!openSlot) {
      itemsBox.replaceChildren()
      return
    }
    const parts = shelfParts(openSlot)
    itemsBox.replaceChildren(
      ...parts.map((part) => {
        const owned = progress.owned.includes(part.id)
        const equipped = progress.equipped[part.slot] === part.id
        const locked = isLocked(part)
        const affordable = progress.credits >= part.price && !locked
        const secret = isSecret(part)
        const card = element('button', 'shop-item')
        card.type = 'button'
        card.setAttribute('role', 'listitem')
        card.dataset.owned = String(owned)
        card.dataset.equipped = String(equipped)
        card.dataset.secret = String(secret)
        card.dataset.locked = String(locked)
        card.dataset.affordable = String(owned || affordable)
        card.dataset.selected = String(selected?.id === part.id)
        card.tabIndex = selected?.id === part.id ? 0 : -1
        const frameBox = element('span', 'shop-item-frame')
        frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', ITEM_ICON))
        card.append(frameBox, element('span', 'shop-item-name', part.name))
        const price = element('span', 'shop-item-price')
        price.innerHTML = equipped
          ? `${ICONS.check}<span>Equipada</span>`
          : owned
            ? `<span>${secret ? 'Secreta' : 'Sua'}</span>`
            : locked
              ? `${ICONS.lock}<span>Mundo ${partTier(part)}</span>`
              : creditHtml(options.assetBase, formatCredits(part.price))
        card.append(price)
        card.setAttribute('aria-label', `${part.name}, ${equipped ? 'equipada' : owned ? (secret ? 'peça secreta sua' : 'comprada') : locked ? `encaixotada até o Mundo ${partTier(part)}` : `${formatCredits(part.price)} créditos`}`)
        card.addEventListener('click', () => {
          selectPart(part)
          revealSelection(panel, card, detailBox, { pointer: true })
        })
        card.addEventListener('pointerenter', () => hoverPart(part))
        card.addEventListener('pointerleave', () => hoverPart(null))
        card.addEventListener('focus', () => {
          if (selected?.id !== part.id) selectPart(part, true)
        })
        itemButtons.set(part.id, card)
        return card
      }),
    )
  }

  function renderDetail() {
    holdControl?.destroy()
    holdControl = null
    holdingKey = null
    const part = selected
    if (!part) {
      detailBox.dataset.visible = 'false'
      detailBox.replaceChildren()
      return
    }
    const owned = progress.owned.includes(part.id)
    const equipped = progress.equipped[part.slot] === part.id
    const locked = isLocked(part)
    const affordable = progress.credits >= part.price && !locked
    detailBox.dataset.visible = 'true'
    detailBox.dataset.state = equipped ? 'equipped' : owned ? 'owned' : locked ? 'locked' : affordable ? 'buy' : 'poor'
    detailBox.replaceChildren()
    const head = element('div', 'shop-detail-head')
    const frameBox = element('span', 'shop-detail-frame')
    frameBox.append(cellCanvas(composer, part.id, part.name, 'shop-cell', DETAIL_ICON))
    const titles = element('div', 'shop-detail-titles')
    titles.append(element('span', 'ui-kicker', SLOT_SINGULAR[part.slot]), element('h4', 'shop-detail-name', part.name))
    const tag = element('span', 'shop-detail-tag', equipped ? 'Equipada' : owned ? (isSecret(part) ? 'Peça secreta · no depósito' : 'No depósito') : locked ? `Encaixotada · chega no Mundo ${partTier(part)}` : creditHtml(options.assetBase, formatCredits(part.price)))
    titles.append(tag)
    head.append(frameBox, titles)
    detailBox.append(head, element('p', 'shop-detail-text', part.description))
    const bonuses = STAT_KEYS.filter((key) => (part.stats[key] ?? 0) !== 0)
    if (bonuses.length || (part.speed && part.speed !== 1)) {
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
      detailBox.append(list)
    }
    const actions = element('div', 'shop-actions')
    const key = options.touch ? '' : '<kbd>E</kbd>'
    if (locked) {
      actions.append(element('p', 'shop-missing', `Vença o campeão do Mundo ${partTier(part) - 1} no Ringue Principal da Liga de Robôs para esta peça chegar à prateleira. Preço previsto: ${formatCredits(part.price)} créditos.`))
    } else if (!owned) {
      const buy = element('button', 'ui-btn shop-buy')
      buy.type = 'button'
      buy.dataset.variant = affordable ? 'primary' : ''
      buy.setAttribute('aria-disabled', String(!affordable))
      buy.innerHTML = affordable
        ? `<span>${options.touch ? 'Segure para comprar' : 'Segure para comprar'}</span>${key}`
        : `${ICONS.lock}<span>Créditos insuficientes</span>`
      holdControl = holdToConfirm(buy, {
        duration: HOLD_MS,
        canStart: () => progress.credits >= part.price,
        onDeny: () => deny(),
        onStart: () => sound.cue('select'),
        onConfirm: () => purchase(part),
      })
      actions.append(buy)
      if (!affordable) actions.append(element('p', 'shop-missing', `Faltam ${formatCredits(part.price - progress.credits)} créditos`))
    } else if (!equipped) {
      const equip = element('button', 'ui-btn shop-buy', `<span>Equipar</span>${key}`)
      equip.type = 'button'
      equip.dataset.variant = 'primary'
      equip.addEventListener('click', () => wear(part))
      actions.append(equip)
    } else {
      const remove = element('button', 'ui-btn shop-buy', `<span>Remover do robô</span>${key}`)
      remove.type = 'button'
      remove.addEventListener('click', () => strip(part))
      actions.append(remove)
    }
    detailBox.append(actions)
  }

  function renderHints() {
    if (options.touch) {
      hints.replaceChildren()
      return
    }
    const hint = (keys: string[], label: string, range = false) =>
      `<span class="shop-hint">${keys.map((k) => `<kbd>${k}</kbd>`).join(range ? '<i>–</i>' : '')}<span>${label}</span></span>`
    if (!openSlot) {
      hints.innerHTML = `${hint(['1', '4'], 'Prateleiras', true)}${hint(['B'], 'Baralho')}${hint(['Esc'], 'Sair da oficina')}`
      return
    }
    const part = selected
    const action = !part
      ? ''
      : !progress.owned.includes(part.id)
        ? hint(['E'], 'Segure para comprar')
        : progress.equipped[part.slot] === part.id
          ? hint(['E'], 'Remover')
          : hint(['E'], 'Equipar')
    hints.innerHTML = `${hint(['↑', '↓', '←', '→'], 'Navegar')}${action}${hint(['1', '4'], 'Trocar prateleira', true)}${hint(['Esc'], 'Voltar')}`
  }

  function refresh() {
    renderCredits()
    renderShelves()
    renderStats()
    renderSlots()
    renderItems()
    renderDetail()
    renderHints()
    preview.show(previewLoadout())
  }

  function placePreview() {
    const target = root.dataset.layout === 'narrow' && openSlot ? panelRobot : benchRobot
    if (preview.canvas.parentElement !== target) target.append(preview.canvas)
  }

  function openShelf(slot: Slot) {
    if (openSlot === slot) return
    openSlot = slot
    hovered = null
    const parts = shelfParts(slot)
    selected = partById(progress.equipped[slot]) ?? parts[0] ?? null
    root.dataset.shelf = slot
    root.dataset.side = SHELVES[slot].side === 'left' ? 'right' : 'left'
    panelTitle.textContent = SLOT_LABEL[slot]
    panel.dataset.open = 'true'
    sound.cue('select')
    say(SHELF_LINES[slot])
    refresh()
    placePreview()
    frame()
    panel.scrollTop = 0
    const card = selected ? itemButtons.get(selected.id) : undefined
    card?.focus({ preventScroll: true })
    if (card) revealSelection(panel, card, detailBox, { pointer: true })
  }

  function closeShelf() {
    if (!openSlot) return
    const slot = openSlot
    openSlot = null
    selected = null
    hovered = null
    root.dataset.shelf = 'none'
    panel.dataset.open = 'false'
    refresh()
    placePreview()
    frame()
    ;(root.dataset.layout === 'narrow' ? dockButtons.get(slot) : pins.get(slot))?.focus({ preventScroll: true })
  }

  function selectPart(part: Part, quiet = false) {
    selected = part
    hovered = null
    if (!quiet) sound.cue('select')
    const owned = progress.owned.includes(part.id)
    say(owned ? OWNED_LINE : isLocked(part) ? LOCKED_LINE : progress.credits >= part.price ? AFFORD_LINE : EXPENSIVE_LINE)
    for (const [id, button] of itemButtons) {
      button.dataset.selected = String(id === part.id)
      button.tabIndex = id === part.id ? 0 : -1
    }
    renderStats()
    renderSlots()
    renderDetail()
    renderHints()
    preview.show(previewLoadout())
  }

  function hoverPart(part: Part | null) {
    if (hovered === part) return
    hovered = part
    renderStats()
    renderSlots()
    preview.show(previewLoadout())
  }

  function step(dx: number, dy: number) {
    if (!openSlot) return
    const parts = shelfParts(openSlot)
    const index = Math.max(0, parts.findIndex((part) => part.id === selected?.id))
    const columns = root.dataset.layout === 'narrow' ? Math.min(COLUMNS, parts.length) : COLUMNS
    let next = index + dx + dy * columns
    if (next < 0 || next >= parts.length) next = (next + parts.length) % parts.length
    const part = parts[next]
    if (!part) return
    selectPart(part)
    const card = itemButtons.get(part.id)
    card?.focus({ preventScroll: true })
    if (card) revealSelection(panel, card, detailBox)
  }

  function deny() {
    sound.cue('deny')
    say(pick(POOR_LINES))
    creditsBox.dataset.shake = 'false'
    void creditsBox.offsetWidth
    creditsBox.dataset.shake = 'true'
  }

  function flashRobot() {
    benchRobot.dataset.flash = 'false'
    void benchRobot.offsetWidth
    benchRobot.dataset.flash = 'true'
  }

  function purchase(part: Part) {
    if (isLocked(part)) {
      deny()
      return
    }
    const result = buyPart(progress, part.id)
    if (result === 'poor') {
      deny()
      return
    }
    sound.cue(result === 'bought' ? 'buy' : 'equip')
    applyLoadout()
    say(pick(BOUGHT_LINES))
    showToast(part, result === 'bought' ? 'Peça comprada e instalada' : 'Peça instalada')
    flashRobot()
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function wear(part: Part) {
    if (!equipPart(progress, part.slot, part.id)) return
    sound.cue('equip')
    applyLoadout()
    say(EQUIP_LINE)
    showToast(part, 'Peça equipada')
    flashRobot()
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function strip(part: Part) {
    equipPart(progress, part.slot, null)
    sound.cue('equip')
    applyLoadout()
    say(UNEQUIP_LINE)
    refresh()
    itemButtons.get(part.id)?.focus({ preventScroll: true })
  }

  function primaryAction(code: string) {
    const part = selected
    if (!part) return
    if (!progress.owned.includes(part.id)) {
      if (!holdControl) return
      holdingKey = code
      holdControl.start()
      return
    }
    if (progress.equipped[part.slot] === part.id) strip(part)
    else wear(part)
  }

  function requestExit() {
    for (const listener of exitListeners) listener()
  }

  for (const [index, slot] of SLOTS.entries()) {
    const shelf = SHELVES[slot]
    const zone = element('div', 'shop-zone')
    zone.dataset.slot = slot
    zone.style.left = `${shelf.area.left}%`
    zone.style.top = `${shelf.area.top}%`
    zone.style.width = `${shelf.area.width}%`
    zone.style.height = `${shelf.area.height}%`
    zone.addEventListener('click', () => openShelf(slot))
    zonesBox.append(zone)
    zones.set(slot, zone)

    const pin = element('button', 'shop-pin')
    pin.type = 'button'
    pin.dataset.slot = slot
    pin.dataset.side = shelf.side
    pin.style.left = `${shelf.pin[0]}%`
    pin.style.top = `${shelf.pin[1]}%`
    pin.setAttribute('aria-label', `Prateleira de ${SLOT_LABEL[slot].toLowerCase()}`)
    pin.innerHTML = `<span class="shop-pin-mark" aria-hidden="true"><i></i></span><span class="shop-pin-label"><b>${SLOT_LABEL[slot]}</b><small></small></span>${options.touch ? '' : `<kbd>${index + 1}</kbd>`}`
    pin.addEventListener('click', () => openShelf(slot))
    pinsBox.append(pin)
    pins.set(slot, pin)

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

    const sample = shopPartsInSlot(slot)[0]
    const tab = element('button', 'shop-tab')
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.dataset.slot = slot
    if (sample) tab.append(cellCanvas(composer, sample.id, '', 'shop-cell', TAB_ICON))
    tab.append(element('span', 'shop-tab-label', SLOT_LABEL[slot]))
    if (!options.touch) tab.append(element('kbd', '', String(index + 1)))
    tab.addEventListener('click', () => openShelf(slot))
    tabsBox.append(tab)
    tabs.set(slot, tab)

    const dockButton = element('button', 'shop-dock-button')
    dockButton.type = 'button'
    dockButton.dataset.slot = slot
    if (sample) dockButton.append(cellCanvas(composer, sample.id, '', 'shop-cell', TAB_ICON))
    dockButton.append(element('span', '', SLOT_LABEL[slot]))
    dockButton.addEventListener('click', () => (openSlot === slot ? closeShelf() : openShelf(slot)))
    dock.append(dockButton)
    dockButtons.set(slot, dockButton)
  }

  exitButton.addEventListener('click', requestExit)
  deckButton.addEventListener('click', openDeck)
  backButton.addEventListener('click', closeShelf)
  root.addEventListener('pointerdown', (event) => event.stopPropagation())

  return {
    get visible() {
      return visible
    },
    show() {
      visible = true
      openSlot = null
      selected = null
      hovered = null
      root.dataset.shelf = 'none'
      panel.dataset.open = 'false'
      root.dataset.visible = 'true'
      root.dataset.deck = 'closed'
      root.setAttribute('aria-hidden', 'false')
      refresh()
      paintDeck()
      frame(false)
      placePreview()
      say(pick(GREETINGS))
      exitButton.focus({ preventScroll: true })
    },
    hide() {
      visible = false
      holdControl?.cancel()
      handBuilder.hide()
      root.dataset.deck = 'closed'
      root.dataset.visible = 'false'
      root.setAttribute('aria-hidden', 'true')
      bubble.dataset.visible = 'false'
      if (typeTimer) clearInterval(typeTimer)
      typeTimer = null
    },
    onExit(listener) {
      exitListeners.push(listener)
    },
    handleKey(event) {
      if (!visible) return false
      if (handBuilder.open) return handBuilder.handleKey(event)
      const code = event.code
      if (event.repeat) return code === 'KeyE' || code === 'Enter' || code === 'Space' || code.startsWith('Arrow')
      if (code === 'KeyB') {
        openDeck()
        return true
      }
      if (code === 'Escape') {
        if (openSlot) closeShelf()
        else requestExit()
        return true
      }
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(code)
      if (digit) {
        const slot = SLOTS[Number(digit[1]) - 1]
        if (openSlot === slot) closeShelf()
        else openShelf(slot)
        return true
      }
      if (!openSlot) {
        if (code === 'KeyE') {
          requestExit()
          return true
        }
        return false
      }
      if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
        primaryAction(code)
        return true
      }
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
        holdControl?.cancel()
      }
    },
    tick(dt) {
      if (!visible) return
      preview.tick(dt)
      keeperTurn += dt
      if (keeperTurn > 4.5) {
        keeperTurn = 0
        keeper.tick(0.9 * 7)
      }
      keeper.tick(0)
    },
    destroy() {
      observer.disconnect()
      holdControl?.destroy()
      handBuilder.destroy()
      if (typeTimer) clearInterval(typeTimer)
      if (toastTimer) clearTimeout(toastTimer)
      root.remove()
    },
  }
}
