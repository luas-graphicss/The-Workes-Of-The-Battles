import { element } from './kit'

export type Toast = {
  show(content: { icon: Node; kicker: string; name: string }): void
  destroy(): void
}

const TOAST_MS = 3200

export function createToast(surface: HTMLElement): Toast {
  const root = element('div', 'shop-toast game-toast')
  root.setAttribute('role', 'status')
  root.setAttribute('aria-live', 'assertive')
  root.dataset.visible = 'false'
  root.innerHTML = '<span class="shop-toast-icon"></span><span class="shop-toast-text"><span class="ui-kicker"></span><strong class="shop-toast-name"></strong></span>'
  surface.append(root)
  const icon = root.querySelector('.shop-toast-icon') as HTMLElement
  const kicker = root.querySelector('.ui-kicker') as HTMLElement
  const name = root.querySelector('.shop-toast-name') as HTMLElement
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    show(content) {
      icon.replaceChildren(content.icon)
      kicker.textContent = content.kicker
      name.textContent = content.name
      root.dataset.visible = 'false'
      void root.offsetWidth
      root.dataset.visible = 'true'
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        root.dataset.visible = 'false'
      }, TOAST_MS)
    },
    destroy() {
      if (timer) clearTimeout(timer)
      root.remove()
    },
  }
}
