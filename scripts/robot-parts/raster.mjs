export const CELL = 48
export const WALK_FRAMES = 6

export const K = 1
export const L = 2
export const M = 3
export const Y = 4
export const W = 5

export const RGB = {
  [K]: [41, 62, 53],
  [L]: [139, 158, 145],
  [M]: [113, 148, 124],
  [Y]: [239, 199, 103],
  [W]: [255, 253, 245],
}

export class Layer {
  constructor(data) {
    this.d = data ?? new Uint8Array(CELL * CELL)
  }

  clone() {
    return new Layer(new Uint8Array(this.d))
  }

  get(x, y) {
    return x < 0 || y < 0 || x >= CELL || y >= CELL ? 0 : this.d[y * CELL + x]
  }

  px(x, y, c) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x >= 0 && y >= 0 && x < CELL && y < CELL) this.d[y * CELL + x] = c
  }

  rect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c)
  }

  hline(x, y, w, c) {
    this.rect(x, y, w, 1, c)
  }

  vline(x, y, h, c) {
    this.rect(x, y, 1, h, c)
  }

  box(x, y, w, h, fill, { hi = 0, sh = 0, round = false } = {}) {
    this.rect(x, y, w, h, K)
    if (w > 2 && h > 2) this.rect(x + 1, y + 1, w - 2, h - 2, fill)
    if (hi && w > 2 && h > 2) {
      this.hline(x + 1, y + 1, w - 2, hi)
      this.vline(x + 1, y + 1, h - 2, hi)
    }
    if (sh && w > 3 && h > 3) {
      this.hline(x + 2, y + h - 2, w - 3, sh)
      this.vline(x + w - 2, y + 2, h - 3, sh)
    }
    if (round) {
      this.px(x, y, 0)
      this.px(x + w - 1, y, 0)
      this.px(x, y + h - 1, 0)
      this.px(x + w - 1, y + h - 1, 0)
      if (w > 2 && h > 2) {
        this.px(x + 1, y, K)
        this.px(x, y + 1, K)
        this.px(x + w - 2, y, K)
        this.px(x + w - 1, y + 1, K)
        this.px(x + 1, y + h - 1, K)
        this.px(x, y + h - 2, K)
        this.px(x + w - 2, y + h - 1, K)
        this.px(x + w - 1, y + h - 2, K)
      }
    }
  }

  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    let dx = Math.abs(x1 - x0)
    let dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.px(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  disc(cx, cy, r, fill, outline = K) {
    const r2 = (r + 0.5) * (r + 0.5)
    const inner = (r - 0.5) * (r - 0.5)
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y
        if (d > r2) continue
        this.px(cx + x, cy + y, d > inner ? outline : fill)
      }
    }
  }

  ellipse(cx, cy, rx, ry, fill, outline = K) {
    const inside = (x, y, ax, ay) => (x * x) / (ax * ax) + (y * y) / (ay * ay) <= 1
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if (!inside(x, y, rx + 0.5, ry + 0.5)) continue
        this.px(cx + x, cy + y, inside(x, y, rx - 0.5, ry - 0.5) ? fill : outline)
      }
    }
  }

  poly(points, fill, outline = K) {
    const n = points.length
    let minY = Infinity
    let maxY = -Infinity
    for (const [, y] of points) {
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      const xs = []
      for (let i = 0; i < n; i++) {
        const [x0, y0] = points[i]
        const [x1, y1] = points[(i + 1) % n]
        if (y0 === y1 || y < Math.min(y0, y1) || y >= Math.max(y0, y1)) continue
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0))
      }
      xs.sort((a, b) => a - b)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) this.px(x, y, fill)
      }
    }
    if (!outline) return
    for (let i = 0; i < n; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[(i + 1) % n]
      this.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), outline)
    }
  }

  paste(other, dx = 0, dy = 0) {
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const c = other.d[y * CELL + x]
        if (c) this.px(x + dx, y + dy, c)
      }
    }
    return this
  }

  mirrored() {
    const out = new Layer()
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) out.d[y * CELL + (CELL - 1 - x)] = this.d[y * CELL + x]
    return out
  }

  shifted(dx, dy) {
    return new Layer().paste(this, dx, dy)
  }

  rotated(cx, cy, deg, tx = cx, ty = cy) {
    const out = new Layer()
    const rad = (deg * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const N = 5
    const ox = cx + 0.5
    const oy = cy + 0.5
    const counts = new Float32Array(6)
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        counts.fill(0)
        let total = 0
        for (let sy = 0; sy < N; sy++) {
          for (let sx = 0; sx < N; sx++) {
            const u = x + (sx + 0.5) / N - (tx - cx)
            const v = y + (sy + 0.5) / N - (ty - cy)
            const du = u - ox
            const dv = v - oy
            const su = ox + du * cos + dv * sin
            const sv = oy - du * sin + dv * cos
            const c = this.get(Math.floor(su), Math.floor(sv))
            if (!c) continue
            total++
            counts[c] += c === K ? 1.35 : 1
          }
        }
        if (total < N * N * 0.42) continue
        let best = 0
        for (let c = 1; c <= 5; c++) if (counts[c] > counts[best]) best = c
        out.d[y * CELL + x] = best
      }
    }
    return out
  }

  anyIn(x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.get(xx, yy)) return true
    return false
  }

  bounds() {
    let minX = CELL
    let minY = CELL
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        if (!this.d[y * CELL + x]) continue
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
    return maxX < 0 ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY }
  }
}

export function sheetToRGBA(cells, columns) {
  const rows = cells.length
  const width = CELL * columns
  const height = CELL * rows
  const out = new Uint8ClampedArray(width * height * 4)
  cells.forEach((row, r) => {
    row.forEach((layer, c) => {
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const v = layer.d[y * CELL + x]
          if (!v) continue
          const i = ((r * CELL + y) * width + c * CELL + x) * 4
          const [red, green, blue] = RGB[v]
          out[i] = red
          out[i + 1] = green
          out[i + 2] = blue
          out[i + 3] = 255
        }
      }
    })
  })
  return { data: out, width, height }
}
