import type { RGB } from '../fx/textures'

const FACTOR = 2

type Sheet = HTMLCanvasElement | HTMLImageElement

const enlargedCopies = new WeakMap<Sheet, HTMLCanvasElement>()
const tintedCopies = new WeakMap<Sheet, Map<string, HTMLCanvasElement>>()

type Cached = { canvas: HTMLCanvasElement; used: number }
const cellCopies = new WeakMap<Sheet, Map<number, Cached>>()
const cellMaps: Map<number, Cached>[] = []
const MAX_CELLS = 720
const SWEEP_AGE_MS = 1500

const FILL_BUDGET = 10
const FRAME_MS = 12
let cells = 0
let fillsSince = 0
let fillWindow = 0

function blank(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os sprites.')
  context.imageSmoothingEnabled = false
  return { canvas, context }
}

function enlarged(sheet: Sheet) {
  let copy = enlargedCopies.get(sheet)
  if (!copy) {
    const { canvas, context } = blank(sheet.width * FACTOR, sheet.height * FACTOR)
    context.drawImage(sheet, 0, 0, canvas.width, canvas.height)
    copy = canvas
    enlargedCopies.set(sheet, copy)
  }
  return copy
}

function sweep(now: number) {
  for (const map of cellMaps) {
    for (const [key, entry] of map) {
      if (now - entry.used > SWEEP_AGE_MS) {
        map.delete(key)
        cells--
      }
    }
  }
  if (cells <= MAX_CELLS) return
  for (const map of cellMaps) map.clear()
  cells = 0
}

function scaledCell(sheet: Sheet, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number, now: number): HTMLCanvasElement | null {
  let map = cellCopies.get(sheet)
  if (!map) {
    map = new Map()
    cellCopies.set(sheet, map)
    cellMaps.push(map)
  }
  const key = ((sx * 4096 + sy) * 4096 + dw) * 4096 + dh
  const hit = map.get(key)
  if (hit) {
    hit.used = now
    return hit.canvas
  }
  if (now - fillWindow > FRAME_MS) {
    fillWindow = now
    fillsSince = 0
  }
  if (fillsSince >= FILL_BUDGET) return null
  fillsSince++
  const { canvas, context } = blank(dw, dh)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(enlarged(sheet), sx * FACTOR, sy * FACTOR, sw * FACTOR, sh * FACTOR, 0, 0, dw, dh)
  map.set(key, { canvas, used: now })
  if (++cells > MAX_CELLS) sweep(now)
  return canvas
}

export function drawCell(
  context: CanvasRenderingContext2D,
  sheet: Sheet,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const pixel = dw / sw
  if (pixel >= 1 && Math.abs(pixel - Math.round(pixel)) < 0.01) {
    context.imageSmoothingEnabled = false
    context.drawImage(sheet, sx, sy, sw, sh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh))
    return
  }
  const width = Math.max(1, Math.round(dw))
  const height = Math.max(1, Math.round(dh))
  if (width < 4096 && height < 4096 && sx < 4096 && sy < 4096) {
    const cached = scaledCell(sheet, sx, sy, sw, sh, width, height, performance.now())
    if (cached) {
      context.imageSmoothingEnabled = false
      context.drawImage(cached, Math.round(dx), Math.round(dy))
      return
    }
  }
  const copy = enlarged(sheet)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'low'
  context.drawImage(copy, sx * FACTOR, sy * FACTOR, sw * FACTOR, sh * FACTOR, dx, dy, dw, dh)
  context.imageSmoothingEnabled = false
}

export function tinted(sheet: Sheet, color: RGB): HTMLCanvasElement {
  let byColor = tintedCopies.get(sheet)
  if (!byColor) {
    byColor = new Map()
    tintedCopies.set(sheet, byColor)
  }
  const key = color.join(',')
  let copy = byColor.get(key)
  if (!copy) {
    const { canvas, context } = blank(sheet.width, sheet.height)
    context.drawImage(sheet, 0, 0)
    context.globalCompositeOperation = 'source-in'
    context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`
    context.fillRect(0, 0, canvas.width, canvas.height)
    copy = canvas
    byColor.set(key, copy)
  }
  return copy
}
