import type { Point, Rect } from '../city/geometry'
import { inRect } from '../city/geometry'

export const LEAGUE_ROOM = { width: 5120, height: 3328 } as const

export const LEAGUE_NAME = 'Liga de Robôs'
export const LEAGUE_SUBTITLE = 'liga clandestina do Mirante'

export const WALLS = { side: 96, back: 320, front: 96 } as const

export const FLOOR: Rect = { x: WALLS.side, y: WALLS.back, w: LEAGUE_ROOM.width - WALLS.side * 2, h: LEAGUE_ROOM.height - WALLS.back - WALLS.front }

export const DOOR = { x0: 2440, x1: 2680, y: LEAGUE_ROOM.height - WALLS.front } as const
export const ENTRY: Point = [2560, 3110]
export const EXIT_ZONE: Rect = { x: 2380, y: 3080, w: 360, h: 160 }

export type RingSpot = { id: string; name: string; rect: Rect }

export const MAIN_RING: RingSpot = { id: 'principal', name: 'Ringue Principal', rect: { x: 2060, y: 1180, w: 1000, h: 580 } }
export const SIDE_RINGS: readonly RingSpot[] = [
  { id: 'oeste', name: 'Ringue das Apostas', rect: { x: 420, y: 1480, w: 760, h: 440 } },
  { id: 'leste', name: 'Ringue dos Novatos', rect: { x: 3940, y: 1480, w: 760, h: 440 } },
]
export const RINGS: readonly RingSpot[] = [MAIN_RING, ...SIDE_RINGS]

export const RING_GATE_ZONE: Rect = { x: 2340, y: 1770, w: 440, h: 190 }
export const RING_EXIT: Point = [2560, 1900]

export const MAIN_RING_BENCHES: readonly Point[] = [
  ...[1240, 1330, 1420, 1510, 1600, 1690].map((y): Point => [1960, y]),
  ...[1240, 1330, 1420, 1510, 1600, 1690].map((y): Point => [3160, y]),
  [2260, 1118],
  [2560, 1118],
  [2860, 1118],
]
export const MAIN_RING_LAMPS: readonly Point[] = [
  [1980, 1120],
  [3140, 1120],
  [1980, 1840],
  [3140, 1840],
]

export const BAR = { counter: { x: 220, y: 560, w: 1000, h: 150 } as Rect, keeper: [720, 470] as Point, stools: [420, 620, 820, 1020] as readonly number[], stoolY: 780 }
export const BOOTH = { counter: { x: 3900, y: 560, w: 1000, h: 150 } as Rect, keeper: [4400, 470] as Point, name: 'Banca de Apostas' }
export const VENDOR = { stall: { x: 4660, y: 2320, w: 320, h: 160 } as Rect, keeper: [4820, 2250] as Point, zone: { x: 4580, y: 2480, w: 480, h: 180 } as Rect, name: 'Sucata & Segredos' }

export type Table = { id: string; at: Point }
export const TABLES: readonly Table[] = [
  { id: 't1', at: [660, 1120] },
  { id: 't2', at: [1500, 980] },
  { id: 't3', at: [3620, 980] },
  { id: 't4', at: [4460, 1120] },
  { id: 't5', at: [820, 2640] },
  { id: 't6', at: [1700, 2900] },
  { id: 't7', at: [3420, 2900] },
  { id: 'forasteiros', at: [4360, 2680] },
]
export const TABLE_RADIUS = { rx: 104, ry: 62 } as const

export const FORASTEIROS_TABLE: Point = [4360, 2680]
export const FORASTEIROS_REACH = 520

export const CRATES: readonly Point[] = [
  [270, 3080],
  [4860, 3080],
  [4900, 1300],
]
export const BARRELS: readonly Point[] = [
  [210, 2220],
  [1400, 3130],
]

export const CARPET: Rect = { x: 2410, y: MAIN_RING.rect.y + MAIN_RING.rect.h, w: 300, h: LEAGUE_ROOM.height - WALLS.front - (MAIN_RING.rect.y + MAIN_RING.rect.h) }

export const CEILING_LAMPS: readonly Point[] = [
  ...MAIN_RING_LAMPS,
  [620, 1420],
  [980, 1420],
  [4140, 1420],
  [4500, 1420],
  [720, 760],
  [4400, 760],
  [1600, 2520],
  [3520, 2520],
]

const TABLE_BOX = (at: Point): Rect => ({ x: at[0] - TABLE_RADIUS.rx + 10, y: at[1] - TABLE_RADIUS.ry + 16, w: TABLE_RADIUS.rx * 2 - 20, h: TABLE_RADIUS.ry * 2 - 20 })

const ROPE = 24

function ringObstacles(ring: Rect): Rect[] {
  return [
    { x: ring.x - 12, y: ring.y - 12, w: ring.w + 24, h: ROPE + 12 },
    { x: ring.x - 12, y: ring.y + ring.h - ROPE, w: ring.w + 24, h: ROPE + 12 },
    { x: ring.x - 12, y: ring.y - 12, w: ROPE + 12, h: ring.h + 24 },
    { x: ring.x + ring.w - ROPE, y: ring.y - 12, w: ROPE + 12, h: ring.h + 24 },
  ]
}

export const OBSTACLES: readonly Rect[] = [
  ...RINGS.flatMap((ring) => ringObstacles(ring.rect)),
  BAR.counter,
  BOOTH.counter,
  VENDOR.stall,
  ...TABLES.map((table) => TABLE_BOX(table.at)),
  ...CRATES.map(([x, y]): Rect => ({ x: x - 60, y: y - 70, w: 150, h: 76 })),
  ...BARRELS.map(([x, y]): Rect => ({ x: x - 40, y: y - 48, w: 100, h: 52 })),
  ...MAIN_RING_BENCHES.map(([x, y]): Rect => ({ x: x - 46, y: y - 40, w: 92, h: 44 })),
]

export const BAR_ZONE: Rect = { x: 260, y: 720, w: 920, h: 170 }
export const BOOTH_ZONE: Rect = { x: 3940, y: 720, w: 920, h: 170 }

export function leagueWalkable(x: number, y: number): boolean {
  if (!inRect(FLOOR, x, y)) return x >= DOOR.x0 && x <= DOOR.x1 && y >= DOOR.y && y < LEAGUE_ROOM.height
  for (const rect of OBSTACLES) if (inRect(rect, x, y)) return false
  return true
}
