import { hash2, random } from '../../lib/city/geometry'
import { paintTree, type Sprite } from './nature'
import * as P from './palette'
import { mix, Raster, scale, type Color } from './raster'

export type LandmarkSprite = Sprite & { extra?: Record<string, number | number[]> }

function cylinderTone(u: number, ramp: Color[], bias = 0) {
  const light = 0.62 - u * 0.5 + bias
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(light * (ramp.length - 1))))]
}

export function paintWindmillTower(): LandmarkSprite {
  const w = 48
  const h = 112
  const s = new Raster(w, h)
  const cx = w / 2
  const bodyTop = 30
  const bottom = h - 4
  for (let y = bodyTop; y <= bottom; y++) {
    const t = (y - bodyTop) / (bottom - bodyTop)
    const half = 13 + t * 4
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half
      if (Math.abs(u) > 1) continue
      let c = cylinderTone(u, P.PLASTER)
      const course = (y - bodyTop) % 6 === 0
      if (course) c = scale(c, 0.9)
      if (y > bottom - 5) c = cylinderTone(u, P.STONE)
      if (Math.abs(u) > 0.93) c = scale(c, 0.8)
      s.set(x, y, c)
    }
  }
  const doorTop = bottom - 22
  s.rect(cx - 6, doorTop, 12, 22, P.WOOD[3])
  for (let x = cx - 6; x < cx + 6; x += 3) s.vline(x, doorTop + 2, bottom, P.WOOD[1])
  for (let k = 0; k < 3; k++) s.hline(cx - 5 + k, cx + 4 - k, doorTop - 1 - k, P.PLASTER[4])
  s.rect(cx - 8, bottom, 16, 2, P.STONE[5])
  for (const wy of [bodyTop + 16, bodyTop + 38]) {
    s.rect(cx - 3, wy, 6, 8, P.PLASTER[4])
    s.rect(cx - 2, wy + 1, 4, 6, P.GLASS[2])
    s.set(cx - 2, wy + 1, P.GLASS[5])
    s.hline(cx - 4, cx + 3, wy + 8, P.PLASTER[4])
  }
  const capTop = 4
  const capBottom = bodyTop + 3
  for (let y = capTop; y <= capBottom; y++) {
    const t = (y - capTop) / (capBottom - capTop)
    const half = 2 + t * 16
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half
      if (Math.abs(u) > 1) continue
      let c = cylinderTone(u, P.ROOF_SLATE, 0.05)
      if ((y - capTop) % 5 === 4) c = scale(c, 0.82)
      s.set(x, y, c)
    }
  }
  s.hline(cx - 18, cx + 18, capBottom + 1, P.ROOF_SLATE[0])
  s.vline(cx, 0, capTop, P.GOLD[3])
  s.set(cx, 0, P.GOLD[4])
  s.outline(P.INK)
  return { raster: s, anchorX: cx, anchorY: bottom + 1, extra: { hubX: cx, hubY: bodyTop + 4 } }
}

export function paintRotor(frame: number): LandmarkSprite {
  const size = 84
  const s = new Raster(size, size)
  const c = size / 2
  const base = (frame / 8) * (Math.PI / 2)
  for (let blade = 0; blade < 4; blade++) {
    const angle = base + (blade * Math.PI) / 2
    const ax = Math.cos(angle)
    const ay = Math.sin(angle)
    const nx = -ay
    const ny = ax
    const inner = 8
    const outer = 38
    const width = 10
    const quad = [
      [c + ax * inner, c + ay * inner],
      [c + ax * outer, c + ay * outer],
      [c + ax * outer + nx * width, c + ay * outer + ny * width],
      [c + ax * inner + nx * width * 0.7, c + ay * inner + ny * width * 0.7],
    ] as const
    s.eachInPolygon(quad, (x, y) => {
      const along = (x + 0.5 - c) * ax + (y + 0.5 - c) * ay
      const across = (x + 0.5 - c) * nx + (y + 0.5 - c) * ny
      const lattice = Math.round(along) % 6 === 0 || Math.abs(across - width * 0.5) < 0.6
      s.set(x, y, lattice ? P.WOOD[2] : (blade + Math.floor(along / 6)) % 2 ? P.CREAM[4] : P.CREAM[3])
    })
    s.line(c + ax * 5, c + ay * 5, c + ax * (outer + 1), c + ay * (outer + 1), P.WOOD[1])
  }
  s.eachInEllipse(c, c, 7, 7, (x, y, d) => s.set(x, y, d > 0.65 ? P.METAL[2] : d > 0.3 ? P.GLOW[1] : P.GLOW[3]))
  s.outline(P.INK)
  return { raster: s, anchorX: c, anchorY: c }
}

export function paintRingTower(): LandmarkSprite {
  const w = 56
  const h = 176
  const s = new Raster(w, h)
  const cx = w / 2
  const bottom = h - 4
  const bodyTop = 44
  for (let y = bodyTop; y <= bottom; y++) {
    const half = y > bottom - 8 ? 19 : 15
    const row = Math.floor((y - bodyTop) / 5)
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half
      if (Math.abs(u) > 1) continue
      let c = cylinderTone(u, P.STONE, 0.05)
      const joint = (y - bodyTop) % 5 === 0 || (x + (row % 2) * 4) % 8 === 0
      if (joint) c = scale(c, 0.84)
      if (Math.abs(u) > 0.92) c = scale(c, 0.78)
      s.set(x, y, c)
    }
  }
  for (const wy of [bodyTop + 18, bodyTop + 52, bodyTop + 86]) {
    s.rect(cx - 4, wy, 8, 12, P.STONE[5])
    s.rect(cx - 3, wy + 1, 6, 11, P.GLOW[0])
    s.rect(cx - 2, wy + 3, 4, 8, P.GLOW[1])
    s.set(cx - 3, wy + 1, P.STONE[5])
    s.set(cx + 2, wy + 1, P.STONE[5])
    s.hline(cx - 5, cx + 4, wy + 12, P.STONE[5])
  }
  const doorTop = bottom - 24
  s.rect(cx - 7, doorTop, 14, 24, P.WOOD[2])
  for (let x = cx - 7; x < cx + 7; x += 3) s.vline(x, doorTop + 2, bottom, P.WOOD[1])
  for (let k = 0; k < 4; k++) s.hline(cx - 6 + k, cx + 5 - k, doorTop - 1 - k, P.STONE[5])
  s.rect(cx - 10, bottom, 20, 2, P.STONE[4])
  s.rect(cx - 19, bodyTop - 3, 38, 5, P.STONE[4])
  s.hline(cx - 19, cx + 18, bodyTop - 3, P.STONE[5])
  s.hline(cx - 19, cx + 18, bodyTop + 1, P.STONE[1])
  for (let y = 10; y < bodyTop - 3; y++) {
    const t = (y - 10) / (bodyTop - 13)
    const half = 1 + t * 16
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half
      if (Math.abs(u) > 1) continue
      let c = cylinderTone(u, P.ROOF_SLATE, 0.08)
      if ((y - 10) % 5 === 4) c = scale(c, 0.8)
      s.set(x, y, c)
    }
  }
  for (let y = 0; y < 11; y++) {
    const half = y < 5 ? y * 0.6 : (10 - y) * 0.6
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) s.set(x, y, x < cx ? P.GLOW[2] : x === cx ? P.GLOW[3] : P.GLOW[1])
  }
  s.outline(P.INK)
  return {
    raster: s,
    anchorX: cx,
    anchorY: bottom + 1,
    extra: { rings: [bodyTop + 10, 34, 9, bodyTop + 44, 40, 11] },
  }
}

export function paintRuneStone(dim: boolean): LandmarkSprite {
  const s = new Raster(10, 9)
  const ramp = dim ? [P.STONE[0], P.STONE[1], P.STONE[2]] : [P.STONE[2], P.STONE[4], P.STONE[5]]
  s.rect(1, 1, 8, 7, ramp[1])
  s.hline(1, 8, 1, ramp[2])
  s.vline(8, 1, 7, ramp[0])
  s.hline(1, 8, 7, ramp[0])
  s.set(4, 3, dim ? P.GLOW[0] : P.GLOW[2])
  s.set(5, 4, dim ? P.GLOW[0] : P.GLOW[3])
  s.set(4, 5, dim ? P.GLOW[0] : P.GLOW[1])
  s.outline(P.INK)
  return { raster: s, anchorX: 5, anchorY: 4 }
}

function crystalShape(w: number, h: number, ramp: Color[], core: Color): Raster {
  const s = new Raster(w + 2, h + 2)
  const cx = (w + 2) / 2
  const tip = Math.round(h * 0.24)
  for (let y = 1; y <= h; y++) {
    const t = y - 1
    let half: number
    if (t < tip) half = (t / tip) * (w / 2)
    else if (t > h - tip) half = ((h - t) / tip) * (w / 2)
    else half = w / 2
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half) - 1; x++) {
      const u = (x + 0.5 - cx) / Math.max(1, half)
      let c = u < -0.35 ? ramp[3] : u < 0.2 ? ramp[2] : ramp[1]
      if (t < tip && u < 0.2) c = ramp[4]
      if (t > h - tip) c = scale(c, 0.85)
      if (Math.abs(u + 0.35) < 0.08 || Math.abs(u - 0.2) < 0.08) c = ramp[4]
      s.set(x, y, c)
    }
  }
  const coreY = Math.round(h * 0.45)
  for (let k = -3; k <= 3; k++) s.set(Math.round(cx) - 1, coreY + k, mix(core, ramp[4], Math.abs(k) / 4))
  s.set(Math.round(cx) - 2, coreY, core)
  s.outline(P.INK)
  return s
}

export function paintCrystal(): LandmarkSprite {
  const s = crystalShape(24, 48, [P.CRYSTAL[0], P.CRYSTAL[1], P.CRYSTAL[2], P.CRYSTAL[3], P.CRYSTAL[4]], P.GLOW[3])
  return { raster: s, anchorX: s.width / 2, anchorY: s.height / 2 }
}

export function paintShard(): LandmarkSprite {
  const s = crystalShape(8, 16, [P.GLOW[0], P.GLOW[0], P.GLOW[1], P.GLOW[2], P.GLOW[3]], P.WHITE)
  return { raster: s, anchorX: s.width / 2, anchorY: s.height / 2 }
}

export function paintLantern(): LandmarkSprite {
  const s = new Raster(16, 22)
  const cx = 8
  s.rect(cx - 4, 1, 8, 2, P.WOOD[1])
  s.set(cx, 0, P.WOOD[1])
  s.eachInEllipse(cx, 10, 6, 7, (x, y, d) => {
    const u = x + 0.5 - cx
    let c = u < -2 ? P.GOLD[4] : u < 2 ? P.GOLD[3] : P.GOLD[2]
    if (Math.abs(u) < 0.6 || Math.abs(Math.abs(u) - 3.5) < 0.5) c = P.GOLD[1]
    if (d > 0.8) c = scale(c, 0.85)
    s.set(x, y, c)
  })
  s.rect(cx - 3, 17, 6, 2, P.WOOD[1])
  s.vline(cx, 19, 21, P.AWNINGS[0])
  s.outline(P.INK)
  return { raster: s, anchorX: cx, anchorY: 10 }
}

export function paintIsland(variant: number): LandmarkSprite {
  const rng = random(900 + variant)
  const w = variant ? 76 : 92
  const topH = variant ? 26 : 30
  const depth = variant ? 50 : 62
  const s = new Raster(w + 8, topH + depth + 10)
  const cx = (w + 8) / 2
  const topY = 4 + topH / 2
  for (let y = Math.floor(topY); y < topY + depth; y++) {
    const t = (y - topY) / depth
    const half = (w / 2 - 2) * Math.pow(1 - t, 1.25) + (hash2(y, variant, 5) - 0.5) * 3
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, half)
      if (Math.abs(u) > 1) continue
      let c = cylinderTone(u, P.STONE, -t * 0.35)
      if ((y + Math.floor(u * 3)) % 7 === 0) c = scale(c, 0.8)
      if (hash2(x, y, 13 + variant) < 0.05) c = P.STONE[0]
      s.set(x, y, c)
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = Math.round(cx + (rng() - 0.5) * w * 0.7)
    const length = 4 + Math.floor(rng() * 8)
    for (let k = 0; k < length; k++) s.set(x + (k % 3 === 2 ? 1 : 0), Math.round(topY + 6 + k + Math.abs(x - cx) * 0.2), P.WOOD[1])
  }
  s.eachInEllipse(cx, topY, w / 2, topH / 2, (x, y, d) => {
    const n = hash2(x, y, 17 + variant)
    let c = d > 0.8 ? (y > topY ? P.MEADOW[0] : P.MEADOW[3]) : n < 0.3 ? P.MEADOW[1] : n < 0.85 ? P.MEADOW[2] : P.MEADOW[3]
    if (n > 0.985) c = P.FLOWERS[Math.floor(n * 1000) % P.FLOWERS.length]
    s.set(x, y, c)
  })
  const springX = Math.round(cx + w * 0.28)
  s.eachInEllipse(springX - 4, topY + 2, 6, 3, (x, y) => s.set(x, y, P.WATER[4]))
  for (let y = Math.round(topY + 4); y < topY + depth * 0.7; y++) {
    s.set(springX, y, P.WATER[5])
    s.set(springX + 1, y, P.WATER[6])
  }
  const tree = paintTree('oak', variant ? 11 : 13, 70 + variant).raster
  s.draw(tree, Math.round(cx - tree.width / 2 - w * 0.12), Math.round(topY - tree.height + 4))
  for (const [dx, dy] of [
    [-0.3, 0.1],
    [0.15, -0.2],
  ]) {
    const bx = Math.round(cx + dx * w)
    const by = Math.round(topY + dy * topH)
    s.eachInEllipse(bx, by, 4, 3, (x, y, d) => s.set(x, y, d > 0.6 ? P.OAK[1] : P.OAK[4]))
  }
  s.outline(P.INK)
  return { raster: s, anchorX: Math.round(cx), anchorY: Math.round(topY), extra: { springX: springX, springY: Math.round(topY + depth * 0.7) } }
}
