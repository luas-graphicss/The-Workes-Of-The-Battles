const MAX_EDGE = 2048

export class Prescaled {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly image: HTMLImageElement) {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível para pré-escalar imagens.')
    this.context = context
  }

  at(width: number): HTMLCanvasElement {
    const aspect = (this.image.naturalHeight || 1) / (this.image.naturalWidth || 1)
    const edge = Math.max(1, Math.min(MAX_EDGE, Math.round(width)))
    const height = Math.max(1, Math.round(edge * aspect))
    if (this.canvas.width !== edge || this.canvas.height !== height) {
      this.canvas.width = edge
      this.canvas.height = height
      this.context.imageSmoothingEnabled = true
      this.context.imageSmoothingQuality = 'high'
      this.context.drawImage(this.image, 0, 0, edge, height)
    }
    return this.canvas
  }

  release() {
    if (this.canvas.width > 1) this.canvas.width = this.canvas.height = 1
  }
}
