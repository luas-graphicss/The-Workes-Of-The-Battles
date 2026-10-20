import type { QteDir, QteView } from './gadgets'

export type FuryOverlay = {
  sync(view: QteView | null): void
  destroy(): void
}

const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>'
const DIRS: readonly QteDir[] = ['up', 'left', 'down', 'right']
const LABEL: Record<QteDir, string> = { up: 'cima', down: 'baixo', left: 'esquerda', right: 'direita' }

export function createFuryOverlay(surface: HTMLElement, options: { touch: boolean; onPress(dir: QteDir): void }): FuryOverlay {
  const root = document.createElement('div')
  root.className = 'fury'
  root.dataset.visible = 'false'
  root.dataset.touch = String(options.touch)
  root.setAttribute('role', 'status')
  root.setAttribute('aria-live', 'assertive')
  root.innerHTML = `
    <div class="fury-frame">
      <span class="fury-kicker">Imprevisível · Fúria</span>
      <strong class="fury-title">Repita a sequência</strong>
      <div class="fury-keys"></div>
      <div class="fury-timer" aria-hidden="true"><i></i></div>
      <span class="fury-hint">${options.touch ? 'Toque nas setas na ordem certa' : 'Setas ou W A S D · cada acerto vira um golpe'}</span>
    </div>
    <div class="fury-pad" aria-label="Setas da fúria">
      ${DIRS.map((dir) => `<button type="button" class="fury-pad-key" data-dir="${dir}" aria-label="Seta para ${LABEL[dir]}">${ARROW}</button>`).join('')}
    </div>
  `
  surface.append(root)

  const keys = root.querySelector('.fury-keys') as HTMLElement
  const timer = root.querySelector('.fury-timer i') as HTMLElement
  const title = root.querySelector('.fury-title') as HTMLElement
  const cleanups: (() => void)[] = []
  let sequence: readonly QteDir[] | null = null
  let shown = -1
  let visible = false

  for (const button of root.querySelectorAll<HTMLButtonElement>('.fury-pad-key')) {
    const down = (event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      button.dataset.pressed = 'true'
      setTimeout(() => button.removeAttribute('data-pressed'), 120)
      options.onPress(button.dataset.dir as QteDir)
    }
    button.addEventListener('pointerdown', down)
    cleanups.push(() => button.removeEventListener('pointerdown', down))
  }
  const swallow = (event: Event) => event.stopPropagation()
  root.addEventListener('pointerdown', swallow)
  cleanups.push(() => root.removeEventListener('pointerdown', swallow))

  function build(next: readonly QteDir[]) {
    sequence = next
    shown = -1
    keys.innerHTML = next.map((dir, index) => `<span class="fury-key" data-dir="${dir}" data-state="${index === 0 ? 'current' : 'pending'}" style="--index:${index}" aria-label="${LABEL[dir]}">${ARROW}</span>`).join('')
  }

  return {
    sync(view) {
      if (!view) {
        if (visible) {
          visible = false
          root.dataset.visible = 'false'
        }
        sequence = null
        return
      }
      if (view.sequence !== sequence) build(view.sequence)
      if (!visible) {
        visible = true
        root.dataset.visible = 'true'
      }
      timer.style.setProperty('--amount', Math.max(0, view.left / view.total).toFixed(3))
      root.dataset.urgent = String(view.left < 1.2)
      if (view.results.length === shown) return
      shown = view.results.length
      const nodes = keys.children
      for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index] as HTMLElement
        node.dataset.state = index < view.results.length ? (view.results[index] ? 'hit' : 'miss') : index === view.results.length ? 'current' : 'pending'
      }
      const hits = view.results.filter(Boolean).length
      title.textContent = view.results.length ? `${hits} de ${view.sequence.length} golpes` : 'Repita a sequência'
    },
    destroy() {
      for (const cleanup of cleanups) cleanup()
      root.remove()
    },
  }
}
