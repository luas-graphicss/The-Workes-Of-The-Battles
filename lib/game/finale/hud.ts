import { HEART_COUNT } from '../robot/progress'

export type HarvestHud = {
  show(): void
  hide(): void
  set(left: number, total: number, broken: number): void
  goal(title: string, sub: string, state: 'guarded' | 'exposed'): void
  announce(kicker: string, title: string, text: string): void
  banner(title: string, sub: string): void
  destroy(): void
}

const CARD_MS = 5600
const BANNER_MS = 2800

export function clockText(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

export function createHarvestHud(surface: HTMLElement): HarvestHud {
  const vignette = document.createElement('div')
  vignette.className = 'harvest-vignette'
  vignette.dataset.visible = 'false'
  vignette.dataset.urgency = 'calm'
  vignette.setAttribute('aria-hidden', 'true')

  const root = document.createElement('section')
  root.className = 'harvest'
  root.dataset.visible = 'false'
  root.dataset.urgency = 'calm'
  root.setAttribute('aria-label', 'A Colheita')
  root.innerHTML = `
    <div class="harvest-frame">
      <div class="harvest-clock" role="timer">
        <span class="harvest-kicker">A Colheita</span>
        <b class="harvest-time">00:00</b>
      </div>
      <span class="harvest-track" aria-hidden="true"><i></i></span>
      <div class="harvest-foot">
        <ol class="harvest-hearts" aria-hidden="true">${'<li><i></i></li>'.repeat(HEART_COUNT)}</ol>
        <span class="harvest-count"></span>
      </div>
      <p class="harvest-goal" hidden><span class="harvest-goal-title"></span><span class="harvest-goal-sub"></span></p>
    </div>
    <div class="harvest-banner" data-visible="false" aria-live="polite"><b class="harvest-banner-title"></b><span class="harvest-banner-sub"></span></div>
  `
  const card = document.createElement('section')
  card.className = 'harvest-card'
  card.dataset.visible = 'false'
  card.setAttribute('aria-live', 'assertive')
  card.innerHTML = `
    <span class="harvest-card-rule" aria-hidden="true"></span>
    <span class="harvest-card-kicker"></span>
    <h2 class="harvest-card-title"></h2>
    <p class="harvest-card-text"></p>
    <span class="harvest-card-rule" aria-hidden="true"></span>
  `
  surface.append(vignette, root, card)

  const time = root.querySelector('.harvest-time') as HTMLElement
  const track = root.querySelector('.harvest-track i') as HTMLElement
  const pips = [...root.querySelectorAll<HTMLElement>('.harvest-hearts li')]
  const count = root.querySelector('.harvest-count') as HTMLElement
  const goalBox = root.querySelector('.harvest-goal') as HTMLElement
  const goalTitle = root.querySelector('.harvest-goal-title') as HTMLElement
  const goalSub = root.querySelector('.harvest-goal-sub') as HTMLElement
  const banner = root.querySelector('.harvest-banner') as HTMLElement
  const bannerTitle = banner.querySelector('.harvest-banner-title') as HTMLElement
  const bannerSub = banner.querySelector('.harvest-banner-sub') as HTMLElement
  const cardKicker = card.querySelector('.harvest-card-kicker') as HTMLElement
  const cardTitle = card.querySelector('.harvest-card-title') as HTMLElement
  const cardText = card.querySelector('.harvest-card-text') as HTMLElement

  let shown = false
  let shownSecond = -1
  let shownBroken = -1
  let shownUrgency = 'calm'
  let shownGoal = ''
  let cardTimer: ReturnType<typeof setTimeout> | null = null
  let bannerTimer: ReturnType<typeof setTimeout> | null = null

  function replay(target: HTMLElement) {
    target.dataset.visible = 'false'
    void target.offsetWidth
    target.dataset.visible = 'true'
  }

  return {
    show() {
      if (shown) return
      shown = true
      root.dataset.visible = 'true'
      vignette.dataset.visible = 'true'
    },
    hide() {
      if (!shown) return
      shown = false
      root.dataset.visible = 'false'
      vignette.dataset.visible = 'false'
    },
    set(left, total, broken) {
      const second = Math.max(0, Math.ceil(left))
      if (second !== shownSecond) {
        shownSecond = second
        time.textContent = clockText(left)
        track.style.setProperty('--amount', String(Math.max(0, Math.min(1, left / Math.max(1, total)))))
        const urgency = left <= 60 ? 'critical' : left <= 180 || left / Math.max(1, total) <= 0.25 ? 'warn' : 'calm'
        if (urgency !== shownUrgency) {
          shownUrgency = urgency
          root.dataset.urgency = urgency
          vignette.dataset.urgency = urgency
        }
        root.setAttribute('aria-label', `A Colheita: ${clockText(left)} restantes, ${broken} de ${HEART_COUNT} corações quebrados`)
      }
      if (broken !== shownBroken) {
        const fresh = shownBroken >= 0 && broken > shownBroken
        shownBroken = broken
        pips.forEach((pip, index) => {
          pip.dataset.on = String(index < broken)
          if (fresh && index === broken - 1) replay(pip)
        })
        count.textContent = broken >= HEART_COUNT ? 'Todos quebrados' : `${broken} de ${HEART_COUNT} corações`
      }
    },
    goal(title, sub, state) {
      const key = `${state}|${title}|${sub}`
      if (key === shownGoal) return
      shownGoal = key
      goalTitle.textContent = title
      goalSub.textContent = sub
      goalBox.dataset.state = state
      goalBox.hidden = !title
    },
    announce(kicker, title, text) {
      cardKicker.textContent = kicker
      cardTitle.textContent = title
      cardText.textContent = text
      replay(card)
      if (cardTimer) clearTimeout(cardTimer)
      cardTimer = setTimeout(() => {
        card.dataset.visible = 'false'
        cardTimer = null
      }, CARD_MS)
    },
    banner(title, sub) {
      bannerTitle.textContent = title
      bannerSub.textContent = sub
      replay(banner)
      if (bannerTimer) clearTimeout(bannerTimer)
      bannerTimer = setTimeout(() => {
        banner.dataset.visible = 'false'
        bannerTimer = null
      }, BANNER_MS)
    },
    destroy() {
      if (cardTimer) clearTimeout(cardTimer)
      if (bannerTimer) clearTimeout(bannerTimer)
      vignette.remove()
      root.remove()
      card.remove()
    },
  }
}
