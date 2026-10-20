import baked from './baked.json'

export const GROUND = 0
export const FOREST = 1
export const WATER = 2

const { cell: CELL, columns: COLUMNS, rows: ROWS } = baked.terrain
const CODES: Record<string, number> = { g: GROUND, f: FOREST, w: WATER }

const terrain = (() => {
  const grid = new Uint8Array(COLUMNS * ROWS)
  baked.terrain.data.forEach((line, row) => {
    let column = 0
    for (const [, code, length] of line.matchAll(/([gfw])(\d+)/g)) {
      const start = row * COLUMNS + column
      grid.fill(CODES[code], start, start + Number(length))
      column += Number(length)
    }
  })
  return grid
})()

export function terrainAt(x: number, y: number) {
  if (x < 0 || y < 0 || x >= baked.size || y >= baked.size) return FOREST
  return terrain[Math.floor(y / CELL) * COLUMNS + Math.floor(x / CELL)]
}

const BUCKET = 256
const BUCKETS_PER_ROW = Math.ceil(baked.size / BUCKET)
const rects = baked.obstacles.rects
const circles = baked.obstacles.circles
const buckets = new Map<number, number[]>()

function register(index: number, x: number, y: number, w: number, h: number) {
  for (let by = Math.floor(y / BUCKET); by <= Math.floor((y + h) / BUCKET); by++) {
    for (let bx = Math.floor(x / BUCKET); bx <= Math.floor((x + w) / BUCKET); bx++) {
      const key = by * BUCKETS_PER_ROW + bx
      const list = buckets.get(key)
      if (list) list.push(index)
      else buckets.set(key, [index])
    }
  }
}

rects.forEach(([x, y, w, h], index) => register(index, x, y, w, h))
circles.forEach(([x, y, r], index) => register(rects.length + index, x - r, y - r, r * 2, r * 2))

export function isObstacleAt(x: number, y: number) {
  const list = buckets.get(Math.floor(y / BUCKET) * BUCKETS_PER_ROW + Math.floor(x / BUCKET))
  if (!list) return false
  for (const index of list) {
    if (index < rects.length) {
      const [rx, ry, rw, rh] = rects[index]
      if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return true
    } else {
      const [cx, cy, r] = circles[index - rects.length]
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true
    }
  }
  return false
}

export function isWalkableAt(x: number, y: number) {
  return terrainAt(x, y) === GROUND && !isObstacleAt(x, y)
}
