import { ARENA } from '../../world-data'
import { MAIN_MISSIONS, type Mission } from '../missions/data'
import { isBossLevel, LEVEL_COUNT, WORLD_COUNT, WORLD_SIZE, WORLDS, worldOf, type World } from '../missions/ladder'
import { currentLevel, ladderCycle, missionReward, type MissionStatus } from '../missions/progress'
import { formatCredits } from '../robot/parts'
import type { Progress } from '../robot/progress'
import { FRAME } from '../sprite'
import { emblemPath, ICONS } from '../ui/kit'
import { BOSSES } from './bosses'
import type { Portrait } from './cards'
import type { EnemyArt } from './sprites'

export type TrailHandlers = {

  challenge(): void
  close(): void

  locked?: string
}

export type TrailOptions = {
  assetBase: string
  touch: boolean
  art: EnemyArt
  progress: Progress

  player: Portrait | null
}

export type TrailCard = {
  card: HTMLElement
  keys(event: KeyboardEvent): boolean
  focus(): void
}

const ANCHORS: readonly (readonly [number, number])[] = [
  [0, 300],
  [108, 70],
  [216, 290],
  [330, 50],
  [440, 260],
  [550, 36],
  [660, 250],
  [770, 60],
  [880, 270],
  [1000, 80],
]
const PATH_WIDTH = 1000
const PATH_HEIGHT = 360

function smoothPath(points: readonly (readonly [number, number])[]) {
  if (points.length < 2) return ''
  let d = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`
  }
  return d
}

const ROAD = smoothPath(ANCHORS)

function statusOf(progress: Progress, level: number): MissionStatus {
  const cursor = currentLevel(progress)
  if (level < cursor) return 'done'
  if (level === cursor) return 'next'
  return 'locked'
}

function worldStatus(progress: Progress, world: number): MissionStatus {
  const cursor = worldOf(currentLevel(progress))
  if (world < cursor) return 'done'
  if (world === cursor) return 'next'
  return 'locked'
}

function portraitCanvas(portrait: Portrait, scale: number, className: string) {
  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.width = FRAME.width * scale
  canvas.height = FRAME.height * scale
  const context = canvas.getContext('2d')
  if (context) {
    context.imageSmoothingEnabled = false
    context.drawImage(portrait.image, portrait.sx, portrait.sy, FRAME.width, FRAME.height, 0, 0, canvas.width, canvas.height)
  }
  return canvas
}

export function buildTrail(options: TrailOptions, handlers: TrailHandlers): TrailCard {
  const { progress } = options
  const cursor = currentLevel(progress)
  const cycle = ladderCycle(progress)
  let world = worldOf(cursor)
  let selected = cursor

  const card = document.createElement('article')
  card.className = 'card card-trail ui-panel'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-label', 'Trilha dos Campeões')
  card.innerHTML = `
    <header class="trail-head">
      <div class="trail-head-text">
        <span class="card-kicker">Trilha dos Campeões · ${ARENA.name}${cycle > 1 ? ` · ${cycle}º ciclo` : ''}</span>
        <h2 class="card-title trail-title"></h2>
        <p class="card-tagline trail-flavor"></p>
      </div>
      <div class="trail-progress" aria-label="Progresso na trilha">
        <b class="trail-progress-value"></b>
        <small>de ${LEVEL_COUNT} níveis</small>
        <span class="trail-progress-bar"><i></i></span>
      </div>
    </header>
    <nav class="trail-worlds" aria-label="Mundos">
      <button type="button" class="trail-nav" data-step="-1" aria-label="Mundo anterior">${ICONS.left}</button>
      <ol class="trail-world-list"></ol>
      <button type="button" class="trail-nav" data-step="1" aria-label="Próximo mundo">${ICONS.right}</button>
    </nav>
    <div class="trail-frame">
    <div class="trail-map">
      <div class="trail-inner">
        <svg class="trail-road" viewBox="0 0 ${PATH_WIDTH} ${PATH_HEIGHT}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path class="trail-road-shadow" d="${ROAD}" pathLength="100"></path>
          <path class="trail-road-base" d="${ROAD}" pathLength="100"></path>
          <path class="trail-road-done" d="${ROAD}" pathLength="100"></path>
        </svg>
        <svg class="trail-road trail-road-march" viewBox="0 0 ${PATH_WIDTH} ${PATH_HEIGHT}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path class="trail-road-dash" d="${ROAD}" pathLength="100"></path>
        </svg>
        <ol class="trail-nodes"></ol>
      </div>
      <div class="trail-locked" hidden>
        <img src="${emblemPath(options.assetBase, 'arena')}" alt="" width="56" height="56" decoding="async">
        <b></b>
        <small></small>
      </div>
    </div>
    </div>
    <footer class="trail-foot">
      <div class="trail-detail">
        <span class="trail-detail-badge"></span>
        <span class="trail-detail-text">
          <span class="card-kicker trail-detail-kicker"></span>
          <b class="trail-detail-title"></b>
          <small class="trail-detail-meta"></small>
        </span>
      </div>
      <div class="card-actions trail-actions"></div>
    </footer>
  `
  const title = card.querySelector('.trail-title') as HTMLElement
  const flavor = card.querySelector('.trail-flavor') as HTMLElement
  const progressValue = card.querySelector('.trail-progress-value') as HTMLElement
  const progressBar = card.querySelector('.trail-progress-bar i') as HTMLElement
  const worldList = card.querySelector('.trail-world-list') as HTMLElement
  const nodes = card.querySelector('.trail-nodes') as HTMLElement
  const roadDone = card.querySelector('.trail-road-done') as SVGPathElement
  const locked = card.querySelector('.trail-locked') as HTMLElement
  const detailBadge = card.querySelector('.trail-detail-badge') as HTMLElement
  const detailKicker = card.querySelector('.trail-detail-kicker') as HTMLElement
  const detailTitle = card.querySelector('.trail-detail-title') as HTMLElement
  const detailMeta = card.querySelector('.trail-detail-meta') as HTMLElement
  const actions = card.querySelector('.trail-actions') as HTMLElement

  progressValue.textContent = String(cursor - 1)
  progressBar.style.width = `${((cursor - 1) / LEVEL_COUNT) * 100}%`

  const challenge = document.createElement('button')
  challenge.type = 'button'
  challenge.className = 'ui-btn card-button card-button-primary'
  challenge.dataset.variant = 'primary'
  challenge.addEventListener('pointerdown', (event) => event.stopPropagation())
  challenge.addEventListener('click', () => handlers.challenge())
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'ui-btn card-button'
  close.innerHTML = `<span>Fechar</span>${options.touch ? '' : '<kbd>Esc</kbd>'}`
  close.addEventListener('pointerdown', (event) => event.stopPropagation())
  close.addEventListener('click', () => handlers.close())
  actions.append(challenge, close)

  for (const entry of WORLDS) {
    const item = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'trail-world'
    button.dataset.world = String(entry.index)
    button.style.setProperty('--accent', entry.accent)
    button.setAttribute('aria-label', `${entry.kicker} · ${entry.name}`)
    button.innerHTML = `<b>${entry.index}</b>`
    button.addEventListener('pointerdown', (event) => event.stopPropagation())
    button.addEventListener('click', () => {
      world = entry.index
      selected = world === worldOf(cursor) ? cursor : (world - 1) * WORLD_SIZE + 1
      render()
    })
    item.append(button)
    worldList.append(item)
  }
  for (const nav of card.querySelectorAll<HTMLButtonElement>('.trail-nav')) {
    nav.addEventListener('pointerdown', (event) => event.stopPropagation())
    nav.addEventListener('click', () => stepWorld(Number(nav.dataset.step)))
  }

  function stepWorld(delta: number) {
    const next = Math.min(WORLD_COUNT, Math.max(1, world + delta))
    if (next === world) return
    world = next
    selected = world === worldOf(cursor) ? cursor : (world - 1) * WORLD_SIZE + 1
    render()
  }

  function bossPortrait(entry: World, silhouette: boolean) {
    const boss = BOSSES[entry.boss]
    const cell = options.art.portrait({ kind: boss.kind, boss: entry.boss })
    const canvas = portraitCanvas({ image: cell.image, sx: cell.sx, sy: cell.sy }, 3, 'trail-boss-portrait')
    canvas.style.setProperty('--portrait-scale', String(boss.scale))
    if (silhouette) canvas.dataset.silhouette = 'true'
    return canvas
  }

  function missionMeta(mission: Mission, status: MissionStatus) {
    const rounds = mission.rounds.length
    const bodies = mission.rounds.flat().reduce((sum, wave) => sum + wave.count, 0)
    const prize = formatCredits(missionReward(progress, mission))
    const fight = `${rounds} ${rounds === 1 ? 'rodada' : 'rodadas'} · ${bodies} ${bodies === 1 ? 'adversário' : 'adversários'}`
    if (status === 'done') return `${fight} · vencida · pagou ${prize} ¢`
    if (status === 'next') return `${fight} · ${mission.boss ? 'grande prêmio' : 'prêmio'} ${prize} ¢`
    return `${fight} · ${mission.boss ? 'grande prêmio' : 'prêmio'} ${prize} ¢ · bloqueada`
  }

  function renderDetail() {
    const mission = MAIN_MISSIONS[selected - 1]
    const status = statusOf(progress, selected)
    const entry = WORLDS[worldOf(selected) - 1]
    detailBadge.innerHTML = mission.boss ? ICONS.crown : status === 'done' ? ICONS.check : status === 'locked' ? ICONS.lock : `<b>${selected}</b>`
    detailBadge.dataset.status = status
    detailBadge.dataset.boss = String(Boolean(mission.boss))
    const hidden = worldStatus(progress, worldOf(selected)) === 'locked'
    detailKicker.textContent = mission.boss ? `Campeão do ${entry.kicker} · Nível ${selected}` : `Nível ${selected} · ${entry.kicker}`
    detailTitle.textContent = hidden ? 'Noite ainda sem luz' : mission.boss ? `${mission.title} · ${BOSSES[mission.boss].title}` : mission.title
    detailMeta.textContent = hidden ? 'Vença o campeão do mundo anterior para revelar esta noite.' : missionMeta(mission, status)
    const next = MAIN_MISSIONS[cursor - 1]
    if (handlers.locked) {
      challenge.innerHTML = `<span>${handlers.locked}</span>`
      challenge.dataset.variant = 'ghost'
      challenge.setAttribute('aria-disabled', 'true')
    } else {
      challenge.innerHTML = `<span>${next.boss ? 'Desafiar o campeão' : `Entrar no nível ${cursor}`}</span>${options.touch ? '' : '<kbd>E</kbd>'}`
    }
  }

  function render() {
    const entry = WORLDS[world - 1]
    const wStatus = worldStatus(progress, world)
    card.style.setProperty('--accent', entry.accent)
    card.dataset.worldStatus = wStatus
    title.textContent = `${entry.kicker} · ${entry.name}`
    flavor.textContent = wStatus === 'locked' ? 'Uma trilha ainda sem luz. Os holofotes só acendem depois do campeão anterior.' : entry.flavor
    for (const button of worldList.querySelectorAll<HTMLButtonElement>('.trail-world')) {
      const index = Number(button.dataset.world)
      button.dataset.status = worldStatus(progress, index)
      button.dataset.current = String(index === world)
      button.setAttribute('aria-current', index === world ? 'true' : 'false')
    }
    for (const nav of card.querySelectorAll<HTMLButtonElement>('.trail-nav')) {
      const step = Number(nav.dataset.step)
      nav.disabled = step < 0 ? world <= 1 : world >= WORLD_COUNT
    }

    const start = (world - 1) * WORLD_SIZE
    let doneCount = 0
    nodes.replaceChildren()
    ANCHORS.forEach(([x, y], index) => {
      const level = start + index + 1
      const mission = MAIN_MISSIONS[level - 1]
      const status = statusOf(progress, level)
      if (status === 'done') doneCount++
      const item = document.createElement('li')
      item.className = 'trail-node'
      item.style.setProperty('--x', `${(x / PATH_WIDTH) * 100}%`)
      item.style.setProperty('--y', `${(y / PATH_HEIGHT) * 100}%`)
      item.dataset.status = status
      item.dataset.boss = String(isBossLevel(level))
      item.dataset.selected = String(level === selected)
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'trail-node-button'
      button.setAttribute('aria-label', `${isBossLevel(level) ? 'Campeão' : 'Nível'} ${level} · ${wStatus === 'locked' ? 'bloqueado' : mission.title}`)
      button.setAttribute('aria-pressed', String(level === selected))
      if (isBossLevel(level)) {
        button.append(bossPortrait(entry, wStatus === 'locked'))
        item.insertAdjacentHTML('beforeend', `<span class="trail-node-crown" aria-hidden="true">${ICONS.crown}</span>`)
      } else {
        button.innerHTML = `<span class="trail-node-face">${status === 'done' ? ICONS.check : status === 'locked' ? ICONS.lock : `<b>${level}</b>`}</span>`
      }
      button.addEventListener('pointerdown', (event) => event.stopPropagation())
      button.addEventListener('click', () => {
        if (selected === level && status === 'next') {
          handlers.challenge()
          return
        }
        selected = level
        for (const node of nodes.children) {
          const element = node as HTMLElement
          element.dataset.selected = String(element.dataset.level === String(level))
          element.querySelector('button')?.setAttribute('aria-pressed', element.dataset.selected ?? 'false')
        }
        renderDetail()
      })
      item.dataset.level = String(level)
      item.append(button)
      const label = document.createElement('span')
      label.className = 'trail-node-label'
      label.textContent = isBossLevel(level) ? (wStatus === 'locked' ? '???' : mission.title) : `${level}`
      item.append(label)
      if (status === 'next' && options.player) {
        const marker = document.createElement('span')
        marker.className = 'trail-here'
        marker.setAttribute('aria-hidden', 'true')
        marker.append(portraitCanvas(options.player, 3, 'trail-here-portrait'))
        marker.insertAdjacentHTML('beforeend', '<i></i>')
        item.append(marker)
      }
      nodes.append(item)
    })
    const fraction = wStatus === 'done' ? 100 : wStatus === 'locked' ? 0 : Math.min(100, (doneCount / (WORLD_SIZE - 1)) * 100)
    roadDone.style.strokeDasharray = `${fraction} 100`
    locked.hidden = wStatus !== 'locked'
    if (wStatus === 'locked') {
      ;(locked.querySelector('b') as HTMLElement).textContent = 'Trilha bloqueada'
      ;(locked.querySelector('small') as HTMLElement).textContent = `Vença ${BOSSES[WORLDS[world - 2].boss].name}, campeão do ${WORLDS[world - 2].kicker}, para acender estes holofotes.`
    }
    renderDetail()
  }

  render()

  return {
    card,
    keys(event) {
      if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        handlers.challenge()
        return true
      }
      if (event.code === 'Escape' || event.code === 'KeyX' || event.code === 'Backspace') {
        handlers.close()
        return true
      }
      if (event.code === 'ArrowLeft' || event.code === 'KeyQ') {
        stepWorld(-1)
        return true
      }
      if (event.code === 'ArrowRight' || event.code === 'KeyR') {
        stepWorld(1)
        return true
      }
      return false
    },
    focus() {
      challenge.focus({ preventScroll: true })
    },
  }
}
