export type Direction = 's' | 'sw' | 'w' | 'nw' | 'n' | 'ne' | 'e' | 'se'

export const DIRECTIONS: readonly Direction[] = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']

export const FRAME = { width: 48, height: 48, walkFrames: 6 } as const

export const ANCHOR = { x: 24, y: 44 } as const

export const BODY = { left: 10, top: 10, width: 28, height: 35 } as const

export const WALK_FPS = 10

export const ROW: Record<Direction, number> = { s: 0, sw: 1, w: 2, nw: 3, n: 4, ne: 5, e: 6, se: 7 }

export const FACING_AWAY: ReadonlySet<Direction> = new Set<Direction>(['n', 'nw', 'ne'])

export function frameSource(direction: Direction, frame: number) {
  return { sx: frame * FRAME.width, sy: ROW[direction] * FRAME.height }
}

const SECTOR = Math.PI / 4
const ANGLE: Record<Direction, number> = {
  e: 0,
  se: SECTOR,
  s: SECTOR * 2,
  sw: SECTOR * 3,
  w: Math.PI,
  nw: -SECTOR * 3,
  n: -SECTOR * 2,
  ne: -SECTOR,
}

function angleBetween(a: number, b: number) {
  let delta = Math.abs(a - b) % (Math.PI * 2)
  if (delta > Math.PI) delta = Math.PI * 2 - delta
  return delta
}

export function directionFromVector(x: number, y: number, current: Direction, hysteresis = 0.12): Direction {
  if (x === 0 && y === 0) return current
  const angle = Math.atan2(y, x)
  if (angleBetween(angle, ANGLE[current]) <= SECTOR / 2 + hysteresis) return current
  let best = current
  let bestDelta = Infinity
  for (const direction of DIRECTIONS) {
    const delta = angleBetween(angle, ANGLE[direction])
    if (delta < bestDelta) {
      bestDelta = delta
      best = direction
    }
  }
  return best
}
