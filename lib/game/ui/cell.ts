import { iconBox } from '../robot/icons'
import type { RobotComposer } from '../robot/sprites'

const ICON_MARGIN = 2

function pixelDensity() {
  return Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)))
}

export function cellCanvas(composer: RobotComposer, id: string, label: string, className: string, size: number) {
  const density = pixelDensity()
  const pixels = size * density
  const canvas = document.createElement('canvas')
  canvas.width = pixels
  canvas.height = pixels

  canvas.style.setProperty('--cell-size', `${size}px`)
  canvas.className = className
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', label)
  const context = canvas.getContext('2d')
  const cell = composer.cell(id, 's')
  if (context && cell) {
    const [boxX, boxY, boxWidth, boxHeight] = iconBox(id)
    const scale = Math.max(density, Math.floor((pixels - ICON_MARGIN * 2 * density) / Math.max(boxWidth, boxHeight)))
    const width = boxWidth * scale
    const height = boxHeight * scale
    context.imageSmoothingEnabled = false
    context.drawImage(cell.image, cell.sx + boxX, cell.sy + boxY, boxWidth, boxHeight, Math.round((pixels - width) / 2), Math.round((pixels - height) / 2), width, height)
  }
  return canvas
}
