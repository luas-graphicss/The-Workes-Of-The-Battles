import { CARDS, cardCostLabel, cardKindLabel, isSecretCard, type CardId } from './deck'

export type CardFaceOptions = { assetBase: string; locked?: boolean; slot?: number | null }

const rgb = ([r, g, b]: readonly number[]) => `${r} ${g} ${b}`

export function cardFace(id: CardId, options: CardFaceOptions): HTMLElement {
  const card = CARDS[id]
  const locked = Boolean(options.locked)
  const face = document.createElement('span')
  face.className = 'cardface'
  face.dataset.card = id
  face.dataset.kind = isSecretCard(id) ? 'secret' : card.kind
  face.dataset.locked = String(locked)
  face.style.setProperty('--card-art', `url('${options.assetBase}${card.art}')`)
  face.style.setProperty('--accent', rgb(card.accent))
  face.innerHTML = `
    <span class="cardface-art" aria-hidden="true"></span>
    <span class="cardface-shade" aria-hidden="true"></span>
    <span class="cardface-shine" aria-hidden="true"></span>
    <span class="cardface-top">
      <span class="cardface-kind"></span>
      <span class="cardface-cost"></span>
    </span>
    <span class="cardface-bottom">
      <b class="cardface-name"></b>
      <small class="cardface-title"></small>
    </span>
    <span class="cardface-slot" aria-hidden="true"></span>
  `
  ;(face.querySelector('.cardface-kind') as HTMLElement).textContent = locked ? 'Secreta' : cardKindLabel(id)
  ;(face.querySelector('.cardface-cost') as HTMLElement).textContent = locked ? '?' : card.kind === 'special' ? String(card.cost) : 'MAX'
  ;(face.querySelector('.cardface-name') as HTMLElement).textContent = locked ? '???' : card.short
  ;(face.querySelector('.cardface-title') as HTMLElement).textContent = locked ? (card.origin ?? 'Clareira escondida') : card.title
  setFaceSlot(face, options.slot ?? null)
  return face
}

export function setFaceSlot(face: HTMLElement, slot: number | null) {
  face.dataset.slot = slot === null ? '' : String(slot + 1)
  const badge = face.querySelector('.cardface-slot')
  if (badge) badge.textContent = slot === null ? '' : String(slot + 1)
}

export function cardDetail(id: CardId): { name: string; meta: string; text: string } {
  const card = CARDS[id]
  const cost = cardCostLabel(id)
  const time = card.duration ? `dura ${card.duration} s · recarga ${card.cooldown} s` : `recarga ${card.cooldown} s`
  return { name: card.name, meta: `${cardKindLabel(id)} · ${cost} · ${time}`, text: card.description }
}
