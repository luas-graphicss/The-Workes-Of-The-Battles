import { titleMarkup } from '../brand'

export type OverlayPhase = 'loading' | 'title' | 'playing' | 'done'

export type Overlay = {
  setPhase(phase: OverlayPhase): void
  setLoading(amount: number): void
  setBars(cssPixels: number): void
  caption(kicker: string, title: string): void
  hideCaption(): void

  line(speaker: string, text: string): void
  hideLine(): void
  describe(text: string): void
  revealSkip(): void
  setSkipProgress(amount: number): void
  setMuted(muted: boolean): void
  readonly skipHeld: boolean
  onToggleSound(listener: () => void): void
  destroy(): void
}

const SPEAKER =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>'
const SOUND_ON = `${SPEAKER}<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>`
const SOUND_OFF = `${SPEAKER}<line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>`
const SKIP_HIDE_MS = 2600

export function createOverlay(surface: HTMLElement, options: { touch: boolean }): Overlay {
  const root = document.createElement('div')
  root.className = 'cine'
  root.dataset.phase = 'loading'
  root.innerHTML = `
    <div class="cine-title">
      <p class="cine-kicker">Capítulo I · A Queda</p>
      <h1 class="cine-name">${titleMarkup('cine-name')}</h1>
      <div class="cine-loader" role="progressbar" aria-label="Carregando o jogo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <p class="cine-prompt">${options.touch ? 'Toque para começar' : 'Pressione qualquer tecla para começar'}</p>
    </div>
    <div class="cine-caption" aria-hidden="true" data-visible="false">
      <span class="cine-caption-kicker"></span>
      <span class="cine-caption-title"></span>
    </div>
    <div class="cine-line" aria-hidden="true" data-visible="false">
      <span class="cine-line-speaker"></span>
      <span class="cine-line-text"></span>
    </div>
    <p class="cine-sr" aria-live="polite"></p>
    <button type="button" class="cine-skip" data-visible="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" class="cine-skip-track"/><circle cx="12" cy="12" r="9.5" pathLength="100" class="cine-skip-fill"/></svg>
      <span>${options.touch ? 'Segure para pular' : 'Segure <kbd>Esc</kbd> para pular'}</span>
    </button>
    <button type="button" class="cine-sound" aria-pressed="false" aria-label="Desativar som">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SOUND_ON}</svg>
    </button>
  `
  surface.append(root)

  const loader = root.querySelector('.cine-loader') as HTMLElement
  const caption = root.querySelector('.cine-caption') as HTMLElement
  const captionKicker = root.querySelector('.cine-caption-kicker') as HTMLElement
  const captionTitle = root.querySelector('.cine-caption-title') as HTMLElement
  const line = root.querySelector('.cine-line') as HTMLElement
  const lineSpeaker = root.querySelector('.cine-line-speaker') as HTMLElement
  const lineText = root.querySelector('.cine-line-text') as HTMLElement
  const narrator = root.querySelector('.cine-sr') as HTMLElement
  const skip = root.querySelector('.cine-skip') as HTMLButtonElement
  const sound = root.querySelector('.cine-sound') as HTMLButtonElement
  const soundIcon = sound.querySelector('svg') as SVGElement

  let skipHeld = false
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  const soundListeners: (() => void)[] = []

  function hideSkipLater() {
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      if (!skipHeld) skip.dataset.visible = 'false'
    }, SKIP_HIDE_MS)
  }

  function press(event: PointerEvent) {
    event.stopPropagation()
    event.preventDefault()
    skipHeld = true
    skip.dataset.visible = 'true'
    try {
      skip.setPointerCapture(event.pointerId)
    } catch {
    }
  }
  function release() {
    skipHeld = false
    hideSkipLater()
  }
  function toggleSound(event: Event) {
    event.stopPropagation()
    for (const listener of soundListeners) listener()
  }
  function swallow(event: Event) {
    event.stopPropagation()
  }

  skip.addEventListener('pointerdown', press)
  skip.addEventListener('pointerup', release)
  skip.addEventListener('pointercancel', release)
  skip.addEventListener('lostpointercapture', release)
  skip.addEventListener('click', swallow)
  sound.addEventListener('pointerdown', swallow)
  sound.addEventListener('click', toggleSound)

  return {
    setPhase(phase) {
      root.dataset.phase = phase
      if (phase !== 'playing') skip.dataset.visible = 'false'
    },
    setLoading(amount) {
      const percent = Math.round(Math.min(1, Math.max(0, amount)) * 100)
      loader.style.setProperty('--progress', `${percent}%`)
      loader.setAttribute('aria-valuenow', String(percent))
    },
    setBars(cssPixels) {
      root.style.setProperty('--cine-bar', `${cssPixels.toFixed(1)}px`)
    },
    caption(kicker, title) {
      captionKicker.textContent = kicker
      captionTitle.textContent = title
      caption.dataset.visible = 'true'
    },
    hideCaption() {
      caption.dataset.visible = 'false'
    },
    line(speaker, text) {
      lineSpeaker.textContent = speaker
      lineText.textContent = text
      line.dataset.visible = 'true'
      narrator.textContent = `${speaker}: ${text}`
    },
    hideLine() {
      line.dataset.visible = 'false'
    },
    describe(text) {
      narrator.textContent = text
    },
    revealSkip() {
      if (root.dataset.phase !== 'playing') return
      skip.dataset.visible = 'true'
      hideSkipLater()
    },
    setSkipProgress(amount) {
      skip.style.setProperty('--skip', String(Math.min(1, Math.max(0, amount))))
    },
    setMuted(muted) {
      sound.setAttribute('aria-pressed', String(muted))
      sound.setAttribute('aria-label', muted ? 'Ativar som' : 'Desativar som')
      soundIcon.innerHTML = muted ? SOUND_OFF : SOUND_ON
    },
    get skipHeld() {
      return skipHeld
    },
    onToggleSound(listener) {
      soundListeners.push(listener)
    },
    destroy() {
      if (hideTimer) clearTimeout(hideTimer)
      skip.removeEventListener('pointerdown', press)
      skip.removeEventListener('pointerup', release)
      skip.removeEventListener('pointercancel', release)
      skip.removeEventListener('lostpointercapture', release)
      skip.removeEventListener('click', swallow)
      sound.removeEventListener('pointerdown', swallow)
      sound.removeEventListener('click', toggleSound)
      root.remove()
    },
  }
}
