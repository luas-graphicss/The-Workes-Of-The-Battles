import { HEART_COUNT } from '../robot/progress'
import { GAME_OVER } from '../story/finale'

export type FallScreen = {
  readonly open: boolean
  show(broken: number): void
  hide(): void
  confirm(): void
  handleKey(event: KeyboardEvent): boolean
  destroy(): void
}

export type FallOptions = {
  touch: boolean
  reducedMotion: boolean
  onRetry(): void
  onTitle(): void
  cue(name: 'select'): void
}

const READY_MS = 3900
const REDUCED_READY_MS = 300
const PULSE = 'M0 40 H92 L106 40 L118 10 L132 70 L144 40 H206 L218 40 L228 19 L240 61 L250 40 H312 L322 40 L329 31 L337 49 L344 40 H600'
const PRESS = new Set(['Enter', 'NumpadEnter', 'Space', 'KeyE'])
const MOVE = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'KeyA', 'KeyD'])

export function createFallScreen(surface: HTMLElement, options: FallOptions): FallScreen {
  const root = document.createElement('section')
  root.className = 'fall'
  root.dataset.visible = 'false'
  root.dataset.ready = 'false'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-labelledby', 'fall-title')
  root.setAttribute('aria-describedby', 'fall-text')
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="fall-veil" aria-hidden="true"></div>
    <div class="fall-body">
      <span class="fall-kicker">${GAME_OVER.kicker}</span>
      <svg class="fall-pulse" viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true">
        <path class="fall-pulse-echo" d="${PULSE}" pathLength="100"></path>
        <path class="fall-pulse-line" d="${PULSE}" pathLength="100"></path>
      </svg>
      <h2 class="fall-title" id="fall-title">${GAME_OVER.line}</h2>
      <p class="fall-text" id="fall-text">${GAME_OVER.text}</p>
      <div class="fall-tally">
        <ol class="fall-hearts" aria-hidden="true">${'<li></li>'.repeat(HEART_COUNT)}</ol>
        <span class="fall-count"></span>
      </div>
      <div class="fall-actions">
        <button type="button" class="ui-btn fall-retry" data-variant="primary">Tentar de novo${options.touch ? '' : '<kbd class="ui-key">Enter</kbd>'}</button>
        <button type="button" class="ui-btn fall-leave">Voltar ao título</button>
      </div>
      <p class="fall-note">O relógio volta ao começo. Os corações e os guardas continuam onde estavam.</p>
    </div>
  `
  surface.append(root)

  const pips = [...root.querySelectorAll<HTMLElement>('.fall-hearts li')]
  const count = root.querySelector('.fall-count') as HTMLElement
  const retry = root.querySelector('.fall-retry') as HTMLButtonElement
  const leave = root.querySelector('.fall-leave') as HTMLButtonElement
  const buttons = [retry, leave]
  let open = false
  let ready = false
  let readyTimer: ReturnType<typeof setTimeout> | null = null

  function settle() {
    ready = true
    root.dataset.ready = 'true'
    retry.focus({ preventScroll: true })
  }

  function choose(button: HTMLButtonElement) {
    if (!open || !ready) return
    options.cue('select')
    if (button === retry) options.onRetry()
    else options.onTitle()
  }

  function confirmChoice() {
    if (!ready) return
    choose(document.activeElement === leave ? leave : retry)
  }

  function swallow(event: Event) {
    event.stopPropagation()
  }

  const onRetry = (event: Event) => {
    event.stopPropagation()
    choose(retry)
  }
  const onLeave = (event: Event) => {
    event.stopPropagation()
    choose(leave)
  }
  retry.addEventListener('click', onRetry)
  leave.addEventListener('click', onLeave)
  root.addEventListener('pointerdown', swallow)

  return {
    get open() {
      return open
    },

    show(broken) {
      open = true
      ready = false
      root.dataset.ready = 'false'
      pips.forEach((pip, index) => {
        pip.dataset.broken = String(index < broken)
      })
      count.textContent = `${broken} de ${HEART_COUNT} corações quebrados · tempo esgotado`
      root.setAttribute('aria-hidden', 'false')
      root.dataset.visible = 'false'
      void root.offsetWidth
      root.dataset.visible = 'true'
      if (readyTimer) clearTimeout(readyTimer)
      readyTimer = setTimeout(settle, options.reducedMotion ? REDUCED_READY_MS : READY_MS)
    },

    hide() {
      open = false
      ready = false
      if (readyTimer) clearTimeout(readyTimer)
      readyTimer = null
      root.dataset.visible = 'false'
      root.dataset.ready = 'false'
      root.setAttribute('aria-hidden', 'true')
      const active = document.activeElement
      if (active instanceof HTMLElement && root.contains(active)) active.blur()
    },

    confirm: confirmChoice,

    handleKey(event) {
      if (!open) return false
      if (!ready) return true
      if (PRESS.has(event.code)) {
        if (!event.repeat) confirmChoice()
        return true
      }
      if (MOVE.has(event.code)) {
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = buttons[(index + 1) % buttons.length] ?? retry
        next.focus({ preventScroll: true })
        options.cue('select')
        return true
      }
      return true
    },

    destroy() {
      if (readyTimer) clearTimeout(readyTimer)
      retry.removeEventListener('click', onRetry)
      leave.removeEventListener('click', onLeave)
      root.removeEventListener('pointerdown', swallow)
      root.remove()
    },
  }
}
