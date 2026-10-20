const BILINEAR_REACH = 2

const EDGE_MARGIN = 1.5
const MIN_HOLE = 32

const MIN_CLIPPED_AREA = 600 * 600

type Radii = { clear: number; extent: number }

const measured = new WeakMap<HTMLCanvasElement, Radii>()

function radii(texture: HTMLCanvasElement) {
  let found = measured.get(texture)
  if (!found) {
    found = measureRadii(texture)
    measured.set(texture, found)
  }
  return found
}

function measureRadii(texture: HTMLCanvasElement): Radii {
  const { width, height } = texture
  const opaque = { clear: 0, extent: Math.hypot(width, height) }
  const context = texture.getContext('2d')
  if (!context || !width || !height) return opaque
  const pixels = context.getImageData(0, 0, width, height).data
  let clear = Infinity
  let extent = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      const distance = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2)
      if (distance < clear) clear = distance
      if (distance > extent) extent = distance
    }
  }
  return Number.isFinite(clear) ? { clear, extent } : opaque
}

function insideEllipse(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number) {
  const dx = (x - centerX) / radiusX
  const dy = (y - centerY) / radiusY
  return dx * dx + dy * dy < 1
}

export function drawHollow(context: CanvasRenderingContext2D, texture: HTMLCanvasElement, x: number, y: number, width: number, height: number) {
  const { clear, extent } = radii(texture)
  const scaleX = width / texture.width
  const scaleY = height / texture.height
  const holeX = (clear - BILINEAR_REACH) * scaleX - EDGE_MARGIN
  const holeY = (clear - BILINEAR_REACH) * scaleY - EDGE_MARGIN
  const centerX = x + width / 2
  const centerY = y + height / 2
  const transform = context.getTransform()
  const translateOnly = transform.a === 1 && transform.b === 0 && transform.c === 0 && transform.d === 1
  if (translateOnly && holeX > 0 && holeY > 0) {
    const left = -transform.e
    const top = -transform.f
    const right = left + context.canvas.width
    const bottom = top + context.canvas.height
    const covered =
      insideEllipse(left, top, centerX, centerY, holeX, holeY) &&
      insideEllipse(right, top, centerX, centerY, holeX, holeY) &&
      insideEllipse(left, bottom, centerX, centerY, holeX, holeY) &&
      insideEllipse(right, bottom, centerX, centerY, holeX, holeY)
    if (covered) return
  }
  if (!translateOnly || context.globalCompositeOperation !== 'lighter' || width * height < MIN_CLIPPED_AREA) {
    context.drawImage(texture, x, y, width, height)
    return
  }
  context.save()
  context.beginPath()
  context.ellipse(centerX, centerY, (extent + BILINEAR_REACH) * scaleX + EDGE_MARGIN, (extent + BILINEAR_REACH) * scaleY + EDGE_MARGIN, 0, 0, Math.PI * 2)
  if (holeX >= MIN_HOLE && holeY >= MIN_HOLE) {
    context.moveTo(centerX + holeX, centerY)
    context.ellipse(centerX, centerY, holeX, holeY, 0, 0, Math.PI * 2)
  }
  context.clip('evenodd')
  context.drawImage(texture, x, y, width, height)
  context.restore()
}
