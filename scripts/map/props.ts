import { hash2, strokePath } from '../../lib/city/geometry'
import * as L from '../../lib/city/layout'
import { ART, type Prop, type Stall, type Tent } from '../../lib/city/model'
import * as P from './palette'
import { mix, Raster, scale, type Color } from './raster'

const px = (v: number) => Math.round(v / ART)

const GOODS: Record<Stall['goods'], Color[]> = {
  fruit: [P.FLOWERS[1], P.FLOWERS[0], P.FLOWERS[5], P.OAK[4]],
  crystals: [P.CRYSTAL[3], P.GLOW[1], P.CRYSTAL[2], P.GLOW[2]],
  bread: [P.ROOF_OCHRE[4], P.ROOF_OCHRE[3], P.CREAM[4], P.ROOF_OCHRE[2]],
  fabric: [P.AWNINGS[3], P.AWNINGS[0], P.AWNINGS[4], P.AWNINGS[6]],
  flowers: [P.FLOWERS[6], P.FLOWERS[4], P.FLOWERS[2], P.FLOWERS[0]],
  potions: [P.GLOW[1], P.CRYSTAL[3], P.FLOWERS[1], P.GOLD[3]],
}

export function paintStall(map: Raster, stall: Stall) {
  const x0 = px(stall.x)
  const y0 = px(stall.y)
  const w = px(stall.w)
  const h = px(stall.h)
  const color = P.AWNINGS[stall.color % P.AWNINGS.length]
  const canopyH = Math.round(h * 0.58)
  map.rectShadow(x0 + 4, y0 + 4, w, h, 0.45)
  map.rect(x0 + 2, y0 + canopyH, w - 4, h - canopyH, P.WOOD[3])
  for (let x = x0 + 2; x < x0 + w - 2; x += 4) map.vline(x, y0 + canopyH + 3, y0 + h - 1, P.WOOD[1])
  map.hline(x0 + 2, x0 + w - 3, y0 + canopyH + 2, P.WOOD[5])
  map.hline(x0 + 2, x0 + w - 3, y0 + h - 1, P.WOOD[0])
  const goods = GOODS[stall.goods]
  for (let x = x0 + 4; x < x0 + w - 4; x++) {
    for (let y = y0 + canopyH - 1; y <= y0 + canopyH + 1; y++) {
      const n = hash2(x, y, stall.x)
      map.set(x, y, n < 0.8 ? goods[Math.floor(hash2(x >> 1, y, stall.y) * goods.length)] : P.WOOD[2])
    }
  }
  for (let y = y0; y < y0 + canopyH; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const stripe = Math.floor((x - x0) / 5) % 2 === 0
      let c = stripe ? color : P.AWNING_STRIPE
      if (y < y0 + 2) c = mix(c, P.WHITE, 0.25)
      else if (y > y0 + canopyH - 3) c = scale(c, 0.86)
      map.set(x, y, c)
    }
  }
  for (let x = x0; x < x0 + w; x++) {
    const phase = (x - x0) % 5
    if (phase > 0 && phase < 4) map.set(x, y0 + canopyH, Math.floor((x - x0) / 5) % 2 === 0 ? scale(color, 0.8) : scale(P.AWNING_STRIPE, 0.8))
    map.set(x, y0 - 1, P.INK)
  }
  map.vline(x0 - 1, y0, y0 + canopyH, P.INK)
  map.vline(x0 + w, y0, y0 + canopyH, P.INK)
  map.vline(x0 + 2, y0 + canopyH, y0 + h, P.WOOD[0])
  map.vline(x0 + w - 3, y0 + canopyH, y0 + h, P.WOOD[0])
  if (stall.goods === 'crystals' || stall.goods === 'potions') {
    map.eachInEllipse(x0 + w / 2, y0 + canopyH + 1, w * 0.45, 5, (x, y, d) => map.blend(x, y, P.GLOW[2], 0.18 * (1 - d)))
  }
}

export function paintProp(map: Raster, prop: Prop) {
  const x = px(prop.x)
  const y = px(prop.y)
  switch (prop.kind) {
    case 'bench-h':
      map.rectShadow(x - 10, y - 2, 22, 4, 0.4)
      map.rect(x - 11, y - 9, 22, 2, P.WOOD[2])
      map.rect(x - 11, y - 7, 22, 2, P.WOOD[4])
      map.rect(x - 11, y - 5, 22, 2, P.WOOD[3])
      map.hline(x - 11, x + 10, y - 3, P.WOOD[1])
      map.rect(x - 10, y - 2, 2, 3, P.METAL[1])
      map.rect(x + 8, y - 2, 2, 3, P.METAL[1])
      map.hline(x - 12, x + 11, y - 10, P.INK)
      map.vline(x - 12, y - 9, y - 3, P.INK)
      map.vline(x + 11, y - 9, y - 3, P.INK)
      break
    case 'well':
      map.ellipseShadow(x + 3, y + 2, 12, 5, 0.45)
      map.eachInEllipse(x, y - 2, 11, 7, (px2, py, d) => map.set(px2, py, d > 0.55 ? (py < y - 3 ? P.STONE[4] : P.STONE[2]) : P.WATER[1]))
      map.eachInEllipse(x, y - 3, 6, 3.5, (px2, py) => map.set(px2, py, P.WATER[0]))
      map.set(x - 1, y - 4, P.GLOW[2])
      map.rect(x - 11, y - 20, 2, 18, P.WOOD[1])
      map.rect(x + 9, y - 20, 2, 18, P.WOOD[1])
      for (let k = 0; k < 6; k++) map.hline(x - 13 + k, x + 12 - k, y - 21 - k, k === 0 ? P.ROOF_TERRACOTTA[1] : P.ROOF_TERRACOTTA[3 + (k % 2)])
      map.vline(x, y - 20, y - 8, P.METAL[2])
      map.rect(x - 2, y - 9, 4, 3, P.WOOD[3])
      break
    case 'crates':
      for (const [dx, dy] of [
        [-8, 0],
        [4, 0],
        [-2, -9],
      ]) {
        const bx = x + dx
        const by = y + dy
        map.rectShadow(bx + 2, by - 7, 11, 9, 0.35)
        map.rect(bx, by - 9, 10, 9, P.WOOD[4])
        map.rect(bx, by - 9, 10, 2, P.WOOD[5])
        map.line(bx, by - 7, bx + 9, by - 1, P.WOOD[2])
        map.vline(bx + 9, by - 9, by - 1, P.WOOD[1])
        map.hline(bx, bx + 9, by - 1, P.WOOD[1])
      }
      break
    case 'barrels':
      for (const dx of [-8, 3]) {
        const bx = x + dx
        map.ellipseShadow(bx + 7, y, 7, 3, 0.35)
        map.rect(bx, y - 11, 10, 11, P.WOOD[3])
        map.hline(bx, bx + 9, y - 8, P.METAL[1])
        map.hline(bx, bx + 9, y - 3, P.METAL[1])
        map.vline(bx + 9, y - 11, y - 1, P.WOOD[1])
        map.vline(bx, y - 11, y - 1, P.WOOD[5])
        map.eachInEllipse(bx + 5, y - 11, 5, 2.5, (px2, py) => map.set(px2, py, P.WOOD[2]))
      }
      break
    case 'cart':
      map.rectShadow(x - 12, y - 1, 30, 4, 0.4)
      map.rect(x - 14, y - 14, 26, 10, P.WOOD[3])
      map.rect(x - 14, y - 16, 26, 3, P.WHEAT[3])
      for (let k = x - 14; k < x + 12; k++) if (hash2(k, y, 5) < 0.5) map.set(k, y - 17, P.WHEAT[2])
      map.hline(x - 14, x + 11, y - 5, P.WOOD[1])
      for (const wx of [x - 9, x + 7]) {
        map.eachInEllipse(wx, y - 4, 5, 5, (px2, py, d) => map.set(px2, py, d > 0.6 ? P.WOOD[1] : d < 0.15 ? P.METAL[2] : P.WOOD[4]))
      }
      map.line(x + 12, y - 8, x + 22, y - 2, P.WOOD[1])
      break
    default:
      break
  }
}

export function paintFountainBasin(map: Raster, cx: number, cy: number, radius: number) {
  const r = radius / ART
  const x = cx / ART
  const y = cy / ART
  map.eachInEllipse(x, y, r + 16, r + 16, (px2, py, d) => {
    const ring = Math.sqrt(d) * (r + 16)
    if (ring > r + 12 && ring < r + 14) map.set(px2, py, hash2(Math.round(Math.atan2(py - y, px2 - x) * 30), 0, 3) < 0.7 ? P.GLOW[1] : P.PLAZA[1])
  })
  map.ellipseShadow(x + 4, y + 5, r + 2, r + 1, 0.4)
  map.eachInEllipse(x, y, r, r, (px2, py, d) => {
    const nx = px2 + 0.5 - x
    const ny = py + 0.5 - y
    if (d > 0.84) {
      const lit = nx + ny < 0
      map.set(px2, py, d > 0.95 ? P.STONE[1] : lit ? P.STONE[5] : P.STONE[3])
    } else {
      const ripple = (Math.round(Math.hypot(nx, ny)) % 5 === 0 && hash2(px2, py, 9) < 0.6) || hash2(px2 >> 1, py, 11) < 0.04
      map.set(px2, py, ripple ? P.WATER[5] : d > 0.7 ? P.WATER[2] : P.WATER[3])
    }
  })
  map.eachInEllipse(x, y + 2, 9, 6, (px2, py, d) => map.set(px2, py, d > 0.6 ? P.STONE[2] : P.STONE[4]))
  map.eachInEllipse(x, y + 1, 5, 3, (px2, py) => map.set(px2, py, P.GLOW[1]))
  map.set(x, y + 1, P.GLOW[3])
}

export function paintYard(map: Raster, cx: number, cy: number, rx: number, ry: number) {
  map.eachInEllipse(cx / ART, cy / ART, rx / ART, ry / ART, (x, y, d) => {
    if (d > 0.82 && hash2(x, y, 151) < 0.5) return
    const n = hash2(x, y, 153)
    map.set(x, y, n < 0.1 ? P.DIRT[1] : n > 0.94 ? P.DIRT[4] : P.DIRT[2 + (hash2(x >> 2, y >> 2, 155) < 0.4 ? 1 : 0)])
  })
}

export function paintPlatform(map: Raster, cx: number, cy: number, rx: number, ry: number) {
  const x = cx / ART
  const y = cy / ART
  const ax = rx / ART
  const ay = ry / ART
  map.ellipseShadow(x + 2, y + 3, ax + 1, ay + 1, 0.35)
  map.eachInEllipse(x, y, ax, ay, (px2, py, d) => {
    if (d > 0.82) {
      map.set(px2, py, py + 0.5 < y ? P.STONE[5] : P.STONE[2])
      return
    }
    const row = Math.floor((py - y + ay) / 6)
    const joint = (py - Math.floor(y - ay)) % 6 === 0 || (px2 + (row % 2) * 4) % 8 === 0
    map.set(px2, py, joint ? P.PLAZA[1] : hash2(px2 >> 3, row, 157) < 0.3 ? P.PLAZA[2] : P.PLAZA[3])
  })
  for (let k = 0; k < 3; k++) map.rect(x - 10 + k, y + ay - 1 + k, 20 - k * 2, 1, k % 2 ? P.STONE[3] : P.STONE[5])
}

export function paintRuneRing(map: Raster, cx: number, cy: number, radius: number) {
  const x = cx / ART
  const y = cy / ART
  const r = radius / ART
  map.eachInEllipse(x, y, r + 2, r + 2, (px2, py) => {
    const d = Math.hypot(px2 + 0.5 - x, py + 0.5 - y)
    if (d > r - 1 && d <= r + 1) {
      const angle = Math.atan2(py - y, px2 - x)
      map.set(px2, py, Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 36) % 3 === 0 ? P.GLOW[2] : P.GLOW[0])
    }
  })
}

const ROPE_TEAL = [P.ROOF_TEAL[2], P.GLOW[0], P.GLOW[1]]
const ROPE_BRASS = [P.GOLD[1], P.GOLD[2], P.GOLD[3]]

export function paintArena(map: Raster) {
  const { ring, rope, gate, posts, center } = L.ARENA
  const x0 = px(ring.x)
  const y0 = px(ring.y)
  const w = px(ring.w)
  const h = px(ring.h)
  const ropeW = px(rope)
  const cx = px(center[0])
  const cy = px(center[1])
  const MAT_DARK = mix(P.METAL[0], P.ROOF_SLATE[0], 0.55)
  const MAT = mix(P.METAL[1], P.ROOF_SLATE[1], 0.5)
  const MAT_LIGHT = mix(P.METAL[2], P.ROOF_SLATE[2], 0.4)
  const CHALK = mix(P.METAL[3], P.WHITE, 0.45)

  map.rectBlend(x0 - 10, y0 - 10, w + 20, h + 20, P.PLAZA[0], 0.35)
  for (let i = -10; i < w + 10; i += 6) {
    map.set(x0 + i, y0 - 10, P.PLAZA[1])
    map.set(x0 + i, y0 + h + 9, P.PLAZA[1])
  }

  map.rectShadow(x0 + 4, y0 + 6, w, h, 0.45)
  map.rect(x0 - 5, y0 - 4, w + 10, h + 9, P.STONE[1])
  map.rect(x0 - 5, y0 - 4, w + 10, h + 4, P.STONE[2])
  map.hline(x0 - 5, x0 + w + 4, y0 - 4, P.STONE[5])
  map.hline(x0 - 5, x0 + w + 4, y0 + h + 4, P.STONE[0])
  map.rect(x0 - 2, y0 - 2, w + 4, h + 5, P.STONE[2])
  map.rect(x0 - 2, y0 - 2, w + 4, h + 2, P.STONE[4])
  map.hline(x0 - 2, x0 + w + 1, y0 - 2, P.STONE[5])
  map.vline(x0 - 2, y0 - 2, y0 + h, P.STONE[5])
  map.hline(x0 - 2, x0 + w + 1, y0 + h + 2, P.STONE[0])
  map.vline(x0 + w + 1, y0 - 2, y0 + h + 2, P.STONE[1])
  map.hline(x0 - 1, x0 + w, y0 - 1, P.GOLD[1])
  map.hline(x0 - 1, x0 + w, y0 + h, P.GOLD[0])
  map.vline(x0 - 1, y0 - 1, y0 + h, P.GOLD[1])
  map.vline(x0 + w, y0 - 1, y0 + h, P.GOLD[0])

  const inner = Math.min(w, h) * 0.34
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.15)
      const n = hash2(x, y, 707)
      let c = d < inner ? MAT : MAT_DARK
      if (d < inner * 0.55) c = mix(MAT, MAT_LIGHT, 0.35)
      if (n < 0.05) c = mix(c, MAT_LIGHT, 0.45)
      if ((x - x0) % 12 === 0 || (y - y0) % 12 === 0) c = mix(c, P.INK, 0.28)
      map.set(x, y, c)
    }
  }
  map.eachInEllipse(cx, cy, Math.round(inner), Math.round(inner / 1.15), (x, y, d) => {
    if (d > 0.93) map.set(x, y, mix(map.get(x, y), CHALK, 0.75))
  })
  map.eachInEllipse(cx, cy, Math.round(inner * 0.5), Math.round((inner * 0.5) / 1.15), (x, y, d) => {
    if (d > 0.88) map.set(x, y, mix(map.get(x, y), CHALK, 0.45))
  })
  const pad = 9
  for (const [sx, sy, teal] of [
    [x0 + ropeW, y0 + ropeW, true],
    [x0 + w - ropeW - pad, y0 + ropeW, false],
    [x0 + ropeW, y0 + h - ropeW - pad, false],
    [x0 + w - ropeW - pad, y0 + h - ropeW - pad, true],
  ] as const) {
    map.rect(sx, sy, pad, pad, teal ? P.ROOF_TEAL[2] : P.GOLD[1])
    map.rect(sx + 1, sy + 1, pad - 2, pad - 2, teal ? P.ROOF_TEAL[3] : P.GOLD[2])
    map.hline(sx + 1, sx + pad - 2, sy + 1, teal ? P.ROOF_TEAL[4] : P.GOLD[3])
  }

  map.eachInEllipse(cx, cy, 30, 20, (x, y, d) => {
    if (d > 0.9) map.set(x, y, hash2(x, y, 709) < 0.5 ? P.GOLD[1] : P.GOLD[2])
    else if (d > 0.82) map.set(x, y, P.GOLD[0])
    else if (d > 0.76) map.set(x, y, mix(map.get(x, y), P.GOLD[3], 0.35))
  })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    map.set(Math.round(cx + Math.cos(a) * 25), Math.round(cy + Math.sin(a) * 16.5), P.GOLD[3])
  }
  const crystal: readonly (readonly [number, number, Color])[] = [
    [0, -8, P.CRYSTAL[4]],
    [-1, -6, P.CRYSTAL[4]],
    [1, -6, P.CRYSTAL[3]],
    [-3, -4, P.CRYSTAL[3]],
    [3, -4, P.CRYSTAL[3]],
    [0, -4, P.CRYSTAL[4]],
    [-4, -1, P.CRYSTAL[2]],
    [4, -1, P.CRYSTAL[2]],
    [-2, -1, P.CRYSTAL[3]],
    [0, -1, P.CRYSTAL[4]],
    [2, -1, P.CRYSTAL[3]],
    [-5, 1, P.CRYSTAL[1]],
    [5, 1, P.CRYSTAL[1]],
    [-3, 2, P.CRYSTAL[2]],
    [3, 2, P.CRYSTAL[2]],
    [0, 2, P.CRYSTAL[3]],
    [-2, 4, P.CRYSTAL[1]],
    [2, 4, P.CRYSTAL[1]],
    [0, 5, P.CRYSTAL[2]],
    [-1, 7, P.CRYSTAL[0]],
    [1, 7, P.CRYSTAL[0]],
    [0, 8, P.CRYSTAL[1]],
  ]
  for (const [dx, dy, c] of crystal) {
    map.set(cx + dx, cy + dy, c)
    if (dx !== 0) map.set(cx + dx, cy + dy + 1, mix(c, P.CRYSTAL[0], 0.5))
  }

  const strands = (x: number, y: number, horizontal: boolean, length: number) => {
    const ramps = [ROPE_TEAL, ROPE_BRASS, ROPE_TEAL]
    for (let k = 0; k < 3; k++) {
      const ramp = ramps[k]
      for (let i = 0; i < length; i++) {
        const sx = horizontal ? x + i : x + k
        const sy = horizontal ? y + k : y + i
        map.set(sx, sy, ramp[1 + (hash2(sx, sy, 711) < 0.3 ? 1 : 0)])
      }
    }
    for (let i = 0; i < length; i++) {
      if (horizontal) {
        map.set(x + i, y + 3, P.METAL[1])
        map.shadow(x + i, y + 4, 0.3)
        if (i % 7 === 3) map.set(x + i, y + 3, P.GLOW[2])
      } else {
        map.set(x + 3, y + i, P.METAL[1])
        map.shadow(x + 4, y + i, 0.3)
        if (i % 7 === 3) map.set(x + 3, y + i, P.GLOW[2])
      }
    }
  }
  const gx0 = px(gate.x0)
  const gx1 = px(gate.x1)
  strands(x0, y0, true, gx0 - x0)
  strands(gx1, y0, true, x0 + w - gx1)
  strands(x0, y0 + h - ropeW, true, w)
  strands(x0, y0, false, h)
  strands(x0 + w - ropeW, y0, false, h)
  map.rect(gx0, y0 - 2, gx1 - gx0, 3, P.GOLD[2])
  map.hline(gx0, gx1 - 1, y0 - 2, P.GOLD[3])
  map.hline(gx0, gx1 - 1, y0 + 1, P.GOLD[0])
  for (const bx of [gx0 - 1, gx1]) {
    map.rect(bx - 1, y0 - 3, 3, 7, P.METAL[2])
    map.set(bx, y0 - 3, P.GLOW[1])
  }

  for (const [x, y] of posts) {
    const pxX = px(x)
    const pxY = px(y)
    map.eachInEllipse(pxX + 3, pxY + 4, 7, 4, (sx, sy) => map.shadow(sx, sy, 0.4))
    map.rect(pxX - 4, pxY - 4, 9, 9, P.METAL[1])
    map.rect(pxX - 3, pxY - 3, 7, 7, P.METAL[2])
    map.hline(pxX - 3, pxX + 3, pxY - 3, P.METAL[3])
    map.vline(pxX - 3, pxY - 3, pxY + 3, P.METAL[3])
    map.rect(pxX - 2, pxY - 2, 5, 5, P.ROOF_TEAL[1])
    map.rect(pxX - 1, pxY - 1, 3, 3, P.GLOW[1])
    map.set(pxX, pxY, P.GLOW[3])
  }

  for (const [, y] of [L.ARENA.playerStart, L.ARENA.enemyStart]) {
    const py = px(y)
    map.hline(cx - 12, cx + 12, py, CHALK)
    map.set(cx, py - 1, CHALK)
    map.set(cx, py + 1, CHALK)
  }
}

export function paintCamp(map: Raster) {
  const trail = strokePath(L.TRAIL_PATH, 52).map(([x, y]) => [x / ART, y / ART] as const)
  map.eachInPolygon(trail, (x, y) => {
    const edge = hash2(x, y, 161)
    const n = hash2(x, y, 163)
    map.set(x, y, edge < 0.04 ? P.GRASS[2] : n < 0.1 ? P.DIRT[1] : n > 0.95 ? P.DIRT[4] : P.DIRT[2 + (hash2(x >> 2, y >> 2, 165) < 0.5 ? 1 : 0)])
  })
  const [fx, fy] = [px(L.CAMPFIRE[0]), px(L.CAMPFIRE[1])]
  map.eachInEllipse(fx, fy - 6, 64, 50, (x, y, d) => {
    if (d > 0.8 && hash2(x, y, 167) < (d - 0.8) * 5) return
    const n = hash2(x, y, 169)
    map.set(x, y, n < 0.08 ? P.DIRT[1] : n > 0.95 ? P.DIRT[4] : P.DIRT[2 + (hash2(x >> 2, y >> 2, 171) < 0.45 ? 1 : 0)])
  })
  for (const tent of L.TENTS) paintTent(map, tent)
  for (const [dx, dy, horizontal] of [
    [-34, 12, true],
    [26, 16, true],
    [-6, 30, true],
    [40, -6, false],
  ] as const) {
    const lx = fx + dx
    const ly = fy + dy
    if (horizontal) {
      map.rectShadow(lx - 8, ly + 1, 18, 3, 0.4)
      map.rect(lx - 9, ly - 4, 18, 5, P.WOOD[2])
      map.hline(lx - 9, lx + 8, ly - 4, P.WOOD[4])
      map.hline(lx - 9, lx + 8, ly, P.WOOD[0])
      map.eachInEllipse(lx + 9, ly - 1.5, 2, 2.6, (x, y) => map.set(x, y, P.WOOD[5]))
    } else {
      map.rectShadow(lx + 1, ly - 7, 6, 17, 0.4)
      map.rect(lx - 2, ly - 9, 5, 16, P.WOOD[2])
      map.vline(lx - 2, ly - 9, ly + 6, P.WOOD[4])
      map.eachInEllipse(lx + 0.5, ly + 7, 2.6, 2, (x, y) => map.set(x, y, P.WOOD[5]))
    }
  }
  paintFirePit(map, fx, fy)
  paintProp(map, { kind: 'crates', x: 6560, y: 1540, seed: 1 })
  paintProp(map, { kind: 'barrels', x: 7160, y: 1520, seed: 2 })
  map.rect(px(6700) - 7, px(1720) - 3, 14, 5, P.AWNINGS[0])
  map.hline(px(6700) - 7, px(6700) + 6, px(1720) - 3, P.AWNINGS[5])
  map.rect(px(6992) - 2, px(1690) - 8, 4, 8, P.METAL[1])
  map.set(px(6992), px(1690) - 6, P.GOLD[3])
}

export function paintFirePit(map: Raster, fx: number, fy: number, cold = false) {
  map.eachInEllipse(fx, fy, 10, 7, (x, y) => map.set(x, y, cold ? P.METAL[0] : P.DIRT[0]))
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2
    const sx = Math.round(fx + Math.cos(angle) * 9)
    const sy = Math.round(fy + Math.sin(angle) * 6)
    map.rect(sx - 1, sy - 1, 3, 2, cold ? (i % 3 ? P.METAL[2] : P.METAL[3]) : i % 3 ? P.STONE[3] : P.STONE[4])
    map.set(sx + 1, sy, cold ? P.METAL[0] : P.STONE[1])
  }
  if (cold) {
    map.rect(fx - 2, fy - 2, 5, 3, P.CRYSTAL[1])
    map.rect(fx - 1, fy - 4, 3, 2, P.CRYSTAL[2])
    map.set(fx, fy - 5, P.CRYSTAL[4])
    map.set(fx - 3, fy - 1, P.CRYSTAL[3])
    map.set(fx + 3, fy - 2, P.CRYSTAL[3])
    return
  }
  map.line(fx - 5, fy + 2, fx + 5, fy - 2, P.WOOD[1])
  map.line(fx - 5, fy - 2, fx + 5, fy + 2, P.WOOD[2])
  map.rect(fx - 2, fy - 3, 4, 3, P.GOLD[2])
  map.set(fx - 1, fy - 4, P.GOLD[3])
  map.set(fx, fy - 5, P.GOLD[4])
  map.set(fx + 1, fy - 3, P.FLOWERS[5])
  map.set(fx - 3, fy - 1, P.FLOWERS[1])
}

export function paintTent(map: Raster, tent: Tent) {
  const base = { ochre: P.ROOF_OCHRE, rust: P.ROOF_TERRACOTTA, olive: P.ROOF_MOSS, canvas: P.PLASTER, night: P.ROOF_PLUM }[tent.color]
  const x0 = px(tent.x - tent.w / 2)
  const w = px(tent.w)
  const h = px(tent.h)
  const y0 = px(tent.y) - h
  const mid = x0 + Math.floor(w / 2)
  map.eachInEllipse(mid + 6, y0 + h - 2, w * 0.55, 7, (x, y) => map.shadow(x, y, 0.4))
  for (let y = y0; y < y0 + h; y++) {
    const t = (y - y0) / h
    const half = Math.round((w / 2) * (0.25 + t * 0.75))
    for (let x = mid - half; x <= mid + half; x++) {
      const left = x < mid
      let c = left ? base[4] : base[2]
      if ((y - y0) % 6 === 0) c = left ? base[3] : base[1]
      map.set(x, y, c)
    }
    map.set(mid - half - 1, y, P.INK)
    map.set(mid + half + 1, y, P.INK)
    map.set(mid, y, base[5])
  }
  const openH = Math.round(h * 0.55)
  for (let k = 0; k < openH; k++) {
    const y = y0 + h - openH + k
    const half = Math.round((k / openH) * w * 0.16) + 1
    for (let x = mid - half; x <= mid + half; x++) map.set(x, y, k < 2 ? base[0] : P.INK_SOFT)
    map.set(mid - half - 1, y, base[5])
  }
  map.hline(mid - Math.round(w / 2), mid + Math.round(w / 2), y0 + h, P.INK)
  for (const side of [-1, 1]) {
    map.line(mid + side * Math.round(w * 0.3), y0 + Math.round(h * 0.35), mid + side * Math.round(w * 0.7), y0 + h + 2, P.WOOD[4])
    map.rect(mid + side * Math.round(w * 0.7) - 1, y0 + h + 1, 2, 3, P.WOOD[1])
  }
  map.vline(mid, y0 - 4, y0, P.WOOD[1])
  map.set(mid, y0 - 5, P.AWNINGS[0])
}
