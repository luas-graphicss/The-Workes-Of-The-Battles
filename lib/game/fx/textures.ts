export type RGB = readonly [number, number, number]

const cache = new Map<string, HTMLCanvasElement>()

function blank(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os efeitos.')
  return { canvas, context }
}

function memo(key: string, build: () => HTMLCanvasElement) {
  let texture = cache.get(key)
  if (!texture) {
    texture = build()
    cache.set(key, texture)
  }
  return texture
}

function rgba([r, g, b]: RGB, alpha: number) {
  return `rgba(${r},${g},${b},${alpha})`
}

const glowCache = new Map<number, HTMLCanvasElement>()

function packColor(color: RGB) {
  return ((Math.round(color[0]) & 255) << 16) | ((Math.round(color[1]) & 255) << 8) | (Math.round(color[2]) & 255)
}

const GLOW_STOPS: readonly (readonly [offset: number, opacity: number])[] = [
  [0, 1],
  [0.16, 0.8],
  [0.4, 0.32],
  [0.68, 0.09],
  [1, 0],
]

export function glowTexture(color: RGB = [255, 255, 255], size = 128) {
  const key = packColor(color) * 4096 + size
  let texture = glowCache.get(key)
  if (texture) return texture
  const { canvas, context } = blank(size, size)
  const radius = size / 2
  const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius)
  for (const [offset, opacity] of GLOW_STOPS) gradient.addColorStop(offset, rgba(color, opacity))
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  texture = canvas
  glowCache.set(key, texture)
  return texture
}

export function fillGlow(context: CanvasRenderingContext2D, color: RGB, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0.002 || radius <= 0) return
  const { width, height } = context.canvas
  const left = Math.max(0, Math.floor(x - radius))
  const top = Math.max(0, Math.floor(y - radius))
  const right = Math.min(width, Math.ceil(x + radius))
  const bottom = Math.min(height, Math.ceil(y + radius))
  if (right <= left || bottom <= top) return
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  for (const [offset, opacity] of GLOW_STOPS) gradient.addColorStop(offset, rgba(color, opacity * Math.min(1, alpha)))
  context.fillStyle = gradient
  context.fillRect(left, top, right - left, bottom - top)
}

export function shadowTexture(fill = 'rgba(24, 18, 12, 0.3)') {
  return memo(`shadow:${fill}`, () => {
    const width = 128
    const height = 48
    const { canvas, context } = blank(width, height)
    context.fillStyle = fill
    context.beginPath()
    context.ellipse(width / 2, height / 2, width / 2 - 1, height / 2 - 1, 0, 0, Math.PI * 2)
    context.fill()
    return canvas
  })
}

export function drawShadow(context: CanvasRenderingContext2D, texture: HTMLCanvasElement, x: number, y: number, radiusX: number, radiusY: number) {
  const width = radiusX * 2 * (texture.width / (texture.width - 2))
  const height = radiusY * 2 * (texture.height / (texture.height - 2))
  context.drawImage(texture, x - width / 2, y - height / 2, width, height)
}

export function puffTexture(color: RGB, variant = 0) {
  return memo(`puff:${color}:${variant}`, () => {
    const size = 96
    const { canvas, context } = blank(size, size)
    const random = seeded(17 + variant * 31)
    for (let i = 0; i < 9; i++) {
      const angle = random() * Math.PI * 2
      const distance = random() * size * 0.16
      const x = size / 2 + Math.cos(angle) * distance
      const y = size / 2 + Math.sin(angle) * distance
      const radius = size * (0.24 + random() * 0.2)
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, rgba(color, 0.34))
      gradient.addColorStop(0.55, rgba(color, 0.18))
      gradient.addColorStop(1, rgba(color, 0))
      context.fillStyle = gradient
      context.fillRect(0, 0, size, size)
    }
    return canvas
  })
}

export function ringTexture(color: RGB = [255, 255, 255]) {
  return memo(`ring:${color}`, () => {
    const size = 256
    const { canvas, context } = blank(size, size)
    const radius = size / 2
    const gradient = context.createRadialGradient(radius, radius, 0, radius, radius, radius)
    gradient.addColorStop(0, rgba(color, 0))
    gradient.addColorStop(0.62, rgba(color, 0))
    gradient.addColorStop(0.84, rgba(color, 0.35))
    gradient.addColorStop(0.94, rgba(color, 1))
    gradient.addColorStop(1, rgba(color, 0))
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    return canvas
  })
}

export type ShaftProfile = readonly (readonly [stop: number, alpha: number])[]

export function shaftTexture(core: RGB, rim: RGB, profile: ShaftProfile) {
  return memo(`shaft:${core}:${rim}:${profile.join('|')}`, () => {
    const width = 64
    const height = 256
    const { canvas, context } = blank(width, height)
    const across = context.createLinearGradient(0, 0, width, 0)
    across.addColorStop(0, rgba(rim, 0))
    across.addColorStop(0.28, rgba(rim, 0.4))
    across.addColorStop(0.5, rgba(core, 1))
    across.addColorStop(0.72, rgba(rim, 0.4))
    across.addColorStop(1, rgba(rim, 0))
    context.fillStyle = across
    context.fillRect(0, 0, width, height)
    const mask = context.createLinearGradient(0, 0, 0, height)
    for (const [stop, alpha] of profile) mask.addColorStop(stop, `rgba(0,0,0,${alpha})`)
    context.globalCompositeOperation = 'destination-in'
    context.fillStyle = mask
    context.fillRect(0, 0, width, height)
    return canvas
  })
}

export function grainTexture() {
  return memo('grain', () => {
    const size = 160
    const { canvas, context } = blank(size, size)
    const image = context.createImageData(size, size)
    const random = seeded(99)
    for (let i = 0; i < image.data.length; i += 4) {
      const value = 96 + random() * 64
      image.data[i] = value
      image.data[i + 1] = value
      image.data[i + 2] = value
      image.data[i + 3] = 255
    }
    context.putImageData(image, 0, 0)
    return canvas
  })
}

export function grainSheet() {
  return memo('grain-sheet', () => {
    const tile = grainTexture()
    const { canvas, context } = blank(tile.width * 4, tile.height * 4)
    for (let y = 0; y < canvas.height; y += tile.height) {
      for (let x = 0; x < canvas.width; x += tile.width) context.drawImage(tile, x, y)
    }
    return canvas
  })
}

export function chipTextures(rock: CanvasImageSource & { width: number; height: number }) {
  const random = seeded(4242)
  return Array.from({ length: 6 }, (_, index) =>
    memo(`chip:${index}`, () => {
      const size = 28
      const { canvas, context } = blank(size, size)
      context.beginPath()
      const corners = 5 + Math.floor(random() * 3)
      for (let i = 0; i < corners; i++) {
        const angle = (i / corners) * Math.PI * 2 + random() * 0.5
        const distance = size * (0.28 + random() * 0.2)
        const x = size / 2 + Math.cos(angle) * distance
        const y = size / 2 + Math.sin(angle) * distance
        if (i === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.closePath()
      context.clip()
      const sourceX = rock.width * (0.3 + random() * 0.4)
      const sourceY = rock.height * (0.3 + random() * 0.4)
      context.drawImage(rock, sourceX, sourceY, 40, 40, 0, 0, size, size)
      return canvas
    }),
  )
}

export function seeded(seed: number) {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return ((state >>> 0) % 100000) / 100000
  }
}
