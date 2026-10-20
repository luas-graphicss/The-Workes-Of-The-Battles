import { TEXEL, WORLD } from '../world-data'
import type { Lens } from './camera'

const IDLE = 0
const LOADING = 1
const READY = 2
const FAILED = 3

type Tile = { image: HTMLImageElement | null; status: number; readyAt: number }

const MAX_PARALLEL = 4
const FADE_MS = 260

export function paintingQuality(texelScale: number): ImageSmoothingQuality {
  return texelScale < 1 ? 'medium' : 'low'
}

export type MapLayer = {
  draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, now: number): void

  covers(originX: number, originY: number, zoom: number, width: number, height: number): boolean
  stream(lens: Lens, width: number, height: number): void
  destroy(): void
}

function isOpaque(image: HTMLImageElement | HTMLCanvasElement) {
  const probe = document.createElement('canvas')
  probe.width = image.width
  probe.height = image.height
  const context = probe.getContext('2d', { willReadFrequently: true })
  if (!context || !probe.width || !probe.height) return false
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, probe.width, probe.height).data
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] !== 255) return false
  return true
}

export function createRoomLayer(image: HTMLImageElement | HTMLCanvasElement, backdrop: string): MapLayer {

  const reduced = document.createElement('canvas')
  const reducedContext = reduced.getContext('2d')
  let reducedScale = 0
  let lastTexelScale = 0

  const opaque = isOpaque(image)

  function reducedFor(texelScale: number): HTMLCanvasElement | null {
    if (!reducedContext) return null
    const settled = texelScale === lastTexelScale
    lastTexelScale = texelScale
    const close = reducedScale > 0 && Math.abs(texelScale / reducedScale - 1) < 0.08
    if (reducedScale === texelScale || (close && !settled)) return reduced
    reduced.width = Math.max(1, Math.round(image.width * texelScale))
    reduced.height = Math.max(1, Math.round(image.height * texelScale))
    reducedContext.imageSmoothingEnabled = true
    reducedContext.imageSmoothingQuality = 'high'
    reducedContext.drawImage(image, 0, 0, reduced.width, reduced.height)
    reducedScale = texelScale
    return reduced
  }

  return {
    draw(context, originX, originY, zoom) {
      const { width, height } = context.canvas
      const texelScale = zoom * TEXEL
      const source = texelScale < 1 ? (reducedFor(texelScale) ?? image) : image
      const sourceScale = source === image ? texelScale : texelScale / reducedScale
      const crisp = (texelScale >= 1 && Math.abs(texelScale - Math.round(texelScale)) < 0.001) || sourceScale === 1
      const x0 = Math.round(originX)
      const y0 = Math.round(originY)
      const x1 = Math.round(originX + image.width * texelScale)
      const y1 = Math.round(originY + image.height * texelScale)

      if (x0 > 0 || y0 > 0 || x1 < width || y1 < height) {
        context.fillStyle = backdrop
        if (x1 <= 0 || y1 <= 0 || x0 >= width || y0 >= height) {
          context.fillRect(0, 0, width, height)
          return
        }
        if (y0 > 0) context.fillRect(0, 0, width, y0)
        if (y1 < height) context.fillRect(0, y1, width, height - y1)
        if (x0 > 0) context.fillRect(0, 0, x0, height)
        if (x1 < width) context.fillRect(x1, 0, width - x1, height)
      }

      const scaleX = (x1 - x0) / source.width
      const scaleY = (y1 - y0) / source.height
      const dx0 = Math.max(0, x0)
      const dy0 = Math.max(0, y0)
      const dx1 = Math.min(width, x1)
      const dy1 = Math.min(height, y1)
      context.imageSmoothingEnabled = !crisp
      context.imageSmoothingQuality = source === image ? paintingQuality(texelScale) : 'low'
      context.drawImage(source, (dx0 - x0) / scaleX, (dy0 - y0) / scaleY, (dx1 - dx0) / scaleX, (dy1 - dy0) / scaleY, dx0, dy0, dx1 - dx0, dy1 - dy0)
      context.imageSmoothingQuality = 'low'
      context.imageSmoothingEnabled = true
    },
    covers: () => opaque,
    stream() {},
    destroy() {
      reduced.width = reduced.height = 1
      reducedScale = 0
    },
  }
}

export function createMapLayer(assetBase: string, preview: HTMLImageElement): MapLayer {
  const { columns, rows, tile: size, gutter, folder } = WORLD.map
  const tileWorld = size * TEXEL
  const previewTile = preview.naturalWidth / columns
  const tiles: Tile[] = Array.from({ length: columns * rows }, () => ({ image: null, status: IDLE, readyAt: 0 }))
  let queue: number[] = []
  let inFlight = 0
  let destroyed = false
  let lastKey = ''

  function request(index: number) {
    const tile = tiles[index]
    tile.status = LOADING
    inFlight++
    const image = new Image()
    image.decoding = 'async'
    image.src = `${assetBase}${folder}/${index % columns}-${Math.floor(index / columns)}.webp`
    image
      .decode()
      .then(() => {
        if (destroyed) return
        tile.image = image
        tile.status = READY
        tile.readyAt = performance.now()
      })
      .catch(() => {
        tile.status = FAILED
      })
      .finally(() => {
        inFlight--
        pump()
      })
  }

  function pump() {
    while (!destroyed && inFlight < MAX_PARALLEL && queue.length) {
      const index = queue.shift() as number
      if (tiles[index].status === IDLE) request(index)
    }
  }

  function stream(lens: Lens, width: number, height: number) {
    const span = tileWorld
    const centerColumn = lens.x / span - 0.5
    const centerRow = lens.y / span - 0.5
    const halfColumns = width / lens.zoom / span / 2 + 0.5
    const halfRows = height / lens.zoom / span / 2 + 0.5
    const key = `${Math.round(centerColumn * 2)}:${Math.round(centerRow * 2)}:${Math.round(halfColumns)}`
    if (key === lastKey) {
      pump()
      return
    }
    lastKey = key
    queue = tiles
      .map((tile, index) => ({ tile, index }))
      .filter(({ tile }) => tile.status === IDLE)
      .map(({ index }) => {
        const dx = Math.abs((index % columns) - centerColumn)
        const dy = Math.abs(Math.floor(index / columns) - centerRow)
        const visible = dx <= halfColumns && dy <= halfRows
        return { index, rank: (visible ? 0 : 100) + Math.hypot(dx, dy) }
      })
      .sort((a, b) => a.rank - b.rank)
      .map(({ index }) => index)
    pump()
  }

  function draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, now: number) {
    const { width, height } = context.canvas
    const span = tileWorld * zoom
    const firstColumn = Math.max(0, Math.floor(-originX / span))
    const lastColumn = Math.min(columns - 1, Math.floor((width - originX) / span))
    const firstRow = Math.max(0, Math.floor(-originY / span))
    const lastRow = Math.min(rows - 1, Math.floor((height - originY) / span))
    const texelScale = zoom * TEXEL
    const crisp = texelScale >= 1 && Math.abs(texelScale - Math.round(texelScale)) < 0.001
    context.imageSmoothingQuality = paintingQuality(texelScale)

    for (let row = firstRow; row <= lastRow; row++) {
      const y0 = Math.round(originY + row * span)
      const y1 = Math.round(originY + (row + 1) * span)
      for (let column = firstColumn; column <= lastColumn; column++) {
        const x0 = Math.round(originX + column * span)
        const x1 = Math.round(originX + (column + 1) * span)
        const tile = tiles[row * columns + column]
        const fade = tile.status === READY ? Math.min(1, (now - tile.readyAt) / FADE_MS) : 0
        if (fade < 1) {
          context.imageSmoothingEnabled = true
          context.drawImage(preview, column * previewTile, row * previewTile, previewTile, previewTile, x0, y0, x1 - x0, y1 - y0)
        }
        if (fade > 0 && tile.image) {
          context.imageSmoothingEnabled = !crisp
          context.globalAlpha = fade
          context.drawImage(tile.image, gutter, gutter, size, size, x0, y0, x1 - x0, y1 - y0)
          context.globalAlpha = 1
        }
      }
    }
    context.imageSmoothingQuality = 'low'
    context.imageSmoothingEnabled = true
  }

  function covers(originX: number, originY: number, zoom: number, width: number, height: number) {
    const span = tileWorld * zoom
    return Math.round(originX) <= 0 && Math.round(originY) <= 0 && Math.round(originX + columns * span) >= width && Math.round(originY + rows * span) >= height
  }

  return {
    draw,
    covers,
    stream,
    destroy() {
      destroyed = true
      queue = []
    },
  }
}
