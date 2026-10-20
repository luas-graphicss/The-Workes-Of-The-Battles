import { SHOP, TEXEL } from '../../world-data'
import { drawArt, drawGlow, pushLight, type Entry, type Frame } from '../city'
import { canvasOf, GLOW, INK, METAL, paintPlate, pixel } from '../fx/plate'
import type { RGB } from '../fx/textures'
import { PARTS, shopPartsInSlot } from '../robot/parts'
import type { RobotComposer } from '../robot/sprites'
import { FRAME } from '../sprite'

const ART = TEXEL

const AMBER: RGB = [255, 196, 96]
const TEAL: RGB = [126, 255, 224]

const SIGN_TEXT = 'OFICINA'

function paintSign(): HTMLCanvasElement {
  return paintPlate(SIGN_TEXT)
}

function paintStand(): HTMLCanvasElement {
  const width = 14
  const height = 9
  const paint = canvasOf(width, height)
  pixel(paint, 1, 0, METAL[3], width - 2, 1)
  pixel(paint, 0, 1, METAL[2], width, 2)
  pixel(paint, 0, 3, METAL[1], width, 5)
  pixel(paint, 1, 8, INK, width - 2, 1)
  pixel(paint, 2, 4, GLOW[0], width - 4, 1)
  pixel(paint, 3, 4, GLOW[1], width - 6, 1)
  pixel(paint, 6, 4, GLOW[2], 2, 1)
  pixel(paint, 0, 3, INK, 1, 5)
  pixel(paint, width - 1, 3, INK, 1, 5)
  return paint.canvas
}

const SHOWCASES: string[][] = [
  [...shopPartsInSlot('helmet'), ...shopPartsInSlot('weapon')].map((part) => part.id),
  [...shopPartsInSlot('mobility'), ...shopPartsInSlot('module')].map((part) => part.id),
]
const SHOWCASE_PERIOD = 2.6
const SHOWCASE_FADE = 0.35

export function shopFront(composer: RobotComposer): Entry[] {
  const centerX = SHOP.door[0]
  const bottom = SHOP.bottom
  const sign = paintSign()
  const stand = paintStand()

  const signY = bottom - 82 * ART
  const signX0 = centerX - (sign.width / 2) * ART
  const signEntry: Entry = {
    depth: bottom - 2,
    x0: signX0 - 40,
    y0: signY - 40,
    x1: signX0 + sign.width * ART + 40,
    y1: signY + sign.height * ART + 40,
    cover: null,
    draw: (frame) => drawArt(frame, sign, centerX, signY, Math.floor(sign.width / 2), 0),
    glow: (frame, strength) => {
      const flicker = 0.75 + 0.1 * Math.sin(frame.time * 3.1) + (Math.sin(frame.time * 23) > 0.96 ? -0.2 : 0)
      drawGlow(frame, AMBER, centerX, signY + (sign.height / 2) * ART, 110, 0.32 * flicker * strength)
    },
    light: (frame, out, night) => pushLight(frame, out, centerX, signY + 40, 420, AMBER, 0.55 * night),
  }

  const doorEntry: Entry = {
    depth: bottom - 1,
    x0: centerX - 160,
    y0: bottom - 140,
    x1: centerX + 160,
    y1: bottom + 60,
    cover: null,
    glow: (frame, strength) => {
      const breathe = 0.85 + 0.15 * Math.sin(frame.time * 1.3)
      drawGlow(frame, AMBER, centerX, bottom - 44, 96, 0.22 * breathe * strength)
    },
    light: (frame, out, night) => pushLight(frame, out, centerX, bottom + 20, 360, AMBER, 0.5 * night),
  }

  const stands = SHOP.displays.map(([x, y], index): Entry => {
    const items = SHOWCASES[index % SHOWCASES.length]
    const phase = index * 1.3
    const floatY = (time: number) => y - 16 * ART + Math.round(Math.sin(time * 1.7 + phase) * 2) * ART
    const pick = (time: number) => {
      const cycle = (time + phase) / SHOWCASE_PERIOD
      const slot = Math.floor(cycle) % items.length
      const within = (cycle - Math.floor(cycle)) * SHOWCASE_PERIOD
      const alpha = Math.min(1, within / SHOWCASE_FADE, (SHOWCASE_PERIOD - within) / SHOWCASE_FADE)
      return { id: items[slot], alpha }
    }
    return {
      depth: y,
      x0: x - 30 * ART,
      y0: y - 70 * ART,
      x1: x + 30 * ART,
      y1: y + 6 * ART,
      cover: null,
      draw: (frame) => {
        const { context } = frame
        drawArt(frame, stand, x, y, Math.floor(stand.width / 2), stand.height - 1)
        const { id, alpha } = pick(frame.time)
        const cell = composer.cell(id, 's')
        if (!cell) return
        const top = floatY(frame.time)
        const px = Math.round(x / ART) - FRAME.width / 2
        const py = Math.round(top / ART) - FRAME.height + 4
        const left = Math.round(frame.originX + px * frame.scale)
        const topPx = Math.round(frame.originY + py * frame.scale)
        const size = Math.round(FRAME.width * frame.scale)
        context.globalAlpha = frame.alpha * alpha
        context.drawImage(cell.image, cell.sx, cell.sy, FRAME.width, FRAME.height, left, topPx, size, size)
        context.globalAlpha = frame.alpha
      },
      glow: (frame, strength) => {
        const { alpha } = pick(frame.time)
        drawGlow(frame, TEAL, x, floatY(frame.time) - 18 * ART, 60, (0.18 + 0.1 * alpha) * strength)
        drawGlow(frame, TEAL, x, y - 4 * ART, 40, 0.14 * strength)
      },
      light: (frame, out, night) => pushLight(frame, out, x, y - 40, 260, TEAL, 0.35 * night),
    }
  })

  return [signEntry, doorEntry, ...stands]
}

export const SHOWCASE_IDS: readonly string[] = PARTS.map((part) => part.id)
