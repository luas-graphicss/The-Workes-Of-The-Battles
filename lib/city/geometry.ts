export type Point = readonly [number, number]
export type Polygon = readonly Point[]
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

export function pointInPolygon(x: number, y: number, polygon: Polygon): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function inRect(rect: Rect, x: number, y: number) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
}

export function rectsOverlap(a: Rect, b: Rect, margin = 0) {
  return a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin
}

export function polygonBounds(polygon: Polygon): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function random(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash2(x: number, y: number, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export function noise2(x: number, y: number, scale: number, seed = 0) {
  const fx = x / scale
  const fy = y / scale
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const sx = tx * tx * (3 - 2 * tx)
  const sy = ty * ty * (3 - 2 * ty)
  const a = hash2(x0, y0, seed)
  const b = hash2(x0 + 1, y0, seed)
  const c = hash2(x0, y0 + 1, seed)
  const d = hash2(x0 + 1, y0 + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

export function fbm(x: number, y: number, scale: number, seed = 0, octaves = 3) {
  let total = 0
  let weight = 0
  let amplitude = 1
  let size = scale
  for (let i = 0; i < octaves; i++) {
    total += noise2(x, y, size, seed + i * 101) * amplitude
    weight += amplitude
    amplitude *= 0.5
    size *= 0.5
  }
  return total / weight
}

export function bezier(p0: Point, p1: Point, p2: Point, p3: Point, steps: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return points
}

function catmull(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ]
}

export function smoothLoop(points: readonly Point[], step: number): Point[] {
  const out: Point[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const segments = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
    for (let s = 0; s < segments; s++) out.push(catmull(p0, p1, p2, p3, s / segments))
  }
  return out
}

export function smoothPath(points: readonly Point[], step: number): Point[] {
  const out: Point[] = []
  const n = points.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(n - 1, i + 2)]
    const segments = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
    for (let s = 0; s < segments; s++) out.push(catmull(p0, p1, p2, p3, s / segments))
  }
  out.push(points[n - 1])
  return out
}

export function roughen(points: readonly Point[], amplitude: number, wavelength: number, seed: number): Point[] {
  const n = points.length
  let travelled = 0
  return points.map((point, i) => {
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    if (i > 0) travelled += Math.hypot(point[0] - prev[0], point[1] - prev[1])
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const length = Math.hypot(dx, dy) || 1
    const offset = (noise2(travelled, 0, wavelength, seed) - 0.5) * 2 * amplitude
    return [point[0] + (dy / length) * offset, point[1] - (dx / length) * offset] as Point
  })
}

export function strokePath(path: readonly Point[], halfWidth: number): Point[] {
  const left: Point[] = []
  const right: Point[] = []
  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const length = Math.hypot(dx, dy) || 1
    const nx = -dy / length
    const ny = dx / length
    left.push([path[i][0] + nx * halfWidth, path[i][1] + ny * halfWidth])
    right.push([path[i][0] - nx * halfWidth, path[i][1] - ny * halfWidth])
  }
  return [...left, ...right.reverse()]
}

export function offsetPath(path: readonly Point[], distance: number): Point[] {
  return path.map((point, i) => {
    const prev = path[Math.max(0, i - 1)]
    const next = path[Math.min(path.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const length = Math.hypot(dx, dy) || 1
    return [point[0] - (dy / length) * distance, point[1] + (dx / length) * distance] as Point
  })
}

export function densify(path: readonly Point[], step: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i]
    const [bx, by] = path[i + 1]
    const pieces = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step))
    for (let k = 0; k < pieces; k++) out.push([ax + ((bx - ax) * k) / pieces, ay + ((by - ay) * k) / pieces])
  }
  out.push(path[path.length - 1])
  return out
}

export function distanceToSegment(x: number, y: number, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSquared = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared))
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
}

export function distanceToPath(x: number, y: number, path: readonly Point[]) {
  let best = Infinity
  for (let i = 0; i < path.length - 1; i++) best = Math.min(best, distanceToSegment(x, y, path[i], path[i + 1]))
  return best
}
