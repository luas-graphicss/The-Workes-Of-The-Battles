import type { Sound } from '../audio'
import { cardDetail, cardFace, setFaceSlot } from '../battle/card-face'
import { CARD_IDS, CARDS, HAND_SIZE, type CardId } from '../battle/deck'
import { ownedCards, saveProgress, setHand, type Progress } from '../robot/progress'
import { element, ICONS } from '../ui/kit'

export type HandBuilder = {
  readonly open: boolean
  show(): void
  hide(): void
  handleKey(event: KeyboardEvent): boolean
  paintThumbs(target: HTMLElement): void
  destroy(): void
}

export type HandBuilderOptions = {
  assetBase: string
  touch: boolean
  progress: Progress
  sound: Sound
  onChange(): void
  onClose(): void
}

const FULL_LINES = ['Três cartas, nem uma a mais. O tablet esquenta.', 'Mão cheia. Tire uma antes de colocar outra.']
const OPEN_LINE = 'Escolha com calma: só três cartas sobem ao ringue. Contra campeão, o tablet sorteia.'
const LOCKED_LINE = 'Essa carta ainda dorme numa clareira da floresta. As pistas ficam na estante de casa.'

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

export function createHandBuilder(host: HTMLElement, options: HandBuilderOptions): HandBuilder {
  const { progress, sound } = options
  const root = element('section', 'hand-builder')
  root.dataset.open = 'false'
  root.dataset.touch = String(options.touch)
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-labelledby', 'hand-builder-title')
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = `
    <div class="hand-builder-dim" aria-hidden="true"></div>
    <div class="hand-builder-panel ui-panel">
      <header class="hand-builder-head">
        <div class="hand-builder-titles">
          <span class="ui-kicker" data-mark>Oficina do Cristal · Baralho</span>
          <h2 class="hand-builder-title" id="hand-builder-title">Mão de combate</h2>
          <p class="hand-builder-lede">Só ${HAND_SIZE} cartas cabem no tablet do B-01. Elas sobem ao ringue e às ruas com você; contra um campeão, o tablet sorteia 5 do baralho e você escolhe ${HAND_SIZE} na hora.</p>
        </div>
        <button type="button" class="ui-btn hand-builder-close">${ICONS.close}<span>Pronto</span>${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
      </header>
      <div class="hand-builder-strip">
        <div class="hand-builder-slots" role="group" aria-label="Cartas na mão"></div>
        <div class="hand-builder-status">
          <p class="hand-builder-count" aria-live="polite"></p>
          <p class="hand-builder-voice" role="status"><b>Mecânica</b><span></span></p>
        </div>
      </div>
      <div class="hand-builder-body">
        <div class="hand-builder-grid" role="listbox" aria-multiselectable="true" aria-label="Baralho"></div>
        <aside class="hand-builder-detail" aria-live="polite">
          <div class="hand-builder-detail-art"></div>
          <div class="hand-builder-detail-text">
            <span class="ui-kicker hand-builder-detail-meta"></span>
            <h3 class="hand-builder-detail-name"></h3>
            <p class="hand-builder-detail-desc"></p>
            <button type="button" class="ui-btn hand-builder-toggle" data-variant="primary"></button>
          </div>
        </aside>
      </div>
      <footer class="hand-builder-hints" aria-hidden="true"></footer>
    </div>
  `
  host.append(root)

  const slotsBox = root.querySelector('.hand-builder-slots') as HTMLElement
  const count = root.querySelector('.hand-builder-count') as HTMLElement
  const voiceBox = root.querySelector('.hand-builder-voice') as HTMLElement
  const voiceText = voiceBox.querySelector('span') as HTMLElement
  const grid = root.querySelector('.hand-builder-grid') as HTMLElement
  const detailArt = root.querySelector('.hand-builder-detail-art') as HTMLElement
  const detailMeta = root.querySelector('.hand-builder-detail-meta') as HTMLElement
  const detailName = root.querySelector('.hand-builder-detail-name') as HTMLElement
  const detailDesc = root.querySelector('.hand-builder-detail-desc') as HTMLElement
  const toggleButton = root.querySelector('.hand-builder-toggle') as HTMLButtonElement
  const closeButton = root.querySelector('.hand-builder-close') as HTMLButtonElement
  const hints = root.querySelector('.hand-builder-hints') as HTMLElement

  let open = false
  let focus = 0
  const tiles = new Map<CardId, { button: HTMLButtonElement; face: HTMLElement }>()
  const slotButtons: HTMLButtonElement[] = []

  const owned = () => ownedCards(progress)
  const isLocked = (id: CardId) => !owned().includes(id)

  function say(text: string) {
    voiceText.textContent = text
    nudge(voiceBox, 'spoken')
  }

  function nudge(target: HTMLElement, flag: string) {
    target.dataset[flag] = 'false'
    void target.offsetWidth
    target.dataset[flag] = 'true'
  }

  function commit(list: readonly CardId[]) {
    setHand(progress, list)
    saveProgress(progress)
    render()
    options.onChange()
  }

  function toggle(id: CardId) {
    focus = Math.max(0, CARD_IDS.indexOf(id))
    if (isLocked(id)) {
      sound.cue('deny')
      say(LOCKED_LINE)
      renderDetail()
      return
    }
    const hand = progress.hand
    if (hand.includes(id)) {
      sound.cue('select')
      commit(hand.filter((entry) => entry !== id))
      return
    }
    if (hand.length >= HAND_SIZE) {
      sound.cue('deny')
      say(pick(FULL_LINES))
      nudge(slotsBox, 'full')
      renderDetail()
      return
    }
    sound.cue('equip')
    commit([...hand, id])
    const slot = progress.hand.indexOf(id)
    const target = slotButtons[slot]
    if (target) nudge(target, 'landed')
  }

  function clearSlot(slot: number) {
    const id = progress.hand[slot]
    if (!id) return
    sound.cue('select')
    commit(progress.hand.filter((entry) => entry !== id))
  }

  function buildSlots() {
    slotsBox.replaceChildren()
    slotButtons.length = 0
    for (let slot = 0; slot < HAND_SIZE; slot++) {
      const button = element('button', 'hand-slot')
      button.type = 'button'
      button.dataset.slot = String(slot)
      button.addEventListener('click', () => clearSlot(slot))
      slotsBox.append(button)
      slotButtons.push(button)
    }
  }

  function buildGrid() {
    grid.replaceChildren()
    tiles.clear()
    CARD_IDS.forEach((id, index) => {
      const button = element('button', 'hand-tile')
      button.type = 'button'
      button.setAttribute('role', 'option')
      button.style.setProperty('--i', String(index))
      const face = cardFace(id, { assetBase: options.assetBase, locked: isLocked(id) })
      button.append(face)
      button.addEventListener('click', () => toggle(id))
      button.addEventListener('pointerenter', () => {
        focus = index
        renderDetail()
      })
      button.addEventListener('focus', () => {
        focus = index
        renderDetail()
      })
      grid.append(button)
      tiles.set(id, { button, face })
    })
  }

  function renderSlots() {
    const hand = progress.hand
    slotButtons.forEach((button, slot) => {
      const id = hand[slot]
      button.replaceChildren()
      button.dataset.filled = String(Boolean(id))
      const key = options.touch ? '' : `<kbd>${slot + 1}</kbd>`
      if (id) {
        button.append(cardFace(id, { assetBase: options.assetBase, slot }))
        button.insertAdjacentHTML('beforeend', `<span class="hand-slot-remove">${ICONS.close}<span>Tirar</span>${key}</span>`)
        button.setAttribute('aria-label', `Espaço ${slot + 1}: ${CARDS[id].name}. Tocar para tirar da mão.`)
      } else {
        button.innerHTML = `<span class="hand-slot-empty"><b>${slot + 1}</b><small>Espaço livre</small></span>`
        button.setAttribute('aria-label', `Espaço ${slot + 1} vazio`)
      }
    })
    const left = HAND_SIZE - hand.length
    count.textContent = left === 0 ? 'Mão completa · pronta para o sino' : hand.length === 0 ? `Nenhuma carta · escolha até ${HAND_SIZE}` : `${hand.length} de ${HAND_SIZE} · ${left === 1 ? 'cabe mais uma' : `cabem mais ${left}`}`
    count.dataset.full = String(left === 0)
  }

  function renderGrid() {
    const hand = progress.hand
    for (const [id, { button, face }] of tiles) {
      const locked = isLocked(id)
      const slot = hand.indexOf(id)
      if (face.dataset.locked !== String(locked)) {
        const fresh = cardFace(id, { assetBase: options.assetBase, locked })
        face.replaceWith(fresh)
        tiles.set(id, { button, face: fresh })
      }
      const current = tiles.get(id)?.face ?? face
      setFaceSlot(current, slot >= 0 ? slot : null)
      button.dataset.inHand = String(slot >= 0)
      button.dataset.locked = String(locked)
      button.setAttribute('aria-selected', String(slot >= 0))
      button.setAttribute('aria-label', locked ? `Carta secreta: ${CARDS[id].origin ?? 'clareira escondida'}` : `${CARDS[id].name}${slot >= 0 ? `, na mão, espaço ${slot + 1}` : ''}`)
      button.tabIndex = CARD_IDS[focus] === id ? 0 : -1
    }
  }

  function renderDetail() {
    const id = CARD_IDS[focus] ?? CARD_IDS[0]
    const locked = isLocked(id)
    detailArt.replaceChildren(cardFace(id, { assetBase: options.assetBase, locked, slot: progress.hand.includes(id) ? progress.hand.indexOf(id) : null }))
    if (locked) {
      detailMeta.textContent = 'Carta secreta'
      detailName.textContent = '???'
      detailDesc.textContent = `Escondida na ${CARDS[id].origin ?? 'floresta'}. Abra o relicário da clareira para ela entrar no baralho.`
      toggleButton.hidden = true
    } else {
      const detail = cardDetail(id)
      detailMeta.textContent = detail.meta
      detailName.textContent = detail.name
      detailDesc.textContent = detail.text
      toggleButton.hidden = false
      const inHand = progress.hand.includes(id)
      const full = progress.hand.length >= HAND_SIZE
      toggleButton.dataset.variant = inHand ? '' : 'primary'
      toggleButton.setAttribute('aria-disabled', String(!inHand && full))
      toggleButton.innerHTML = `<span>${inHand ? 'Tirar da mão' : full ? 'Mão cheia' : 'Levar na mão'}</span>${options.touch ? '' : '<kbd>E</kbd>'}`
    }
    for (const [cardId, { button }] of tiles) button.dataset.focus = String(cardId === id)
  }

  function renderHints() {
    if (options.touch) {
      hints.replaceChildren()
      return
    }
    const hint = (keys: string[], label: string) => `<span class="hand-builder-hint">${keys.map((key) => `<kbd>${key}</kbd>`).join('')}<span>${label}</span></span>`
    hints.innerHTML = `${hint(['←', '→', '↑', '↓'], 'Navegar')}${hint(['E'], 'Levar ou tirar')}${hint(['1', '2', '3'], 'Esvaziar espaço')}${hint(['Esc'], 'Fechar')}`
  }

  function render() {
    renderSlots()
    renderGrid()
    renderDetail()
  }

  function columns() {
    const first = grid.firstElementChild as HTMLElement | null
    if (!first) return 1
    const top = first.offsetTop
    let count = 0
    for (const child of grid.children) {
      if ((child as HTMLElement).offsetTop !== top) break
      count++
    }
    return Math.max(1, count)
  }

  function step(dx: number, dy: number) {
    const span = columns()
    let next = focus + dx + dy * span
    if (next < 0) next = 0
    if (next >= CARD_IDS.length) next = CARD_IDS.length - 1
    focus = next
    renderGrid()
    renderDetail()
    tiles.get(CARD_IDS[focus])?.button.focus({ preventScroll: false })
  }

  toggleButton.addEventListener('click', () => toggle(CARD_IDS[focus]))
  closeButton.addEventListener('click', () => options.onClose())
  root.addEventListener('pointerdown', (event) => event.stopPropagation())

  buildSlots()
  buildGrid()
  renderHints()

  return {
    get open() {
      return open
    },
    show() {
      if (open) return
      open = true
      focus = Math.max(0, CARD_IDS.indexOf(progress.hand[0] ?? CARD_IDS[0]))
      buildGrid()
      render()
      root.dataset.open = 'true'
      root.setAttribute('aria-hidden', 'false')
      sound.cue('card')
      say(OPEN_LINE)
      requestAnimationFrame(() => tiles.get(CARD_IDS[focus])?.button.focus({ preventScroll: true }))
    },
    hide() {
      if (!open) return
      open = false
      root.dataset.open = 'false'
      root.setAttribute('aria-hidden', 'true')
    },
    handleKey(event) {
      if (!open) return false
      const code = event.code
      if (event.repeat) return code.startsWith('Arrow')
      if (code === 'Escape' || code === 'KeyB') {
        options.onClose()
        return true
      }
      const digit = /^(?:Digit|Numpad)([1-3])$/.exec(code)
      if (digit) {
        clearSlot(Number(digit[1]) - 1)
        return true
      }
      if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
        toggle(CARD_IDS[focus])
        return true
      }
      if (code === 'ArrowLeft' || code === 'KeyA') step(-1, 0)
      else if (code === 'ArrowRight' || code === 'KeyD') step(1, 0)
      else if (code === 'ArrowUp' || code === 'KeyW') step(0, -1)
      else if (code === 'ArrowDown' || code === 'KeyS') step(0, 1)
      else return false
      return true
    },
    paintThumbs(target) {
      target.replaceChildren(
        ...Array.from({ length: HAND_SIZE }, (_, slot) => {
          const id = progress.hand[slot]
          const thumb = element('i', 'hand-thumb')
          thumb.dataset.filled = String(Boolean(id))
          if (id) thumb.style.setProperty('--card-art', `url('${options.assetBase}${CARDS[id].art}')`)
          return thumb
        }),
      )
    },
    destroy() {
      root.remove()
    },
  }
}
