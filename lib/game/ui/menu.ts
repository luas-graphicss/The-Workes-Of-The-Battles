import type { Sound } from '../audio'
import { GAME_TITLE, titleMarkup } from '../brand'
import { BIND_GROUPS, BIND_LABEL, bindKey, clearKey, codesFor, isDefaultKeys, keyLabel, labelFor, resetKeys, RESERVED_CODES } from '../bindings'
import { SHAKE_LEVELS, UI_SCALES, settings, type BindAction, type Settings } from '../settings'
import { formatCredits } from '../robot/parts'
import { element, emblemPath, holdToConfirm, ICONS, trackScrollEdges, type HoldControl } from './kit'

export type SaveSummary = {
  credits: number
  wins: number
  losses: number
  next: string
  core: { element: string; cls: string }
}

export type MenuHandlers = {
  continueGame(): void
  newGame(): void
  resume(): void
  quitToTitle(): void
}

export type Menu = {
  readonly open: boolean
  readonly mode: MenuMode | null
  showTitle(save: SaveSummary | null): void
  showPause(save: SaveSummary, options: { canQuit: boolean }): void
  close(): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  confirm(): void
  destroy(): void
}

type MenuMode = 'title' | 'pause'
type Screen = 'main' | 'settings' | 'controls' | 'credits' | 'confirm'
type Action = 'continue' | 'new' | 'resume' | 'settings' | 'controls' | 'credits' | 'quit'

type RangeKey = 'master' | 'ambience' | 'effects'
type SwitchKey = 'hud' | 'marker' | 'hints' | 'fps' | 'muted' | 'mouseAim'
type StepKey = 'uiScale' | 'shake' | 'motion' | 'mouseSwap' | 'stick'
type Row =
  | { kind: 'range'; key: RangeKey; label: string; hint: string }
  | { kind: 'switch'; key: SwitchKey; label: string; hint: string; inverted?: boolean }
  | { kind: 'stepper'; key: StepKey; label: string; hint: string; options: { value: Settings[StepKey]; text: string }[] }
  | { kind: 'fullscreen'; label: string; hint: string }

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Áudio',
    rows: [
      { kind: 'switch', key: 'muted', label: 'Som', hint: 'Também liga e desliga com a tecla M.', inverted: true },
      { kind: 'range', key: 'master', label: 'Volume geral', hint: 'Toda a mixagem do jogo.' },
      { kind: 'range', key: 'ambience', label: 'Ambiente', hint: 'Grilos, vento, pássaros e o fogo da cratera.' },
      { kind: 'range', key: 'effects', label: 'Efeitos', hint: 'Golpes, cartas, portas, moedas e a interface.' },
    ],
  },
  {
    title: 'Interface',
    rows: [
      {
        kind: 'stepper',
        key: 'uiScale',
        label: 'Tamanho da interface',
        hint: 'Textos, botões e painéis.',
        options: UI_SCALES.map((value) => ({ value, text: `${value}%` })),
      },
      {
        kind: 'stepper',
        key: 'motion',
        label: 'Animações da interface',
        hint: 'Reduzidas tira os deslizes e brilhos dos painéis.',
        options: [
          { value: 'full', text: 'Completas' },
          { value: 'reduced', text: 'Reduzidas' },
        ],
      },
      { kind: 'switch', key: 'hud', label: 'HUD completa', hint: 'Desligada, sobram só os créditos e o botão de menu.' },
      { kind: 'switch', key: 'fps', label: 'Contador de FPS', hint: 'Quadros por segundo no canto da tela.' },
      { kind: 'fullscreen', label: 'Tela cheia', hint: 'Esconde as barras do navegador.' },
    ],
  },
  {
    title: 'Jogo',
    rows: [
      { kind: 'switch', key: 'marker', label: 'Marcador de objetivo', hint: 'O emblema que flutua sobre o destino e segue a borda da tela.' },
      { kind: 'switch', key: 'hints', label: 'Dicas na tela', hint: 'As faixas de ajuda na parte de baixo.' },
      {
        kind: 'stepper',
        key: 'shake',
        label: 'Tremor nas lutas',
        hint: 'O chacoalhar da câmera nos golpes pesados.',
        options: SHAKE_LEVELS.map((value) => ({ value, text: value === 0 ? 'Desligado' : value === 50 ? 'Suave' : 'Forte' })),
      },
    ],
  },
]

const keys = (...labels: string[]) => labels.map((label) => `<kbd>${label}</kbd>`).join('')

const CONTROL_SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Mouse',
    rows: [
      { kind: 'switch', key: 'mouseAim', label: 'Seguir o mouse', hint: 'Na luta, o robô mira golpes e tiros para onde o cursor aponta.' },
      {
        kind: 'stepper',
        key: 'mouseSwap',
        label: 'Botões do mouse',
        hint: 'Golpe e tiro nos botões do mouse durante a luta.',
        options: [
          { value: false, text: 'Esq. golpe · Dir. tiro' },
          { value: true, text: 'Esq. tiro · Dir. golpe' },
        ],
      },
    ],
  },
  {
    title: 'Toque',
    rows: [
      {
        kind: 'stepper',
        key: 'stick',
        label: 'Analógico',
        hint: 'Fixo fica sempre no canto inferior esquerdo; livre nasce onde o dedo toca.',
        options: [
          { value: 'fixed', text: 'Fixo' },
          { value: 'float', text: 'Onde tocar' },
        ],
      },
    ],
  },
]

const REFERENCE: { title: string; rows: () => [string, string][] }[] = [
  {
    title: 'Painéis de missão',
    rows: () => [
      ['Aceitar', `${keys(labelFor('interact'))}<span>ou</span>${keys('Enter')}`],
      ['Examinar adversários', keys('X')],
      ['Recusar e voltar', keys('Esc')],
      ['Tentar de novo', keys('R')],
      ['Som', keys('M')],
    ],
  },
  {
    title: 'Toque e controle',
    rows: () => [
      ['Andar', '<span>Analógico no canto inferior esquerdo · direcional do controle</span>'],
      ['Entrar', '<span>Toque no aviso da porta · botão A</span>'],
      ['Lutar', '<span>Tablet de combate à direita · A golpe, B esquiva, X tiro, Y carta, LB defesa</span>'],
      ['Habilidades', '<span>Botões da Mecânica na tela · no controle, segure LT: A, X e Y chips, LB e RB montagens, B Fúria · direcional na sequência</span>'],
    ],
  },
]

const BIND_SLOTS = 2
const CODE_SHAPE = /^[A-Za-z0-9]{1,24}$/

const CREDITS: [string, string][] = [
  ['Jogo', `${GAME_TITLE} · Capítulo I, A Queda`],
  ['Diretor do jogo', 'Kaio'],
  ['Programador principal', 'Pedro'],
  ['Programador ajudante', 'Jurisvaldo'],
  ['GameTest', 'Anônimo'],
  ['Roteirista', 'Requiem'],
  ['Artístico 2D', 'Shocker'],
  ['Fonte das artes 2D principais', 'IA Generativa Nano Banana'],
]

const FOCUSABLE = '[data-nav]:not([disabled])'
const BACKDROP_FADE_MS = 500

export function createMenu(
  surface: HTMLElement,
  options: {
    assetBase: string
    touch: boolean
    sound: Sound
    version: string
    handlers: MenuHandlers

    backdrop?: () => HTMLElement
  },
): Menu {
  const root = element('div', 'menu')
  root.dataset.visible = 'false'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'Menu do jogo')
  root.innerHTML = `
    <div class="menu-scene" aria-hidden="true">
      <img class="menu-keyart" src="${options.assetBase}assets/ui/menu/keyart.webp" alt="" decoding="async">
    </div>
    <div class="menu-shell">
      <header class="menu-brand">
        <span class="menu-crest-wrap" aria-hidden="true">
          <img class="menu-crest" src="${emblemPath(options.assetBase, 'crest')}" alt="" width="76" height="76" decoding="async">
        </span>
        <div class="menu-brand-text">
          <p class="menu-chapter">Capítulo I · A Queda</p>
          <h1 class="menu-wordmark">${titleMarkup('menu-wordmark')}</h1>
        </div>
      </header>
      <div class="menu-body">
        <nav class="menu-list" data-screen-for="main" aria-label="Menu principal"></nav>
        <section class="menu-panel ui-panel" data-screen-for="settings" aria-labelledby="menu-settings-title" hidden></section>
        <section class="menu-panel ui-panel" data-screen-for="controls" aria-labelledby="menu-controls-title" hidden></section>
        <section class="menu-panel ui-panel" data-screen-for="credits" aria-labelledby="menu-credits-title" hidden></section>
        <section class="menu-panel menu-confirm ui-panel" data-screen-for="confirm" role="alertdialog" aria-labelledby="menu-confirm-title" hidden></section>
      </div>
      <footer class="menu-footer">
        <span class="menu-legend">${
          options.touch
            ? 'Toque para escolher'
            : `${keys('↑', '↓')}<span>navegar</span>${keys('Enter')}<span>escolher</span>${keys('Esc')}<span>voltar</span>`
        }</span>
        <span class="menu-version">v${options.version}</span>
      </footer>
    </div>
    <aside class="menu-status ui-panel" aria-label="Situação do robô" hidden></aside>
  `
  surface.append(root)

  const list = root.querySelector('.menu-list') as HTMLElement
  const sceneLayer = root.querySelector('.menu-scene') as HTMLElement
  const chapter = root.querySelector('.menu-chapter') as HTMLElement

  let backdrop: HTMLElement | null = null
  let backdropTimer: ReturnType<typeof setTimeout> | null = null
  function mountBackdrop() {
    unmountBackdrop()
    if (!options.backdrop) return
    backdrop = options.backdrop()
    sceneLayer.prepend(backdrop)
  }
  function unmountBackdrop(delay = 0) {
    if (backdropTimer) clearTimeout(backdropTimer)
    backdropTimer = null
    const current = backdrop
    backdrop = null
    if (!current) return
    if (delay <= 0) current.remove()
    else backdropTimer = setTimeout(() => current.remove(), delay)
  }

  const panels = new Map<Screen, HTMLElement>()
  for (const panel of root.querySelectorAll<HTMLElement>('[data-screen-for]')) panels.set(panel.dataset.screenFor as Screen, panel)
  const status = root.querySelector('.menu-status') as HTMLElement

  let mode: MenuMode | null = null
  let screen: Screen = 'main'
  let save: SaveSummary | null = null
  let canQuit = true
  let returnFocus: Action | null = null
  let hold: HoldControl | null = null
  const cleanups: (() => void)[] = []
  const panelCleanups: (() => void)[] = []
  const settingControls: (() => void)[] = []
  let listening: { button: HTMLButtonElement; action: BindAction; slot: number } | null = null

  const stop = (event: Event) => event.stopPropagation()
  root.addEventListener('pointerdown', stop)
  cleanups.push(() => root.removeEventListener('pointerdown', stop))

  const follow = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    const target = (event.target as HTMLElement).closest<HTMLElement>(FOCUSABLE)
    if (target && root.contains(target) && target !== document.activeElement) target.focus({ preventScroll: true })
  }
  root.addEventListener('pointermove', follow)
  cleanups.push(() => root.removeEventListener('pointermove', follow))

  function cue() {
    options.sound.cue('select')
  }

  function item(action: Action, label: string, meta: string, variant: 'primary' | 'default' = 'default', disabled = false) {
    const button = element('button', 'menu-item')
    button.type = 'button'
    button.dataset.nav = ''
    button.dataset.action = action
    if (variant === 'primary') button.dataset.variant = 'primary'
    if (disabled) button.setAttribute('aria-disabled', 'true')
    button.innerHTML = `<span class="menu-item-label">${label}</span><span class="menu-item-meta">${meta}</span>`
    button.addEventListener('click', () => {
      if (disabled) {
        options.sound.cue('deny')
        return
      }
      cue()
      run(action)
    })
    return button
  }

  function buildList() {
    list.replaceChildren()
    const entries: HTMLButtonElement[] = []
    if (mode === 'title') {
      if (save) {
        entries.push(
          item(
            'continue',
            'Continuar',
            `${formatCredits(save.credits)} ¢ · ${save.wins} ${save.wins === 1 ? 'vitória' : 'vitórias'} · próxima: ${save.next}`,
            'primary',
          ),
        )
      }
      entries.push(item('new', 'Novo jogo', save ? 'Apaga o progresso e o meteoro cai de novo' : 'O meteoro cai sobre Bosque Alto', save ? 'default' : 'primary'))
    } else {
      entries.push(item('resume', 'Retomar', 'Volta para onde você parou', 'primary'))
    }
    entries.push(item('settings', 'Configurações', 'Som, interface e jogo'))
    entries.push(item('controls', 'Controles', 'Teclado, toque e controle'))
    if (mode === 'title') entries.push(item('credits', 'Créditos', 'A equipe que forjou o jogo'))
    else entries.push(item('quit', 'Menu inicial', canQuit ? 'Seu progresso fica salvo' : 'Termine a luta primeiro', 'default', !canQuit))
    entries.forEach((entry, index) => entry.style.setProperty('--index', String(index)))
    list.append(...entries)
  }

  function run(action: Action) {
    switch (action) {
      case 'continue':
        options.handlers.continueGame()
        return
      case 'resume':
        options.handlers.resume()
        return
      case 'new':
        if (save) openConfirm('new')
        else options.handlers.newGame()
        return
      case 'quit':
        openConfirm('quit')
        return
      default:
        returnFocus = action
        go(action)
    }
  }

  function disposePanel() {
    for (const cleanup of panelCleanups.splice(0)) cleanup()
  }

  function go(next: Screen, focusAction: Action | null = null) {
    disposePanel()
    screen = next
    root.dataset.screen = next
    for (const [name, panel] of panels) panel.hidden = name !== next
    if (next === 'settings') buildSettings()
    if (next === 'controls') buildControls()
    if (next === 'credits') buildCredits()
    const target = focusAction ? list.querySelector<HTMLElement>(`[data-action='${focusAction}']`) : null
    requestAnimationFrame(() => (target ?? focusables()[0])?.focus({ preventScroll: true }))
  }

  function back() {
    if (screen !== 'main') {
      hold?.destroy()
      hold = null
      go('main', returnFocus)
      return
    }
    if (mode === 'pause') options.handlers.resume()
  }

  function panelHeader(id: string, kicker: string, title: string) {
    return `
      <header class="menu-panel-head">
        <span class="ui-kicker" data-mark>${kicker}</span>
        <h2 class="menu-panel-title" id="${id}">${title}</h2>
      </header>
    `
  }

  function backButton(panel: HTMLElement, label = 'Voltar') {
    const button = element('button', 'ui-btn menu-back')
    button.type = 'button'
    button.dataset.nav = ''
    button.innerHTML = `${ICONS.back}<span>${label}</span>${options.touch ? '' : '<kbd>Esc</kbd>'}`
    button.addEventListener('click', () => {
      cue()
      back()
    })
    panel.append(button)
    return button
  }

  function buildSettings() {
    const panel = panels.get('settings') as HTMLElement
    settingControls.length = 0
    panel.innerHTML = panelHeader('menu-settings-title', 'Ajustes', 'Configurações')
    const scroller = element('div', 'menu-settings')
    for (const section of SECTIONS) {
      const group = element('section', 'menu-group')
      group.innerHTML = `<h3 class="menu-group-title">${section.title}</h3>`
      for (const row of section.rows) {
        if (row.kind === 'fullscreen' && !document.fullscreenEnabled) continue
        group.append(settingRow(row))
      }
      scroller.append(group)
    }
    panel.append(scroller)
    panelCleanups.push(trackScrollEdges(scroller))
    const foot = element('div', 'menu-panel-foot')
    const reset = element('button', 'ui-btn')
    reset.type = 'button'
    reset.dataset.nav = ''
    reset.textContent = 'Restaurar padrões'
    reset.addEventListener('click', () => {
      cue()
      settings.reset()
      for (const sync of settingControls) sync()
    })
    foot.append(reset)
    panel.append(foot)
    backButton(foot)
  }

  function settingRow(row: Row) {
    const wrapper = element('div', 'menu-row')
    wrapper.dataset.kind = row.kind
    wrapper.innerHTML = `<span class="menu-row-text"><span class="menu-row-label">${row.label}</span><span class="menu-row-hint">${row.hint}</span></span>`
    const control = element('span', 'menu-row-control')
    wrapper.append(control)

    if (row.kind === 'range') {
      const input = element('input', 'menu-range')
      input.type = 'range'
      input.min = '0'
      input.max = '100'
      input.step = '5'
      input.dataset.nav = ''
      input.setAttribute('aria-label', row.label)
      const output = element('output', 'menu-range-value')
      const sync = () => {
        const value = settings.value[row.key]
        input.value = String(value)
        input.style.setProperty('--value', `${value}%`)
        output.textContent = String(value)
      }
      input.addEventListener('input', () => {
        settings.set(row.key, Number(input.value))
        sync()
      })
      sync()
      settingControls.push(sync)
      control.append(input, output)
    } else if (row.kind === 'switch' || row.kind === 'fullscreen') {
      const button = element('button', 'menu-switch')
      button.type = 'button'
      button.dataset.nav = ''
      button.setAttribute('role', 'switch')
      button.setAttribute('aria-label', row.label)
      button.innerHTML = '<span class="menu-switch-track" aria-hidden="true"><i></i></span><span class="menu-switch-text"></span>'
      const text = button.querySelector('.menu-switch-text') as HTMLElement
      const read = () => (row.kind === 'fullscreen' ? Boolean(document.fullscreenElement) : row.inverted ? !settings.value[row.key] : settings.value[row.key])
      const sync = () => {
        const on = read()
        button.setAttribute('aria-checked', String(on))
        text.textContent = on ? 'Ligado' : 'Desligado'
      }
      button.addEventListener('click', () => {
        cue()
        if (row.kind === 'fullscreen') {
          const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
          void request.catch(() => undefined).then(sync)
          return
        }
        settings.set(row.key, !settings.value[row.key])
        sync()
      })
      if (row.kind === 'fullscreen') {
        document.addEventListener('fullscreenchange', sync)
        panelCleanups.push(() => document.removeEventListener('fullscreenchange', sync))
      }
      sync()
      settingControls.push(sync)
      control.append(button)
    } else {
      const stepper = element('div', 'menu-stepper')
      stepper.tabIndex = 0
      stepper.dataset.nav = ''
      stepper.dataset.stepper = ''
      stepper.setAttribute('role', 'group')
      stepper.setAttribute('aria-label', row.label)
      stepper.innerHTML = `
        <button type="button" class="menu-step" data-step="-1" tabindex="-1" aria-label="Opção anterior">${ICONS.left}</button>
        <output class="menu-step-value" aria-live="polite"></output>
        <button type="button" class="menu-step" data-step="1" tabindex="-1" aria-label="Próxima opção">${ICONS.right}</button>
      `
      const output = stepper.querySelector('output') as HTMLElement
      const index = () => Math.max(0, row.options.findIndex((option) => option.value === settings.value[row.key]))
      const sync = () => {
        const current = index()
        output.textContent = row.options[current].text
        stepper.style.setProperty('--pips', String(row.options.length))
        stepper.style.setProperty('--pip', String(current))
      }
      const step = (delta: number) => {
        const next = (index() + delta + row.options.length) % row.options.length
        settings.set(row.key, row.options[next].value as never)
        cue()
        sync()
      }
      stepper.addEventListener('menu-step', ((event: CustomEvent<number>) => step(event.detail)) as EventListener)
      for (const button of stepper.querySelectorAll<HTMLButtonElement>('.menu-step')) {
        button.addEventListener('click', () => step(Number(button.dataset.step)))
      }
      sync()
      settingControls.push(sync)
      control.append(stepper)
    }
    return wrapper
  }

  function buildControls() {
    const panel = panels.get('controls') as HTMLElement
    settingControls.length = 0
    panel.innerHTML = panelHeader('menu-controls-title', 'Ajustes', 'Controles')
    const scroller = element('div', 'menu-controls')
    for (const section of CONTROL_SECTIONS) {
      const group = element('section', 'menu-group')
      group.innerHTML = `<h3 class="menu-group-title">${section.title}</h3>`
      for (const row of section.rows) group.append(settingRow(row))
      scroller.append(group)
    }
    const keyboard = element('section', 'menu-group menu-keyboard')
    keyboard.innerHTML = `
      <h3 class="menu-group-title">Teclado</h3>
      <p class="menu-keyboard-help">Escolha uma tecla e pressione a nova. <kbd>Esc</kbd> cancela, <kbd>Backspace</kbd> apaga. Cada ação aceita até duas teclas.</p>
    `
    const groups = element('div', 'menu-keyboard-groups')
    for (const group of BIND_GROUPS) {
      const block = element('div', 'menu-bind-group')
      block.innerHTML = `<h4 class="menu-bind-title">${group.title}</h4>`
      for (const action of group.actions) block.append(bindRow(action))
      groups.append(block)
    }
    keyboard.append(groups)
    scroller.append(keyboard)
    scroller.append(element('div', 'menu-reference'))
    panel.append(scroller)
    panelCleanups.push(trackScrollEdges(scroller))
    panelCleanups.push(stopListening)
    const foot = element('div', 'menu-panel-foot')
    const reset = element('button', 'ui-btn menu-keys-reset')
    reset.type = 'button'
    reset.dataset.nav = ''
    reset.textContent = 'Restaurar teclas'
    reset.addEventListener('click', () => {
      cue()
      stopListening()
      resetKeys()
      syncBinds()
    })
    foot.append(reset)
    panel.append(foot)
    backButton(foot)
    syncBinds()
  }

  function bindRow(action: BindAction) {
    const row = element('div', 'menu-bind')
    row.innerHTML = `<span class="menu-bind-label">${BIND_LABEL[action]}</span>`
    const slots = element('span', 'menu-bind-keys')
    for (let slot = 0; slot < BIND_SLOTS; slot++) {
      const button = element('button', 'menu-key')
      button.type = 'button'
      button.dataset.nav = ''
      button.dataset.action = action
      button.dataset.slot = String(slot)
      button.addEventListener('click', () => startListening(button, action, slot))
      slots.append(button)
    }
    row.append(slots)
    return row
  }

  function syncBinds() {
    const panel = panels.get('controls') as HTMLElement
    for (const button of panel.querySelectorAll<HTMLButtonElement>('.menu-key')) {
      if (listening?.button === button) continue
      const action = button.dataset.action as BindAction
      const slot = Number(button.dataset.slot)
      const code = codesFor(action)[slot]
      button.dataset.empty = String(!code)
      button.textContent = code ? keyLabel(code) : '—'
      button.setAttribute('aria-label', `${BIND_LABEL[action]}, tecla ${slot + 1}: ${code ? keyLabel(code) : 'vazia'}`)
    }
    const reset = panel.querySelector<HTMLButtonElement>('.menu-keys-reset')
    if (reset) reset.disabled = isDefaultKeys()
    const reference = panel.querySelector<HTMLElement>('.menu-reference')
    if (reference) {
      reference.innerHTML = REFERENCE.map(
        (group) => `
        <section class="menu-group">
          <h3 class="menu-group-title">${group.title}</h3>
          <dl class="menu-binds">${group
            .rows()
            .map(([label, binding]) => `<div><dt>${label}</dt><dd>${binding}</dd></div>`)
            .join('')}</dl>
        </section>`,
      ).join('')
    }
  }

  function startListening(button: HTMLButtonElement, action: BindAction, slot: number) {
    cue()
    stopListening()
    listening = { button, action, slot }
    button.dataset.listening = 'true'
    button.textContent = 'Pressione…'
    button.setAttribute('aria-label', `${BIND_LABEL[action]}: pressione a nova tecla`)
    root.dataset.listening = 'true'
  }

  function stopListening() {
    if (!listening) return
    const { button } = listening
    listening = null
    button.removeAttribute('data-listening')
    root.removeAttribute('data-listening')
    syncBinds()
  }

  function captureKey(event: KeyboardEvent) {
    if (!listening || event.repeat) return
    const { button, action, slot } = listening
    if (event.code === 'Escape') {
      stopListening()
      button.focus({ preventScroll: true })
      return
    }
    if (event.code === 'Backspace' || event.code === 'Delete') {
      clearKey(action, slot)
      stopListening()
      cue()
      button.focus({ preventScroll: true })
      return
    }
    if (RESERVED_CODES.has(event.code) || !CODE_SHAPE.test(event.code)) {
      button.dataset.rejected = 'true'
      setTimeout(() => button.removeAttribute('data-rejected'), 320)
      return
    }
    bindKey(action, slot, event.code)
    stopListening()
    cue()
    button.focus({ preventScroll: true })
  }

  function buildCredits() {
    const panel = panels.get('credits') as HTMLElement
    panel.innerHTML = `
      ${panelHeader('menu-credits-title', GAME_TITLE, 'Créditos')}
      <div class="menu-credits">
        <img class="menu-credits-crest" src="${emblemPath(options.assetBase, 'crest')}" alt="" width="120" height="120" decoding="async">
        <dl class="menu-credits-list">
          ${CREDITS.map(([role, text]) => `<div><dt>${role}</dt><dd>${text}</dd></div>`).join('')}
        </dl>
        <p class="menu-credits-thanks">Obrigado por jogar. O cristal da praça agradece.</p>
      </div>
    `
    const foot = element('div', 'menu-panel-foot')
    panel.append(foot)
    backButton(foot)
    panelCleanups.push(trackScrollEdges(panel.querySelector('.menu-credits') as HTMLElement))
  }

  function openConfirm(kind: 'new' | 'quit') {
    returnFocus = kind
    const panel = panels.get('confirm') as HTMLElement
    hold?.destroy()
    hold = null
    if (kind === 'new') {
      panel.innerHTML = `
        ${panelHeader('menu-confirm-title', 'Novo jogo', 'Apagar o progresso?')}
        <p class="menu-confirm-text">${
          save
            ? `O robô volta ao meteoro: ${formatCredits(save.credits)} ¢, as peças compradas e ${save.wins} ${save.wins === 1 ? 'vitória' : 'vitórias'} serão apagados, e um núcleo novo é sorteado.`
            : 'O robô volta ao meteoro e um núcleo novo é sorteado.'
        }</p>
      `
    } else {
      panel.innerHTML = `
        ${panelHeader('menu-confirm-title', 'Pausa', 'Voltar ao menu inicial?')}
        <p class="menu-confirm-text">Créditos, peças e vitórias ficam salvos neste aparelho. Você continua em casa.</p>
      `
    }
    const foot = element('div', 'menu-panel-foot')
    const accept = element('button', 'ui-btn menu-confirm-accept')
    accept.type = 'button'
    accept.dataset.nav = ''
    if (kind === 'new') {
      accept.dataset.variant = 'danger'
      accept.innerHTML = `<span>Segure para apagar</span>${options.touch ? '' : '<kbd>Enter</kbd>'}`
      hold = holdToConfirm(accept, {
        duration: 1200,
        onStart: () => options.sound.cue('charge'),
        onConfirm: () => {
          options.sound.stopCue('charge')
          options.handlers.newGame()
        },
      })
      accept.addEventListener('pointerup', () => options.sound.stopCue('charge'))
    } else {
      accept.dataset.variant = 'primary'
      accept.innerHTML = `<span>Voltar ao menu</span>${options.touch ? '' : '<kbd>Enter</kbd>'}`
      accept.addEventListener('click', () => {
        cue()
        options.handlers.quitToTitle()
      })
    }
    foot.append(accept)
    panel.append(foot)
    backButton(foot, kind === 'new' ? 'Cancelar' : 'Continuar jogando')
    go('confirm')
  }

  function buildStatus() {
    if (mode !== 'pause' || !save) {
      status.hidden = true
      return
    }
    status.hidden = false
    status.innerHTML = `
      <span class="ui-kicker" data-mark>Situação</span>
      <dl class="menu-status-list">
        <div><dt>Créditos</dt><dd class="menu-status-credits"><img src="${emblemPath(options.assetBase, 'credit')}" alt="" width="22" height="22">${formatCredits(save.credits)}</dd></div>
        <div><dt>Núcleo</dt><dd class="menu-status-core">${save.core.element}<small>${save.core.cls}</small></dd></div>
        <div><dt>Vitórias</dt><dd>${save.wins}</dd></div>
        <div><dt>Derrotas</dt><dd>${save.losses}</dd></div>
      </dl>
      <hr class="ui-rule">
      <div class="menu-status-next">
        <img src="${emblemPath(options.assetBase, 'arena')}" alt="" width="44" height="44">
        <span><small>Próxima luta</small><b>${save.next}</b></span>
      </div>
    `
  }

  function focusables() {
    const container = screen === 'main' ? list : (panels.get(screen) as HTMLElement)
    return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]
  }

  function present(next: MenuMode) {
    mode = next
    root.dataset.mode = next
    if (next === 'pause') mountBackdrop()
    else unmountBackdrop()
    chapter.textContent = next === 'pause' ? 'Jogo pausado' : 'Capítulo I · A Queda'
    buildList()
    buildStatus()
    root.dataset.visible = 'true'
    root.dataset.entering = 'true'
    setTimeout(() => root.removeAttribute('data-entering'), 1200)
    go('main')
  }

  function moveFocus(delta: number) {
    const items = focusables()
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next = items[(index + delta + items.length) % items.length]
    next.focus({ preventScroll: true })
    next.scrollIntoView({ block: 'nearest' })
  }

  function adjust(delta: number) {
    const active = document.activeElement as HTMLElement | null
    if (!active || !root.contains(active)) return false
    if (active instanceof HTMLInputElement && active.type === 'range') {
      const value = Math.min(100, Math.max(0, Number(active.value) + delta * 5))
      active.value = String(value)
      active.dispatchEvent(new Event('input'))
      return true
    }
    if (active.dataset.stepper !== undefined) {
      active.dispatchEvent(new CustomEvent('menu-step', { detail: delta }))
      return true
    }
    return false
  }

  function press() {
    const active = document.activeElement as HTMLElement | null
    if (!active || !root.contains(active)) {
      focusables()[0]?.focus({ preventScroll: true })
      return
    }
    if (active.dataset.stepper !== undefined) {
      active.dispatchEvent(new CustomEvent('menu-step', { detail: 1 }))
      return
    }
    if (hold && active.classList.contains('menu-confirm-accept')) return
    active.click()
  }

  return {
    get open() {
      return mode !== null
    },
    get mode() {
      return mode
    },

    showTitle(summary) {
      save = summary
      canQuit = true
      present('title')
    },

    showPause(summary, pauseOptions) {
      save = summary
      canQuit = pauseOptions.canQuit
      present('pause')
    },

    close() {
      hold?.destroy()
      hold = null
      disposePanel()
      mode = null
      root.dataset.visible = 'false'
      unmountBackdrop(BACKDROP_FADE_MS)
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    },

    handleKey(event) {
      if (!mode) return false
      if (listening) {
        captureKey(event)
        return true
      }
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveFocus(-1)
          return true
        case 'ArrowDown':
        case 'KeyS':
          moveFocus(1)
          return true
        case 'ArrowLeft':
        case 'KeyA':
          adjust(-1)
          return true
        case 'ArrowRight':
        case 'KeyD':
          adjust(1)
          return true
        case 'Enter':
        case 'NumpadEnter':
        case 'Space': {
          if (event.repeat) return true
          const active = document.activeElement as HTMLElement | null
          if (hold && active?.classList.contains('menu-confirm-accept')) hold.start()
          else press()
          return true
        }
        case 'Escape':
        case 'Backspace':
          if (!event.repeat) {
            cue()
            back()
          }
          return true
        case 'Tab':
          moveFocus(event.shiftKey ? -1 : 1)
          return true
        default:
          return true
      }
    },

    handleKeyUp(event) {
      if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
        if (hold?.holding) options.sound.stopCue('charge')
        hold?.cancel()
      }
    },

    confirm() {
      if (mode) press()
    },

    destroy() {
      hold?.destroy()
      disposePanel()
      unmountBackdrop()
      for (const cleanup of cleanups) cleanup()
      root.remove()
    },
  }
}
