import type { Cue } from '../audio'
import type { Particles } from '../fx/particles'
import { glowTexture, puffTexture, type RGB } from '../fx/textures'
import { TUNING, upgradeDef, type UpgradeId } from '../garage/catalog'
import { EMPTY_LOADOUT, type GadgetLoadout, type GadgetSlot, type Perks } from '../garage/state'
import type { Player } from '../player'
import { directionFromVector } from '../sprite'
import { ELEMENTS, rgba, type Element } from './elements'
import type { Enemy } from './enemy'
import type { ElementFx } from './vfx'

export type QteDir = 'up' | 'down' | 'left' | 'right'

export type QteView = { sequence: readonly QteDir[]; results: readonly boolean[]; left: number; total: number }

export type GadgetStrike = { force: number; heavy?: boolean; quiet?: boolean; soft?: boolean; ailment?: number; element?: Element; fromX?: number; fromY?: number }

export type GadgetHost = {
  readonly player: Player
  readonly enemies: readonly Enemy[]
  readonly fx: ElementFx
  readonly particles: Particles
  readonly element: Element
  readonly maxHealth: number
  meleeDamage(): number
  robotScale(): number
  health(): number
  energy(): number
  aim(): { x: number; y: number } | null
  fighting(): boolean
  spend(amount: number): boolean
  damage(enemy: Enemy, base: number, strike: GadgetStrike): number
  smash(enemy: Enemy, amount: number, force: number, fromX: number, fromY: number): number
  drain(enemy: Enemy, amount: number, color: RGB): void
  popup(x: number, y: number, text: string, color: RGB, size: number): void
  cue(name: Cue, duration?: number): void
  shake(amount: number): void
  freeze(seconds: number): void
  flash(amount: number): void
  hud(): void
  heal(amount: number): void
  shield(seconds: number): void
  cleanse(): void
  soak(enemy: Enemy): void
  burn(enemy: Enemy): void
  dust(x: number, y: number, amount: number): void
  smoke(x: number, y: number, amount: number): void
  afterimage(color: RGB, life: number): void
  constrain(x: number, y: number, fromX: number, fromY: number): readonly [number, number]
  inside(x: number, y: number): boolean
}

export type GadgetView = {
  id: UpgradeId
  slot: 'chip' | 'mount'
  index: number
  level: number
  active: boolean
  cool: number
  ready: boolean
  running: boolean
  count: number | null
  cost: number
  state: string
}

export type VehicleArt = { tank: HTMLImageElement; car: HTMLImageElement }

export type GadgetTag = { text: string; color: RGB }

type DrawActor = { depth: number; draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number): void }

type Projectile = {
  kind: 'spear' | 'bomb' | 'missile'
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  angle: number
  age: number
  life: number
  power: number
  radius: number
  stagger: number
  burn: boolean
  hits: Set<number>
  clock: number
  seed: number
  landed: boolean
}

type Leak = { time: number; rate: number; slow: number; clock: number; drip: number }
type Daze = { time: number }
type Exposed = { time: number; total: number; bonus: number }
type Leap = { fromX: number; fromY: number; toX: number; toY: number; t: number; total: number; target: Enemy; clock: number }
type Laser = { time: number; total: number; angle: number; power: number; pierce: boolean; tick: number; shown: number; showClock: number; endX: number; endY: number; hit: boolean }
type Tank = { missiles: number; time: number; fire: number; ending: number }
type Car = { time: number; total: number; power: number; rehit: Map<number, number>; exhaust: number }
type Jet = { time: number; angle: number; tick: number; stunned: Set<number> }
type Punch = { time: number; total: number; target: Enemy }
type Qte = { sequence: QteDir[]; results: boolean[]; left: number; total: number }
type Pulse = { delay: number; run: () => void }

const T = TUNING
const GOLD: RGB = [255, 214, 110]
const TEAL: RGB = [126, 255, 224]
const AMBER: RGB = [255, 176, 72]
const FURY: RGB = [255, 138, 40]
const VIOLET: RGB = [200, 150, 255]
const WATER: RGB = [120, 214, 255]
const STEEL: RGB = [214, 222, 232]
const OIL: RGB = [58, 44, 34]
const SMOKE: RGB = [120, 112, 104]
const RESERVE: RGB = [130, 200, 255]
const GREY: RGB = [190, 196, 204]
const WHITE: RGB = [255, 248, 236]
const QTE_DIRS: readonly QteDir[] = ['up', 'down', 'left', 'right']
const SLOWMO = 0.18
const EAGLE_RANGE = 620
const PUNCH_RANGE = 320
const LASER_TURN = 4.2
const LASER_TICK = 0.1
const JET_TURN = 5
const MISSILE_SPEED = 860
const MISSILE_HOMING = 3.2
const MISSILE_FIRE = 0.42
const SPEAR_SPEED = 1700
const SPEAR_LIFE = 0.62
const LEAK_TICK = 0.5
const RAM_REACH = 92
const DENY_GAP = 0.6
const TEXEL = 4
const BASE_SCALE = 0.75

const FACING: Record<string, number> = {
  e: 0,
  se: Math.PI / 4,
  s: Math.PI / 2,
  sw: (3 * Math.PI) / 4,
  w: Math.PI,
  nw: (-3 * Math.PI) / 4,
  n: -Math.PI / 2,
  ne: -Math.PI / 4,
}

function turnToward(current: number, wanted: number, step: number) {
  let delta = wanted - current
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return current + Math.max(-step, Math.min(step, delta))
}

export class Gadgets {
  readonly loadout: GadgetLoadout
  readonly perks: Perks
  readonly barSize: number
  readonly reserveMax: number
  reserve: number
  fury = 0
  lift = 0
  private readonly host: GadgetHost
  private readonly slots = new Map<UpgradeId, GadgetSlot>()
  private readonly cooldowns = new Map<UpgradeId, number>()
  private readonly projectiles: Projectile[] = []
  private readonly leaks = new Map<Enemy, Leak>()
  private readonly dazed = new Map<Enemy, Daze>()
  private readonly exposed = new Map<Enemy, Exposed>()
  private readonly pulses: Pulse[] = []
  private visionCool = 0
  private eagleCharges: number
  private punchesLeft: number
  private tankUsed = false
  private leap: Leap | null = null
  private laser: Laser | null = null
  private tank: Tank | null = null
  private car: Car | null = null
  private jet: Jet | null = null
  private punch: Punch | null = null
  private qte: Qte | null = null
  private furyAnnounced = false
  private denyClock = 0
  private carFacing = 1
  private elapsed = 0
  private readonly drop = glowTexture(OIL, 24)
  private readonly spray = glowTexture(WATER, 28)
  private readonly mist = puffTexture(WATER, 1)
  private readonly ember = glowTexture(AMBER, 24)
  private readonly exhaust = [0, 1, 2].map((variant) => puffTexture(SMOKE, variant))

  constructor(loadout: GadgetLoadout | undefined, host: GadgetHost) {
    this.loadout = loadout ?? EMPTY_LOADOUT
    this.perks = this.loadout.perks
    this.host = host
    for (const slot of [...this.loadout.chips, ...this.loadout.mounts]) this.slots.set(slot.id, slot)
    this.barSize = Math.max(1, Math.round(host.maxHealth * T.saudavel.bar))
    this.reserveMax = this.barSize * this.perks.saudavel
    this.reserve = this.reserveMax
    this.eagleCharges = this.level('aguia') ? T.aguia.charges[this.level('aguia') - 1] : 0
    this.punchesLeft = this.level('supersoco') ? T.supersoco.uses[this.level('supersoco') - 1] : 0
  }

  level(id: UpgradeId): number {
    return this.slots.get(id)?.level ?? 0
  }

  get damageBonus() {
    return this.perks.forte ? T.forte.bonus[this.perks.forte - 1] : 0
  }

  get vehicle(): 'tank' | 'car' | null {
    if (this.tank) return 'tank'
    if (this.car) return 'car'
    return null
  }

  get steering() {
    return this.leap !== null || this.punch !== null
  }

  get blocksAttack() {
    return this.steering || this.laser !== null || this.car !== null || this.jet !== null || this.qte !== null
  }

  get blocksDodge() {
    return this.steering || this.laser !== null || this.vehicle !== null || this.qte !== null
  }

  get blocksCards() {
    return this.steering || this.laser !== null || this.vehicle !== null || this.qte !== null
  }

  get speedFactor() {
    if (this.car) return T.transformador.speed
    if (this.tank) return 0.8
    if (this.laser) return 0.45
    if (this.jet) return 0.6
    return 1
  }

  get armorFactor() {
    if (this.tank) return T.tanque.armor[this.level('tanque') - 1]
    if (this.car) return T.transformador.armor
    return 1
  }

  get steady() {
    return this.vehicle !== null || this.leap !== null
  }

  get slowmo() {
    return this.qte ? SLOWMO : 1
  }

  get qteView(): QteView | null {
    return this.qte
  }

  get furyReady() {
    return this.perks.imprevisivel > 0 && this.fury >= 100
  }

  comboWindow(fallback: number) {
    return this.perks.combo ? T.combo.window[this.perks.combo - 1] : fallback
  }

  comboFactor(combo: number) {
    return this.perks.combo ? 1 + T.combo.step[this.perks.combo - 1] * Math.max(0, combo - 1) : 1
  }

  comboBurst(combo: number) {
    return this.perks.combo ? T.combo.burst[this.perks.combo - 1] * combo : 0
  }

  backstab(enemy: Enemy) {
    const window = this.exposed.get(enemy)
    return window && window.time > 0 ? 1 + window.bonus : 1
  }

  tags(enemy: Enemy): GadgetTag[] {
    const tags: GadgetTag[] = []
    const window = this.exposed.get(enemy)
    if (window && window.time > 0) tags.push({ text: 'COSTAS', color: GOLD })
    if (this.leaks.has(enemy)) tags.push({ text: 'ÓLEO', color: AMBER })
    if (this.dazed.has(enemy)) tags.push({ text: 'CONF', color: VIOLET })
    return tags
  }

  absorb(amount: number): number {
    if (this.reserve <= 0 || amount <= 0) return amount
    const before = this.reserve
    const taken = Math.min(this.reserve, amount)
    this.reserve -= taken
    if (Math.ceil(before / this.barSize) > Math.ceil(this.reserve / this.barSize)) {
      const player = this.host.player
      const scale = this.host.robotScale()
      this.host.popup(player.x, player.y - 175 * scale, this.reserve > 0 ? 'Barra extra rompida' : 'Reserva esgotada', RESERVE, 0.85)
      this.host.fx.ring(player.x, player.y, 190, 0.45, RESERVE)
      this.host.fx.sparks(RESERVE, player.x, player.y, 70 * scale, 16, 420)
    }
    return amount - taken
  }

  evade(damage: number, heavy: boolean): boolean {
    const level = this.level('visao')
    if (!level || this.visionCool > 0 || this.vehicle) return false
    if (heavy || damage > this.host.maxHealth * T.visao.heavyShare) return false
    if (Math.random() >= T.visao.chance[level - 1]) return false
    this.visionCool = T.visao.cooldown[level - 1]
    const player = this.host.player
    const side = Math.random() < 0.5 ? -1 : 1
    this.host.afterimage(TEAL, 0.35)
    const [x, y] = this.host.constrain(player.x + side * 70, player.y + (Math.random() - 0.5) * 30, player.x, player.y)
    player.x = x
    player.y = y
    this.host.shield(0.25)
    this.host.popup(player.x, player.y - 150 * this.host.robotScale(), 'Visão!', TEAL, 0.95)
    this.host.fx.ring(player.x, player.y, 140, 0.35, TEAL)
    this.host.cue('dodge')
    this.host.hud()
    return true
  }

  onHit(enemy: Enemy, dealt: number, quiet: boolean) {
    const level = this.level('ferida')
    if (level && enemy.alive && dealt > 0) {
      const leak = this.leaks.get(enemy)
      if (leak) leak.time = T.ferida.duration
      else {
        const rate = T.ferida.rate[level - 1] * (enemy.isBoss ? T.ferida.bossShare : 1)
        this.leaks.set(enemy, { time: T.ferida.duration, rate, slow: T.ferida.slow[level - 1], clock: LEAK_TICK, drip: 0 })
        this.host.popup(enemy.x - 30, enemy.y - 140 * this.host.robotScale() * enemy.scale, 'Vazando', AMBER, 0.7)
      }
    }
    if (dealt > 0) this.gainFury(quiet ? 0.25 : 1)
  }

  onHurt(amount: number) {
    if (amount > 0) this.gainFury(1.5)
    const level = this.level('tanque')
    if (!level || this.tankUsed || !this.host.fighting()) return
    const health = this.host.health()
    if (health <= 0 || health > this.host.maxHealth * T.tanque.trigger) return
    this.becomeTank(level)
  }

  enemyMiss(enemy: Enemy) {
    if (!this.dazed.has(enemy) || Math.random() >= T.uivo.miss) return false
    this.host.popup(enemy.x, enemy.y - 130 * this.host.robotScale() * enemy.scale, 'Confuso!', VIOLET, 0.8)
    return true
  }

  trigger(id: UpgradeId): boolean {
    const level = this.level(id)
    if (!level) return false
    const def = upgradeDef(id)
    if (def.kind !== 'active' || !this.host.fighting()) return false
    if (this.qte || this.steering) return true
    if ((id === 'laser' && this.laser) || (id === 'lavajato' && this.jet) || (id === 'transformador' && this.car)) return true
    if ((this.cooldowns.get(id) ?? 0) > 0) return this.deny('Recarregando')
    if (id === 'aguia' && this.eagleCharges <= 0) return this.deny('Sem saltos')
    if (id === 'supersoco' && this.punchesLeft <= 0) return this.deny('Já usado')
    if (this.vehicle && id !== 'supersoco') return this.deny('Modo veículo')
    const target = id === 'aguia' ? this.nearest(EAGLE_RANGE) : id === 'supersoco' ? this.nearest(PUNCH_RANGE) : null
    if ((id === 'aguia' || id === 'supersoco') && !target) return this.deny('Sem alvo perto')
    if (def.energy > 0 && !this.host.spend(def.energy)) return this.deny('Sem energia')
    switch (id) {
      case 'aguia':
        if (target) this.startLeap(target)
        break
      case 'laser':
        this.startLaser(level)
        break
      case 'supersoco':
        if (target) this.startPunch(target)
        break
      case 'uivo':
        this.howl(level)
        break
      case 'lanca':
        this.throwSpears(level)
        break
      case 'minibomba':
        this.throwBombs(level)
        break
      case 'transformador':
        this.startCar(level)
        break
      case 'lavajato':
        this.startJet()
        break
    }
    this.host.hud()
    return true
  }

  fire(): boolean {
    const tank = this.tank
    if (!tank) return false
    if (tank.fire > 0 || tank.missiles <= 0) return true
    const player = this.host.player
    const angle = this.aimAngle()
    const scale = this.host.robotScale()
    this.projectiles.push({
      kind: 'missile',
      x: player.x + Math.cos(angle) * 60 * scale,
      y: player.y + Math.sin(angle) * 30 * scale,
      z: 64 * scale,
      vx: Math.cos(angle) * MISSILE_SPEED,
      vy: Math.sin(angle) * MISSILE_SPEED,
      vz: 0,
      angle,
      age: 0,
      life: 1.7,
      power: T.tanque.power[this.level('tanque') - 1],
      radius: T.tanque.blast,
      stagger: 0.5,
      burn: false,
      hits: new Set(),
      clock: 0,
      seed: Math.random(),
      landed: false,
    })
    tank.missiles -= 1
    tank.fire = MISSILE_FIRE
    this.host.fx.muzzle('fogo', player.x + Math.cos(angle) * 70 * scale, player.y + Math.sin(angle) * 30 * scale, 70 * scale, angle, 1.4)
    this.host.cue('shoot')
    this.host.shake(0.3)
    player.facing = directionFromVector(Math.cos(angle), Math.sin(angle), player.facing, 0)
    if (tank.missiles <= 0) tank.ending = 0.9
    this.host.hud()
    return true
  }

  startFury(): boolean {
    if (!this.perks.imprevisivel || !this.host.fighting() || this.qte) return false
    if (this.fury < 100) return this.deny('Fúria incompleta')
    const level = this.perks.imprevisivel
    const length = T.imprevisivel.length[level - 1]
    const sequence: QteDir[] = []
    for (let index = 0; index < length; index++) {
      let next = QTE_DIRS[Math.floor(Math.random() * QTE_DIRS.length)]
      if (index > 0 && next === sequence[index - 1] && Math.random() < 0.6) next = QTE_DIRS[(QTE_DIRS.indexOf(next) + 1 + Math.floor(Math.random() * 3)) % QTE_DIRS.length]
      sequence.push(next)
    }
    const total = T.imprevisivel.time[level - 1]
    this.qte = { sequence, results: [], left: total, total }
    this.laser = null
    this.jet = null
    const player = this.host.player
    const scale = this.host.robotScale()
    this.host.popup(player.x, player.y - 180 * scale, 'IMPREVISÍVEL!', FURY, 1.25)
    this.host.fx.ring(player.x, player.y, 320, 0.6, FURY)
    this.host.fx.sparks(FURY, player.x, player.y, 70 * scale, 26, 520)
    this.host.flash(0.25)
    this.host.cue('transform')
    this.host.shake(0.4)
    this.host.hud()
    return true
  }

  press(dir: QteDir) {
    const qte = this.qte
    if (!qte) return
    if (qte.results.length >= qte.sequence.length) return
    const right = qte.sequence[qte.results.length] === dir
    qte.results.push(right)
    const last = qte.results.length >= qte.sequence.length
    if (right) this.autoStrike(last)
    else {
      this.host.cue('deny')
      this.host.popup(this.host.player.x, this.host.player.y - 150 * this.host.robotScale(), 'Errou a sequência', GREY, 0.75)
    }
    if (last) this.finishFury()
    this.host.hud()
  }

  halt() {
    this.leap = null
    this.laser = null
    this.jet = null
    this.punch = null
    this.qte = null
    this.lift = 0
    this.car = null
    this.tank = null
    this.projectiles.length = 0
    this.pulses.length = 0
  }

  clear() {
    this.halt()
    this.leaks.clear()
    this.dazed.clear()
    this.exposed.clear()
    for (const enemy of this.host.enemies) enemy.speedFactor = 1
  }

  views(): GadgetView[] {
    return [...this.loadout.chips, ...this.loadout.mounts].map((slot) => {
      const def = upgradeDef(slot.id)
      const cool = this.cooldowns.get(slot.id) ?? 0
      const total = def.cooldown[slot.level - 1] || 1
      let count: number | null = null
      let running = false
      let state = ''
      let ready = cool <= 0
      let sweep = Math.min(1, cool / total)
      switch (slot.id) {
        case 'visao':
          ready = this.visionCool <= 0
          sweep = Math.min(1, this.visionCool / T.visao.cooldown[slot.level - 1])
          state = ready ? 'ATIVO' : `${Math.ceil(this.visionCool)}s`
          break
        case 'ferida':
          ready = true
          sweep = 0
          state = this.leaks.size ? `${this.leaks.size}× VAZANDO` : 'ATIVO'
          break
        case 'tanque':
          running = this.tank !== null
          count = this.tank ? this.tank.missiles : null
          ready = !this.tankUsed
          sweep = this.tankUsed && !this.tank ? 1 : 0
          state = this.tank ? `${this.tank.missiles} MÍSSEIS` : this.tankUsed ? 'USADO' : `< ${Math.round(T.tanque.trigger * 100)}%`
          break
        case 'aguia':
          count = this.eagleCharges
          ready = ready && this.eagleCharges > 0
          if (this.eagleCharges <= 0) sweep = 1
          break
        case 'supersoco':
          count = this.punchesLeft
          ready = this.punchesLeft > 0 && !this.punch
          sweep = this.punchesLeft > 0 ? 0 : 1
          break
        case 'laser':
          running = this.laser !== null
          if (this.laser) sweep = 1 - this.laser.time / this.laser.total
          break
        case 'transformador':
          running = this.car !== null
          if (this.car) sweep = 1 - this.car.time / this.car.total
          break
        case 'lavajato':
          running = this.jet !== null
          break
      }
      if (def.kind === 'active') {
        const starved = def.energy > 0 && this.host.energy() < def.energy
        if (!state) state = running ? 'ATIVO' : cool > 0 ? `${Math.ceil(cool)}s` : count === 0 ? 'USADO' : starved ? `${def.energy} EN` : 'PRONTO'
        if (starved && !running) ready = false
      }
      return { id: slot.id, slot: slot.slot, index: slot.index, level: slot.level, active: def.kind === 'active', cool: sweep, ready, running, count, cost: def.energy, state }
    })
  }

  update(dt: number, realDt: number) {
    this.elapsed += dt
    this.denyClock = Math.max(0, this.denyClock - realDt)
    this.visionCool = Math.max(0, this.visionCool - dt)
    for (const [id, seconds] of this.cooldowns) if (seconds > 0) this.cooldowns.set(id, Math.max(0, seconds - dt))
    for (let index = this.pulses.length - 1; index >= 0; index--) {
      const pulse = this.pulses[index]
      pulse.delay -= dt
      if (pulse.delay > 0) continue
      this.pulses.splice(index, 1)
      pulse.run()
    }
    this.stepQte(realDt)
    this.stepLeap(dt)
    this.stepPunch(dt)
    this.stepLaser(dt)
    this.stepJet(dt)
    this.stepTank(dt)
    this.stepCar(dt)
    this.stepProjectiles(dt)
    this.stepMarks(dt)
  }

  private deny(text: string): boolean {
    if (this.denyClock > 0) return true
    this.denyClock = DENY_GAP
    const player = this.host.player
    this.host.cue('deny')
    this.host.popup(player.x, player.y - 130 * this.host.robotScale(), text, GREY, 0.75)
    return true
  }

  private gainFury(weight: number) {
    const level = this.perks.imprevisivel
    if (!level || this.qte) return
    this.fury = Math.min(100, this.fury + (100 / T.imprevisivel.fill[level - 1]) * weight)
    if (this.fury < 100 || this.furyAnnounced) return
    this.furyAnnounced = true
    const player = this.host.player
    this.host.popup(player.x, player.y - 170 * this.host.robotScale(), 'Fúria pronta!', FURY, 1)
    this.host.fx.ring(player.x, player.y, 220, 0.5, FURY)
    this.host.cue('ready')
  }

  private nearest(range: number): Enemy | null {
    const player = this.host.player
    const aim = this.host.aim()
    let best: Enemy | null = null
    let score = Infinity
    for (const enemy of this.host.enemies) {
      if (!enemy.vulnerable) continue
      const distance = Math.hypot(enemy.x - player.x, (enemy.y - player.y) * 1.2)
      if (distance > range) continue
      const bias = aim ? Math.hypot(enemy.x - aim.x, enemy.y - aim.y) * 0.5 : 0
      if (distance + bias < score) {
        score = distance + bias
        best = enemy
      }
    }
    return best
  }

  private aimAngle(): number {
    const player = this.host.player
    const aim = this.host.aim()
    if (aim) return Math.atan2(aim.y - player.y, aim.x - player.x)
    const target = this.nearest(1400)
    if (target) return Math.atan2(target.y - player.y, target.x - player.x)
    return FACING[player.facing] ?? Math.PI / 2
  }

  private cool(id: UpgradeId) {
    const seconds = upgradeDef(id).cooldown[this.level(id) - 1] ?? 0
    if (seconds > 0) this.cooldowns.set(id, seconds)
  }

  private startLeap(target: Enemy) {
    const player = this.host.player
    const dx = target.x - player.x
    const dy = target.y - player.y
    const length = Math.hypot(dx, dy) || 1
    const beyond = ((70 + 46 * target.scale) * this.host.robotScale()) / BASE_SCALE
    const [toX, toY] = this.host.constrain(target.x + (dx / length) * beyond, target.y + (dy / length) * beyond * 0.7, target.x, target.y)
    this.leap = { fromX: player.x, fromY: player.y, toX, toY, t: 0, total: 0.44, target, clock: 0 }
    this.eagleCharges -= 1
    this.cooldowns.set('aguia', T.aguia.rest)
    this.host.shield(0.6)
    this.host.dust(player.x, player.y, 1)
    this.host.cue('dodge')
    this.host.popup(player.x, player.y - 150 * this.host.robotScale(), 'Águia!', GOLD, 0.9)
  }

  private stepLeap(dt: number) {
    const leap = this.leap
    if (!leap) {
      this.lift = Math.max(0, this.lift - dt * 6)
      return
    }
    leap.t = Math.min(leap.total, leap.t + dt)
    const p = leap.t / leap.total
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    const player = this.host.player
    player.x = leap.fromX + (leap.toX - leap.fromX) * eased
    player.y = leap.fromY + (leap.toY - leap.fromY) * eased
    player.moving = true
    this.lift = Math.sin(Math.PI * p)
    leap.clock -= dt
    if (leap.clock <= 0) {
      leap.clock = 0.03
      this.host.afterimage(GOLD, 0.3)
    }
    if (p < 1) return
    this.leap = null
    player.moving = false
    const target = leap.target
    player.facing = directionFromVector(target.x - player.x, target.y - player.y, player.facing, 0)
    this.host.dust(player.x, player.y, 1.4)
    this.host.shake(0.35)
    this.host.cue('heavy')
    this.host.fx.ring(player.x, player.y, 200, 0.4, GOLD)
    if (!target.alive) return
    target.stagger(T.aguia.stagger)
    const level = this.level('aguia')
    const window = T.aguia.window[level - 1]
    this.exposed.set(target, { time: window, total: window, bonus: T.aguia.bonus[level - 1] })
    const scale = this.host.robotScale()
    this.host.popup(target.x, target.y - 160 * scale * target.scale, 'Pelas costas!', GOLD, 1.05)
    this.host.fx.sparks(GOLD, target.x, target.y, 70 * scale * target.scale, 16, 420)
  }

  private startPunch(target: Enemy) {
    const player = this.host.player
    this.punch = { time: 0.34, total: 0.34, target }
    this.host.shield(0.45)
    player.facing = directionFromVector(target.x - player.x, target.y - player.y, player.facing, 0)
    this.host.cue('charge', 0.34)
    this.host.popup(player.x, player.y - 160 * this.host.robotScale(), 'Super-soco!', GOLD, 1)
  }

  private stepPunch(dt: number) {
    const punch = this.punch
    if (!punch) return
    const player = this.host.player
    const target = punch.target
    const scale = this.host.robotScale()
    punch.time -= dt
    if (Math.random() < dt * 40) this.host.fx.aura(GOLD, player.x, player.y, 110 * scale, 1.2)
    if (target.alive) {
      const dx = target.x - player.x
      const dy = target.y - player.y
      const distance = Math.hypot(dx, dy)
      const reach = ((80 + 30 * target.scale) * scale) / BASE_SCALE
      if (distance > reach) {
        const step = Math.min(distance - reach, 1400 * dt)
        const [x, y] = this.host.constrain(player.x + (dx / distance) * step, player.y + (dy / distance) * step, player.x, player.y)
        player.x = x
        player.y = y
        player.moving = true
      }
      player.facing = directionFromVector(dx, dy, player.facing, 0)
    }
    if (punch.time > 0) return
    this.punch = null
    player.moving = false
    this.punchesLeft -= 1
    this.host.hud()
    if (!target.alive) return
    const level = this.level('supersoco')
    const share = target.isBoss ? T.supersoco.bossShare[level - 1] : T.supersoco.share
    const dealt = this.host.smash(target, Math.max(1, Math.round(target.maxHealth * share)), 1150, player.x, player.y)
    if (dealt <= 0) return
    this.host.popup(target.x, target.y - 190 * scale * target.scale, 'SUPER-SOCO!', GOLD, 1.5)
    this.host.fx.shockwave(this.host.element, target.x, target.y, 260)
    this.host.fx.ring(target.x, target.y, 320, 0.55, GOLD)
    this.host.fx.sparks(GOLD, target.x, target.y, 70 * scale * target.scale, 30, 640)
    this.host.dust(target.x, target.y, 2)
    this.host.freeze(0.28)
    this.host.shake(1)
    this.host.flash(0.35)
    this.host.cue('heavy')
    this.host.cue('super')
    const splash = T.supersoco.splash[level - 1]
    if (!splash) return
    for (const enemy of this.host.enemies) {
      if (enemy === target || !enemy.vulnerable) continue
      if (Math.hypot(enemy.x - target.x, (enemy.y - target.y) * 1.4) > 280) continue
      this.host.smash(enemy, Math.max(1, Math.round(enemy.maxHealth * (enemy.isBoss ? T.supersoco.bossSplash : splash))), 700, target.x, target.y)
      if (enemy.alive) enemy.stagger(0.6)
    }
  }

  private startLaser(level: number) {
    const duration = T.laser.duration[level - 1]
    const player = this.host.player
    this.laser = { time: duration, total: duration, angle: this.aimAngle(), power: T.laser.power[level - 1], pierce: T.laser.pierce[level - 1], tick: 0, shown: 0, showClock: 0.35, endX: player.x, endY: player.y, hit: false }
    this.host.cue('charge', 0.4)
    this.host.cue('thunder')
    this.host.popup(player.x, player.y - 160 * this.host.robotScale(), 'Laser!', ELEMENTS[this.host.element].glow, 0.95)
  }

  private stepLaser(dt: number) {
    const laser = this.laser
    if (!laser) return
    const player = this.host.player
    const scale = this.host.robotScale()
    laser.angle = turnToward(laser.angle, this.aimAngle(), LASER_TURN * dt)
    player.facing = directionFromVector(Math.cos(laser.angle), Math.sin(laser.angle), player.facing, 0.05)
    const cos = Math.cos(laser.angle)
    const sin = Math.sin(laser.angle)
    let length: number = T.laser.range
    for (let step = 40; step <= T.laser.range; step += 40) {
      if (this.host.inside(player.x + cos * step, player.y + sin * step)) continue
      length = step
      break
    }
    const hits: { enemy: Enemy; along: number }[] = []
    for (const enemy of this.host.enemies) {
      if (!enemy.vulnerable) continue
      const ex = enemy.x - player.x
      const ey = enemy.y - player.y
      const along = ex * cos + ey * sin
      if (along < 0 || along > length) continue
      if (Math.abs(-ex * sin + ey * cos) > ((38 + 26 * enemy.scale) * scale) / BASE_SCALE) continue
      hits.push({ enemy, along })
    }
    hits.sort((a, b) => a.along - b.along)
    const struck = laser.pierce ? hits : hits.slice(0, 1)
    if (!laser.pierce && struck.length) length = struck[0].along
    laser.endX = player.x + cos * length
    laser.endY = player.y + sin * length
    laser.hit = struck.length > 0
    laser.tick -= dt
    if (laser.tick <= 0) {
      laser.tick += LASER_TICK
      const base = this.host.meleeDamage() * laser.power * LASER_TICK
      for (const { enemy } of struck) laser.shown += this.host.damage(enemy, base, { force: 60, quiet: true, ailment: 0.04, fromX: player.x, fromY: player.y })
    }
    if (laser.hit && Math.random() < dt * 30) this.host.fx.sparks(ELEMENTS[this.host.element].glow, laser.endX, laser.endY, 58 * scale, 3, 300)
    laser.showClock -= dt
    if (laser.showClock <= 0) {
      laser.showClock = 0.35
      if (laser.shown > 0) {
        this.host.popup(laser.endX, laser.endY - 120 * scale, `${Math.round(laser.shown)}`, ELEMENTS[this.host.element].glow, 0.95)
        this.host.cue('hit')
      }
      laser.shown = 0
    }
    laser.time -= dt
    if (laser.time > 0) return
    this.laser = null
    this.cool('laser')
    this.host.fx.puff(this.host.element, player.x, player.y, 0.6)
    this.host.hud()
  }

  private howl(level: number) {
    const player = this.host.player
    const scale = this.host.robotScale()
    const radius = T.uivo.radius
    const originX = player.x
    const originY = player.y
    this.cool('uivo')
    for (let wave = 0; wave < 3; wave++) {
      this.pulses.push({
        delay: wave * 0.14,
        run: () => {
          this.host.fx.ring(originX, originY, radius * (0.6 + wave * 0.25), 0.55, wave === 1 ? TEAL : VIOLET)
          this.host.fx.shockwave('vento', originX, originY, radius * (0.5 + wave * 0.25))
        },
      })
    }
    this.host.fx.sparks(VIOLET, player.x, player.y, 90 * scale, 24, 520)
    this.host.cue('shadow')
    this.host.cue('warp')
    this.host.shake(0.5)
    this.host.popup(player.x, player.y - 180 * scale, 'AUUUUU!', VIOLET, 1.2)
    let caught = 0
    for (const enemy of this.host.enemies) {
      if (!enemy.vulnerable) continue
      if (Math.hypot(enemy.x - player.x, (enemy.y - player.y) * 1.4) > radius) continue
      caught++
      enemy.interrupt()
      enemy.stagger(T.uivo.stun[level - 1] * (enemy.isBoss ? T.uivo.bossStun : 1))
      this.dazed.set(enemy, { time: T.uivo.confusion * (enemy.isBoss ? T.uivo.bossConfusion : 1) })
      this.host.popup(enemy.x, enemy.y - 150 * scale * enemy.scale, '?!', VIOLET, 1.1)
    }
    if (!caught) this.host.popup(player.x, player.y - 140 * scale, 'Ninguém por perto', GREY, 0.7)
  }

  private throwSpears(level: number) {
    const player = this.host.player
    const scale = this.host.robotScale()
    const base = this.aimAngle()
    const angles = T.lanca.spears[level - 1] > 1 ? [base - 0.11, base + 0.11] : [base]
    this.cool('lanca')
    for (const angle of angles) {
      this.projectiles.push({
        kind: 'spear',
        x: player.x + Math.cos(angle) * 40 * scale,
        y: player.y + Math.sin(angle) * 24 * scale,
        z: 58 * scale,
        vx: Math.cos(angle) * SPEAR_SPEED,
        vy: Math.sin(angle) * SPEAR_SPEED,
        vz: 0,
        angle,
        age: 0,
        life: SPEAR_LIFE,
        power: T.lanca.power[level - 1],
        radius: 0,
        stagger: T.lanca.stagger[level - 1],
        burn: false,
        hits: new Set(),
        clock: 0,
        seed: Math.random(),
        landed: false,
      })
    }
    player.facing = directionFromVector(Math.cos(base), Math.sin(base), player.facing, 0)
    this.host.fx.muzzle(this.host.element, player.x + Math.cos(base) * 46 * scale, player.y + Math.sin(base) * 20 * scale, 58 * scale, base, 1.3)
    this.host.cue('shoot')
    this.host.shake(0.25)
  }

  private throwBombs(level: number) {
    const player = this.host.player
    const scale = this.host.robotScale()
    const base = this.aimAngle()
    const count: number = T.minibomba.bombs[level - 1]
    const spread = count > 3 ? 1.2 : 0.8
    this.cool('minibomba')
    for (let index = 0; index < count; index++) {
      const angle = base + (count === 1 ? 0 : (index / (count - 1) - 0.5) * spread)
      const speed = 430 + Math.random() * 160
      this.projectiles.push({
        kind: 'bomb',
        x: player.x + Math.cos(angle) * 30 * scale,
        y: player.y + Math.sin(angle) * 18 * scale,
        z: 66 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.8,
        vz: 360 + Math.random() * 140,
        angle,
        age: 0,
        life: 0.95 + T.minibomba.fuse * (index % 3) * 0.3 + Math.random() * 0.12,
        power: T.minibomba.power[level - 1],
        radius: T.minibomba.radius[level - 1],
        stagger: 0,
        burn: T.minibomba.burn[level - 1],
        hits: new Set(),
        clock: 0,
        seed: Math.random(),
        landed: false,
      })
    }
    this.host.cue('shoot')
    this.host.fx.puff('fogo', player.x + Math.cos(base) * 30, player.y + Math.sin(base) * 16, 0.5)
  }

  private startCar(level: number) {
    const duration = T.transformador.duration[level - 1]
    this.car = { time: duration, total: duration, power: T.transformador.power[level - 1], rehit: new Map(), exhaust: 0 }
    this.laser = null
    this.jet = null
    const player = this.host.player
    const scale = this.host.robotScale()
    this.carFacing = Math.cos(FACING[player.facing] ?? 0) < -0.1 ? -1 : 1
    this.host.fx.ring(player.x, player.y, 220, 0.45, AMBER)
    this.host.fx.sparks(AMBER, player.x, player.y, 60 * scale, 20, 460)
    this.host.smoke(player.x, player.y, 0.8)
    this.host.flash(0.2)
    this.host.cue('transform')
    this.host.popup(player.x, player.y - 160 * scale, 'Transformar!', AMBER, 1)
  }

  private stepCar(dt: number) {
    const car = this.car
    if (!car) return
    const player = this.host.player
    const scale = this.host.robotScale()
    const heading = Math.cos(FACING[player.facing] ?? 0)
    if (heading > 0.2) this.carFacing = 1
    else if (heading < -0.2) this.carFacing = -1
    for (const [id, seconds] of car.rehit) car.rehit.set(id, seconds - dt)
    if (player.moving) {
      for (const enemy of this.host.enemies) {
        if (!enemy.vulnerable || (car.rehit.get(enemy.id) ?? 0) > 0) continue
        if (Math.hypot(enemy.x - player.x, (enemy.y - player.y) / 0.7) > ((RAM_REACH + 30 * enemy.scale) * scale) / BASE_SCALE) continue
        car.rehit.set(enemy.id, T.transformador.rehit)
        const dealt = this.host.damage(enemy, this.host.meleeDamage() * car.power, { force: 980, heavy: true, ailment: 0.2, fromX: player.x, fromY: player.y })
        if (dealt <= 0) continue
        if (enemy.alive) enemy.stagger(0.45)
        this.host.popup(enemy.x, enemy.y - 175 * scale * enemy.scale, 'Atropelado!', AMBER, 0.85)
        this.host.dust(enemy.x, enemy.y, 1.2)
      }
      car.exhaust -= dt
      if (car.exhaust <= 0) {
        car.exhaust = 0.05
        this.host.particles.spawn({
          x: player.x - this.carFacing * 64 * scale,
          y: player.y - 2,
          z: 18 * scale,
          vx: -this.carFacing * (60 + Math.random() * 40),
          rise: 40,
          life: 0.55,
          size: 22,
          sizeEnd: 70,
          alpha: 0.4,
          fadeIn: 0.03,
          sprite: this.exhaust[Math.floor(Math.random() * this.exhaust.length)],
          blend: 'haze',
        })
      }
    }
    car.time -= dt
    if (car.time <= 0) this.endCar()
  }

  private endCar() {
    if (!this.car) return
    this.car = null
    this.cool('transformador')
    const player = this.host.player
    this.host.smoke(player.x, player.y, 0.9)
    this.host.fx.ring(player.x, player.y, 180, 0.4, AMBER)
    this.host.cue('transform')
    this.host.hud()
  }

  private becomeTank(level: number) {
    this.tankUsed = true
    this.laser = null
    this.jet = null
    if (this.car) this.endCar()
    this.tank = { missiles: T.tanque.missiles[level - 1], time: T.tanque.limit, fire: 0.3, ending: 0 }
    const heal = T.tanque.heal[level - 1]
    if (heal > 0) this.host.heal(Math.round(this.host.maxHealth * heal))
    const player = this.host.player
    const scale = this.host.robotScale()
    this.host.shield(0.8)
    this.host.freeze(0.32)
    this.host.flash(0.4)
    this.host.shake(0.7)
    this.host.cue('transform')
    this.host.cue('heavy')
    this.host.fx.shockwave('terra', player.x, player.y, 260)
    this.host.fx.ring(player.x, player.y, 340, 0.6, GOLD)
    this.host.fx.sparks(GOLD, player.x, player.y, 70 * scale, 30, 560)
    this.host.smoke(player.x, player.y, 1.4)
    this.host.popup(player.x, player.y - 190 * scale, 'MODO TANQUE!', GOLD, 1.3)
    this.host.hud()
  }

  private stepTank(dt: number) {
    const tank = this.tank
    if (!tank) return
    tank.fire = Math.max(0, tank.fire - dt)
    tank.time -= dt
    if (tank.ending > 0) {
      tank.ending -= dt
      if (tank.ending <= 0) this.endTank()
      return
    }
    if (tank.time <= 0) this.endTank()
  }

  private endTank() {
    if (!this.tank) return
    this.tank = null
    const player = this.host.player
    this.host.smoke(player.x, player.y, 1.2)
    this.host.fx.puff('terra', player.x, player.y, 1)
    this.host.fx.ring(player.x, player.y, 200, 0.45, GOLD)
    this.host.popup(player.x, player.y - 160 * this.host.robotScale(), 'De volta ao robô', GREY, 0.8)
    this.host.cue('transform')
    this.host.hud()
  }

  private startJet() {
    const player = this.host.player
    this.jet = { time: T.lavajato.duration, angle: this.aimAngle(), tick: 0, stunned: new Set() }
    this.host.cleanse()
    this.host.cue('water')
    this.host.popup(player.x, player.y - 160 * this.host.robotScale(), 'Lava-Jato!', WATER, 0.95)
  }

  private stepJet(dt: number) {
    const jet = this.jet
    if (!jet) return
    const player = this.host.player
    const scale = this.host.robotScale()
    jet.angle = turnToward(jet.angle, this.aimAngle(), JET_TURN * dt)
    player.facing = directionFromVector(Math.cos(jet.angle), Math.sin(jet.angle), player.facing, 0.05)
    const originX = player.x + Math.cos(jet.angle) * 40 * scale
    const originY = player.y + Math.sin(jet.angle) * 20 * scale
    for (let index = 0; index < 5; index++) {
      const angle = jet.angle + (Math.random() - 0.5) * T.lavajato.cone * 1.4
      const speed = 820 + Math.random() * 420
      this.host.particles.spawn({
        x: originX,
        y: originY,
        z: 54 * scale,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 60 + Math.random() * 80,
        gravity: 700,
        life: 0.32 + Math.random() * 0.12,
        size: 20 + Math.random() * 12,
        sizeEnd: 8,
        alpha: 0.9,
        fadeIn: 0.02,
        sprite: this.spray,
        blend: 'add',
      })
    }
    if (Math.random() < dt * 14) {
      const reach = T.lavajato.range * (0.5 + Math.random() * 0.5)
      this.host.particles.spawn({
        x: player.x + Math.cos(jet.angle) * reach,
        y: player.y + Math.sin(jet.angle) * reach,
        vx: Math.cos(jet.angle) * 60,
        vy: Math.sin(jet.angle) * 30,
        rise: 30,
        life: 0.6,
        size: 50,
        sizeEnd: 140,
        alpha: 0.4,
        fadeIn: 0.05,
        sprite: this.mist,
        blend: 'haze',
      })
    }
    jet.tick -= dt
    if (jet.tick <= 0) {
      jet.tick += T.lavajato.tick
      const level = this.level('lavajato')
      for (const enemy of this.host.enemies) {
        if (!enemy.vulnerable) continue
        const ex = enemy.x - player.x
        const ey = enemy.y - player.y
        if (Math.hypot(ex, ey) > T.lavajato.range + 30 * enemy.scale) continue
        let diff = Math.abs(Math.atan2(ey, ex) - jet.angle) % (Math.PI * 2)
        if (diff > Math.PI) diff = Math.PI * 2 - diff
        if (diff > T.lavajato.cone + 0.15) continue
        this.host.damage(enemy, this.host.meleeDamage() * T.lavajato.power, { force: 120, quiet: true, element: 'agua', fromX: player.x, fromY: player.y })
        this.host.soak(enemy)
        if (jet.stunned.has(enemy.id) || !enemy.alive) continue
        jet.stunned.add(enemy.id)
        enemy.interrupt()
        enemy.stagger(T.lavajato.stun[level - 1] * (enemy.isBoss ? 0.5 : 1))
        this.host.popup(enemy.x, enemy.y - 160 * scale * enemy.scale, 'Pane!', WATER, 1)
        this.host.fx.sparks(ELEMENTS.raio.glow, enemy.x, enemy.y, 70 * scale * enemy.scale, 10, 360)
      }
    }
    jet.time -= dt
    if (jet.time > 0) return
    this.jet = null
    this.cool('lavajato')
    this.host.hud()
  }

  private stepProjectiles(dt: number) {
    const scale = this.host.robotScale()
    for (let index = this.projectiles.length - 1; index >= 0; index--) {
      const shot = this.projectiles[index]
      shot.age += dt
      if (shot.kind === 'spear') {
        shot.x += shot.vx * dt
        shot.y += shot.vy * dt
        const spent = shot.age >= shot.life || !this.host.inside(shot.x, shot.y)
        if (!spent) {
          for (const enemy of this.host.enemies) {
            if (!enemy.vulnerable || shot.hits.has(enemy.id)) continue
            if (Math.hypot(enemy.x - shot.x, (enemy.y - shot.y) / 0.8) > ((46 * enemy.scale + 26) * scale) / BASE_SCALE) continue
            shot.hits.add(enemy.id)
            const dealt = this.host.damage(enemy, this.host.meleeDamage() * shot.power, { force: 820, heavy: true, ailment: 0.35, fromX: shot.x - shot.vx * 0.05, fromY: shot.y - shot.vy * 0.05 })
            if (dealt <= 0 || shot.stagger <= 0 || !enemy.alive) continue
            enemy.stagger(shot.stagger)
            this.host.popup(enemy.x + 30, enemy.y - 130 * scale * enemy.scale, 'Empalado', STEEL, 0.75)
          }
        }
        shot.clock -= dt
        if (shot.clock <= 0) {
          shot.clock = 0.02
          this.host.particles.spawn({ x: shot.x, y: shot.y, z: shot.z, life: 0.18, size: 18, sizeEnd: 4, alpha: 0.7, fadeIn: 0, sprite: this.ember, blend: 'add' })
        }
        if (spent) {
          this.host.fx.sparks(STEEL, shot.x, shot.y, shot.z, 8, 300)
          this.projectiles.splice(index, 1)
        }
        continue
      }
      if (shot.kind === 'missile') {
        let best: Enemy | null = null
        let bestDistance = 900
        for (const enemy of this.host.enemies) {
          if (!enemy.vulnerable) continue
          const distance = Math.hypot(enemy.x - shot.x, enemy.y - shot.y)
          if (distance >= bestDistance) continue
          bestDistance = distance
          best = enemy
        }
        if (best) {
          shot.angle = turnToward(shot.angle, Math.atan2(best.y - shot.y, best.x - shot.x), MISSILE_HOMING * dt)
          shot.vx = Math.cos(shot.angle) * MISSILE_SPEED
          shot.vy = Math.sin(shot.angle) * MISSILE_SPEED
        }
        shot.x += shot.vx * dt
        shot.y += shot.vy * dt
        shot.clock -= dt
        if (shot.clock <= 0) {
          shot.clock = 0.025
          this.host.particles.spawn({ x: shot.x - shot.vx * 0.02, y: shot.y - shot.vy * 0.02, z: shot.z, vx: (Math.random() - 0.5) * 40, rise: 30, life: 0.5, size: 24, sizeEnd: 60, alpha: 0.4, fadeIn: 0.02, sprite: this.exhaust[Math.floor(shot.seed * 3) % 3], blend: 'haze' })
          this.host.particles.spawn({ x: shot.x, y: shot.y, z: shot.z, life: 0.14, size: 30, sizeEnd: 8, alpha: 0.9, fadeIn: 0, sprite: this.ember, blend: 'add' })
        }
        let boom = shot.age >= shot.life || !this.host.inside(shot.x, shot.y)
        if (!boom) {
          for (const enemy of this.host.enemies) {
            if (!enemy.vulnerable) continue
            if (Math.hypot(enemy.x - shot.x, (enemy.y - shot.y) / 0.8) > ((44 * enemy.scale + 20) * scale) / BASE_SCALE) continue
            boom = true
            break
          }
        }
        if (boom) {
          this.explode(shot.x, shot.y, shot.radius, shot.power, false, 1.4)
          this.projectiles.splice(index, 1)
        }
        continue
      }
      shot.x += shot.vx * dt
      shot.y += shot.vy * dt
      shot.vz -= 1500 * dt
      shot.z += shot.vz * dt
      if (!this.host.inside(shot.x, shot.y)) {
        shot.x -= shot.vx * dt
        shot.y -= shot.vy * dt
        shot.vx *= -0.4
        shot.vy *= -0.4
      }
      if (shot.z <= 0) {
        shot.z = 0
        if (Math.abs(shot.vz) > 120) {
          shot.vz = -shot.vz * 0.42
          if (!shot.landed) this.host.dust(shot.x, shot.y, 0.25)
          shot.landed = true
        } else shot.vz = 0
        shot.vx *= 0.62
        shot.vy *= 0.62
      }
      shot.clock -= dt
      if (shot.clock <= 0) {
        shot.clock = 0.05
        this.host.particles.spawn({ x: shot.x, y: shot.y, z: shot.z + 22, vx: (Math.random() - 0.5) * 80, vz: 120 + Math.random() * 80, gravity: 500, life: 0.3, size: 12, sizeEnd: 3, alpha: 1, fadeIn: 0, sprite: this.ember, blend: 'add' })
      }
      if (shot.age >= shot.life) {
        this.explode(shot.x, shot.y, shot.radius, shot.power, shot.burn, 0.9)
        this.projectiles.splice(index, 1)
      }
    }
  }

  private explode(x: number, y: number, radius: number, power: number, burn: boolean, size: number) {
    const scale = this.host.robotScale()
    this.host.fx.impact('fogo', x, y, 14, 1.2 * size)
    this.host.fx.shockwave('fogo', x, y, radius)
    this.host.fx.ring(x, y, radius * 1.2, 0.35, AMBER)
    this.host.dust(x, y, 0.9 * size)
    this.host.smoke(x, y, 0.6 * size)
    this.host.cue('heavy')
    this.host.shake(0.22 * size)
    for (const enemy of this.host.enemies) {
      if (!enemy.vulnerable) continue
      if (Math.hypot(enemy.x - x, (enemy.y - y) * 1.6) > radius + 30 * scale * enemy.scale) continue
      const dealt = this.host.damage(enemy, this.host.meleeDamage() * power, { force: 520, heavy: true, soft: true, ailment: 0.3, element: 'fogo', fromX: x, fromY: y })
      if (dealt > 0 && burn && enemy.alive) this.host.burn(enemy)
    }
  }

  private autoStrike(final: boolean) {
    const player = this.host.player
    const scale = this.host.robotScale()
    let target: Enemy | null = null
    let best = Infinity
    for (const enemy of this.host.enemies) {
      if (!enemy.vulnerable) continue
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y)
      if (distance >= best) continue
      best = distance
      target = enemy
    }
    if (!target) return
    const angle = Math.random() * Math.PI * 2
    const offset = ((70 + 30 * target.scale) * scale) / BASE_SCALE
    this.host.afterimage(FURY, 0.35)
    const [x, y] = this.host.constrain(target.x + Math.cos(angle) * offset, target.y + Math.sin(angle) * offset * 0.6, player.x, player.y)
    player.x = x
    player.y = y
    player.facing = directionFromVector(target.x - x, target.y - y, player.facing, 0)
    this.host.afterimage(FURY, 0.3)
    const power = T.imprevisivel.power[this.perks.imprevisivel - 1] * (final ? 2.2 : 1)
    const hitAngle = Math.atan2(target.y - y, target.x - x)
    this.host.fx.swing(this.host.element, x + Math.cos(hitAngle) * 30 * scale, y - 40 * scale, hitAngle, 80 * scale, final)
    this.host.damage(target, this.host.meleeDamage() * power, { force: final ? 900 : 420, heavy: final, ailment: 0.3, fromX: x, fromY: y })
    this.host.fx.sparks(FURY, target.x, target.y, 70 * scale * target.scale, final ? 28 : 12, final ? 620 : 380)
    if (!final) return
    this.host.fx.shockwave(this.host.element, target.x, target.y, 240)
    this.host.flash(0.3)
    this.host.shake(0.9)
  }

  private finishFury() {
    const qte = this.qte
    if (!qte) return
    this.qte = null
    this.fury = 0
    this.furyAnnounced = false
    const hits = qte.results.filter(Boolean).length
    const player = this.host.player
    const perfect = hits === qte.sequence.length
    this.host.popup(player.x, player.y - 190 * this.host.robotScale(), hits ? `Fúria ${hits}/${qte.sequence.length}` : 'Fúria perdida', hits ? FURY : GREY, perfect ? 1.3 : 1)
    if (perfect) this.host.cue('super')
    this.host.hud()
  }

  private stepQte(realDt: number) {
    const qte = this.qte
    if (!qte) return
    qte.left -= realDt
    if (qte.left <= 0) this.finishFury()
  }

  private stepMarks(dt: number) {
    const scale = this.host.robotScale()
    for (const [enemy, leak] of this.leaks) {
      if (!enemy.alive) {
        this.leaks.delete(enemy)
        continue
      }
      leak.time -= dt
      leak.clock -= dt
      while (leak.clock <= 0 && enemy.alive) {
        leak.clock += LEAK_TICK
        if (enemy.vulnerable) this.host.drain(enemy, Math.max(1, Math.round(enemy.maxHealth * leak.rate * LEAK_TICK)), AMBER)
      }
      leak.drip -= dt
      if (leak.drip <= 0) {
        leak.drip = 0.12
        this.host.particles.spawn({
          x: enemy.x + (Math.random() - 0.5) * 30,
          y: enemy.y + 2,
          z: (40 + Math.random() * 40) * scale * enemy.scale,
          vx: (Math.random() - 0.5) * 30,
          vz: -40,
          gravity: 900,
          life: 0.45,
          size: 14,
          sizeEnd: 8,
          alpha: 0.95,
          fadeIn: 0,
          sprite: this.drop,
          blend: 'normal',
        })
      }
      if (leak.time <= 0) this.leaks.delete(enemy)
    }
    for (const [enemy, daze] of this.dazed) {
      daze.time -= dt
      if (!enemy.alive || daze.time <= 0) this.dazed.delete(enemy)
      else if (Math.random() < dt * 3) this.host.fx.ailment('arrastado', enemy.x, enemy.y, (100 * enemy.scale + enemy.lift) * scale)
    }
    for (const [enemy, window] of this.exposed) {
      window.time -= dt
      if (!enemy.alive || window.time <= 0) this.exposed.delete(enemy)
    }
    for (const enemy of this.host.enemies) {
      const leak = this.leaks.get(enemy)
      enemy.speedFactor = (leak ? 1 - leak.slow : 1) * (this.dazed.has(enemy) ? 1 - T.uivo.slow : 1)
    }
  }

  drawGround(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number) {
    const scale = this.host.robotScale()
    for (const [enemy] of this.leaks) {
      const x = originX + enemy.x * zoom
      const y = originY + enemy.y * zoom
      const radius = 34 * enemy.scale * scale * zoom
      context.fillStyle = 'rgba(30, 22, 16, 0.45)'
      context.beginPath()
      context.ellipse(x, y + 2 * zoom, radius, radius * 0.4, 0, 0, Math.PI * 2)
      context.fill()
    }
    for (const [enemy, window] of this.exposed) {
      const x = originX + enemy.x * zoom
      const y = originY + enemy.y * zoom
      const radius = (70 * enemy.scale + 10) * scale * zoom
      context.strokeStyle = rgba(GOLD, (0.5 + 0.3 * Math.sin(time * 10)) * Math.min(1, window.time / 0.6))
      context.lineWidth = Math.max(1.5, 3.5 * zoom)
      context.setLineDash([10 * zoom, 7 * zoom])
      context.lineDashOffset = -time * 40 * zoom
      context.beginPath()
      context.ellipse(x, y, radius, radius * 0.42, 0, 0, Math.PI * 2)
      context.stroke()
      context.setLineDash([])
    }
    for (const shot of this.projectiles) {
      if (shot.kind !== 'bomb') continue
      const x = originX + shot.x * zoom
      const y = originY + shot.y * zoom
      const warn = Math.max(0, 1 - (shot.life - shot.age) / 0.45)
      const r = 14 * zoom * Math.max(0.5, 1 - shot.z / 300)
      context.fillStyle = 'rgba(16, 12, 10, 0.35)'
      context.beginPath()
      context.ellipse(x, y, r * 1.4, r * 0.55, 0, 0, Math.PI * 2)
      context.fill()
      if (warn <= 0) continue
      context.strokeStyle = rgba(AMBER, 0.25 + 0.5 * warn * Math.abs(Math.sin(time * 26)))
      context.lineWidth = Math.max(1, 2 * zoom)
      context.beginPath()
      context.ellipse(x, y, shot.radius * zoom, shot.radius * 0.6 * zoom, 0, 0, Math.PI * 2)
      context.stroke()
    }
    if (this.jet) {
      const player = this.host.player
      const x = originX + player.x * zoom
      const y = originY + player.y * zoom
      context.fillStyle = rgba(WATER, 0.1)
      context.beginPath()
      context.moveTo(x, y)
      context.arc(x, y, T.lavajato.range * zoom, this.jet.angle - T.lavajato.cone, this.jet.angle + T.lavajato.cone)
      context.closePath()
      context.fill()
    }
  }

  drawGlow(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number) {
    const player = this.host.player
    const scale = this.host.robotScale()
    const laser = this.laser
    if (laser) {
      const glow = ELEMENTS[this.host.element].glow
      const chest = 58 * scale
      const sx = originX + (player.x + Math.cos(laser.angle) * 36 * scale) * zoom
      const sy = originY + (player.y + Math.sin(laser.angle) * 18 * scale - chest) * zoom
      const ex = originX + laser.endX * zoom
      const ey = originY + (laser.endY - chest) * zoom
      const flicker = 0.85 + 0.15 * Math.sin(time * 60)
      const fade = Math.min(1, laser.time / 0.25, (laser.total - laser.time) / 0.12 + 0.2)
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(sx, sy)
      context.lineTo(ex, ey)
      context.strokeStyle = rgba(glow, 0.22 * fade)
      context.lineWidth = 40 * zoom * flicker
      context.stroke()
      context.strokeStyle = rgba(glow, 0.55 * fade)
      context.lineWidth = 18 * zoom * flicker
      context.stroke()
      context.strokeStyle = rgba(WHITE, 0.95 * fade)
      context.lineWidth = 6 * zoom
      context.stroke()
      const flare = context.createRadialGradient(ex, ey, 0, ex, ey, 70 * zoom)
      flare.addColorStop(0, rgba(WHITE, 0.9 * fade))
      flare.addColorStop(0.3, rgba(glow, 0.55 * fade))
      flare.addColorStop(1, rgba(glow, 0))
      context.fillStyle = flare
      context.beginPath()
      context.arc(ex, ey, 70 * zoom, 0, Math.PI * 2)
      context.fill()
      const muzzle = context.createRadialGradient(sx, sy, 0, sx, sy, 46 * zoom)
      muzzle.addColorStop(0, rgba(WHITE, 0.9 * fade))
      muzzle.addColorStop(1, rgba(glow, 0))
      context.fillStyle = muzzle
      context.beginPath()
      context.arc(sx, sy, 46 * zoom, 0, Math.PI * 2)
      context.fill()
    }
    if (this.jet) {
      const x = originX + (player.x + Math.cos(this.jet.angle) * 40 * scale) * zoom
      const y = originY + (player.y + Math.sin(this.jet.angle) * 20 * scale - 54 * scale) * zoom
      const gradient = context.createRadialGradient(x, y, 0, x, y, 60 * zoom)
      gradient.addColorStop(0, rgba(WHITE, 0.6))
      gradient.addColorStop(1, rgba(WATER, 0))
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, 60 * zoom, 0, Math.PI * 2)
      context.fill()
    }
    for (const shot of this.projectiles) {
      const x = originX + shot.x * zoom
      const y = originY + (shot.y - shot.z) * zoom
      const color = shot.kind === 'spear' ? STEEL : AMBER
      const radius = (shot.kind === 'missile' ? 46 : shot.kind === 'spear' ? 40 : 26) * zoom
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, rgba(WHITE, shot.kind === 'bomb' ? 0.5 : 0.75))
      gradient.addColorStop(0.35, rgba(color, 0.45))
      gradient.addColorStop(1, rgba(color, 0))
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }
    if (this.furyReady && !this.qte) {
      const x = originX + player.x * zoom
      const y = originY + (player.y - 60 * scale) * zoom
      const radius = 130 * scale * zoom
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, rgba(FURY, 0.25 + 0.15 * Math.sin(time * 8)))
      gradient.addColorStop(1, rgba(FURY, 0))
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }
    if (this.reserve > 0) {
      const x = originX + player.x * zoom
      const y = originY + player.y * zoom
      const radius = 64 * scale * zoom
      context.strokeStyle = rgba(RESERVE, 0.18 + 0.08 * Math.sin(time * 3))
      context.lineWidth = Math.max(1, 2 * zoom)
      context.beginPath()
      context.ellipse(x, y, radius, radius * 0.42, 0, 0, Math.PI * 2)
      context.stroke()
    }
  }

  actors(out: DrawActor[], art: VehicleArt | null) {
    const scale = this.host.robotScale()
    for (const shot of this.projectiles) out.push({ depth: shot.y + 1, draw: (context, originX, originY, zoom) => this.drawShot(context, originX, originY, zoom, shot, scale) })
    const vehicle = this.vehicle
    if (!vehicle || !art) return
    const player = this.host.player
    out.push({
      depth: player.y + 0.5,
      draw: (context, originX, originY, zoom) => {
        const image = vehicle === 'tank' ? art.tank : art.car
        if (!image.complete || image.naturalWidth === 0) return
        const width = (vehicle === 'tank' ? 46 : 52) * TEXEL * scale * zoom
        const height = width * (image.naturalHeight / image.naturalWidth)
        const x = originX + player.x * zoom
        const y = originY + player.y * zoom
        const bob = player.moving ? Math.sin(this.elapsed * (vehicle === 'car' ? 40 : 18)) * 1.5 * zoom : 0
        const facing = vehicle === 'car' ? this.carFacing : Math.cos(FACING[player.facing] ?? 0) < -0.2 ? -1 : 1
        context.fillStyle = 'rgba(16, 12, 10, 0.32)'
        context.beginPath()
        context.ellipse(x, y, width * 0.42, width * 0.12, 0, 0, Math.PI * 2)
        context.fill()
        context.save()
        context.translate(x, y + bob)
        context.scale(facing, 1)
        context.imageSmoothingEnabled = false
        context.drawImage(image, -width / 2, -height * 0.92, width, height)
        context.restore()
      },
    })
  }

  private drawShot(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, shot: Projectile, scale: number) {
    const x = originX + shot.x * zoom
    const y = originY + (shot.y - shot.z) * zoom
    if (shot.kind === 'spear') {
      const length = 120 * scale * zoom
      const cos = Math.cos(shot.angle)
      const sin = Math.sin(shot.angle) * 0.8
      const tailX = x - cos * length
      const tailY = y - sin * length
      context.lineCap = 'round'
      context.strokeStyle = 'rgba(20, 22, 26, 0.9)'
      context.lineWidth = 9 * zoom
      context.beginPath()
      context.moveTo(tailX, tailY)
      context.lineTo(x, y)
      context.stroke()
      const shaft = context.createLinearGradient(tailX, tailY - 4 * zoom, tailX, tailY + 4 * zoom)
      shaft.addColorStop(0, '#f4f7fb')
      shaft.addColorStop(0.5, '#9aa6b4')
      shaft.addColorStop(1, '#4b5563')
      context.strokeStyle = shaft
      context.lineWidth = 6 * zoom
      context.stroke()
      const head = 26 * zoom
      context.fillStyle = '#e8eef6'
      context.strokeStyle = 'rgba(20, 22, 26, 0.9)'
      context.lineWidth = 2 * zoom
      context.beginPath()
      context.moveTo(x + cos * head, y + sin * head)
      context.lineTo(x + Math.cos(shot.angle + 2.5) * head * 0.55, y + Math.sin(shot.angle + 2.5) * head * 0.45)
      context.lineTo(x + Math.cos(shot.angle - 2.5) * head * 0.55, y + Math.sin(shot.angle - 2.5) * head * 0.45)
      context.closePath()
      context.fill()
      context.stroke()
      context.fillStyle = rgba(GOLD, 1)
      context.fillRect(tailX - 4 * zoom, tailY - 4 * zoom, 8 * zoom, 8 * zoom)
      return
    }
    if (shot.kind === 'missile') {
      const length = 44 * scale * zoom
      context.save()
      context.translate(x, y)
      context.rotate(Math.atan2(Math.sin(shot.angle) * 0.8, Math.cos(shot.angle)))
      context.fillStyle = 'rgba(20, 22, 26, 0.95)'
      context.fillRect(-length / 2 - 2 * zoom, -7 * zoom, length + 4 * zoom, 14 * zoom)
      const body = context.createLinearGradient(0, -6 * zoom, 0, 6 * zoom)
      body.addColorStop(0, '#f2f0e8')
      body.addColorStop(0.55, '#a8a49a')
      body.addColorStop(1, '#5d5a54')
      context.fillStyle = body
      context.fillRect(-length / 2, -5 * zoom, length, 10 * zoom)
      context.fillStyle = '#d64535'
      context.beginPath()
      context.moveTo(length / 2, -5 * zoom)
      context.lineTo(length / 2 + 12 * zoom, 0)
      context.lineTo(length / 2, 5 * zoom)
      context.closePath()
      context.fill()
      context.fillStyle = '#d6a83a'
      context.fillRect(-length / 2 - 4 * zoom, -9 * zoom, 8 * zoom, 18 * zoom)
      context.restore()
      return
    }
    const radius = (13 * scale * zoom) / BASE_SCALE
    context.fillStyle = 'rgba(12, 12, 14, 0.95)'
    context.beginPath()
    context.arc(x, y, radius + 2 * zoom, 0, Math.PI * 2)
    context.fill()
    const body = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius)
    body.addColorStop(0, '#6b7280')
    body.addColorStop(0.5, '#2d3139')
    body.addColorStop(1, '#14161a')
    context.fillStyle = body
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#c9a24a'
    context.fillRect(x - 3 * zoom, y - radius - 5 * zoom, 6 * zoom, 6 * zoom)
    const spark = 0.6 + 0.4 * Math.sin((shot.age + shot.seed) * 50)
    const fx = x + 2 * zoom
    const fy = y - radius - 8 * zoom
    const glow = context.createRadialGradient(fx, fy, 0, fx, fy, 14 * zoom)
    glow.addColorStop(0, rgba(WHITE, spark))
    glow.addColorStop(0.4, rgba(AMBER, 0.8 * spark))
    glow.addColorStop(1, rgba(AMBER, 0))
    context.fillStyle = glow
    context.beginPath()
    context.arc(fx, fy, 14 * zoom, 0, Math.PI * 2)
    context.fill()
  }
}
