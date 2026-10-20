export type BackdropStyle = { blur: number; saturate: number }

const DOWNSCALE = 4

const supportsFilter = (() => {
  if (typeof document === 'undefined') return false
  const context = document.createElement('canvas').getContext('2d')
  return !!context && typeof context.filter === 'string'
})()

export function blurredSnapshot(source: HTMLCanvasElement, style: BackdropStyle, className: string): HTMLCanvasElement {
  const width = Math.max(1, Math.round(source.width / DOWNSCALE))
  const height = Math.max(1, Math.round(source.height / DOWNSCALE))
  const canvas = document.createElement('canvas')
  canvas.className = className
  canvas.width = width
  canvas.height = height
  canvas.setAttribute('aria-hidden', 'true')
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return canvas
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'medium'

  if (supportsFilter) {

    const pad = Math.ceil(style.blur / DOWNSCALE) + 1
    context.filter = `blur(${(style.blur / DOWNSCALE).toFixed(2)}px) saturate(${style.saturate})`
    context.drawImage(source, -pad, -pad, width + pad * 2, height + pad * 2)
    context.filter = 'none'
    return canvas
  }

  const tiny = document.createElement('canvas')
  tiny.width = Math.max(1, Math.round(width / 4))
  tiny.height = Math.max(1, Math.round(height / 4))
  const small = tiny.getContext('2d', { alpha: false })
  if (!small) return canvas
  small.imageSmoothingEnabled = true
  small.imageSmoothingQuality = 'medium'
  small.drawImage(source, 0, 0, tiny.width, tiny.height)
  context.drawImage(tiny, 0, 0, width, height)
  if (style.saturate < 1) {
    context.globalCompositeOperation = 'saturation'
    context.globalAlpha = 1 - style.saturate
    context.fillStyle = '#808080'
    context.fillRect(0, 0, width, height)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }
  return canvas
}
