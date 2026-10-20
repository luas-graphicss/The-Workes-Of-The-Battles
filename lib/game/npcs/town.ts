import { TEXEL, type Point } from '../../world-data'
import { tintSheets } from '../battle/sprites'
import type { Lens, View } from '../camera'
import { drawCell } from '../fx/supersample'
import { drawShadow, shadowTexture } from '../fx/textures'
import { Player } from '../player'
import type { Progress } from '../robot/progress'
import type { RobotComposer, Sheets } from '../robot/sprites'
import type { Actor } from '../scene'
import { ANCHOR, BODY, directionFromVector, FRAME, ROW, type Direction } from '../sprite'
import { element } from '../ui/kit'
import { dressPilot, drawBadge, drawHearts, type FigureSheets } from './art'
import { FRIEND_MAX, friendship, lessonDone, MASTERS, RIVALS, type Master, type Rival } from './data'

const SHADOW = 'rgba(24, 18, 12, 0.3)'
const MASTER_SCALE = 1.12
const TALK_RANGE = 130
const NOTICE_RANGE = 260
const HEART_RANGE = 520
const STROLL = 0.3
const STILL = { x: 0, y: 0, magnitude: 0 }

export type Townsperson = { kind: 'master'; data: Master } | { kind: 'rival'; data: Rival }

class Npc {
  readonly body: Player
  private target: Point | null = null
  private rest = 0.5 + Math.random() * 2.5
  private stuck = 0

  constructor(
    readonly person: Townsperson,
    readonly sheets: FigureSheets,
    readonly scale: number,
    private readonly home: Point,
    private readonly roam: number,
    private readonly facing: Direction,
  ) {
    this.body = new Player(home)
    this.body.facing = facing
  }

  update(dt: number, focus: { x: number; y: number }) {
    const body = this.body
    if (Math.hypot(focus.x - body.x, focus.y - body.y) < NOTICE_RANGE) {
      if (body.moving) body.update(dt, STILL)
      body.facing = directionFromVector(focus.x - body.x, focus.y - body.y, body.facing, 0.3)
      this.target = null
      return
    }
    if (this.roam <= 0) {
      if (body.moving) body.update(dt, STILL)
      body.facing = this.facing
      return
    }
    if (!this.target) {
      if (body.moving) body.update(dt, STILL)
      this.rest -= dt
      if (this.rest > 0) return
      const angle = Math.random() * Math.PI * 2
      const reach = this.roam * (0.35 + Math.random() * 0.65)
      this.target = [this.home[0] + Math.cos(angle) * reach, this.home[1] + Math.sin(angle) * reach * 0.7]
      this.stuck = 0
    }
    const [tx, ty] = this.target
    const dx = tx - body.x
    const dy = ty - body.y
    const left = Math.hypot(dx, dy)
    if (left < 14) {
      this.arrive()
      return
    }
    const fromX = body.x
    const fromY = body.y
    body.speedMultiplier = STROLL
    body.update(dt, { x: dx / left, y: dy / left, magnitude: 1 })
    this.stuck = Math.hypot(body.x - fromX, body.y - fromY) < 0.5 ? this.stuck + dt : 0
    if (this.stuck > 0.5) this.arrive()
  }

  private arrive() {
    this.target = null
    this.rest = 1.5 + Math.random() * 3.5
    this.body.update(0, STILL)
  }
}

export type Town = {
  readonly actors: readonly Actor[]
  visible: boolean
  update(dt: number, focus: { x: number; y: number }): void

  nearest(x: number, y: number): Townsperson | null
  position(id: string): Point | null
  portrait(id: string): HTMLCanvasElement | null
}

export function createTown(options: { composer: RobotComposer; pilot: Sheets; progress: Progress }): Town {
  const { progress } = options
  const npcs: Npc[] = [
    ...MASTERS.map((master) => new Npc({ kind: 'master', data: master }, dressPilot(options.pilot, master.look), MASTER_SCALE, master.at, 0, master.facing)),
    ...RIVALS.map(
      (rival) => new Npc({ kind: 'rival', data: rival }, tintSheets(options.composer.compose(rival.loadout), rival.tint, rival.glow), 1, rival.home, rival.roam, 's'),
    ),
  ]
  const portraits = new Map<string, HTMLCanvasElement>()
  const shadow = shadowTexture(SHADOW)
  let focus = { x: 0, y: 0 }
  let visible = true

  function drawNpc(context: CanvasRenderingContext2D, npc: Npc, originX: number, originY: number, zoom: number) {
    const body = npc.body
    const scale = zoom * TEXEL * npc.scale
    const feetX = originX + Math.round(body.x * zoom)
    const feetY = originY + Math.round(body.y * zoom)
    const width = FRAME.width * scale
    const height = FRAME.height * scale
    const left = feetX - ANCHOR.x * scale
    const top = feetY - ANCHOR.y * scale
    const { canvas } = context
    if (left > canvas.width || left + width < 0 || top - 16 * scale > canvas.height || top + height < 0) return
    const robot = npc.person.kind === 'rival'
    context.imageSmoothingEnabled = true
    drawShadow(context, shadow, feetX, feetY - scale * 0.5, scale * (robot ? 12 : 9), scale * (robot ? 4 : 3))
    const sx = (body.moving ? body.frame : 0) * FRAME.width
    const sy = ROW[body.facing] * FRAME.height
    drawCell(context, body.moving ? npc.sheets.walk : npc.sheets.idle, sx, sy, FRAME.width, FRAME.height, left, top, width, height)
    context.imageSmoothingEnabled = true
    const u = Math.max(1, Math.round(zoom * TEXEL))
    const bob = Math.round(Math.sin(performance.now() / 320 + body.x) * 1.5) * u
    const above = Math.round(top + (BODY.top - 2) * scale) + bob
    if (npc.person.kind === 'master') {
      if (!lessonDone(progress, npc.person.data.id)) drawBadge(context, feetX, above, u, 'lesson')
      return
    }
    const level = friendship(progress, npc.person.data.id).level
    if (level === 0) drawBadge(context, feetX, above, u, 'meet')
    else if (Math.hypot(focus.x - body.x, focus.y - body.y) < HEART_RANGE) drawHearts(context, feetX, above, u, level, FRIEND_MAX)
  }

  const actors: Actor[] = npcs.map((npc) => ({
    get depth() {
      return npc.body.y
    },
    draw: (context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) => {
      if (visible) drawNpc(context, npc, originX, originY, zoom)
    },
  }))

  const find = (id: string) => npcs.find((npc) => npc.person.data.id === id) ?? null

  return {
    actors,
    get visible() {
      return visible
    },
    set visible(value: boolean) {
      visible = value
    },
    update(dt, next) {
      focus = next
      if (!visible) return
      for (const npc of npcs) npc.update(dt, next)
    },
    nearest(x, y) {
      if (!visible) return null
      let best: Npc | null = null
      let bestDistance = TALK_RANGE
      for (const npc of npcs) {
        const distance = Math.hypot(npc.body.x - x, npc.body.y - y)
        if (distance < bestDistance) {
          best = npc
          bestDistance = distance
        }
      }
      return best?.person ?? null
    },
    position(id) {
      const npc = find(id)
      return npc ? [npc.body.x, npc.body.y] : null
    },
    portrait(id) {
      const cached = portraits.get(id)
      if (cached) return cached
      const npc = find(id)
      if (!npc) return null
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const context = canvas.getContext('2d')
      if (!context) return null
      context.imageSmoothingEnabled = false
      context.drawImage(npc.sheets.idle, 8, 2, 32, 32, 0, 0, 32, 32)
      canvas.className = 'talk-portrait-art'
      portraits.set(id, canvas)
      return canvas
    },
  }
}

export type Bubble = {
  say(text: string, anchor: () => { x: number; y: number }, lift: number, seconds?: number): void
  track(lens: Lens, view: View, pixelRatio: number): void
  hide(): void
  destroy(): void
}

export function createBubble(surface: HTMLElement): Bubble {
  const root = element('div', 'npc-bubble')
  root.dataset.visible = 'false'
  root.setAttribute('aria-hidden', 'true')
  surface.append(root)
  let anchor: (() => { x: number; y: number }) | null = null
  let lift = 0
  let until = 0

  function hide() {
    anchor = null
    root.dataset.visible = 'false'
  }

  return {
    say(text, at, height, seconds = 2.8) {
      root.textContent = text
      anchor = at
      lift = height
      until = performance.now() + seconds * 1000
      root.dataset.visible = 'false'
      void root.offsetWidth
      root.dataset.visible = 'true'
    },
    track(lens, view, pixelRatio) {
      if (!anchor) return
      if (performance.now() > until) {
        hide()
        return
      }
      const { x, y } = anchor()
      const screenX = ((x - lens.x) * lens.zoom + view.width / 2) / pixelRatio
      const screenY = ((y - lift - lens.y) * lens.zoom + view.height / 2) / pixelRatio
      root.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -100%)`
    },
    hide,
    destroy() {
      root.remove()
    },
  }
}
