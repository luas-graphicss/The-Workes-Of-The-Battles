import { TEXEL } from '../../world-data'
import { drawCell } from '../fx/supersample'
import type { FigureSheets } from '../npcs/art'
import type { Actor } from '../scene'
import { ANCHOR, BODY, FRAME, frameSource, type Direction } from '../sprite'

export type VisitorArt = { idle: HTMLImageElement; walk: HTMLImageElement; pose: HTMLImageElement; disguise: FigureSheets }

export type VisitorPose = 'reach' | 'recoil' | 'kneel'

const POSE_COLUMN: Record<VisitorPose, number> = { reach: 0, recoil: 1, kneel: 2 }
const SHADOW = 'rgba(14, 10, 24, 0.4)'
const SCAN = 'rgba(196, 160, 255, 0.95)'
const AURA: readonly [number, number, number] = [226, 212, 255]

export class Visitor {
  x = 0
  y = 0
  facing: Direction = 's'
  frame = 0
  moving = false
  pose: VisitorPose | null = null

  rise = 1

  glow = 0

  disguise = 0
  visible = false

  place(x: number, y: number, facing: Direction = this.facing) {
    this.x = x
    this.y = y
    this.facing = facing
  }
}

function silhouette(sheet: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = sheet.width
  canvas.height = sheet.height
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.drawImage(sheet, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = `rgb(${AURA[0]} ${AURA[1]} ${AURA[2]})`
  context.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

export function visitorActors(visitors: readonly Visitor[], art: VisitorArt): Actor[] {
  const glow = { idle: silhouette(art.idle), walk: silhouette(art.walk), pose: silhouette(art.pose) }
  return visitors.map((visitor) => ({
    get depth() {
      return visitor.y
    },
    draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
      if (!visitor.visible) return
      const scale = zoom * TEXEL
      const feetX = originX + Math.round(visitor.x * zoom)
      const feetY = originY + Math.round(visitor.y * zoom)
      const sink = Math.round((1 - visitor.rise) * (ANCHOR.y - BODY.top) * scale)
      const width = FRAME.width * scale
      const height = FRAME.height * scale
      const left = feetX - ANCHOR.x * scale
      const top = feetY - ANCHOR.y * scale + sink
      const { canvas } = context
      if (left > canvas.width || left + width < 0 || top - sink > canvas.height || top + height < 0) return

      const posed = visitor.pose !== null
      const { sx, sy } = posed ? { sx: POSE_COLUMN[visitor.pose as VisitorPose] * FRAME.width, sy: 0 } : frameSource(visitor.facing, visitor.moving ? visitor.frame : 0)
      const sheet = posed ? art.pose : visitor.moving ? art.walk : art.idle
      const aura = posed ? glow.pose : visitor.moving ? glow.walk : glow.idle
      const human = visitor.moving ? art.disguise.walk : art.disguise.idle
      const disguise = posed ? 0 : visitor.disguise

      context.imageSmoothingEnabled = false
      if (visitor.rise >= 1) {
        context.fillStyle = SHADOW
        context.beginPath()
        context.ellipse(feetX, feetY - scale * 0.5, scale * 8, scale * 2.6, 0, 0, Math.PI * 2)
        context.fill()
      }
      const clipped = sink > 0
      if (clipped) {
        context.save()
        context.beginPath()
        context.rect(left - scale, top - scale - sink, width + scale * 2, feetY - (top - scale - sink))
        context.clip()
      }
      if (disguise <= 0) {
        drawCell(context, sheet, sx, sy, FRAME.width, FRAME.height, left, top, width, height)
      } else if (disguise >= 1) {
        drawCell(context, human, sx, sy, FRAME.width, FRAME.height, left, top, width, height)
      } else {
        const cut = Math.max(1, Math.min(FRAME.height - 1, Math.round(disguise * FRAME.height)))
        drawCell(context, human, sx, sy, FRAME.width, cut, left, top, width, cut * scale)
        drawCell(context, sheet, sx, sy + cut, FRAME.width, FRAME.height - cut, left, top + cut * scale, width, (FRAME.height - cut) * scale)
        context.globalCompositeOperation = 'lighter'
        context.fillStyle = SCAN
        context.fillRect(left + 9 * scale, top + (cut - 1) * scale, width - 18 * scale, scale * 1.5)
        context.globalCompositeOperation = 'source-over'
      }
      if (visitor.glow > 0.01 && disguise < 1) {
        context.globalAlpha = Math.min(1, visitor.glow)
        drawCell(context, aura, sx, sy, FRAME.width, FRAME.height, left, top, width, height)
        context.globalAlpha = 1
      }
      if (clipped) context.restore()
      context.imageSmoothingEnabled = true
    },
  }))
}
