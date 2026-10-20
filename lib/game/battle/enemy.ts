import type { Cue } from '../audio'
import { directionFromVector, FRAME, WALK_FPS, type Direction } from '../sprite'
import { BOSSES } from './bosses'
import { CLASSES, type ClassMods, type RobotClass } from './classes'
import { CARDS, type CardId } from './deck'
import type { Element } from './elements'
import { ENEMIES, type EnemyDef, type EnemyKind, type Shot } from './enemies'
import type { EnemySpec } from './lineup'
import { Status } from './status'

export type EnemyState =
  | 'spawn'
  | 'chase'
  | 'orbit'
  | 'dash'
  | 'windup'
  | 'strike'
  | 'recover'
  | 'hurt'
  | 'stagger'
  | 'vanish'
  | 'appear'
  | 'cast'
  | 'rush'
  | 'dead'

export type Entrance = 'door' | 'drop' | 'warp' | 'ring'

export type Field = {
  player: { x: number; y: number }
  scale: number
  constrain(x: number, y: number, fromX: number, fromY: number): readonly [number, number]
  blinkSpot(distance: number): readonly [number, number]
}

export type EnemyEvents = {
  strike(enemy: Enemy, damage: number, reach: number): void
  shoot(enemy: Enemy, shot: Shot, damage: number): void
  announce(enemy: Enemy, card: CardId): void
  special(enemy: Enemy, card: CardId, targetX: number, targetY: number): void
  transform(enemy: Enemy, card: CardId): void
  cue(name: Cue, duration?: number): void
  dust(x: number, y: number, amount: number): void
}

const SPAWN_SECONDS: Record<Entrance, number> = { door: 0.55, drop: 0.85, warp: 0.4, ring: 0.5 }
const CAST_SECONDS: Record<CardId, number> = {
  rajada: 0.7,
  onda: 0.95,
  investida: 0.6,
  chuva: 0.8,
  tita: 0.75,
  fantasma: 0.6,
  sobrecarga: 0.6,
  prisma: 0.7,
  enxame: 0.7,
  raizes: 0.9,
  orvalho: 0.8,
}
const FOOT_HALF_WIDTH = 18
const KNOCKBACK_DRAG = 7
const SOLID_ALPHA = 0.6
const TRANSFORM_AT = 0.55

let nextId = 1

export class Enemy {
  readonly id = nextId++
  readonly def: EnemyDef
  readonly spec: EnemySpec
  readonly cls: ClassMods
  readonly level: number
  element: Element
  readonly status = new Status()
  x: number
  y: number
  facing: Direction = 's'
  frame = 0
  moving = false
  health: number
  readonly maxHealth: number
  state: EnemyState = 'spawn'
  timer: number
  cooldown: number
  flash = 0
  alpha = 0
  z = 0
  vz = 0
  kx = 0
  ky = 0
  telegraph = 0
  ranged = false
  cast: { card: CardId; total: number; x: number; y: number } | null = null
  form: CardId | null = null
  formTimer = 0
  rushHit = false
  speedFactor = 1
  readonly entrance: Entrance
  private readonly damage: number
  private walkTime = 0
  private orbitAngle = Math.random() * Math.PI * 2
  private orbitDirection = Math.random() < 0.5 ? -1 : 1
  private think = 0
  private specialTimer: number
  private transformed = false
  private rushX = 0
  private rushY = 0
  private readonly spawnFrom: readonly [number, number]

  constructor(spec: EnemySpec, x: number, y: number, entrance: Entrance) {
    this.spec = spec
    this.def = spec.boss ? BOSSES[spec.boss] : ENEMIES[spec.kind]
    this.cls = CLASSES[spec.cls].mods
    this.level = spec.level
    this.element = spec.element
    this.x = x
    this.y = y
    this.spawnFrom = [x, y]
    this.maxHealth = Math.round(this.def.health * spec.tier)
    this.health = this.maxHealth
    this.damage = Math.round(this.def.damage * this.power * this.cls.melee)
    this.entrance = entrance
    this.timer = SPAWN_SECONDS[entrance]
    this.cooldown = 0.9 + Math.random() * 0.8
    this.specialTimer = (this.def.boss ? 2 : 3.4) + Math.random() * 2.6
    if (entrance === 'drop') {
      this.z = 900
      this.vz = -1100
      this.alpha = 1
    }
  }

  get kind(): EnemyKind {
    return this.spec.kind
  }

  get power() {
    return this.spec.power ?? this.spec.tier
  }

  get isBoss() {
    return this.def.boss === true
  }

  private get tempo() {
    return Math.max(0.74, 0.96 - 0.026 * this.level)
  }

  get className(): RobotClass {
    return this.spec.cls
  }

  get alive() {
    return this.state !== 'dead'
  }

  get vulnerable() {
    return this.alive && this.state !== 'spawn' && this.alpha >= SOLID_ALPHA && this.z < 40
  }

  get hovering() {
    return this.def.behaviour === 'orbiter'
  }

  get lift() {
    if (this.def.behaviour === 'orbiter') return 26 + Math.sin(this.walkTime * 6 + this.id) * 6
    if (this.def.behaviour === 'phaser') return 18 + Math.sin(this.walkTime * 3 + this.id) * 5
    return 0
  }

  get armor() {
    return this.cls.armor * (this.form === 'tita' ? 0.65 : 1)
  }

  get scale() {
    return this.def.scale * (this.form === 'tita' ? 1.3 : 1)
  }

  get steady() {
    return this.form === 'tita'
  }

  get phase() {
    return this.form === 'fantasma' ? 0.33 : 0
  }

  get formAlpha() {
    return this.form === 'fantasma' ? 0.55 : 1
  }

  get shotDamage() {
    return this.def.shot ? Math.round(this.def.shot.damage * this.power * this.cls.shot) : 0
  }

  get strikeDamage() {
    return Math.round(this.damage * (this.form === 'tita' ? 1.5 : 1))
  }

  get specialCard(): CardId | null {
    return this.spec.cards.find((card) => CARDS[card].kind === 'special') ?? null
  }

  get transformCard(): CardId | null {
    return this.spec.cards.find((card) => CARDS[card].kind === 'transform') ?? null
  }

  private get speed() {
    const form = this.form === 'tita' ? 0.8 : this.form === 'fantasma' ? 1.35 : 1
    return this.def.speed * this.cls.speed * this.status.speed * form * this.speedFactor
  }

  update(dt: number, field: Field, events: EnemyEvents) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 7)
    if (this.state === 'dead') {
      this.timer -= dt
      this.alpha = Math.max(0, Math.min(1, this.timer / 0.5))
      return
    }
    const recovery = this.status.recovery * (this.form === 'sobrecarga' ? 2.2 : 1)
    this.cooldown = Math.max(0, this.cooldown - dt * recovery)
    this.specialTimer = Math.max(0, this.specialTimer - dt * this.status.recovery)
    if (this.form) {
      this.formTimer -= dt
      if (this.formTimer <= 0) this.endForm()
    }
    this.walkTime += dt * (this.hovering || this.def.behaviour === 'phaser' ? 1 : this.moving ? this.speed / 300 : 0)
    this.applyKnockback(dt, field)
    if (this.z > 0 || this.vz !== 0) this.fall(dt, events)
    this.moving = false

    switch (this.state) {
      case 'spawn':
        this.spawnStep(dt, field)
        break
      case 'chase':
        if (!this.tryCard(field, events)) this.chaseStep(dt, field, events)
        break
      case 'orbit':
        if (!this.tryCard(field, events)) this.orbitStep(dt, field)
        break
      case 'dash':
        this.dashStep(dt, field, events)
        break
      case 'windup':
        this.windupStep(dt, field, events)
        break
      case 'cast':
        this.castStep(dt, field, events)
        break
      case 'rush':
        this.rushStep(dt, field)
        break
      case 'strike':
      case 'recover':
      case 'hurt':
      case 'stagger':
        this.waitStep(dt)
        break
      case 'vanish':
        this.vanishStep(dt, field, events)
        break
      case 'appear':
        this.appearStep(dt)
        break
    }
    if (this.moving) this.frame = Math.floor(this.walkTime * WALK_FPS) % FRAME.walkFrames
    else this.frame = 0
  }

  hit(damage: number, fromX: number, fromY: number, force: number): number {
    if (!this.vulnerable) return 0
    this.health = Math.max(0, this.health - damage)
    this.flash = 1
    const dx = this.x - fromX
    const dy = this.y - fromY
    const length = Math.hypot(dx, dy) || 1
    const push = this.steady ? 0 : force * this.def.pushback
    this.kx += (dx / length) * push
    this.ky += (dy / length) * push * 0.6
    if (this.health <= 0) {
      this.state = 'dead'
      this.timer = 0.6
      this.telegraph = 0
      this.cast = null
      return damage
    }
    const armoured = this.def.behaviour === 'bruiser' || this.steady || this.isBoss
    const transforming = this.state === 'cast' && this.cast && CARDS[this.cast.card].kind === 'transform'
    if (!transforming && (!armoured || this.state === 'recover') && this.state !== 'rush') {
      if (this.state !== 'stagger') {
        this.state = 'hurt'
        this.timer = this.def.behaviour === 'bruiser' ? 0.3 : 0.22
        this.telegraph = 0
        this.cast = null
      }
    }
    return damage
  }

  stagger(seconds: number) {
    if (!this.alive) return
    if (this.state === 'cast' && this.cast && CARDS[this.cast.card].kind === 'transform') return
    const already = this.state === 'stagger' ? this.timer : 0
    this.state = 'stagger'
    this.timer = Math.max(already, seconds)
    this.telegraph = 0
    this.cast = null
    this.cooldown = Math.max(this.cooldown, seconds + 0.4)
  }

  interrupt() {
    if (this.state === 'windup' || (this.state === 'cast' && this.cast && CARDS[this.cast.card].kind === 'special')) {
      this.state = 'recover'
      this.timer = 0.3
      this.telegraph = 0
      this.cast = null
    }
  }

  wear(card: CardId) {
    this.form = card
    this.formTimer = CARDS[card].duration ?? 8
    this.transformed = true
  }

  endForm() {
    this.form = null
    this.formTimer = 0
    this.element = this.spec.element
  }

  rush(dx: number, dy: number, seconds: number) {
    const length = Math.hypot(dx, dy) || 1
    this.rushX = dx / length
    this.rushY = dy / length
    this.state = 'rush'
    this.timer = seconds
    this.rushHit = false
    this.telegraph = 0
  }

  face(targetX: number, targetY: number) {
    this.facing = directionFromVector(targetX - this.x, targetY - this.y, this.facing, 0)
  }

  private applyKnockback(dt: number, field: Field) {
    if (Math.abs(this.kx) < 1 && Math.abs(this.ky) < 1) {
      this.kx = 0
      this.ky = 0
      return
    }
    this.moveBy(this.kx * dt, this.ky * dt, field)
    const damping = Math.exp(-KNOCKBACK_DRAG * dt)
    this.kx *= damping
    this.ky *= damping
  }

  private fall(dt: number, events: EnemyEvents) {
    this.vz -= 2400 * dt
    this.z += this.vz * dt
    if (this.z <= 0) {
      this.z = 0
      this.vz = 0
      events.dust(this.x, this.y, 1.6)
      events.cue('heavy')
    }
  }

  private spawnStep(dt: number, field: Field) {
    this.timer -= dt
    const total = SPAWN_SECONDS[this.entrance]
    const progress = 1 - Math.max(0, this.timer) / total
    if (this.entrance === 'door') {
      this.alpha = Math.min(1, progress * 1.6)
      this.moving = true
      this.facing = 's'
      this.moveBy(0, this.def.speed * 0.6 * dt, field)
    } else if (this.entrance === 'drop') {
      if (this.z > 0) this.timer = Math.max(this.timer, 0.05)
    } else {
      this.alpha = Math.min(1, progress * 1.3)
      this.face(field.player.x, field.player.y)
    }
    if (this.timer <= 0) {
      this.alpha = 1
      this.enterIdle()
    }
  }

  private enterIdle() {
    this.state = this.def.behaviour === 'orbiter' ? 'orbit' : 'chase'
    this.think = 0
  }

  private tryCard(field: Field, events: EnemyEvents): boolean {
    if (this.status.stunned) return false
    const { player } = field
    const distance = Math.hypot(player.x - this.x, player.y - this.y)
    const transform = this.transformCard
    if (transform && !this.transformed && this.health <= this.maxHealth * TRANSFORM_AT) {
      this.beginCast(transform, player.x, player.y, events)
      return true
    }
    const special = this.specialCard
    if (!special || this.specialTimer > 0 || this.cooldown > 0.2) return false
    const fits =
      special === 'rajada'
        ? distance > 220 && distance < 780
        : special === 'onda'
          ? distance < 250
          : special === 'investida'
            ? distance > 240 && distance < 720
            : distance < 950
    if (!fits) return false
    this.beginCast(special, player.x, player.y, events)
    return true
  }

  private beginCast(card: CardId, x: number, y: number, events: EnemyEvents) {
    const total = CAST_SECONDS[card]
    this.state = 'cast'
    this.timer = total
    this.telegraph = 0
    this.cast = { card, total, x, y }
    this.face(x, y)
    events.announce(this, card)
    if (card === 'onda') events.cue('charge', total)
  }

  private castStep(dt: number, field: Field, events: EnemyEvents) {
    const cast = this.cast
    if (!cast) {
      this.enterIdle()
      return
    }
    this.timer -= dt
    this.telegraph = Math.min(1, 1 - this.timer / cast.total)
    if (cast.card === 'rajada' || cast.card === 'chuva' || (cast.card === 'investida' && this.timer > cast.total * 0.45)) {
      cast.x = field.player.x
      cast.y = field.player.y
    }
    this.face(cast.x, cast.y)
    if (this.timer > 0) return
    this.cast = null
    this.telegraph = 0
    if (CARDS[cast.card].kind === 'transform') {
      events.transform(this, cast.card)
      this.state = 'recover'
      this.timer = 0.35
      return
    }
    this.specialTimer = (CARDS[cast.card].cooldown + 2.4 + Math.random() * 2.6) * this.tempo * (this.form === 'sobrecarga' ? 0.6 : 1)
    this.state = 'strike'
    this.timer = 0.18
    this.recoverAfter = cast.card === 'onda' ? 0.8 : 0.45
    this.cooldown = Math.max(this.cooldown, 0.6)
    events.special(this, cast.card, cast.x, cast.y)
  }

  private rushStep(dt: number, field: Field) {
    this.timer -= dt
    this.moving = true
    const speed = 1350
    this.moveBy(this.rushX * speed * dt, this.rushY * speed * dt, field)
    this.facing = directionFromVector(this.rushX, this.rushY, this.facing, 0)
    if (this.timer <= 0) {
      this.state = 'recover'
      this.timer = 0.45
      this.cooldown = Math.max(this.cooldown, 0.8)
    }
  }

  private chaseStep(dt: number, field: Field, events: EnemyEvents) {
    const { player } = field
    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.hypot(dx, dy)
    this.face(player.x, player.y)
    const { def } = this

    if (def.behaviour === 'phaser') {
      this.think += dt
      const wanted = 320
      if (distance > wanted + 40) this.step(dx, dy, dt, field, 1)
      else if (distance < wanted - 80) this.step(-dx, -dy, dt, field, 0.8)
      if (this.cooldown <= 0 && distance < 720) {
        this.ranged = distance > def.reach * 0.9
        this.beginWindup(def.windup, events)
      } else if (this.think > 2.4) {
        this.state = 'vanish'
        this.timer = 0.35
        events.cue('warp')
      }
      return
    }

    const reach = def.reach * 0.85 * field.scale
    if (distance > reach) this.step(dx, dy, dt, field, 1)
    if (this.cooldown > 0) return
    if (distance <= reach) {
      this.ranged = false
      this.beginWindup(def.windup, events)
    } else if (def.shot && distance > 240 && distance < 680 && Math.random() < dt * (this.form === 'sobrecarga' ? 2.6 : 0.9)) {
      this.ranged = true
      this.beginWindup(def.windup * 0.8, events)
    }
  }

  private orbitStep(dt: number, field: Field) {
    const { player } = field
    this.orbitAngle += this.orbitDirection * 2.1 * dt
    const radius = 230 * field.scale
    const targetX = player.x + Math.cos(this.orbitAngle) * radius
    const targetY = player.y + Math.sin(this.orbitAngle) * radius * 0.6
    const dx = targetX - this.x
    const dy = targetY - this.y
    if (Math.hypot(dx, dy) > 12) this.step(dx, dy, dt, field, 1)
    this.face(player.x, player.y)
    if (Math.random() < dt * 0.25) this.orbitDirection *= -1
    if (this.cooldown <= 0 && Math.random() < dt * 1.4) {
      this.state = 'dash'
      this.timer = 0.5
      this.telegraph = 0
      this.ranged = false
    }
  }

  private dashStep(dt: number, field: Field, events: EnemyEvents) {
    const { player } = field
    this.timer -= dt
    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.hypot(dx, dy)
    this.telegraph = Math.min(1, this.telegraph + dt * 4)
    this.face(player.x, player.y)
    this.step(dx, dy, dt, field, 1.9)
    if (distance <= this.def.reach * field.scale) {
      events.strike(this, this.strikeDamage, this.def.reach)
      this.kx = (-dx / (distance || 1)) * 520
      this.ky = (-dy / (distance || 1)) * 320
      this.afterStrike(0.55)
    } else if (this.timer <= 0) {
      this.afterStrike(0.3)
    }
  }

  private beginWindup(seconds: number, events: EnemyEvents) {
    this.state = 'windup'
    this.timer = seconds
    this.telegraph = 0
    if (this.def.behaviour === 'bruiser') events.cue('charge', seconds)
  }

  private windupStep(dt: number, field: Field, events: EnemyEvents) {
    this.timer -= dt
    const total = this.ranged ? this.def.windup * 0.8 : this.def.windup
    this.telegraph = Math.min(1, 1 - this.timer / total)
    if (this.def.behaviour !== 'phaser') this.face(field.player.x, field.player.y)
    if (this.timer > 0) return
    if (this.ranged && this.def.shot) {
      events.shoot(this, this.def.shot, this.shotDamage)
    } else {
      events.strike(this, this.strikeDamage, this.def.reach)
    }
    this.afterStrike(this.def.behaviour === 'bruiser' ? 0.9 : 0.3)
  }

  private afterStrike(recover: number) {
    this.state = 'strike'
    this.timer = 0.18
    this.telegraph = 0
    this.cooldown = this.def.cooldown * this.cls.meleeCooldown * this.tempo * (0.85 + Math.random() * 0.3)
    this.recoverAfter = recover
  }

  private recoverAfter = 0.3

  private waitStep(dt: number) {
    this.timer -= dt
    if (this.timer > 0) return
    if (this.state === 'strike') {
      this.state = 'recover'
      this.timer = this.recoverAfter
      return
    }
    if (this.def.behaviour === 'phaser' && this.state === 'recover') {
      this.state = 'vanish'
      this.timer = 0.35
      return
    }
    this.enterIdle()
  }

  private vanishStep(dt: number, field: Field, events: EnemyEvents) {
    this.timer -= dt
    this.alpha = Math.max(0, this.timer / 0.35)
    if (this.timer > 0) return
    const [x, y] = field.blinkSpot(260 + Math.random() * 200)
    this.x = x
    this.y = y
    this.kx = 0
    this.ky = 0
    this.state = 'appear'
    this.timer = 0.35
    events.cue('warp')
  }

  private appearStep(dt: number) {
    this.timer -= dt
    this.alpha = Math.min(1, 1 - this.timer / 0.35)
    if (this.timer <= 0) {
      this.alpha = 1
      this.cooldown = Math.min(this.cooldown, 0.5)
      this.enterIdle()
    }
  }

  private step(dx: number, dy: number, dt: number, field: Field, factor: number) {
    const length = Math.hypot(dx, dy)
    if (length < 0.001) return
    const speed = this.speed * factor
    this.moving = true
    this.moveBy((dx / length) * speed * dt, (dy / length) * speed * dt, field)
  }

  private moveBy(dx: number, dy: number, field: Field) {
    const fromX = this.x
    const fromY = this.y
    const [x, y] = field.constrain(this.x + dx, this.y + dy, fromX, fromY)
    this.x = x
    this.y = y
  }

  static footprint(x: number, y: number): readonly (readonly [number, number])[] {
    return [
      [x - FOOT_HALF_WIDTH, y],
      [x + FOOT_HALF_WIDTH, y],
    ]
  }

  get origin() {
    return this.spawnFrom
  }
}
