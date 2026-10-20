import type { Loadout } from '../robot/parts'
import type { RobotComposer, RobotSheets } from '../robot/sprites'
import { DIRECTIONS, FRAME, frameSource, type Direction } from '../sprite'

const SCALE = 4
const TURN_EVERY = 0.9
const WALK_FPS = 8
const TURN_ORDER: readonly Direction[] = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']

export class Turntable {
  readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly cache = new Map<string, RobotSheets>()
  private sheets: RobotSheets | null = null
  private clock = 0
  private walking = true

  constructor(
    private readonly composer: RobotComposer,
    label: string,
  ) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = FRAME.width * SCALE
    this.canvas.height = FRAME.height * SCALE
    this.canvas.className = 'shop-turntable'
    this.canvas.setAttribute('role', 'img')
    this.canvas.setAttribute('aria-label', label)
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível para a prévia do robô.')
    this.context = context
    context.imageSmoothingEnabled = false
  }

  show(loadout: Loadout) {
    const key = `${loadout.helmet}|${loadout.weapon}|${loadout.mobility}|${loadout.module}`
    let sheets = this.cache.get(key)
    if (!sheets) {
      sheets = this.composer.compose(loadout)
      this.cache.set(key, sheets)
    }
    this.sheets = sheets
  }

  setWalking(walking: boolean) {
    this.walking = walking
  }

  tick(dt: number) {
    if (!this.sheets) return
    this.clock += dt
    const direction = TURN_ORDER[Math.floor(this.clock / TURN_EVERY) % DIRECTIONS.length]
    const frame = this.walking ? Math.floor(this.clock * WALK_FPS) % FRAME.walkFrames : 0
    const sheet = this.walking ? this.sheets.walk : this.sheets.idle
    const { sx, sy } = frameSource(direction, frame)
    const { context, canvas } = this
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(0, 0, 0, 0.28)'
    context.beginPath()
    context.ellipse(canvas.width / 2, (FRAME.height - 4) * SCALE, 13 * SCALE, 3.5 * SCALE, 0, 0, Math.PI * 2)
    context.fill()
    context.drawImage(sheet, sx, sy, FRAME.width, FRAME.height, 0, 0, canvas.width, canvas.height)
  }
}
