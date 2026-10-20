export type Paint = CanvasRenderingContext2D

export const INK = '#1f1a17'
export const METAL = ['#262a30', '#3a4049', '#545c67', '#7a838f', '#a8b0ba']
export const GOLD = ['#8c5a1c', '#c08433', '#e7b04f', '#ffd98a', '#fff2cc']
export const GLOW = ['#2fc4b8', '#6ff0de', '#b9fff1']

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

const PLAIN: Record<string, string> = { Á: 'A', À: 'A', Â: 'A', Ã: 'A', É: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Õ: 'O', Ú: 'U', Ç: 'C' }
export const GLYPH = { width: 5, height: 7, gap: 1 } as const

export function canvasOf(width: number, height: number): Paint {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para a fachada.')
  context.imageSmoothingEnabled = false
  return context
}

export function pixel(paint: Paint, x: number, y: number, color: string, width = 1, height = 1) {
  paint.fillStyle = color
  paint.fillRect(x, y, width, height)
}

export function textWidth(text: string) {
  return text.length * GLYPH.width + (text.length - 1) * GLYPH.gap
}

export function paintText(paint: Paint, text: string, x: number, y: number, color: string) {
  let cursor = x
  for (const raw of text.toUpperCase()) {
    const character = PLAIN[raw] ?? raw
    const rows = FONT[character] ?? FONT[' ']
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < GLYPH.width; rx++) if (row[rx] === '1') pixel(paint, cursor + rx, y + ry, color)
    })
    cursor += GLYPH.width + GLYPH.gap
  }
}

export function paintPlate(text: string, padding = 2): HTMLCanvasElement {
  const width = textWidth(text) + padding * 2 + 2
  const height = GLYPH.height + 4
  const paint = canvasOf(width, height)
  pixel(paint, 0, 0, INK, width, height)
  pixel(paint, 1, 1, METAL[1], width - 2, height - 2)
  pixel(paint, 1, 1, METAL[3], width - 2, 1)
  pixel(paint, 1, 1, METAL[3], 1, height - 2)
  pixel(paint, 1, height - 2, METAL[0], width - 2, 1)
  pixel(paint, width - 2, 1, METAL[0], 1, height - 2)
  for (const [rx, ry] of [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
  ]) {
    pixel(paint, rx, ry, METAL[4])
  }
  const textX = padding + 1
  const textY = 2
  paintText(paint, text, textX + 1, textY + 1, GOLD[0])
  paintText(paint, text, textX, textY, GOLD[2])
  return paint.canvas
}
