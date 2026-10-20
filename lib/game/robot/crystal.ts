import type { RobotClass } from '../battle/classes'
import type { RGB } from '../fx/textures'
import { ANCHOR, type Direction } from '../sprite'

export type CrystalPalette = { rim: RGB; base: RGB; light: RGB; glow: RGB }

const palette = (rim: RGB, base: RGB, light: RGB, glow: RGB): CrystalPalette => ({ rim, base, light, glow })

export const CLASS_CRYSTAL: Record<RobotClass, CrystalPalette> = {
  atirador: palette([120, 58, 10], [255, 160, 48], [255, 228, 150], [255, 190, 90]),
  lutador: palette([110, 20, 24], [240, 70, 64], [255, 180, 170], [255, 110, 100]),
  guardiao: palette([18, 48, 120], [70, 130, 250], [190, 220, 255], [120, 170, 255]),
  veloz: palette([10, 92, 60], [60, 220, 150], [200, 255, 230], [120, 255, 200]),
  tecnico: palette([14, 80, 110], [70, 200, 240], [210, 246, 255], [130, 230, 255]),
  elemental: palette([70, 30, 120], [170, 110, 250], [240, 225, 255], [200, 160, 255]),
}

export const HOLLOW_CRYSTAL: CrystalPalette = palette([30, 12, 46], [74, 36, 104], [150, 100, 200], [160, 90, 230])

export const CLASS_CRYSTAL_NAME: Record<RobotClass, string> = {
  atirador: 'cristal âmbar',
  lutador: 'cristal rubro',
  guardiao: 'cristal safira',
  veloz: 'cristal jade',
  tecnico: 'cristal celeste',
  elemental: 'cristal ametista',
}

const BODY_BOB = [0, -1, 0, 0, -1, 0]

const FRONT = ['..r..', '.rlb.', 'rllbr', 'rbbbr', '.rbr.', '..r..']

const SIDE = ['rb', 'lb', 'bb', 'rr']

const rgb = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`

export function paintCrystal(context: CanvasRenderingContext2D, left: number, top: number, direction: Direction, frame: number, crystal: CrystalPalette) {
  if (direction === 'n' || direction === 'nw' || direction === 'ne') return
  const bob = frame >= 0 ? BODY_BOB[frame % BODY_BOB.length] : 0
  const colours: Record<string, string> = { r: rgb(crystal.rim), b: rgb(crystal.base), l: rgb(crystal.light) }
  const centerX = left + ANCHOR.x
  const chestTop = top + 28 + bob
  let rows: readonly string[]
  let x0: number
  if (direction === 's') {
    rows = FRONT
    x0 = centerX - 2
  } else if (direction === 'sw' || direction === 'se') {
    rows = FRONT
    x0 = centerX - 2 + (direction === 'sw' ? -3 : 3)
  } else {
    rows = SIDE
    x0 = direction === 'w' ? left + 18 : left + 28
  }
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row]
    for (let column = 0; column < line.length; column++) {
      const colour = colours[line[column]]
      if (!colour) continue
      context.fillStyle = colour
      context.fillRect(x0 + column, chestTop + row, 1, 1)
    }
  }
}
