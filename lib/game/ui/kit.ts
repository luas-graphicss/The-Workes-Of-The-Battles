export type EmblemName = 'credit' | 'arena' | 'workshop' | 'mission' | 'victory' | 'defeat' | 'crest' | 'house' | 'secret' | 'capsule' | 'master' | 'rival' | 'clearing'

export function emblemPath(assetBase: string, name: EmblemName) {
  return `${assetBase}assets/ui/emblems/${name}.webp`
}

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (html) node.innerHTML = html
  return node
}

export function trackScrollEdges(scroller: HTMLElement): () => void {
  const update = () => {
    const { scrollTop, scrollHeight, clientHeight } = scroller
    scroller.dataset.moreAbove = String(scrollTop > 1)
    scroller.dataset.moreBelow = String(scrollTop + clientHeight < scrollHeight - 1)
  }
  const observer = new ResizeObserver(update)
  observer.observe(scroller)
  for (const child of scroller.children) observer.observe(child)
  scroller.addEventListener('scroll', update, { passive: true })
  update()
  return () => {
    observer.disconnect()
    scroller.removeEventListener('scroll', update)
  }
}

export function revealSelection(panel: HTMLElement, card: HTMLElement, detail: HTMLElement | null, { pointer = false, sticky = false } = {}) {
  const margin = 12
  const panelTop = panel.getBoundingClientRect().top - panel.scrollTop
  const offsetOf = (node: HTMLElement) => node.getBoundingClientRect().top - panelTop
  const cardTop = offsetOf(card) - margin
  const cardBottom = cardTop + card.offsetHeight + margin * 2
  const shown = detail !== null && detail.dataset.visible !== 'false' && detail.offsetHeight > 0
  const view = panel.clientHeight - (sticky && shown ? detail.offsetHeight : 0)
  const detailTop = shown && !sticky ? offsetOf(detail) : cardBottom
  const detailBottom = shown && !sticky ? detailTop + detail.offsetHeight + margin : cardBottom
  let top = panel.scrollTop
  if (!sticky) {
    if (detailBottom - cardTop <= view) top = detailBottom - view
    else if (!pointer && detailTop - cardTop < view) top = cardTop
  }
  if (cardTop < top) top = cardTop
  else if (cardBottom > top + view) top = cardBottom - view
  top = Math.max(0, Math.min(top, panel.scrollHeight - view))
  if (Math.abs(top - panel.scrollTop) < 1) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  panel.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function creditHtml(assetBase: string, amount: string) {
  return `<span class="ui-credit"><img src="${emblemPath(assetBase, 'credit')}" alt="" width="20" height="20" decoding="async">${amount}</span>`
}

const svg = (body: string, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"${extra}>${body}</svg>`

export const ICONS = {
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  menu: svg('<path d="M4 7h16M4 12h11M4 17h16"/>'),
  lock: svg('<path d="M6 11h12v9H6z"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>'),
  tap: svg('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M12 10.5V9a1.5 1.5 0 0 1 3 0v2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.5 15.6a1.6 1.6 0 0 1 2.4-2.1L9 15"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  crown: svg('<path d="M4 8.5 8 12l4-6 4 6 4-3.5-1.5 9h-13z"/><path d="M6 20h12"/>'),
  play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  gear: svg('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5 19.8 7"/>'),
  scroll: svg('<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z"/><path d="M9 9h6M9 13h6"/>'),
  pad: svg('<path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 14h-4l-1 1.6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3"/>'),
  power: svg('<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>'),
  sound: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>'),
  mute: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>'),
}

export type HoldControl = {
  readonly holding: boolean
  start(): void
  cancel(): void
  destroy(): void
}

export type HoldOptions = {
  duration?: number
  canStart?: () => boolean
  onDeny?: () => void
  onStart?: () => void
  onConfirm: () => void
}

export function holdToConfirm(target: HTMLElement, options: HoldOptions): HoldControl {
  const duration = options.duration ?? 650
  let frame = 0
  let started = 0
  let holding = false
  target.classList.add('ui-hold')

  const set = (amount: number) => target.style.setProperty('--hold', amount.toFixed(3))

  function step(now: number) {
    if (!holding) return
    const amount = Math.min(1, (now - started) / duration)
    set(amount)
    if (amount >= 1) {
      stop()
      options.onConfirm()
      return
    }
    frame = requestAnimationFrame(step)
  }

  function start() {
    if (holding) return
    if (options.canStart && !options.canStart()) {
      options.onDeny?.()
      return
    }
    holding = true
    started = performance.now()
    target.dataset.holding = 'true'
    options.onStart?.()
    frame = requestAnimationFrame(step)
  }

  function stop() {
    holding = false
    cancelAnimationFrame(frame)
    target.dataset.holding = 'false'
    set(0)
  }

  function cancel() {
    if (holding) stop()
  }

  function down(event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
    }
    start()
  }

  target.addEventListener('pointerdown', down)
  target.addEventListener('pointerup', cancel)
  target.addEventListener('pointercancel', cancel)
  target.addEventListener('lostpointercapture', cancel)

  return {
    get holding() {
      return holding
    },
    start,
    cancel,
    destroy() {
      stop()
      target.removeEventListener('pointerdown', down)
      target.removeEventListener('pointerup', cancel)
      target.removeEventListener('pointercancel', cancel)
      target.removeEventListener('lostpointercapture', cancel)
    },
  }
}
