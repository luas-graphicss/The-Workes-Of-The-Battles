import { GARAGE, TEXEL } from '../../world-data'
import { drawArt, drawGlow, pushLight, type Entry } from '../city'
import { paintPlate } from '../fx/plate'
import type { RGB } from '../fx/textures'

const ART = TEXEL
const AMBER: RGB = [255, 186, 92]
const TEAL: RGB = [110, 240, 222]
const VIOLET: RGB = [200, 150, 255]

export function garageFront(): Entry[] {
  const centerX = GARAGE.door[0]
  const bottom = GARAGE.bottom
  const sign = paintPlate('MECANICA DOS IRMAOS')
  const signY = bottom - 52 * ART

  const signEntry: Entry = {
    depth: bottom - 2,
    x0: centerX - (sign.width / 2) * ART - 40,
    y0: signY - 40,
    x1: centerX + (sign.width / 2) * ART + 40,
    y1: signY + sign.height * ART + 40,
    cover: null,
    draw: (frame) => drawArt(frame, sign, centerX, signY, Math.floor(sign.width / 2), 0),
    glow: (frame, strength) => {
      const flicker = 0.78 + 0.08 * Math.sin(frame.time * 2.7) + (Math.sin(frame.time * 19) > 0.97 ? -0.18 : 0)
      drawGlow(frame, AMBER, centerX, signY + (sign.height / 2) * ART, 130, 0.3 * flicker * strength)
    },
    light: (frame, out, night) => pushLight(frame, out, centerX, signY + 40, 460, AMBER, 0.5 * night),
  }

  const doorEntry: Entry = {
    depth: bottom - 1,
    x0: centerX - 180,
    y0: bottom - 160,
    x1: centerX + 180,
    y1: bottom + 70,
    cover: null,
    glow: (frame, strength) => {
      const weld = Math.max(0, Math.sin(frame.time * 1.9) * Math.sin(frame.time * 7.3))
      const sparkle = weld > 0.55 ? (weld - 0.55) * 2.2 : 0
      drawGlow(frame, AMBER, centerX, bottom - 50, 104, (0.2 + 0.05 * Math.sin(frame.time * 1.2)) * strength)
      drawGlow(frame, TEAL, centerX - 34, bottom - 40, 70, (0.08 + 0.4 * sparkle) * strength)
      drawGlow(frame, VIOLET, centerX + 40, bottom - 46, 60, (0.06 + 0.05 * Math.sin(frame.time * 3.4 + 1)) * strength)
    },
    light: (frame, out, night) => pushLight(frame, out, centerX, bottom + 24, 380, AMBER, 0.5 * night),
  }

  return [signEntry, doorEntry]
}
