import type { Point, Polygon, Rect } from './geometry'
import { ART, facadeHeight } from './model'
import { FARM_MILL, RIVERSIDE_SHOP } from './outskirts'

export type SiteKind = 'factory' | 'robotshop'

export type Site = {
  id: string
  kind: SiteKind
  name: string
  district: string
  rect: Rect
  floors: number
  door: Point
  zone: Rect
  spawn: Point
  chimneys: Point[]
}

const ROOF_DEPTH: Record<SiteKind, number> = { factory: 64, robotshop: 60 }

function site(kind: SiteKind, id: string, name: string, district: string, x: number, bottom: number, widthArt: number, floors: number): Site {
  const w = widthArt * ART
  const h = facadeHeight(floors) + ROOF_DEPTH[kind] * ART
  const rect = { x, y: bottom - h, w, h }
  const doorX = x + w / 2
  return {
    id,
    kind,
    name,
    district,
    rect,
    floors,
    door: [doorX, bottom],
    zone: { x: doorX - 120, y: bottom, w: 240, h: 150 },
    spawn: [doorX, bottom + 40],
    chimneys: kind === 'factory' ? [[x + w - 22 * ART, rect.y + 12 * ART]] : [],
  }
}

export const SITES: readonly Site[] = [
  site('factory', 'factory-oeste', 'Fundição Oeste', 'Rua dos Jardins, oeste', 820, 4872, 136, 2),
  site('factory', 'factory-sul', 'Fábrica Engrenagem', 'Rua dos Jardins, centro', 3840, 4872, 148, 2),
  site('factory', 'factory-leste', 'Autômatos do Leste', 'Avenida das Runas, leste', 4856, 3784, 150, 2),
  site('robotshop', 'shop-norte', 'Robô & Cia', 'Rua do Mercado', 3112, 1512, 148, 2),
  site('robotshop', 'shop-oeste', 'Casa dos Androides', 'Bairro Antigo', 1808, 2552, 150, 2),
  site('robotshop', 'shop-sul', 'Loja Parafuso', 'Rua do Lago', 4016, 6872, 132, 2),
  site('robotshop', 'shop-riacho', 'Ferro & Rio', 'Vila do Riacho', RIVERSIDE_SHOP.x, RIVERSIDE_SHOP.bottom, RIVERSIDE_SHOP.widthArt, RIVERSIDE_SHOP.floors),
  site('factory', 'factory-campos', 'Moageira do Sul', 'Campos do Sul', FARM_MILL.x, FARM_MILL.bottom, FARM_MILL.widthArt, FARM_MILL.floors),
]

export function siteById(id: string): Site | null {
  return SITES.find((entry) => entry.id === id) ?? null
}

export const METEOR_SITE: Point = [6840, 1472]

export const CRATER_FLOOR = { center: [METEOR_SITE[0], METEOR_SITE[1] + 128] as Point, radius: 360 } as const

const HOUSE_X = 6932
const HOUSE_BOTTOM = 4368
const HOUSE_WIDTH = 110 * ART
const HOUSE_FLOORS = 1
const HOUSE_HEIGHT = facadeHeight(HOUSE_FLOORS) + 60 * ART
const HOUSE_DOOR_X = HOUSE_X + HOUSE_WIDTH / 2

export const HOUSE = {
  id: 'house',
  name: 'Casa do B-01',
  district: 'Parque da Árvore-Lume',
  rect: { x: HOUSE_X, y: HOUSE_BOTTOM - HOUSE_HEIGHT, w: HOUSE_WIDTH, h: HOUSE_HEIGHT } as Rect,
  floors: HOUSE_FLOORS,
  bottom: HOUSE_BOTTOM,
  door: [HOUSE_DOOR_X, HOUSE_BOTTOM] as Point,
  zone: { x: HOUSE_DOOR_X - 120, y: HOUSE_BOTTOM, w: 240, h: 150 } as Rect,
  exit: [HOUSE_DOOR_X, HOUSE_BOTTOM + 70] as Point,

  path: [
    [HOUSE_DOOR_X, HOUSE_BOTTOM + 40],
    [HOUSE_DOOR_X, HOUSE_BOTTOM + 110],
    [HOUSE_DOOR_X - 150, HOUSE_BOTTOM + 170],
    [6840, 4490],
  ] as Point[],
  windows: [
    [HOUSE_X + 11 * ART, HOUSE_BOTTOM - 25 * ART],
    [HOUSE_X + 98 * ART, HOUSE_BOTTOM - 25 * ART],
  ] as Point[],
  plate: [HOUSE_DOOR_X, HOUSE_BOTTOM - 45 * ART] as Point,
  chimney: [HOUSE_X + 24 * ART, HOUSE_BOTTOM - HOUSE_HEIGHT + 20 * ART] as Point,
} as const

const LEAGUE_X = 3824
const LEAGUE_BOTTOM = 3784
const LEAGUE_WIDTH = 150 * ART
const LEAGUE_FLOORS = 2
const LEAGUE_HEIGHT = facadeHeight(LEAGUE_FLOORS) + 64 * ART
const LEAGUE_DOOR_X = LEAGUE_X + LEAGUE_WIDTH / 2

export const LEAGUE = {
  id: 'league',
  name: 'Liga de Robôs',
  district: 'Praça do Cristal, leste',
  rect: { x: LEAGUE_X, y: LEAGUE_BOTTOM - LEAGUE_HEIGHT, w: LEAGUE_WIDTH, h: LEAGUE_HEIGHT } as Rect,
  floors: LEAGUE_FLOORS,
  bottom: LEAGUE_BOTTOM,
  door: [LEAGUE_DOOR_X, LEAGUE_BOTTOM] as Point,
  zone: { x: LEAGUE_DOOR_X - 130, y: LEAGUE_BOTTOM, w: 260, h: 150 } as Rect,
  exit: [LEAGUE_DOOR_X, LEAGUE_BOTTOM + 70] as Point,
} as const

const RING: Rect = { x: 2810, y: 7150, w: 900, h: 520 }
const ROPE = 16
const GATE = { x0: 3176, x1: 3344 }

export const ARENA = {
  name: 'Arena do Mirante',
  center: [3260, 7410] as Point,
  plaza: [
    [2716, 7044],
    [3804, 7044],
    [3860, 7100],
    [3860, 7744],
    [3804, 7800],
    [2716, 7800],
    [2660, 7744],
    [2660, 7100],
  ] as Polygon,
  ring: RING,
  rope: ROPE,
  gate: GATE,
  bounds: { x0: RING.x + 36, y0: RING.y + 34, x1: RING.x + RING.w - 36, y1: RING.y + RING.h - 30 },
  zone: { x: 3170, y: 7000, w: 180, h: 150 },
  playerStart: [3260, 7560] as Point,
  enemyStart: [3260, 7270] as Point,
  exit: [3260, 7060] as Point,
  posts: [
    [RING.x, RING.y],
    [RING.x + RING.w, RING.y],
    [RING.x, RING.y + RING.h],
    [RING.x + RING.w, RING.y + RING.h],
  ] as Point[],
  ropes: [
    { x: RING.x, y: RING.y, w: GATE.x0 - RING.x, h: ROPE },
    { x: GATE.x1, y: RING.y, w: RING.x + RING.w - GATE.x1, h: ROPE },
    { x: RING.x, y: RING.y + RING.h - ROPE, w: RING.w, h: ROPE },
    { x: RING.x, y: RING.y, w: ROPE, h: RING.h },
    { x: RING.x + RING.w - ROPE, y: RING.y, w: ROPE, h: RING.h },
  ] as Rect[],
  benches: [
    [2730, 7260],
    [2730, 7350],
    [2730, 7440],
    [2730, 7530],
    [2730, 7620],
    [3790, 7260],
    [3790, 7350],
    [3790, 7440],
    [3790, 7530],
    [3790, 7620],
    [2960, 7094],
    [3560, 7094],
  ] as Point[],
  lamps: [
    [2694, 7084],
    [3826, 7084],
    [2694, 7762],
    [3826, 7762],
  ] as Point[],
} as const
