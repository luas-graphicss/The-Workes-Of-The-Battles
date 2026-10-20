import { GARAGE } from '../../world-data'
import type { Sound } from '../audio'
import { GEAR_ACTIONS, labelFor, MOUNT_ACTIONS } from '../bindings'
import { saveProgress, type Progress } from '../robot/progress'
import { element, emblemPath, holdToConfirm, ICONS, revealSelection, type HoldControl } from '../ui/kit'
import {
  BROTHER_ORDER,
  BROTHERS,
  brotherPortrait,
  CHIP_SLOTS,
  currencyIcon,
  MOUNT_SLOTS,
  ROMAN,
  slotKind,
  upgradeDef,
  upgradeIcon,
  upgradesOf,
  UPGRADES,
  type Brother,
  type UpgradeDef,
  type UpgradeId,
} from './catalog'
import { buyUpgrade, formatAmount, isEquipped, levelOf, nextCost, toggleEquip, wallet } from './state'

export type GarageOptions = {
  progress: Progress
  sound: Sound
  assetBase: string
  touch: boolean
  reducedMotion: boolean
}

export type Garage = {
  readonly visible: boolean
  show(): void
  hide(): void
  onExit(listener: () => void): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  tick(dt: number): void
  destroy(): void
}

const HOLD_MS = 650
const TOAST_MS = 2600
const TWEEN_MS = 650
const ZOOM = 1.28
const WIDE = 900

const SPOTS: Record<Brother, { area: [number, number, number, number]; pin: [number, number] }> = {
  charles: { area: [2, 44, 31, 38], pin: [26, 58] },
  sid: { area: [36, 40, 27, 40], pin: [60, 52] },
  james: { area: [65, 41, 33, 39], pin: [70, 50] },
}

const PERKS: readonly UpgradeId[] = ['saudavel', 'forte', 'combo', 'rico', 'imprevisivel']

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function createGarage(surface: HTMLElement, options: GarageOptions): Garage {
  const { progress, sound, assetBase } = options
  const garage = () => progress.garage
  const key = (label: string) => (options.touch ? '' : `<kbd>${label}</kbd>`)
  const root = element('section', 'garage')
  root.dataset.visible = 'false'
  root.dataset.touch = String(options.touch)
  root.setAttribute('aria-label', GARAGE.name)
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="garage-stage">
      <div class="garage-painting">
        <img class="garage-art" src="${assetBase}assets/garage/interior.webp" alt="" draggable="false" decoding="async">
        <div class="garage-spots"></div>
      </div>
      <div class="garage-shade" aria-hidden="true"></div>
    </div>
    <header class="garage-top">
      <div class="garage-title">
        <img class="garage-title-emblem" src="${emblemPath(assetBase, 'workshop')}" alt="" width="48" height="48" decoding="async">
        <div>
          <span class="ui-kicker">${GARAGE.district}</span>
          <h2 class="garage-name">${GARAGE.name}</h2>
        </div>
      </div>
      <div class="garage-top-right">
        <div class="garage-purse ui-panel" data-currency="coins" aria-live="polite">
          <img src="${currencyIcon(assetBase, 'coins')}" alt="" width="34" height="34" decoding="async">
          <span class="garage-purse-text"><b class="garage-purse-value">0</b><small>moedas de ferro</small></span>
        </div>
        <div class="garage-purse ui-panel" data-currency="fragments" aria-live="polite">
          <img src="${currencyIcon(assetBase, 'fragments')}" alt="" width="34" height="34" decoding="async">
          <span class="garage-purse-text"><b class="garage-purse-value">0</b><small>fragmentos</small></span>
        </div>
        <button type="button" class="garage-exit ui-btn">${ICONS.close}<span>Sair</span>${key('Esc')}</button>
      </div>
    </header>
    <nav class="garage-tabs" role="tablist" aria-label="Irmãos da mecânica"></nav>
    <aside class="garage-panel ui-panel" aria-label="Catálogo do irmão">
      <header class="garage-panel-head">
        <span class="garage-portrait-frame"><img class="garage-portrait" src="" alt="" width="96" height="96" decoding="async"></span>
        <div class="garage-panel-titles">
          <span class="ui-kicker garage-panel-kicker" data-mark></span>
          <h3 class="garage-panel-name"></h3>
          <p class="garage-panel-specialty"></p>
        </div>
      </header>
      <p class="garage-quote" role="status" aria-live="polite"></p>
      <div class="garage-slots" aria-live="polite"></div>
      <div class="garage-items" role="list"></div>
      <section class="garage-detail" aria-live="polite"></section>
    </aside>
    <aside class="garage-loadout ui-panel" aria-label="Instalado no robô"></aside>
    <footer class="garage-hints" aria-hidden="true">${
      options.touch
        ? '<span>Toque num irmão ou numa peça</span><span>Segure Comprar para confirmar</span>'
        : `<span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> irmão</span><span><kbd>↑</kbd><kbd>↓</kbd> escolher</span><span><kbd>E</kbd> segure para comprar</span><span><kbd>Q</kbd> instalar</span><span><kbd>Esc</kbd> sair</span>`
    }</footer>
    <div class="garage-toast" role="status" aria-live="assertive" data-visible="false">
      <span class="garage-toast-icon"><img alt="" width="64" height="64" decoding="async"></span>
      <span class="garage-toast-text"><span class="ui-kicker garage-toast-kicker"></span><strong class="garage-toast-name"></strong></span>
    </div>
  `
  surface.append(root)

  const q = <T extends Element>(selector: string) => root.querySelector(selector) as T
  const painting = q<HTMLElement>('.garage-painting')
  const spots = q<HTMLElement>('.garage-spots')
  const tabs = q<HTMLElement>('.garage-tabs')
  const panel = q<HTMLElement>('.garage-panel')
  const portrait = q<HTMLImageElement>('.garage-portrait')
  const panelKicker = q<HTMLElement>('.garage-panel-kicker')
  const panelName = q<HTMLElement>('.garage-panel-name')
  const panelSpecialty = q<HTMLElement>('.garage-panel-specialty')
  const quote = q<HTMLElement>('.garage-quote')
  const slotsBox = q<HTMLElement>('.garage-slots')
  const itemsBox = q<HTMLElement>('.garage-items')
  const detail = q<HTMLElement>('.garage-detail')
  const loadout = q<HTMLElement>('.garage-loadout')
  const exitButton = q<HTMLButtonElement>('.garage-exit')
  const toast = q<HTMLElement>('.garage-toast')
  const toastIcon = q<HTMLImageElement>('.garage-toast-icon img')
  const toastKicker = q<HTMLElement>('.garage-toast-kicker')
  const toastName = q<HTMLElement>('.garage-toast-name')
  const purses = {
    coins: { box: q<HTMLElement>('.garage-purse[data-currency="coins"]'), value: q<HTMLElement>('.garage-purse[data-currency="coins"] .garage-purse-value'), shown: 0 },
    fragments: { box: q<HTMLElement>('.garage-purse[data-currency="fragments"]'), value: q<HTMLElement>('.garage-purse[data-currency="fragments"] .garage-purse-value'), shown: 0 },
  }

  let visible = false
  let brother: Brother = 'charles'
  let focusId: UpgradeId = upgradesOf('charles')[0].id
  let hold: HoldControl | null = null
  let holdingKey: string | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let tweenFrame = 0
  const exitListeners: (() => void)[] = []
  const cleanups: (() => void)[] = []

  const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void) => {
    target.addEventListener(type, handler)
    cleanups.push(() => target.removeEventListener(type, handler))
  }

  for (const id of BROTHER_ORDER) {
    const def = BROTHERS[id]
    const spot = SPOTS[id]
    const zone = element('button', 'garage-spot')
    zone.type = 'button'
    zone.dataset.brother = id
    zone.style.cssText = `left:${spot.area[0]}%;top:${spot.area[1]}%;width:${spot.area[2]}%;height:${spot.area[3]}%;--accent:${def.accent}`
    zone.setAttribute('aria-label', `${def.name}, ${def.title}`)
    const pin = element('span', 'garage-pin', `<span class="garage-pin-mark" aria-hidden="true"><i></i></span><span class="garage-pin-label"><b>${def.name}</b><small>${def.title}</small></span>`)
    pin.style.cssText = `left:${spot.pin[0]}%;top:${spot.pin[1]}%;--accent:${def.accent}`
    pin.dataset.brother = id
    spots.append(zone, pin)
    listen(zone, 'click', () => selectBrother(id, true))
    listen(zone, 'pointerenter', () => zone.setAttribute('data-hot', 'true'))
    listen(zone, 'pointerleave', () => zone.removeAttribute('data-hot'))

    const tab = element('button', 'garage-tab')
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.dataset.brother = id
    tab.style.setProperty('--accent', def.accent)
    tab.innerHTML = `
      <span class="garage-tab-face"><img src="${brotherPortrait(assetBase, id)}" alt="" width="52" height="52" decoding="async"></span>
      <span class="garage-tab-text"><b>${def.name}</b><small>${def.title}</small></span>
      ${options.touch ? '' : `<kbd>${BROTHER_ORDER.indexOf(id) + 1}</kbd>`}
      <span class="garage-tab-badge" aria-hidden="true"></span>
    `
    tabs.append(tab)
    listen(tab, 'click', () => selectBrother(id, true))
  }

  listen(exitButton, 'click', () => requestExit())
  const swallow = (event: Event) => event.stopPropagation()
  listen(root, 'pointerdown', swallow)

  const observer = new ResizeObserver(() => frame())
  observer.observe(root)

  function requestExit() {
    hold?.cancel()
    for (const listener of exitListeners) listener()
  }

  function frame() {
    const width = root.clientWidth
    const height = root.clientHeight
    if (!width || !height) return
    const wide = width >= WIDE
    root.dataset.layout = wide ? 'wide' : 'narrow'
    const side = Math.max(width, height) * (wide ? ZOOM : 1.18)
    const [fx, fy] = BROTHERS[brother].station
    const panelSpace = wide ? panel.offsetWidth + 40 : 0
    const targetX = wide ? (width - panelSpace) * 0.5 : width * 0.5
    const targetY = wide ? height * 0.5 : height * 0.32
    const minX = wide ? width - panelSpace - side : width - side
    const x = Math.min(0, Math.max(minX, targetX - fx * side))
    const minY = wide ? height - side : Math.min(height, panel.offsetTop) - side
    const y = Math.min(0, Math.max(minY, targetY - fy * side))
    painting.style.width = `${side}px`
    painting.style.height = `${side}px`
    painting.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
  }

  function say(text: string) {
    quote.textContent = text
    quote.dataset.run = 'false'
    void quote.offsetWidth
    quote.dataset.run = 'true'
  }

  function priceHtml(def: UpgradeDef, cost: number) {
    return `<span class="garage-price" data-currency="${def.currency}"><img src="${currencyIcon(assetBase, def.currency)}" alt="" width="20" height="20" decoding="async">${formatAmount(cost)}</span>`
  }

  function pips(def: UpgradeDef, level: number) {
    return `<span class="garage-pips" aria-hidden="true">${def.costs.map((_, index) => `<i data-on="${index < level}">${ROMAN[index]}</i>`).join('')}</span>`
  }

  function keyFor(id: UpgradeId): string | null {
    const g = garage()
    const chip = g.chips.indexOf(id)
    if (chip >= 0) return labelFor(GEAR_ACTIONS[chip])
    const mount = g.mounts.indexOf(id)
    if (mount >= 0) return labelFor(MOUNT_ACTIONS[mount])
    return null
  }

  function kindLabel(def: UpgradeDef) {
    if (def.kind === 'perk') return 'Permanente · fragmentos'
    const slot = slotKind(def) === 'chip' ? 'Chip' : 'Montagem'
    const mode = def.kind === 'active' ? 'ativo' : 'passivo'
    const label = slotKind(def) === 'chip' ? `${slot} ${mode}` : `${slot} ${def.kind === 'active' ? 'ativa' : 'passiva'}`
    const bound = isEquipped(garage(), def.id) && def.kind === 'active' ? keyFor(def.id) : null
    return `${label}${bound ? ` · tecla ${bound}` : ''}${def.energy ? ` · ${def.energy} de energia` : ''}`
  }

  function itemState(def: UpgradeDef) {
    const g = garage()
    const level = levelOf(g, def.id)
    const cost = nextCost(g, def.id)
    return { level, cost, affordable: cost !== null && wallet(g, def.id) >= cost, maxed: cost === null, equipped: isEquipped(g, def.id) }
  }

  function renderTabs() {
    for (const tab of tabs.querySelectorAll<HTMLElement>('.garage-tab')) {
      const id = tab.dataset.brother as Brother
      const active = id === brother
      tab.dataset.active = String(active)
      tab.setAttribute('aria-selected', String(active))
      const ready = upgradesOf(id).filter((def) => itemState(def).affordable).length
      const badge = tab.querySelector('.garage-tab-badge') as HTMLElement
      badge.textContent = ready ? String(ready) : ''
      badge.dataset.visible = String(ready > 0)
    }
    for (const node of spots.querySelectorAll<HTMLElement>('[data-brother]')) node.dataset.active = String(node.dataset.brother === brother)
  }

  function renderPanel() {
    const def = BROTHERS[brother]
    root.style.setProperty('--accent', def.accent)
    root.dataset.brother = brother
    portrait.src = brotherPortrait(assetBase, brother)
    portrait.alt = `Retrato de ${def.name}`
    panelKicker.textContent = def.title
    panelName.textContent = def.name
    panelSpecialty.textContent = def.specialty
    renderSlots()
    itemsBox.replaceChildren(
      ...upgradesOf(brother).map((upgrade, index) => {
        const state = itemState(upgrade)
        const item = element('button', 'garage-item')
        item.type = 'button'
        item.setAttribute('role', 'listitem')
        item.dataset.id = upgrade.id
        item.dataset.owned = String(state.level > 0)
        item.dataset.equipped = String(state.equipped)
        item.dataset.affordable = String(state.affordable)
        item.dataset.maxed = String(state.maxed)
        item.dataset.active = String(upgrade.id === focusId)
        item.style.setProperty('--index', String(index))
        item.innerHTML = `
          <span class="garage-item-icon"><img src="${upgradeIcon(assetBase, upgrade.id)}" alt="" width="56" height="56" decoding="async"></span>
          <span class="garage-item-text"><b>${upgrade.name}</b><small>${upgrade.tagline}</small></span>
          <span class="garage-item-side">
            ${pips(upgrade, state.level)}
            ${state.maxed ? '<span class="garage-max">Máx</span>' : priceHtml(upgrade, state.cost as number)}
          </span>
          ${state.equipped ? `<span class="garage-item-flag">${upgrade.kind === 'active' && keyFor(upgrade.id) ? keyFor(upgrade.id) : 'No robô'}</span>` : ''}
        `
        item.setAttribute('aria-label', `${upgrade.name}, nível ${state.level} de ${upgrade.costs.length}${state.maxed ? ', no máximo' : `, próximo nível custa ${formatAmount(state.cost as number)} ${upgrade.currency === 'coins' ? 'moedas' : 'fragmentos'}`}${state.equipped ? ', instalado' : ''}`)
        item.addEventListener('click', () => focus(upgrade.id, true))
        return item
      }),
    )
    renderDetail()
  }

  function renderSlots() {
    const g = garage()
    if (brother === 'sid') {
      slotsBox.innerHTML = `<span class="garage-slots-label">Permanente: vale em toda luta, sem ocupar espaço</span>`
      return
    }
    const list = brother === 'charles' ? g.chips : g.mounts
    const limit = brother === 'charles' ? CHIP_SLOTS : MOUNT_SLOTS
    const label = brother === 'charles' ? 'Chips no núcleo' : 'Montagens no chassi'
    slotsBox.innerHTML = `
      <span class="garage-slots-label">${label} <b>${list.length}/${limit}</b></span>
      <span class="garage-slots-row">${Array.from({ length: limit }, (_, index) => {
        const id = list[index]
        return id
          ? `<i data-filled="true" title="${upgradeDef(id).name}"><img src="${upgradeIcon(assetBase, id)}" alt="" width="28" height="28" decoding="async"></i>`
          : '<i data-filled="false"></i>'
      }).join('')}</span>
    `
  }

  function renderDetail() {
    const def = upgradeDef(focusId)
    const state = itemState(def)
    hold?.destroy()
    hold = null
    const levels = def.levels
      .map((summary, index) => {
        const status = index < state.level ? 'done' : index === state.level ? 'next' : 'later'
        return `<li data-state="${status}"><span class="garage-level-mark">${ROMAN[index]}</span><span class="garage-level-text">${summary}</span>${status === 'done' ? `<span class="garage-level-check">${ICONS.check}</span>` : priceHtml(def, def.costs[index])}</li>`
      })
      .join('')
    const slot = slotKind(def)
    const buyLabel = state.maxed ? 'Nível máximo' : state.level === 0 ? 'Comprar' : `Melhorar para ${ROMAN[state.level]}`
    detail.innerHTML = `
      <div class="garage-detail-head">
        <span class="garage-detail-icon"><img src="${upgradeIcon(assetBase, def.id)}" alt="" width="88" height="88" decoding="async"></span>
        <div class="garage-detail-titles">
          <span class="ui-kicker">${kindLabel(def)}</span>
          <h4 class="garage-detail-name">${def.name}</h4>
          <span class="garage-detail-level">${state.level ? `Nível ${ROMAN[state.level - 1]} de ${ROMAN[def.costs.length - 1]}` : 'Ainda não comprado'}</span>
        </div>
      </div>
      <p class="garage-detail-text">${def.description}</p>
      <ol class="garage-levels">${levels}</ol>
      <div class="garage-actions">
        <button type="button" class="ui-btn garage-buy" data-variant="primary" ${state.maxed ? 'disabled' : ''} data-affordable="${state.affordable}">
          <span>${buyLabel}</span>${state.maxed ? '' : priceHtml(def, state.cost as number)}${state.maxed ? '' : key('E')}
        </button>
        ${
          slot && state.level > 0
            ? `<button type="button" class="ui-btn garage-equip" data-equipped="${state.equipped}"><span>${state.equipped ? 'Remover' : 'Instalar'}</span>${key('Q')}</button>`
            : ''
        }
      </div>
    `
    const buy = detail.querySelector('.garage-buy') as HTMLButtonElement
    if (!state.maxed) {
      hold = holdToConfirm(buy, {
        duration: HOLD_MS,
        canStart: () => itemState(def).affordable,
        onDeny: () => deny(def),
        onStart: () => sound.cue('select'),
        onConfirm: () => purchase(def.id),
      })
    }
    const equip = detail.querySelector('.garage-equip') as HTMLButtonElement | null
    equip?.addEventListener('click', () => equipToggle(def.id))
  }

  function renderLoadout() {
    const g = garage()
    const row = (title: string, ids: (UpgradeId | null)[], keys: (string | null)[], kind: string) => `
      <div class="garage-loadout-row" data-kind="${kind}">
        <span class="garage-loadout-label">${title}</span>
        <ul>${ids
          .map((id, index) => {
            if (!id) return '<li data-filled="false"><span class="garage-loadout-empty"></span></li>'
            const def = upgradeDef(id)
            const level = levelOf(g, id)
            const badge = kind === 'perk' ? (level ? ROMAN[level - 1] : '') : def.kind === 'active' ? keys[index] ?? '' : 'auto'
            return `<li data-filled="${kind !== 'perk' || level > 0}" data-id="${id}" title="${def.name}"><img src="${upgradeIcon(assetBase, id)}" alt="${def.name}" width="40" height="40" decoding="async">${badge ? `<b>${badge}</b>` : ''}</li>`
          })
          .join('')}</ul>
      </div>`
    const chipIds = Array.from({ length: CHIP_SLOTS }, (_, index) => g.chips[index] ?? null)
    const mountIds = Array.from({ length: MOUNT_SLOTS }, (_, index) => g.mounts[index] ?? null)
    loadout.innerHTML = `
      <header class="garage-loadout-head"><span class="ui-kicker" data-mark>No robô</span><small>vai para a próxima luta</small></header>
      ${row('Chips · Charles', chipIds, GEAR_ACTIONS.map((action) => labelFor(action)), 'chip')}
      ${row('Montagens · James', mountIds, MOUNT_ACTIONS.map((action) => labelFor(action)), 'mount')}
      ${row('Permanentes · Sid', [...PERKS], PERKS.map(() => null), 'perk')}
    `
    for (const node of loadout.querySelectorAll<HTMLElement>('li[data-id]')) {
      node.addEventListener('click', () => {
        const id = node.dataset.id as UpgradeId
        selectBrother(upgradeDef(id).brother, false)
        focus(id, true)
      })
    }
  }

  function renderWallet(animate: boolean) {
    const g = garage()
    tween('coins', g.coins, animate)
    tween('fragments', g.fragments, animate)
  }

  function tween(currency: 'coins' | 'fragments', target: number, animate: boolean) {
    const purse = purses[currency]
    const from = purse.shown
    if (!animate || options.reducedMotion || from === target) {
      purse.shown = target
      purse.value.textContent = formatAmount(target)
      return
    }
    const start = performance.now()
    cancelAnimationFrame(tweenFrame)
    purse.box.dataset.bump = 'false'
    void purse.box.offsetWidth
    purse.box.dataset.bump = target < from ? 'spend' : 'gain'
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      purse.shown = Math.round(from + (target - from) * eased)
      purse.value.textContent = formatAmount(purse.shown)
      if (t < 1) tweenFrame = requestAnimationFrame(step)
    }
    tweenFrame = requestAnimationFrame(step)
  }

  function renderAll() {
    renderTabs()
    renderPanel()
    renderLoadout()
  }

  function selectBrother(next: Brother, greet: boolean) {
    if (next !== brother) {
      brother = next
      focusId = upgradesOf(next)[0].id
      sound.cue('select')
      renderAll()
      frame()
      if (greet) say(pick(BROTHERS[next].greetings))
      itemsBox.scrollTop = 0
    } else if (greet) {
      say(pick(BROTHERS[next].greetings))
    }
  }

  function focus(id: UpgradeId, pointer: boolean) {
    if (focusId !== id) {
      focusId = id
      sound.cue('select')
    }
    for (const node of itemsBox.querySelectorAll<HTMLElement>('.garage-item')) node.dataset.active = String(node.dataset.id === id)
    renderDetail()
    const node = itemsBox.querySelector<HTMLElement>(`.garage-item[data-id="${id}"]`)
    if (node) revealSelection(itemsBox, node, null, { pointer })
  }

  function step(delta: number) {
    const list = upgradesOf(brother)
    const index = list.findIndex((def) => def.id === focusId)
    const next = list[(index + delta + list.length) % list.length]
    focus(next.id, false)
  }

  function cycleBrother(delta: number) {
    const index = BROTHER_ORDER.indexOf(brother)
    selectBrother(BROTHER_ORDER[(index + delta + BROTHER_ORDER.length) % BROTHER_ORDER.length], true)
  }

  function deny(def: UpgradeDef) {
    const state = itemState(def)
    sound.cue('deny')
    if (state.maxed) {
      say(BROTHERS[def.brother].maxed)
      return
    }
    say(pick(BROTHERS[def.brother].poor))
    const purse = purses[def.currency].box
    purse.dataset.shake = 'false'
    void purse.offsetWidth
    purse.dataset.shake = 'true'
  }

  function purchase(id: UpgradeId) {
    const def = upgradeDef(id)
    const result = buyUpgrade(garage(), id)
    if (result !== 'bought') {
      deny(def)
      return
    }
    saveProgress(progress)
    sound.cue('buy')
    const level = levelOf(garage(), id)
    say(pick(BROTHERS[def.brother].bought))
    showToast(def, level)
    renderWallet(true)
    renderAll()
    const node = itemsBox.querySelector<HTMLElement>(`.garage-item[data-id="${id}"]`)
    if (node) {
      node.dataset.pop = 'true'
      setTimeout(() => node.removeAttribute('data-pop'), 900)
    }
  }

  function equipToggle(id: UpgradeId) {
    const def = upgradeDef(id)
    const result = toggleEquip(garage(), id)
    if (result === 'invalid' || result === 'locked') {
      sound.cue('deny')
      return
    }
    if (result === 'full') {
      sound.cue('deny')
      say(BROTHERS[def.brother].full)
      return
    }
    saveProgress(progress)
    sound.cue('equip')
    say(result === 'equipped' ? BROTHERS[def.brother].equipped : BROTHERS[def.brother].removed)
    renderAll()
  }

  function showToast(def: UpgradeDef, level: number) {
    toastIcon.src = upgradeIcon(assetBase, def.id)
    toastKicker.textContent = level === 1 ? `${BROTHERS[def.brother].name} entregou` : `Melhorado para o nível ${ROMAN[level - 1]}`
    toastName.textContent = def.name
    toast.style.setProperty('--accent', BROTHERS[def.brother].accent)
    toast.dataset.visible = 'false'
    void toast.offsetWidth
    toast.dataset.visible = 'true'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.dataset.visible = 'false'
      toastTimer = null
    }, TOAST_MS)
  }

  return {
    get visible() {
      return visible
    },
    show() {
      visible = true
      garage().visited = true
      saveProgress(progress)
      root.dataset.visible = 'true'
      root.setAttribute('aria-hidden', 'false')
      renderWallet(false)
      renderAll()
      requestAnimationFrame(frame)
      say(pick(BROTHERS[brother].greetings))
    },
    hide() {
      visible = false
      hold?.cancel()
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
      if (event.repeat) return code === 'KeyE' || code === 'Enter' || code === 'Space' || code.startsWith('Arrow')
      if (code === 'Escape') {
        requestExit()
        return true
      }
      const digit = /^(?:Digit|Numpad)([1-3])$/.exec(code)
      if (digit) {
        selectBrother(BROTHER_ORDER[Number(digit[1]) - 1], true)
        return true
      }
      if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
        const def = upgradeDef(focusId)
        if (!hold) {
          deny(def)
          return true
        }
        holdingKey = code
        hold.start()
        return true
      }
      if (code === 'KeyQ') {
        equipToggle(focusId)
        return true
      }
      if (code === 'ArrowUp' || code === 'KeyW') step(-1)
      else if (code === 'ArrowDown' || code === 'KeyS') step(1)
      else if (code === 'ArrowLeft' || code === 'KeyA') cycleBrother(-1)
      else if (code === 'ArrowRight' || code === 'KeyD') cycleBrother(1)
      else return false
      return true
    },
    handleKeyUp(event) {
      if (holdingKey && event.code === holdingKey) {
        holdingKey = null
        hold?.cancel()
      }
    },
    tick() {},
    destroy() {
      observer.disconnect()
      hold?.destroy()
      cancelAnimationFrame(tweenFrame)
      if (toastTimer) clearTimeout(toastTimer)
      for (const cleanup of cleanups) cleanup()
      root.remove()
    },
  }
}

export const GARAGE_UPGRADE_COUNT = UPGRADES.length
