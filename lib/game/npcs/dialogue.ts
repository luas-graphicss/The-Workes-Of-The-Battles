import { element, ICONS } from '../ui/kit'

export type TalkAccent = 'master' | 'rival' | 'clearing' | 'league' | 'visitor'

export type TalkChoice = { label: string; note?: string; disabled?: boolean; pick(): void }

export type TalkPage = {
  text: string
  choices?: readonly TalkChoice[]

  portrait?: HTMLCanvasElement | HTMLImageElement | null
  kicker?: string
  name?: string

  onShow?: () => void
}

export type TalkMeter = { level: number; max: number; label: string }

export type TalkSpeaker = {
  name: string
  kicker: string
  accent: TalkAccent
  portrait: HTMLCanvasElement | HTMLImageElement | null
  meter?: TalkMeter | null
}

export type Dialogue = {
  readonly open: boolean
  start(speaker: TalkSpeaker, pages: readonly TalkPage[], onClose?: () => void): void

  show(pages: readonly TalkPage[]): void
  setMeter(meter: TalkMeter | null): void
  close(): void
  handleKey(event: KeyboardEvent): boolean
  confirm(): void
  destroy(): void
}

const CHARACTERS_PER_SECOND = 72
const ADVANCE = new Set(['KeyE', 'Enter', 'NumpadEnter', 'Space'])

export function createDialogue(surface: HTMLElement, options: { touch: boolean; reducedMotion: boolean; cue(name: 'select' | 'deny'): void }): Dialogue {
  const root = element('section', 'talk')
  root.dataset.visible = 'false'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('aria-labelledby', 'talk-name')
  root.innerHTML = `
    <div class="talk-panel ui-panel">
      <div class="talk-portrait" aria-hidden="true"><span class="talk-portrait-frame"></span></div>
      <div class="talk-main">
        <header class="talk-head">
          <div class="talk-titles">
            <span class="ui-kicker talk-kicker"></span>
            <h3 class="talk-name" id="talk-name"></h3>
          </div>
          <div class="talk-meter" hidden>
            <span class="talk-hearts" aria-hidden="true"></span>
            <span class="talk-meter-label"></span>
          </div>
        </header>
        <p class="talk-text" aria-hidden="true"></p>
        <p class="talk-live sr-only" aria-live="polite"></p>
        <div class="talk-choices" role="group" aria-label="Respostas" hidden></div>
        <footer class="talk-foot">
          <span class="talk-pages" aria-hidden="true"></span>
          <button type="button" class="ui-btn talk-next" data-variant="primary"><span class="talk-next-label">Continuar</span>${options.touch ? '' : '<kbd>E</kbd>'}</button>
        </footer>
      </div>
      <button type="button" class="talk-close" aria-label="Encerrar conversa">${ICONS.close}${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
    </div>
  `
  surface.append(root)

  const frame = root.querySelector('.talk-portrait-frame') as HTMLElement
  const kicker = root.querySelector('.talk-kicker') as HTMLElement
  const name = root.querySelector('.talk-name') as HTMLElement
  const meterBox = root.querySelector('.talk-meter') as HTMLElement
  const hearts = root.querySelector('.talk-hearts') as HTMLElement
  const meterLabel = root.querySelector('.talk-meter-label') as HTMLElement
  const text = root.querySelector('.talk-text') as HTMLElement
  const live = root.querySelector('.talk-live') as HTMLElement
  const choicesBox = root.querySelector('.talk-choices') as HTMLElement
  const pagesBox = root.querySelector('.talk-pages') as HTMLElement
  const nextButton = root.querySelector('.talk-next') as HTMLButtonElement
  const nextLabel = root.querySelector('.talk-next-label') as HTMLElement
  const closeButton = root.querySelector('.talk-close') as HTMLButtonElement

  let open = false
  let speaker: TalkSpeaker | null = null
  let pages: readonly TalkPage[] = []
  let index = 0
  let full = ''
  let typed = 0
  let frameId = 0
  let lastTime = 0
  let onClose: (() => void) | undefined

  const typing = () => typed < full.length

  function stopTyping() {
    if (frameId) cancelAnimationFrame(frameId)
    frameId = 0
  }

  function finishTyping() {
    stopTyping()
    typed = full.length
    text.textContent = full
    text.dataset.typing = 'false'
  }

  function type(now: number) {
    const dt = Math.min(0.1, (now - lastTime) / 1000)
    lastTime = now
    typed = Math.min(full.length, typed + CHARACTERS_PER_SECOND * dt)
    text.textContent = full.slice(0, Math.floor(typed))
    if (typing()) frameId = requestAnimationFrame(type)
    else finishTyping()
  }

  function choiceButton(choice: TalkChoice, position: number) {
    const button = element('button', 'talk-choice')
    button.type = 'button'
    button.setAttribute('aria-disabled', String(Boolean(choice.disabled)))
    button.innerHTML = `${options.touch ? '' : `<kbd>${position + 1}</kbd>`}<span class="talk-choice-label"></span>${choice.note ? '<small class="talk-choice-note"></small>' : ''}`
    ;(button.querySelector('.talk-choice-label') as HTMLElement).textContent = choice.label
    if (choice.note) (button.querySelector('.talk-choice-note') as HTMLElement).textContent = choice.note
    button.addEventListener('click', () => choose(position))
    return button
  }

  function renderMeter(meter: TalkMeter | null | undefined) {
    meterBox.hidden = !meter
    if (!meter) return
    hearts.replaceChildren(
      ...Array.from({ length: meter.max }, (_, step) => {
        const heart = element('i')
        heart.dataset.on = String(step < meter.level)
        return heart
      }),
    )
    meterLabel.textContent = meter.label
  }

  function render() {
    const page = pages[index]
    if (!page || !speaker) return
    page.onShow?.()
    kicker.textContent = page.kicker ?? speaker.kicker
    name.textContent = page.name ?? speaker.name
    const art = page.portrait !== undefined ? page.portrait : speaker.portrait
    frame.replaceChildren(...(art ? [art] : []))
    frame.dataset.empty = String(!art)
    full = page.text
    live.textContent = `${name.textContent}: ${full}`
    stopTyping()
    typed = options.reducedMotion ? full.length : 0
    text.textContent = full.slice(0, typed)
    text.dataset.typing = String(typing())
    const choices = page.choices ?? []
    choicesBox.replaceChildren(...choices.map((choice, position) => choiceButton(choice, position)))
    choicesBox.hidden = choices.length === 0
    root.dataset.choices = String(choices.length > 0)
    nextButton.hidden = choices.length > 0
    nextLabel.textContent = index >= pages.length - 1 ? 'Fechar' : 'Continuar'
    pagesBox.replaceChildren(
      ...pages.map((_, position) => {
        const dot = element('i')
        dot.dataset.on = String(position === index)
        return dot
      }),
    )
    pagesBox.hidden = pages.length < 2
    if (typing()) {
      lastTime = performance.now()
      frameId = requestAnimationFrame(type)
    }
    const primary = choices.length ? (choicesBox.querySelector('.talk-choice') as HTMLElement | null) : nextButton
    primary?.focus({ preventScroll: true })
  }

  function advance() {
    if (!open) return
    if (typing()) {
      finishTyping()
      return
    }
    const page = pages[index]
    if (page?.choices?.length) return
    options.cue('select')
    if (index >= pages.length - 1) {
      close()
      return
    }
    index++
    render()
  }

  function choose(position: number) {
    const choice = pages[index]?.choices?.[position]
    if (!open || !choice) return
    if (choice.disabled) {
      options.cue('deny')
      return
    }
    finishTyping()
    options.cue('select')
    choice.pick()
  }

  function close() {
    if (!open) return
    open = false
    stopTyping()
    root.dataset.visible = 'false'
    root.setAttribute('aria-hidden', 'true')
    const done = onClose
    onClose = undefined
    speaker = null
    done?.()
  }

  nextButton.addEventListener('click', advance)
  closeButton.addEventListener('click', close)
  root.addEventListener('pointerdown', (event) => event.stopPropagation())

  return {
    get open() {
      return open
    },
    start(next, nextPages, done) {
      speaker = next
      pages = nextPages
      index = 0
      onClose = done
      root.dataset.accent = next.accent
      renderMeter(next.meter)
      open = true
      root.dataset.visible = 'true'
      root.setAttribute('aria-hidden', 'false')
      render()
    },
    show(nextPages) {
      if (!open) return
      pages = nextPages
      index = 0
      render()
    },
    setMeter(meter) {
      renderMeter(meter)
    },
    close,
    handleKey(event) {
      if (!open) return false
      const code = event.code
      if (event.repeat) return ADVANCE.has(code)
      if (code === 'Escape') {
        close()
        return true
      }
      if (ADVANCE.has(code)) {
        advance()
        return true
      }
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(code)
      if (digit) {
        choose(Number(digit[1]) - 1)
        return true
      }
      return false
    },
    confirm() {
      if (!open) return
      const page = pages[index]
      if (page?.choices?.length && !typing()) {
        const focused = document.activeElement
        const buttons = [...choicesBox.querySelectorAll('.talk-choice')]
        const position = buttons.indexOf(focused as Element)
        choose(position >= 0 ? position : 0)
        return
      }
      advance()
    },
    destroy() {
      stopTyping()
      root.remove()
    },
  }
}
