import { SECRET_SENSE_RADIUS, SECRET_SPOTS, TEXEL, type Point } from '../../world-data'
import { drawArt, type Entry } from '../city'
import { canvasOf, pixel } from '../fx/plate'

const ART = TEXEL
const VIOLET = ['#2a1f4a', '#4a3580', '#7a5fc4', '#b9a4ff', '#f3ecff']
const SHADOW = ['rgba(14, 18, 16, 0.42)', 'rgba(14, 18, 16, 0.24)']
const MOTES = 2
const REVEAL = 0.45

export type SecretView = {
  collected(spotId: string): boolean
  unlocked(spotId: string): boolean
  focus(): Point
}

function paintShard(): HTMLCanvasElement {
  const paint = canvasOf(7, 7)
  pixel(paint, 0, 6, SHADOW[1], 7, 1)
  pixel(paint, 1, 5, SHADOW[0], 5, 1)
  pixel(paint, 2, 1, VIOLET[2], 1, 4)
  pixel(paint, 3, 1, VIOLET[3], 1, 4)
  pixel(paint, 4, 2, VIOLET[1], 1, 3)
  pixel(paint, 3, 0, VIOLET[4])
  pixel(paint, 1, 3, VIOLET[0], 1, 2)
  pixel(paint, 5, 3, VIOLET[0], 1, 2)
  return paint.canvas
}

export function secretPickups(view: SecretView): Entry[] {
  const shard = paintShard()
  return SECRET_SPOTS.map(({ id, at: [x, y] }, index): Entry => {
    const phase = index * 2.1
    return {
      depth: y,
      x0: x - 40,
      y0: y - 90,
      x1: x + 40,
      y1: y + 20,
      cover: null,
      draw: (frame) => {
        if (!view.unlocked(id) || view.collected(id)) return
        const [fx, fy] = view.focus()
        const near = 1 - Math.min(1, Math.hypot(fx - x, fy - y) / SECRET_SENSE_RADIUS)
        if (near <= 0) return
        const { context } = frame
        context.globalAlpha = frame.alpha * Math.min(1, near / REVEAL)
        drawArt(frame, shard, x, y, 3, 6)
        const size = Math.max(1, Math.round(frame.scale))
        context.fillStyle = 'rgb(243 236 255)'
        for (let k = 0; k < MOTES; k++) {
          const p = (frame.time * 0.3 + k / MOTES + phase) % 1
          const blink = Math.floor(frame.time * 2.5 + k * 1.7 + phase) % 3 === 0 ? 1 : 0.3
          const alpha = Math.sin(p * Math.PI) * near * near * blink
          if (alpha <= 0.05) continue
          const sx = x + Math.sin(p * 7 + k * 2.4 + phase) * 4 * ART
          const sy = y - (3 + p * 12) * ART
          context.globalAlpha = frame.alpha * alpha
          context.fillRect(Math.round(frame.originX + Math.round(sx / ART) * frame.scale), Math.round(frame.originY + Math.round(sy / ART) * frame.scale), size, size)
        }
        context.globalAlpha = frame.alpha
      },
    }
  })
}
