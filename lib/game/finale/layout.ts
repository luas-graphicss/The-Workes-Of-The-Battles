import { GLADES, woodsZoneAt } from '../../city/woods'
import type { Point } from '../../world-data'
import type { EnemyKind } from '../battle/enemies'
import { canStandAt, WALK_SPEED } from '../player'
import { HEART_COUNT } from '../robot/progress'

export type HeartSpot = { index: number; x: number; y: number; zone: string; name: string; guards: Point[] }

export const HEART_FOOTPRINT = { rx: 46, ry: 24 } as const

const NAMES: Record<string, string> = {
  veados: 'Clareira dos Veados',
  samambaias: 'Samambaial do Pinhal',
  nascente: 'Nascente do Pinhal',
  'pinhal-aberto-1': 'Pinhal Aberto',
  'pinhal-aberto-2': 'Samambaias Altas',
  tocos: 'Clareira dos Tocos',
  musgo: 'Clareira do Musgo',
  'mata-aberta': 'Mata Aberta',
  'pedra-rachada': 'Pedra Rachada',
  cogumelos: 'Clareira dos Cogumelos',
  'sul-aberto': 'Bosque do Sul',
  queimada: 'Clareira Queimada',
  'pedras-caidas': 'Pedras Caídas',
  'fundo-aberto': 'Fundo do Bosque',
  'mirante-meteoro': 'Mirante do Meteoro',
  vento: 'Clareira do Vento',
  circulo: 'Círculo de Pedras',
  'alto-aberto-1': 'Alto do Bosque',
  'alto-aberto-2': 'Encosta do Alto',
  'alto-aberto-3': 'Cogumelos do Alto',
}

const ZONE_NAMES: Record<string, string> = {
  pinhal: 'Pinhal dos Caçadores',
  mata: 'Mata da Serraria',
  'bosque-sul': 'Bosque do Sul',
  fundo: 'Fundo do Bosque',
  alto: 'Alto do Bosque',
}

const MIN_GAP = 900
const PER_ZONE = 3
const GUARD_RADIUS = 270

export function seeded(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clearAround(x: number, y: number) {
  for (let ring = 0; ring < 3; ring++) {
    const reach = HEART_FOOTPRINT.rx + 30 + ring * 20
    for (let step = 0; step < 8; step++) {
      const angle = (step / 8) * Math.PI * 2
      if (!canStandAt(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach * 0.7)) return false
    }
  }
  return canStandAt(x, y)
}

function standNear(x: number, y: number, reach: number, strict: boolean): Point | null {
  const test = strict ? clearAround : canStandAt
  if (test(x, y)) return [x, y]
  for (let ring = 1; ring <= 10; ring++) {
    const distance = (ring / 10) * reach
    for (let step = 0; step < 14; step++) {
      const angle = (step / 14) * Math.PI * 2 + ring * 0.7
      const px = Math.round(x + Math.cos(angle) * distance)
      const py = Math.round(y + Math.sin(angle) * distance * 0.8)
      if (test(px, py)) return [px, py]
    }
  }
  return null
}

function guardSpots(x: number, y: number, random: () => number): Point[] {
  const spots: Point[] = []
  const start = random() * Math.PI * 2
  for (let index = 0; index < 3; index++) {
    const angle = start + (index / 3) * Math.PI * 2
    const spot = standNear(x + Math.cos(angle) * GUARD_RADIUS, y + Math.sin(angle) * GUARD_RADIUS * 0.72, 140, false)
    spots.push(spot ?? [x + Math.cos(angle) * 160, y + 150])
  }
  return spots
}

export function planHearts(seed: number): HeartSpot[] {
  const random = seeded(seed)
  const pool = GLADES.filter((glade) => glade.kind !== 'pond').map((glade) => ({ glade, zone: woodsZoneAt(glade.center[0], glade.center[1])?.id ?? 'mata' }))
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swap]] = [pool[swap], pool[index]]
  }
  const chosen: typeof pool = []
  const far = (entry: (typeof pool)[number], gap: number) =>
    chosen.every((other) => Math.hypot(other.glade.center[0] - entry.glade.center[0], other.glade.center[1] - entry.glade.center[1]) >= gap)
  for (const zone of new Set(pool.map((entry) => entry.zone))) {
    const entry = pool.find((candidate) => candidate.zone === zone && far(candidate, MIN_GAP))
    if (entry) chosen.push(entry)
  }
  for (const gap of [MIN_GAP, MIN_GAP * 0.6, 0]) {
    for (const entry of pool) {
      if (chosen.length >= HEART_COUNT) break
      if (chosen.includes(entry)) continue
      if (gap > 0 && chosen.filter((other) => other.zone === entry.zone).length >= PER_ZONE) continue
      if (!far(entry, gap)) continue
      chosen.push(entry)
    }
  }
  chosen.sort((a, b) => a.glade.center[1] - b.glade.center[1] || a.glade.center[0] - b.glade.center[0])
  return chosen.slice(0, HEART_COUNT).map((entry, index) => {
    const [cx, cy] = entry.glade.center
    const [x, y] = standNear(cx, cy, entry.glade.radius * 0.8, true) ?? standNear(cx, cy, entry.glade.radius, false) ?? [cx, cy]
    return {
      index,
      x,
      y,
      zone: ZONE_NAMES[entry.zone] ?? 'Floresta',
      name: NAMES[entry.glade.id] ?? 'Clareira escondida',
      guards: guardSpots(x, y, random),
    }
  })
}

export function guardKinds(broken: number): EnemyKind[] {
  if (broken >= 6) return ['alien', 'alien', 'alien']
  if (broken >= 3) return ['alien', 'alien', 'drone']
  return ['alien', 'alien']
}

export function huntSeconds(spots: readonly HeartSpot[], from: Point): number {
  let [x, y] = from
  const left = [...spots]
  let distance = 0
  while (left.length) {
    let best = 0
    let bestDistance = Infinity
    left.forEach((spot, index) => {
      const gap = Math.hypot(spot.x - x, spot.y - y)
      if (gap < bestDistance) {
        bestDistance = gap
        best = index
      }
    })
    distance += bestDistance
    x = left[best].x
    y = left[best].y
    left.splice(best, 1)
  }
  const walk = (distance / WALK_SPEED) * 1.8
  const fights = spots.reduce((sum, _, order) => sum + 64 + 9 * guardKinds(order).length, 0)
  return Math.ceil((70 + walk + fights) / 15) * 15
}
