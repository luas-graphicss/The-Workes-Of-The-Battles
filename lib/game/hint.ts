export function createHint(surface: HTMLElement) {
  const element = document.createElement('div')
  element.className = 'game-hint'
  element.setAttribute('role', 'status')
  element.dataset.visible = 'false'
  surface.append(element)

  let timer: ReturnType<typeof setTimeout> | null = null

  function hide() {
    element.dataset.visible = 'false'
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function show(content: (string | Node)[], duration?: number) {
    element.replaceChildren(...content)
    element.dataset.visible = 'true'
    if (timer) clearTimeout(timer)
    timer = duration ? setTimeout(hide, duration) : null
  }

  return {
    show,
    hide,
    destroy() {
      hide()
      element.remove()
    },
  }
}

export function key(label: string) {
  const kbd = document.createElement('kbd')
  kbd.textContent = label
  return kbd
}
