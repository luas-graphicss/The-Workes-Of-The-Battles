import type { Point, Rect } from '../city/geometry'
import { TEXEL } from '../world-data'
import { CLASS_IDS, type RobotClass } from '../game/battle/classes'
import { tintSheets } from '../game/battle/sprites'
import { drawCell } from '../game/fx/supersample'
import { drawShadow, glowTexture, shadowTexture, type RGB } from '../game/fx/textures'
import { dressPilot, type FigureSheets } from '../game/npcs/art'
import type { PilotLook } from '../game/npcs/data'
import { Player } from '../game/player'
import { CLASS_CRYSTAL, HOLLOW_CRYSTAL } from '../game/robot/crystal'
import { shopPartsInSlot, SLOTS, type Loadout } from '../game/robot/parts'
import type { RobotComposer, Sheets } from '../game/robot/sprites'
import type { Actor, Scene } from '../game/scene'
import { ANCHOR, directionFromVector, FRAME, ROW, type Direction } from '../game/sprite'
import { BAR, BOOTH, DOOR, FORASTEIROS_TABLE, SIDE_RINGS, TABLES, VENDOR } from './layout'

type Particles = Scene['particles']

export type KeeperId = 'bartender' | 'bookie' | 'vendor' | 'forasteiros'

export type Crowd = {
  readonly actors: readonly Actor[]
  update(dt: number, focus: { x: number; y: number }): void

  chatter(focus: { x: number; y: number }): { text: string; at: () => Point } | null
  portrait(id: KeeperId): HTMLCanvasElement | null

  forasteiro(index: number): Point
  depart(): void
  setGone(gone: boolean): void
}

type Group = 'bar' | 'booth' | 'vendor' | 'trade' | 'gossip' | 'ringside' | 'forasteiros' | 'stroll' | 'none'

type Figure = {
  body: Player
  sheets: FigureSheets
  robot: boolean
  scale: number
  home: Point
  facing: Direction
  roam: number
  group: Group
  cheer: boolean
  hop: number
  target: Point | null
  rest: number
  stuck: number
  id?: KeeperId
  crew: boolean
  gone: boolean
}

type Bout = {
  rect: Rect
  fighters: [Figure, Figure]
  attacker: 0 | 1
  state: 'circle' | 'rush' | 'clash' | 'recover'
  timer: number
  phase: number
  spectators: Figure[]
}

const SHADOW = 'rgba(14, 10, 8, 0.38)'
const STILL = { x: 0, y: 0, magnitude: 0 }
const STROLL = 0.3
const NOTICE_RANGE = 230
const CHATTER_RANGE = 460
const SPARK: RGB = [255, 220, 150]
const RING_INSET = 70
const LANE = 0.28
const EXIT_POINT: Point = [(DOOR.x0 + DOOR.x1) / 2, DOOR.y - 40]
const LEAVE_PACE = 0.62
const LEAVE_STUCK = 0.7

const LINES: Record<Group, readonly string[]> = {
  bar: [
    'Tião, mais um. Hoje eu ganhei no Parafuso.',
    'O ringue principal só abre pra quem tem trilha.',
    'O campeão da Noite 12 nem suou. Nem suou!',
    'Esse pessoal de casaco comprido não bebe nada. Só olha.',
    'Energia começa no zero agora. Quem bate primeiro, carrega primeiro.',
  ],
  booth: ['Dois pra um no Faísca. Dois pra um!', 'Aposta fechada, ringue oeste, três minutos.', 'Quem apostou na Brisa pode chorar.', 'Fichas na mão, gente. Fichas na mão.'],
  vendor: ['Peça rara, procedência... discreta.', 'Isso aqui não se acha na Oficina.', 'Pergunta não. Compra.'],
  trade: [
    'Troco um Rastro de Jade por dois Fusíveis.',
    'Meu módulo esquentou tanto que derreteu o cabo.',
    'Comprei na Oficina, mas a lenda é do Sucata.',
    'Ninguém sai da Liga sem uma revanche.',
    'Capacete de balde. Ri agora, apanha depois.',
  ],
  gossip: [
    'Dizem que caíram pedras na floresta além do Mirante.',
    'Minha prima viu luzes no bosque. Luzes roxas.',
    'Os cristais do peito. É isso que eles olham, reparou?',
    'A arena pública fechou. Agora é tudo aqui, por baixo dos panos.',
    'Aquela mesa do canto chegou depois do meteoro. Nunca vi sorrirem.',
  ],
  ringside: ['Vai, vai, VAI!', 'Guarda alta! GUARDA!', 'Essa doeu até em mim.', 'Troca de lado, ele tá lendo você!', 'Aposta dobrada no de capacete!'],
  forasteiros: [],
  stroll: [
    'Primeira vez aqui? O ringue principal é ali, no tapete.',
    'Perdi fichas no chão de novo. Elas rolam, viu?',
    'Depois da luta, recolhe o prêmio antes que alguém pise.',
    'O Tião sabe de tudo. Pergunta a ele.',
  ],
  none: [],
}

const LOOKS: PilotLook[] = [
  { hair: [40, 30, 28], hairHi: [80, 60, 52], coat: [84, 96, 60], coatHi: [120, 136, 90], pants: [50, 56, 72], boot: [40, 32, 30], lens: [128, 214, 204] },
  { hair: [190, 150, 80], hairHi: [230, 200, 120], coat: [40, 60, 110], coatHi: [80, 110, 170], pants: [60, 50, 46], boot: [30, 26, 24], lens: [255, 200, 90] },
  { hair: [150, 60, 40], hairHi: [200, 100, 70], coat: [120, 40, 50], coatHi: [170, 80, 90], pants: [40, 44, 56], boot: [36, 30, 28], lens: [128, 214, 204] },
  { hair: [120, 120, 124], hairHi: [170, 170, 176], coat: [190, 150, 60], coatHi: [230, 200, 110], pants: [60, 50, 46], boot: [50, 40, 36], lens: [255, 120, 90] },
  { hair: [30, 28, 34], hairHi: [70, 66, 80], coat: [40, 110, 110], coatHi: [80, 160, 160], pants: [36, 36, 44], boot: [24, 22, 26], lens: [128, 214, 204] },
  { hair: [100, 60, 120], hairHi: [150, 100, 180], coat: [40, 36, 40], coatHi: [80, 72, 80], pants: [70, 60, 56], boot: [30, 26, 24], lens: [255, 90, 160] },
  { hair: [70, 44, 30], hairHi: [110, 80, 56], coat: [200, 200, 190], coatHi: [240, 240, 230], pants: [50, 56, 72], boot: [40, 32, 30], lens: [128, 214, 204] },
  { hair: [220, 100, 60], hairHi: [250, 150, 100], coat: [90, 70, 50], coatHi: [140, 110, 80], pants: [36, 36, 44], boot: [30, 26, 24], lens: [200, 240, 120] },
  { hair: [20, 20, 24], hairHi: [60, 60, 70], coat: [150, 60, 30], coatHi: [200, 110, 60], pants: [60, 50, 46], boot: [36, 30, 28], lens: [128, 214, 204] },
  { hair: [160, 130, 90], hairHi: [210, 180, 130], coat: [60, 80, 60], coatHi: [100, 130, 100], pants: [40, 44, 56], boot: [40, 32, 30], lens: [255, 200, 90] },
]

export const FORASTEIRO_LOOK: PilotLook = { hair: [38, 34, 54], hairHi: [66, 60, 92], coat: [54, 48, 74], coatHi: [86, 78, 112], pants: [30, 28, 40], boot: [20, 18, 26], lens: [190, 120, 255] }

const ROBOT_TINTS: readonly [RGB, RGB][] = [
  [[200, 120, 70], [255, 210, 150]],
  [[110, 160, 200], [210, 240, 255]],
  [[160, 170, 90], [240, 240, 170]],
  [[190, 90, 110], [255, 190, 200]],
  [[120, 130, 140], [230, 236, 240]],
  [[90, 150, 120], [200, 255, 220]],
  [[220, 180, 80], [255, 244, 170]],
]
const FORASTEIRO_TINT: [RGB, RGB] = [[96, 70, 140], [200, 170, 255]]

function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(random: () => number, list: readonly T[]) => list[Math.floor(random() * list.length)]

function randomLoadout(random: () => number): Loadout {
  const loadout: Loadout = { helmet: null, weapon: null, mobility: null, module: null }
  for (const slot of SLOTS) {
    if ((slot === 'helmet' || slot === 'module') && random() < 0.3) continue
    const parts = shopPartsInSlot(slot)
    loadout[slot] = pick(random, parts).id
  }
  return loadout
}

type Spot = { at: Point; facing?: Direction; face?: Point; group: Group; roam?: number; cheer?: boolean; robot?: boolean; look?: PilotLook; tint?: [RGB, RGB]; cls?: RobotClass; hollow?: boolean; id?: KeeperId }

function around(center: Point, group: Group, sides: readonly ('w' | 'e' | 'n' | 's')[], robot: boolean): Spot[] {
  const [cx, cy] = center
  const spots: Spot[] = sides.map((side) => {
    const at: Point = side === 'w' ? [cx - 150, cy + 12] : side === 'e' ? [cx + 150, cy + 12] : side === 'n' ? [cx, cy - 96] : [cx, cy + 112]
    return { at, face: center, group }
  })
  if (robot) spots.push({ at: [cx + 236, cy + 44], face: center, group: 'none', robot: true })
  return spots
}

function ringside(rect: Rect): Spot[] {
  const south = rect.y + rect.h + 62
  const centerY = rect.y + rect.h / 2
  const face: Point = [rect.x + rect.w / 2, centerY]
  return [
    { at: [rect.x + 100, south], face, group: 'ringside', cheer: true },
    { at: [rect.x + 260, south + 10], face, group: 'ringside', cheer: true },
    { at: [rect.x + 440, south], face, group: 'ringside', cheer: true },
    { at: [rect.x + 600, south + 8], face, group: 'ringside', cheer: true },
    { at: [rect.x - 64, centerY - 60], face, group: 'ringside', cheer: true },
    { at: [rect.x + rect.w + 64, centerY + 40], face, group: 'ringside', cheer: true },
    { at: [rect.x + 300, south + 110], face, group: 'none', robot: true },
  ]
}

function spots(): Spot[] {
  const table = (id: string) => TABLES.find((entry) => entry.id === id)?.at ?? [0, 0]
  const [fx, fy] = FORASTEIROS_TABLE
  return [
    { at: BAR.keeper, facing: 's', group: 'bar', id: 'bartender', look: LOOKS[6] },
    ...BAR.stools.slice(0, 3).map((x): Spot => ({ at: [x, BAR.stoolY - 10], facing: 'n', group: 'bar' })),
    { at: BOOTH.keeper, facing: 's', group: 'booth', id: 'bookie', look: LOOKS[3] },
    { at: [BOOTH.counter.x + 380, 800], facing: 'n', group: 'booth' },
    { at: [BOOTH.counter.x + 560, 812], facing: 'n', group: 'booth' },
    { at: VENDOR.keeper, facing: 's', group: 'vendor', id: 'vendor', look: LOOKS[5] },
    ...around(table('t1'), 'trade', ['w', 'e', 's'], false),
    ...around(table('t2'), 'gossip', ['w', 's'], true),
    ...around(table('t3'), 'trade', ['e', 's', 'n'], true),
    ...around(table('t4'), 'gossip', ['w', 'e'], false),
    ...around(table('t5'), 'trade', ['w', 'e', 'n', 's'], true),
    ...around(table('t6'), 'gossip', ['e', 'n'], false),
    ...around(table('t7'), 'trade', ['w', 'n', 's'], true),
    { at: [fx - 150, fy + 12], face: FORASTEIROS_TABLE, group: 'forasteiros', look: FORASTEIRO_LOOK, id: 'forasteiros' },
    { at: [fx + 150, fy + 12], face: FORASTEIROS_TABLE, group: 'forasteiros', look: FORASTEIRO_LOOK },
    { at: [fx, fy - 96], face: FORASTEIROS_TABLE, group: 'forasteiros', look: FORASTEIRO_LOOK },
    { at: [fx + 250, fy - 110], facing: 's', group: 'none', robot: true, tint: FORASTEIRO_TINT, hollow: true },
    ...SIDE_RINGS.flatMap((ring) => ringside(ring.rect)),
    { at: [1900, 1300], facing: 'e', group: 'ringside' },
    { at: [1900, 1580], facing: 'e', group: 'gossip' },
    { at: [3230, 1420], facing: 'w', group: 'ringside' },
    { at: [3230, 1660], facing: 'w', group: 'trade' },
    { at: [1500, 2300], facing: 's', group: 'stroll', roam: 320 },
    { at: [3600, 2300], facing: 's', group: 'stroll', roam: 320 },
    { at: [2000, 1000], facing: 'e', group: 'stroll', roam: 260 },
    { at: [3100, 1000], facing: 'w', group: 'stroll', roam: 260 },
    { at: [2560, 2500], facing: 'n', group: 'stroll', roam: 200 },
    { at: [1500, 2440], facing: 'w', group: 'none', robot: true, roam: 200 },
  ]
}

export function createCrowd(options: { composer: RobotComposer; pilot: Sheets; particles: Particles }): Crowd {
  const { composer, pilot, particles } = options
  const random = rng(7331)
  const spark = glowTexture(SPARK, 32)
  const humanSheets = new Map<PilotLook, FigureSheets>()
  const dress = (look: PilotLook) => {
    const cached = humanSheets.get(look)
    if (cached) return cached
    const sheets = dressPilot(pilot, look)
    humanSheets.set(look, sheets)
    return sheets
  }
  const buildRobot = (tint: [RGB, RGB], cls: RobotClass, hollow: boolean) =>
    tintSheets(composer.compose(randomLoadout(random)), tint[0], tint[1], hollow ? HOLLOW_CRYSTAL : CLASS_CRYSTAL[cls])

  const figures: Figure[] = spots().map((spot) => {
    const facing = spot.facing ?? (spot.face ? directionFromVector(spot.face[0] - spot.at[0], spot.face[1] - spot.at[1], 's') : 's')
    const sheets = spot.robot ? buildRobot(spot.tint ?? pick(random, ROBOT_TINTS), spot.cls ?? pick(random, CLASS_IDS), Boolean(spot.hollow)) : dress(spot.look ?? pick(random, LOOKS))
    const body = new Player(spot.at)
    body.facing = facing
    return {
      body,
      sheets,
      robot: Boolean(spot.robot),
      scale: spot.id === 'bartender' || spot.id === 'bookie' ? 1.08 : 1,
      home: spot.at,
      facing,
      roam: spot.roam ?? 0,
      group: spot.group,
      cheer: Boolean(spot.cheer),
      hop: 0,
      target: null,
      rest: 0.5 + random() * 2.5,
      stuck: 0,
      id: spot.id,
      crew: spot.group === 'forasteiros' || Boolean(spot.hollow),
      gone: false,
    }
  })

  const bouts: Bout[] = SIDE_RINGS.map((ring, index) => {
    const { rect } = ring
    const centerY = rect.y + rect.h / 2
    const make = (x: number, facing: Direction): Figure => {
      const body = new Player([x, centerY])
      body.facing = facing
      return { body, sheets: buildRobot(pick(random, ROBOT_TINTS), pick(random, CLASS_IDS), false), robot: true, scale: 1, home: [x, centerY], facing, roam: 0, group: 'none', cheer: false, hop: 0, target: null, rest: 0, stuck: 0, crew: false, gone: false }
    }
    const a = make(rect.x + rect.w * LANE, 'e')
    const b = make(rect.x + rect.w * (1 - LANE), 'w')
    figures.push(a, b)
    const spectators = figures.filter((figure) => figure.cheer && Math.abs(figure.home[0] - (rect.x + rect.w / 2)) < rect.w)
    return { rect, fighters: [a, b], attacker: index === 0 ? 0 : 1, state: 'circle', timer: 1 + random() * 2, phase: random() * 6, spectators }
  })

  let focus = { x: 0, y: 0 }
  let leaving = false

  function clampToRing(figure: Figure, rect: Rect) {
    figure.body.x = Math.min(rect.x + rect.w - RING_INSET, Math.max(rect.x + RING_INSET, figure.body.x))
    figure.body.y = Math.min(rect.y + rect.h - RING_INSET, Math.max(rect.y + RING_INSET, figure.body.y))
  }

  function walk(figure: Figure, dt: number, tx: number, ty: number, speed: number) {
    const body = figure.body
    const dx = tx - body.x
    const dy = ty - body.y
    const left = Math.hypot(dx, dy)
    if (left < 6) {
      body.update(dt, STILL)
      return true
    }
    body.speedMultiplier = speed
    body.update(dt, { x: dx / left, y: dy / left, magnitude: 1 })
    return false
  }

  function clash(bout: Bout) {
    const [a, b] = bout.fighters
    const attacker = bout.fighters[bout.attacker]
    const defender = bout.attacker === 0 ? b : a
    const x = (attacker.body.x + defender.body.x) / 2
    const y = (attacker.body.y + defender.body.y) / 2 - 70
    for (let index = 0; index < 10; index++) {
      const angle = (index / 10) * Math.PI * 2
      particles.spawn({
        x: x + Math.cos(angle) * 6,
        y,
        vx: Math.cos(angle) * (60 + random() * 80),
        rise: 40 + random() * 90,
        life: 0.35 + random() * 0.3,
        size: 22,
        sizeEnd: 4,
        alpha: 0.9,
        fadeIn: 0,
        sprite: spark,
        blend: 'add',
      })
    }
    const push = attacker.body.x < defender.body.x ? 1 : -1
    defender.body.x += push * 46
    defender.body.y += (random() - 0.5) * 30
    clampToRing(defender, bout.rect)
    for (const spectator of bout.spectators) if (random() < 0.75) spectator.hop = 1
  }

  function updateBout(bout: Bout, dt: number, time: number) {
    const [a, b] = bout.fighters
    const attacker = bout.fighters[bout.attacker]
    const defender = bout.attacker === 0 ? b : a
    bout.timer -= dt
    a.body.facing = a.body.x < b.body.x ? 'e' : 'w'
    b.body.facing = b.body.x < a.body.x ? 'e' : 'w'
    if (bout.state === 'circle') {
      const sway = Math.sin(time * 1.3 + bout.phase) * 40
      walk(a, dt, a.home[0], bout.rect.y + bout.rect.h / 2 + sway, 0.22)
      walk(b, dt, b.home[0], bout.rect.y + bout.rect.h / 2 - sway, 0.22)
      if (bout.timer <= 0) {
        bout.state = 'rush'
        bout.timer = 1.4
      }
    } else if (bout.state === 'rush') {
      defender.body.update(dt, STILL)
      const reached = walk(attacker, dt, defender.body.x + (attacker.body.x < defender.body.x ? -78 : 78), defender.body.y, 0.95)
      if (reached || bout.timer <= 0) {
        clash(bout)
        bout.state = 'clash'
        bout.timer = 0.35
      }
    } else if (bout.state === 'clash') {
      attacker.body.update(dt, STILL)
      defender.body.update(dt, STILL)
      if (bout.timer <= 0) {
        bout.state = 'recover'
        bout.timer = 2.5
      }
    } else {
      const backA = walk(a, dt, a.home[0], a.body.y, 0.4)
      const backB = walk(b, dt, b.home[0], b.body.y, 0.4)
      if ((backA && backB) || bout.timer <= 0) {
        bout.attacker = bout.attacker === 0 ? 1 : 0
        bout.state = 'circle'
        bout.timer = 1.2 + random() * 2.2
      }
    }
    clampToRing(a, bout.rect)
    clampToRing(b, bout.rect)
  }

  function leave(figure: Figure, dt: number) {
    const body = figure.body
    const fromX = body.x
    const fromY = body.y
    const arrived = walk(figure, dt, EXIT_POINT[0], EXIT_POINT[1], LEAVE_PACE)
    figure.stuck = Math.hypot(body.x - fromX, body.y - fromY) < 0.5 ? figure.stuck + dt : 0
    if (arrived || figure.stuck > LEAVE_STUCK) figure.gone = true
  }

  function updateFigure(figure: Figure, dt: number) {
    const body = figure.body
    if (figure.gone) return
    if (leaving && figure.crew) {
      leave(figure, dt)
      return
    }
    if (figure.hop > 0) figure.hop = Math.max(0, figure.hop - dt * 3.2)
    const near = Math.hypot(focus.x - body.x, focus.y - body.y) < NOTICE_RANGE
    if (near && figure.group !== 'forasteiros') {
      if (body.moving) body.update(dt, STILL)
      body.facing = directionFromVector(focus.x - body.x, focus.y - body.y, body.facing, 0.3)
      figure.target = null
      return
    }
    if (figure.roam <= 0) {
      if (body.moving) body.update(dt, STILL)
      body.facing = figure.facing
      return
    }
    if (!figure.target) {
      if (body.moving) body.update(dt, STILL)
      figure.rest -= dt
      if (figure.rest > 0) return
      const angle = random() * Math.PI * 2
      const reach = figure.roam * (0.35 + random() * 0.65)
      figure.target = [figure.home[0] + Math.cos(angle) * reach, figure.home[1] + Math.sin(angle) * reach * 0.7]
      figure.stuck = 0
    }
    const fromX = body.x
    const fromY = body.y
    const arrived = walk(figure, dt, figure.target[0], figure.target[1], STROLL)
    figure.stuck = Math.hypot(body.x - fromX, body.y - fromY) < 0.5 ? figure.stuck + dt : 0
    if (arrived || figure.stuck > 0.5) {
      figure.target = null
      figure.rest = 1.5 + random() * 3.5
      body.update(0, STILL)
    }
  }

  function drawFigure(context: CanvasRenderingContext2D, figure: Figure, originX: number, originY: number, zoom: number) {
    if (figure.gone) return
    const body = figure.body
    const scale = zoom * TEXEL * figure.scale
    const feetX = originX + Math.round(body.x * zoom)
    const feetY = originY + Math.round(body.y * zoom)
    const width = FRAME.width * scale
    const height = FRAME.height * scale
    const left = feetX - ANCHOR.x * scale
    const lift = Math.round(Math.sin(figure.hop * Math.PI) * 26 * zoom)
    const top = feetY - ANCHOR.y * scale - lift
    const { canvas } = context
    if (left > canvas.width || left + width < 0 || top > canvas.height || top + height < 0) return
    context.imageSmoothingEnabled = true
    drawShadow(context, shadow, feetX, feetY - scale * 0.5, scale * (figure.robot ? 12 : 9) * (1 - figure.hop * 0.2), scale * (figure.robot ? 4 : 3))
    const sx = (body.moving ? body.frame : 0) * FRAME.width
    const sy = ROW[body.facing] * FRAME.height
    drawCell(context, body.moving ? figure.sheets.walk : figure.sheets.idle, sx, sy, FRAME.width, FRAME.height, left, top, width, height)
    context.imageSmoothingEnabled = true
  }

  const fighting = new Set(bouts.flatMap((bout) => bout.fighters))
  const shadow = shadowTexture(SHADOW)

  const actors: Actor[] = figures.map((figure) => ({
    get depth() {
      return figure.body.y
    },
    draw: (context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) => drawFigure(context, figure, originX, originY, zoom),
  }))

  const portraits = new Map<KeeperId, HTMLCanvasElement>()
  let chatterCursor = 0

  return {
    actors,
    update(dt, next) {
      focus = next
      const time = performance.now() / 1000
      for (const bout of bouts) updateBout(bout, dt, time)
      for (const figure of figures) if (!fighting.has(figure)) updateFigure(figure, dt)
    },
    chatter(at) {
      const near = figures.filter((figure) => LINES[figure.group].length > 0 && Math.hypot(figure.body.x - at.x, figure.body.y - at.y) < CHATTER_RANGE)
      if (!near.length) return null
      const speaker = near[Math.floor(random() * near.length)]
      const lines = LINES[speaker.group]
      chatterCursor = (chatterCursor + 1 + Math.floor(random() * (lines.length - 1))) % lines.length
      const body = speaker.body
      return { text: lines[chatterCursor], at: () => [body.x, body.y] }
    },
    portrait(id) {
      const cached = portraits.get(id)
      if (cached) return cached
      const figure = figures.find((entry) => entry.id === id)
      if (!figure) return null
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const context = canvas.getContext('2d')
      if (!context) return null
      context.imageSmoothingEnabled = false
      context.drawImage(figure.sheets.idle, 8, 2, 32, 32, 0, 0, 32, 32)
      canvas.className = 'talk-portrait-art'
      portraits.set(id, canvas)
      return canvas
    },
    forasteiro(index) {
      const group = figures.filter((figure) => figure.group === 'forasteiros')
      const figure = group[index % group.length]
      return figure ? [figure.body.x, figure.body.y] : FORASTEIROS_TABLE
    },
    depart() {
      leaving = true
      for (const figure of figures) {
        if (!figure.crew) continue
        figure.target = null
        figure.stuck = 0
      }
    },
    setGone(gone) {
      leaving = false
      for (const figure of figures) {
        if (!figure.crew) continue
        figure.gone = gone
        figure.stuck = 0
        figure.target = null
        if (!gone) {
          figure.body.place(figure.home[0], figure.home[1], figure.facing)
          figure.body.update(0, STILL)
        }
      }
    },
  }
}
