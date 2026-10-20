import baked from './city/baked.json'
import { FOREST, GROUND, isObstacleAt, isWalkableAt, terrainAt as cityTerrainAt, WATER } from './city/collision'
import { ARENA, HOUSE, LEAGUE, METEOR_SITE, SITES, type Site } from './city/sites'
import { BEACON, CAMPS, type Camp } from './city/woods'

export { ARENA, HOUSE, LEAGUE, METEOR_SITE, SITES, siteById, type Site, type SiteKind } from './city/sites'

export const WORLD = {
  name: 'Bosque Alto',
  version: '0.6.0',
  width: 16384,
  height: 16384,
  tileSize: 32,
  columns: 512,
  rows: 512,
  image: 'assets/map/preview.webp',
  artwork: { width: 2048, height: 2048 },
  map: { width: 4096, height: 4096, tile: 256, gutter: 2, columns: 16, rows: 16, folder: 'assets/map/tiles' },
  props: 'assets/map/props.png',
} as const

export const PIXEL = WORLD.width / WORLD.artwork.width

export const TEXEL = WORLD.width / WORLD.map.width

export type Point = readonly [number, number]
export type Polygon = readonly Point[]
export type Region = {
  id: string
  name: string
  type: 'city' | 'nature' | 'camp' | 'village'
  position: Point
  labelPosition: Point
  description: string
  kicker?: string
}

export const REGIONS: Region[] = baked.regions.map((region) => ({
  ...region,
  type: region.type as Region['type'],
  position: [region.position[0], region.position[1]],
  labelPosition: [region.labelPosition[0], region.labelPosition[1]],
}))

export const CRATER = { x: 6226, y: 1032, width: 1236, height: 896 } as const

export const CRATER_FIRES: Point[] = [
  [6542, 1222],
  [7124, 1680],
]

export const METEOR = { width: 300, height: 285, splitOffset: 84, splitTilt: 0.12 } as const

export const ROCKS = [
  { x: METEOR_SITE[0] - 159, y: METEOR_SITE[1] + 64, rx: 64, ry: 50 },
  { x: METEOR_SITE[0] + 159, y: METEOR_SITE[1] + 64, rx: 64, ry: 50 },
] as const

export const EMERGE_POINT: Point = [METEOR_SITE[0], METEOR_SITE[1] + 96]

export const TERRAIN = { ground: GROUND, forest: FOREST, water: WATER, solid: 3 } as const

export function terrainAt(worldX: number, worldY: number): number {
  return cityTerrainAt(worldX, worldY)
}

export function isBlockedByRock(worldX: number, worldY: number): boolean {
  return ROCKS.some((rock) => ((worldX - rock.x) / rock.rx) ** 2 + ((worldY - rock.y) / rock.ry) ** 2 < 1)
}

export type Space = { width: number; height: number; walkable(x: number, y: number): boolean }

let activeSpace: Space | null = null

export function enterSpace(space: Space | null) {
  activeSpace = space
}

export function currentSpace(): Space | null {
  return activeSpace
}

export function spaceSize(): { width: number; height: number } {
  return activeSpace ?? WORLD
}

export type StoryObstacle = { x: number; y: number; rx: number; ry: number }

let storyObstacles: readonly StoryObstacle[] = []

export function setStoryObstacles(list: readonly StoryObstacle[]) {
  storyObstacles = list
}

function isBlockedByStory(worldX: number, worldY: number): boolean {
  for (let index = 0; index < storyObstacles.length; index++) {
    const obstacle = storyObstacles[index]
    const dx = (worldX - obstacle.x) / obstacle.rx
    const dy = (worldY - obstacle.y) / obstacle.ry
    if (dx * dx + dy * dy < 1) return true
  }
  return false
}

export function isWalkable(worldX: number, worldY: number): boolean {
  if (activeSpace) return activeSpace.walkable(worldX, worldY)
  return !isBlockedByRock(worldX, worldY) && !isBlockedByDisplay(worldX, worldY) && !isBlockedByStory(worldX, worldY) && (isWalkableAt(worldX, worldY) || onClearingGround(worldX, worldY))
}

export type ClearingId = 'orvalho' | 'raizes' | 'vagalumes'

export type Clearing = {
  id: ClearingId
  name: string
  center: Point
  radius: number
  relic: Point

  trail: readonly Point[]

  wins: number
}

export const CLEARINGS: readonly Clearing[] = [
  { id: 'orvalho', name: 'Clareira do Orvalho', center: [7880, 3470], radius: 170, relic: [7890, 3436], trail: [[7380, 3486], [7560, 3450], [7730, 3482]], wins: 6 },
  { id: 'raizes', name: 'Clareira das Raízes', center: [380, 6250], radius: 170, relic: [380, 6216], trail: [[860, 6258], [700, 6232], [540, 6264]], wins: 16 },
  { id: 'vagalumes', name: 'Clareira dos Vaga-lumes', center: [3190, 400], radius: 170, relic: [3190, 366], trail: [[3080, 852], [3122, 700], [3176, 560]], wins: 30 },
]

export const CLEARING_TRAIL_HALF = 60
export const CLEARING_RELIC_RADIUS = 96

const CLEARING_BOUNDS = CLEARINGS.map(({ center, radius, trail }) => {
  const xs = [center[0] - radius, center[0] + radius, ...trail.map(([x]) => x)]
  const ys = [center[1] - radius, center[1] + radius, ...trail.map(([, y]) => y)]
  return { x0: Math.min(...xs) - CLEARING_TRAIL_HALF, y0: Math.min(...ys) - CLEARING_TRAIL_HALF, x1: Math.max(...xs) + CLEARING_TRAIL_HALF, y1: Math.max(...ys) + CLEARING_TRAIL_HALF }
})

function nearSegment(x: number, y: number, [ax, ay]: Point, [bx, by]: Point, reach: number) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) <= reach
}

export function onClearingGround(x: number, y: number): boolean {
  for (let index = 0; index < CLEARINGS.length; index++) {
    const box = CLEARING_BOUNDS[index]
    if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue
    const { center, radius, trail } = CLEARINGS[index]
    if (Math.hypot(x - center[0], y - center[1]) <= radius) return true
    for (let step = 0; step < trail.length; step++) {
      if (nearSegment(x, y, trail[step], trail[step + 1] ?? center, CLEARING_TRAIL_HALF)) return true
    }
  }
  return false
}

export function clearingById(id: string) {
  return CLEARINGS.find((clearing) => clearing.id === id) ?? null
}

export function clearingUnlocked(clearing: Clearing, mainWins: number) {
  return mainWins >= clearing.wins
}

export function clearingRelicAt(x: number, y: number) {
  return CLEARINGS.find(({ relic }) => Math.hypot(x - relic[0], y - relic[1]) <= CLEARING_RELIC_RADIUS) ?? null
}

export function createCollisionMap(): number[][] {
  return Array.from({ length: WORLD.rows }, (_, row) =>
    Array.from({ length: WORLD.columns }, (_, column) => {
      const x = (column + 0.5) * WORLD.tileSize
      const y = (row + 0.5) * WORLD.tileSize
      const terrain = terrainAt(x, y)
      if (terrain !== TERRAIN.ground) return terrain
      return isObstacleAt(x, y) ? TERRAIN.solid : TERRAIN.ground
    }),
  )
}

export const HOME_START: Point = [HOUSE.door[0] - 70, HOUSE.door[1] + 180]

export const SHOP = {
  name: 'Oficina do Cristal',
  left: 2744,
  top: 2736,
  right: 3656,
  bottom: 3376,
  door: [3200, 3376] as Point,
  zone: { x0: 3040, y0: 3376, x1: 3360, y1: 3620 },
  exit: [3200, 3470] as Point,
  displays: [
    [3016, 3412],
    [3384, 3412],
  ] as Point[],
} as const

export const GARAGE = {
  name: 'Mecânica dos Irmãos',
  district: 'Rua do Mercado',
  bottom: 1512,
  door: [2104, 1512] as Point,
  zone: { x0: 1980, y0: 1512, x1: 2228, y1: 1664 },
  exit: [2104, 1604] as Point,
} as const

export function isAtGarageDoor(x: number, y: number) {
  const { x0, y0, x1, y1 } = GARAGE.zone
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

const DISPLAY_FOOTPRINT = { rx: 34, ry: 18 } as const

export function isAtShopDoor(x: number, y: number) {
  const { x0, y0, x1, y1 } = SHOP.zone
  return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

export function isAtHouseDoor(x: number, y: number) {
  const { zone } = HOUSE
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
}

export function isAtLeagueDoor(x: number, y: number) {
  const { zone } = LEAGUE
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
}

export type SecretSpot = { id: string; at: Point; district: string; wins: number }

export const SECRET_SPOTS: readonly SecretSpot[] = [
  { id: 'praca', at: [3230, 3766], district: 'Praça do Cristal', wins: 3 },
  { id: 'cratera', at: [7318, 1430], district: 'Cratera do Acampamento', wins: 8 },
  { id: 'lago', at: [6210, 6760], district: 'Jardins do Lago', wins: 14 },
  { id: 'parque', at: [6996, 3426], district: 'Parque da Árvore-Lume', wins: 21 },
  { id: 'moinhos', at: [2040, 5448], district: 'Vila dos Moinhos', wins: 28 },
  { id: 'mercado', at: [2700, 2022], district: 'Mercado das Lanternas', wins: 36 },
  { id: 'serraria', at: [9460, 6320], district: 'Vila do Riacho', wins: 11 },
  { id: 'pomar-sul', at: [4100, 11040], district: 'Campos do Sul', wins: 18 },
  { id: 'mirante', at: [8140, 9870], district: 'Mirante das Colinas', wins: 44 },
  { id: 'pinhal', at: [14930, 7360], district: 'Pinhal dos Caçadores', wins: 5 },
  { id: 'lagoa-escura', at: [6600, 12920], district: 'Lagoa Escura', wins: 24 },
  { id: 'circulo', at: [13500, 3200], district: 'Círculo de Pedras', wins: 32 },
  { id: 'queimada', at: [14800, 12610], district: 'Clareira Queimada', wins: 40 },
]

export { BEACON, CAMPS, campById, type Camp, type CampId } from './city/woods'

export const CAMP_CACHE_RADIUS = 110

export function campCacheAt(x: number, y: number): Camp | null {
  return CAMPS.find(({ cache }) => Math.hypot(x - cache[0], y - cache[1]) <= CAMP_CACHE_RADIUS) ?? null
}

export function campAt(x: number, y: number): Camp | null {
  return CAMPS.find(({ center, radius }) => Math.hypot(x - center[0], y - center[1]) <= radius) ?? null
}

export const CAMP_FIRES: readonly Point[] = CAMPS.filter((camp) => camp.id !== 'forasteiros').map((camp) => camp.fire)
export const COLD_FIRE: Point = CAMPS.find((camp) => camp.id === 'forasteiros')?.fire ?? [0, 0]
export const BEACON_TOP: Point = [BEACON.x, BEACON.y - BEACON.height]

export const SECRET_PICKUP_RADIUS = 46
export const SECRET_SENSE_RADIUS = 210

export function secretSpotById(id: string) {
  return SECRET_SPOTS.find((spot) => spot.id === id) ?? null
}

export function secretSpotUnlocked(spot: SecretSpot, mainWins: number) {
  return mainWins >= spot.wins
}

export function secretSpotAt(x: number, y: number) {
  return SECRET_SPOTS.find((spot) => Math.hypot(x - spot.at[0], y - spot.at[1]) <= SECRET_PICKUP_RADIUS) ?? null
}

export function isAtArenaGate(x: number, y: number) {
  const { zone } = ARENA
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h
}

export function siteAt(x: number, y: number): Site | null {
  for (const site of SITES) {
    const { zone } = site
    if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) return site
  }
  return null
}

export function insideRing(x: number, y: number) {
  const { bounds } = ARENA
  return x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1
}

function isBlockedByDisplay(worldX: number, worldY: number): boolean {
  return SHOP.displays.some(([x, y]) => ((worldX - x) / DISPLAY_FOOTPRINT.rx) ** 2 + ((worldY - y) / DISPLAY_FOOTPRINT.ry) ** 2 < 1)
}
