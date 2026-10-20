import { cellCanvas } from '../ui/cell'
import type { RobotComposer } from './sprites'

export function partIcon(composer: RobotComposer, id: string, label: string, className: string, size: number) {
  return cellCanvas(composer, id, label, className, size)
}

export function partSilhouette(composer: RobotComposer, id: string, label: string, className: string, size: number) {
  const canvas = partIcon(composer, id, label, className, size)
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.globalCompositeOperation = 'source-atop'
  context.fillStyle = 'rgba(11, 18, 20, 0.92)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'source-over'
  return canvas
}
