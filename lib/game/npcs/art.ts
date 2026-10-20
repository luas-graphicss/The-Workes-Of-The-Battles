import type { RGB } from '../fx/textures'
import type { Sheets } from '../robot/sprites'
import type { PilotLook } from './data'

const PILOT: Record<keyof PilotLook, RGB> = {
  hair: [92, 56, 44],
  hairHi: [144, 94, 66],
  coat: [222, 104, 66],
  coatHi: [247, 152, 98],
  pants: [60, 80, 108],
  boot: [72, 52, 46],
  lens: [128, 214, 204],
}

export type FigureSheets = { idle: HTMLCanvasElement | HTMLImageElement; walk: HTMLCanvasElement | HTMLImageElement }

function swap(sheet: HTMLImageElement, look: PilotLook): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = sheet.width
  canvas.height = sheet.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os mestres.')
  context.drawImage(sheet, 0, 0)
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const keys = Object.keys(PILOT) as (keyof PilotLook)[]
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    for (const key of keys) {
      const [r, g, b] = PILOT[key]
      if (Math.abs(data[i] - r) > 2 || Math.abs(data[i + 1] - g) > 2 || Math.abs(data[i + 2] - b) > 2) continue
      const colour = look[key]
      data[i] = colour[0]
      data[i + 1] = colour[1]
      data[i + 2] = colour[2]
      break
    }
  }
  context.putImageData(image, 0, 0)
  return canvas
}

export function dressPilot(sheets: Sheets, look: PilotLook): FigureSheets {
  return { idle: swap(sheets.idle, look), walk: swap(sheets.walk, look) }
}

const INK = '#0b1214'
const BRASS = '#e8b04a'
const TEAL = '#5fe0cf'
const SIGNAL = '#f0503f'

function block(context: CanvasRenderingContext2D, x: number, y: number, u: number, cells: readonly string[], palette: Record<string, string>) {
  for (let row = 0; row < cells.length; row++) {
    const line = cells[row]
    for (let column = 0; column < line.length; column++) {
      const colour = palette[line[column]]
      if (!colour) continue
      context.fillStyle = colour
      context.fillRect(x + column * u, y + row * u, u, u)
    }
  }
}

const DIAMOND = [
  '....kkk....',
  '...kfffk...',
  '..kfffffk..',
  '.kfffffffk.',
  'kfffffffffk',
  'kfffffffffk',
  'kfffffffffk',
  '.kfffffffk.',
  '..kfffffk..',
  '...kfffk...',
  '....kkk....',
]

const BANG = ['.....', '..m..', '..m..', '..m..', '..m..', '.....', '..m..']
const ASK = ['.mmm.', 'm...m', '....m', '...m.', '..m..', '.....', '..m..']

export function drawBadge(context: CanvasRenderingContext2D, centerX: number, bottomY: number, u: number, kind: 'lesson' | 'meet') {
  const width = DIAMOND[0].length * u
  const left = Math.round(centerX - width / 2)
  const top = Math.round(bottomY - DIAMOND.length * u)
  const fill = kind === 'lesson' ? BRASS : TEAL
  block(context, left, top, u, DIAMOND, { k: INK, f: fill })
  block(context, left + 3 * u, top + 2 * u, u, kind === 'lesson' ? BANG : ASK, { m: INK })
}

const HEART = ['.kk.kk.', 'kffkffk', 'kfffffk', '.kfffk.', '..kfk..', '...k...']

export function drawHearts(context: CanvasRenderingContext2D, centerX: number, bottomY: number, u: number, level: number, max: number) {
  const width = HEART[0].length * u
  const gap = u
  const total = max * width + (max - 1) * gap
  const left = Math.round(centerX - total / 2)
  const top = Math.round(bottomY - HEART.length * u)
  for (let index = 0; index < max; index++) {
    const filled = index < level
    block(context, left + index * (width + gap), top, u, HEART, { k: INK, f: filled ? SIGNAL : 'rgba(239, 231, 212, 0.28)' })
  }
}
