import type { Site } from '../../city/sites'
import { isWalkable } from '../../world-data'
import { ARENA_RING, type RingDef } from './ring'
import type { Cue } from '../audio'
import { mixColor } from '../fx/lighting'
import { glowTexture, puffTexture, type RGB } from '../fx/textures'
import type { Movement } from '../input'
import type { Mission } from '../missions/data'
import { Player, WALK_SPEED } from '../player'
import { bondCharge } from '../npcs/bond'
import { BODY_NAME, computeStats, type Condition, type Loadout } from '../robot/parts'
import type { UpgradeLevels } from '../robot/upgrades'
import type { Core } from '../robot/progress'
import type { Scene } from '../scene'
import { directionFromVector, type Direction } from '../sprite'
import { attackNames, weaponFor, type AttackNames, type WeaponDef } from './arsenal'
import { CLASSES, type ClassMods } from './classes'
import { ADAPTATION_FADE, ADAPTATION_FLOOR, ADAPTATION_STEP, CARD_IDS, CARDS, CHARGE_FULL, isSecretCard, TABLET_LOCK, TRANSFORM_LOCK, type CardId, type FormMods } from './deck'
import { AILMENTS, EFFECT_FACTOR, EFFECT_LABEL, ELEMENTS, counterOf, effectiveness, type Ailment, type Effectiveness, type Element } from './elements'
import { SCRAP_SHARE, type Shot } from './enemies'
import { BOSSES, type BossId } from './bosses'
import { Enemy, type Entrance, type Field } from './enemy'
import { drawEnemy, type EnemySpec, type Lineup } from './lineup'
import { Status } from './status'
import { ElementFx, type BoltStyle } from './vfx'
import type { UpgradeId } from '../garage/catalog'
import type { GadgetLoadout } from '../garage/state'
import { Gadgets, type QteDir } from './gadgets'

export const ROBOT_SCALE = 0.75
const S = ROBOT_SCALE

export type BattleMode = 'ring' | 'open'
export type Phase = 'enter' | 'versus' | 'countdown' | 'fight' | 'cleared' | 'victory' | 'defeat'
export type PlayerAction = 'idle' | 'attack' | 'shoot' | 'guard' | 'dodge' | 'dash' | 'cast' | 'hurt' | 'stun' | 'down'
export type BannerKind = 'round' | 'fight' | 'cleared' | 'victory' | 'defeat' | 'alarm' | 'alien' | 'boss'

export type AimPoint = { x: number; y: number }

export type BattleInput = { attack: boolean; shoot: boolean; dodge: boolean; guard: boolean; card: CardId | null; aim: AimPoint | null; gadget?: UpgradeId | null; fury?: boolean; qte?: QteDir | null }

export type Bolt = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  damage: number
  owner: 'player' | 'enemy'
  size: number
  height: number
  from: Enemy | null
  element: Element
  style: BoltStyle
  seed: number
  ailment: number
  reflected: boolean

  homing?: number
  heavy?: boolean
}

export type Popup = {
  x: number
  y: number
  z: number
  vz: number
  vx: number
  text: string
  color: RGB
  age: number
  life: number
  size: number
}

export type Slash = { x: number; y: number; angle: number; age: number; life: number; radius: number; color: RGB; glow: RGB }

export type Meteor = {
  x: number
  y: number
  radius: number
  delay: number
  total: number
  damage: number
  owner: 'player' | 'enemy'
  element: Element
  seed: number
  from: Enemy | null
  ailment: number
}

export type Afterimage = {
  x: number
  y: number
  facing: Direction
  frame: number
  moving: boolean
  scale: number
  age: number
  life: number
  color: RGB
  enemy: Enemy | null
}

export type CutIn = { side: 'player' | 'enemy'; card: CardId; actor: string; element: Element; phase: 'charge' | 'play' }

export type BattleEvents = {
  cue(name: Cue, duration?: number): void
  banner(kind: BannerKind, text: string, sub?: string): void
  phase(phase: Phase): void
  hud(): void
  reward(credits: number): void
  shake(amount: number): void
  cutin(info: CutIn): void
}

export type BattleOptions = {
  mission: Mission
  mode: BattleMode
  site: Site | null
  player: Player
  scene: Scene
  loadout: Loadout
  upgrades?: UpgradeLevels

  condition?: Condition

  unlockedCards?: readonly CardId[]

  bond?: number
  core: Core
  lineup: Lineup
  events: BattleEvents

  ring?: RingDef

  startEnergy?: number
  hand?: readonly CardId[]
  spawns?: readonly (readonly [number, number])[]
  alarm?: BattleAlarm
  gadgets?: GadgetLoadout
}

export type BattleAlarm = { title: string; sub: string; fight: string }

export type BattleStats = { supers: number; cards: number; ailments: number; parries: number; bestCombo: number; forms: number }

export type WearTally = { damageTaken: number; meleeTaken: number; shotTaken: number; guardedTaken: number; swings: number }

export type CardState = { cost: number; ready: boolean; cooldown: number; affordable: boolean; active: boolean;                                                                                           locked: boolean }

type Press = { kind: 'attack' | 'shoot' | 'dodge' | 'card'; card: CardId | null; age: number }

const ATTACK_SECONDS = 0.3
const SWING_AT = 0.09
const SHOOT_SECONDS = 0.2
const CAST_SECONDS = 0.3
const DODGE_SECONDS = 0.24
const DODGE_DISTANCE = 300
const DODGE_COST = 15
const DODGE_COOLDOWN = 0.42
const DODGE_INVULNERABLE = 0.32
const PERFECT_DODGE = 0.16
const PARRY_WINDOW = 0.24
const GUARD_FACTOR = 0.25
const GUARD_DRAIN = 9
const HURT_SECONDS = 0.28
const HURT_INVULNERABLE = 0.55
const HIT_STOP = 0.055
const CRIT_STOP = 0.12
const COMBO_WINDOW = 1.1
const AIM_RANGE = 260
const AIM_CONE = 0.55
const AIM_SNAP = 150
const BUFFER_SECONDS = 0.2
const DASH_SECONDS = 0.34
const DASH_SPEED = 1550
const ZERO: Movement = { x: 0, y: 0, magnitude: 0 }
const VERSUS_SECONDS = 3.2
const COUNTDOWN_SECONDS = 1.3
const CLEARED_SECONDS = 1.7
const VICTORY_SECONDS = 2.8
const DEFEAT_SECONDS = 2.8
const ALARM_SECONDS = 1.7
const DOOR_STAGGER = 0.7
const BODY_RADIUS = 40
const BODY_DEPTH = 0.75

type Body = { x: number; y: number }
const ARENA_DUSK: RGB = [118, 116, 164]
const FLOODLIGHT: RGB = [255, 224, 176]
const DAYLIGHT: RGB = [255, 255, 255]
const CHARGE = { start: 12, melee: 7, shot: 4, card: 3, gadget: 3, parry: 18, perfect: 12, hurt: 10, ko: 13 } as const

const WHITE: RGB = [255, 248, 236]
const GOLD: RGB = [255, 214, 110]
const RED: RGB = [255, 96, 80]
const GREY: RGB = [190, 196, 204]
const HEAL: RGB = [140, 255, 170]
const TEAL: RGB = [126, 255, 224]
const DUST: RGB = [118, 96, 74]

const ELEMENT_CUE: Record<Element, Cue> = {
  fogo: 'fire',
  agua: 'water',
  terra: 'earth',
  vento: 'wind',
  raio: 'thunder',
  gelo: 'ice',
  luz: 'light',
  sombra: 'shadow',
}

export const FORM_GLOW: Record<CardId, RGB> = {
  rajada: GOLD,
  onda: TEAL,
  investida: GOLD,
  chuva: [200, 150, 255],
  tita: [255, 200, 90],
  fantasma: [150, 225, 255],
  sobrecarga: [255, 110, 70],
  prisma: [255, 255, 255],
  enxame: [190, 255, 130],
  raizes: [255, 190, 90],
  orvalho: [170, 230, 255],
}

export class Battle {
  phase: Phase = 'enter'
  round = 0
  readonly enemies: Enemy[] = []
  readonly bolts: Bolt[] = []
  readonly popups: Popup[] = []
  readonly slashes: Slash[] = []
  readonly meteors: Meteor[] = []
  readonly afterimages: Afterimage[] = []
  readonly fx: ElementFx
  readonly mission: Mission
  readonly mode: BattleMode
  readonly site: Site | null
  readonly lineup: Lineup
  readonly ring: RingDef
  readonly core: Core
  readonly cls: ClassMods
  readonly weapon: WeaponDef
  readonly names: AttackNames
  readonly status = new Status()
  readonly stats: BattleStats = { supers: 0, cards: 0, ailments: 0, parries: 0, bestCombo: 0, forms: 0 }
  readonly wear: WearTally = { damageTaken: 0, meleeTaken: 0, shotTaken: 0, guardedTaken: 0, swings: 0 }
  readonly unlockedCards: ReadonlySet<CardId>
  readonly hand: readonly CardId[]
  readonly gadgets: Gadgets
  overheat = 0
  readonly maxHealth: number
  health: number
  readonly maxEnergy: number
  energy: number
  charge = 0

  tabletLock = 0

  adaptation = 0
  form: CardId | null = null
  formTimer = 0
  formTotal = 0
  action: PlayerAction = 'idle'
  actionTimer = 0
  guardTime = 0
  invulnerable = 0
  bounties = 0
  kills = 0
  elapsed = 0
  freeze = 0
  excitement = 0.2
  robotScale: number
  finished = false
  outcome: 'victory' | 'defeat' | null = null
  private readonly player: Player
  private readonly scene: Scene
  private readonly events: BattleEvents
  private readonly baseMelee: number
  private readonly baseShot: number
  private readonly baseRegen: number
  private readonly field: Field
  private readonly cooldowns = new Map<CardId, number>()
  private phaseTimer = 0
  private attackCooldown = 0
  private dodgeCooldown = 0
  private dodgeAge = 9
  private swung = false
  private swingAngle = 0
  private combo = 0
  private comboTimer = 0
  private dash: readonly [number, number] = [0, 1]
  private dashHits = new Set<number>()
  private dashPower = 1
  private knockX = 0
  private knockY = 0
  private buffered: Press | null = null
  private aimPoint: AimPoint | null = null
  private readonly queue: { spec: EnemySpec; delay: number; entrance: Entrance }[] = []
  private alienWarned = false
  private ambientBlend = 0
  private ailmentClock = 0
  private imageClock = 0
  private chargeAnnounced = false
  private adaptationTimer = 0
  private readonly effectShown = new Map<number, number>()
  private readonly spawns: readonly (readonly [number, number])[] | null
  private readonly alarm: BattleAlarm | null
  private spawned = 0

  constructor(options: BattleOptions) {
    this.mission = options.mission
    this.mode = options.mode
    this.site = options.site
    this.player = options.player
    this.scene = options.scene
    this.events = options.events
    this.lineup = options.lineup
    this.ring = options.ring ?? ARENA_RING
    this.core = options.core
    this.cls = CLASSES[options.core.cls].mods
    this.weapon = weaponFor(options.loadout.weapon)
    this.names = attackNames(this.weapon, options.core.element)
    this.fx = new ElementFx(options.scene.particles)
    const stats = computeStats(options.loadout, options.upgrades, options.condition)
    this.unlockedCards = new Set(options.unlockedCards ?? [])
    this.hand = options.hand ? [...options.hand] : [...CARD_IDS]
    this.spawns = options.spawns?.length ? options.spawns : null
    this.alarm = options.alarm ?? null
    this.maxHealth = 100 + stats.defense * 10
    this.health = this.maxHealth
    this.maxEnergy = Math.round((80 + stats.energy * 8) * this.cls.energy)
    this.energy = Math.max(0, Math.min(this.maxEnergy, options.startEnergy ?? 0))
    this.baseMelee = 12 + stats.attack * 2.6
    this.baseShot = 9 + stats.attack * 2.1
    this.baseRegen = 9 + stats.energy * 0.7
    this.charge = CHARGE.start + bondCharge(options.bond ?? 0)
    this.robotScale = this.mode === 'ring' ? S : 1
    this.field = {
      player: this.player,
      scale: S,
      constrain: (x, y, fromX, fromY) => this.constrain(x, y, fromX, fromY),
      blinkSpot: (distance) => this.blinkSpot(distance),
    }
    this.phaseTimer = 0.05
    this.gadgets = new Gadgets(options.gadgets, {
      player: this.player,
      enemies: this.enemies,
      fx: this.fx,
      particles: options.scene.particles,
      element: this.core.element,
      maxHealth: this.maxHealth,
      meleeDamage: () => this.meleeDamage,
      robotScale: () => this.robotScale,
      health: () => this.health,
      energy: () => this.energy,
      aim: () => this.aimPoint,
      fighting: () => this.phase === 'fight' && this.action !== 'down',
      spend: (amount) => {
        if (this.energy < amount) return false
        this.energy -= amount
        return true
      },
      damage: (enemy, base, strike) =>
        this.damageEnemy(enemy, base, {
          fromX: strike.fromX ?? this.player.x,
          fromY: strike.fromY ?? this.player.y,
          force: strike.force,
          kind: 'gadget',
          ailment: strike.ailment ?? 0,
          element: strike.element ?? this.attackElement(enemy),
          heavy: strike.heavy,
          quiet: strike.quiet,
          soft: strike.soft,
        }),
      smash: (enemy, amount, force, fromX, fromY) => this.smash(enemy, amount, force, fromX, fromY),
      drain: (enemy, amount, color) => this.drain(enemy, amount, color),
      popup: (x, y, text, color, size) => this.popup(x, y, text, color, size),
      cue: (name, duration) => this.events.cue(name, duration),
      shake: (amount) => this.events.shake(amount),
      freeze: (seconds) => {
        this.freeze = Math.max(this.freeze, seconds)
      },
      flash: (amount) => {
        this.scene.flash = Math.max(this.scene.flash, amount)
        this.scene.playerFlash = 1
      },
      hud: () => this.events.hud(),
      heal: (amount) => this.heal(amount),
      shield: (seconds) => {
        this.invulnerable = Math.max(this.invulnerable, seconds)
      },
      cleanse: () => this.status.cure('queimadura'),
      soak: (enemy) => {
        enemy.status.apply('encharcado')
      },
      burn: (enemy) => {
        enemy.status.apply('queimadura')
      },
      dust: (x, y, amount) => this.dust(x, y, amount),
      smoke: (x, y, amount) => this.smoke(x, y, amount),
      afterimage: (color, life) => this.afterimage(color, life),
      constrain: (x, y, fromX, fromY) => this.constrain(x, y, fromX, fromY),
      inside: (x, y) => (this.mode === 'ring' ? this.insideBounds(x, y, 10) : isWalkable(x, y)),
    })
  }

  get rounds() {
    return this.lineup.rounds.length
  }

  get standing() {
    return this.enemies.filter((enemy) => enemy.alive)
  }

  get fighting() {
    return this.phase === 'fight'
  }

  get element(): Element {
    return this.core.element
  }

  get dusk() {
    return this.mode === 'ring' ? this.ambientBlend : 0
  }

  private formMod(key: Exclude<keyof FormMods, 'sureAilment' | 'steady' | 'prism'>): number {
    const value = this.form ? CARDS[this.form].form?.[key] : undefined
    return typeof value === 'number' ? value : key === 'extraBolts' || key === 'phase' ? 0 : 1
  }

  private formFlag(key: 'sureAilment' | 'steady' | 'prism'): boolean {
    return !!(this.form && CARDS[this.form].form?.[key])
  }

  get meleeDamage() {
    return this.baseMelee * this.weapon.stats.melee * this.cls.melee * this.formMod('melee')
  }

  get shotDamage() {
    return this.baseShot * this.weapon.stats.shot * this.cls.shot * this.formMod('shot')
  }

  private get armor() {
    return this.cls.armor * this.formMod('armor')
  }

  get shotCost() {
    return Math.round(this.weapon.stats.cost * this.formMod('shotCost'))
  }

  get dodgeCost() {
    return Math.round(DODGE_COST * this.cls.dodgeCost * this.formMod('dodgeCost'))
  }

  private get parryWindow() {
    return PARRY_WINDOW * this.cls.parry * this.formMod('parry')
  }

  private get knock() {
    return this.weapon.stats.knock * this.cls.knock * this.formMod('knock')
  }

  cardCost(id: CardId) {
    const card = CARDS[id]
    return card.kind === 'transform' ? CHARGE_FULL : Math.round(card.cost * this.cls.cardCost)
  }

  get adaptationFactor() {
    return Math.max(ADAPTATION_FLOOR, 1 - ADAPTATION_STEP * this.adaptation)
  }

  private get cardPower() {
    return this.cls.cardPower * this.adaptationFactor
  }

  cardState(id: CardId): CardState {
    const card = CARDS[id]
    const cooldown = this.cooldowns.get(id) ?? 0
    const cost = this.cardCost(id)
    const affordable = card.kind === 'transform' ? this.charge >= CHARGE_FULL : this.energy >= cost
    const lockSpan = card.kind === 'transform' ? TRANSFORM_LOCK : TABLET_LOCK
    const locked = cooldown <= 0 && this.tabletLock > 0
    const sweep = Math.max(cooldown / card.cooldown, Math.min(1, this.tabletLock / lockSpan))
    return { cost, cooldown: sweep, affordable, ready: cooldown <= 0 && this.tabletLock <= 0 && affordable, active: this.form === id, locked }
  }

  private attackElement(target: Enemy | null): Element {
    if (this.formFlag('prism') && target) return counterOf(target.element)
    return this.core.element
  }

  cameraTarget(): { x: number; y: number } | null {
    if (this.mode !== 'ring') return null
    return { x: (this.player.x + this.ring.center[0]) / 2, y: (this.player.y + this.ring.center[1] + 40) / 2 }
  }

  ambient(): RGB {
    if (this.mode !== 'ring') return DAYLIGHT
    const [idle, fight] = this.ring.ambient ?? [DAYLIGHT, ARENA_DUSK]
    return mixColor(idle, fight, this.ambientBlend)
  }

  update(realDt: number, movement: Movement, input: BattleInput) {
    this.elapsed += realDt
    const dt = (this.freeze > 0 ? realDt * 0.08 : realDt) * this.gadgets.slowmo
    this.freeze = Math.max(0, this.freeze - realDt)
    if (this.mode === 'ring') this.ambientBlend = Math.min(1, this.ambientBlend + realDt / 1.2)
    this.excitement = Math.max(0.15, this.excitement - realDt * 0.25)

    this.stepPhase(dt)
    this.stepPlayer(dt, movement, input)
    this.gadgets.update(dt, realDt)
    this.stepQueue(dt)
    for (const enemy of this.enemies) enemy.update(dt, this.field, this.enemyEvents)
    this.stepRushes()
    this.separateBodies()
    this.stepAilments(dt)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive && this.enemies[i].timer <= 0) this.enemies.splice(i, 1)
    }
    this.stepBolts(dt)
    this.stepMeteors(dt)
    this.stepPopups(dt)
    this.fx.update(dt)
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].age += dt
      if (this.slashes[i].age >= this.slashes[i].life) this.slashes.splice(i, 1)
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].age += dt
      if (this.afterimages[i].age >= this.afterimages[i].life) this.afterimages.splice(i, 1)
    }
    this.stepLook(realDt, dt)
    if (this.mode === 'ring') this.lightRing()
    if (this.phase === 'fight' && this.queue.length === 0 && this.enemies.every((enemy) => !enemy.alive) && this.meteors.length === 0) this.roundCleared()
  }

  dispose() {
    this.enemies.length = 0
    this.bolts.length = 0
    this.popups.length = 0
    this.slashes.length = 0
    this.meteors.length = 0
    this.afterimages.length = 0
    this.gadgets.clear()
    this.fx.clear()
    this.scene.playerFlash = 0
    this.scene.flash = 0
    this.scene.playerAlpha = 1
    this.scene.playerScale = 1
    if (this.mode === 'ring') this.scene.lights.length = 0
  }

  private setPhase(phase: Phase, seconds: number) {
    this.phase = phase
    this.phaseTimer = seconds
    this.events.phase(phase)
    this.events.hud()
  }

  private stepPhase(dt: number) {
    if (this.phase === 'fight') return
    this.phaseTimer -= dt
    if (this.phaseTimer > 0) return
    switch (this.phase) {
      case 'enter':
        if (this.mode === 'ring') {
          this.setPhase('versus', VERSUS_SECONDS)
        } else {
          this.events.cue('alarm')
          this.events.banner('alarm', this.alarm?.title ?? 'Alarme', this.alarm?.sub ?? (this.site ? `${this.site.name} · robôs em fuga` : 'Robôs em fuga'))
          this.setPhase('countdown', ALARM_SECONDS)
        }
        break
      case 'versus':
      case 'cleared':
        this.events.cue('bell')
        this.events.banner('round', `Rodada ${this.round + 1}`, this.rounds > 1 ? `de ${this.rounds}` : undefined)
        this.setPhase('countdown', COUNTDOWN_SECONDS)
        break
      case 'countdown':
        this.spawnRound()
        if (this.mode === 'ring') {
          this.events.cue('bell')
          this.events.banner('fight', 'Lute!')
        } else {
          this.events.banner('fight', this.alarm?.fight ?? 'Contenha a fuga')
        }
        this.excitement = 0.7
        this.setPhase('fight', 0)
        break
      case 'victory':
      case 'defeat':
        this.finished = true
        break
    }
  }

  private roundCleared() {
    this.gadgets.halt()
    if (this.round + 1 < this.rounds) {
      this.round += 1
      this.adaptation = 0
      this.events.banner('cleared', 'Rodada vencida', this.mode === 'ring' ? 'o próximo adversário entra' : 'mais robôs à vista')
      this.bolts.length = 0
      this.setPhase('cleared', CLEARED_SECONDS)
      return
    }
    this.outcome = 'victory'
    this.excitement = 1
    this.events.cue('win')
    this.events.banner('victory', 'Vitória', this.mode === 'ring' ? this.ring.cheer : 'fuga contida')
    this.freeze = 0.3
    this.action = 'idle'
    this.bolts.length = 0
    this.setPhase('victory', VICTORY_SECONDS)
  }

  private defeat() {
    this.gadgets.halt()
    this.outcome = 'defeat'
    this.action = 'down'
    this.actionTimer = 99
    this.form = null
    this.events.cue('lose')
    this.events.banner('defeat', 'Derrota', 'o núcleo apagou')
    this.events.shake(0.8)
    this.freeze = 0.4
    this.scene.playerFlash = 1
    this.fx.sparks(RED, this.player.x, this.player.y, 60 * S, 26, 420)
    this.smoke(this.player.x, this.player.y, 2)
    for (const enemy of this.enemies) enemy.stagger(99)
    this.meteors.length = 0
    this.setPhase('defeat', DEFEAT_SECONDS)
  }

  private spawnRound() {
    const specs = this.lineup.rounds[this.round] ?? []
    if (this.mode === 'ring') {
      const spread = Math.min(170, 460 / Math.max(1, specs.length - 1))
      specs.forEach((spec, index) => {
        const x = this.ring.enemyStart[0] + (index - (specs.length - 1) / 2) * spread
        const y = this.ring.enemyStart[1] + (index % 2) * 36
        this.enemies.push(new Enemy(spec, x, y, spec.kind === 'alien' ? 'warp' : 'ring'))
        this.dust(x, y, 1)
      })
      const champion = specs.find((spec) => spec.boss)
      if (champion) {
        this.events.cue('warp')
        this.events.banner('boss', 'O campeão entra', `${BOSSES[champion.boss as BossId].name} · ${BOSSES[champion.boss as BossId].title}`)
        this.events.shake(0.5)
      } else if (specs.some((spec) => spec.kind === 'alien')) this.events.cue('warp')
      return
    }
    if (this.spawns) {
      specs.forEach((spec, index) => this.queue.push({ spec, delay: index * 0.35, entrance: 'warp' }))
      return
    }
    specs.forEach((spec, index) => this.queue.push({ spec, delay: index * DOOR_STAGGER, entrance: 'door' }))
    if (this.mission.alienChance && Math.random() < this.mission.alienChance) {
      const alien = drawEnemy('alien', this.lineup.level, (specs[0]?.tier ?? this.mission.tier) * 1.05, this.core.element, Math.random, specs[0]?.power ?? specs[0]?.tier ?? this.mission.tier)
      this.queue.push({ spec: alien, delay: specs.length * DOOR_STAGGER + 1.8, entrance: 'drop' })
    }
  }

  private stepQueue(dt: number) {
    if (this.phase !== 'fight' || this.queue.length === 0) return
    for (const item of this.queue) item.delay -= dt
    while (this.queue.length && this.queue[0].delay <= 0) {
      const { spec, entrance } = this.queue.shift() as { spec: EnemySpec; entrance: Entrance }
      if (entrance === 'drop') {
        const angle = Math.random() * Math.PI * 2
        const [x, y] = this.freeSpotNear(this.player.x + Math.cos(angle) * 260, this.player.y + Math.sin(angle) * 180)
        this.enemies.push(new Enemy(spec, x, y, 'drop'))
        if (!this.alienWarned) {
          this.alienWarned = true
          this.events.banner('alien', 'Algo caiu do céu', 'um visitante se junta à fuga')
          this.events.cue('warp')
        }
      } else if (entrance === 'warp' && this.spawns) {
        const [sx, sy] = this.spawns[this.spawned++ % this.spawns.length]
        const [x, y] = this.freeSpotNear(sx, sy)
        this.enemies.push(new Enemy(spec, x, y, 'warp'))
        this.fx.ring(x, y, 170, 0.55, ELEMENTS[spec.element].glow)
        this.fx.sparks(ELEMENTS[spec.element].glow, x, y, 70 * S, 14, 360)
        this.events.cue('warp')
      } else {
        const [x, y] = this.site ? this.site.spawn : [this.player.x, this.player.y - 200]
        this.enemies.push(new Enemy(spec, x + (Math.random() - 0.5) * 40, y, 'door'))
        this.events.cue('door')
      }
      this.events.hud()
    }
  }

  private stepPlayer(dt: number, movement: Movement, input: BattleInput) {
    const player = this.player
    this.aimPoint = input.aim
    if (input.qte) this.gadgets.press(input.qte)
    if (input.fury) this.gadgets.startFury()
    if (input.gadget && this.action !== 'stun' && this.action !== 'down') this.gadgets.trigger(input.gadget)
    const recovery = this.status.recovery
    this.attackCooldown = Math.max(0, this.attackCooldown - dt * recovery)
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt * recovery)
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    this.dodgeAge += dt
    for (const [id, seconds] of this.cooldowns) {
      if (seconds > 0) this.cooldowns.set(id, Math.max(0, seconds - dt * recovery))
    }
    this.tabletLock = Math.max(0, this.tabletLock - dt)
    if (this.overheat > 0) this.overheat = Math.max(0, this.overheat - dt)
    if (this.adaptation > 0) {
      this.adaptationTimer -= dt
      if (this.adaptationTimer <= 0) {
        this.adaptation -= 1
        this.adaptationTimer = ADAPTATION_FADE
        this.events.hud()
      }
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt
      if (this.comboTimer <= 0) this.combo = 0
    }
    if (this.form) {
      this.formTimer -= dt
      if (this.formTimer <= 0) this.endForm()
    }
    const canAct = this.phase === 'fight' || this.phase === 'cleared' || this.phase === 'countdown'

    if (input.card) this.buffered = { kind: 'card', card: input.card, age: 0 }
    else if (input.dodge) this.buffered = { kind: 'dodge', card: null, age: 0 }
    else if (input.attack) this.buffered = { kind: 'attack', card: null, age: 0 }
    else if (input.shoot) this.buffered = { kind: 'shoot', card: null, age: 0 }
    if (this.buffered) {
      this.buffered.age += dt
      if (this.buffered.age > BUFFER_SECONDS) this.buffered = null
    }

    if (this.status.stunned && this.action !== 'down' && this.action !== 'stun' && this.action !== 'dash') {
      this.action = 'stun'
      this.actionTimer = this.status.left('choque')
    }

    if (this.action === 'attack' || this.action === 'shoot' || this.action === 'dodge' || this.action === 'hurt' || this.action === 'cast' || this.action === 'stun' || this.action === 'dash') {
      this.actionTimer -= dt
      if (this.action === 'attack' && !this.swung && ATTACK_SECONDS - this.actionTimer >= SWING_AT) this.swing()
      if (this.action === 'dash') this.stepDash(dt)
      if (this.actionTimer <= 0) {
        if (this.action === 'dash') this.endDash()
        this.action = 'idle'
        this.actionTimer = 0
      }
    }

    if (canAct && this.action !== 'down') {
      const free = this.action === 'idle' || this.action === 'guard'
      const cancellable = free || ((this.action === 'attack' || this.action === 'shoot') && this.swung && this.actionTimer < 0.12)
      if (input.guard && free && this.energy > 0 && !this.gadgets.blocksDodge) {
        if (this.action !== 'guard') {
          this.action = 'guard'
          this.guardTime = 0
        }
        this.guardTime += dt
        this.energy = Math.max(0, this.energy - GUARD_DRAIN * this.cls.guardDrain * dt)
        if (this.energy <= 0) this.action = 'idle'
      } else if (this.action === 'guard' && !input.guard) {
        this.action = 'idle'
      }
      const press = this.buffered
      if (press && this.gadgets.vehicle === 'tank' && (press.kind === 'attack' || press.kind === 'shoot')) {
        this.gadgets.fire()
        this.buffered = null
      } else if (
        press &&
        ((press.kind === 'card' && this.gadgets.blocksCards) || (press.kind === 'dodge' && this.gadgets.blocksDodge) || ((press.kind === 'attack' || press.kind === 'shoot') && this.gadgets.blocksAttack))
      ) {
        this.buffered = null
      } else if (press) {
        let used = false
        if (press.kind === 'dodge' && cancellable && this.action !== 'hurt' && this.action !== 'stun') used = this.startDodge(movement)
        else if (press.kind === 'card' && press.card && (free || cancellable)) used = this.playCard(press.card, movement)
        else if (press.kind === 'attack' && free && this.attackCooldown <= 0) used = this.startAttack(movement)
        else if (press.kind === 'shoot' && free && this.attackCooldown <= 0) used = this.startShot(movement)
        if (used) this.buffered = null
      }
    }

    if (this.action !== 'guard' && this.action !== 'dodge' && this.action !== 'dash' && this.overheat <= 0) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.baseRegen * this.cls.regen * this.formMod('regen') * dt)
    }

    let move: Movement = movement
    if (this.action === 'attack' || this.action === 'shoot' || this.action === 'hurt' || this.action === 'down' || this.action === 'stun' || this.action === 'cast') move = ZERO
    else if (this.action === 'guard') move = { x: movement.x * 0.45, y: movement.y * 0.45, magnitude: movement.magnitude * 0.45 }
    if (this.phase === 'versus' || this.phase === 'victory' || this.phase === 'enter' || this.phase === 'defeat' || this.gadgets.steering) move = ZERO
    const base = player.speedMultiplier
    if (this.action === 'dash') {
    } else if (this.action === 'dodge') {
      player.speedMultiplier = DODGE_DISTANCE / DODGE_SECONDS / WALK_SPEED
      const facing = player.facing
      player.update(dt, { x: this.dash[0], y: this.dash[1], magnitude: 1 })
      player.facing = facing
      this.imageClock -= dt
      if (this.imageClock <= 0) {
        this.imageClock = 0.035
        this.afterimage(TEAL, 0.26)
      }
    } else if (Math.abs(this.knockX) > 4 || Math.abs(this.knockY) > 4) {
      const speed = Math.hypot(this.knockX, this.knockY)
      player.speedMultiplier = speed / WALK_SPEED
      const facing = player.facing
      player.update(dt, { x: this.knockX / speed, y: this.knockY / speed, magnitude: 1 })
      player.facing = facing
      player.moving = false
      const damping = Math.exp(-8 * dt)
      this.knockX *= damping
      this.knockY *= damping
    } else {
      this.knockX = 0
      this.knockY = 0
      const facing = player.facing
      player.speedMultiplier = base * this.cls.speed * this.formMod('speed') * this.status.speed * this.gadgets.speedFactor
      player.update(dt, move)
      if (this.action === 'guard' || this.action === 'down') player.facing = facing
      else if (this.aimPoint && (this.action === 'idle' || this.action === 'attack' || this.action === 'shoot' || this.action === 'cast')) {
        player.facing = directionFromVector(this.aimPoint.x - player.x, this.aimPoint.y - player.y, player.facing, 0.05)
      }
    }
    player.speedMultiplier = base
    if (this.mode === 'ring') {
      const [x, y] = this.constrain(player.x, player.y, player.x, player.y)
      player.x = x
      player.y = y
    }
  }

  private target(movement: Movement, range: number): Enemy | null {
    const player = this.player
    const aim = this.aimPoint
    let best: Enemy | null = null
    let bestScore = Infinity
    const stick = aim ? Math.atan2(aim.y - player.y, aim.x - player.x) : movement.magnitude > 0.2 ? Math.atan2(movement.y, movement.x) : null
    for (const enemy of this.enemies) {
      if (!enemy.vulnerable) continue
      const dx = enemy.x - player.x
      const dy = enemy.y - player.y
      const distance = Math.hypot(dx, dy * 1.2)
      if (distance > range) continue
      let score = distance
      if (stick !== null) {
        let delta = Math.abs(Math.atan2(dy, dx) - stick) % (Math.PI * 2)
        if (delta > Math.PI) delta = Math.PI * 2 - delta
        if (aim) {
          const cursor = Math.hypot(enemy.x - aim.x, (enemy.y - aim.y) * 1.2)
          if (delta > AIM_CONE && cursor > AIM_SNAP * S * enemy.scale) continue
          score = Math.min(distance, cursor) * (1 + delta * 0.9)
        } else {
          score *= 1 + delta * 0.6
        }
      }
      if (score < bestScore) {
        bestScore = score
        best = enemy
      }
    }
    return best
  }

  private aim(movement: Movement, range: number): { angle: number; target: Enemy | null } {
    const player = this.player
    let target = this.target(movement, range)
    let angle: number
    if (target) angle = Math.atan2(target.y - player.y, target.x - player.x)
    else if (this.aimPoint) angle = Math.atan2(this.aimPoint.y - player.y, this.aimPoint.x - player.x)
    else if (movement.magnitude > 0.2) angle = Math.atan2(movement.y, movement.x)
    else angle = FACING_ANGLE[player.facing]
    if (this.status.dizzy) {
      angle += (Math.random() - 0.5) * 0.7
      target = null
    }
    player.facing = directionFromVector(Math.cos(angle), Math.sin(angle), player.facing, 0)
    return { angle, target }
  }

  private startAttack(movement: Movement) {
    const { angle, target } = this.aim(movement, AIM_RANGE)
    this.action = 'attack'
    this.actionTimer = ATTACK_SECONDS
    this.attackCooldown = this.weapon.stats.cooldown * this.cls.meleeCooldown
    this.swung = false
    this.wear.swings++
    this.swingAngle = angle
    this.events.cue('swing')
    const element = this.attackElement(target)
    const def = ELEMENTS[element]
    const heavy = this.weapon.stats.heavy || this.form === 'tita'
    const reach = (heavy ? 96 : 76) * S * (this.form === 'tita' ? 1.25 : 1)
    this.slashes.push({
      x: this.player.x + Math.cos(angle) * 54 * S,
      y: this.player.y - 44 * S + Math.sin(angle) * 30 * S,
      angle,
      age: 0,
      life: 0.22,
      radius: reach,
      color: def.color,
      glow: def.glow,
    })
    return true
  }

  private swing() {
    this.swung = true
    const player = this.player
    const angle = this.swingAngle
    const titan = this.form === 'tita'
    const hitX = player.x + Math.cos(angle) * 70 * S * (titan ? 1.2 : 1)
    const hitY = player.y + Math.sin(angle) * 44 * S * (titan ? 1.2 : 1)
    const heavy = this.weapon.stats.heavy || titan
    let landed = false
    let element: Element = this.core.element
    let burst: Enemy | null = null
    const extended = this.gadgets.perks.combo > 0
    for (const enemy of this.enemies) {
      if (!enemy.vulnerable) continue
      const reach = (92 + 28 * enemy.scale) * S * (titan ? 1.25 : 1)
      const distance = Math.hypot(enemy.x - hitX, (enemy.y - hitY) / 0.7)
      if (distance > reach) continue
      this.combo = this.comboTimer > 0 ? this.combo + 1 : 1
      this.comboTimer = this.gadgets.comboWindow(COMBO_WINDOW)
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo)
      const crit = (extended ? this.combo % 3 === 0 : this.combo >= 3) || Math.random() < 0.12 + this.cls.crit
      element = this.attackElement(enemy)
      const dealt = this.damageEnemy(enemy, this.meleeDamage * this.gadgets.comboFactor(this.combo), {
        fromX: player.x,
        fromY: player.y,
        force: 380 * this.knock,
        kind: 'melee',
        ailment: 0.3,
        crit,
        element,
        heavy,
      })
      if (dealt <= 0) continue
      landed = true
      if (extended) {
        if (this.combo % 6 === 0) burst = enemy
        else if (this.combo >= 4) this.popup(enemy.x + 34, enemy.y - 175 * S * enemy.scale, `×${this.combo}`, TEAL, 0.72)
      } else if (crit && this.combo >= 3) {
        this.popup(enemy.x, enemy.y - 150 * S * enemy.scale, `Combo ×${this.combo}`, TEAL, 0.85)
        this.combo = 0
      }
    }
    if (burst) this.comboBurst(burst)
    this.fx.swing(element, player.x + Math.cos(angle) * 30 * S, player.y - 40 * S, angle, 70 * S, heavy)
    if (landed && heavy) this.dust(hitX, hitY, 0.8)
  }

  private comboBurst(center: Enemy) {
    const combo = this.combo
    const radius = 190
    const finale = combo >= 18
    this.popup(center.x, center.y - 195 * S * center.scale, `Combo ×${combo}!`, GOLD, finale ? 1.45 : 1.1)
    this.fx.shockwave(this.core.element, center.x, center.y, radius)
    this.fx.ring(center.x, center.y, radius + 40, 0.45, GOLD)
    this.fx.sparks(GOLD, center.x, center.y, 70 * S * center.scale, finale ? 30 : 16, finale ? 640 : 460)
    this.events.cue('super')
    this.events.shake(finale ? 0.8 : 0.5)
    const power = this.gadgets.comboBurst(combo)
    for (const enemy of this.enemies) {
      if (!enemy.vulnerable) continue
      if (Math.hypot(enemy.x - center.x, (enemy.y - center.y) * 1.5) > radius) continue
      this.damageEnemy(enemy, this.meleeDamage * power, { fromX: center.x, fromY: center.y, force: 520, kind: 'card', ailment: 0.4, element: this.attackElement(enemy), heavy: true })
    }
    if (finale) this.combo = 0
  }

  private smash(enemy: Enemy, amount: number, force: number, fromX: number, fromY: number): number {
    if (!enemy.vulnerable) return 0
    const dealt = enemy.hit(amount, fromX, fromY, force)
    if (dealt <= 0) return 0
    this.popup(enemy.x, enemy.y - 110 * S * enemy.scale, `${dealt}`, GOLD, 1.35)
    this.fx.impact(this.core.element, enemy.x, enemy.y + 2, (50 + enemy.lift) * S * enemy.scale, 1.6)
    this.gainCharge(CHARGE.gadget)
    this.gadgets.onHit(enemy, dealt, false)
    this.excitement = 1
    if (!enemy.alive) this.scrap(enemy)
    this.events.hud()
    return dealt
  }

  private drain(enemy: Enemy, amount: number, color: RGB) {
    if (!enemy.alive) return
    enemy.health = Math.max(0, enemy.health - amount)
    enemy.flash = Math.max(enemy.flash, 0.3)
    this.popup(enemy.x + 24, enemy.y - 100 * S * enemy.scale, `-${amount}`, color, 0.6)
    if (enemy.health > 0) return
    enemy.state = 'dead'
    enemy.timer = 0.6
    enemy.cast = null
    this.scrap(enemy)
  }

  private loseHealth(amount: number) {
    this.health = Math.max(0, this.health - this.gadgets.absorb(amount))
  }

  private bolt(angle: number, damage: number, options: { speed: number; size: number; life: number; style: BoltStyle; ailment: number; element: Element }) {
    const player = this.player
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    this.bolts.push({
      x: player.x + dx * 40 * S,
      y: player.y + dy * 24 * S,
      vx: dx * options.speed,
      vy: dy * options.speed,
      age: 0,
      life: options.life,
      damage: Math.round(damage),
      owner: 'player',
      size: options.size,
      height: 58 * S,
      from: null,
      element: options.element,
      style: options.style,
      seed: Math.random(),
      ailment: options.ailment,
      reflected: false,
    })
  }

  private get boltStyle(): BoltStyle {
    return this.weapon.id === 'weapon-cannon' ? 'heavy' : this.weapon.id === 'weapon-laser' ? 'thin' : 'pulse'
  }

  private startShot(movement: Movement) {
    const cost = this.shotCost
    if (this.energy < cost) {
      this.events.cue('deny')
      this.popup(this.player.x, this.player.y - 130 * S, 'Sem energia', GREY, 0.75)
      this.attackCooldown = 0.25
      return true
    }
    const { angle, target } = this.aim(movement, 1000)
    this.energy -= cost
    this.action = 'shoot'
    this.actionTimer = SHOOT_SECONDS
    this.swung = true
    this.attackCooldown = Math.max(0.16, this.weapon.stats.cooldown * 0.85) * this.cls.shotCooldown * this.formMod('shotCooldown')
    const { bolt } = this.weapon.stats
    const element = this.attackElement(target)
    const extra = this.formMod('extraBolts')
    const angles = [angle]
    for (let i = 1; i <= extra; i++) angles.push(angle + 0.14 * i, angle - 0.14 * i)
    const extraPower = this.formMod('extraPower')
    angles.forEach((a, index) => this.bolt(a, this.shotDamage * (index === 0 ? 1 : extraPower) * (0.92 + Math.random() * 0.16), { ...bolt, style: this.boltStyle, ailment: 0.22, element }))
    this.events.cue('shoot')
    this.fx.muzzle(element, this.player.x + Math.cos(angle) * 46 * S, this.player.y + Math.sin(angle) * 20 * S, 58 * S, angle, this.boltStyle === 'heavy' ? 1.4 : 1)
    if (this.boltStyle === 'heavy') {
      this.knockX = -Math.cos(angle) * 260
      this.knockY = -Math.sin(angle) * 260
      this.events.shake(0.25)
    }
    this.events.hud()
    return true
  }

  private startDodge(movement: Movement) {
    const cost = this.dodgeCost
    if (this.dodgeCooldown > 0 || this.energy < cost) return false
    const player = this.player
    this.energy -= cost
    this.action = 'dodge'
    this.actionTimer = DODGE_SECONDS
    this.dodgeCooldown = DODGE_COOLDOWN
    this.dodgeAge = 0
    this.invulnerable = Math.max(this.invulnerable, DODGE_INVULNERABLE)
    this.dash = movement.magnitude > 0.2 ? [movement.x / movement.magnitude, movement.y / movement.magnitude] : FACING_VECTOR[player.facing]
    this.imageClock = 0
    this.events.cue('dodge')
    this.dust(player.x, player.y, 0.7)
    this.events.hud()
    return true
  }

  private afterimage(color: RGB, life: number) {
    const player = this.player
    this.afterimages.push({ x: player.x, y: player.y, facing: player.facing, frame: player.frame, moving: player.moving, scale: this.robotScale, age: 0, life, color, enemy: null })
  }

  private playCard(id: CardId, movement: Movement) {
    const card = CARDS[id]
    const player = this.player
    if (isSecretCard(id) && !this.unlockedCards.has(id)) {
      this.deny('Carta trancada')
      return true
    }
    if (!this.hand.includes(id)) {
      this.deny('Fora da mão')
      return true
    }
    const cooldown = this.cooldowns.get(id) ?? 0
    if (cooldown > 0) {
      this.deny('Recarregando')
      return true
    }
    if (this.tabletLock > 0) {
      this.deny('Tablet reiniciando')
      return true
    }
    if (card.kind === 'special') {
      const cost = this.cardCost(id)
      if (this.energy < cost) {
        this.deny('Sem energia')
        return true
      }
      this.energy -= cost
    } else {
      if (this.charge < CHARGE_FULL) {
        this.deny('Carga incompleta')
        return true
      }
      this.charge = 0
      this.chargeAnnounced = false
    }
    this.cooldowns.set(id, card.cooldown)
    this.tabletLock = card.kind === 'transform' ? TRANSFORM_LOCK : TABLET_LOCK
    this.stats.cards += 1
    this.excitement = Math.min(1, this.excitement + 0.4)
    const { angle, target } = this.aim(movement, 1000)
    const element = this.attackElement(target)
    this.events.cutin({ side: 'player', card: id, actor: BODY_NAME, element, phase: 'play' })
    this.events.cue('card')
    const adapted = card.kind === 'special' && card.power !== undefined
    if (adapted && this.adaptation > 0) this.popup(player.x, player.y - 150 * S, `Adaptados · −${Math.round((1 - this.adaptationFactor) * 100)}%`, GREY, 0.85)
    switch (id) {
      case 'rajada':
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS
        for (let i = -2; i <= 2; i++) {
          this.bolt(angle + i * 0.2, this.shotDamage * (card.power ?? 0.7) * this.cardPower, { speed: 1150, size: 15, life: 0.85, style: 'pulse', ailment: 0.3, element })
        }
        this.fx.muzzle(element, player.x + Math.cos(angle) * 46 * S, player.y + Math.sin(angle) * 20 * S, 58 * S, angle, 1.8)
        this.events.cue('shoot')
        this.events.shake(0.3)
        this.freeze = Math.max(this.freeze, 0.06)
        break
      case 'onda': {
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS + 0.1
        const radius = 340
        for (const enemy of this.enemies) {
          if (!enemy.vulnerable) continue
          if (Math.hypot(enemy.x - player.x, (enemy.y - player.y) * 1.5) > radius) continue
          this.damageEnemy(enemy, this.meleeDamage * (card.power ?? 1.4) * this.cardPower, { fromX: player.x, fromY: player.y, force: 760, kind: 'card', ailment: 0.6, element: this.attackElement(enemy), heavy: true })
        }
        this.fx.shockwave(element, player.x, player.y, radius)
        this.dust(player.x, player.y, 1.8)
        this.events.cue('heavy')
        this.events.shake(0.75)
        this.freeze = Math.max(this.freeze, 0.12)
        break
      }
      case 'investida':
        this.action = 'dash'
        this.actionTimer = DASH_SECONDS
        this.dash = [Math.cos(angle), Math.sin(angle)]
        this.dashPower = this.cardPower
        this.dashHits = new Set()
        this.invulnerable = Math.max(this.invulnerable, DASH_SECONDS + 0.12)
        this.imageClock = 0
        this.events.cue('dodge')
        this.dust(player.x, player.y, 1)
        break
      case 'chuva': {
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS + 0.05
        const focus = target ?? this.target(ZERO, 2000)
        const cx = focus ? focus.x : this.aimPoint ? this.aimPoint.x : player.x + Math.cos(angle) * 320
        const cy = focus ? focus.y : this.aimPoint ? this.aimPoint.y : player.y + Math.sin(angle) * 220
        for (let i = 0; i < 6; i++) {
          const spread = i === 0 ? 0 : 110 + Math.random() * 90
          const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6
          const [x, y] = this.constrain(cx + Math.cos(a) * spread, cy + Math.sin(a) * spread * 0.62, cx, cy)
          const delay = 0.55 + i * 0.14
          this.meteors.push({ x, y, radius: 105, delay, total: delay, damage: this.shotDamage * (card.power ?? 0.9) * this.cardPower, owner: 'player', element: focus ? this.attackElement(focus) : element, seed: Math.random(), from: null, ailment: 0.5 })
        }
        this.events.cue('warp')
        break
      }
      case 'enxame': {
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS
        const count = 8
        for (let i = 0; i < count; i++) {
          const a = angle + (i / count) * Math.PI * 2
          this.bolt(a, this.shotDamage * (card.power ?? 0.6) * this.cardPower, { speed: 520, size: 12, life: 1.6, style: 'pulse', ailment: 0.5, element })
          const spawned = this.bolts[this.bolts.length - 1]
          spawned.homing = 3.4
          spawned.height = (46 + (i % 3) * 10) * S
        }
        this.fx.ring(player.x, player.y, 220, 0.5, FORM_GLOW.enxame)
        this.fx.sparks(FORM_GLOW.enxame, player.x, player.y, 60 * S, 18, 420)
        this.events.cue('shoot')
        this.events.shake(0.25)
        break
      }
      case 'raizes': {
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS + 0.15
        const radius = 300
        for (const enemy of this.enemies) {
          if (!enemy.vulnerable) continue
          if (Math.hypot(enemy.x - player.x, (enemy.y - player.y) * 1.5) > radius) continue
          this.damageEnemy(enemy, this.meleeDamage * (card.power ?? 0.9) * this.cardPower, { fromX: player.x, fromY: player.y, force: 900, kind: 'card', ailment: 0.35, element: this.attackElement(enemy), heavy: true })
          if (enemy.alive) enemy.stagger(2)
        }
        this.fx.shockwave('terra', player.x, player.y, radius)
        this.fx.ring(player.x, player.y, radius + 40, 0.6, FORM_GLOW.raizes)
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2
          this.dust(player.x + Math.cos(a) * radius * 0.7, player.y + Math.sin(a) * radius * 0.45, 0.6)
        }
        this.events.cue('heavy')
        this.events.shake(0.7)
        this.freeze = Math.max(this.freeze, 0.14)
        break
      }
      case 'orvalho': {
        this.action = 'cast'
        this.actionTimer = CAST_SECONDS + 0.2
        this.status.clear()
        this.heal(Math.round(this.maxHealth * 0.25))
        this.energy = Math.min(this.maxEnergy, this.energy + 20)
        this.invulnerable = Math.max(this.invulnerable, 0.5)
        this.fx.ring(player.x, player.y, 260, 0.7, FORM_GLOW.orvalho)
        this.fx.sparks(FORM_GLOW.orvalho, player.x, player.y - 80 * S, 70 * S, 26, 360)
        for (let i = 0; i < 10; i++) this.fx.aura(FORM_GLOW.orvalho, player.x, player.y, 110 * S, 1.4)
        this.scene.playerFlash = 0.6
        this.events.cue('transform')
        break
      }
      default:
        this.startForm(id)
    }
    if (adapted) {
      this.adaptation += 1
      this.adaptationTimer = ADAPTATION_FADE
    }
    this.events.hud()
    return true
  }

  private deny(text: string) {
    this.events.cue('deny')
    this.popup(this.player.x, this.player.y - 130 * S, text, GREY, 0.75)
  }

  private stepDash(dt: number) {
    const player = this.player
    const fromX = player.x
    const fromY = player.y
    const [x, y] = this.constrain(player.x + this.dash[0] * DASH_SPEED * dt, player.y + this.dash[1] * DASH_SPEED * dt, fromX, fromY)
    player.x = x
    player.y = y
    player.moving = true
    player.facing = directionFromVector(this.dash[0], this.dash[1], player.facing, 0)
    this.imageClock -= dt
    if (this.imageClock <= 0) {
      this.imageClock = 0.025
      this.afterimage(ELEMENTS[this.core.element].color, 0.3)
      this.fx.aura(ELEMENTS[this.core.element].glow, player.x, player.y, 90 * S, 1.4)
    }
    for (const enemy of this.enemies) {
      if (!enemy.vulnerable || this.dashHits.has(enemy.id)) continue
      if (Math.hypot(enemy.x - player.x, (enemy.y - player.y) / 0.7) > (80 + 30 * enemy.scale) * S) continue
      this.dashHits.add(enemy.id)
      this.damageEnemy(enemy, this.meleeDamage * (CARDS.investida.power ?? 1) * this.dashPower, {
        fromX: player.x - this.dash[0] * 40,
        fromY: player.y - this.dash[1] * 40,
        force: 640,
        kind: 'card',
        ailment: 0.5,
        element: this.attackElement(enemy),
        heavy: true,
      })
    }
  }

  private endDash() {
    this.dust(this.player.x, this.player.y, 1.2)
    this.events.shake(0.3)
    this.player.moving = false
  }

  private startForm(id: CardId) {
    const card = CARDS[id]
    const player = this.player
    this.form = id
    this.formTimer = card.duration ?? 9
    this.formTotal = this.formTimer
    this.stats.forms += 1
    this.action = 'cast'
    this.actionTimer = 0.45
    this.invulnerable = Math.max(this.invulnerable, 0.6)
    this.status.clear()
    const glow = FORM_GLOW[id]
    this.fx.shockwave(this.core.element, player.x, player.y, 280)
    this.fx.ring(player.x, player.y, 360, 0.7, glow)
    this.fx.sparks(glow, player.x, player.y, 70 * S, 28, 520)
    for (let i = 0; i < 16; i++) this.fx.aura(glow, player.x, player.y, 120 * S, 1.6)
    this.popup(player.x, player.y - 170 * S, card.name, glow, 1.1)
    this.scene.flash = Math.max(this.scene.flash, 0.28)
    this.scene.playerFlash = 1
    this.freeze = Math.max(this.freeze, 0.32)
    this.excitement = 1
    this.events.cue('transform')
    this.events.shake(0.55)
  }

  private endForm() {
    if (!this.form) return
    const overheat = CARDS[this.form].form?.overheat ?? 0
    this.form = null
    this.formTimer = 0
    if (overheat > 0) {
      this.overheat = overheat
      this.popup(this.player.x, this.player.y - 150 * S, 'Superaquecido', RED, 0.85)
      this.fx.sparks(RED, this.player.x, this.player.y, 60 * S, 18, 380)
      this.smoke(this.player.x, this.player.y, 0.8)
      this.events.cue('deny')
    } else {
      this.popup(this.player.x, this.player.y - 150 * S, 'Forma desfeita', GREY, 0.75)
    }
    this.fx.puff(this.core.element, this.player.x, this.player.y, 1)
    this.events.hud()
  }

  private gainCharge(amount: number) {
    if (this.form) amount *= 0.35
    this.charge = Math.min(CHARGE_FULL, this.charge + amount)
    if (this.charge >= CHARGE_FULL && !this.chargeAnnounced) {
      this.chargeAnnounced = true
      this.popup(this.player.x, this.player.y - 160 * S, 'Carga completa!', GOLD, 0.95)
      this.events.cue('ready')
      this.fx.ring(this.player.x, this.player.y, 200, 0.5, GOLD)
    }
  }

  private damageEnemy(
    enemy: Enemy,
    base: number,
    options: { fromX: number; fromY: number; force: number; kind: 'melee' | 'shot' | 'card' | 'gadget'; ailment: number; element: Element; crit?: boolean; heavy?: boolean; quiet?: boolean; soft?: boolean },
  ): number {
    if (!enemy.vulnerable) return 0
    const head = enemy.y - 110 * S * enemy.scale
    if (this.status.blinded && Math.random() < 0.5) {
      this.popup(enemy.x, head, 'Errou!', GREY, 0.8)
      return 0
    }
    if (enemy.phase > 0 && Math.random() < enemy.phase) {
      this.popup(enemy.x, head, 'Atravessou', [150, 225, 255], 0.8)
      return 0
    }
    const element = options.element
    const result = effectiveness(element, enemy.element)
    let factor = EFFECT_FACTOR[result]
    if (result === 'super') factor = 1 + (factor - 1) * this.cls.element
    if (element === 'raio' && enemy.status.conductive) factor *= 1.5
    const crit = options.crit ?? false
    const backstab = this.gadgets.backstab(enemy)
    const damage = Math.max(1, Math.round(base * (1 + this.gadgets.damageBonus) * backstab * factor * enemy.armor * (crit ? 1.6 : 1) * (0.92 + Math.random() * 0.16)))
    const dealt = enemy.hit(damage, options.fromX, options.fromY, options.force * (crit ? 1.4 : 1))
    if (dealt <= 0) return 0
    if (result === 'super') this.stats.supers += 1
    const chance = this.formFlag('sureAilment') ? 1 : options.ailment * this.cls.ailment * this.formMod('ailmentBoost')
    if (enemy.alive && Math.random() < chance) this.inflictEnemy(enemy, element, options.fromX, options.fromY)
    if (enemy.status.drained) this.heal(Math.max(1, Math.round(dealt * 0.5)))
    this.gainCharge(CHARGE[options.kind])
    this.gadgets.onHit(enemy, dealt, options.quiet ?? false)
    if (options.quiet) {
      if (!enemy.alive) {
        this.scrap(enemy)
        this.events.hud()
      }
      return dealt
    }
    const def = ELEMENTS[element]
    this.popup(enemy.x, head, crit || backstab > 1 ? `${dealt}!` : `${dealt}`, result === 'super' || backstab > 1 ? GOLD : crit ? WHITE : def.glow, crit ? 1.35 : result === 'super' || backstab > 1 ? 1.2 : 1)
    if (result !== 'normal') this.effectPopup(enemy, result)
    const power = options.kind === 'card' ? 1.5 : options.kind === 'shot' ? 0.75 : options.heavy ? 1.3 : 1
    this.fx.impact(element, enemy.x, enemy.y + 2, (50 + enemy.lift) * S * enemy.scale, power)
    this.events.cue(options.kind === 'melee' && options.heavy ? 'heavy' : 'hit')
    this.events.cue(ELEMENT_CUE[element])
    if (result === 'super') this.events.cue('super')
    this.freeze = Math.max(this.freeze, options.soft ? HIT_STOP * 0.4 : crit ? CRIT_STOP : options.kind === 'shot' ? HIT_STOP * 0.6 : HIT_STOP)
    this.events.shake(options.soft ? 0.14 : crit ? 0.5 : options.heavy ? 0.45 : options.kind === 'shot' ? 0.18 : 0.24)
    this.excitement = Math.min(1, this.excitement + (crit ? 0.18 : 0.06))
    if (!enemy.alive) this.scrap(enemy)
    this.events.hud()
    return dealt
  }

  private effectPopup(enemy: Enemy, result: Effectiveness) {
    const last = this.effectShown.get(enemy.id) ?? -9
    if (this.elapsed - last < 0.5) return
    this.effectShown.set(enemy.id, this.elapsed)
    const color: RGB = result === 'super' ? GOLD : GREY
    this.popup(enemy.x, enemy.y - 165 * S * enemy.scale, EFFECT_LABEL[result], color, result === 'super' ? 0.95 : 0.7)
  }

  private inflictEnemy(enemy: Enemy, element: Element, fromX: number, fromY: number) {
    const ailment = ELEMENTS[element].ailment
    if (enemy.steady && (ailment === 'abalado' || ailment === 'arrastado')) return
    const fresh = enemy.status.apply(ailment)
    const dx = enemy.x - fromX
    const dy = enemy.y - fromY
    const length = Math.hypot(dx, dy) || 1
    switch (ailment) {
      case 'choque':
        enemy.stagger(AILMENTS.choque.duration)
        break
      case 'abalado':
        enemy.stagger(AILMENTS.abalado.duration)
        enemy.kx += (dx / length) * 420 * enemy.def.pushback
        enemy.ky += (dy / length) * 260 * enemy.def.pushback
        break
      case 'arrastado':
        enemy.interrupt()
        enemy.kx += (dx / length) * 620 * enemy.def.pushback
        enemy.ky += (dy / length) * 380 * enemy.def.pushback
        break
    }
    if (fresh) {
      this.stats.ailments += 1
      this.popup(enemy.x + 30, enemy.y - 140 * S * enemy.scale, AILMENTS[ailment].name, ELEMENTS[element].glow, 0.72)
    }
  }

  private inflictPlayer(element: Element, fromX: number, fromY: number) {
    const ailment = ELEMENTS[element].ailment
    if (this.formFlag('steady') && (ailment === 'abalado' || ailment === 'arrastado')) return
    const fresh = this.status.apply(ailment)
    const player = this.player
    const dx = player.x - fromX
    const dy = player.y - fromY
    const length = Math.hypot(dx, dy) || 1
    switch (ailment) {
      case 'choque':
        this.action = 'stun'
        this.actionTimer = AILMENTS.choque.duration
        break
      case 'abalado':
        this.knockX += (dx / length) * 340
        this.knockY += (dy / length) * 220
        break
      case 'arrastado':
        this.knockX += (dx / length) * 520
        this.knockY += (dy / length) * 320
        break
    }
    if (fresh) this.popup(player.x + 30, player.y - 150 * S, AILMENTS[ailment].name, ELEMENTS[element].glow, 0.72)
  }

  private heal(amount: number) {
    if (this.health <= 0) return
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.popup(this.player.x - 20, this.player.y - 120 * S, `+${amount}`, HEAL, 0.8)
  }

  private hurt(damage: number, fromX: number, fromY: number, source: Enemy | null, bolt: Bolt | null, element: Element, ailmentChance: number, heavy = false) {
    const player = this.player
    if (this.action === 'down' || this.phase === 'victory' || this.phase === 'defeat') return
    const head = player.y - 140 * S
    if (this.invulnerable > 0 || this.action === 'dodge' || this.action === 'dash') {
      if (this.action === 'dodge') {
        const perfect = this.dodgeAge <= PERFECT_DODGE
        this.popup(player.x, head, perfect ? 'Esquiva perfeita!' : 'Esquivou', TEAL, perfect ? 0.95 : 0.8)
        this.energy = Math.min(this.maxEnergy, this.energy + (perfect ? 14 : 8))
        if (perfect) {
          this.gainCharge(CHARGE.perfect)
          this.freeze = Math.max(this.freeze, 0.16)
          this.events.cue('parry')
          source?.stagger(0.6)
        }
      }
      return
    }
    if (this.gadgets.evade(damage, heavy || Boolean(source?.isBoss))) return
    const phase = this.formMod('phase')
    if (phase > 0 && Math.random() < phase) {
      this.popup(player.x, head, 'Atravessou', [150, 225, 255], 0.8)
      this.afterimage([150, 225, 255], 0.35)
      return
    }
    if (source && source.status.blinded && Math.random() < 0.5) {
      this.popup(source.x, source.y - 120 * S * source.scale, 'Errou!', GREY, 0.8)
      return
    }
    const dx = player.x - fromX
    const dy = player.y - fromY
    const length = Math.hypot(dx, dy) || 1
    if (this.action === 'guard') {
      if (this.guardTime <= this.parryWindow) {
        this.stats.parries += 1
        this.events.cue('parry')
        this.popup(player.x, head, 'Aparo!', TEAL, 1.2)
        this.fx.sparks(TEAL, player.x - (dx / length) * 40, player.y, 60 * S, 16, 480)
        this.fx.ring(player.x, player.y, 150, 0.35, TEAL)
        this.freeze = Math.max(this.freeze, 0.16)
        this.events.shake(0.3)
        this.energy = Math.min(this.maxEnergy, this.energy + 18)
        this.gainCharge(CHARGE.parry)
        this.excitement = Math.min(1, this.excitement + 0.3)
        source?.stagger(1.3)
        if (bolt && !bolt.reflected) {
          const prism = this.formFlag('prism')
          bolt.owner = 'player'
          bolt.vx = -bolt.vx * 1.15
          bolt.vy = -bolt.vy * 1.15
          bolt.age = 0
          bolt.life = 0.9
          bolt.damage = Math.round(bolt.damage * (prism ? 2 : 1.6))
          bolt.element = prism && bolt.from ? counterOf(bolt.from.element) : this.core.element
          bolt.reflected = true
          bolt.from = null
        }
        this.events.hud()
        return
      }
      const soaked = Math.max(1, Math.round(damage * GUARD_FACTOR * this.armor * this.gadgets.armorFactor))
      this.loseHealth(soaked)
      this.wear.damageTaken += soaked
      this.wear.guardedTaken += soaked
      this.energy = Math.max(0, this.energy - damage * 0.7 * this.cls.guardDrain)
      this.events.cue('guard')
      this.popup(player.x, head + 10, `${soaked}`, GREY, 0.8)
      this.fx.sparks(GREY, player.x - (dx / length) * 30, player.y, 60 * S, 6, 240)
      if (!this.formFlag('steady') && !this.gadgets.steady) {
        this.knockX = (dx / length) * 160
        this.knockY = (dy / length) * 100
      }
      if (this.energy <= 0) {
        this.action = 'hurt'
        this.actionTimer = 0.4
        this.popup(player.x, head - 20, 'Guarda quebrada', RED, 0.8)
      }
      this.gadgets.onHurt(soaked)
      this.events.hud()
      if (this.health <= 0) this.defeat()
      return
    }
    const result = effectiveness(element, this.core.element)
    let factor = EFFECT_FACTOR[result]
    if (result === 'super' && source) factor = 1 + (factor - 1) * source.cls.element
    if (element === 'raio' && this.status.conductive) factor *= 1.5
    const final = Math.max(1, Math.round(damage * factor * this.armor * this.gadgets.armorFactor))
    this.loseHealth(final)
    this.wear.damageTaken += final
    if (bolt) this.wear.shotTaken += final
    else this.wear.meleeTaken += final
    this.combo = 0
    this.events.cue('hurt')
    this.events.cue(ELEMENT_CUE[element])
    this.scene.playerFlash = 1
    this.popup(player.x, head + 10, `-${final}`, RED, 1.1)
    if (result !== 'normal') this.popup(player.x, head - 26, EFFECT_LABEL[result], result === 'super' ? RED : GREY, 0.7)
    this.fx.impact(element, player.x, player.y + 2, 60 * S * this.robotScale, 0.9)
    this.events.shake(0.45)
    this.freeze = Math.max(this.freeze, 0.05)
    this.gainCharge(CHARGE.hurt)
    if (source && source.alive && this.status.drained) {
      source.health = Math.min(source.maxHealth, source.health + Math.round(final * 0.5))
    }
    if (!this.formFlag('steady') && !this.gadgets.steady) {
      this.action = 'hurt'
      this.actionTimer = HURT_SECONDS
      this.knockX = (dx / length) * 320
      this.knockY = (dy / length) * 200
    }
    this.invulnerable = HURT_INVULNERABLE
    if (this.health > 0 && Math.random() < ailmentChance * (source?.cls.ailment ?? 1)) this.inflictPlayer(element, fromX, fromY)
    this.gadgets.onHurt(final)
    this.events.hud()
    if (this.health <= 0) this.defeat()
  }

  private scrap(enemy: Enemy) {
    const bounty = Math.max(5, Math.round(enemy.def.bounty * enemy.spec.tier * (enemy.isBoss ? 1 : SCRAP_SHARE) / 5) * 5)
    this.bounties += bounty
    this.kills += 1
    this.excitement = 1
    this.gainCharge(CHARGE.ko)
    this.events.cue('ko')
    this.events.reward(bounty)
    this.freeze = Math.max(this.freeze, CRIT_STOP * 1.4)
    this.events.shake(0.6)
    const top = enemy.y - 150 * S * enemy.scale
    this.popup(enemy.x, top, `+${bounty} ¢`, GOLD, 1.25)
    const body = 60 * S * enemy.scale
    this.fx.sparks(enemy.def.glow, enemy.x, enemy.y, body, 22, 560)
    this.fx.impact(enemy.element, enemy.x, enemy.y, body, 1.6)
    this.smoke(enemy.x, enemy.y, 1.2 * enemy.scale)
    this.scene.addRing(enemy.x, enemy.y, 180 * enemy.scale, 0.5, 0.5, true)
    this.coins(enemy.x, enemy.y)
    this.events.hud()
  }

  private readonly enemyEvents = {
    strike: (enemy: Enemy, damage: number, reach: number) => {
      const player = this.player
      const scaledReach = reach * S * (enemy.form === 'tita' ? 1.25 : 1)
      const distance = Math.hypot(player.x - enemy.x, (player.y - enemy.y) / 0.8)
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
      if (enemy.def.behaviour === 'bruiser') {
        this.events.cue('heavy')
        this.events.shake(0.6)
        this.dust(enemy.x, enemy.y, 1.6)
        this.fx.shockwave(enemy.element, enemy.x, enemy.y, scaledReach)
      } else {
        this.events.cue('swing')
        this.fx.swing(enemy.element, enemy.x + Math.cos(angle) * 30 * S, enemy.y - 40 * S, angle, 60 * S * enemy.scale, false)
      }
      if (distance > scaledReach + 16 || this.gadgets.enemyMiss(enemy)) return
      this.hurt(damage, enemy.x, enemy.y, enemy, null, enemy.element, enemy.def.behaviour === 'bruiser' ? 0.35 : 0.25, enemy.isBoss || (enemy.def.behaviour === 'bruiser' && enemy.level >= 25))
    },
    shoot: (enemy: Enemy, shot: Shot, damage: number) => {
      if (this.gadgets.enemyMiss(enemy)) return
      const angle = Math.atan2(this.player.y - 30 * S - enemy.y, this.player.x - enemy.x)
      const angles = enemy.form === 'sobrecarga' ? [angle, angle - 0.16, angle + 0.16] : [angle]
      for (const a of angles) this.enemyBolt(enemy, a, damage, shot)
      this.events.cue('bolt')
      this.fx.muzzle(enemy.element, enemy.x + Math.cos(angle) * 30 * S, enemy.y + Math.sin(angle) * 16 * S, (56 * enemy.scale + enemy.lift) * S, angle, enemy.kind === 'alien' ? 1.3 : 1)
    },
    announce: (enemy: Enemy, card: CardId) => {
      this.events.cutin({ side: 'enemy', card, actor: enemy.def.name, element: enemy.element, phase: 'charge' })
      this.events.cue('select')
    },
    special: (enemy: Enemy, card: CardId, targetX: number, targetY: number) => this.enemySpecial(enemy, card, targetX, targetY),
    transform: (enemy: Enemy, card: CardId) => {
      enemy.wear(card)
      if (card === 'prisma') enemy.element = counterOf(this.core.element)
      const glow = FORM_GLOW[card]
      this.fx.shockwave(enemy.element, enemy.x, enemy.y, 240)
      this.fx.ring(enemy.x, enemy.y, 320, 0.6, glow)
      this.fx.sparks(glow, enemy.x, enemy.y, 60 * S * enemy.scale, 22, 480)
      this.popup(enemy.x, enemy.y - 170 * S * enemy.scale, CARDS[card].name, glow, 1)
      this.freeze = Math.max(this.freeze, 0.24)
      this.excitement = 1
      this.events.cue('transform')
      this.events.shake(0.5)
      this.events.cutin({ side: 'enemy', card, actor: enemy.def.name, element: enemy.element, phase: 'play' })
      this.events.hud()
    },
    cue: (name: Cue, duration?: number) => this.events.cue(name, duration),
    dust: (x: number, y: number, amount: number) => this.dust(x, y, amount),
  }

  private enemyBolt(enemy: Enemy, angle: number, damage: number, shot: Shot, speedFactor = 1, heavy = false) {
    this.bolts.push({
      x: enemy.x + Math.cos(angle) * 20 * S,
      y: enemy.y + Math.sin(angle) * 10 * S,
      vx: Math.cos(angle) * shot.speed * speedFactor,
      vy: Math.sin(angle) * shot.speed * speedFactor,
      age: 0,
      life: shot.life,
      damage,
      owner: 'enemy',
      size: shot.size,
      height: (56 * enemy.scale + enemy.lift) * S,
      from: enemy,
      element: enemy.element,
      style: enemy.kind === 'alien' ? 'heavy' : 'pulse',
      seed: Math.random(),
      ailment: 0.2,
      reflected: false,
      heavy,
    })
  }

  private enemySpecial(enemy: Enemy, card: CardId, targetX: number, targetY: number) {
    this.events.cutin({ side: 'enemy', card, actor: enemy.def.name, element: enemy.element, phase: 'play' })
    switch (card) {
      case 'rajada': {
        const shot: Shot = enemy.def.shot ?? { speed: 640, life: 1.1, damage: 8, size: 14 }
        const damage = Math.round((enemy.shotDamage || enemy.strikeDamage * 0.6) * 0.7)
        const angle = Math.atan2(targetY - 30 * S - enemy.y, targetX - enemy.x)
        for (let i = -2; i <= 2; i++) this.enemyBolt(enemy, angle + i * 0.19, damage, shot, 1.1, true)
        this.events.cue('bolt')
        this.fx.muzzle(enemy.element, enemy.x, enemy.y, 56 * S, angle, 1.6)
        break
      }
      case 'onda': {
        const radius = 300
        this.fx.shockwave(enemy.element, enemy.x, enemy.y, radius)
        this.dust(enemy.x, enemy.y, 2)
        this.events.cue('heavy')
        this.events.shake(0.8)
        const player = this.player
        if (Math.hypot(player.x - enemy.x, (player.y - enemy.y) * 1.5) <= radius) this.hurt(Math.round(enemy.strikeDamage * 1.15), enemy.x, enemy.y, enemy, null, enemy.element, 0.6, true)
        break
      }
      case 'investida':
        enemy.rush(targetX - enemy.x, targetY - enemy.y, 0.42)
        this.events.cue('dodge')
        break
      case 'chuva': {
        for (let i = 0; i < 4; i++) {
          const spread = i === 0 ? 0 : 100 + Math.random() * 80
          const a = Math.random() * Math.PI * 2
          const [x, y] = this.constrain(targetX + Math.cos(a) * spread, targetY + Math.sin(a) * spread * 0.62, targetX, targetY)
          const delay = 0.75 + i * 0.2
          this.meteors.push({ x, y, radius: 100, delay, total: delay, damage: Math.round(enemy.strikeDamage * 0.85), owner: 'enemy', element: enemy.element, seed: Math.random(), from: enemy, ailment: 0.45 })
        }
        this.events.cue('warp')
        break
      }
    }
  }

  private stepRushes() {
    const player = this.player
    for (const enemy of this.enemies) {
      if (enemy.state !== 'rush') continue
      if (Math.random() < 0.8) this.afterimages.push({ x: enemy.x, y: enemy.y, facing: enemy.facing, frame: enemy.frame, moving: true, scale: enemy.scale * S, age: 0, life: 0.25, color: ELEMENTS[enemy.element].color, enemy })
      if (enemy.rushHit) continue
      if (Math.hypot(player.x - enemy.x, (player.y - enemy.y) / 0.8) > (enemy.def.reach + 30) * S) continue
      enemy.rushHit = true
      this.hurt(Math.round(enemy.strikeDamage * 1.2), enemy.x, enemy.y, enemy, null, enemy.element, 0.5, true)
    }
  }

  private separateBodies() {
    const solids = this.enemies.filter((enemy) => enemy.vulnerable && !enemy.hovering && enemy.form !== 'fantasma' && enemy.state !== 'rush')
    if (solids.length === 0) return
    const playerSolid = this.phase !== 'defeat' && this.action !== 'dodge' && this.action !== 'dash' && this.form !== 'fantasma'
    const playerRadius = BODY_RADIUS * this.robotScale
    const playerMass = this.form === 'tita' ? 2 : 1
    for (let i = 0; i < solids.length; i++) {
      const enemy = solids[i]
      const radius = BODY_RADIUS * S * enemy.scale
      if (playerSolid) this.pushApart(this.player, playerRadius, playerMass, enemy, radius, this.bodyMass(enemy))
      for (let j = i + 1; j < solids.length; j++) {
        const other = solids[j]
        this.pushApart(enemy, radius, this.bodyMass(enemy), other, BODY_RADIUS * S * other.scale, this.bodyMass(other))
      }
    }
  }

  private bodyMass(enemy: Enemy) {
    return (enemy.def.behaviour === 'bruiser' ? 2.4 : 1) * (enemy.form === 'tita' ? 2 : 1)
  }

  private pushApart(a: Body, radiusA: number, massA: number, b: Body, radiusB: number, massB: number) {
    const dx = b.x - a.x
    const dy = (b.y - a.y) / BODY_DEPTH
    const distance = Math.hypot(dx, dy)
    const overlap = radiusA + radiusB - distance
    if (overlap <= 0) return
    const nx = distance > 0.01 ? dx / distance : 1
    const ny = distance > 0.01 ? dy / distance : 0
    const shareB = massA / (massA + massB)
    const wantedBx = b.x + nx * overlap * shareB
    const wantedBy = b.y + ny * overlap * shareB * BODY_DEPTH
    const [bx, by] = this.constrain(wantedBx, wantedBy, b.x, b.y)
    const shareA = 1 - shareB
    const [ax, ay] = this.constrain(
      a.x - nx * overlap * shareA - (wantedBx - bx),
      a.y - ny * overlap * shareA * BODY_DEPTH - (wantedBy - by),
      a.x,
      a.y,
    )
    a.x = ax
    a.y = ay
    b.x = bx
    b.y = by
  }

  private stepAilments(dt: number) {
    this.ailmentClock -= dt
    const emit = this.ailmentClock <= 0
    if (emit) this.ailmentClock = 0.09
    const burns = this.status.update(dt)
    if (burns > 0 && this.health > 0 && this.phase !== 'victory' && this.phase !== 'defeat') {
      const amount = Math.max(1, Math.round(this.maxHealth * 0.018)) * burns
      this.loseHealth(amount)
      this.popup(this.player.x + 24, this.player.y - 110 * S, `-${amount}`, ELEMENTS.fogo.color, 0.65)
      this.events.hud()
      if (this.health <= 0) this.defeat()
    }
    if (emit) for (const ailment of this.status.list()) this.fx.ailment(ailment, this.player.x, this.player.y, 110 * this.robotScale)
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const ticks = enemy.status.update(dt)
      if (ticks > 0 && enemy.vulnerable) {
        const amount = Math.max(1, Math.round(enemy.maxHealth * 0.03)) * ticks
        enemy.health = Math.max(0, enemy.health - amount)
        enemy.flash = Math.max(enemy.flash, 0.4)
        this.popup(enemy.x + 24, enemy.y - 100 * S * enemy.scale, `-${amount}`, ELEMENTS.fogo.color, 0.65)
        if (enemy.health <= 0) {
          enemy.state = 'dead'
          enemy.timer = 0.6
          enemy.cast = null
          this.scrap(enemy)
        }
      }
      if (emit) for (const ailment of enemy.status.list()) this.fx.ailment(ailment, enemy.x, enemy.y, (100 * enemy.scale + enemy.lift) * S)
    }
  }

  private steerBolt(bolt: Bolt, dt: number) {
    let best: Enemy | null = null
    let bestDistance = 620
    for (const enemy of this.enemies) {
      if (!enemy.vulnerable) continue
      const distance = Math.hypot(enemy.x - bolt.x, enemy.y - bolt.y)
      if (distance < bestDistance) {
        bestDistance = distance
        best = enemy
      }
    }
    if (!best) return
    const speed = Math.hypot(bolt.vx, bolt.vy)
    const current = Math.atan2(bolt.vy, bolt.vx)
    const wanted = Math.atan2(best.y - 40 * S * best.scale - bolt.y, best.x - bolt.x)
    let delta = wanted - current
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const turn = Math.max(-(bolt.homing ?? 0) * dt, Math.min((bolt.homing ?? 0) * dt, delta))
    bolt.vx = Math.cos(current + turn) * speed
    bolt.vy = Math.sin(current + turn) * speed
  }

  private stepBolts(dt: number) {
    const player = this.player
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i]
      bolt.age += dt
      if (bolt.homing && bolt.owner === 'player') this.steerBolt(bolt, dt)
      bolt.x += bolt.vx * dt
      bolt.y += bolt.vy * dt
      this.fx.trail(bolt, dt)
      let spent = bolt.age >= bolt.life
      if (!spent && this.mode === 'open' && !isWalkable(bolt.x, bolt.y)) spent = true
      if (!spent && this.mode === 'ring' && !this.insideBounds(bolt.x, bolt.y, 10)) spent = true
      if (!spent && bolt.owner === 'player') {
        for (const enemy of this.enemies) {
          if (!enemy.vulnerable) continue
          if (Math.hypot(enemy.x - bolt.x, (enemy.y - bolt.y) / 0.8) > bolt.size + 44 * S * enemy.scale) continue
          this.damageEnemy(enemy, bolt.damage, {
            fromX: bolt.x - bolt.vx * 0.05,
            fromY: bolt.y - bolt.vy * 0.05,
            force: bolt.style === 'heavy' ? 420 : 220,
            kind: 'shot',
            ailment: bolt.ailment,
            element: bolt.element,
            heavy: bolt.style === 'heavy',
          })
          spent = true
          break
        }
      } else if (!spent && bolt.owner === 'enemy' && Math.hypot(player.x - bolt.x, (player.y - bolt.y) / 0.8) <= bolt.size + 34 * this.robotScale) {
        const before = bolt.owner
        this.hurt(bolt.damage, bolt.x - bolt.vx * 0.1, bolt.y - bolt.vy * 0.1, bolt.from, bolt, bolt.element, bolt.ailment, bolt.heavy ?? false)
        spent = bolt.owner === before
      }
      if (spent) {
        if (bolt.age < bolt.life) this.fx.impact(bolt.element, bolt.x, bolt.y, bolt.height, 0.45)
        this.bolts.splice(i, 1)
      }
    }
  }

  private stepMeteors(dt: number) {
    const player = this.player
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i]
      meteor.delay -= dt
      if (meteor.delay > 0) continue
      this.meteors.splice(i, 1)
      this.fx.impact(meteor.element, meteor.x, meteor.y, 10, 1.5)
      this.dust(meteor.x, meteor.y, 1.1)
      this.events.cue('heavy')
      this.events.shake(0.35)
      if (meteor.owner === 'player') {
        for (const enemy of this.enemies) {
          if (!enemy.vulnerable) continue
          if (Math.hypot(enemy.x - meteor.x, (enemy.y - meteor.y) * 1.6) > meteor.radius + 30 * S * enemy.scale) continue
          this.damageEnemy(enemy, meteor.damage, { fromX: meteor.x, fromY: meteor.y, force: 380, kind: 'card', ailment: meteor.ailment, element: meteor.element, heavy: true })
        }
      } else if (Math.hypot(player.x - meteor.x, (player.y - meteor.y) * 1.6) <= meteor.radius + 20 * S) {
        this.hurt(meteor.damage, meteor.x, meteor.y, meteor.from, null, meteor.element, meteor.ailment, true)
      }
    }
  }

  private stepLook(realDt: number, dt: number) {
    const target = S * (this.form === 'tita' ? 1.3 : 1)
    this.robotScale += (target - this.robotScale) * (1 - Math.exp(-realDt * 9))
    this.scene.playerScale = this.robotScale * (1 + 0.32 * this.gadgets.lift)
    this.scene.playerFlash = Math.max(0, this.scene.playerFlash - realDt * 6)
    this.scene.flash = Math.max(0, this.scene.flash - realDt * 1.6)
    this.scene.playerAlpha = this.gadgets.vehicle ? 0 : this.action === 'dodge' ? 0.55 : this.form === 'fantasma' ? 0.6 : 1
    if (!this.form) return
    const player = this.player
    const glow = FORM_GLOW[this.form]
    const height = 120 * this.robotScale
    switch (this.form) {
      case 'tita':
        if (Math.random() < dt * 30) this.fx.aura(glow, player.x, player.y, height, 1.2)
        if (player.moving && Math.random() < dt * 6) this.dust(player.x, player.y, 0.5)
        break
      case 'fantasma':
        this.imageClock -= dt
        if (this.imageClock <= 0 && this.action !== 'dodge' && this.action !== 'dash') {
          this.imageClock = player.moving ? 0.07 : 0.16
          this.afterimage(glow, 0.4)
        }
        if (Math.random() < dt * 14) this.fx.aura(glow, player.x, player.y, height, 0.8)
        break
      case 'sobrecarga':
        if (Math.random() < dt * 34) this.fx.aura(glow, player.x, player.y, height, 1)
        if (Math.random() < dt * 5) this.fx.ailment('choque', player.x, player.y, height)
        break
      case 'prisma': {
        const hue = ELEMENTS[ORDER[Math.floor(this.elapsed * 6) % ORDER.length]].glow
        if (Math.random() < dt * 30) this.fx.aura(hue, player.x, player.y, height, 1)
        break
      }
    }
  }

  private insideBounds(x: number, y: number, margin: number) {
    const { x0, y0, x1, y1 } = this.ring.bounds
    return x >= x0 - margin && x <= x1 + margin && y >= y0 - margin && y <= y1 + margin
  }

  private constrain(x: number, y: number, fromX: number, fromY: number): readonly [number, number] {
    if (this.mode === 'ring') {
      const { x0, y0, x1, y1 } = this.ring.bounds
      return [Math.min(x1, Math.max(x0, x)), Math.min(y1, Math.max(y0, y))]
    }
    if (this.standable(x, y)) return [x, y]
    if (this.standable(x, fromY)) return [x, fromY]
    if (this.standable(fromX, y)) return [fromX, y]
    return [fromX, fromY]
  }

  private standable(x: number, y: number) {
    return Enemy.footprint(x, y).every(([px, py]) => isWalkable(px, py))
  }

  private freeSpotNear(x: number, y: number): readonly [number, number] {
    if (this.mode === 'ring') return this.constrain(x, y, x, y)
    for (let attempt = 0; attempt < 12; attempt++) {
      const px = x + (Math.random() - 0.5) * attempt * 60
      const py = y + (Math.random() - 0.5) * attempt * 40
      if (this.standable(px, py)) return [px, py]
    }
    return [this.player.x, this.player.y - 160]
  }

  private blinkSpot(distance: number): readonly [number, number] {
    const player = this.player
    for (let attempt = 0; attempt < 10; attempt++) {
      const angle = Math.random() * Math.PI * 2
      const x = player.x + Math.cos(angle) * distance
      const y = player.y + Math.sin(angle) * distance * 0.6
      if (this.mode === 'ring') {
        if (this.insideBounds(x, y, -10)) return [x, y]
        continue
      }
      if (this.standable(x, y)) return [x, y]
    }
    return this.constrain(player.x + distance, player.y, player.x, player.y)
  }

  private lightRing() {
    const lights = this.scene.lights
    lights.length = 0
    const strength = this.ambientBlend
    for (const [x, y] of this.ring.lamps) lights.push({ x, y: y - 60, radius: 620, color: FLOODLIGHT, intensity: 0.85 * strength })
    lights.push({ x: this.ring.center[0], y: this.ring.center[1], radius: 520, color: FLOODLIGHT, intensity: 0.45 * strength })
    const own = this.form ? FORM_GLOW[this.form] : mixColor(WHITE, ELEMENTS[this.core.element].glow, 0.35)
    lights.push({ x: this.player.x, y: this.player.y - 40, radius: this.form ? 320 : 240, color: own, intensity: (this.form ? 0.75 : 0.5) * strength })
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      lights.push({ x: enemy.x, y: enemy.y - 40, radius: 220, color: ELEMENTS[enemy.element].glow, intensity: 0.4 * strength * enemy.alpha })
    }
    for (const meteor of this.meteors) {
      if (meteor.delay < 0.35) lights.push({ x: meteor.x, y: meteor.y, radius: 260, color: ELEMENTS[meteor.element].glow, intensity: 0.8 * strength })
    }
  }

  private dust(x: number, y: number, amount: number) {
    const count = Math.round(5 * amount)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      this.scene.particles.spawn({
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * (80 + Math.random() * 80) * amount,
        vy: Math.sin(angle) * (30 + Math.random() * 30) * amount,
        rise: 20,
        life: 0.5 + Math.random() * 0.4,
        size: 40 * amount,
        sizeEnd: 100 * amount,
        alpha: 0.4,
        drag: 3,
        sprite: puffTexture(DUST, i % 2),
        blend: 'haze',
        fadeIn: 0.1,
      })
    }
  }

  private smoke(x: number, y: number, amount: number) {
    for (let i = 0; i < Math.round(4 * amount); i++) {
      this.scene.particles.spawn({
        x: x + (Math.random() - 0.5) * 40,
        y: y - 30,
        vx: (Math.random() - 0.5) * 40,
        rise: 70 + Math.random() * 50,
        life: 1.2 + Math.random() * 0.8,
        size: 60 * amount,
        sizeEnd: 180 * amount,
        alpha: 0.35,
        sprite: this.scene.smokeSprites[i % this.scene.smokeSprites.length],
        blend: 'haze',
        fadeIn: 0.15,
      })
    }
  }

  private coins(x: number, y: number) {
    const sprite = glowTexture(GOLD, 32)
    for (let i = 0; i < 9; i++) {
      this.scene.particles.spawn({
        x,
        y,
        vx: (Math.random() - 0.5) * 260,
        vy: (Math.random() - 0.5) * 120,
        vz: 420 + Math.random() * 300,
        gravity: 1300,
        bounce: 0.45,
        shadow: true,
        life: 1 + Math.random() * 0.4,
        size: 16,
        sizeEnd: 10,
        sprite,
        blend: 'add',
        fadeIn: 0.02,
      })
    }
  }

  private popup(x: number, y: number, text: string, color: RGB, size: number) {
    this.popups.push({ x, y, z: 0, vz: 260 + Math.random() * 60, vx: (Math.random() - 0.5) * 80, text, color, age: 0, life: 1, size })
  }

  private stepPopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const popup = this.popups[i]
      popup.age += dt
      popup.vz -= 520 * dt
      popup.z += popup.vz * dt
      popup.x += popup.vx * dt
      if (popup.age >= popup.life) this.popups.splice(i, 1)
    }
  }
}

const ORDER: Element[] = ['fogo', 'raio', 'luz', 'vento', 'agua', 'gelo', 'sombra', 'terra']

const FACING_ANGLE: Record<Direction, number> = {
  e: 0,
  se: Math.PI / 4,
  s: Math.PI / 2,
  sw: (3 * Math.PI) / 4,
  w: Math.PI,
  nw: (-3 * Math.PI) / 4,
  n: -Math.PI / 2,
  ne: -Math.PI / 4,
}

const FACING_VECTOR: Record<Direction, readonly [number, number]> = {
  s: [0, 1],
  sw: [-Math.SQRT1_2, Math.SQRT1_2],
  w: [-1, 0],
  nw: [-Math.SQRT1_2, -Math.SQRT1_2],
  n: [0, -1],
  ne: [Math.SQRT1_2, -Math.SQRT1_2],
  e: [1, 0],
  se: [Math.SQRT1_2, Math.SQRT1_2],
}

export type { Ailment }
