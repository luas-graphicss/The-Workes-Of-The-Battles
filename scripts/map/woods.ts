import { fbm, hash2, random } from '../../lib/city/geometry'
import { ART } from '../../lib/city/model'
import { BEACON, CAMPS, CRYSTAL_CRATES, GLADES, LANDING_MARKS, WOODS_LOGS, WOODS_ROCKS, WOODS_STUMPS, type FallenLog, type Glade } from '../../lib/city/woods'
import type { Masks } from './ground'
import * as P from './palette'
import { paintFirePit, paintTent } from './props'
import { mix, type Color, type Raster } from './raster'

const px = (v: number) => Math.round(v / ART)

export function paintWoods(map: Raster, masks: Masks) {
  for (const glade of GLADES) paintGladeFloor(map, masks, glade)
  for (const camp of CAMPS) paintCampGround(map, px(camp.fire[0]), px(camp.fire[1]), camp.id === 'forasteiros' ? 58 : 44, camp.id === 'forasteiros')
  for (const mark of LANDING_MARKS) paintLandingMark(map, px(mark.center[0]), px(mark.center[1]), px(mark.radius))
  for (const glade of GLADES) paintGladeDetails(map, masks, glade)
  for (const rock of WOODS_ROCKS) paintRock(map, px(rock.x), px(rock.y), Math.max(3, px(rock.r)))
  for (const [x, y] of WOODS_STUMPS) paintStump(map, px(x), px(y))
  for (const log of WOODS_LOGS) paintLog(map, log)
  paintBeacon(map, px(BEACON.x), px(BEACON.y), px(BEACON.width), px(BEACON.height))
  for (const [x, y] of CRYSTAL_CRATES) paintCrystalCrate(map, px(x), px(y))
  for (const camp of CAMPS) {
    for (const tent of camp.tents) paintTent(map, tent)
    paintFirePit(map, px(camp.fire[0]), px(camp.fire[1]), camp.id === 'forasteiros')
    paintCache(map, px(camp.cache[0]), px(camp.cache[1]), camp.id === 'forasteiros')
  }
}

function openGround(masks: Masks, x: number, y: number) {
  if (x < 0 || y < 0 || x >= masks.size || y >= masks.size) return false
  const i = y * masks.size + x
  return masks.land.data[i] !== 0 && masks.water.data[i] === 0 && masks.paved.data[i] === 0
}

function paintGladeFloor(map: Raster, masks: Masks, glade: Glade) {
  const cx = px(glade.center[0])
  const cy = px(glade.center[1])
  const r = px(glade.radius)
  map.eachInEllipse(cx, cy, r, r * 0.86, (x, y, d) => {
    if (!openGround(masks, x, y)) return
    const edge = Math.sqrt(d)
    const soft = 1 - Math.min(1, Math.max(0, (edge - 0.55) / 0.45))
    const wobble = fbm(x, y, 7, 31 + glade.radius, 2)
    if (edge > 0.7 && wobble < edge - 0.35) return
    const under = map.get(x, y)
    switch (glade.kind) {
      case 'meadow':
      case 'spring': {
        const patch = fbm(x, y, 22, 41, 3)
        const level = patch < 0.4 ? 1 : patch < 0.6 ? 2 : patch < 0.8 ? 3 : 4
        map.set(x, y, mix(under, P.MEADOW[level], soft * 0.9))
        break
      }
      case 'ferns': {
        const patch = fbm(x, y, 16, 43, 2)
        map.set(x, y, mix(under, patch < 0.5 ? P.GRASS[1] : P.GRASS[2], soft * 0.75))
        break
      }
      case 'stones':
      case 'circle': {
        const patch = fbm(x, y, 12, 47, 2)
        const c = patch < 0.35 ? P.GRAVEL[0] : patch < 0.6 ? P.GRASS[2] : P.GRASS[3]
        map.set(x, y, mix(under, c, soft * 0.8))
        break
      }
      case 'stumps': {
        const patch = fbm(x, y, 14, 53, 2)
        map.set(x, y, mix(under, patch < 0.45 ? P.DIRT[2] : P.GRASS[2], soft * 0.7))
        break
      }
      case 'mushrooms': {
        const patch = fbm(x, y, 10, 59, 2)
        map.set(x, y, mix(under, patch < 0.5 ? mix(P.DIRT[1], P.FOREST_FLOOR[3], 0.5) : P.GRASS[0], soft * 0.8))
        break
      }
      case 'scorched': {
        const patch = fbm(x, y, 9, 61, 2)
        const burnt = patch < 0.45 ? P.INK_SOFT : patch < 0.7 ? mix(P.FOREST_FLOOR[0], P.INK, 0.4) : P.STONE[0]
        map.set(x, y, mix(under, burnt, soft * 0.9))
        break
      }
      case 'pond': {
        const patch = fbm(x, y, 18, 67, 2)
        map.set(x, y, mix(under, patch < 0.5 ? P.GRASS[2] : P.MEADOW[2], soft * 0.6))
        break
      }
    }
  })
}

function paintGladeDetails(map: Raster, masks: Masks, glade: Glade) {
  const cx = px(glade.center[0])
  const cy = px(glade.center[1])
  const r = px(glade.radius)
  const rng = random(900 + glade.radius + cx)
  const inside = (x: number, y: number) => ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.86)) ** 2 < 0.8
  const spots = (count: number, fn: (x: number, y: number) => void, inner = 0) => {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2
      const d = r * (inner + Math.sqrt(rng()) * (0.88 - inner))
      const x = Math.round(cx + Math.cos(angle) * d)
      const y = Math.round(cy + Math.sin(angle) * d * 0.86)
      if (openGround(masks, x, y) && inside(x, y)) fn(x, y)
    }
  }
  switch (glade.kind) {
    case 'meadow':
      spots(Math.round(r * 1.6), (x, y) => map.set(x, y, P.FLOWERS[Math.floor(rng() * P.FLOWERS.length)]))
      spots(Math.round(r * 0.5), (x, y) => tuft(map, x, y, P.MEADOW[4]))
      break
    case 'ferns':
      spots(Math.round(r * 0.55), (x, y) => fern(map, x, y, rng))
      break
    case 'stones':
      spots(Math.round(r * 0.4), (x, y) => map.set(x, y, P.GRAVEL[Math.floor(rng() * 3)]))
      spots(Math.round(r * 0.14), (x, y) => paintRock(map, x, y, 1 + Math.floor(rng() * 2)))
      break
    case 'circle':
      paintSlab(map, cx, cy)
      spots(Math.round(r * 0.3), (x, y) => map.set(x, y, P.GRAVEL[Math.floor(rng() * 3)]))
      break
    case 'stumps':
      spots(Math.round(r * 0.6), (x, y) => map.set(x, y, hash2(x, y, 3) < 0.5 ? P.WOOD[4] : P.DIRT[3]))
      break
    case 'mushrooms':
      spots(Math.round(r * 0.5), (x, y) => mushroom(map, x, y, rng))
      spots(Math.round(r * 0.8), (x, y) => map.set(x, y, mix(P.DIRT[2], P.FOREST_FLOOR[3], 0.4)))
      break
    case 'scorched':
      spots(Math.round(r * 1.2), (x, y) => map.set(x, y, hash2(x, y, 5) < 0.5 ? P.STONE[2] : P.INK))
      spots(Math.round(r * 0.1), (x, y) => map.set(x, y, P.CRYSTAL[2]))
      break
    case 'pond':
      spots(Math.round(r * 0.3), (x, y) => reed(map, x, y, rng), 0.4)
      break
    case 'spring':
      map.eachInEllipse(cx, cy, 9, 6, (x, y, d) => {
        if (!openGround(masks, x, y)) return
        map.set(x, y, d < 0.3 ? P.WATER[4] : d < 0.6 ? P.WATER[3] : mix(P.DIRT[0], P.FOREST_FLOOR[3], 0.5))
      })
      spots(Math.round(r * 0.5), (x, y) => reed(map, x, y, rng), 0.25)
      paintRock(map, cx - 7, cy - 4, 2)
      paintRock(map, cx + 8, cy + 2, 3)
      break
  }
}

function tuft(map: Raster, x: number, y: number, c: Color) {
  map.set(x, y - 1, c)
  map.set(x - 1, y, c)
  map.set(x + 1, y, c)
}

function fern(map: Raster, x: number, y: number, rng: () => number) {
  const dark = rng() < 0.5
  const leaf = dark ? P.CONIFER[4] : P.OAK[4]
  const tip = dark ? P.CONIFER[5] : P.OAK[5]
  for (let k = -2; k <= 2; k++) {
    const length = 3 - Math.abs(k)
    for (let s = 1; s <= length; s++) map.set(x + k * s, y - s, s === length ? tip : leaf)
  }
  map.set(x, y, P.TRUNK[2])
}

function mushroom(map: Raster, x: number, y: number, rng: () => number) {
  const red = rng() < 0.4
  const cap = red ? P.FLOWERS[1] : P.DIRT[3]
  map.rect(x - 1, y - 2, 3, 1, cap)
  map.rect(x - 2, y - 1, 5, 1, cap)
  map.set(x, y - 2, red ? P.WHITE : P.DIRT[4])
  map.set(x, y, P.PLASTER[3])
  map.set(x, y + 1, P.PLASTER[1])
  map.shadow(x + 1, y + 1, 0.3)
}

function reed(map: Raster, x: number, y: number, rng: () => number) {
  const h = 2 + Math.floor(rng() * 3)
  map.vline(x, y - h, y, P.REED[1 + Math.floor(rng() * 2)])
  map.set(x, y - h, P.REED[3])
}

function paintSlab(map: Raster, cx: number, cy: number) {
  map.ellipseShadow(cx + 1, cy + 4, 12, 5, 0.3)
  map.eachInEllipse(cx, cy, 11, 5, (x, y, d) => map.set(x, y, d < 0.5 ? P.STONE[3] : d < 0.8 ? P.STONE[2] : P.STONE[1]))
  map.hline(cx - 9, cx + 9, cy - 4, P.STONE[4])
  map.set(cx, cy - 1, P.CRYSTAL[2])
  map.set(cx - 1, cy, P.CRYSTAL[2])
  map.set(cx + 1, cy, P.CRYSTAL[2])
  map.set(cx, cy + 1, P.CRYSTAL[2])
  map.set(cx, cy, P.CRYSTAL[4])
}

function paintCampGround(map: Raster, fx: number, fy: number, r: number, cold: boolean) {
  map.eachInEllipse(fx, fy - 4, r, r * 0.78, (x, y, d) => {
    if (d > 0.72 && hash2(x, y, 173) < (d - 0.72) * 3.2) return
    const n = hash2(x, y, 175)
    const worn = fbm(x, y, 11, 177, 2)
    let c = n < 0.08 ? P.DIRT[1] : n > 0.95 ? P.DIRT[4] : P.DIRT[2 + (hash2(x >> 2, y >> 2, 179) < 0.45 ? 1 : 0)]
    if (worn > 0.62) c = mix(c, P.GRASS[1], (worn - 0.62) * 1.6)
    if (cold) c = mix(c, P.METAL[1], 0.22)
    map.set(x, y, c)
  })
  if (cold) {
    const rng = random(fx * 3 + fy)
    for (let i = 0; i < 5; i++) {
      const angle = rng() * Math.PI * 2
      const d = r * (0.35 + rng() * 0.45)
      glyph(map, Math.round(fx + Math.cos(angle) * d), Math.round(fy - 4 + Math.sin(angle) * d * 0.78), rng)
    }
  }
}

function glyph(map: Raster, x: number, y: number, rng: () => number) {
  const c = mix(P.METAL[0], P.DIRT[0], 0.4)
  let cx = x
  let cy = y
  for (let s = 0; s < 4; s++) {
    const length = 2 + Math.floor(rng() * 3)
    if (s % 2 === 0) {
      const dir = rng() < 0.5 ? -1 : 1
      map.hline(Math.min(cx, cx + dir * length), Math.max(cx, cx + dir * length), cy, c)
      cx += dir * length
    } else {
      const dir = rng() < 0.5 ? -1 : 1
      map.vline(cx, Math.min(cy, cy + dir * length), Math.max(cy, cy + dir * length), c)
      cy += dir * length
    }
  }
  map.set(x, y, P.CRYSTAL[1])
}

function paintCache(map: Raster, cx: number, cy: number, sealed: boolean) {
  const w = 15
  const h = 11
  const x0 = cx - Math.floor(w / 2)
  const y0 = cy - h
  map.ellipseShadow(cx + 2, cy + 1, w * 0.62, 3, 0.4)
  const body = sealed ? P.METAL : P.WOOD
  map.rect(x0, y0 + 4, w, h - 4, body[2])
  map.rect(x0, y0 + 4, w, 1, body[3])
  map.rect(x0, y0 + h - 2, w, 2, body[1])
  map.rect(x0 + 1, y0, w - 2, 4, body[3])
  map.hline(x0 + 1, x0 + w - 2, y0, body[4])
  map.vline(x0, y0 + 1, y0 + h - 1, P.INK_SOFT)
  map.vline(x0 + w - 1, y0 + 1, y0 + h - 1, P.INK_SOFT)
  for (const sx of [x0 + 3, x0 + w - 4]) map.vline(sx, y0, y0 + h - 1, sealed ? P.CRYSTAL[1] : P.METAL[2])
  if (sealed) {
    map.rect(cx - 1, y0 + 3, 3, 3, P.CRYSTAL[2])
    map.set(cx, y0 + 4, P.CRYSTAL[4])
  } else {
    map.rect(cx - 1, y0 + 3, 3, 3, P.GOLD[1])
    map.set(cx, y0 + 4, P.GOLD[3])
  }
}

function paintCrystalCrate(map: Raster, cx: number, cy: number) {
  const w = 19
  const h = 12
  const x0 = cx - Math.floor(w / 2)
  const y0 = cy - h
  map.ellipseShadow(cx + 2, cy + 1, w * 0.6, 3, 0.4)
  map.rect(x0, y0 + 2, w, h - 2, P.WOOD[2])
  map.rect(x0, y0 + h - 2, w, 2, P.WOOD[1])
  map.hline(x0, x0 + w - 1, y0 + 2, P.WOOD[4])
  map.vline(x0, y0 + 2, y0 + h - 1, P.WOOD[0])
  map.vline(x0 + w - 1, y0 + 2, y0 + h - 1, P.WOOD[0])
  map.rect(x0 + 2, y0 + 5, w - 4, 1, P.METAL[2])
  map.rect(x0 + 1, y0, w - 2, 3, P.WOOD[3])
  map.hline(x0 + 1, x0 + w - 2, y0, P.WOOD[5])

  map.rect(x0 + 3, y0 + 2, w - 6, 1, P.CRYSTAL[3])
  map.set(cx - 3, y0 + 2, P.CRYSTAL[4])
  map.set(cx + 2, y0 + 2, P.CRYSTAL[4])
  map.set(cx - 1, y0 - 1, P.CRYSTAL[2])
  map.set(cx + 3, y0 - 1, P.CRYSTAL[1])
  map.eachInEllipse(cx, cy + 1, w * 0.7, 4, (x, y, d) => map.lighten(x, y, (1 - d) * 0.18, P.CRYSTAL[3]))
}

function paintBeacon(map: Raster, cx: number, baseY: number, w: number, h: number) {
  const half = Math.floor(w / 2)
  for (let dx = 1; dx <= h * 0.55; dx++) {
    const t = dx / (h * 0.55)
    const sy = baseY + Math.round(dx * 0.35)
    map.rectShadow(cx + half + dx, sy - 3, 1, Math.max(1, Math.round(6 * (1 - t))), 0.45 * (1 - t * 0.5))
  }
  map.eachInEllipse(cx, baseY, half + 4, 4, (x, y, d) => map.set(x, y, d < 0.6 ? P.METAL[1] : P.METAL[0]))
  for (const sx of [-half - 2, half + 2]) {
    map.line(cx + sx, baseY + 1, cx + Math.sign(sx) * (half - 2), baseY - 10, P.METAL[1])
  }
  for (let y = baseY; y >= baseY - h; y--) {
    const t = (baseY - y) / h
    const wy = Math.max(2, Math.round(half * (1 - 0.6 * t)))
    for (let x = cx - wy; x <= cx + wy; x++) {
      const plate = ((baseY - y) >> 3) % 2 === 0
      let c = x === cx - wy ? P.METAL[2] : x === cx + wy ? P.INK : plate ? P.METAL[0] : mix(P.METAL[0], P.METAL[1], 0.5)
      if ((baseY - y) % 8 === 0) c = P.INK
      map.set(x, y, c)
    }
    const glow = t > 0.3 ? Math.min(1, (t - 0.3) / 0.7) : 0
    if ((baseY - y) % 2 === 0) map.set(cx, y, mix(P.CRYSTAL[0], P.CRYSTAL[3], glow))
    if ((baseY - y) % 9 === 4) {
      map.set(cx - 1, y, P.CRYSTAL[1])
      map.set(cx + 1, y, P.CRYSTAL[1])
    }
  }
  const top = baseY - h
  map.eachInEllipse(cx, top - 2, 3, 3, (x, y, d) => map.set(x, y, d < 0.4 ? P.CRYSTAL[4] : P.CRYSTAL[3]))
  map.eachInEllipse(cx, top - 2, 7, 7, (x, y, d) => {
    if (d > 0.25) map.lighten(x, y, (1 - d) * 0.35, P.CRYSTAL[3])
  })
  map.vline(cx, top - 9, top - 5, P.CRYSTAL[2])
  map.set(cx, top - 11, P.CRYSTAL[4])
}

function paintLandingMark(map: Raster, cx: number, cy: number, r: number) {
  map.eachInEllipse(cx, cy, r, r * 0.8, (x, y, d) => {
    const ring = Math.sqrt(d)
    if (ring > 0.78 && ring < 1) {
      map.set(x, y, hash2(x, y, 181) < 0.2 ? P.STONE[1] : P.INK)
    } else if (ring <= 0.78) {
      const under = map.get(x, y)
      map.set(x, y, mix(under, P.INK_SOFT, 0.55 - ring * 0.3))
    }
  })
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.4
    const x = Math.round(cx + Math.cos(angle) * r * 0.5)
    const y = Math.round(cy + Math.sin(angle) * r * 0.4)
    map.rect(x - 1, y - 1, 3, 2, P.METAL[2])
    map.set(x, y - 1, P.CRYSTAL[2])
  }
}

function paintRock(map: Raster, cx: number, cy: number, r: number) {
  map.ellipseShadow(cx + 1, cy + Math.round(r * 0.55), r * 1.15, Math.max(1, r * 0.45), 0.35)
  map.eachInEllipse(cx, cy, r, r * 0.8, (x, y, d) => {
    const light = ((cx - x) / r) * 0.5 + ((cy - y) / (r * 0.8)) * 0.7
    const level = d > 0.82 ? 0 : light > 0.55 ? 5 : light > 0.2 ? 4 : light > -0.2 ? 3 : light > -0.55 ? 2 : 1
    map.set(x, y, P.STONE[level])
  })
  if (r >= 4) map.set(cx - Math.round(r * 0.35), cy - Math.round(r * 0.35), P.STONE[5])
  if (r >= 6) map.set(cx + Math.round(r * 0.2), cy + Math.round(r * 0.25), mix(P.STONE[2], P.GRASS[2], 0.5))
}

function paintStump(map: Raster, cx: number, cy: number) {
  const r = 5
  map.ellipseShadow(cx + 1, cy + 2, r + 1, 3, 0.35)
  map.rect(cx - r, cy - 2, r * 2 + 1, 4, P.TRUNK[1])
  map.vline(cx - r, cy - 2, cy + 1, P.TRUNK[0])
  map.vline(cx + r, cy - 2, cy + 1, P.TRUNK[0])
  map.eachInEllipse(cx, cy - 3, r, 3, (x, y, d) => map.set(x, y, d < 0.15 ? P.WOOD[5] : d < 0.45 ? P.WOOD[4] : d < 0.8 ? P.WOOD[3] : P.TRUNK[2]))
  map.set(cx - 2, cy - 3, P.WOOD[2])
  map.set(cx + 2, cy - 3, P.WOOD[2])
}

function paintLog(map: Raster, log: FallenLog) {
  const length = px(log.length)
  const x0 = px(log.x) - Math.floor(length / 2)
  const y0 = px(log.y)
  const thick = 5
  for (let t = 0; t <= length; t++) {
    const x = x0 + t
    const y = Math.round(y0 + (t - length / 2) * log.tilt)
    map.rectShadow(x + 1, y + 2, 1, 2, 0.35)
    map.set(x, y - 2, P.TRUNK[3])
    map.set(x, y - 1, P.TRUNK[2])
    map.set(x, y, P.TRUNK[2])
    map.set(x, y + 1, P.TRUNK[1])
    map.set(x, y + 2, P.TRUNK[0])
    if (t % 7 === 3) map.set(x, y, P.TRUNK[1])
    if (t % 11 === 5) map.set(x, y - 2, P.OAK[2])
  }
  const endY = Math.round(y0 + (length / 2) * log.tilt)
  map.eachInEllipse(x0 + length + 1, endY, 2, thick / 2, (x, y, d) => map.set(x, y, d < 0.3 ? P.WOOD[5] : d < 0.7 ? P.WOOD[4] : P.WOOD[2]))
}
