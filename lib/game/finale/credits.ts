import { GAME_TITLE, titleMarkup } from '../brand'
import { CREDITS, CREDITS_CLOSING, type CreditSection } from '../story/finale'
import { emblemPath } from '../ui/kit'

export type CreditsRoll = {
  readonly open: boolean
  play(summary: string, onDone: () => void): void
  hold(active: boolean): void
  confirm(): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  destroy(): void
}

export type CreditsOptions = {
  assetBase: string
  touch: boolean
  reducedMotion: boolean
}

const SPEED = 54
const FAST = 6
const LEAD_MS = 2200
const CLOSE_MS = 1400
const HOLD_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE'])
const DONE_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE', 'Escape'])

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function sectionHtml(section: CreditSection, assetBase: string) {
  if (section.plate) {
    const { src, alt, width, height } = section.plate
    return `<figure class="credits-plate"><img src="${assetBase}${src}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" decoding="async"><figcaption>${escapeHtml(section.title)}</figcaption></figure>`
  }
  const lines = section.lines?.length
    ? `<dl class="credits-list">${section.lines.map(([role, name]) => `<div><dt>${escapeHtml(role)}</dt><dd>${escapeHtml(name)}</dd></div>`).join('')}</dl>`
    : ''
  const notes = section.notes?.length ? `<ul class="credits-notes">${section.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : ''
  const people = section.people?.length
    ? `<div class="credits-people">${section.people
        .map(([role, name]) => `<div class="credits-person"><span class="credits-person-role">${escapeHtml(role)}</span><strong class="credits-person-name">${escapeHtml(name)}</strong></div>`)
        .join('')}</div>`
    : ''
  const poem = section.stanzas?.length
    ? `<div class="credits-poem">${section.stanzas.map((stanza) => `<p class="credits-stanza">${stanza.map(escapeHtml).join('<br>')}</p>`).join('')}${
        section.closing ? `<p class="credits-poem-close">${escapeHtml(section.closing)}</p>` : ''
      }</div>`
    : ''
  const story = section.paragraphs?.length ? `<div class="credits-story">${section.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('')}</div>` : ''
  const kind = poem ? 'poem' : story ? 'story' : people ? 'team' : 'list'
  return `<section class="credits-section" data-kind="${kind}"><h3 class="credits-section-title">${escapeHtml(section.title)}</h3>${poem}${story}${people}${lines}${notes}</section>`
}

export function createCreditsRoll(surface: HTMLElement, options: CreditsOptions): CreditsRoll {
  const crest = emblemPath(options.assetBase, 'crest')
  const root = document.createElement('section')
  root.className = 'credits'
  root.dataset.visible = 'false'
  root.dataset.phase = 'idle'
  root.setAttribute('aria-label', `Créditos de ${GAME_TITLE}`)
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="credits-veil" aria-hidden="true"></div>
    <div class="credits-viewport">
      <div class="credits-roll">
        <header class="credits-head">
          <img class="credits-crest" src="${crest}" alt="" width="128" height="128" decoding="async">
          <span class="credits-kicker">${escapeHtml(CREDITS_CLOSING.kicker)}</span>
          <h2 class="credits-name">${titleMarkup('credits-name')}</h2>
          <p class="credits-tagline">${escapeHtml(CREDITS_CLOSING.tagline)}</p>
        </header>
        ${CREDITS.map((section) => sectionHtml(section, options.assetBase)).join('')}
        <footer class="credits-foot">
          <hr class="credits-foot-rule ui-rule">
          <p class="credits-foot-line">${escapeHtml(CREDITS_CLOSING.thanks)}</p>
        </footer>
      </div>
    </div>
    <div class="credits-end" role="status">
      <img class="credits-end-crest" src="${crest}" alt="" width="72" height="72" decoding="async">
      <span class="credits-end-kicker">${escapeHtml(CREDITS_CLOSING.lead)}</span>
      <strong class="credits-end-title">${escapeHtml(CREDITS_CLOSING.end)}</strong>
      <p class="credits-end-summary"></p>
      <button type="button" class="ui-btn credits-continue" data-variant="primary">Continuar${options.touch ? '' : '<kbd class="ui-key">Enter</kbd>'}</button>
    </div>
    <p class="credits-hint" aria-hidden="true">${options.touch ? 'Toque e segure para acelerar' : 'Segure <kbd class="ui-key">Espaço</kbd> para acelerar · <kbd class="ui-key">Esc</kbd> pula'}</p>
  `
  surface.append(root)

  const viewport = root.querySelector('.credits-viewport') as HTMLElement
  const roll = root.querySelector('.credits-roll') as HTMLElement
  const summaryLine = root.querySelector('.credits-end-summary') as HTMLElement
  const continueButton = root.querySelector('.credits-continue') as HTMLButtonElement

  let open = false
  let phase: 'idle' | 'roll' | 'end' = 'idle'
  let animation: Animation | null = null
  let done: (() => void) | null = null
  let fast = false
  let leadTimer: ReturnType<typeof setTimeout> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let pointerHolds = 0

  function setPhase(next: typeof phase) {
    phase = next
    root.dataset.phase = next
  }

  function setFast(next: boolean) {
    if (next === fast) return
    fast = next
    root.dataset.fast = String(next)
    if (!animation) return
    if (typeof animation.updatePlaybackRate === 'function') animation.updatePlaybackRate(next ? FAST : 1)
    else animation.playbackRate = next ? FAST : 1
  }

  function showEnd() {
    if (phase === 'end') return
    setFast(false)
    setPhase('end')
    setTimeout(() => {
      if (open && phase === 'end') continueButton.focus({ preventScroll: true })
    }, 900)
  }

  function startRoll() {
    leadTimer = null
    if (!open) return
    setPhase('roll')
    if (options.reducedMotion) {
      showEnd()
      return
    }
    const height = viewport.clientHeight
    const length = roll.offsetHeight
    const duration = ((height + length) / SPEED) * 1000
    animation = roll.animate([{ transform: `translate3d(0, ${height}px, 0)` }, { transform: `translate3d(0, ${-length}px, 0)` }], { duration, easing: 'linear', fill: 'forwards' })
    animation.onfinish = showEnd
    if (fast) animation.playbackRate = FAST
  }

  function finish() {
    if (!open || phase !== 'end') return
    open = false
    root.dataset.visible = 'false'
    root.setAttribute('aria-hidden', 'true')
    continueButton.blur()
    const callback = done
    done = null
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      closeTimer = null
      animation?.cancel()
      animation = null
      setPhase('idle')
      callback?.()
    }, CLOSE_MS)
  }

  function skip() {
    if (phase === 'roll' && animation) animation.finish()
    else if (phase !== 'end') showEnd()
  }

  function onContinue(event: Event) {
    event.stopPropagation()
    finish()
  }

  function onPointerDown(event: PointerEvent) {
    event.stopPropagation()
    if (event.target instanceof Element && event.target.closest('.credits-continue')) return
    pointerHolds++
    if (phase === 'roll') setFast(true)
  }

  function onPointerUp() {
    pointerHolds = Math.max(0, pointerHolds - 1)
    if (!pointerHolds) setFast(false)
  }

  continueButton.addEventListener('click', onContinue)
  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('pointerup', onPointerUp)
  root.addEventListener('pointercancel', onPointerUp)
  root.addEventListener('pointerleave', onPointerUp)

  return {
    get open() {
      return open
    },

    play(summary, onDone) {
      if (leadTimer) clearTimeout(leadTimer)
      if (closeTimer) clearTimeout(closeTimer)
      animation?.cancel()
      animation = null
      open = true
      done = onDone
      fast = false
      pointerHolds = 0
      root.dataset.fast = 'false'
      summaryLine.textContent = summary
      summaryLine.hidden = !summary
      roll.style.transform = ''
      setPhase('idle')
      root.setAttribute('aria-hidden', 'false')
      root.dataset.visible = 'true'
      leadTimer = setTimeout(startRoll, options.reducedMotion ? 300 : LEAD_MS)
    },

    hold(active) {
      if (!open || pointerHolds) return
      setFast(active && phase === 'roll')
    },

    confirm() {
      if (phase === 'end') finish()
    },

    handleKey(event) {
      if (!open) return false
      if (phase === 'end') {
        if (DONE_KEYS.has(event.code) && !event.repeat) finish()
        return true
      }
      if (event.code === 'Escape') {
        if (!event.repeat) skip()
        return true
      }
      if (HOLD_KEYS.has(event.code)) {
        if (phase === 'roll') setFast(true)
        return true
      }
      return true
    },

    handleKeyUp(event) {
      if (HOLD_KEYS.has(event.code) && !pointerHolds) setFast(false)
    },

    destroy() {
      if (leadTimer) clearTimeout(leadTimer)
      if (closeTimer) clearTimeout(closeTimer)
      animation?.cancel()
      continueButton.removeEventListener('click', onContinue)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointerup', onPointerUp)
      root.removeEventListener('pointercancel', onPointerUp)
      root.removeEventListener('pointerleave', onPointerUp)
      root.remove()
    },
  }
}
