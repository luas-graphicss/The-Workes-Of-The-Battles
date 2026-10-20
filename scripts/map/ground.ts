import { fbm, hash2, strokePath, type Point } from '../../lib/city/geometry'
import * as L from '../../lib/city/layout'
import { ART } from '../../lib/city/model'
import { WOODS_CORRIDOR_HALF } from '../../lib/city/woods'
import * as P from './palette'
import { mix, Mask, Raster, scale, type Color } from './raster'

export const PAVE = { none: 0, dirt: 1, gravel: 2, street: 3, promenade: 4, sidewalk: 5, road: 6, market: 7, plaza: 8, bridge: 9 } as const
export const WATER_KIND = { none: 0, canal: 1, lake: 2, stream: 3 } as const

export type Masks = {
  size: number
  land: Mask
  forest: Mask
  water: Mask
  paved: Mask
  camp: Mask

  woods: Mask
}

const toArt = (points: readonly Point[]) => points.map(([x, y]) => [x / ART, y / ART] as Point)

export function buildMasks(size: number): Masks {
  const land = new Mask(size, size)
  for (const polygon of L.LAND) land.polygon(toArt(polygon))
  for (const corridor of L.LAND_STROKES) land.stroke(toArt(corridor.path), corridor.half / ART)
  const camp = new Mask(size, size)
  camp.polygon(toArt(L.CAMP))
  camp.polygon(toArt(L.CAMP_TRAIL))
  const woods = new Mask(size, size)
  for (const zone of L.WOODS_ZONES) woods.polygon(toArt(zone.polygon))
  for (const trail of L.WOODS_TRAILS) woods.stroke(toArt(trail.path), WOODS_CORRIDOR_HALF / ART)

  const water = new Mask(size, size)
  for (const body of L.WATER_BODIES) water.polygon(toArt(body.polygon), WATER_KIND[body.kind])

  const paved = new Mask(size, size)
  const codes: Record<string, number> = { dirt: PAVE.dirt, gravel: PAVE.gravel, street: PAVE.street, promenade: PAVE.promenade, avenue: PAVE.sidewalk, market: PAVE.market, plaza: PAVE.plaza }
  for (const p of L.PAVING) {
    const code = codes[p.kind]
    if (p.shape === 'stroke') {
      paved.polygon(toArt(strokePath(p.points, p.width / 2)), code)
      if (p.kind === 'avenue') paved.polygon(toArt(strokePath(p.points, 64)), PAVE.road)
    } else if (p.shape === 'circle') {
      paved.ellipse(p.center[0] / ART, p.center[1] / ART, p.radius / ART, p.radius / ART, code)
    } else {
      paved.polygon(toArt(p.points), code)
    }
  }
  for (const bridge of L.BRIDGES) paved.rect(bridge.rect.x / ART, bridge.rect.y / ART, bridge.rect.w / ART, bridge.rect.h / ART, PAVE.bridge)
  for (let i = 0; i < paved.data.length; i++) {
    if (paved.data[i] === PAVE.bridge) continue
    if (water.data[i] || !land.data[i]) paved.data[i] = 0
  }

  const forest = new Mask(size, size)
  for (let i = 0; i < forest.data.length; i++) forest.data[i] = !land.data[i] && !water.data[i] ? 1 : 0
  for (let i = 0; i < woods.data.length; i++) if (!land.data[i] || water.data[i]) woods.data[i] = 0
  return { size, land, forest, water, paved, camp, woods }
}

export function paintBase(map: Raster, masks: Masks) {
  const { size, land, water, forest, woods } = masks
  const fromEdge = forest.distance(12)
  const intoWoods = woods.distance(14)
  const litterTint = mix(P.DIRT[1], P.FOREST_FLOOR[3], 0.45)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (water.data[i]) continue
      if (!land.data[i]) {
        const n = fbm(x, y, 18, 5, 2)
        let c = n < 0.42 ? P.FOREST_FLOOR[0] : n < 0.62 ? P.FOREST_FLOOR[1] : P.FOREST_FLOOR[2]
        const d = fromEdge[i]
        if (d < 10) c = mix(c, woods.data[i - 1] || woods.data[i + 1] ? P.FOREST_FLOOR[3] : hash2(x, y, 6) < 0.5 ? P.GRASS[0] : P.GRASS[1], ((10 - d) / 10) * 0.75)
        map.data[i] = c
        continue
      }
      if (woods.data[i]) {

        const patch = fbm(x, y, 40, 11, 3)
        const litter = fbm(x, y, 9, 15, 2)
        const fine = hash2(x, y, 13)
        let c = patch < 0.4 ? P.FOREST_FLOOR[3] : patch < 0.58 ? P.GRASS[0] : patch < 0.74 ? P.GRASS[1] : P.GRASS[2]
        if (litter > 0.66) c = mix(c, litterTint, Math.min(1, (litter - 0.66) * 4))
        if (fine < 0.01) c = mix(c, P.DIRT[2], 0.6)
        else if (fine < 0.018) c = P.GRASS[3]
        else if (fine < 0.021) c = P.FOREST_FLOOR[1]
        const d = intoWoods[i]
        if (d < 12) c = mix(c, P.FOREST_FLOOR[1], ((12 - d) / 12) * 0.55)
        map.data[i] = c
        continue
      }
      const patch = fbm(x, y, 70, 9, 3)
      const fine = hash2(x, y, 3)
      const clump = hash2(x >> 1, y >> 1, 4)
      let level = patch < 0.36 ? 1 : patch < 0.5 ? 2 : patch < 0.64 ? 3 : 4
      if (clump < 0.12) level -= 1
      else if (clump > 0.93) level += 1
      level = Math.max(0, Math.min(5, level))
      let c = P.GRASS[level]
      if (fine < 0.006) c = P.FLOWERS[Math.floor(hash2(x, y, 5) * P.FLOWERS.length)]
      else if (fine < 0.02) c = P.GRASS[Math.min(5, level + 1)]
      map.data[i] = c
    }
  }
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (!land.data[y * size + x] || water.data[y * size + x]) continue
      if (hash2(x, y, 77) > 0.012) continue
      const c = map.get(x, y)
      map.set(x, y - 1, mix(c, P.GRASS[5], 0.6))
      map.set(x - 1, y, mix(c, P.GRASS[0], 0.35))
      map.set(x + 1, y, mix(c, P.GRASS[0], 0.35))
    }
  }
}

export function paintWater(map: Raster, masks: Masks) {
  const { size, water, land } = masks
  const any = new Mask(size, size)
  for (let i = 0; i < any.data.length; i++) any.data[i] = water.data[i] ? 1 : 0
  const depth = any.distance(24)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const kind = water.data[i]
      if (!kind) continue
      const d = depth[i]
      let level = d < 3 ? 4 : d < 7 ? 3 : d < 13 ? 2 : 1
      if (kind === WATER_KIND.stream && level < 3) level = 2
      let c = P.WATER[level]
      const ripple = hash2(Math.floor(x / 6), y, 11)
      if (ripple < 0.05 && (x + y * 3) % 6 < 3) c = P.WATER[Math.min(6, level + 2)]
      else if (fbm(x, y * 2.5, 20, 12, 2) > 0.66) c = mix(c, P.WATER[level + 1], 0.5)
      map.data[i] = c
    }
  }
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x
      const kind = water.data[i]
      if (!kind) continue
      const inTown = land.data[i]
      let wallAbove = 0
      for (let k = 1; k <= 5; k++) if (!water.data[i - k * size]) wallAbove = k
      if (kind === WATER_KIND.canal && inTown) {
        if (wallAbove) {
          const row = 6 - wallAbove
          const brick = (x + (row % 2) * 3) % 7 === 0 || row === 3
          map.data[i] = row >= 5 ? P.WATER[1] : brick ? P.QUAY[1] : row === 1 ? P.QUAY[4] : P.QUAY[2]
        } else if (!water.data[i + size] || !water.data[i - 1] || !water.data[i + 1]) {
          map.data[i] = P.QUAY[3]
        }
      } else if (wallAbove && wallAbove <= 2) {
        map.data[i] = wallAbove === 1 ? mix(P.SAND[1], P.WATER[3], 0.4) : P.WATER[5]
      }
    }
  }
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      const i = y * size + x
      if (water.data[i]) continue
      let near = 0
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (water.data[i + dy * size + dx]) near = water.data[i + dy * size + dx]
      if (!near) continue
      const touching = water.data[i - 1] || water.data[i + 1] || water.data[i - size] || water.data[i + size]
      if (near === WATER_KIND.canal && land.data[i]) {
        map.data[i] = touching ? P.QUAY[5] : (x + (y % 2) * 4) % 8 === 0 ? P.QUAY[2] : P.QUAY[4]
      } else if (land.data[i] || near !== WATER_KIND.canal) {
        const n = hash2(x, y, 31)
        map.data[i] = touching ? (n < 0.3 ? P.SAND[3] : P.SAND[2]) : n < 0.25 ? P.SAND[1] : n < 0.35 ? P.QUAY[3] : mix(map.data[i], P.SAND[2], 0.55)
      }
    }
  }
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      const i = y * size + x
      if (water.data[i] !== WATER_KIND.lake) continue
      const n = hash2(x >> 2, y >> 2, 41)
      const shore = !water.data[i - 3] || !water.data[i + 3] || !water.data[i - 3 * size] || !water.data[i + 3 * size]
      if (shore && hash2(x, y, 43) < 0.08) {
        map.set(x, y, P.REED[2])
        map.set(x, y - 1, P.REED[3])
        map.set(x, y - 2, P.REED[1])
      } else if (!shore && n < 0.012 && (x & 3) === 1 && (y & 3) === 1 && fbm(x, y, 40, 45, 2) > 0.5) {
        lily(map, x, y, hash2(x, y, 47) < 0.25)
      }
    }
  }
}

function lily(map: Raster, x: number, y: number, glowing: boolean) {
  map.eachInEllipse(x + 0.5, y + 0.5, 3.4, 2.4, (px, py, d) => map.set(px, py, d > 0.6 ? P.LILY[0] : P.LILY[1]))
  map.set(x + 1, y, P.WATER[3])
  map.set(x + 2, y, P.WATER[3])
  map.set(x - 1, y - 1, P.LILY[2])
  if (glowing) {
    map.eachInEllipse(x, y - 1, 5, 4, (px, py, d) => map.blend(px, py, P.GLOW[2], 0.25 * (1 - d)))
    map.set(x, y - 1, P.GLOW[3])
    map.set(x - 1, y - 1, P.GLOW[1])
    map.set(x + 1, y - 1, P.GLOW[1])
  } else if (hash2(x, y, 49) < 0.5) {
    map.set(x, y - 1, P.BLOSSOM[4])
    map.set(x + 1, y - 1, P.BLOSSOM[3])
  }
}

export function paintPaving(map: Raster, masks: Masks) {
  const { size, paved } = masks
  const plazaCenters = L.PAVING.filter((p) => p.shape === 'circle').map((p) => (p.shape === 'circle' ? { x: p.center[0] / ART, y: p.center[1] / ART, r: p.radius / ART } : { x: 0, y: 0, r: 0 }))
  const avenueCentres = { x: L.STREETS.cristal / ART, y: L.STREETS.runas / ART }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const code = paved.data[i]
      if (!code || code === PAVE.bridge) continue
      let c: Color
      switch (code) {
        case PAVE.dirt: {
          const n = hash2(x, y, 51)
          c = n < 0.08 ? P.DIRT[1] : n > 0.95 ? P.DIRT[4] : fbm(x, y, 9, 52, 2) > 0.55 ? P.DIRT[3] : P.DIRT[2]
          break
        }
        case PAVE.gravel: {
          const n = hash2(x, y, 53)
          c = n < 0.12 ? P.GRAVEL[0] : n < 0.4 ? P.GRAVEL[1] : n > 0.93 ? P.GRAVEL[3] : P.GRAVEL[2]
          break
        }
        case PAVE.street:
          c = cobble(x, y)
          break
        case PAVE.promenade:
          c = tiles(x, y, 6, P.PLAZA, 61)
          break
        case PAVE.sidewalk:
          c = tiles(x, y, 8, P.PLAZA, 63)
          break
        case PAVE.road:
          c = road(x, y, avenueCentres)
          break
        case PAVE.market:
          c = marketTiles(x, y)
          break
        default: {
          const plaza = plazaCenters.find((p) => (x - p.x) ** 2 + (y - p.y) ** 2 <= (p.r + 1) ** 2)
          c = plaza ? radial(x, y, plaza) : tiles(x, y, 8, P.PLAZA, 65)
        }
      }
      map.data[i] = c
    }
  }
  const out = new Uint32Array(map.data)
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x
      const code = paved.data[i]
      if (!code || code === PAVE.bridge) continue
      const n = [paved.data[i - 1], paved.data[i + 1], paved.data[i - size], paved.data[i + size]]
      const soft = code === PAVE.dirt || code === PAVE.gravel
      if (n.some((v) => v === 0)) {
        if (soft) {
          if (hash2(x, y, 71) < 0.5) out[i] = mix(map.data[i], P.GRASS[2], 0.6)
        } else {
          out[i] = code === PAVE.road ? P.ROAD[3] : P.CURB_LIGHT
          if (paved.data[i + size] === 0) out[i + size] = scale(map.data[i + size], 0.72)
          if (paved.data[i + 1] === 0) out[i + 1] = scale(map.data[i + 1], 0.8)
        }
      } else if (code === PAVE.road && n.some((v) => v === PAVE.sidewalk)) {
        out[i] = P.CURB_DARK
      } else if (code === PAVE.sidewalk && n.some((v) => v === PAVE.road)) {
        out[i] = P.CURB_LIGHT
      } else if ((code === PAVE.market || code === PAVE.plaza) && n.some((v) => v !== code && v !== PAVE.bridge)) {
        out[i] = P.PLAZA[1]
      } else if (!soft && n.some((v) => v === PAVE.dirt || v === PAVE.gravel)) {
        out[i] = P.PLAZA[1]
      }
    }
  }
  map.data.set(out)
}

function tiles(x: number, y: number, cell: number, ramp: Color[], seed: number): Color {
  const row = Math.floor(y / cell)
  const offset = row % 2 ? cell >> 1 : 0
  const tx = Math.floor((x + offset) / cell)
  if (y % cell === 0 || (x + offset) % cell === 0) return ramp[1]
  const tint = hash2(tx, row, seed)
  let c = tint < 0.25 ? ramp[2] : tint > 0.8 ? ramp[4] : ramp[3]
  if ((x + offset) % cell === 1 || y % cell === 1) c = mix(c, ramp[4], 0.4)
  if (hash2(x, y, seed + 1) < 0.02) c = ramp[2]
  return c
}

function cobble(x: number, y: number): Color {
  const row = Math.floor(y / 4)
  const offset = Math.floor(hash2(row, 0, 81) * 5)
  const col = Math.floor((x + offset) / 5)
  const lx = (x + offset) % 5
  const ly = y % 4
  if (ly === 3 || lx === 4) return P.COBBLE[0]
  const tint = hash2(col, row, 83)
  let c = tint < 0.3 ? P.COBBLE[2] : tint > 0.75 ? P.COBBLE[4] : P.COBBLE[3]
  if (ly === 0 && lx < 3) c = mix(c, P.COBBLE[4], 0.5)
  if (ly === 2 && lx > 1) c = mix(c, P.COBBLE[1], 0.35)
  return c
}

function road(x: number, y: number, centres: { x: number; y: number }): Color {
  const vertical = Math.abs(x - centres.x) <= 16
  const horizontal = Math.abs(y - centres.y) <= 16
  const along = vertical && !horizontal ? y : x
  const across = vertical && !horizontal ? x - centres.x : y - centres.y
  const slab = Math.floor(along / 16)
  let c = hash2(slab, Math.floor(across / 8), 91) < 0.4 ? P.ROAD[1] : P.ROAD[2]
  if (along % 16 === 0) c = P.ROAD[0]
  if (Math.abs(across) === 8 && along % 6 < 3) c = mix(P.ROAD[3], P.PLASTER[3], 0.35)
  if (Math.abs(across) <= 1) {
    const rune = along % 24
    c = rune < 2 ? P.GLOW[2] : rune === 12 ? P.GLOW[3] : mix(P.ROAD[2], P.GLOW[0], 0.55)
  }
  if (Math.abs(across) === 2 && along % 24 === 12) c = P.GLOW[1]
  return c
}

function marketTiles(x: number, y: number): Color {
  const cell = 10
  const tx = Math.floor(x / cell)
  const ty = Math.floor(y / cell)
  if (x % cell === 0 || y % cell === 0) return P.CREAM[1]
  const warm = (tx + ty) % 2 === 0
  let c = warm ? P.CREAM[3] : mix(P.ROOF_TERRACOTTA[4], P.CREAM[3], 0.45)
  if (x % cell === 1 || y % cell === 1) c = mix(c, P.WHITE, 0.2)
  if (hash2(x, y, 95) < 0.02) c = scale(c, 0.92)
  return c
}

function radial(x: number, y: number, centre: { x: number; y: number; r: number }): Color {
  const dx = x + 0.5 - centre.x
  const dy = y + 0.5 - centre.y
  const distance = Math.hypot(dx, dy)
  const ringWidth = 6
  const ring = Math.floor(distance / ringWidth)
  const perimeter = Math.max(6, Math.round((2 * Math.PI * (ring + 0.5) * ringWidth) / 9))
  const angle = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)
  const stone = Math.floor(angle * perimeter + (ring % 2) * 0.5)
  const edgeRing = distance % ringWidth < 1
  const edgeStone = (angle * perimeter + (ring % 2) * 0.5) % 1 < 1 / 9
  if (edgeRing || edgeStone) return P.PLAZA[1]
  const tint = hash2(stone, ring, 97)
  let c = tint < 0.3 ? P.PLAZA[2] : tint > 0.82 ? P.PLAZA[4] : P.PLAZA[3]
  if (centre.r > 100 && ring % 11 === 7) c = mix(P.ROOF_TEAL[4], P.PLAZA[3], 0.35)
  return c
}

export function paintFields(map: Raster) {
  for (const field of L.FIELDS) {
    const x0 = Math.round(field.rect.x / ART)
    const y0 = Math.round(field.rect.y / ART)
    const w = Math.round(field.rect.w / ART)
    const h = Math.round(field.rect.h / ART)
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const along = field.rows === 'h' ? y - y0 : x - x0
        const cross = field.rows === 'h' ? x - x0 : y - y0
        const row = along % 6
        const n = hash2(x, y, 101)
        let c: Color
        if (field.kind === 'orchard') {
          c = Math.floor((x - x0) / 10) % 2 ? P.GRASS[3] : P.GRASS[2]
          if (n < 0.01) c = P.FLOWERS[2]
        } else if (row >= 4) {
          c = row === 4 ? P.FIELD_SOIL[1] : P.FIELD_SOIL[0]
          if (n < 0.05) c = P.FIELD_SOIL[2]
        } else if (field.kind === 'wheat') {
          c = row === 0 ? P.WHEAT[3] : row === 3 ? P.WHEAT[0] : n < 0.35 ? P.WHEAT[1] : P.WHEAT[2]
          if ((cross + along) % 5 === 0 && row < 2) c = P.WHEAT[3]
        } else if (field.kind === 'lavender') {
          c = row === 0 ? P.LAVENDER[3] : row === 3 ? P.OAK[1] : n < 0.4 ? P.LAVENDER[1] : P.LAVENDER[2]
        } else if (field.kind === 'flowers') {
          const band = Math.floor(along / 6) % 4
          const color = [P.FLOWERS[1], P.FLOWERS[0], P.FLOWERS[6], P.FLOWERS[3]][band]
          c = row === 3 ? P.OAK[1] : row === 0 ? mix(color, P.WHITE, 0.25) : n < 0.6 ? color : P.OAK[3]
        } else {
          c = P.FIELD_SOIL[1]
          if (n < 0.06) c = P.FIELD_SOIL[2]
        }
        map.set(x, y, c)
      }
    }
    if (field.kind === 'vegetables') {
      const horizontal = field.rows === 'h'
      for (let a = 3; a < (horizontal ? h : w) - 2; a += 6) {
        for (let b = 3; b < (horizontal ? w : h) - 2; b += 6) {
          const cx = x0 + (horizontal ? b : a)
          const cy = y0 + (horizontal ? a : b)
          const pumpkin = hash2(a, b, 107) < 0.12
          map.eachInEllipse(cx + 1, cy + 1, 3, 2.2, (x, y) => map.shadow(x, y, 0.35))
          map.eachInEllipse(cx, cy, 2.6, 2.3, (x, y, d) => {
            const lit = x + y < cx + cy
            const ramp = pumpkin ? P.ROOF_OCHRE : P.OAK
            map.set(x, y, d > 0.7 ? ramp[1] : lit ? ramp[pumpkin ? 5 : 5] : ramp[3])
          })
          if (pumpkin) map.set(cx, cy - 2, P.OAK[2])
        }
      }
    }
  }
}

export function paintGardens(map: Raster) {
  for (const garden of L.GARDENS) {
    const x0 = Math.round(garden.rect.x / ART)
    const y0 = Math.round(garden.rect.y / ART)
    const w = Math.round(garden.rect.w / ART)
    const h = Math.round(garden.rect.h / ART)
    const glowing = garden.kind === 'glow-flowers'
    const palette = glowing ? P.GLOW_FLOWERS : [P.FLOWERS[1], P.FLOWERS[0], P.FLOWERS[2], P.FLOWERS[6]]
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        const border = x < x0 + 2 || y < y0 + 2 || x >= x0 + w - 2 || y >= y0 + h - 2
        if (border) {
          map.set(x, y, y >= y0 + h - 2 || x >= x0 + w - 2 ? P.STONE[2] : P.STONE[5])
          continue
        }
        map.set(x, y, hash2(x, y, 111) < 0.3 ? P.FIELD_SOIL[0] : P.FIELD_SOIL[1])
      }
    }
    flowerClumps(map, x0 + 3, y0 + 3, w - 6, h - 6, palette, garden.rect.x + garden.rect.y)
    if (glowing) {
      for (let y = y0 - 4; y < y0 + h + 4; y++) {
        for (let x = x0 - 4; x < x0 + w + 4; x++) {
          const inside = x >= x0 && y >= y0 && x < x0 + w && y < y0 + h
          if (!inside) map.blend(x, y, P.GLOW[1], 0.12)
        }
      }
    }
  }
}

function flowerClumps(map: Raster, x0: number, y0: number, w: number, h: number, palette: Color[], seed: number) {
  for (let row = 0; row * 5 < h - 3; row++) {
    const y = y0 + row * 5 + 2
    const color = palette[(row + Math.floor(hash2(row, 0, seed) * 2)) % palette.length]
    for (let x = x0 + (row % 2) * 3; x < x0 + w - 3; x += 6) {
      map.rect(x, y, 4, 2, P.OAK[2])
      map.set(x, y + 2, P.OAK[1])
      map.set(x + 3, y + 2, P.OAK[1])
      map.set(x + 1, y - 1, color)
      map.set(x + 2, y - 1, mix(color, P.WHITE, 0.3))
      map.set(x, y, color)
      map.set(x + 3, y, scale(color, 0.85))
      map.set(x + 1, y, P.OAK[4])
    }
  }
}

export function paintFences(map: Raster) {
  for (const fence of L.FENCES) {
    for (let s = 0; s < fence.points.length - 1; s++) {
      const [ax, ay] = fence.points[s].map((v) => Math.round(v / ART))
      const [bx, by] = fence.points[s + 1].map((v) => Math.round(v / ART))
      if (fence.kind === 'hedge') {
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
          for (let k = 0; k < 7; k++) {
            const y = ay - 5 + k
            const n = hash2(x, y, 121)
            map.set(x, y, k === 0 || k === 6 ? P.OAK[0] : k < 3 ? (n < 0.5 ? P.OAK[4] : P.OAK[5]) : n < 0.5 ? P.OAK[2] : P.OAK[3])
          }
          map.shadow(x, ay + 2, 0.4)
          map.shadow(x, ay + 3, 0.25)
        }
        continue
      }
      if (ay === by) {
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) {
          map.shadow(x, ay + 1, 0.35)
          map.set(x, ay - 3, P.WOOD[4])
          map.set(x, ay - 2, P.WOOD[2])
          map.set(x, ay - 6, P.WOOD[4])
          map.set(x, ay - 5, P.WOOD[2])
          if ((x - Math.min(ax, bx)) % 9 === 0) {
            for (let k = -8; k <= 0; k++) map.set(x, ay + k, k === -8 ? P.WOOD[5] : P.WOOD[1])
            map.set(x + 1, ay, P.WOOD[0])
          }
        }
      } else {
        for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
          map.set(ax, y - 4, P.WOOD[3])
          map.set(ax + 1, y - 4, P.WOOD[1])
          map.shadow(ax + 2, y - 3, 0.3)
          if ((y - Math.min(ay, by)) % 8 === 0) {
            for (let k = -8; k <= 0; k++) map.set(ax, y + k, k === -8 ? P.WOOD[5] : P.WOOD[1])
            map.set(ax + 1, y, P.WOOD[0])
          }
        }
      }
    }
  }
}

export function paintBridges(map: Raster) {
  for (const bridge of L.BRIDGES) {
    const x0 = Math.round(bridge.rect.x / ART)
    const y0 = Math.round(bridge.rect.y / ART)
    const w = Math.round(bridge.rect.w / ART)
    const h = Math.round(bridge.rect.h / ART)
    if (bridge.kind === 'wood') {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const plank = (y - y0) % 4 === 3
          map.set(x, y, plank ? P.WOOD[1] : hash2(x >> 2, (y - y0) >> 2, 131) < 0.4 ? P.WOOD[3] : P.WOOD[4])
        }
        map.set(x0, y, P.WOOD[0])
        map.set(x0 + 1, y, P.WOOD[5])
        map.set(x0 + w - 1, y, P.WOOD[0])
        map.set(x0 + w - 2, y, P.WOOD[2])
        if ((y - y0) % 10 === 0) {
          map.rect(x0 - 1, y - 3, 3, 4, P.WOOD[2])
          map.rect(x0 + w - 2, y - 3, 3, 4, P.WOOD[2])
        }
      }
      continue
    }
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) map.set(x, y, tiles(x, y, 8, P.PLAZA, 141))
    }
    for (let x = x0; x < x0 + w; x++) {
      for (let k = 0; k < 4; k++) map.set(x, y0 + k, k === 0 ? P.STONE[5] : k === 3 ? P.STONE[1] : P.STONE[3])
      for (let k = 0; k < 5; k++) map.set(x, y0 + h - 5 + k, k === 0 ? P.STONE[5] : k < 4 ? ((x - x0) % 8 === 0 ? P.STONE[1] : P.STONE[3]) : P.STONE[1])
      for (let k = 0; k < 7; k++) {
        const arch = Math.abs(((x - x0) % 22) - 11) < 7 - k * 0.6
        map.set(x, y0 + h + k, arch ? (k < 2 ? P.STONE[0] : P.WATER[0]) : k < 1 ? P.STONE[2] : P.STONE[k < 4 ? 3 : 2])
      }
      if ((x - x0) % 16 === 8) {
        map.set(x, y0 - 1, P.GLOW[2])
        map.set(x, y0 + h - 6, P.GLOW[2])
      }
    }
    for (let y = y0; y < y0 + h; y++) {
      map.set(x0, y, P.STONE[4])
      map.set(x0 + w - 1, y, P.STONE[1])
    }
  }
}
