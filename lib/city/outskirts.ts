import { smoothLoop, smoothPath, strokePath, type Point, type Polygon, type Rect } from './geometry'
import type { Bridge, Building, BuildingStyle, Fence, Field, Garden, Landmark, Paving, PropKind } from './model'

export type BuildingSpec = {
  style: BuildingStyle
  x: number
  bottom: number
  widthArt: number
  floors: number
  extra?: Partial<Building>
}

export type PropSpec = { kind: PropKind; x: number; y: number }

export type Rest = { id: string; name: string; center: Point; radius: number; pad: Point; padRadius: number }

const circle = (cx: number, cy: number, radius: number, seed: number, step = 44): Polygon =>
  smoothLoop(
    Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2
      const wobble = 1 + (Math.sin(seed + i * 2.7) * 0.5 + Math.cos(seed * 1.3 + i * 1.9) * 0.5) * 0.11
      return [cx + Math.cos(angle) * radius * wobble, cy + Math.sin(angle) * radius * 0.92 * wobble] as Point
    }),
    step,
  )

export const BROOK_PATH: Point[] = smoothPath(
  [
    [8300, 6338],
    [8800, 6300],
    [9200, 6230],
    [9600, 6180],
    [10000, 6170],
    [10400, 6200],
    [10800, 6260],
    [11200, 6300],
    [11700, 6290],
    [12400, 6260],
  ],
  40,
)
export const BROOK_HALF = 64
export const BROOK: Polygon = strokePath(BROOK_PATH, BROOK_HALF)

export const POND_CENTER: Point = [5900, 10950]
export const POND: Polygon = smoothLoop(
  [
    [5570, 10950],
    [5640, 10790],
    [5820, 10710],
    [6060, 10730],
    [6220, 10850],
    [6240, 11010],
    [6120, 11160],
    [5900, 11210],
    [5680, 11140],
    [5580, 11050],
  ],
  32,
)

const TRAIL_WIDTH = 100
const CORRIDOR_HALF = 180

export const TRAIL_EAST_PATH: Point[] = smoothPath(
  [
    [7285, 6480],
    [7480, 6500],
    [7700, 6480],
    [7960, 6570],
    [8160, 6730],
    [8420, 6790],
    [8640, 6730],
    [8820, 6810],
    [9020, 6900],
    [9150, 6900],
  ],
  32,
)

export const TRAIL_HILLS_PATH: Point[] = smoothPath(
  [
    [10700, 7640],
    [10900, 7760],
    [11060, 8000],
    [11040, 8300],
    [10840, 8560],
    [10540, 8720],
    [10240, 8760],
    [9960, 8920],
    [9760, 9160],
    [9460, 9320],
    [9120, 9340],
    [8800, 9480],
    [8520, 9700],
    [8180, 9780],
    [7880, 9720],
    [7560, 9780],
    [7240, 9920],
    [6900, 9940],
    [6620, 9860],
    [6420, 9800],
  ],
  32,
)

export const TRAIL_SOUTH_PATH: Point[] = smoothPath(
  [
    [5200, 6980],
    [5210, 7300],
    [5270, 7620],
    [5330, 7940],
    [5280, 8260],
    [5120, 8540],
    [4980, 8800],
    [4880, 9040],
    [4800, 9230],
  ],
  32,
)

export const TRAILS: readonly { id: string; path: Point[] }[] = [
  { id: 'east', path: TRAIL_EAST_PATH },
  { id: 'hills', path: TRAIL_HILLS_PATH },
  { id: 'south', path: TRAIL_SOUTH_PATH },
]

export const RESTS: readonly Rest[] = [
  { id: 'descanso-riacho', name: 'Descanso do Riacho', center: [8420, 6790], radius: 230, pad: [8420, 6705], padRadius: 64 },
  { id: 'descanso-carvalho', name: 'Descanso do Carvalho', center: [10240, 8760], radius: 240, pad: [10240, 8675], padRadius: 64 },
  { id: 'mirante-colinas', name: 'Mirante das Colinas', center: [8180, 9780], radius: 260, pad: [8200, 9700], padRadius: 90 },
  { id: 'descanso-sul', name: 'Descanso do Sul', center: [5120, 8540], radius: 220, pad: [5030, 8545], padRadius: 60 },
]

export const VILLAGE: Polygon = smoothLoop(
  [
    [9000, 6980],
    [9020, 6500],
    [9080, 5900],
    [9240, 5300],
    [9560, 5040],
    [10000, 4960],
    [10500, 4980],
    [10900, 5120],
    [11180, 5500],
    [11240, 6000],
    [11260, 6600],
    [11240, 7000],
    [11140, 7500],
    [10920, 7820],
    [10500, 7980],
    [10000, 8000],
    [9560, 7940],
    [9240, 7760],
    [9060, 7440],
  ],
  48,
)

export const FARMS: Polygon = smoothLoop(
  [
    [2960, 9400],
    [3120, 9040],
    [3600, 8900],
    [4300, 8860],
    [4800, 8880],
    [5400, 8900],
    [6100, 8960],
    [6560, 9200],
    [6780, 9600],
    [6800, 10100],
    [6740, 10600],
    [6560, 11060],
    [6160, 11380],
    [5500, 11520],
    [4700, 11540],
    [3900, 11460],
    [3300, 11240],
    [3000, 10800],
    [2900, 10200],
  ],
  48,
)

export const VILLAGE_SQUARE: Point = [9940, 6900]
export const VILLAGE_SQUARE_RADIUS = 200
export const FARM_CROSSING: Point = [4800, 9800]
export const FARM_CROSSING_RADIUS = 160

export const VILLAGE_STREETS = { main: 6900, north: 5900, south: 7640, lane: 9940 } as const
export const FARM_ROADS = { main: 9800, south: 10700, lane: 4800 } as const

export const OUTSKIRTS_LAND: readonly Polygon[] = [...RESTS.map((rest, index) => circle(rest.center[0], rest.center[1], rest.radius, 3 + index)), VILLAGE, FARMS]

export const OUTSKIRTS_CORRIDORS: readonly { path: Point[]; half: number }[] = TRAILS.map((trail) => ({ path: trail.path, half: CORRIDOR_HALF }))

export const OUTSKIRTS_BRIDGES: Bridge[] = [{ rect: { x: 9880, y: 6076, w: 120, h: 224 }, axis: 'v', kind: 'wood' }]

export const OUTSKIRTS_PAVING: Paving[] = [
  ...TRAILS.map((trail): Paving => ({ kind: 'dirt', shape: 'stroke', points: trail.path, width: TRAIL_WIDTH })),
  ...RESTS.map((rest): Paving => ({ kind: 'gravel', shape: 'circle', center: rest.pad, radius: rest.padRadius })),
  { kind: 'dirt', shape: 'stroke', points: [[9300, VILLAGE_STREETS.north], [10900, VILLAGE_STREETS.north]], width: 128 },
  { kind: 'dirt', shape: 'stroke', points: [[9200, VILLAGE_STREETS.south], [10700, VILLAGE_STREETS.south]], width: 128 },
  { kind: 'gravel', shape: 'stroke', points: [[VILLAGE_STREETS.lane, VILLAGE_STREETS.north], [VILLAGE_STREETS.lane, 6090]], width: 96 },
  { kind: 'gravel', shape: 'stroke', points: [[VILLAGE_STREETS.lane, 6290], [VILLAGE_STREETS.lane, VILLAGE_STREETS.south]], width: 96 },
  { kind: 'street', shape: 'stroke', points: [[9150, VILLAGE_STREETS.main], [11040, VILLAGE_STREETS.main]], width: 160 },
  { kind: 'plaza', shape: 'circle', center: VILLAGE_SQUARE, radius: VILLAGE_SQUARE_RADIUS },
  { kind: 'dirt', shape: 'stroke', points: [[3200, FARM_ROADS.main], [6420, FARM_ROADS.main]], width: 128 },
  { kind: 'dirt', shape: 'stroke', points: [[3300, FARM_ROADS.south], [6300, FARM_ROADS.south]], width: 112 },
  { kind: 'dirt', shape: 'stroke', points: [[FARM_ROADS.lane, 10900], [5100, 10960], [5400, 10980], [5540, 10960]], width: 80 },
  { kind: 'gravel', shape: 'stroke', points: [[FARM_ROADS.lane, 9200], [FARM_ROADS.lane, 10900]], width: 96 },
  { kind: 'gravel', shape: 'circle', center: FARM_CROSSING, radius: FARM_CROSSING_RADIUS },
]

const above = (street: number, width: number) => street - width / 2 - 8

export const OUTSKIRTS_BUILDINGS: readonly BuildingSpec[] = [

  { style: 'cottage', x: 9340, bottom: above(VILLAGE_STREETS.north, 128), widthArt: 120, floors: 1, extra: { roof: 'moss', wall: 'cream', timber: true, accent: 2 } },
  { style: 'cottage', x: 10560, bottom: above(VILLAGE_STREETS.north, 128), widthArt: 96, floors: 1, extra: { roof: 'terracotta', wall: 'cream', accent: 5 } },

  { style: 'barn', x: 9120, bottom: above(VILLAGE_STREETS.main, 160), widthArt: 150, floors: 1, extra: { roof: 'moss' } },
  { style: 'shop', x: 10180, bottom: above(VILLAGE_STREETS.main, 160), widthArt: 136, floors: 1, extra: { roof: 'ochre', wall: 'cream', accent: 0 } },
  { style: 'cottage', x: 10760, bottom: above(VILLAGE_STREETS.main, 160), widthArt: 100, floors: 1, extra: { roof: 'slate', wall: 'sage', accent: 3 } },

  { style: 'cottage', x: 9240, bottom: above(VILLAGE_STREETS.south, 128), widthArt: 112, floors: 1, extra: { roof: 'ochre', wall: 'plaster', timber: true, accent: 5 } },
  { style: 'garden', x: 10080, bottom: above(VILLAGE_STREETS.south, 128), widthArt: 120, floors: 1 },

  { style: 'barn', x: 3320, bottom: above(FARM_ROADS.main, 128), widthArt: 160, floors: 1, extra: { roof: 'terracotta' } },
  { style: 'greenhouse', x: 4080, bottom: above(FARM_ROADS.main, 128), widthArt: 130, floors: 1 },
  { style: 'cottage', x: 4960, bottom: above(FARM_ROADS.main, 128), widthArt: 136, floors: 2, extra: { roof: 'moss', wall: 'cream', timber: true, accent: 4 } },
  { style: 'pavilion', x: 5640, bottom: above(FARM_ROADS.main, 128), widthArt: 120, floors: 1, extra: { roof: 'ochre' } },

  { style: 'stone', x: 3500, bottom: above(FARM_ROADS.south, 112), widthArt: 120, floors: 1, extra: { roof: 'slate', wall: 'stone' } },
  { style: 'barn', x: 5300, bottom: above(FARM_ROADS.south, 112), widthArt: 140, floors: 1, extra: { roof: 'ochre' } },
]

export const RIVERSIDE_SHOP = { x: 9980, bottom: above(VILLAGE_STREETS.north, 128), widthArt: 140, floors: 2 } as const

export const FARM_MILL = { x: 4060, bottom: above(FARM_ROADS.south, 112), widthArt: 148, floors: 1 } as const

export const OUTSKIRTS_FIELDS: Field[] = [
  { kind: 'wheat', rect: { x: 3320, y: 9960, w: 640, h: 200 }, rows: 'h' },
  { kind: 'lavender', rect: { x: 4080, y: 9900, w: 560, h: 190 }, rows: 'h' },
  { kind: 'vegetables', rect: { x: 4920, y: 9960, w: 600, h: 200 }, rows: 'v' },
  { kind: 'flowers', rect: { x: 5640, y: 9960, w: 520, h: 180 }, rows: 'v' },
  { kind: 'orchard', rect: { x: 3400, y: 10880, w: 1200, h: 300 }, rows: 'h' },
  { kind: 'vegetables', rect: { x: 10640, y: 7180, w: 400, h: 300 }, rows: 'v' },
]

export const OUTSKIRTS_GARDENS: Garden[] = [
  { kind: 'flowers', rect: { x: 9760, y: 7260, w: 120, h: 100 } },
  { kind: 'flowers', rect: { x: 3300, y: 10400, w: 150, h: 90 } },
  { kind: 'glow-flowers', rect: { x: 8090, y: 9880, w: 130, h: 80 } },
]

const fenceAround = ({ x, y, w, h }: Rect, margin = 16): Fence => ({
  kind: 'wood',
  points: [
    [x - margin, y - margin],
    [x + w + margin, y - margin],
    [x + w + margin, y + h + margin],
    [x - margin, y + h + margin],
    [x - margin, y - margin],
  ],
})

export const OUTSKIRTS_FENCES: Fence[] = OUTSKIRTS_FIELDS.filter((field) => field.kind !== 'orchard').map((field) => fenceAround(field.rect))

export const OUTSKIRTS_LANDMARKS: Landmark[] = [
  { kind: 'windmill', id: 'windmill-4', x: 6360, y: 10460, base: { x: 6360 - 76, y: 10460 - 96, w: 152, h: 96 } },
  { kind: 'windmill', id: 'windmill-5', x: 3160, y: 10300, base: { x: 3160 - 76, y: 10300 - 96, w: 152, h: 96 } },
]

export const OUTSKIRTS_PROPS: readonly PropSpec[] = [

  { kind: 'well', x: 10040, y: 6800 },
  { kind: 'bench-h', x: 9846, y: 7030 },
  { kind: 'bench-h', x: 10034, y: 7030 },
  { kind: 'crates', x: 9820, y: 6700 },
  { kind: 'barrels', x: 10600, y: 7540 },
  { kind: 'cart', x: 9500, y: 7100 },
  { kind: 'lamp', x: 9320, y: VILLAGE_STREETS.main + 66 },
  { kind: 'lamp', x: 9640, y: VILLAGE_STREETS.main + 66 },
  { kind: 'lamp', x: 10240, y: VILLAGE_STREETS.main + 66 },
  { kind: 'lamp', x: 10560, y: VILLAGE_STREETS.main + 66 },
  { kind: 'lamp', x: 10840, y: VILLAGE_STREETS.main + 66 },

  { kind: 'well', x: 6260, y: 9690 },
  { kind: 'crates', x: 4000, y: 9690 },
  { kind: 'barrels', x: 5240, y: 10600 },
  { kind: 'cart', x: 5932, y: 10630 },
  { kind: 'lamp', x: 4690, y: 9910 },
  { kind: 'lamp', x: 4910, y: 9910 },
  { kind: 'lamp', x: 5700, y: 9850 },
  { kind: 'lamp', x: 6060, y: 9850 },
  { kind: 'lamp', x: 3500, y: 9850 },

  { kind: 'bench-h', x: 8420, y: 6700 },
  { kind: 'bench-h', x: 10240, y: 8670 },
  { kind: 'bench-h', x: 8180, y: 9690 },
  { kind: 'well', x: 8300, y: 9690 },
  { kind: 'bench-h', x: 5010, y: 8540 },
]

export const OUTSKIRTS_ORCHARD_ROWS: readonly { field: number; rows: readonly number[] }[] = [{ field: 4, rows: [10960, 11110] }]

export type OutskirtsRegion = {
  id: string
  name: string
  type: 'village' | 'nature'
  position: Point
  labelPosition: Point
  description: string
}

export const OUTSKIRTS_REGIONS: readonly OutskirtsRegion[] = [
  {
    id: 'trilha-riacho',
    name: 'Trilha do Riacho',
    type: 'nature',
    position: [8300, 6700],
    labelPosition: [8300, 6940],
    description: 'A trilha de terra que sai dos Jardins do Lago e acompanha o riacho entre pinheiros. Dizem que leva a uma vila de serradores.',
  },
  {
    id: 'riacho',
    name: 'Vila do Riacho',
    type: 'village',
    position: [9940, 6600],
    labelPosition: [9940, 7100],
    description: 'Casas de madeira dos dois lados do riacho, uma ponte de tábuas, a serraria e a Ferro & Rio, que conserta os robôs dos pescadores.',
  },
  {
    id: 'trilha-colinas',
    name: 'Trilha das Colinas',
    type: 'nature',
    position: [9400, 9200],
    labelPosition: [9400, 9460],
    description: 'Uma trilha comprida que sobe e desce colinas cobertas de floresta entre a vila e as fazendas. Bancos de madeira marcam os descansos.',
  },
  {
    id: 'mirante-colinas',
    name: 'Mirante das Colinas',
    type: 'nature',
    position: [8180, 9780],
    labelPosition: [8180, 10040],
    description: 'Uma clareira alta no meio da trilha, com um poço antigo e flores que brilham quando a noite cai.',
  },
  {
    id: 'campos',
    name: 'Campos do Sul',
    type: 'village',
    position: [4800, 10200],
    labelPosition: [4800, 10500],
    description: 'Celeiros, estufas e campos de trigo e lavanda em volta de uma encruzilhada de cascalho. Dois moinhos giram sozinhos sobre o pomar e o açude.',
  },
  {
    id: 'trilha-sul',
    name: 'Trilha do Sul',
    type: 'nature',
    position: [5240, 8300],
    labelPosition: [5240, 8560],
    description: 'O caminho de terra que desce da Rua do Lago para os Campos do Sul, serpenteando entre carvalhos velhos.',
  },
]
