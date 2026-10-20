export type TextRun = { text: string; font: string; fill: string }

export type Label = {
  canvas: HTMLCanvasElement

  advance: number

  pad: number
}

const MAX_ENTRIES = 400

const labels = new Map<string, Label>()

let measurer: CanvasRenderingContext2D | null = null

function measureContext() {
  if (measurer) return measurer
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os rótulos.')
  measurer = context
  return context
}

function remember(key: string, label: Label) {
  if (labels.size >= MAX_ENTRIES) labels.clear()
  labels.set(key, label)
  return label
}

export function textLabel(runs: readonly TextRun[], stroke: string, lineWidth: number, lineHeight: number): Label {
  let key = `${stroke}|${lineWidth}|${lineHeight}`
  for (const run of runs) key += `|${run.font}|${run.fill}|${run.text}`
  const cached = labels.get(key)
  if (cached) return cached

  const measure = measureContext()
  const widths = runs.map((run) => {
    measure.font = run.font
    return measure.measureText(run.text).width
  })
  const advance = widths.reduce((sum, width) => sum + width, 0)
  const pad = Math.ceil(lineWidth / 2) + 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(advance) + pad * 2)
  canvas.height = Math.max(1, Math.ceil(lineHeight) + pad * 2)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os rótulos.')
  context.textBaseline = 'bottom'
  context.textAlign = 'left'
  context.lineWidth = lineWidth
  context.lineJoin = 'round'
  context.strokeStyle = stroke
  const baseline = canvas.height - pad
  let x = pad
  runs.forEach((run, index) => {
    context.font = run.font
    context.strokeText(run.text, x, baseline)
    x += widths[index]
  })
  x = pad
  runs.forEach((run, index) => {
    context.font = run.font
    context.fillStyle = run.fill
    context.fillText(run.text, x, baseline)
    x += widths[index]
  })
  return remember(key, { canvas, advance, pad })
}

export function drawLabel(context: CanvasRenderingContext2D, label: Label, x: number, y: number) {
  context.drawImage(label.canvas, Math.round(x) - label.pad, Math.round(y) - (label.canvas.height - label.pad))
}

export function centeredLabel(text: string, font: string, fill: string, stroke: string, lineWidth: number, lineHeight: number): Label {
  const key = `center|${font}|${fill}|${stroke}|${lineWidth}|${lineHeight}|${text}`
  const cached = labels.get(key)
  if (cached) return cached

  const measure = measureContext()
  measure.font = font
  const advance = measure.measureText(text).width
  const pad = Math.ceil(lineWidth / 2) + 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.ceil(advance + pad * 2))
  canvas.height = Math.max(2, Math.ceil(lineHeight + pad * 2))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os rótulos.')
  context.font = font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineWidth = lineWidth
  context.lineJoin = 'round'
  context.strokeStyle = stroke
  context.strokeText(text, canvas.width / 2, canvas.height / 2)
  context.fillStyle = fill
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  return remember(key, { canvas, advance, pad })
}

export function badgeLabel(text: string, font: string, size: number, fill: string, ink: string): Label {
  const key = `badge|${font}|${size}|${fill}|${ink}|${text}`
  const cached = labels.get(key)
  if (cached) return cached

  const measure = measureContext()
  measure.font = font
  const advance = measure.measureText(text).width + size * 0.8
  const height = size * 1.2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(advance))
  canvas.height = Math.max(1, Math.ceil(height))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os rótulos.')
  const radius = size * 0.3
  context.fillStyle = fill
  context.beginPath()
  context.moveTo(radius, 0)
  context.arcTo(advance, 0, advance, height, radius)
  context.arcTo(advance, height, 0, height, radius)
  context.arcTo(0, height, 0, 0, radius)
  context.arcTo(0, 0, advance, 0, radius)
  context.closePath()
  context.fill()
  context.font = font
  context.textBaseline = 'middle'
  context.textAlign = 'left'
  context.fillStyle = ink
  context.fillText(text, size * 0.4, height / 2 + 0.5)
  return remember(key, { canvas, advance, pad: 0 })
}
