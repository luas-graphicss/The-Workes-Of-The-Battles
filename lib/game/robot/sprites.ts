import { DIRECTIONS, FACING_AWAY, FRAME, ROW, type Direction } from '../sprite'
import { paintCrystal, type CrystalPalette } from './crystal'
import { BODY_ID, PARTS, SLOTS, partById, type Loadout, type Part } from './parts'

export type Sheets = { idle: HTMLImageElement; walk: HTMLImageElement }

export type RobotSheets = { idle: HTMLCanvasElement; walk: HTMLCanvasElement; idleGlow: HTMLCanvasElement; walkGlow: HTMLCanvasElement }

export const ROBOT_ASSET_IDS: readonly string[] = [BODY_ID, ...PARTS.map((part) => part.id)]

export function robotSheetPaths(base: string, id: string) {
  return { idle: `${base}assets/robot/${id}/idle.png`, walk: `${base}assets/robot/${id}/walk.png` }
}

type Source = HTMLImageElement | HTMLCanvasElement

export class RobotComposer {
  constructor(private readonly sheets: ReadonlyMap<string, Sheets>) {}

  has(id: string) {
    return this.sheets.has(id)
  }

  compose(loadout: Loadout, crystal: CrystalPalette | null = null): RobotSheets {
    const body = this.sheets.get(BODY_ID)
    if (!body) throw new Error('A folha de sprites do chassi B-01 não foi carregada.')
    const parts = SLOTS.map((slot) => partById(loadout[slot])).filter((part): part is Part => part !== null && this.sheets.has(part.id))
    const idle = createSheet(FRAME.width, FRAME.height * DIRECTIONS.length)
    const walk = createSheet(FRAME.width * FRAME.walkFrames, FRAME.height * DIRECTIONS.length)
    for (const direction of DIRECTIONS) {
      const order = layerOrder(parts, direction)
      const y = ROW[direction] * FRAME.height
      for (const id of order) {
        const source = this.sheets.get(id) as Sheets
        drawRow(idle, source.idle, y, FRAME.width)
        drawRow(walk, source.walk, y, FRAME.width * FRAME.walkFrames)
      }
      if (crystal) {
        paintCrystal(idle, 0, y, direction, -1, crystal)
        for (let frame = 0; frame < FRAME.walkFrames; frame++) paintCrystal(walk, frame * FRAME.width, y, direction, frame, crystal)
      }
    }
    return { idle: idle.canvas, walk: walk.canvas, idleGlow: silhouette(idle.canvas), walkGlow: silhouette(walk.canvas) }
  }

  cell(id: string, direction: Direction = 's', frame = 0, animation: 'idle' | 'walk' = 'idle'): { image: Source; sx: number; sy: number } | null {
    const source = this.sheets.get(id)
    if (!source) return null
    return { image: source[animation], sx: (animation === 'walk' ? frame % FRAME.walkFrames : 0) * FRAME.width, sy: ROW[direction] * FRAME.height }
  }
}

function layerOrder(parts: Part[], direction: Direction): string[] {
  const back = parts.filter((part) => part.layer === 'back').map((part) => part.id)
  const legs = parts.filter((part) => part.layer === 'legs').map((part) => part.id)
  const front = parts.filter((part) => part.layer === 'front').map((part) => part.id)
  return FACING_AWAY.has(direction) ? [BODY_ID, ...legs, ...back, ...front] : [...back, BODY_ID, ...legs, ...front]
}

function createSheet(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para o robô.')
  context.imageSmoothingEnabled = false
  return context
}

function drawRow(target: CanvasRenderingContext2D, source: Source, y: number, width: number) {
  target.drawImage(source, 0, y, width, FRAME.height, 0, y, width, FRAME.height)
}

function silhouette(sheet: HTMLCanvasElement): HTMLCanvasElement {
  const context = createSheet(sheet.width, sheet.height)
  context.drawImage(sheet, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = '#fff8ec'
  context.fillRect(0, 0, sheet.width, sheet.height)
  return context.canvas
}
