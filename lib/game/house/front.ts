import { HOUSE, TEXEL } from '../../world-data'
import { drawArt, drawGlow, pushLight, type Entry } from '../city'
import { canvasOf, GOLD, INK, METAL, paintPlate, pixel } from '../fx/plate'
import type { RGB } from '../fx/textures'

const ART = TEXEL

const WARM: RGB = [255, 190, 110]
const CANDLE: RGB = [255, 214, 150]

const PLATE_TEXT = 'B-01'

const nightly = (strength: number) => Math.min(1, Math.max(0, (strength - 1) / 1.2))

function paintLantern(): HTMLCanvasElement {
  const width = 5
  const height = 9
  const paint = canvasOf(width, height)
  pixel(paint, 2, 0, METAL[3])
  pixel(paint, 1, 1, GOLD[1], 3, 1)
  pixel(paint, 0, 2, INK, 5, 5)
  pixel(paint, 1, 3, GOLD[3], 3, 3)
  pixel(paint, 2, 4, GOLD[4])
  pixel(paint, 1, 7, GOLD[1], 3, 1)
  pixel(paint, 2, 8, METAL[2])
  return paint.canvas
}

export function houseFront(): Entry[] {
  const plate = paintPlate(PLATE_TEXT)
  const lantern = paintLantern()
  const [plateX, plateY] = HOUSE.plate
  const bottom = HOUSE.bottom

  const plateEntry: Entry = {
    depth: bottom - 2,
    x0: plateX - plate.width * ART,
    y0: plateY - 40,
    x1: plateX + plate.width * ART,
    y1: plateY + plate.height * ART + 40,
    cover: null,
    draw: (frame) => drawArt(frame, plate, plateX, plateY, Math.floor(plate.width / 2), 0),
    glow: (frame, strength) => drawGlow(frame, WARM, plateX, plateY + (plate.height / 2) * ART, 70, 0.1 + 0.3 * nightly(strength)),
    light: (frame, out, night) => pushLight(frame, out, plateX, plateY + 30, 300, WARM, 0.4 * night),
  }

  const lanternX = HOUSE.door[0] + 16 * ART
  const lanternY = bottom - 30 * ART
  const lanternEntry: Entry = {
    depth: bottom - 1,
    x0: lanternX - 60,
    y0: lanternY - 60,
    x1: lanternX + 60,
    y1: lanternY + 80,
    cover: null,
    draw: (frame) => drawArt(frame, lantern, lanternX, lanternY, 2, 4),
    glow: (frame, strength) => {
      const flicker = 0.8 + 0.12 * Math.sin(frame.time * 7.3) + 0.08 * Math.sin(frame.time * 13.1)
      drawGlow(frame, CANDLE, lanternX, lanternY, 56, (0.12 + 0.5 * nightly(strength)) * flicker)
    },
    light: (frame, out, night) => pushLight(frame, out, lanternX, lanternY + 40, 340, CANDLE, 0.55 * night),
  }

  const windows = HOUSE.windows.map(([x, y], index): Entry => {
    const phase = index * 1.7
    return {
      depth: bottom - 3,
      x0: x - 120,
      y0: y - 120,
      x1: x + 120,
      y1: y + 160,
      cover: null,
      glow: (frame, strength) => {
        const night = nightly(strength)
        if (night <= 0) return
        const breathe = 0.9 + 0.1 * Math.sin(frame.time * 0.9 + phase)
        drawGlow(frame, WARM, x, y, 88, 0.55 * breathe * night)
        drawGlow(frame, CANDLE, x, y, 40, 0.3 * breathe * night)
      },
      light: (frame, out, night) => pushLight(frame, out, x, y + 90, 420, WARM, 0.5 * night),
    }
  })

  return [plateEntry, lanternEntry, ...windows]
}
