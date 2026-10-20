import {
  bezier,
  densify,
  distanceToPath,
  inRect,
  offsetPath,
  pointInPolygon,
  polygonBounds,
  random,
  rectsOverlap,
  smoothLoop,
  smoothPath,
  strokePath,
  type Point,
  type Polygon,
  type Rect,
} from './geometry'
import {
  ART,
  facadeHeight,
  type Bridge,
  type Building,
  type BuildingStyle,
  type Fence,
  type Field,
  type Garden,
  type Landmark,
  type Paving,
  type Prop,
  type Stall,
  type Tent,
  type Tree,
  type TreeKind,
} from './model'
import {
  BROOK,
  OUTSKIRTS_CORRIDORS,
  OUTSKIRTS_BRIDGES,
  OUTSKIRTS_BUILDINGS,
  OUTSKIRTS_FENCES,
  OUTSKIRTS_FIELDS,
  OUTSKIRTS_GARDENS,
  OUTSKIRTS_LAND,
  OUTSKIRTS_LANDMARKS,
  OUTSKIRTS_ORCHARD_ROWS,
  OUTSKIRTS_PAVING,
  OUTSKIRTS_PROPS,
  OUTSKIRTS_REGIONS,
  POND,
  RESTS,
} from './outskirts'
import { ARENA, CRATER_FLOOR, HOUSE, LEAGUE, SITES, type Site } from './sites'
import {
  CAMPS,
  WOODS_BUILDINGS,
  WOODS_CORRIDORS,
  WOODS_GARDENS,
  WOODS_LAND,
  WOODS_PROPS,
  WOODS_REGIONS,
  WOODS_TRAILS,
  WOODS_TRAIL_WIDTH,
  WOODS_WATER,
  WOODS_ZONES,
  openness,
  woodsZoneAt,
} from './woods'

export { ARENA, HOUSE, SITES } from './sites'
export { RESTS, TRAILS, VILLAGE_SQUARE, FARM_CROSSING } from './outskirts'
export { CAMPS, GLADES, WOODS_LOGS, WOODS_OBSTACLES, WOODS_ROCKS, WOODS_STUMPS, WOODS_TRAILS, WOODS_ZONES, BEACON, CRYSTAL_CRATES, LANDING_MARKS } from './woods'

export const SIZE = 16384

export const CANAL_HALF = 128
export const QUAY = 32
const PROMENADE_WIDTH = 128

export const CANAL_PATH: Point[] = [
  ...densify(
    [
      [5520, -240],
      [5520, 2100],
    ],
    200,
  ),
  ...bezier([5520, 2100], [5520, 2700], [6360, 2500], [6360, 3100], 32).slice(1),
  ...densify(
    [
      [6360, 3100],
      [6360, 5480],
    ],
    200,
  ).slice(1),
]
export const CANAL: Polygon = strokePath(CANAL_PATH, CANAL_HALF)

export const LAKE: Polygon = smoothLoop(
  [
    [6360, 5400],
    [6700, 5450],
    [6980, 5560],
    [7150, 5800],
    [7190, 6100],
    [7120, 6420],
    [6930, 6660],
    [6600, 6770],
    [6240, 6740],
    [5920, 6600],
    [5720, 6370],
    [5690, 6080],
    [5800, 5780],
    [6040, 5540],
  ],
  40,
)

export const STREAM_PATH: Point[] = smoothPath(
  [
    [7080, 6200],
    [7400, 6240],
    [7700, 6300],
    [8000, 6330],
    [8400, 6340],
  ],
  40,
)
export const STREAM: Polygon = strokePath(STREAM_PATH, 56)

export type WaterKind = 'canal' | 'lake' | 'stream'
export const WATER_BODIES: readonly { kind: WaterKind; polygon: Polygon }[] = [
  { kind: 'canal', polygon: CANAL },
  { kind: 'lake', polygon: LAKE },
  { kind: 'stream', polygon: STREAM },
  { kind: 'stream', polygon: BROOK },
  { kind: 'lake', polygon: POND },
  ...WOODS_WATER,
]

export const WATER: Polygon[] = WATER_BODIES.map((body) => body.polygon)

const eastQuay = offsetPath(CANAL_PATH, -CANAL_HALF).filter(([, y]) => y > 820 && y <= 2760)

export const TOWN: Polygon = [
  ...smoothPath(
    [
      [760, 2500],
      [740, 1500],
      [820, 1080],
      [1000, 880],
      [1500, 790],
      [2400, 770],
      [3300, 790],
      [4200, 770],
      [4880, 790],
      [5360, 800],
    ],
    60,
  ),
  [5648, 800],
  ...eastQuay,
  ...smoothPath(
    [
      eastQuay[eastQuay.length - 1],
      [6470, 2752],
      [6560, 2690],
      [6700, 2716],
      [6900, 2650],
      [7060, 2700],
      [7240, 2712],
      [7420, 2940],
      [7460, 3600],
      [7440, 4400],
      [7460, 5200],
      [7440, 6000],
      [7450, 6700],
      [7380, 7120],
      [7120, 7390],
      [6600, 7450],
      [5600, 7440],
      [4600, 7460],
      [4160, 7860],
      [3260, 7900],
      [2360, 7860],
      [2000, 7460],
      [1300, 7430],
      [900, 7240],
      [770, 6800],
      [730, 5800],
      [760, 4700],
      [730, 3600],
      [760, 2500],
    ],
    60,
  ).slice(1),
]

export const CAMP: Polygon = smoothLoop(
  [
    [6267, 1278],
    [6504, 1032],
    [6849, 1040],
    [7209, 1106],
    [7463, 1409],
    [7422, 1761],
    [7168, 1950],
    [7004, 2040],
    [6595, 2064],
    [6332, 1794],
    [6185, 1532],
  ],
  48,
)

export const CAMPFIRE: Point = [6848, 1600]

export const TENTS: Tent[] = [
  { x: 6480, y: 1440, w: 200, h: 170, color: 'ochre' },
  { x: 6848, y: 1330, w: 200, h: 170, color: 'olive' },
  { x: 7170, y: 1440, w: 176, h: 150, color: 'rust' },
]

export const TRAIL_PATH: Point[] = smoothPath(
  [
    [6840, 1700],
    [6812, 1990],
    [6770, 2200],
    [6690, 2420],
    [6650, 2600],
    [6664, 2780],
  ],
  32,
)
export const CAMP_TRAIL: Polygon = strokePath(TRAIL_PATH.filter(([, y]) => y >= 1960), 150)

export const BRIDGES: Bridge[] = [
  { rect: { x: 6184, y: 3792, w: 352, h: 256 }, axis: 'h', kind: 'stone' },
  { rect: { x: 6184, y: 4880, w: 352, h: 160 }, axis: 'h', kind: 'stone' },
  { rect: { x: 7196, y: 6108, w: 120, h: 236 }, axis: 'v', kind: 'wood' },
  ...OUTSKIRTS_BRIDGES,
]

export const LAND: readonly Polygon[] = [TOWN, CAMP, CAMP_TRAIL, ...OUTSKIRTS_LAND, ...WOODS_LAND]
export const LAND_STROKES = [...OUTSKIRTS_CORRIDORS, ...WOODS_CORRIDORS]
const CORRIDOR_BOUNDS = LAND_STROKES.map(({ path, half }) => {
  const bounds = polygonBounds(path)
  return { x0: bounds.x - half, y0: bounds.y - half, x1: bounds.x + bounds.w + half, y1: bounds.y + bounds.h + half }
})

const AVENUE = 256
const STREET = 160
const PATH = 96

export const STREETS = {
  mercado: 1600,
  oficinas: 2640,
  runas: 3920,
  jardins: 4960,
  pomar: 5920,
  lago: 6960,
  oeste: 1680,
  cristal: 3200,
  leste: 4720,
} as const

export const PLAZA_CENTER: Point = [STREETS.cristal, STREETS.runas]
export const PLAZA_RADIUS = 520
const CIVIC_WALKS = [2664, 3736] as const
export const MARKET: Rect = { x: 2560, y: 1680, w: 1280, h: 880 }
export const LOOKOUT: Point = ARENA.center
const AVENUE_END = ARENA.plaza[0][1] + 40
export const LUME_PLAZA: Point = [6980, 3480]
export const LAKE_SQUARE: Point = [6000, 6930]
export const TOWER_GARDEN: Point = [1180, 3260]

const PROMENADE_END = 5380
const promenadeLine = offsetPath(CANAL_PATH, CANAL_HALF + QUAY + PROMENADE_WIDTH / 2).filter(([, y]) => y >= 860)
const promenadeCut = promenadeLine.findIndex(([, y]) => y > PROMENADE_END)
export const PROMENADE_PATH: Point[] = [...promenadeLine.slice(0, promenadeCut), [promenadeLine[promenadeCut][0], PROMENADE_END]]

const PARK_PATHS: Point[][] = [
  smoothPath(
    [
      [6664, 2760],
      [6720, 3010],
      [6860, 3270],
      LUME_PLAZA,
    ],
    32,
  ),
  smoothPath(
    [
      LUME_PLAZA,
      [6900, 3700],
      [6700, 3860],
      [6536, 3920],
    ],
    32,
  ),
  smoothPath(
    [
      [6536, 3920],
      [6700, 4140],
      [6820, 4480],
      [6770, 4790],
      [6600, 4960],
      [6536, 4960],
    ],
    32,
  ),
]

export const LAKE_PATH: Point[] = smoothPath(
  [
    [PROMENADE_PATH[PROMENADE_PATH.length - 1][0], PROMENADE_END - 60],
    [6124, 5420],
    [5800, 5520],
    [5540, 5820],
    [5470, 6160],
    [5560, 6500],
    [5800, 6800],
    [6200, 6930],
    [6640, 6940],
    [7000, 6820],
    [7270, 6560],
    [7300, 6360],
    [7256, 6226],
    [7280, 6000],
    [7240, 5700],
    [7060, 5440],
    [6860, 5300],
    [6880, 5080],
    [6770, 4790],
  ],
  32,
)

const TOWER_RING: Point[] = smoothLoop(
  Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2
    return [TOWER_GARDEN[0] + Math.cos(angle) * 300, TOWER_GARDEN[1] - 60 + Math.sin(angle) * 230] as Point
  }),
  32,
)

export const PAVING: Paving[] = [
  ...WOODS_TRAILS.map((trail): Paving => ({ kind: 'dirt', shape: 'stroke', points: trail.path, width: WOODS_TRAIL_WIDTH })),
  ...OUTSKIRTS_PAVING,
  { kind: 'dirt', shape: 'stroke', points: [[860, STREETS.pomar], [STREETS.oeste, STREETS.pomar]], width: STREET - 32 },
  { kind: 'dirt', shape: 'stroke', points: [[1180 - 44, STREETS.lago], [3072, STREETS.lago]], width: STREET - 32 },
  { kind: 'dirt', shape: 'stroke', points: [[2040, STREETS.pomar], [2040, 5620]], width: 88 },
  { kind: 'dirt', shape: 'stroke', points: [[1180, STREETS.lago], [1180, 6450]], width: 88 },
  { kind: 'dirt', shape: 'stroke', points: [[2760, STREETS.lago], [2760, 6610]], width: 88 },
  { kind: 'street', shape: 'stroke', points: [[900, STREETS.mercado], [5300, STREETS.mercado]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[860, STREETS.oficinas], [5600, STREETS.oficinas]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[860, STREETS.jardins], [6200, STREETS.jardins]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[STREETS.oeste, STREETS.pomar], [5520, STREETS.pomar]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[3072, STREETS.lago], [5980, STREETS.lago]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[STREETS.oeste, 1520], [STREETS.oeste, STREETS.lago + (STREET - 32) / 2]], width: STREET },
  { kind: 'street', shape: 'stroke', points: [[STREETS.leste, 1520], [STREETS.leste, 7040]], width: STREET },
  { kind: 'gravel', shape: 'stroke', points: LAKE_PATH, width: PATH },
  { kind: 'promenade', shape: 'stroke', points: PROMENADE_PATH, width: PROMENADE_WIDTH },
  ...PARK_PATHS.map((points): Paving => ({ kind: 'gravel', shape: 'stroke', points, width: PATH })),
  { kind: 'gravel', shape: 'stroke', points: smoothPath(HOUSE.path, 32), width: 80 },
  { kind: 'gravel', shape: 'stroke', points: [...TOWER_RING, TOWER_RING[0]], width: 80 },
  { kind: 'gravel', shape: 'stroke', points: [[TOWER_GARDEN[0] + 300, TOWER_GARDEN[1] - 60], [STREETS.oeste, TOWER_GARDEN[1] - 60]], width: 80 },
  { kind: 'gravel', shape: 'stroke', points: [[TOWER_GARDEN[0], TOWER_GARDEN[1] + 170], [TOWER_GARDEN[0], STREETS.runas]], width: 80 },
  { kind: 'gravel', shape: 'stroke', points: [[TOWER_GARDEN[0], TOWER_GARDEN[1] - 290], [TOWER_GARDEN[0], STREETS.oficinas]], width: 80 },
  { kind: 'promenade', shape: 'stroke', points: [[CIVIC_WALKS[0], STREETS.oficinas], [CIVIC_WALKS[0], STREETS.runas]], width: 112 },
  { kind: 'promenade', shape: 'stroke', points: [[CIVIC_WALKS[1], STREETS.oficinas], [CIVIC_WALKS[1], STREETS.runas]], width: 112 },
  { kind: 'avenue', shape: 'stroke', points: [[STREETS.cristal, 1520], [STREETS.cristal, STREETS.oficinas + STREET / 2]], width: AVENUE },
  { kind: 'avenue', shape: 'stroke', points: [[STREETS.cristal, STREETS.runas], [STREETS.cristal, AVENUE_END]], width: AVENUE },
  { kind: 'avenue', shape: 'stroke', points: [[880, STREETS.runas], [6200, STREETS.runas]], width: AVENUE },
  { kind: 'market', shape: 'polygon', points: [[MARKET.x, MARKET.y], [MARKET.x + MARKET.w, MARKET.y], [MARKET.x + MARKET.w, MARKET.y + MARKET.h], [MARKET.x, MARKET.y + MARKET.h]] },
  { kind: 'plaza', shape: 'circle', center: PLAZA_CENTER, radius: PLAZA_RADIUS },
  { kind: 'plaza', shape: 'polygon', points: ARENA.plaza },
  { kind: 'plaza', shape: 'circle', center: LUME_PLAZA, radius: 210 },
  { kind: 'plaza', shape: 'circle', center: LAKE_SQUARE, radius: 120 },
]

function strokeDistance(x: number, y: number, points: readonly Point[]) {
  let best = Infinity
  const last = points.length - 2
  for (let i = 0; i <= last; i++) {
    const [ax, ay] = points[i]
    const [bx, by] = points[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)
    if ((i === 0 && t < 0) || (i === last && t > 1)) continue
    const clamped = Math.max(0, Math.min(1, t))
    best = Math.min(best, Math.hypot(x - (ax + clamped * dx), y - (ay + clamped * dy)))
  }
  return best
}

export function isPaved(x: number, y: number, margin = 0) {
  for (const p of PAVING) {
    if (p.shape === 'stroke') {
      if (strokeDistance(x, y, p.points) <= p.width / 2 + margin) return true
    } else if (p.shape === 'circle') {
      if (Math.hypot(x - p.center[0], y - p.center[1]) <= p.radius + margin) return true
    } else if (pointInPolygon(x, y, p.points)) return true
  }
  return false
}

export function isWater(x: number, y: number) {
  if (BRIDGES.some((bridge) => inRect(bridge.rect, x, y))) return false
  return WATER.some((polygon) => pointInPolygon(x, y, polygon))
}

export function isLand(x: number, y: number) {
  for (const polygon of LAND) if (pointInPolygon(x, y, polygon)) return true
  for (let i = 0; i < LAND_STROKES.length; i++) {
    const box = CORRIDOR_BOUNDS[i]
    if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue
    if (distanceToPath(x, y, LAND_STROKES[i].path) <= LAND_STROKES[i].half) return true
  }
  return false
}

const ROOF_DEPTH: Record<BuildingStyle, number> = {
  cottage: 60,
  townhouse: 60,
  shell: 60,
  garden: 52,
  tower: 50,
  stone: 60,
  shop: 60,
  workshop: 60,
  civic: 72,
  academy: 72,
  barn: 60,
  greenhouse: 52,
  pavilion: 44,
  factory: 64,
  robotshop: 60,
  league: 64,
}

let buildingCount = 0
function building(style: BuildingStyle, x: number, bottom: number, widthArt: number, floors: number, extra: Partial<Building> = {}): Building {
  buildingCount++
  const h = facadeHeight(floors) + ROOF_DEPTH[style] * ART
  return {
    id: `${style}-${buildingCount}`,
    style,
    x,
    y: bottom - h,
    w: widthArt * ART,
    h,
    floors,
    seed: 1009 + buildingCount * 7919,
    ...extra,
  }
}

const BAND = {
  a: STREETS.mercado - STREET / 2 - 8,
  b: STREETS.oficinas - STREET / 2 - 8,
  c: STREETS.runas - AVENUE / 2 - 8,
  d: STREETS.jardins - STREET / 2 - 8,
  e: STREETS.pomar - STREET / 2 - 8,
  f: STREETS.lago - STREET / 2 - 8,
}

function siteBuilding(entry: Site, extra: Partial<Building> = {}): Building {
  buildingCount++
  return {
    id: entry.id,
    style: entry.kind,
    x: entry.rect.x,
    y: entry.rect.y,
    w: entry.rect.w,
    h: entry.rect.h,
    floors: entry.floors,
    seed: 1009 + buildingCount * 7919,
    ...extra,
  }
}
const SITE = Object.fromEntries(SITES.map((entry) => [entry.id, entry])) as Record<string, Site>

export const BUILDINGS: Building[] = [
  building('stone', 960, BAND.a, 136, 1, { roof: 'slate', wall: 'stone' }),
  building('workshop', 1824, BAND.a, 140, 1, { roof: 'terracotta', wall: 'stone', accent: 5 }),
  building('shop', 2448, BAND.a, 150, 2, { roof: 'ochre', accent: 0 }),
  siteBuilding(SITE['shop-norte'], { roof: 'plum', wall: 'cream', accent: 1 }),
  building('shop', 3768, BAND.a, 150, 2, { roof: 'terracotta', accent: 5 }),
  building('cottage', 4432, BAND.a, 136, 2, { roof: 'teal', accent: 1 }),
  building('stone', 900, BAND.b, 132, 2, { roof: 'terracotta', wall: 'stone', accent: 0 }),
  siteBuilding(SITE['shop-oeste'], { roof: 'slate', wall: 'sage', accent: 3 }),
  building('shop', 3888, BAND.b, 150, 2, { roof: 'teal', wall: 'cream', accent: 2 }),
  building('garden', 4832, BAND.b, 96, 1),
  building('academy', 1784, BAND.c, 200, 2, { roof: 'slate', wall: 'stone' }),
  building('civic', 2744, PLAZA_CENTER[1] - PLAZA_RADIUS - 24, 228, 2),
  leagueBuilding(),
  siteBuilding(SITE['factory-leste'], { roof: 'slate', wall: 'stone', accent: 5 }),
  building('shell', 5520, BAND.c, 128, 1, { roof: 'teal' }),
  siteBuilding(SITE['factory-oeste'], { roof: 'terracotta', wall: 'stone', accent: 2 }),
  building('townhouse', 1808, BAND.d, 160, 2, { roof: 'slate', wall: 'cream', accent: 3 }),
  siteBuilding(SITE['factory-sul'], { roof: 'slate', wall: 'stone', accent: 5 }),
  building('cottage', 4856, BAND.d, 132, 1, { roof: 'slate', accent: 6 }),
  building('garden', 5448, BAND.d, 150, 2),
  building('barn', 840, BAND.e, 150, 1, { roof: 'ochre', wall: 'wood' }),
  building('cottage', 3392, BAND.e, 140, 2, { roof: 'teal', accent: 4 }),
  building('garden', 4016, BAND.e, 140, 1),
  building('greenhouse', 4856, BAND.e, 140, 1),
  building('cottage', 1840, BAND.f, 128, 1, { roof: 'ochre', timber: true, accent: 5 }),
  building('shell', 3392, BAND.f, 140, 1, { roof: 'teal' }),
  siteBuilding(SITE['shop-sul'], { roof: 'plum', accent: 1 }),
  building('shell', 4856, BAND.f, 130, 1, { roof: 'teal' }),
  houseBuilding(),
  siteBuilding(SITE['shop-riacho'], { roof: 'teal', wall: 'cream', accent: 2 }),
  ...OUTSKIRTS_BUILDINGS.map((spec) => building(spec.style, spec.x, spec.bottom, spec.widthArt, spec.floors, spec.extra)),

  siteBuilding(SITE['factory-campos'], { roof: 'ochre', wall: 'wood', accent: 4 }),
  ...WOODS_BUILDINGS.map((spec) => building(spec.style, spec.x, spec.bottom, spec.widthArt, spec.floors, spec.extra)),
]

function leagueBuilding(): Building {
  buildingCount++
  return {
    id: LEAGUE.id,
    style: 'league',
    x: LEAGUE.rect.x,
    y: LEAGUE.rect.y,
    w: LEAGUE.rect.w,
    h: LEAGUE.rect.h,
    floors: LEAGUE.floors,
    roof: 'slate',
    wall: 'stone',
    accent: 6,
    seed: 1009 + buildingCount * 7919,
  }
}

function houseBuilding(): Building {
  buildingCount++
  return {
    id: HOUSE.id,
    style: 'cottage',
    x: HOUSE.rect.x,
    y: HOUSE.rect.y,
    w: HOUSE.rect.w,
    h: HOUSE.rect.h,
    floors: HOUSE.floors,
    roof: 'terracotta',
    wall: 'cream',
    timber: true,
    accent: 4,
    seed: 1009 + buildingCount * 7919,
  }
}

export const LANDMARKS: Landmark[] = [
  { kind: 'crystal-fountain', id: 'fountain', x: PLAZA_CENTER[0], y: PLAZA_CENTER[1], radius: 150 },
  {
    kind: 'lanterns',
    id: 'market-lanterns',
    x: MARKET.x + MARKET.w / 2,
    y: MARKET.y + MARKET.h / 2,
    points: [
      [-420, -200, 250],
      [-150, -260, 300],
      [180, -220, 270],
      [440, -150, 240],
      [-330, 150, 280],
      [60, 60, 330],
      [360, 190, 260],
    ],
  },
  { kind: 'ring-tower', id: 'ring-tower', x: TOWER_GARDEN[0], y: TOWER_GARDEN[1], base: { x: TOWER_GARDEN[0] - 84, y: TOWER_GARDEN[1] - 112, w: 168, h: 112 } },
  { kind: 'windmill', id: 'windmill-1', x: 2040, y: 5560, base: { x: 2040 - 76, y: 5560 - 96, w: 152, h: 96 } },
  { kind: 'windmill', id: 'windmill-2', x: 1180, y: 6420, base: { x: 1180 - 76, y: 6420 - 96, w: 152, h: 96 } },
  { kind: 'windmill', id: 'windmill-3', x: 2760, y: 6580, base: { x: 2760 - 76, y: 6580 - 96, w: 152, h: 96 } },
  {
    kind: 'islands',
    id: 'lake-islands',
    x: 6440,
    y: 6100,
    points: [
      [-300, -120, 230],
      [330, 170, 180],
    ],
  },
  { kind: 'lume-tree', id: 'lume-tree', x: LUME_PLAZA[0], y: LUME_PLAZA[1] - 20, base: { x: LUME_PLAZA[0] - 40, y: LUME_PLAZA[1] - 44, w: 80, h: 40 } },
  ...OUTSKIRTS_LANDMARKS,
]

export const FIELDS: Field[] = [
  { kind: 'wheat', rect: { x: 820, y: 5096, w: 680, h: 240 }, rows: 'h' },
  { kind: 'vegetables', rect: { x: 2232, y: 5104, w: 768, h: 360 }, rows: 'v' },
  { kind: 'lavender', rect: { x: 2232, y: 5520, w: 768, h: 248 }, rows: 'h' },
  { kind: 'lavender', rect: { x: 820, y: 6080, w: 200, h: 380 }, rows: 'v' },
  { kind: 'wheat', rect: { x: 1340, y: 6080, w: 220, h: 380 }, rows: 'v' },
  { kind: 'wheat', rect: { x: 1840, y: 6080, w: 560, h: 280 }, rows: 'h' },
  { kind: 'flowers', rect: { x: 2560, y: 6080, w: 480, h: 220 }, rows: 'v' },
  { kind: 'orchard', rect: { x: 1000, y: 7090, w: 1560, h: 260 }, rows: 'h' },
  ...OUTSKIRTS_FIELDS,
]

export const GARDENS: Garden[] = [
  { kind: 'flowers', rect: { x: 2700, y: 4520, w: 320, h: 250 } },
  { kind: 'flowers', rect: { x: 3380, y: 4520, w: 320, h: 250 } },
  { kind: 'glow-flowers', rect: { x: 7120, y: 3300, w: 200, h: 120 } },
  { kind: 'glow-flowers', rect: { x: 6700, y: 3560, w: 150, h: 110 } },
  { kind: 'flowers', rect: { x: 900, y: 3520, w: 180, h: 110 } },
  { kind: 'flowers', rect: { x: 1300, y: 2900, w: 160, h: 100 } },
  { kind: 'glow-flowers', rect: { x: HOUSE.rect.x + 24, y: HOUSE.bottom + 12, w: 150, h: 70 } },
  { kind: 'flowers', rect: { x: HOUSE.rect.x + HOUSE.rect.w - 174, y: HOUSE.bottom + 12, w: 150, h: 70 } },
  ...OUTSKIRTS_GARDENS,
  ...WOODS_GARDENS,
]

const fenceAround = (x: number, y: number, w: number, h: number): Fence => ({
  kind: 'wood',
  points: [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
    [x, y],
  ],
})

export const FENCES: Fence[] = [
  fenceAround(800, 5080, 720, 272),
  fenceAround(2216, 5088, 800, 696),
  fenceAround(800, 6064, 240, 412),
  fenceAround(1320, 6064, 260, 412),
  fenceAround(1824, 6064, 592, 312),
  fenceAround(2544, 6064, 512, 252),
  { kind: 'hedge', points: [[2660, 4480], [3040, 4480]] },
  { kind: 'hedge', points: [[3360, 4480], [3740, 4480]] },
  ...OUTSKIRTS_FENCES,
]

export const STALLS: Stall[] = [
  { x: 2640, y: 1784, w: 176, h: 120, color: 0, goods: 'fruit' },
  { x: 2856, y: 1784, w: 176, h: 120, color: 2, goods: 'bread' },
  { x: 2640, y: 2040, w: 176, h: 120, color: 1, goods: 'crystals' },
  { x: 2856, y: 2040, w: 176, h: 120, color: 3, goods: 'fabric' },
  { x: 2640, y: 2296, w: 176, h: 120, color: 4, goods: 'flowers' },
  { x: 2856, y: 2296, w: 176, h: 120, color: 5, goods: 'potions' },
  { x: 3368, y: 1784, w: 176, h: 120, color: 6, goods: 'potions' },
  { x: 3584, y: 1784, w: 176, h: 120, color: 1, goods: 'fruit' },
  { x: 3368, y: 2040, w: 176, h: 120, color: 3, goods: 'flowers' },
  { x: 3584, y: 2040, w: 176, h: 120, color: 0, goods: 'crystals' },
  { x: 3368, y: 2296, w: 176, h: 120, color: 2, goods: 'fabric' },
  { x: 3584, y: 2296, w: 176, h: 120, color: 4, goods: 'bread' },
]

const props: Prop[] = []
let propSeed = 1
function prop(kind: Prop['kind'], x: number, y: number) {
  if (kind === 'lamp' && !lampAllowed(x, y)) return
  props.push({ kind, x: Math.round(x), y: Math.round(y), seed: propSeed++ })
}

export function landmarkSpriteRect(landmark: Landmark): Rect | null {
  if (landmark.kind === 'windmill') return { x: landmark.x - 110, y: landmark.y - 470, w: 220, h: 510 }
  if (landmark.kind === 'ring-tower') return { x: landmark.x - 190, y: landmark.y - 740, w: 380, h: 780 }
  if (landmark.kind === 'lume-tree') return { x: landmark.x - 200, y: landmark.y - 420, w: 400, h: 460 }
  return null
}

function lampAllowed(x: number, y: number) {
  if (!isPaved(x, y)) return false
  if (BUILDINGS.some((b) => inRect({ x: b.x - 56, y: b.y, w: b.w + 112, h: b.h + 72 }, x, y))) return false
  if (STALLS.some((s) => inRect({ x: s.x - 40, y: s.y - 40, w: s.w + 80, h: s.h + 80 }, x, y))) return false
  if (LANDMARKS.some((l) => {
    const rect = landmarkSpriteRect(l)
    return rect ? inRect({ x: rect.x - 40, y: rect.y, w: rect.w + 80, h: rect.h + 60 }, x, y) : false
  }))
    return false
  if (props.some((p) => p.kind === 'lamp' && Math.hypot(p.x - x, p.y - y) < 140)) return false
  return true
}

function crossesStreet(value: number, lines: number[], clearance: number) {
  return lines.some((line) => Math.abs(value - line) < clearance)
}

const EW = [STREETS.mercado, STREETS.oficinas, STREETS.runas, STREETS.jardins, STREETS.pomar, STREETS.lago]
const NS = [STREETS.oeste, STREETS.cristal, STREETS.leste]

function doorwayNear(x: number, y: number, clearance: number) {
  return BUILDINGS.some((b) => Math.abs(b.x + (b.door ?? b.w / 2) - x) < clearance && Math.abs(b.y + b.h - y) < 200)
}

function inSquare(x: number, y: number, margin: number) {
  return (
    inRect({ x: MARKET.x - margin, y: MARKET.y - margin, w: MARKET.w + margin * 2, h: MARKET.h + margin * 2 }, x, y) ||
    Math.hypot(x - PLAZA_CENTER[0], y - PLAZA_CENTER[1]) < PLAZA_RADIUS + margin ||
    inRect({ x: ARENA.plaza[7][0] - margin, y: ARENA.plaza[0][1] - margin, w: ARENA.plaza[2][0] - ARENA.plaza[7][0] + margin * 2, h: ARENA.plaza[4][1] - ARENA.plaza[0][1] + margin * 2 }, x, y)
  )
}

for (let y = 1760; y < LOOKOUT[1] - 200; y += 400) {
  if (crossesStreet(y, EW, 240) || inSquare(STREETS.cristal, y, 140)) continue
  prop('lamp', STREETS.cristal - 76, y)
  prop('lamp', STREETS.cristal + 76, y)
}
for (let x = 1000; x < 6100; x += 400) {
  if (crossesStreet(x, NS, 240) || inSquare(x, STREETS.runas, 140) || Math.abs(x - TOWER_GARDEN[0]) < 120) continue
  if (!doorwayNear(x, STREETS.runas - AVENUE / 2, 70)) prop('lamp', x, STREETS.runas - 76)
  prop('lamp', x, STREETS.runas + 76)
}
for (const line of [STREETS.mercado, STREETS.oficinas, STREETS.jardins]) {
  for (let x = 1100; x < 5400; x += 560) {
    if (crossesStreet(x, NS, 260) || inSquare(x, line, 100)) continue
    prop('lamp', x, line + STREET / 2 - 14)
  }
}
for (const line of [STREETS.pomar, STREETS.lago]) {
  for (let x = 2000; x < 5200; x += 620) {
    if (x < 3100 || crossesStreet(x, NS, 260)) continue
    prop('lamp', x, line + STREET / 2 - 14)
  }
}
{
  const quaySide = offsetPath(PROMENADE_PATH, -(PROMENADE_WIDTH / 2 - 16))
  let travelled = 220
  for (let i = 1; i < quaySide.length - 1; i++) {
    travelled += Math.hypot(quaySide[i][0] - quaySide[i - 1][0], quaySide[i][1] - quaySide[i - 1][1])
    if (travelled < 460) continue
    const [x, y] = quaySide[i]
    if (crossesStreet(y, EW, 180)) continue
    travelled = 0
    prop('lamp', x, y)
  }
}
for (const angle of [45, 135, 225, 315]) {
  const radians = (angle * Math.PI) / 180
  prop('bench-h', PLAZA_CENTER[0] + Math.cos(radians) * 330, PLAZA_CENTER[1] + Math.sin(radians) * 300)
}
for (const [x, y] of ARENA.benches) prop('bench-h', x, y)
for (const [x, y] of ARENA.lamps) prop('lamp', x, y)
prop('bench-h', LUME_PLAZA[0] - 130, LUME_PLAZA[1] + 120)
prop('bench-h', LUME_PLAZA[0] + 130, LUME_PLAZA[1] + 120)
prop('bench-h', TOWER_GARDEN[0] - 190, TOWER_GARDEN[1] + 150)
prop('bench-h', TOWER_GARDEN[0] + 190, TOWER_GARDEN[1] + 150)
prop('bench-h', HOUSE.door[0] + 150, HOUSE.bottom + 150)
prop('planter', HOUSE.rect.x + HOUSE.rect.w + 24, HOUSE.bottom - 10)
prop('well', 1500, 2420)
prop('crates', 2604, 2500)
prop('crates', 3796, 1768)
prop('barrels', 1472, 5792)
prop('cart', 1508, 5560)
for (const spec of OUTSKIRTS_PROPS) prop(spec.kind, spec.x, spec.y)
for (const spec of WOODS_PROPS) prop(spec.kind, spec.x, spec.y)

export const PROPS: Prop[] = props

export const TREE_VARIANTS: Record<TreeKind, { size: number; seed: number }[]> = {
  oak: [
    { size: 18, seed: 11 },
    { size: 21, seed: 12 },
    { size: 24, seed: 13 },
    { size: 20, seed: 14 },
    { size: 26, seed: 15 },
    { size: 17, seed: 16 },
  ],
  birch: [
    { size: 14, seed: 21 },
    { size: 16, seed: 22 },
  ],
  pine: [
    { size: 17, seed: 31 },
    { size: 20, seed: 32 },
  ],
  blossom: [
    { size: 18, seed: 41 },
    { size: 21, seed: 42 },
  ],
  lume: [{ size: 34, seed: 51 }],
  bush: [
    { size: 8, seed: 61 },
    { size: 10, seed: 62 },
    { size: 9, seed: 63 },
  ],
}

export function treeReach(tree: Pick<Tree, 'kind' | 'size'>) {
  const r = tree.size * ART
  if (tree.kind === 'pine') return { half: r * 1.1, up: r * 3.1 }
  if (tree.kind === 'bush') return { half: r * 1.4, up: r * 1.9 }
  if (tree.kind === 'birch') return { half: r * 1.1, up: r * 3.4 }
  return { half: r * 1.3, up: r * 2.8 }
}

export function treeBase(tree: Pick<Tree, 'kind' | 'size' | 'x' | 'y'>): Rect {
  const half = tree.kind === 'bush' ? tree.size * ART * 1.1 : Math.max(20, tree.size * ART * 0.3)
  const depth = tree.kind === 'bush' ? tree.size * ART * 0.7 : 28
  return { x: tree.x - half, y: tree.y - depth, w: half * 2, h: depth }
}

const trees: Tree[] = []

function blockedForTree(x: number, y: number, kind: TreeKind, size: number) {
  const reach = treeReach({ kind, size })
  const canopy: Rect = { x: x - reach.half, y: y - reach.up, w: reach.half * 2, h: reach.up + 16 }
  if (!isLand(x, y) || isWater(x, y)) return true
  if (WATER.some((w) => pointInPolygon(x, y - 60, w) || pointInPolygon(x - 60, y, w) || pointInPolygon(x + 60, y, w))) return true
  if (isPaved(x, y, 56)) return true
  if (inRect({ x: ARENA.plaza[7][0] - 100, y: ARENA.plaza[0][1] - 100, w: ARENA.plaza[2][0] - ARENA.plaza[7][0] + 200, h: ARENA.plaza[4][1] - ARENA.plaza[0][1] + 200 }, x, y)) return true
  if (OUTSKIRTS_BRIDGES.some((bridge) => inRect({ x: bridge.rect.x - 60, y: bridge.rect.y - 60, w: bridge.rect.w + 120, h: bridge.rect.h + 120 }, x, y))) return true
  if (RESTS.some((rest) => Math.hypot(rest.pad[0] - x, rest.pad[1] - y) < rest.padRadius + 70)) return true
  if (BUILDINGS.some((b) => rectsOverlap(canopy, b, 24))) return true
  if (STALLS.some((s) => rectsOverlap(canopy, s, 16))) return true
  if (FIELDS.some((f) => f.kind !== 'orchard' && inRect({ x: f.rect.x - 40, y: f.rect.y - 40, w: f.rect.w + 80, h: f.rect.h + 80 }, x, y))) return true
  if (GARDENS.some((g) => inRect({ x: g.rect.x - 30, y: g.rect.y - 30, w: g.rect.w + 60, h: g.rect.h + 60 }, x, y))) return true
  if (LANDMARKS.some((l) => Math.hypot(l.x - x, l.y - y) < (l.kind === 'islands' ? 0 : l.kind === 'lume-tree' ? 330 : 260))) return true
  if (LANDMARKS.some((l) => {
    const rect = landmarkSpriteRect(l)
    return rect ? rectsOverlap(canopy, rect, 16) : false
  }))
    return true
  if (props.some((p) => Math.hypot(p.x - x, p.y - y) < 90)) return true
  if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < (t.size + size) * ART * 0.92)) return true
  if (!isLand(x - reach.half, y - reach.up * 0.5) || !isLand(x + reach.half, y - reach.up * 0.5)) return true
  return false
}

function plant(kind: TreeKind, x: number, y: number, variant = 0) {
  const spec = TREE_VARIANTS[kind][variant % TREE_VARIANTS[kind].length]
  trees.push({ kind, x: Math.round(x), y: Math.round(y), size: spec.size, seed: variant % TREE_VARIANTS[kind].length })
}

plant('lume', LUME_PLAZA[0], LUME_PLAZA[1] - 20)

{
  const orchard = FIELDS.find((field) => field.kind === 'orchard')?.rect
  if (orchard) {
    for (let x = 1120; x < 2960; x += 200) {
      for (const y of [7170, 7320]) {
        const trunkX = x + (y === 7320 ? 100 : 0)
        if (trunkX > orchard.x + orchard.w - 60) continue
        plant(x % 400 === 120 ? 'blossom' : 'oak', trunkX, y, x % 3)
      }
    }
  }
}

for (const { field, rows } of OUTSKIRTS_ORCHARD_ROWS) {
  const orchard = OUTSKIRTS_FIELDS[field].rect
  for (let x = orchard.x + 80; x < orchard.x + orchard.w - 60; x += 200) {
    rows.forEach((y, row) => {
      const trunkX = x + row * 100
      if (trunkX > orchard.x + orchard.w - 60) return
      plant((x / 200) % 2 === 1 ? 'blossom' : 'oak', trunkX, y, Math.floor(x / 200) % 3)
    })
  }
}

{
  const rng = random(20260930)
  const step = 112
  for (let gy = 860; gy < 7900; gy += step) {
    for (let gx = 800; gx < 7440; gx += step) {
      const x = gx + (rng() - 0.5) * step * 0.9
      const y = gy + (rng() - 0.5) * step * 0.9
      const park = x > 6440 || (x > 5400 && y > 5200) || Math.hypot(x - TOWER_GARDEN[0], y - TOWER_GARDEN[1]) < 520
      const density = park ? 0.78 : 0.7
      if (rng() > density) continue
      const roll = rng()
      const kind: TreeKind = park
        ? roll < 0.4
          ? 'oak'
          : roll < 0.62
            ? 'birch'
            : roll < 0.8
              ? 'blossom'
              : 'bush'
        : roll < 0.55
          ? 'oak'
          : roll < 0.7
            ? 'birch'
            : roll < 0.78
              ? 'pine'
              : roll < 0.86
                ? 'blossom'
                : 'bush'
      const variant = Math.floor(rng() * 6)
      const size = TREE_VARIANTS[kind][variant % TREE_VARIANTS[kind].length].size
      if (blockedForTree(x, y, kind, size)) continue
      plant(kind, x, y, variant)
    }
  }
}

{
  const rng = random(20261004)
  const step = 112
  for (let gy = 860; gy < SIZE - 400; gy += step) {
    for (let gx = 800; gx < SIZE - 400; gx += step) {
      if (gx < 7440 && gy < 7900) continue
      const x = gx + (rng() - 0.5) * step * 0.9
      const y = gy + (rng() - 0.5) * step * 0.9
      if (woodsZoneAt(x, y)) continue
      const settled = pointInPolygon(x, y, OUTSKIRTS_LAND[OUTSKIRTS_LAND.length - 1]) || pointInPolygon(x, y, OUTSKIRTS_LAND[OUTSKIRTS_LAND.length - 2])
      const density = settled ? 0.62 : 0.8
      if (rng() > density) continue
      const roll = rng()
      const kind: TreeKind = settled
        ? roll < 0.45
          ? 'oak'
          : roll < 0.62
            ? 'birch'
            : roll < 0.8
              ? 'blossom'
              : 'bush'
        : roll < 0.42
          ? 'oak'
          : roll < 0.74
            ? 'pine'
            : roll < 0.84
              ? 'birch'
              : 'bush'
      const variant = Math.floor(rng() * 6)
      const size = TREE_VARIANTS[kind][variant % TREE_VARIANTS[kind].length].size
      if (blockedForTree(x, y, kind, size)) continue
      plant(kind, x, y, variant)
    }
  }
}

for (const [zoneIndex, zone] of WOODS_ZONES.entries()) {
  const rng = random(20261011 + zoneIndex * 101)
  const bounds = polygonBounds(zone.polygon)
  const weights = zone.mix.reduce((sum, [, weight]) => sum + weight, 0)
  const pick = (roll: number): TreeKind => {
    let acc = 0
    for (const [kind, weight] of zone.mix) {
      acc += weight / weights
      if (roll < acc) return kind
    }
    return zone.mix[zone.mix.length - 1][0]
  }
  for (let gy = bounds.y; gy < bounds.y + bounds.h; gy += zone.step) {
    for (let gx = bounds.x; gx < bounds.x + bounds.w; gx += zone.step) {
      const x = gx + (rng() - 0.5) * zone.step * 0.9
      const y = gy + (rng() - 0.5) * zone.step * 0.9
      const density = rng()
      const open = rng()
      const roll = rng()
      const variant = Math.floor(rng() * 6)
      if (x < 200 || y < 200 || x > SIZE - 200 || y > SIZE - 200) continue
      if (!pointInPolygon(x, y, zone.polygon)) continue
      if (density > zone.density) continue
      if (open < openness(x, y)) continue
      const kind = pick(roll)
      const size = TREE_VARIANTS[kind][variant % TREE_VARIANTS[kind].length].size
      if (blockedForTree(x, y, kind, size)) continue
      plant(kind, x, y, variant)
    }
  }
}

{
  const rng = random(20261012)
  for (const camp of CAMPS) {
    for (let i = 0; i < 10; i++) {
      const angle = rng() * Math.PI * 2
      const d = camp.radius * (0.86 + rng() * 0.18)
      const x = camp.center[0] + Math.cos(angle) * d
      const y = camp.center[1] + Math.sin(angle) * d * 0.9
      if (!blockedForTree(x, y, 'bush', 9)) plant('bush', x, y, Math.floor(rng() * 3))
    }
  }
}

export const TREES: Tree[] = trees.filter(
  (tree) => Math.hypot(tree.x - CRATER_FLOOR.center[0], tree.y - CRATER_FLOOR.center[1]) >= CRATER_FLOOR.radius,
)

export type Region = {
  id: string
  name: string
  type: 'city' | 'nature' | 'camp' | 'village'
  position: Point
  labelPosition: Point
  description: string

  kicker?: string
}

const at = (x: number, y: number): Point => [Math.round((x / SIZE) * 1000) / 1000, Math.round((y / SIZE) * 1000) / 1000]

export const REGIONS: Region[] = [
  {
    id: 'center',
    name: 'Praça do Cristal',
    type: 'city',
    position: at(PLAZA_CENTER[0], PLAZA_CENTER[1]),
    labelPosition: at(PLAZA_CENTER[0], PLAZA_CENTER[1] + 360),
    description: 'O coração de Bosque Alto: um cristal flutua sobre a fonte e ergue fios de água no ar, diante do Conselho de cúpula dourada.',
  },
  {
    id: 'old-town',
    name: 'Bairro Antigo',
    type: 'city',
    position: at(TOWER_GARDEN[0], TOWER_GARDEN[1]),
    labelPosition: at(TOWER_GARDEN[0], TOWER_GARDEN[1] + 320),
    description: 'Casas de pedra, oficinas e a Torre dos Anéis, cujos aros de pedra giram sozinhos em volta da agulha.',
  },
  {
    id: 'market',
    name: 'Mercado das Lanternas',
    type: 'city',
    position: at(MARKET.x + MARKET.w / 2, MARKET.y + MARKET.h / 2),
    labelPosition: at(MARKET.x + MARKET.w / 2, MARKET.y + MARKET.h - 60),
    description: 'Barracas coloridas sob lanternas que pairam no ar sem fio nem mastro. Frutas, cristais, tecidos e poções.',
  },
  {
    id: 'windmills',
    name: 'Vila dos Moinhos',
    type: 'city',
    position: at(1900, 6100),
    labelPosition: at(1900, 6300),
    description: 'Hortas, trigais e lavandas cercados de madeira. As pás dos moinhos giram soltas no ar, presas a nada.',
  },
  {
    id: 'lake',
    name: 'Jardins do Lago',
    type: 'nature',
    position: at(6440, 6100),
    labelPosition: at(6440, 6860),
    description: 'Um lago calmo com duas ilhas de pedra que flutuam sobre a água e derramam pequenas cascatas.',
  },
  {
    id: 'park',
    name: 'Parque da Árvore-Lume',
    type: 'nature',
    position: at(LUME_PLAZA[0], LUME_PLAZA[1]),
    labelPosition: at(LUME_PLAZA[0], LUME_PLAZA[1] + 280),
    description: 'Na margem leste do canal, uma árvore de folhas luminosas solta faíscas de luz. A trilha do acampamento chega aqui.',
  },
  {
    id: 'arena',
    name: ARENA.name,
    type: 'city',
    position: at(ARENA.center[0], ARENA.center[1]),
    labelPosition: at(ARENA.center[0], ARENA.center[1] + 240),
    description: 'No fim da avenida, um ringue de cordas sob quatro holofotes. Aqui os campeões de Bosque Alto enfrentam os robôs das fábricas.',
  },
  {
    id: 'camp',
    name: 'Cratera do Acampamento',
    type: 'camp',
    position: at(CAMPFIRE[0], CAMPFIRE[1] - 120),
    labelPosition: at(CAMPFIRE[0], CAMPFIRE[1] + 540),
    description:
      'A clareira do antigo acampamento, agora marcada pela cratera onde o meteoro caiu. Ligada à cidade por uma única trilha.',
  },
  ...OUTSKIRTS_REGIONS.map(
    (region): Region => ({
      ...region,
      position: at(region.position[0], region.position[1]),
      labelPosition: at(region.labelPosition[0], region.labelPosition[1]),
    }),
  ),
  ...WOODS_REGIONS.map(
    (region): Region => ({
      ...region,
      kicker: region.type === 'camp' ? 'Acampamento na mata' : 'Floresta de Bosque Alto',
      position: at(region.position[0], region.position[1]),
      labelPosition: at(region.labelPosition[0], region.labelPosition[1]),
    }),
  ),
]
