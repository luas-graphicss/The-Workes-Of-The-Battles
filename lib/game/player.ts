import { isWalkable, type Point } from '../world-data'
import type { Movement } from './input'
import { directionFromVector, FRAME, WALK_FPS, type Direction } from './sprite'

export const WALK_SPEED = 560

const FOOT_HALF_WIDTH = 20
const FOOT_DEPTH = 14

export class Player {
  x: number
  y: number
  facing: Direction = 's'
  frame = 0
  moving = false
  speedMultiplier = 1
  private walkTime = 0

  constructor([x, y]: Point) {
    this.x = x
    this.y = y
  }

  update(dt: number, input: Movement) {
    this.moving = input.magnitude > 0.001
    if (!this.moving) {
      this.frame = 0
      this.walkTime = 0
      return
    }
    const speed = WALK_SPEED * this.speedMultiplier * (0.35 + 0.65 * input.magnitude)
    this.slide(input.x * speed * dt, 0)
    this.slide(0, input.y * speed * dt)
    this.facing = directionFromVector(input.x, input.y, this.facing)
    this.walkTime += dt * (0.6 + 0.4 * input.magnitude) * Math.sqrt(this.speedMultiplier)
    this.frame = Math.floor(this.walkTime * WALK_FPS) % FRAME.walkFrames
  }

  place(x: number, y: number, facing: Direction = this.facing) {
    this.x = x
    this.y = y
    this.facing = facing
    this.frame = 0
    this.moving = false
    this.walkTime = 0
  }

  private slide(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return
    const stuck = !this.canStand(this.x, this.y)
    for (let fraction = 1; fraction >= 0.25; fraction /= 2) {
      const nx = this.x + dx * fraction
      const ny = this.y + dy * fraction
      if (stuck || this.canStand(nx, ny)) {
        this.x = nx
        this.y = ny
        return
      }
    }
  }

  private canStand(x: number, y: number) {
    return canStandAt(x, y)
  }
}

export function canStandAt(x: number, y: number) {
  return (
    isWalkable(x - FOOT_HALF_WIDTH, y) &&
    isWalkable(x + FOOT_HALF_WIDTH, y) &&
    isWalkable(x - FOOT_HALF_WIDTH, y - FOOT_DEPTH) &&
    isWalkable(x + FOOT_HALF_WIDTH, y - FOOT_DEPTH)
  )
}

const BESIDE: readonly Point[] = [
  [-76, 22],
  [76, 22],
  [0, 78],
  [0, -72],
  [-64, -52],
  [64, -52],
  [-110, 0],
  [110, 0],
]

export function spotBeside(x: number, y: number): Point {
  for (const [dx, dy] of BESIDE) if (canStandAt(x + dx, y + dy)) return [x + dx, y + dy]
  return [x, y]
}
