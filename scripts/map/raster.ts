import type { Point } from '../../lib/city/geometry'

export type Color = number

export function rgb(hex: string, alpha = 255): Color {
  const value = parseInt(hex.replace('#', ''), 16)
  return (((alpha & 255) << 24) | ((value & 255) << 16) | (((value >> 8) & 255) << 8) | ((value >> 16) & 255)) >>> 0
}

export const red = (c: Color) => c & 255
export const green = (c: Color) => (c >>> 8) & 255
export const blue = (c: Color) => (c >>> 16) & 255
export const alphaOf = (c: Color) => c >>> 24

export function pack(r: number, g: number, b: number, a = 255): Color {
  const cr = r < 0 ? 0 : r > 255 ? 255 : r | 0
  const cg = g < 0 ? 0 : g > 255 ? 255 : g | 0
  const cb = b < 0 ? 0 : b > 255 ? 255 : b | 0
  return (((a & 255) << 24) | (cb << 16) | (cg << 8) | cr) >>> 0
}

export function mix(a: Color, b: Color, t: number): Color {
  return pack(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t, alphaOf(a))
}

export function scale(c: Color, factor: number): Color {
  return pack(red(c) * factor, green(c) * factor, blue(c) * factor, alphaOf(c))
}

const TRANSPARENT = 0

export function scanPolygon(points: readonly Point[], width: number, height: number, fn: (x: number, y: number) => void) {
  let minY = Infinity
  let maxY = -Infinity
  for (const [, y] of points) {
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const crossings: number[] = []
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(height - 1, Math.ceil(maxY)); y++) {
    const sy = y + 0.5
    crossings.length = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i]
      const [xj, yj] = points[j]
      if (yi > sy !== yj > sy) crossings.push(((xj - xi) * (sy - yi)) / (yj - yi) + xi)
    }
    crossings.sort((a, b) => a - b)
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const from = Math.max(0, Math.ceil(crossings[k] - 0.5))
      const to = Math.min(width - 1, Math.ceil(crossings[k + 1] - 0.5) - 1)
      for (let x = from; x <= to; x++) fn(x, y)
    }
  }
}

export class Raster {
  readonly data: Uint32Array

  constructor(
    readonly width: number,
    readonly height: number,
    fill: Color = TRANSPARENT,
  ) {
    this.data = new Uint32Array(width * height)
    if (fill) this.data.fill(fill)
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  get(x: number, y: number): Color {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return TRANSPARENT
    return this.data[y * this.width + x]
  }

  set(x: number, y: number, c: Color) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.data[y * this.width + x] = c
  }

  blend(x: number, y: number, c: Color, amount: number) {
    x |= 0
    y |= 0
    if (amount <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const index = y * this.width + x
    if (amount >= 1) {
      this.data[index] = (c | 0xff000000) >>> 0
      return
    }
    const under = this.data[index]
    const underAlpha = alphaOf(under) / 255
    if (underAlpha === 1) {
      this.data[index] = pack(
        red(under) + (red(c) - red(under)) * amount,
        green(under) + (green(c) - green(under)) * amount,
        blue(under) + (blue(c) - blue(under)) * amount,
      )
      return
    }
    const outAlpha = amount + underAlpha * (1 - amount)
    const keep = (underAlpha * (1 - amount)) / outAlpha
    const add = amount / outAlpha
    this.data[index] = pack(
      red(c) * add + red(under) * keep,
      green(c) * add + green(under) * keep,
      blue(c) * add + blue(under) * keep,
      Math.round(outAlpha * 255),
    )
  }

  shadow(x: number, y: number, strength: number) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const index = y * this.width + x
    const c = this.data[index]
    if (alphaOf(c) === 0) return
    this.data[index] = pack(red(c) * (1 - strength * 0.46), green(c) * (1 - strength * 0.4), blue(c) * (1 - strength * 0.26), alphaOf(c))
  }

  lighten(x: number, y: number, strength: number, tint: Color = 0xffffffff) {
    this.blend(x, y, tint, strength)
  }

  rect(x: number, y: number, w: number, h: number, c: Color) {
    const x0 = Math.max(0, Math.round(x))
    const y0 = Math.max(0, Math.round(y))
    const x1 = Math.min(this.width, Math.round(x + w))
    const y1 = Math.min(this.height, Math.round(y + h))
    for (let yy = y0; yy < y1; yy++) this.data.fill(c, yy * this.width + x0, yy * this.width + x1)
  }

  rectBlend(x: number, y: number, w: number, h: number, c: Color, amount: number) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.blend(xx, yy, c, amount)
  }

  rectShadow(x: number, y: number, w: number, h: number, strength: number) {
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.shadow(xx, yy, strength)
  }

  hline(x0: number, x1: number, y: number, c: Color) {
    this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, c)
  }

  vline(x: number, y0: number, y1: number, c: Color) {
    this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, c)
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let error = dx + dy
    for (;;) {
      this.set(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * error
      if (e2 >= dy) {
        error += dy
        x0 += sx
      }
      if (e2 <= dx) {
        error += dx
        y0 += sy
      }
    }
  }

  eachInEllipse(cx: number, cy: number, rx: number, ry: number, fn: (x: number, y: number, d: number) => void) {
    const x0 = Math.floor(cx - rx)
    const x1 = Math.ceil(cx + rx)
    const y0 = Math.floor(cy - ry)
    const y1 = Math.ceil(cy + ry)
    for (let y = y0; y <= y1; y++) {
      const ny = (y + 0.5 - cy) / ry
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx
        const d = nx * nx + ny * ny
        if (d <= 1) fn(x, y, d)
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color) {
    this.eachInEllipse(cx, cy, rx, ry, (x, y) => this.set(x, y, c))
  }

  ellipseShadow(cx: number, cy: number, rx: number, ry: number, strength: number) {
    this.eachInEllipse(cx, cy, rx, ry, (x, y) => this.shadow(x, y, strength))
  }

  disc(cx: number, cy: number, r: number, c: Color) {
    this.ellipse(cx, cy, r, r, c)
  }

  eachInPolygon(points: readonly Point[], fn: (x: number, y: number) => void) {
    scanPolygon(points, this.width, this.height, fn)
  }

  polygon(points: readonly Point[], c: Color) {
    this.eachInPolygon(points, (x, y) => this.set(x, y, c))
  }

  draw(source: Raster, dx: number, dy: number) {
    dx = Math.round(dx)
    dy = Math.round(dy)
    for (let y = 0; y < source.height; y++) {
      const ty = y + dy
      if (ty < 0 || ty >= this.height) continue
      for (let x = 0; x < source.width; x++) {
        const tx = x + dx
        if (tx < 0 || tx >= this.width) continue
        const c = source.data[y * source.width + x]
        const a = alphaOf(c)
        if (a === 0) continue
        if (a === 255) this.data[ty * this.width + tx] = c
        else this.blend(tx, ty, c | 0xff000000, a / 255)
      }
    }
  }

  outline(c: Color) {
    const { width, height, data } = this
    const marks: number[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (alphaOf(data[y * width + x]) !== 0) continue
        const solid = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < width && yy < height && alphaOf(data[yy * width + xx]) > 128
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) marks.push(y * width + x)
      }
    }
    for (const index of marks) data[index] = c
  }

  bytes() {
    return new Uint8ClampedArray(this.data.buffer, this.data.byteOffset, this.data.byteLength)
  }
}

export class Mask {
  readonly data: Uint8Array

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height)
  }

  get(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0
    return this.data[y * this.width + x]
  }

  set(x: number, y: number, value: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.data[y * this.width + x] = value
  }

  rect(x: number, y: number, w: number, h: number, value = 1) {
    const x0 = Math.max(0, Math.round(x))
    const y0 = Math.max(0, Math.round(y))
    const x1 = Math.min(this.width, Math.round(x + w))
    const y1 = Math.min(this.height, Math.round(y + h))
    for (let yy = y0; yy < y1; yy++) this.data.fill(value, yy * this.width + x0, yy * this.width + x1)
  }

  polygon(points: readonly Point[], value = 1) {
    scanPolygon(points, this.width, this.height, (x, y) => (this.data[y * this.width + x] = value))
  }

  stroke(path: readonly Point[], half: number, value = 1) {
    const reach = half * half
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i]
      const [bx, by] = path[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const lengthSquared = dx * dx + dy * dy || 1
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - half))
      const x1 = Math.min(this.width - 1, Math.ceil(Math.max(ax, bx) + half))
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - half))
      const y1 = Math.min(this.height - 1, Math.ceil(Math.max(ay, by) + half))
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5
          const py = y + 0.5
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
          const ex = px - (ax + t * dx)
          const ey = py - (ay + t * dy)
          if (ex * ex + ey * ey <= reach) this.data[y * this.width + x] = value
        }
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, value = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx
        const ny = (y + 0.5 - cy) / ry
        if (nx * nx + ny * ny <= 1) this.set(x, y, value)
      }
    }
  }

  distance(cap = 64): Uint8Array {
    const { width, height, data } = this
    const out = new Uint8Array(width * height)
    for (let i = 0; i < out.length; i++) out[i] = data[i] ? cap : 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        if (!out[i]) continue
        const up = y > 0 ? out[i - width] : 0
        const left = x > 0 ? out[i - 1] : 0
        out[i] = Math.min(out[i], up + 1, left + 1)
      }
    }
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1; x >= 0; x--) {
        const i = y * width + x
        if (!out[i]) continue
        const down = y < height - 1 ? out[i + width] : 0
        const right = x < width - 1 ? out[i + 1] : 0
        out[i] = Math.min(out[i], down + 1, right + 1)
      }
    }
    return out
  }
}
