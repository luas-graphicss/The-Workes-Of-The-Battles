import type { Point, Rect } from '../../city/geometry'
import { ARENA } from '../../world-data'
import type { RGB } from '../fx/textures'

export type RingDef = {
  id: string
  name: string

  place: string

  cheer: string
  center: Point
  ring: Rect
  bounds: { x0: number; y0: number; x1: number; y1: number }
  playerStart: Point
  enemyStart: Point
  exit: Point
  posts: readonly Point[]
  lamps: readonly Point[]
  benches: readonly Point[]

  ambient?: readonly [RGB, RGB]
}

export const ARENA_RING: RingDef = {
  id: 'arena',
  name: ARENA.name,
  place: 'fim da Avenida do Cristal',
  cheer: 'o Mirante aplaude',
  center: ARENA.center,
  ring: ARENA.ring,
  bounds: ARENA.bounds,
  playerStart: ARENA.playerStart,
  enemyStart: ARENA.enemyStart,
  exit: ARENA.exit,
  posts: ARENA.posts,
  lamps: ARENA.lamps,
  benches: ARENA.benches,
}

export type RingSpec = {
  id: string
  name: string
  place: string
  cheer: string
  rect: Rect

  exit?: Point
  lamps?: readonly Point[]
  benches?: readonly Point[]
  ambient?: readonly [RGB, RGB]
}

export function ringFromRect(spec: RingSpec): RingDef {
  const { rect } = spec
  const centerX = rect.x + rect.w / 2
  const centerY = rect.y + rect.h / 2
  return {
    id: spec.id,
    name: spec.name,
    place: spec.place,
    cheer: spec.cheer,
    ambient: spec.ambient,
    center: [centerX, centerY],
    ring: rect,
    bounds: { x0: rect.x + 36, y0: rect.y + 34, x1: rect.x + rect.w - 36, y1: rect.y + rect.h - 30 },
    playerStart: [centerX, rect.y + rect.h - 110],
    enemyStart: [centerX, rect.y + 120],
    exit: spec.exit ?? [centerX, rect.y + rect.h + 70],
    posts: [
      [rect.x, rect.y],
      [rect.x + rect.w, rect.y],
      [rect.x, rect.y + rect.h],
      [rect.x + rect.w, rect.y + rect.h],
    ],
    lamps: spec.lamps ?? [
      [rect.x - 60, rect.y - 40],
      [rect.x + rect.w + 60, rect.y - 40],
      [rect.x - 60, rect.y + rect.h + 40],
      [rect.x + rect.w + 60, rect.y + rect.h + 40],
    ],
    benches: spec.benches ?? [],
  }
}
