import type { Site } from '../../city/sites'
import { ARENA } from '../../world-data'
import { currencyIcon } from '../garage/catalog'
import { formatAmount, type GarageReward } from '../garage/state'
import type { Mission } from '../missions/data'
import type { Reward } from '../missions/progress'
import { conditionTier, TIER_LABEL, type WearEntry } from '../robot/condition'
import { BODY_NAME, formatCredits, SLOT_SINGULAR, type Part } from '../robot/parts'
import type { Core, Progress } from '../robot/progress'
import { FRAME, ROW } from '../sprite'
import { emblemPath, ICONS } from '../ui/kit'
import type { BannerKind, BattleStats, CutIn } from './battle'
import { CLASSES } from './classes'
import { cardDetail, cardFace, setFaceSlot } from './card-face'
import { CARDS, HAND_SIZE, type CardId } from './deck'
import { classEmblem, dossierPage, emblem } from './dossier'
import { ELEMENTS, effectiveness } from './elements'
import { specDef, specLook, type EnemySpec, type Lineup } from './lineup'
import type { EnemyArt } from './sprites'
import { buildTrail, type TrailHandlers } from './trail'

export type Portrait = { image: CanvasImageSource; sx: number; sy: number }

export type BriefingHandlers = { accept(): void; decline(): void; declineLabel?: string }
export type ResultHandlers = { continue(): void; retry?(): void }
export type DraftHandlers = { confirm(hand: CardId[]): void; back(): void; backLabel?: string }

export type ResultSummary = {
  outcome: 'victory' | 'defeat'
  mission: Mission
  reward: Reward | null
  bounties: number
  kills: number
  seconds: number
  stats: BattleStats

  wear: WearEntry[]
  garage?: GarageReward | null
}

export type Cards = {
  readonly open: boolean
  briefing(mission: Mission, site: Site | null, lineup: Lineup, core: Core, handlers: BriefingHandlers, secret?: Part | null, hand?: readonly CardId[] | null): void
  draft(mission: Mission, offer: readonly CardId[], handlers: DraftHandlers): void

  trail(progress: Progress, player: Portrait | null, handlers: TrailHandlers): void
  versus(mission: Mission, specs: EnemySpec[], player: Portrait, core: Core, lineup: Lineup): void
  banner(kind: BannerKind, text: string, sub?: string): void
  cutin(info: CutIn): void
  result(summary: ResultSummary, handlers: ResultHandlers): void
  hide(): void
  handleKey(event: KeyboardEvent): boolean
  destroy(): void
}

const BANNER_MS: Record<BannerKind, number> = { round: 1250, fight: 900, cleared: 1500, victory: 2300, defeat: 2500, alarm: 1600, alien: 1700, boss: 2200 }
const CUTIN_MS = { special: 900, transform: 1350 }
const CALLOUT_MS = 1400
const CUTIN_LEAVE_MS = 180
const PORTRAIT_SCALE = 4

const rgb = ([r, g, b]: readonly number[]) => `${r} ${g} ${b}`
const DIM_FADE_MS = 320

export type CardsOptions = {
  assetBase: string
  touch: boolean
  art: EnemyArt
  partIcon?: (id: string, label: string, size: number) => HTMLCanvasElement

  backdrop?: () => HTMLElement
  cue?: (name: 'select' | 'deny' | 'equip' | 'card') => void
}

export function createCards(surface: HTMLElement, options: CardsOptions): Cards {
  const root = document.createElement('div')
  root.className = 'cards'
  root.dataset.open = 'false'
  root.innerHTML = `
    <div class="cards-dim"></div>
    <div class="cards-stage"></div>
    <div class="battle-banner" data-visible="false" aria-live="assertive">
      <span class="battle-banner-text"></span>
      <span class="battle-banner-sub"></span>
    </div>
    <div class="cutin" data-visible="false" aria-live="polite">
      <div class="cutin-band">
        <span class="cutin-art" aria-hidden="true"></span>
        <span class="cutin-text">
          <span class="cutin-kicker"></span>
          <strong class="cutin-name"></strong>
          <span class="cutin-title"></span>
        </span>
        <img class="cutin-emblem" alt="" width="64" height="64">
      </div>
    </div>
    <div class="battle-callout" data-visible="false" aria-live="polite">
      <span class="battle-callout-art" aria-hidden="true"></span>
      <span class="battle-callout-text"></span>
    </div>
  `
  surface.append(root)
  const stage = root.querySelector('.cards-stage') as HTMLElement
  const banner = root.querySelector('.battle-banner') as HTMLElement
  const bannerText = banner.querySelector('.battle-banner-text') as HTMLElement
  const bannerSub = banner.querySelector('.battle-banner-sub') as HTMLElement
  const cut = root.querySelector('.cutin') as HTMLElement
  const cutKicker = cut.querySelector('.cutin-kicker') as HTMLElement
  const cutName = cut.querySelector('.cutin-name') as HTMLElement
  const cutTitle = cut.querySelector('.cutin-title') as HTMLElement
  const cutEmblem = cut.querySelector('.cutin-emblem') as HTMLImageElement
  const callout = root.querySelector('.battle-callout') as HTMLElement
  const calloutText = callout.querySelector('.battle-callout-text') as HTMLElement
  const dim = root.querySelector('.cards-dim') as HTMLElement
  let dimTimer: ReturnType<typeof setTimeout> | null = null
  function refreshDim(modal: boolean) {
    if (dimTimer) clearTimeout(dimTimer)
    dimTimer = null
    if (modal && options.backdrop) {
      dim.replaceChildren(options.backdrop())
      return
    }
    if (dim.childElementCount) dimTimer = setTimeout(() => dim.replaceChildren(), DIM_FADE_MS)
  }
  const backdrops: Record<Mission['kind'], string> = {
    main: `${options.assetBase}assets/ui/arena-backdrop.webp`,
    side: `${options.assetBase}assets/ui/breakout-backdrop.webp`,
  }
  for (const source of Object.values(backdrops)) new Image().src = source
  for (const card of Object.values(CARDS)) new Image().src = `${options.assetBase}${card.art}`
  const backdrop = (mission: Mission) => `url('${backdrops[mission.kind]}')`

  let open = false
  let keys: ((event: KeyboardEvent) => boolean) | null = null
  let briefingExtras: { secret: Part | null; hand: readonly CardId[] | null | undefined } = { secret: null, hand: undefined }
  let bannerTimer: ReturnType<typeof setTimeout> | null = null
  let cutTimer: ReturnType<typeof setTimeout> | null = null
  let calloutTimer: ReturnType<typeof setTimeout> | null = null

  function show(card: HTMLElement, modal: boolean, handler: ((event: KeyboardEvent) => boolean) | null = null) {
    hideCard()
    keys = handler
    stage.append(card)
    open = modal
    refreshDim(modal)
    root.dataset.open = String(modal)
    root.dataset.visible = 'true'
    requestAnimationFrame(() => requestAnimationFrame(() => card.setAttribute('data-shown', 'true')))
  }

  function hideCard() {
    keys = null
    open = false
    refreshDim(false)
    root.dataset.open = 'false'
    root.dataset.visible = 'false'
    for (const child of [...stage.children]) {
      const element = child as HTMLElement
      element.removeAttribute('data-shown')
      element.setAttribute('data-leaving', 'true')
      setTimeout(() => element.remove(), 360)
    }
  }

  function portraitCanvas(portrait: Portrait, scale = PORTRAIT_SCALE, className = 'card-portrait') {
    const canvas = document.createElement('canvas')
    canvas.className = className
    canvas.width = FRAME.width * scale
    canvas.height = FRAME.height * scale
    const context = canvas.getContext('2d')
    if (context) {
      context.imageSmoothingEnabled = false
      context.drawImage(portrait.image, portrait.sx, portrait.sy, FRAME.width, FRAME.height, 0, 0, canvas.width, canvas.height)
    }
    return canvas
  }

  function enemyPortrait(spec: EnemySpec, scale = PORTRAIT_SCALE, className = 'card-portrait') {
    const cell = options.art.portrait(specLook(spec))
    const canvas = portraitCanvas({ image: cell.image, sx: cell.sx, sy: cell.sy }, scale, className)
    canvas.style.setProperty('--portrait-scale', String(specDef(spec).scale))
    return canvas
  }

  function button(label: string, keyLabel: string, primary: boolean) {
    const element = document.createElement('button')
    element.type = 'button'
    element.className = `ui-btn card-button${primary ? ' card-button-primary' : ''}`
    if (primary) element.dataset.variant = 'primary'
    element.innerHTML = `<span>${label}</span>${options.touch ? '' : `<kbd>${keyLabel}</kbd>`}`
    element.addEventListener('pointerdown', (event) => event.stopPropagation())
    return element
  }

  function coreLine(core: Core) {
    const element = ELEMENTS[core.element]
    const cls = CLASSES[core.cls]
    return `<span class="core-line">${emblem(options, core.element, 'emblem emblem-xs')}<b>${element.name}</b>${classEmblem(options, core.cls, 'emblem emblem-xs')}<b>${cls.name}</b></span>`
  }

  function briefing(mission: Mission, site: Site | null, lineup: Lineup, core: Core, handlers: BriefingHandlers, secret: Part | null = null, hand: readonly CardId[] | null | undefined = undefined) {
    briefingExtras = { secret, hand }
    const card = document.createElement('article')
    card.className = 'card card-briefing ui-panel'
    card.dataset.kind = mission.kind
    card.dataset.boss = String(Boolean(mission.boss))
    card.style.setProperty('--card-image', backdrop(mission))
    const where = mission.kind === 'main' ? `${ARENA.name} · fim da Avenida do Cristal` : site ? `${site.name} · ${site.district}` : ''
    const specs = lineup.rounds.flat()
    const rounds = lineup.rounds.length
    card.innerHTML = `
      <div class="card-art" aria-hidden="true">
        <div class="card-art-mark">
          <img src="${emblemPath(options.assetBase, mission.kind === 'main' ? 'arena' : 'mission')}" alt="" width="68" height="68" decoding="async">
          <span>${mission.kind === 'main' ? (mission.boss ? `Campeão · Nível ${mission.level}` : `Luta oficial · Nível ${mission.level}`) : 'Fuga em curso'}<b>${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} · ${specs.length} ${specs.length === 1 ? 'adversário' : 'adversários'}</b></span>
        </div>
      </div>
      <div class="card-body">
        <span class="card-kicker">${mission.kind === 'main' ? 'Missão principal' : 'Missão secundária'} · ${where}</span>
        <h2 class="card-title">${mission.title}</h2>
        <p class="card-tagline">${mission.tagline}</p>
        <p class="card-text">${mission.description}</p>
        <div class="card-arena-level">
          <span class="card-level-badge"><b>Nv. ${lineup.level}</b><small>${lineup.rank}</small></span>
          <span class="card-level-text">${lineup.reason}<br>Seu núcleo: ${coreLine(core)}</span>
        </div>
        ${
          hand === undefined
            ? ''
            : `<div class="card-hand" data-draft="${hand === null}">
          <span class="card-hand-label">${hand === null ? 'Contra o campeão' : 'Sua mão'}</span>
          <div class="card-hand-cards"></div>
          <p class="card-hand-note">${
            hand === null
              ? `Antes do sino, o tablet sorteia 5 cartas do seu baralho e você leva ${HAND_SIZE}.`
              : hand.length
                ? 'As cartas que sobem ao ringue. Troque na Oficina do Cristal.'
                : 'Mão vazia: monte a sua na Oficina do Cristal.'
          }</p>
        </div>`
        }
        <ul class="card-roster" aria-label="Adversários"></ul>
        <div class="card-reward">
          <span>${mission.boss ? 'Grande prêmio' : 'Prêmio'}</span><b>${formatCredits(lineup.prize)} ¢</b>
          ${mission.firstBonus ? `<span class="card-reward-bonus">+${formatCredits(mission.firstBonus)} na primeira vez</span>` : ''}
          <span class="card-reward-note">+ a sucata de cada robô</span>
          ${secret ? `<span class="card-reward-secret"><img src="${emblemPath(options.assetBase, 'secret')}" alt="" width="22" height="22" decoding="async">Uma peça secreta na primeira limpeza</span>` : ''}
        </div>
        <div class="card-actions"></div>
      </div>
    `
    const handBox = card.querySelector('.card-hand-cards')
    if (handBox && hand) hand.forEach((id, slot) => handBox.append(cardFace(id, { assetBase: options.assetBase, slot })))
    else if (handBox) for (let index = 0; index < 5; index++) handBox.append(Object.assign(document.createElement('span'), { className: 'card-hand-back' }))
    const rosterList = card.querySelector('.card-roster') as HTMLElement
    specs.forEach((spec, index) => {
      const item = document.createElement('li')
      item.style.setProperty('--el', rgb(ELEMENTS[spec.element].color))
      item.append(enemyPortrait(spec, 2, 'card-roster-portrait'))
      const text = document.createElement('span')
      const result = effectiveness(core.element, spec.element)
      text.innerHTML = `<b>${specDef(spec).name}</b><small>${spec.boss ? 'Campeão · ' : ''}Nv. ${spec.level} · ${ELEMENTS[spec.element].name} · ${CLASSES[spec.cls].name}</small>${
        result === 'super' ? '<em data-effect="super">vantagem</em>' : effectiveness(spec.element, core.element) === 'super' ? '<em data-effect="danger">perigo</em>' : ''
      }`
      item.append(text)
      item.insertAdjacentHTML('afterbegin', emblem(options, spec.element, 'emblem emblem-badge'))
      item.title = `Examinar ${specDef(spec).name}`
      item.dataset.boss = String(Boolean(spec.boss))
      item.addEventListener('click', () => dossier(mission, site, lineup, core, handlers, index))
      rosterList.append(item)
    })
    const examine = document.createElement('li')
    examine.className = 'card-roster-examine'
    const examineButton = button('Examinar', 'X', false)
    examineButton.addEventListener('click', () => dossier(mission, site, lineup, core, handlers, 0))
    examine.append(examineButton)
    rosterList.append(examine)
    const actions = card.querySelector('.card-actions') as HTMLElement
    const accept = button(mission.kind === 'main' ? 'Entrar no ringue' : 'Aceitar', 'E', true)
    const decline = button(handlers.declineLabel ?? 'Agora não', 'Esc', false)
    accept.addEventListener('click', () => handlers.accept())
    decline.addEventListener('click', () => handlers.decline())
    actions.append(accept, decline)
    show(card, true, (event) => {
      if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        handlers.accept()
        return true
      }
      if (event.code === 'KeyX') {
        dossier(mission, site, lineup, core, handlers, 0)
        return true
      }
      if (event.code === 'Escape') {
        handlers.decline()
        return true
      }
      return false
    })
    accept.focus({ preventScroll: true })
  }

  function dossier(mission: Mission, site: Site | null, lineup: Lineup, core: Core, handlers: BriefingHandlers, start: number) {
    const specs = lineup.rounds.flat()
    let index = Math.max(0, Math.min(specs.length - 1, start))
    const card = document.createElement('article')
    card.className = 'card card-dossier ui-panel'
    card.innerHTML = `
      <header class="dossier-head">
        <span class="card-kicker">Dossiê do adversário · ${mission.title}</span>
        <div class="dossier-pager" ${specs.length > 1 ? '' : 'hidden'}>
          <button type="button" class="dossier-nav" data-step="-1" aria-label="Adversário anterior">${ICONS.left}</button>
          <span class="dossier-count" aria-live="polite"></span>
          <button type="button" class="dossier-nav" data-step="1" aria-label="Próximo adversário">${ICONS.right}</button>
        </div>
      </header>
      <div class="dossier-holder"></div>
      <div class="card-actions dossier-actions"></div>
    `
    const holder = card.querySelector('.dossier-holder') as HTMLElement
    const count = card.querySelector('.dossier-count') as HTMLElement
    const render = () => {
      const spec = specs[index]
      const round = lineup.rounds.findIndex((list) => list.includes(spec))
      count.textContent = `${index + 1} de ${specs.length}${lineup.rounds.length > 1 ? ` · rodada ${round + 1}` : ''}`
      holder.replaceChildren(dossierPage(spec, { assetBase: options.assetBase, art: options.art, core }))
    }
    const step = (delta: number) => {
      if (specs.length < 2) return
      index = (index + delta + specs.length) % specs.length
      render()
    }
    for (const nav of card.querySelectorAll<HTMLButtonElement>('.dossier-nav')) {
      nav.addEventListener('pointerdown', (event) => event.stopPropagation())
      nav.addEventListener('click', () => step(Number(nav.dataset.step)))
    }
    const back = () => briefing(mission, site, lineup, core, handlers, briefingExtras.secret, briefingExtras.hand)
    const actions = card.querySelector('.dossier-actions') as HTMLElement
    const accept = button(mission.kind === 'main' ? 'Entrar no ringue' : 'Aceitar', 'E', true)
    const ret = button('Voltar', 'Esc', false)
    accept.addEventListener('click', () => handlers.accept())
    ret.addEventListener('click', back)
    actions.append(accept, ret)
    render()
    show(card, true, (event) => {
      if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        handlers.accept()
        return true
      }
      if (event.code === 'Escape' || event.code === 'KeyX' || event.code === 'Backspace') {
        back()
        return true
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        step(1)
        return true
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        step(-1)
        return true
      }
      return false
    })
    accept.focus({ preventScroll: true })
  }

  function draft(mission: Mission, offer: readonly CardId[], handlers: DraftHandlers) {
    const need = Math.min(HAND_SIZE, offer.length)
    const picked: CardId[] = []
    let focus = 0
    const card = document.createElement('article')
    card.className = 'card card-draft ui-panel'
    card.style.setProperty('--card-image', backdrop(mission))
    card.innerHTML = `
      <div class="draft-aura" aria-hidden="true"></div>
      <header class="draft-head">
        <span class="card-kicker">${mission.boss ? `Campeão · Nível ${mission.level}` : 'Luta decisiva'} · ${mission.title}</span>
        <h2 class="card-title draft-title">Escolha <em>${need}</em> de ${offer.length}</h2>
        <p class="card-tagline">O tablet só aguenta ${need} cartas contra um campeão. Estas saíram do seu baralho.</p>
      </header>
      <ul class="draft-row" role="listbox" aria-multiselectable="true" aria-label="Cartas sorteadas"></ul>
      <div class="draft-info" aria-live="polite">
        <b class="draft-info-name"></b>
        <small class="draft-info-meta"></small>
        <span class="draft-info-text"></span>
      </div>
      <footer class="draft-foot">
        <div class="draft-pips" aria-hidden="true">${Array.from({ length: need }, () => '<i></i>').join('')}</div>
        <div class="card-actions draft-actions"></div>
      </footer>
    `
    const row = card.querySelector('.draft-row') as HTMLElement
    const pips = [...card.querySelectorAll<HTMLElement>('.draft-pips i')]
    const infoName = card.querySelector('.draft-info-name') as HTMLElement
    const infoMeta = card.querySelector('.draft-info-meta') as HTMLElement
    const infoText = card.querySelector('.draft-info-text') as HTMLElement
    const buttons: HTMLButtonElement[] = []
    const faces: HTMLElement[] = []
    const describe = (index: number) => {
      const id = offer[index]
      if (!id) return
      const detail = cardDetail(id)
      infoName.textContent = detail.name
      infoMeta.textContent = detail.meta
      infoText.textContent = detail.text
    }
    const actions = card.querySelector('.draft-actions') as HTMLElement
    const go = button(mission.kind === 'main' ? 'Entrar no ringue' : 'Confirmar', 'Enter', true)
    const leave = button(handlers.backLabel ?? 'Voltar', 'Esc', false)
    const sync = () => {
      buttons.forEach((element, index) => {
        const slot = picked.indexOf(offer[index])
        element.dataset.picked = String(slot >= 0)
        element.setAttribute('aria-selected', String(slot >= 0))
        setFaceSlot(faces[index], slot >= 0 ? slot : null)
      })
      pips.forEach((pip, index) => {
        pip.dataset.on = String(index < picked.length)
      })
      const ready = picked.length === need
      go.setAttribute('aria-disabled', String(!ready))
      card.dataset.ready = String(ready)
    }
    const nudge = (target: HTMLElement, flag: string) => {
      target.dataset[flag] = 'false'
      void target.offsetWidth
      target.dataset[flag] = 'true'
    }
    const toggle = (index: number) => {
      const id = offer[index]
      if (!id) return
      focus = index
      describe(index)
      const at = picked.indexOf(id)
      if (at >= 0) picked.splice(at, 1)
      else if (picked.length < need) picked.push(id)
      else {
        options.cue?.('deny')
        nudge(card, 'full')
        return
      }
      options.cue?.(at >= 0 ? 'select' : 'equip')
      sync()
    }
    const confirm = () => {
      if (picked.length !== need) {
        options.cue?.('deny')
        nudge(card, 'full')
        return
      }
      handlers.confirm([...picked])
    }
    offer.forEach((id, index) => {
      const item = document.createElement('li')
      item.style.setProperty('--i', String(index))
      const pick = document.createElement('button')
      pick.type = 'button'
      pick.className = 'draft-card'
      pick.setAttribute('role', 'option')
      pick.setAttribute('aria-label', `${CARDS[id].name}. ${cardDetail(id).meta}`)
      const inner = document.createElement('span')
      inner.className = 'draft-card-inner'
      const face = cardFace(id, { assetBase: options.assetBase })
      const reverse = document.createElement('span')
      reverse.className = 'draft-card-back'
      reverse.setAttribute('aria-hidden', 'true')
      reverse.innerHTML = '<i></i>'
      inner.append(face, reverse)
      pick.append(inner)
      if (!options.touch) pick.insertAdjacentHTML('beforeend', `<kbd class="draft-card-key">${index + 1}</kbd>`)
      pick.addEventListener('pointerdown', (event) => event.stopPropagation())
      pick.addEventListener('click', () => toggle(index))
      pick.addEventListener('pointerenter', () => describe(index))
      pick.addEventListener('focus', () => {
        focus = index
        describe(index)
      })
      item.append(pick)
      row.append(item)
      buttons.push(pick)
      faces.push(face)
    })
    go.addEventListener('click', confirm)
    leave.addEventListener('click', () => handlers.back())
    actions.append(go, leave)
    sync()
    describe(0)
    const move = (step: number) => {
      focus = (focus + step + offer.length) % offer.length
      buttons[focus]?.focus({ preventScroll: true })
    }
    show(card, true, (event) => {
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code)
      if (digit) {
        const index = Number(digit[1]) - 1
        if (index < offer.length) {
          toggle(index)
          buttons[index]?.focus({ preventScroll: true })
        }
        return true
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        move(1)
        return true
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        move(-1)
        return true
      }
      if (event.code === 'Space' || event.code === 'KeyE') {
        toggle(focus)
        return true
      }
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (picked.length === need) confirm()
        else toggle(focus)
        return true
      }
      if (event.code === 'Escape') {
        handlers.back()
        return true
      }
      return false
    })
    buttons[0]?.focus({ preventScroll: true })
  }

  function cutin(info: CutIn) {
    const card = CARDS[info.card]
    if (info.side === 'enemy' && info.phase === 'charge') {
      showCallout(`<b>${info.actor}</b> prepara <b>${card.name}</b>`, card.art, ELEMENTS[info.element].color)
      return
    }
    if (info.side === 'enemy' && card.kind === 'special') return
    if (cutTimer) clearTimeout(cutTimer)
    const element = ELEMENTS[info.element]
    cut.dataset.visible = 'false'
    cut.dataset.leaving = 'false'
    cut.dataset.side = info.side
    cut.dataset.kind = card.kind
    cut.style.setProperty('--el', rgb(element.color))
    cut.style.setProperty('--el-glow', rgb(element.glow))
    cut.style.setProperty('--accent', rgb(card.accent))
    cut.style.setProperty('--cutin-art', `url('${options.assetBase}${card.art}')`)
    cutKicker.textContent = `${info.actor} usou · ${card.kind === 'special' ? 'carta especial' : 'transformação'}`
    cutName.textContent = card.name
    cutTitle.textContent = card.title
    cutEmblem.src = `${options.assetBase}${element.icon}`
    cutEmblem.alt = element.name
    void cut.offsetWidth
    cut.dataset.visible = 'true'
    cutTimer = setTimeout(() => {
      cut.dataset.visible = 'false'
      cutTimer = null
    }, CUTIN_MS[card.kind])
  }

  function showCallout(html: string, art: string, color: readonly number[]) {
    if (calloutTimer) clearTimeout(calloutTimer)
    callout.dataset.visible = 'false'
    callout.style.setProperty('--el', rgb(color))
    callout.style.setProperty('--callout-art', `url('${options.assetBase}${art}')`)
    calloutText.innerHTML = html
    void callout.offsetWidth
    callout.dataset.visible = 'true'
    calloutTimer = setTimeout(() => {
      callout.dataset.visible = 'false'
      calloutTimer = null
    }, CALLOUT_MS)
  }

  return {
    get open() {
      return open
    },

    briefing,

    draft,

    trail(progress, player, handlers) {
      const built = buildTrail({ assetBase: options.assetBase, touch: options.touch, art: options.art, progress, player }, handlers)
      show(built.card, true, built.keys)
      built.focus()
    },

    versus(mission, specs, player, core, lineup) {
      const card = document.createElement('article')
      card.className = 'card card-versus ui-panel'
      card.style.setProperty('--card-image', backdrop(mission))
      const mine = ELEMENTS[core.element]
      const lead = specs[0]
      card.style.setProperty('--el-left', rgb(mine.color))
      if (lead) card.style.setProperty('--el-right', rgb(ELEMENTS[lead.element].color))
      const edge = specs.find((spec) => effectiveness(core.element, spec.element) === 'super')
      const threat = specs.find((spec) => effectiveness(spec.element, core.element) === 'super')
      const ribbon = edge
        ? `<span class="versus-ribbon" data-effect="super">Vantagem · ${mine.name} › ${ELEMENTS[edge.element].name}</span>`
        : threat
          ? `<span class="versus-ribbon" data-effect="danger">Cuidado · ${ELEMENTS[threat.element].name} › ${mine.name}</span>`
          : `<span class="versus-ribbon">Elementos em equilíbrio</span>`
      card.innerHTML = `
        <div class="card-versus-side card-versus-player" style="--el:${rgb(mine.color)}">
          <div class="card-versus-figure"></div>
          <span class="card-versus-kicker">Desafiante</span>
          <strong class="card-versus-name">${BODY_NAME}</strong>
          <span class="versus-badges">${emblem(options, core.element, 'emblem emblem-md')}${classEmblem(options, core.cls, 'emblem emblem-md')}</span>
          <span class="card-versus-note">${mine.name} · ${CLASSES[core.cls].name}</span>
        </div>
        <div class="card-versus-mark"><span>VS</span><small>${mission.title}</small>${ribbon}</div>
        <div class="card-versus-side card-versus-enemy" style="--el:${lead ? rgb(ELEMENTS[lead.element].color) : '255 96 80'}">
          <div class="card-versus-figure card-versus-figures"></div>
          <span class="card-versus-kicker">${specs.length > 1 ? 'Adversários' : 'Adversário'} · Nv. ${lead?.level ?? lineup.level}</span>
          <strong class="card-versus-name"></strong>
          <span class="versus-badges"></span>
          <span class="card-versus-note"></span>
        </div>
      `
      ;(card.querySelector('.card-versus-player .card-versus-figure') as HTMLElement).append(portraitCanvas(player, 5))
      const figures = card.querySelector('.card-versus-figures') as HTMLElement
      for (const spec of specs.slice(0, 3)) figures.append(enemyPortrait(spec, 5))
      const counts = new Map<string, number>()
      for (const spec of specs) counts.set(specDef(spec).name, (counts.get(specDef(spec).name) ?? 0) + 1)
      ;(card.querySelector('.card-versus-enemy .card-versus-name') as HTMLElement).textContent = [...counts].map(([name, count]) => `${name}${count > 1 ? ` ×${count}` : ''}`).join(' + ')
      const badges = card.querySelector('.card-versus-enemy .versus-badges') as HTMLElement
      badges.innerHTML = specs.length === 1 && lead ? `${emblem(options, lead.element, 'emblem emblem-md')}${classEmblem(options, lead.cls, 'emblem emblem-md')}` : specs.map((spec) => emblem(options, spec.element, 'emblem emblem-md')).join('')
      ;(card.querySelector('.card-versus-enemy .card-versus-note') as HTMLElement).textContent =
        specs.length === 1 && lead ? `${ELEMENTS[lead.element].name} · ${CLASSES[lead.cls].name}` : specs.map((spec) => ELEMENTS[spec.element].name).join(' · ')
      show(card, false)
    },

    banner(kind, text, sub) {
      if (bannerTimer) clearTimeout(bannerTimer)
      banner.dataset.visible = 'false'
      banner.dataset.kind = kind
      bannerText.textContent = text
      bannerSub.textContent = sub ?? ''
      bannerSub.dataset.empty = String(!sub)
      void banner.offsetWidth
      requestAnimationFrame(() => {
        banner.dataset.visible = 'true'
      })
      bannerTimer = setTimeout(() => {
        banner.dataset.visible = 'false'
        bannerTimer = null
      }, BANNER_MS[kind])
      if (kind === 'victory' || kind === 'defeat' || kind === 'cleared') {
        if (calloutTimer) clearTimeout(calloutTimer)
        calloutTimer = null
        callout.dataset.visible = 'false'
        if (cut.dataset.visible === 'true') {
          if (cutTimer) clearTimeout(cutTimer)
          cut.dataset.leaving = 'true'
          cutTimer = setTimeout(() => {
            cut.dataset.visible = 'false'
            cut.dataset.leaving = 'false'
            cutTimer = null
          }, CUTIN_LEAVE_MS)
        }
      }
      if ((kind === 'round' || kind === 'fight') && stage.querySelector('.card-versus')) hideCard()
    },

    cutin,

    result(summary, handlers) {
      const card = document.createElement('article')
      card.className = 'card card-result ui-panel'
      card.dataset.outcome = summary.outcome
      card.style.setProperty('--card-image', backdrop(summary.mission))
      const won = summary.outcome === 'victory'
      const outcomeEmblem = emblemPath(options.assetBase, won ? 'victory' : 'defeat')
      const minutes = Math.floor(summary.seconds / 60)
      const seconds = Math.round(summary.seconds % 60)
      const clock = `${minutes}:${String(seconds).padStart(2, '0')}`
      const rows: [string, string][] = [
        ['Sucata recolhida', `${formatCredits(summary.bounties)} ¢`],
        ...(summary.reward ? ([['Prêmio da missão', `${formatCredits(summary.reward.reward)} ¢`]] as [string, string][]) : []),
        ...(summary.reward && summary.reward.bonus > 0 ? ([['Bônus de primeira vez', `${formatCredits(summary.reward.bonus)} ¢`]] as [string, string][]) : []),
      ]
      const { stats } = summary
      const feats: [string, number | string][] = [
        ['Super eficazes', stats.supers],
        ['Cartas usadas', stats.cards],
        ['Transformações', stats.forms],
        ['Condições aplicadas', stats.ailments],
        ['Aparos', stats.parries],
        ['Maior combo', stats.bestCombo ? `×${stats.bestCombo}` : '—'],
      ]
      card.innerHTML = `
        <div class="card-art" aria-hidden="true">
          <div class="card-art-mark"><img class="card-outcome-emblem" src="${outcomeEmblem}" alt="" width="220" height="220" decoding="async"></div>
        </div>
        <div class="card-body">
          <span class="card-kicker">${summary.mission.title} · ${clock}</span>
          <h2 class="card-title card-result-title">${won ? 'Vitória' : 'Derrota'}</h2>
          <p class="card-tagline">${
            won && summary.mission.outro
              ? summary.mission.outro
              : won
              ? summary.mission.kind === 'main'
                ? `A Liga inteira se levanta. ${summary.reward?.pending ? `O prêmio de ${formatCredits(summary.reward.pending)} ¢ é pago em fichas, jogadas aos seus pés na saída do ringue: recolha cada uma.` : 'Os créditos já estão na sua conta.'}`
                : `Os robôs em fuga viraram sucata e o bairro respira de novo.${summary.reward?.pending ? ` A recompensa de ${formatCredits(summary.reward.pending)} ¢ ficou em fichas pela rua: recolha antes de sair.` : ''}`
              : 'O núcleo apagou antes do fim. A sucata que você juntou continua sua.'
          }</p>
          <ul class="card-feats">${feats.map(([label, value]) => `<li><b>${value}</b><span>${label}</span></li>`).join('')}</ul>
          <dl class="card-tally">
            ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
            <div class="card-tally-total"><dt>Total</dt><dd>${formatCredits(summary.reward ? summary.reward.total : summary.bounties)} ¢</dd></div>
          </dl>
          <p class="card-stats">${summary.kills} ${summary.kills === 1 ? 'robô sucateado' : 'robôs sucateados'}${won && summary.mission.kind === 'main' ? ' · próxima luta liberada no ringue da Liga' : ''}</p>
          <div class="card-actions"></div>
        </div>
      `
      const secret = summary.reward?.secret ?? null
      if (secret) {
        const prize = document.createElement('div')
        prize.className = 'card-secret'
        prize.innerHTML = `
          <img class="card-secret-emblem" src="${emblemPath(options.assetBase, 'secret')}" alt="" width="44" height="44" decoding="async">
          <span class="card-secret-frame"></span>
          <span class="card-secret-text"><span class="card-kicker">Peça secreta desbloqueada</span><b>${secret.name}</b><small>${SLOT_SINGULAR[secret.slot]} · já está no seu depósito, na aba Secretas da Oficina</small></span>
        `
        const icon = options.partIcon?.(secret.id, secret.name, 56)
        if (icon) (prize.querySelector('.card-secret-frame') as HTMLElement).append(icon)
        ;(card.querySelector('.card-tally') as HTMLElement).before(prize)
      }
      const clue = summary.reward?.clue ?? null
      if (clue) {
        const note = document.createElement('div')
        note.className = 'card-secret'
        note.dataset.kind = 'clue'
        note.innerHTML = `
          <img class="card-secret-emblem" src="${emblemPath(options.assetBase, 'secret')}" alt="" width="44" height="44" decoding="async">
          <span class="card-secret-text"><span class="card-kicker">Nova pista na estante</span><b>Peça secreta · ${SLOT_SINGULAR[clue.slot]}</b><small>A estante de casa revelou onde procurar. Ela não brilha de longe: chegue bem perto.</small></span>
        `
        ;(card.querySelector('.card-tally') as HTMLElement).before(note)
      }
      const garage = summary.garage ?? null
      if (garage && garage.coins > 0) {
        const parts = [
          `vitória ${formatAmount(garage.base)}`,
          garage.style ? `estilo ${formatAmount(garage.style)}` : '',
          garage.flawless ? `sem dano ${formatAmount(garage.flawless)}` : '',
          garage.rich ? `Rico +${formatAmount(garage.rich)}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
        const block = document.createElement('div')
        block.className = 'card-garage'
        block.innerHTML = `
          <img class="card-garage-coin" src="${currencyIcon(options.assetBase, 'coins')}" alt="" width="52" height="52" decoding="async">
          <span class="card-secret-text"><span class="card-kicker">Mecânica dos Irmãos${garage.boss ? ' · bônus de campeão' : ''}</span><b class="card-garage-value">+0 moedas de ferro</b><small>${parts}</small></span>
          ${
            garage.fragments
              ? `<span class="card-garage-fragments"><img src="${currencyIcon(options.assetBase, 'fragments')}" alt="" width="34" height="34" decoding="async"><b>+${garage.fragments}</b><small>${garage.fragments === 1 ? 'fragmento' : 'fragmentos'}</small></span>`
              : ''
          }
        `
        ;(card.querySelector('.card-tally') as HTMLElement).before(block)
        const value = block.querySelector('.card-garage-value') as HTMLElement
        const total = garage.coins
        let started = 0
        const count = (now: number) => {
          if (!started) started = now
          const t = Math.min(1, (now - started) / 1100)
          value.textContent = `+${formatAmount(Math.round(total * (1 - Math.pow(1 - t, 3))))} moedas de ferro`
          if (t < 1 && block.isConnected) requestAnimationFrame(count)
        }
        requestAnimationFrame(count)
      }
      if (summary.wear.length) {
        const worst = summary.wear.reduce((low, entry) => (entry.after < low.after ? entry : low))
        const tier = conditionTier(worst.after)
        const block = document.createElement('div')
        block.className = 'card-wear'
        block.dataset.tier = tier
        block.innerHTML = `
          <div class="card-wear-head">
            <img src="${emblemPath(options.assetBase, 'capsule')}" alt="" width="40" height="40" decoding="async">
            <span class="card-secret-text"><span class="card-kicker">Desgaste das peças</span><b>${
              tier === 'boa' ? 'Arranhões de luta' : tier === 'desgastada' ? 'Peças desgastadas' : tier === 'danificada' ? 'Peças danificadas' : 'Peça quebrada'
            }</b><small>${
              tier === 'boa'
                ? 'Nada grave ainda. A Cápsula, em casa, deixa tudo novo por poucos créditos.'
                : tier === 'desgastada'
                  ? 'Peças desgastadas rendem 75% dos bônus. Passe na Cápsula, em casa, antes da próxima luta.'
                  : 'Peças danificadas rendem metade dos bônus (quebradas, nada). Repare na Cápsula, em casa.'
            }</small></span>
          </div>
          <ul class="card-wear-list"></ul>
        `
        const list = block.querySelector('.card-wear-list') as HTMLElement
        for (const entry of summary.wear) {
          const item = document.createElement('li')
          item.dataset.tier = conditionTier(entry.after)
          item.innerHTML = `<span class="card-wear-frame"></span><span class="card-wear-name"><b>${entry.part.name}</b><small>${SLOT_SINGULAR[entry.part.slot]} · ${TIER_LABEL[conditionTier(entry.after)]}</small></span><span class="card-wear-bar" aria-hidden="true"><i style="--from:${entry.before};--to:${entry.after}"></i></span><span class="card-wear-value">${entry.before}<i>›</i><b>${entry.after}%</b></span>`
          item.setAttribute('aria-label', `${entry.part.name}: condição de ${entry.before} para ${entry.after} por cento`)
          const icon = options.partIcon?.(entry.part.id, entry.part.name, 40)
          if (icon) (item.querySelector('.card-wear-frame') as HTMLElement).append(icon)
          list.append(item)
        }
        ;(card.querySelector('.card-stats') as HTMLElement).before(block)
      }
      const actions = card.querySelector('.card-actions') as HTMLElement
      const go = button(won ? 'Continuar' : 'Recuar', won ? 'E' : 'Esc', won)
      go.addEventListener('click', () => handlers.continue())
      if (!won && handlers.retry) {
        const retry = button('Tentar de novo', 'R', true)
        retry.addEventListener('click', () => handlers.retry?.())
        actions.append(retry)
      }
      actions.append(go)
      show(card, true, (event) => {
        if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
          if (won || !handlers.retry) handlers.continue()
          else handlers.retry()
          return true
        }
        if (event.code === 'Escape') {
          handlers.continue()
          return true
        }
        if (event.code === 'KeyR' && handlers.retry) {
          handlers.retry()
          return true
        }
        return false
      })
      ;(actions.querySelector('.card-button-primary') as HTMLButtonElement | null)?.focus({ preventScroll: true })
    },

    hide: hideCard,

    handleKey(event) {
      return keys ? keys(event) : false
    },

    destroy() {
      for (const timer of [bannerTimer, cutTimer, calloutTimer]) if (timer) clearTimeout(timer)
      root.remove()
    },
  }
}

export function robotPortrait(sheet: CanvasImageSource): Portrait {
  return { image: sheet, sx: 0, sy: ROW.s * FRAME.height }
}
