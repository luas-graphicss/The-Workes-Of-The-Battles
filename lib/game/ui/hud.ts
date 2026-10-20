import { REGIONS, WORLD, type Point, type Region } from '../../world-data'
import type { Lens, View } from '../camera'
import { currencyIcon } from '../garage/catalog'
import { formatAmount } from '../garage/state'
import { formatCredits } from '../robot/parts'
import { emblemPath, ICONS, type EmblemName } from './kit'

export type HudObjective = {
  id: string
  emblem: EmblemName
  kicker: string
  title: string
  goal: string
  target: Point
}

export type Hud = {
  readonly visible: boolean
  setVisible(visible: boolean): void
  setObjective(objective: HudObjective | null): void
  setCredits(amount: number): void
  setIron(coins: number, fragments: number): void
  track(player: { x: number; y: number }, lens: Lens, view: View, pixelRatio: number): void
  greet(region: Region): void
  dismissGreeting(): void
  setFps(fps: number | null): void
  onMenu(listener: () => void): void
  destroy(): void
}

const UNITS_PER_METRE = 24
const NEAR = 280
const EDGE = { left: 44, right: 44, top: 104, bottom: 120 }
const GREETING_MS = 4700
const COUNT_MS = 650

const REGION_KICKER: Record<Region['type'], string> = {
  city: 'Distrito de Bosque Alto',
  nature: 'Paisagem',
  camp: 'Local do impacto',
  village: 'Arredores de Bosque Alto',
}

export function regionAt(x: number, y: number): Region | null {
  let best: Region | null = null
  let bestDistance = Infinity
  for (const region of REGIONS) {
    const dx = region.position[0] * WORLD.width - x
    const dy = region.position[1] * WORLD.height - y
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      bestDistance = distance
      best = region
    }
  }
  return best
}

function distanceText(units: number) {
  const metres = units / UNITS_PER_METRE
  if (metres >= 1000) return `${(metres / 1000).toFixed(1).replace('.', ',')} km`
  return `${Math.max(1, Math.round(metres / 5) * 5)} m`
}

export function createHud(surface: HTMLElement, options: { assetBase: string; touch: boolean }): Hud {
  const root = document.createElement('div')
  root.className = 'hud'
  root.dataset.visible = 'false'
  root.innerHTML = `
    <section class="hud-objective" aria-label="Objetivo atual" aria-live="polite" hidden>
      <img class="hud-objective-emblem" alt="" width="46" height="46" decoding="async">
      <div class="hud-objective-text">
        <span class="hud-kicker"></span>
        <span class="hud-objective-title"></span>
        <span class="hud-objective-goal">
          <span class="hud-arrow" aria-hidden="true"></span>
          <span class="hud-goal-name"></span>
          <span class="hud-goal-distance"></span>
        </span>
      </div>
    </section>
    <div class="hud-status">
      <div class="hud-iron ui-panel" role="status" aria-label="Moedas de Ferro e Fragmentos">
        <span class="hud-iron-item" data-currency="coins" title="Moedas de Ferro">
          <img src="${currencyIcon(options.assetBase, 'coins')}" alt="" width="26" height="26" decoding="async">
          <span class="hud-iron-value">0</span>
          <span class="sr-only">Moedas de Ferro</span>
        </span>
        <span class="hud-iron-item" data-currency="fragments" title="Fragmentos">
          <img src="${currencyIcon(options.assetBase, 'fragments')}" alt="" width="26" height="26" decoding="async">
          <span class="hud-iron-value">0</span>
          <span class="sr-only">Fragmentos</span>
        </span>
        <span class="hud-iron-delta" aria-hidden="true"></span>
      </div>
      <div class="hud-credits ui-panel" role="status" aria-label="Créditos">
        <img src="${emblemPath(options.assetBase, 'credit')}" alt="" width="29" height="29" decoding="async">
        <span class="hud-credits-text">
          <span class="hud-credits-value">0</span>
          <span class="hud-credits-label">Créditos</span>
        </span>
        <span class="hud-credits-delta" aria-hidden="true"></span>
      </div>
      <button type="button" class="hud-menu ui-btn" aria-label="Abrir o menu de pausa">${ICONS.menu}${options.touch ? '' : '<kbd>Esc</kbd>'}</button>
    </div>
    <span class="hud-fps" aria-hidden="true" hidden></span>
  `
  const marker = document.createElement('div')
  marker.className = 'hud-marker'
  marker.dataset.state = 'off'
  marker.setAttribute('aria-hidden', 'true')
  marker.innerHTML = `
    <div class="hud-marker-body">
      <img alt="" width="36" height="36" decoding="async">
      <span class="hud-marker-distance"></span>
    </div>
    <span class="hud-marker-arrow"></span>
  `
  const title = document.createElement('div')
  title.className = 'location-title'
  title.dataset.visible = 'false'
  title.setAttribute('role', 'status')
  title.innerHTML = `
    <span class="location-kicker"></span>
    <span class="location-name"></span>
    <hr class="location-rule ui-rule">
    <p class="location-desc"></p>
  `
  surface.append(marker, root, title)

  const objective = root.querySelector('.hud-objective') as HTMLElement
  const objectiveEmblem = root.querySelector('.hud-objective-emblem') as HTMLImageElement
  const kicker = root.querySelector('.hud-kicker') as HTMLElement
  const objectiveTitle = root.querySelector('.hud-objective-title') as HTMLElement
  const arrow = root.querySelector('.hud-arrow') as HTMLElement
  const goalName = root.querySelector('.hud-goal-name') as HTMLElement
  const goalDistance = root.querySelector('.hud-goal-distance') as HTMLElement
  const credits = root.querySelector('.hud-credits') as HTMLElement
  const creditsValue = root.querySelector('.hud-credits-value') as HTMLElement
  const creditsDelta = root.querySelector('.hud-credits-delta') as HTMLElement
  const iron = root.querySelector('.hud-iron') as HTMLElement
  const ironDelta = root.querySelector('.hud-iron-delta') as HTMLElement
  const ironValues = {
    coins: root.querySelector('.hud-iron-item[data-currency="coins"] .hud-iron-value') as HTMLElement,
    fragments: root.querySelector('.hud-iron-item[data-currency="fragments"] .hud-iron-value') as HTMLElement,
  }
  const menuButton = root.querySelector('.hud-menu') as HTMLButtonElement
  const fps = root.querySelector('.hud-fps') as HTMLElement
  const markerImage = marker.querySelector('img') as HTMLImageElement
  const markerDistance = marker.querySelector('.hud-marker-distance') as HTMLElement
  const markerArrow = marker.querySelector('.hud-marker-arrow') as HTMLElement
  const titleKicker = title.querySelector('.location-kicker') as HTMLElement
  const titleName = title.querySelector('.location-name') as HTMLElement
  const titleDesc = title.querySelector('.location-desc') as HTMLElement

  let visible = false
  let current: HudObjective | null = null
  let shownCredits: number | null = null
  let targetCredits = 0
  let countFrame = 0
  let greetTimer: ReturnType<typeof setTimeout> | null = null
  let deltaTimer: ReturnType<typeof setTimeout> | null = null
  let shownIron: { coins: number; fragments: number } | null = null
  let ironTimer: ReturnType<typeof setTimeout> | null = null
  let lastDistance = ''
  const listeners: (() => void)[] = []

  function openMenu(event: Event) {
    event.stopPropagation()
    for (const listener of listeners) listener()
  }
  function swallow(event: Event) {
    event.stopPropagation()
  }
  menuButton.addEventListener('click', openMenu)
  menuButton.addEventListener('pointerdown', swallow)

  function restart(element: HTMLElement, attribute: string) {
    element.removeAttribute(attribute)
    void element.offsetWidth
    element.setAttribute(attribute, 'true')
  }

  function countTo(amount: number) {
    cancelAnimationFrame(countFrame)
    const from = shownCredits ?? amount
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / COUNT_MS)
      const eased = 1 - (1 - t) ** 3
      creditsValue.textContent = formatCredits(Math.round(from + (amount - from) * eased))
      if (t < 1) countFrame = requestAnimationFrame(step)
    }
    countFrame = requestAnimationFrame(step)
  }

  let markerState = 'off'
  let markerX = NaN
  let markerY = NaN
  let lastNear: boolean | null = null
  let lastAngle: number | null = null
  let lastMarkerAngle: number | null = null

  function hideMarker() {
    if (markerState === 'off') return
    markerState = 'off'
    marker.dataset.state = 'off'
  }

  function placeMarker(state: string, x: number, y: number) {
    if (state !== markerState) {
      markerState = state
      marker.dataset.state = state
    }
    const sx = Math.round(x * 2) / 2
    const sy = Math.round(y * 2) / 2
    if (sx === markerX && sy === markerY) return
    markerX = sx
    markerY = sy
    marker.style.transform = `translate(${sx}px, ${sy}px)`
  }

  return {
    get visible() {
      return visible
    },

    setVisible(next) {
      if (next === visible) return
      visible = next
      root.dataset.visible = String(next)
      if (!next) hideMarker()
    },

    setObjective(next) {
      if (next?.id === current?.id) {
        current = next
        return
      }
      current = next
      lastDistance = ''
      if (!next) {
        objective.hidden = true
        hideMarker()
        return
      }
      objective.hidden = false
      objectiveEmblem.src = emblemPath(options.assetBase, next.emblem)
      markerImage.src = emblemPath(options.assetBase, next.emblem)
      kicker.textContent = next.kicker
      objectiveTitle.textContent = next.title
      goalName.textContent = next.goal
      goalDistance.textContent = ''
      restart(objective, 'data-changed')
    },

    setIron(coins, fragments) {
      if (shownIron && shownIron.coins === coins && shownIron.fragments === fragments) return
      const previous = shownIron
      shownIron = { coins, fragments }
      ironValues.coins.textContent = formatAmount(coins)
      ironValues.fragments.textContent = formatAmount(fragments)
      if (!previous) return
      const gainedCoins = coins - previous.coins
      const gainedFragments = fragments - previous.fragments
      const parts: string[] = []
      if (gainedCoins) parts.push(`${gainedCoins > 0 ? '+' : '−'}${formatAmount(Math.abs(gainedCoins))}`)
      if (gainedFragments) parts.push(`${gainedFragments > 0 ? '+' : '−'}${formatAmount(Math.abs(gainedFragments))} ◆`)
      ironDelta.textContent = parts.join('  ')
      ironDelta.dataset.sign = gainedCoins < 0 || (gainedCoins === 0 && gainedFragments < 0) ? 'loss' : 'gain'
      restart(ironDelta, 'data-run')
      restart(iron, 'data-bump')
      if (ironTimer) clearTimeout(ironTimer)
      ironTimer = setTimeout(() => ironDelta.removeAttribute('data-run'), 1700)
    },

    setCredits(amount) {
      if (shownCredits === null) {
        shownCredits = amount
        targetCredits = amount
        creditsValue.textContent = formatCredits(amount)
        return
      }
      if (amount === targetCredits) return
      const delta = amount - targetCredits
      targetCredits = amount
      countTo(amount)
      shownCredits = amount
      creditsDelta.textContent = `${delta > 0 ? '+' : '−'}${formatCredits(Math.abs(delta))}`
      creditsDelta.dataset.sign = delta > 0 ? 'gain' : 'loss'
      restart(creditsDelta, 'data-run')
      restart(credits, 'data-bump')
      if (deltaTimer) clearTimeout(deltaTimer)
      deltaTimer = setTimeout(() => creditsDelta.removeAttribute('data-run'), 1700)
    },

    track(player, lens, view, pixelRatio) {
      if (!current || !visible) {
        hideMarker()
        return
      }
      const [tx, ty] = current.target
      const dx = tx - player.x
      const dy = ty - player.y
      const units = Math.hypot(dx, dy)
      const near = units < NEAR
      if (near !== lastNear) {
        lastNear = near
        objective.dataset.near = String(near)
      }

      const angle = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)
      if (angle !== lastAngle) {
        lastAngle = angle
        arrow.style.setProperty('--angle', `${angle}deg`)
      }
      const text = near ? 'aqui' : distanceText(units)
      if (text !== lastDistance) {
        lastDistance = text
        goalDistance.textContent = text
        markerDistance.textContent = near ? '' : text
      }
      if (near) {
        hideMarker()
        return
      }

      const width = view.width / pixelRatio
      const height = view.height / pixelRatio
      const sx = ((tx - lens.x) * lens.zoom + view.width / 2) / pixelRatio
      const sy = ((ty - lens.y) * lens.zoom + view.height / 2) / pixelRatio
      const inside = sx >= EDGE.left && sx <= width - EDGE.right && sy >= EDGE.top && sy <= height - EDGE.bottom
      if (inside) {
        placeMarker('onscreen', sx, sy)
        return
      }
      const cx = width / 2
      const cy = height / 2
      const rx = sx - cx
      const ry = sy - cy
      const scaleX = rx > 0 ? (width - EDGE.right - cx) / rx : rx < 0 ? (EDGE.left - cx) / rx : Infinity
      const scaleY = ry > 0 ? (height - EDGE.bottom - cy) / ry : ry < 0 ? (EDGE.top - cy) / ry : Infinity
      const scale = Math.max(0, Math.min(scaleX, scaleY))
      const ex = cx + rx * scale
      const ey = cy + ry * scale
      placeMarker('edge', ex, ey)
      const markerAngle = Math.round((Math.atan2(rx, -ry) * 180) / Math.PI)
      if (markerAngle !== lastMarkerAngle) {
        lastMarkerAngle = markerAngle
        markerArrow.style.setProperty('--angle', `${markerAngle}deg`)
      }
    },

    greet(region) {
      titleKicker.textContent = region.kicker ?? REGION_KICKER[region.type]
      titleName.textContent = region.name
      titleDesc.textContent = region.description
      title.dataset.visible = 'false'
      void title.offsetWidth
      title.dataset.visible = 'true'
      if (greetTimer) clearTimeout(greetTimer)
      greetTimer = setTimeout(() => {
        title.dataset.visible = 'false'
        greetTimer = null
      }, GREETING_MS)
    },

    dismissGreeting() {
      if (greetTimer) clearTimeout(greetTimer)
      greetTimer = null
      title.dataset.visible = 'false'
    },

    setFps(value) {
      fps.hidden = value === null
      if (value !== null) fps.textContent = `${value} FPS`
    },

    onMenu(listener) {
      listeners.push(listener)
    },

    destroy() {
      cancelAnimationFrame(countFrame)
      if (ironTimer) clearTimeout(ironTimer)
      if (greetTimer) clearTimeout(greetTimer)
      if (deltaTimer) clearTimeout(deltaTimer)
      menuButton.removeEventListener('click', openMenu)
      menuButton.removeEventListener('pointerdown', swallow)
      marker.remove()
      root.remove()
      title.remove()
    },
  }
}
