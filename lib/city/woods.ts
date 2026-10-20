import { pointInPolygon, polygonBounds, random, smoothLoop, smoothPath, type Point, type Polygon, type Rect } from './geometry'
import type { BuildingStyle, Building, Garden, PropKind, Tent, TreeKind } from './model'

export type WoodsZone = {
  id: string
  polygon: Polygon

  step: number
  density: number

  mix: readonly (readonly [TreeKind, number])[]
}

export type GladeKind = 'meadow' | 'ferns' | 'stones' | 'stumps' | 'mushrooms' | 'scorched' | 'pond' | 'circle' | 'spring'
export type Glade = { id: string; center: Point; radius: number; kind: GladeKind }

export type CampId = 'cacadores' | 'lenhadores' | 'eremita' | 'forasteiros'
export type FallenLog = { x: number; y: number; length: number; tilt: number }
export type Camp = {
  id: CampId
  name: string
  center: Point

  radius: number
  fire: Point

  cache: Point
  tents: Tent[]
  logs: FallenLog[]
  stumps: Point[]

  wins: readonly number[]
}

export type WoodsBuildingSpec = { style: BuildingStyle; x: number; bottom: number; widthArt: number; floors: number; extra?: Partial<Building> }
export type WoodsPropSpec = { kind: PropKind; x: number; y: number }
export type WoodsRegion = {
  id: string
  name: string
  type: 'nature' | 'camp'
  position: Point
  labelPosition: Point
  description: string
}

const loop = (points: readonly Point[]) => smoothLoop(points, 120)
const path = (points: readonly Point[]) => smoothPath(points, 40)

function blob(cx: number, cy: number, radius: number, seed: number, points = 14, wobble = 0.16): Polygon {
  const rng = random(seed)
  const ring: Point[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2
    const r = radius * (1 - wobble / 2 + rng() * wobble)
    ring.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.86])
  }
  return smoothLoop(ring, 48)
}

const PINHAL: Polygon = loop([
  [11520, 5300], [12300, 4700], [13400, 4480], [14600, 4700], [15500, 5300], [15860, 6300], [15760, 7400],
  [15200, 8500], [14000, 9040], [12700, 8800], [11760, 8100], [11420, 7100], [11440, 6200],
])

const MATA: Polygon = loop([
  [8880, 9480], [9800, 9120], [10800, 9020], [11800, 9300], [12360, 10200], [12260, 11300], [11560, 12120],
  [10440, 12360], [9400, 11960], [8760, 11060], [8640, 10200],
])

const BOSQUE_SUL: Polygon = loop([
  [2360, 11920], [3600, 11720], [4900, 11800], [6400, 11720], [7640, 12220], [8060, 13300], [7640, 14620],
  [6520, 15640], [5000, 15920], [3400, 15520], [2300, 14440], [1980, 13100],
])

const FUNDO: Polygon = loop([
  [11900, 12140], [13000, 11700], [14300, 11800], [15420, 12520], [15840, 13600], [15640, 14940],
  [14700, 15800], [13300, 15920], [12200, 15320], [11680, 14200], [11560, 13100],
])

const ALTO: Polygon = loop([
  [7760, 900], [9200, 520], [10800, 600], [12400, 920], [13800, 1500], [14800, 2600], [14600, 3900],
  [13400, 4480], [12000, 4300], [10620, 4420], [9400, 4000], [8500, 3480], [8300, 2800], [7780, 2200], [7700, 1500],
])

export const WOODS_ZONES: readonly WoodsZone[] = [
  { id: 'pinhal', polygon: PINHAL, step: 156, density: 0.9, mix: [['pine', 50], ['oak', 28], ['birch', 12], ['bush', 10]] },
  { id: 'mata', polygon: MATA, step: 158, density: 0.9, mix: [['oak', 46], ['pine', 30], ['birch', 14], ['bush', 10]] },
  { id: 'bosque-sul', polygon: BOSQUE_SUL, step: 152, density: 0.92, mix: [['oak', 44], ['birch', 24], ['pine', 20], ['bush', 12]] },
  { id: 'fundo', polygon: FUNDO, step: 156, density: 0.9, mix: [['pine', 56], ['oak', 26], ['birch', 8], ['bush', 10]] },
  { id: 'alto', polygon: ALTO, step: 158, density: 0.9, mix: [['pine', 58], ['oak', 22], ['birch', 12], ['bush', 8]] },
]

export const WOODS_LAND: readonly Polygon[] = WOODS_ZONES.map((zone) => zone.polygon)

const ZONE_BOUNDS = WOODS_ZONES.map((zone) => polygonBounds(zone.polygon))

export function woodsZoneAt(x: number, y: number): WoodsZone | null {
  for (let index = 0; index < WOODS_ZONES.length; index++) {
    const box = ZONE_BOUNDS[index]
    if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) continue
    if (pointInPolygon(x, y, WOODS_ZONES[index].polygon)) return WOODS_ZONES[index]
  }
  return null
}

export const CAMPS: readonly Camp[] = [
  {
    id: 'cacadores',
    name: 'Acampamento dos Caçadores',
    center: [13700, 6300],
    radius: 380,
    fire: [13700, 6340],
    cache: [13712, 6126],
    tents: [
      { x: 13556, y: 6190, w: 150, h: 112, color: 'canvas' },
      { x: 13866, y: 6170, w: 146, h: 108, color: 'olive' },
    ],
    logs: [
      { x: 13580, y: 6430, length: 120, tilt: 0.1 },
      { x: 13840, y: 6440, length: 110, tilt: -0.12 },
    ],
    stumps: [[13420, 6280], [13990, 6320]],
    wins: [4, 12, 30, 48],
  },
  {
    id: 'lenhadores',
    name: 'Acampamento dos Lenhadores',
    center: [10900, 10350],
    radius: 360,
    fire: [10920, 10390],
    cache: [10900, 10172],
    tents: [{ x: 10760, y: 10236, w: 140, h: 104, color: 'rust' }],
    logs: [
      { x: 11080, y: 10270, length: 150, tilt: 0 },
      { x: 11080, y: 10238, length: 134, tilt: 0 },
      { x: 10760, y: 10500, length: 116, tilt: 0.08 },
    ],
    stumps: [[10620, 10420], [11120, 10520], [10980, 10620], [11180, 10160]],
    wins: [8, 16, 26, 36],
  },
  {
    id: 'eremita',
    name: 'Refúgio do Eremita',
    center: [5200, 14340],
    radius: 400,
    fire: [5250, 14440],
    cache: [5050, 14420],
    tents: [],
    logs: [{ x: 5260, y: 14540, length: 124, tilt: -0.1 }],
    stumps: [[5440, 14520], [4960, 14600]],
    wins: [2, 22, 40, 56],
  },
  {
    id: 'forasteiros',
    name: 'Clareira dos Forasteiros',
    center: [13600, 13600],
    radius: 620,
    fire: [13600, 13580],
    cache: [13800, 13740],
    tents: [
      { x: 13250, y: 13640, w: 160, h: 120, color: 'night' },
      { x: 13950, y: 13620, w: 160, h: 120, color: 'night' },
      { x: 13420, y: 13920, w: 150, h: 112, color: 'night' },
    ],
    logs: [],
    stumps: [],
    wins: [24, 32, 40, 50, 60, 70, 80, 90],
  },
]

export function campById(id: string): Camp | null {
  return CAMPS.find((camp) => camp.id === id) ?? null
}

export const BEACON = { x: 13600, y: 13290, width: 72, height: 310 } as const

export const CRYSTAL_CRATES: readonly Point[] = [
  [13790, 13460],
  [13866, 13500],
  [13360, 13440],
]

export const GLADES: readonly Glade[] = [

  { id: 'veados', center: [14900, 7400], radius: 330, kind: 'meadow' },
  { id: 'samambaias', center: [13200, 7900], radius: 300, kind: 'ferns' },
  { id: 'lagoa-pinheiros', center: [13200, 5300], radius: 430, kind: 'pond' },
  { id: 'nascente', center: [12540, 6250], radius: 260, kind: 'spring' },
  { id: 'pinhal-aberto-1', center: [12300, 5600], radius: 220, kind: 'meadow' },
  { id: 'pinhal-aberto-2', center: [15000, 5800], radius: 260, kind: 'ferns' },

  { id: 'tocos', center: [11600, 11200], radius: 320, kind: 'stumps' },
  { id: 'musgo', center: [9500, 10700], radius: 280, kind: 'ferns' },
  { id: 'mata-aberta', center: [11700, 9700], radius: 230, kind: 'meadow' },

  { id: 'lagoa-escura', center: [6600, 13200], radius: 470, kind: 'pond' },
  { id: 'pedra-rachada', center: [3300, 13200], radius: 300, kind: 'stones' },
  { id: 'cogumelos', center: [3800, 14700], radius: 280, kind: 'mushrooms' },
  { id: 'sul-aberto', center: [6800, 14600], radius: 240, kind: 'meadow' },

  { id: 'queimada', center: [14800, 12600], radius: 320, kind: 'scorched' },
  { id: 'pedras-caidas', center: [12600, 14800], radius: 280, kind: 'stones' },
  { id: 'fundo-aberto', center: [14800, 14900], radius: 230, kind: 'ferns' },

  { id: 'mirante-meteoro', center: [8900, 1200], radius: 300, kind: 'stones' },
  { id: 'vento', center: [12000, 2400], radius: 380, kind: 'meadow' },
  { id: 'circulo', center: [13500, 3200], radius: 300, kind: 'circle' },
  { id: 'alto-aberto-1', center: [10400, 1500], radius: 240, kind: 'ferns' },
  { id: 'alto-aberto-2', center: [11200, 3600], radius: 220, kind: 'meadow' },
  { id: 'alto-aberto-3', center: [13900, 2200], radius: 260, kind: 'mushrooms' },
]

export function openness(x: number, y: number): number {
  let open = 0
  for (const glade of GLADES) {
    const d = Math.hypot(x - glade.center[0], y - glade.center[1]) / glade.radius
    if (d < 1.25) open = Math.max(open, Math.min(1, (1.25 - d) / 0.45))
  }
  for (const camp of CAMPS) {
    const d = Math.hypot(x - camp.center[0], y - camp.center[1]) / camp.radius
    if (d < 1.2) open = Math.max(open, Math.min(1, (1.2 - d) / 0.35))
  }
  return open
}

const LAGOA_PINHEIROS: Polygon = blob(13200, 5300, 230, 71)
const LAGOA_ESCURA: Polygon = blob(6600, 13220, 280, 72, 16, 0.2)

export const WOODS_WATER: readonly { kind: 'lake'; polygon: Polygon }[] = [
  { kind: 'lake', polygon: LAGOA_PINHEIROS },
  { kind: 'lake', polygon: LAGOA_ESCURA },
]

export const WOODS_TRAILS: readonly { id: string; path: Point[] }[] = [

  { id: 'pinhal-entrada', path: path([[11150, 6900], [11700, 6880], [12200, 6700], [12900, 6400], [13420, 6330], [13700, 6340]]) },
  { id: 'pinhal-veados', path: path([[13700, 6340], [14100, 6560], [14500, 6900], [14900, 7400]]) },
  { id: 'pinhal-lagoa', path: path([[12900, 6400], [13000, 5900], [13100, 5560]]) },
  { id: 'pinhal-samambaias', path: path([[13700, 6340], [13500, 6900], [13300, 7400], [13200, 7900]]) },
  { id: 'pinhal-nascente', path: path([[12200, 6700], [12400, 6450], [12540, 6250]]) },

  { id: 'mata-entrada', path: path([[10240, 8900], [10300, 9300], [10500, 9700], [10760, 10060], [10900, 10350]]) },
  { id: 'mata-tocos', path: path([[10900, 10350], [11200, 10700], [11600, 11200]]) },

  { id: 'mirante-fundo', path: path([[8260, 9900], [8560, 10120], [9000, 10460], [9500, 10700], [10000, 11200], [10560, 11780], [11180, 12280], [11800, 12620], [12500, 13040], [13100, 13420], [13600, 13580]]) },
  { id: 'fundo-queimada', path: path([[13600, 13580], [14200, 13100], [14800, 12600]]) },
  { id: 'fundo-pedras', path: path([[13100, 13420], [12800, 14100], [12600, 14800]]) },

  { id: 'sul-entrada', path: path([[4800, 11480], [4880, 12200], [5080, 12900], [5000, 13600], [5160, 14260]]) },
  { id: 'sul-lagoa', path: path([[5160, 14260], [5800, 13720], [6240, 13400]]) },
  { id: 'sul-cogumelos', path: path([[5000, 14500], [4400, 14700], [3800, 14700]]) },
  { id: 'sul-pedra', path: path([[4880, 12200], [4200, 12600], [3600, 12900], [3300, 13200]]) },
  { id: 'eremita-cabana', path: path([[4840, 14240], [4960, 14300], [5080, 14310], [5160, 14270]]) },

  { id: 'alto-entrada', path: path([[7420, 1500], [7900, 1440], [8400, 1300], [8900, 1200]]) },
  { id: 'alto-vento', path: path([[8900, 1200], [9800, 1500], [10800, 1900], [12000, 2400]]) },
  { id: 'alto-circulo', path: path([[12000, 2400], [12800, 2900], [13500, 3200]]) },
  { id: 'alto-vila', path: path([[12000, 2400], [11000, 3300], [10300, 3900], [10100, 4300], [10100, 4980]]) },
]

export const WOODS_TRAIL_WIDTH = 100
export const WOODS_CORRIDOR_HALF = 170

export const WOODS_CORRIDORS: readonly { path: Point[]; half: number }[] = WOODS_TRAILS.map((trail) => ({ path: trail.path, half: WOODS_CORRIDOR_HALF }))

export type Rock = { x: number; y: number; r: number }

function scatter(center: Point, radius: number, count: number, seed: number, inner = 0.2): Point[] {
  const rng = random(seed)
  const points: Point[] = []
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2
    const d = radius * (inner + rng() * (0.85 - inner))
    points.push([Math.round(center[0] + Math.cos(angle) * d), Math.round(center[1] + Math.sin(angle) * d * 0.8)])
  }
  return points
}

function ring(center: Point, radius: number, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return [Math.round(center[0] + Math.cos(angle) * radius), Math.round(center[1] + Math.sin(angle) * radius * 0.78)] as Point
  })
}

export const WOODS_ROCKS: readonly Rock[] = [
  ...GLADES.filter((glade) => glade.kind === 'stones').flatMap((glade, index) =>
    scatter(glade.center, glade.radius, 6, 300 + index).map(([x, y], i): Rock => ({ x, y, r: 30 + ((i * 7 + index * 3) % 4) * 7 })),
  ),
  ...ring([13500, 3200], 176, 7).map(([x, y]): Rock => ({ x, y, r: 34 })),
  { x: 13060, y: 5080, r: 30 },
  { x: 13420, y: 5120, r: 24 },
  { x: 6340, y: 13040, r: 32 },
  { x: 6880, y: 13420, r: 26 },
  { x: 14560, y: 12420, r: 22 },
  { x: 14980, y: 12760, r: 26 },
]

export const WOODS_STUMPS: readonly Point[] = [
  ...GLADES.filter((glade) => glade.kind === 'stumps').flatMap((glade, index) => scatter(glade.center, glade.radius, 9, 400 + index, 0.1)),
  ...CAMPS.flatMap((camp) => camp.stumps),
]

export const WOODS_LOGS: readonly FallenLog[] = [

  { x: 10180, y: 9240, length: 150, tilt: 0.25 },
  { x: 10620, y: 9640, length: 140, tilt: -0.3 },
  { x: 10640, y: 10040, length: 150, tilt: 0.18 },
  ...CAMPS.flatMap((camp) => camp.logs),
]

export const LANDING_MARKS: readonly { center: Point; radius: number }[] = [
  { center: [14700, 12520], radius: 70 },
  { center: [14920, 12560], radius: 70 },
  { center: [14800, 12720], radius: 70 },
]

export const WOODS_BUILDINGS: readonly WoodsBuildingSpec[] = [
  { style: 'cottage', x: 4720, bottom: 14184, widthArt: 60, floors: 1, extra: { roof: 'moss', wall: 'wood', timber: true, accent: 4 } },
]

export const WOODS_GARDENS: readonly Garden[] = [{ kind: 'flowers', rect: { x: 5330, y: 14300, w: 150, h: 96 } }]

export const WOODS_PROPS: readonly WoodsPropSpec[] = [
  { kind: 'crates', x: 13900, y: 6560 },
  { kind: 'barrels', x: 13470, y: 6560 },
  { kind: 'signpost', x: 13400, y: 6420 },
  { kind: 'crates', x: 11050, y: 10500 },
  { kind: 'signpost', x: 10560, y: 10220 },
  { kind: 'barrels', x: 5390, y: 14470 },
  { kind: 'signpost', x: 4960, y: 12140 },
  { kind: 'signpost', x: 11420, y: 6980 },
  { kind: 'signpost', x: 8060, y: 1540 },
  { kind: 'crates', x: 13500, y: 13460 },
]

export const CACHE_FOOTPRINT = { w: 60, h: 44 } as const

function tentRect(tent: Tent): Rect {
  return { x: tent.x - tent.w / 2, y: tent.y - tent.h, w: tent.w, h: tent.h + 6 }
}

export const WOODS_OBSTACLES: readonly Rect[] = [
  ...CAMPS.flatMap((camp) => camp.tents.map(tentRect)),
  ...CAMPS.map((camp) => ({ x: camp.cache[0] - CACHE_FOOTPRINT.w / 2, y: camp.cache[1] - CACHE_FOOTPRINT.h, w: CACHE_FOOTPRINT.w, h: CACHE_FOOTPRINT.h })),
  ...CAMPS.map((camp) => ({ x: camp.fire[0] - 50, y: camp.fire[1] - 34, w: 100, h: 56 })),
  ...WOODS_LOGS.map((log) => ({ x: log.x - log.length / 2, y: log.y - 22, w: log.length, h: 40 })),
  ...WOODS_STUMPS.map(([x, y]) => ({ x: x - 24, y: y - 18, w: 48, h: 30 })),
  ...WOODS_ROCKS.map((rock) => ({ x: rock.x - rock.r, y: rock.y - rock.r * 0.7, w: rock.r * 2, h: rock.r * 1.3 })),
  ...CRYSTAL_CRATES.map(([x, y]) => ({ x: x - 38, y: y - 44, w: 76, h: 48 })),
  { x: BEACON.x - BEACON.width / 2 - 6, y: BEACON.y - BEACON.height, w: BEACON.width + 12, h: BEACON.height + 10 },
]

export const WOODS_REGIONS: readonly WoodsRegion[] = [
  {
    id: 'pinhal',
    name: 'Pinhal dos Caçadores',
    type: 'nature',
    position: [12900, 6800],
    labelPosition: [12900, 7100],
    description: 'Pinheiros altos a leste da Vila do Riacho. A trilha de terra some entre as agulhas e só os caçadores sabem onde ela volta a aparecer.',
  },
  {
    id: 'acampamento-cacadores',
    name: 'Acampamento dos Caçadores',
    type: 'camp',
    position: [13700, 6300],
    labelPosition: [13700, 6620],
    description: 'Duas barracas, uma fogueira e um baú de couro. Os caçadores deixam aqui o que acham na mata e voltam quando a lua enche.',
  },
  {
    id: 'lagoa-pinheiros',
    name: 'Lagoa dos Pinheiros',
    type: 'nature',
    position: [13200, 5300],
    labelPosition: [13200, 5760],
    description: 'Uma lagoa fria e parada no meio do pinhal. A água espelha as copas e, de vez em quando, um veado.',
  },
  {
    id: 'mata-serraria',
    name: 'Mata da Serraria',
    type: 'nature',
    position: [10300, 10700],
    labelPosition: [10300, 10980],
    description: 'Carvalhos velhos ao sul da Vila do Riacho, de onde a serraria tira madeira. Toras caídas marcam o caminho dos lenhadores.',
  },
  {
    id: 'acampamento-lenhadores',
    name: 'Acampamento dos Lenhadores',
    type: 'camp',
    position: [10900, 10350],
    labelPosition: [10900, 10660],
    description: 'Pilhas de toras, tocos frescos e uma barraca remendada. Os lenhadores guardam as ferramentas e o que encontram no oco das árvores.',
  },
  {
    id: 'bosque-sul',
    name: 'Bosque do Sul',
    type: 'nature',
    position: [4600, 13000],
    labelPosition: [4600, 13300],
    description: 'A parte mais funda da floresta, além dos Campos do Sul. Carvalhos e bétulas fecham o céu e o chão é um tapete de folhas.',
  },
  {
    id: 'refugio-eremita',
    name: 'Refúgio do Eremita',
    type: 'camp',
    position: [5200, 14340],
    labelPosition: [5200, 14700],
    description: 'Uma cabana de madeira com horta e fogueira. O eremita vive do que a mata dá e guarda o que a mata esconde.',
  },
  {
    id: 'lagoa-escura',
    name: 'Lagoa Escura',
    type: 'nature',
    position: [6600, 13200],
    labelPosition: [6600, 13720],
    description: 'Uma lagoa funda e escura cercada de pedras. Dizem que no fundo brilha alguma coisa.',
  },
  {
    id: 'fundo-bosque',
    name: 'Fundo do Bosque',
    type: 'nature',
    position: [12500, 13900],
    labelPosition: [12500, 14200],
    description: 'Além do Mirante, onde a floresta se fecha de vez. Ninguém da cidade vem até aqui. Ninguém da cidade.',
  },
  {
    id: 'clareira-forasteiros',
    name: 'Clareira dos Forasteiros',
    type: 'camp',
    position: [13600, 13600],
    labelPosition: [13600, 14020],
    description: 'Onde as árvores abrem: uma torre preta, barracas sem costura e caixas lacradas. À noite, luzes roxas sobem daqui.',
  },
  {
    id: 'clareira-queimada',
    name: 'Clareira Queimada',
    type: 'nature',
    position: [14800, 12600],
    labelPosition: [14800, 12940],
    description: 'Três marcas queimadas no chão, perfeitas demais para serem de fogueira. Algo pesado pousou aqui.',
  },
  {
    id: 'alto-bosque',
    name: 'Alto do Bosque',
    type: 'nature',
    position: [10800, 2300],
    labelPosition: [10800, 2600],
    description: 'A serra de pinheiros a leste da cratera. Daqui se vê a fumaça do meteoro e, nas noites claras, a Vila do Riacho.',
  },
  {
    id: 'circulo-pedras',
    name: 'Círculo de Pedras',
    type: 'nature',
    position: [13500, 3200],
    labelPosition: [13500, 3520],
    description: 'Sete pedras em pé, mais antigas que Bosque Alto. Ninguém lembra quem as ergueu nem para quê.',
  },
]
