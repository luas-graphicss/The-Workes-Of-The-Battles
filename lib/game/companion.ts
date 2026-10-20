import type { Movement } from './input'
import { Player, spotBeside } from './player'
import { directionFromVector } from './sprite'

const FOLLOW_START = 150
const FOLLOW_STOP = 92
const LOST = 640
const STILL: Movement = { x: 0, y: 0, magnitude: 0 }

export class Companion {
  readonly body: Player
  visible = true
  private following = false

  constructor(body: Player) {
    this.body = body
  }

  follow(dt: number, leader: Player) {
    const body = this.body
    const dx = leader.x - body.x
    const dy = leader.y - body.y
    const distance = Math.hypot(dx, dy)
    if (distance > LOST) {
      const [x, y] = spotBeside(leader.x, leader.y)
      body.place(x, y, leader.facing)
      this.following = false
      return
    }
    if (!this.following && distance > FOLLOW_START) this.following = true
    if (this.following && distance < FOLLOW_STOP) this.following = false
    if (!this.following) {
      if (body.moving) body.update(dt, STILL)
      return
    }
    const magnitude = Math.min(1, 0.4 + (distance - FOLLOW_STOP) / 110)
    body.speedMultiplier = Math.max(1, leader.speedMultiplier) * 1.08
    body.update(dt, { x: dx / distance, y: dy / distance, magnitude })
  }

  watch(target: { x: number; y: number }) {
    const body = this.body
    if (body.moving) body.update(0, STILL)
    body.facing = directionFromVector(target.x - body.x, target.y - body.y, body.facing, 0.3)
  }

  settle(x: number, y: number, facing = this.body.facing) {
    const [sx, sy] = spotBeside(x, y)
    this.body.place(sx, sy, facing)
    this.following = false
  }
}
