import { glowTexture, type RGB } from './textures'

export type Light = { x: number; y: number; radius: number; color: RGB; intensity: number }

const DOWNSCALE = 4

const CELL = 8

const REACH = 3

export function createLighting() {
  const canvas = document.createElement('canvas')
  const rendering = canvas.getContext('2d')
  if (!rendering) throw new Error('Canvas 2D indisponível para a iluminação.')
  const light: CanvasRenderingContext2D = rendering
  let columns = 0
  let rows = 0
  let cells = new Uint8Array(0)

  function apply(target: CanvasRenderingContext2D, width: number, height: number, ambient: RGB, lights: Light[]) {
    const mapWidth = Math.max(1, Math.ceil(width / DOWNSCALE))
    const mapHeight = Math.max(1, Math.ceil(height / DOWNSCALE))
    if (canvas.width !== mapWidth || canvas.height !== mapHeight) {
      canvas.width = mapWidth
      canvas.height = mapHeight
    }
    const nextColumns = Math.ceil(mapWidth / CELL)
    const nextRows = Math.ceil(mapHeight / CELL)
    if (nextColumns !== columns || nextRows !== rows) {
      columns = nextColumns
      rows = nextRows
      cells = new Uint8Array(columns * rows)
    } else {
      cells.fill(0)
    }
    const ambientStyle = `rgb(${Math.round(ambient[0])},${Math.round(ambient[1])},${Math.round(ambient[2])})`
    light.globalCompositeOperation = 'source-over'
    light.globalAlpha = 1
    light.fillStyle = ambientStyle
    light.fillRect(0, 0, mapWidth, mapHeight)
    light.globalCompositeOperation = 'lighter'
    let reached = false
    for (const source of lights) {
      if (source.intensity <= 0.002) continue
      const size = (source.radius * 2) / DOWNSCALE
      const x = source.x / DOWNSCALE - size / 2
      const y = source.y / DOWNSCALE - size / 2
      if (x > mapWidth || y > mapHeight || x + size < 0 || y + size < 0) continue
      const texture = glowTexture(source.color, 128)
      for (let remaining = source.intensity; remaining > 0.002; remaining -= 1) {
        light.globalAlpha = Math.min(1, remaining)
        light.drawImage(texture, x, y, size, size)
      }
      markReach(source.x / DOWNSCALE, source.y / DOWNSCALE, size / 2 + REACH)
      reached = true
    }
    light.globalAlpha = 1
    light.globalCompositeOperation = 'source-over'

    target.globalCompositeOperation = 'multiply'
    target.imageSmoothingEnabled = true
    target.fillStyle = ambientStyle
    if (reached) compose(target, mapWidth, mapHeight)
    else target.fillRect(0, 0, mapWidth * DOWNSCALE, mapHeight * DOWNSCALE)
    target.globalCompositeOperation = 'source-over'
  }

  function markReach(centerX: number, centerY: number, radius: number) {
    const firstRow = Math.max(0, Math.floor((centerY - radius) / CELL))
    const lastRow = Math.min(rows - 1, Math.floor((centerY + radius) / CELL))
    const firstColumn = Math.max(0, Math.floor((centerX - radius) / CELL))
    const lastColumn = Math.min(columns - 1, Math.floor((centerX + radius) / CELL))
    const reach = radius * radius
    for (let row = firstRow; row <= lastRow; row++) {
      const top = row * CELL
      const dy = centerY < top ? top - centerY : centerY > top + CELL ? centerY - top - CELL : 0
      for (let column = firstColumn; column <= lastColumn; column++) {
        const left = column * CELL
        const dx = centerX < left ? left - centerX : centerX > left + CELL ? centerX - left - CELL : 0
        if (dx * dx + dy * dy < reach) cells[row * columns + column] = 1
      }
    }
  }

  function compose(target: CanvasRenderingContext2D, mapWidth: number, mapHeight: number) {
    let bandStart = 0
    for (let row = 1; row <= rows; row++) {
      if (row < rows && sameRow(row, bandStart)) continue
      paintBand(target, bandStart, row, mapWidth, mapHeight)
      bandStart = row
    }
  }

  function sameRow(a: number, b: number) {
    const offsetA = a * columns
    const offsetB = b * columns
    for (let column = 0; column < columns; column++) {
      if (cells[offsetA + column] !== cells[offsetB + column]) return false
    }
    return true
  }

  function paintBand(target: CanvasRenderingContext2D, firstRow: number, endRow: number, mapWidth: number, mapHeight: number) {
    const top = firstRow * CELL
    const bottom = Math.min(mapHeight, endRow * CELL)
    const offset = firstRow * columns
    let runStart = 0
    for (let column = 1; column <= columns; column++) {
      if (column < columns && cells[offset + column] === cells[offset + runStart]) continue
      const left = runStart * CELL
      const right = Math.min(mapWidth, column * CELL)
      if (cells[offset + runStart]) {
        target.drawImage(canvas, left, top, right - left, bottom - top, left * DOWNSCALE, top * DOWNSCALE, (right - left) * DOWNSCALE, (bottom - top) * DOWNSCALE)
      } else {
        target.fillRect(left * DOWNSCALE, top * DOWNSCALE, (right - left) * DOWNSCALE, (bottom - top) * DOWNSCALE)
      }
      runStart = column
    }
  }

  return { apply }
}

export function mixColor(from: RGB, to: RGB, amount: number): RGB {
  const t = Math.min(1, Math.max(0, amount))
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]
}
