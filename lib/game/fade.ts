export type Fade = {
  cover(duration?: number): Promise<void>
  clear(duration?: number): Promise<void>
  destroy(): void
}

const COVER_MS = 520
const CLEAR_MS = 640
const REDUCED_MS = 120

export function createFade(surface: HTMLElement, reducedMotion: boolean): Fade {
  const sheet = document.createElement('div')
  sheet.className = 'game-fade'
  sheet.dataset.covered = 'false'
  sheet.setAttribute('aria-hidden', 'true')
  surface.append(sheet)

  let timer: ReturnType<typeof setTimeout> | null = null

  function run(covered: boolean, duration: number) {
    const ms = reducedMotion ? Math.min(duration, REDUCED_MS) : duration
    if (timer) clearTimeout(timer)
    sheet.style.setProperty('--fade-ms', `${ms}ms`)
    sheet.dataset.covered = String(covered)
    return new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timer = null
        resolve()
      }, ms + 30)
    })
  }

  return {
    cover: (duration = COVER_MS) => run(true, duration),
    clear: (duration = CLEAR_MS) => run(false, duration),
    destroy() {
      if (timer) clearTimeout(timer)
      sheet.remove()
    },
  }
}
