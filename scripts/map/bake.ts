import type { Rect } from '../../lib/city/geometry'
import * as L from '../../lib/city/layout'
import { ART, type Prop } from '../../lib/city/model'
import { PAVE, type Masks } from './ground'

const CELL = 8
const CODE = { ground: 'g', forest: 'f', water: 'w' } as const

function propFootprint(prop: Prop): Rect | null {
  switch (prop.kind) {
    case 'lamp':
      return { x: prop.x - 12, y: prop.y - 12, w: 24, h: 14 }
    case 'bench-h':
      return { x: prop.x - 44, y: prop.y - 40, w: 88, h: 42 }
    case 'well':
      return { x: prop.x - 44, y: prop.y - 36, w: 88, h: 44 }
    case 'crates':
      return { x: prop.x - 32, y: prop.y - 72, w: 88, h: 72 }
    case 'barrels':
      return { x: prop.x - 32, y: prop.y - 44, w: 84, h: 46 }
    case 'cart':
      return { x: prop.x - 56, y: prop.y - 64, w: 144, h: 66 }
    default:
      return null
  }
}

function bakeTerrain(masks: Masks) {
  const columns = L.SIZE / CELL
  const factor = CELL / ART
  const rows: string[] = []
  for (let row = 0; row < columns; row++) {
    let line = ''
    let current = ''
    let run = 0
    for (let column = 0; column < columns; column++) {
      let code: string = CODE.ground
      for (let dy = 0; dy < factor && code !== CODE.water; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = (row * factor + dy) * masks.size + column * factor + dx
          if (masks.paved.data[i] === PAVE.bridge) continue
          if (masks.water.data[i]) {
            code = CODE.water
            break
          }
          if (!masks.land.data[i]) code = CODE.forest
        }
      }
      if (code === current) {
        run++
      } else {
        if (run) line += current + run
        current = code
        run = 1
      }
    }
    rows.push(line + current + run)
  }
  return { cell: CELL, columns, rows: columns, data: rows }
}

const round = (value: number) => Math.round(value)
const rectArray = (rect: Rect) => [round(rect.x), round(rect.y), round(rect.w), round(rect.h)]

function bakeObstacles() {
  const rects: number[][] = []
  const circles: number[][] = []
  for (const building of L.BUILDINGS) rects.push(rectArray(building))
  for (const stall of L.STALLS) rects.push(rectArray(stall))
  for (const tree of L.TREES) rects.push(rectArray(L.treeBase(tree)))
  for (const prop of L.PROPS) {
    const rect = propFootprint(prop)
    if (rect) rects.push(rectArray(rect))
  }
  for (const fence of L.FENCES) {
    const thickness = fence.kind === 'hedge' ? 28 : 16
    for (let i = 0; i < fence.points.length - 1; i++) {
      const [ax, ay] = fence.points[i]
      const [bx, by] = fence.points[i + 1]
      const rect =
        ay === by
          ? { x: Math.min(ax, bx), y: ay - thickness, w: Math.abs(bx - ax), h: thickness }
          : { x: ax - thickness / 2, y: Math.min(ay, by) - thickness, w: thickness, h: Math.abs(by - ay) + thickness }
      rects.push(rectArray(rect))
    }
  }
  for (const landmark of L.LANDMARKS) {
    if (landmark.kind === 'crystal-fountain') circles.push([landmark.x, landmark.y, landmark.radius ?? 150])
    else if (landmark.base) rects.push(rectArray(landmark.base))
  }
  for (const rope of L.ARENA.ropes) rects.push(rectArray(rope))
  for (const [x, y] of L.ARENA.posts) rects.push([x - 14, y - 14, 28, 28])
  for (const rect of L.WOODS_OBSTACLES) rects.push(rectArray(rect))
  return { rects, circles }
}

export function bakeWorld(masks: Masks) {
  return {
    size: L.SIZE,
    art: ART,
    terrain: bakeTerrain(masks),
    obstacles: bakeObstacles(),
    trees: L.TREES.map((tree) => [tree.kind, tree.seed, tree.x, tree.y] as const),
    lamps: L.PROPS.filter((prop) => prop.kind === 'lamp').map((prop) => [prop.x, prop.y] as const),
    landmarks: L.LANDMARKS.map(({ kind, id, x, y, points }) => ({ kind, id, x, y, points: points ?? [] })),
    regions: L.REGIONS,
  }
}
