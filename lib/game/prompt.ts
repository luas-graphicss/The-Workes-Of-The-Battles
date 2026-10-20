import { labelFor } from './bindings'
import { emblemPath, ICONS, type EmblemName } from './ui/kit'

export type PromptKind = 'shop' | 'arena' | 'site' | 'house' | 'master' | 'rival' | 'companion' | 'clearing' | 'heart'

export type PromptContent = {
  kicker: string
  title: string
  action: string
  kind: PromptKind
  locked?: boolean
}

export type Prompt = {
  readonly visible: boolean
  show(content: PromptContent): void
  hide(): void
  onActivate(listener: () => void): void
  destroy(): void
}

const EMBLEM: Record<PromptKind, EmblemName> = {
  shop: 'workshop',
  arena: 'arena',
  site: 'mission',
  house: 'house',
  master: 'master',
  rival: 'rival',
  companion: 'crest',
  clearing: 'clearing',
  heart: 'secret',
}

export function createPrompt(surface: HTMLElement, options: { assetBase: string }): Prompt {
  const root = document.createElement('div')
  root.className = 'game-prompt'
  root.dataset.visible = 'false'
  root.innerHTML = `
    <button type="button" class="game-prompt-hit">
      <img class="game-prompt-emblem" alt="" width="52" height="52" decoding="async">
      <span class="game-prompt-kicker"></span>
      <span class="game-prompt-title"></span>
      <span class="game-prompt-action">
        <span class="game-prompt-line" aria-hidden="true"></span>
        <span class="game-prompt-tap" aria-hidden="true">${ICONS.tap}</span>
        <kbd class="game-prompt-key"></kbd>
        <span class="game-prompt-lock" aria-hidden="true">${ICONS.lock}</span>
        <span class="game-prompt-verb"></span>
        <span class="game-prompt-line" aria-hidden="true"></span>
      </span>
    </button>
  `
  surface.append(root)

  const emblem = root.querySelector('.game-prompt-emblem') as HTMLImageElement
  const kicker = root.querySelector('.game-prompt-kicker') as HTMLElement
  const title = root.querySelector('.game-prompt-title') as HTMLElement
  const verb = root.querySelector('.game-prompt-verb') as HTMLElement
  const keyLabel = root.querySelector('.game-prompt-key') as HTMLElement
  const button = root.querySelector('.game-prompt-hit') as HTMLButtonElement
  for (const name of Object.values(EMBLEM)) new Image().src = emblemPath(options.assetBase, name)

  let visible = false
  const listeners: (() => void)[] = []

  function activate(event: Event) {
    event.stopPropagation()
    for (const listener of listeners) listener()
  }
  function swallow(event: Event) {
    event.stopPropagation()
  }

  button.addEventListener('click', activate)
  button.addEventListener('pointerdown', swallow)

  return {
    get visible() {
      return visible
    },
    show(content) {
      emblem.src = emblemPath(options.assetBase, EMBLEM[content.kind])
      kicker.textContent = content.kicker
      title.textContent = content.title
      verb.textContent = content.action
      keyLabel.textContent = labelFor('interact')
      button.setAttribute('aria-label', `${content.action}: ${content.title}`)
      root.dataset.kind = content.kind
      root.dataset.locked = String(Boolean(content.locked))
      if (visible) {
        root.dataset.visible = 'false'
        void root.offsetWidth
      }
      visible = true
      root.dataset.visible = 'true'
    },
    hide() {
      visible = false
      root.dataset.visible = 'false'
    },
    onActivate(listener) {
      listeners.push(listener)
    },
    destroy() {
      button.removeEventListener('click', activate)
      button.removeEventListener('pointerdown', swallow)
      root.remove()
    },
  }
}
