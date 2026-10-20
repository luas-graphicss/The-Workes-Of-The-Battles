import { hash2, random } from '../../lib/city/geometry'
import type { TreeKind } from '../../lib/city/model'
import * as P from './palette'
import { mix, Raster, scale, type Color } from './raster'

type Ramp = Color[]

export type Sprite = { raster: Raster; anchorX: number; anchorY: number }

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47)

function dither(x: number, y: number) {
  return BAYER[(y & 3) * 4 + (x & 3)]
}

type Blob = { x: number; y: number; r: number }

function canopy(s: Raster, blobs: Blob[], ramp: Ramp, seed: number, options: { sparkle?: Color; flowers?: Color[]; rim?: Color } = {}) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const b of blobs) {
    minX = Math.min(minX, b.x - b.r)
    maxX = Math.max(maxX, b.x + b.r)
    minY = Math.min(minY, b.y - b.r)
    maxY = Math.max(maxY, b.y + b.r)
  }
  const inside = (x: number, y: number) => blobs.some((b) => (x + 0.5 - b.x) ** 2 + (y + 0.5 - b.y) ** 2 <= b.r * b.r)
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      let best = -1
      let light = 0
      for (const b of blobs) {
        const nx = (x + 0.5 - b.x) / b.r
        const ny = (y + 0.5 - b.y) / b.r
        const d = nx * nx + ny * ny
        if (d > 1) continue
        const nz = Math.sqrt(1 - d)
        const height = nz * b.r + b.y * -0.02
        if (height > best) {
          best = height
          light = -0.5 * nx - 0.62 * ny + 0.55 * nz
        }
      }
      if (best < 0) continue
      const cluster = hash2(x >> 1, y >> 1, seed) - 0.5
      let value = light * 0.95 + cluster * 0.22 + dither(x, y) * 0.16
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
      const index = Math.max(0, Math.min(ramp.length - 1, Math.round(value * (ramp.length - 1) + 0.6)))
      let c = ramp[index]
      if (edge) c = options.rim ?? ramp[0]
      else if (index <= 1 && hash2(x, y, seed + 1) < 0.12) c = ramp[0]
      s.set(x, y, c)
      value = 0
    }
  }
  const rng = random(seed + 7)
  for (const b of blobs) {
    const count = Math.round(b.r * 0.9)
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * (1.05 + rng() * 0.75)
      const distance = b.r * (0.25 + rng() * 0.55)
      const x = Math.round(b.x + Math.cos(angle) * distance)
      const y = Math.round(b.y + Math.sin(angle) * distance)
      if (!inside(x, y) || !inside(x + 1, y + 1)) continue
      const c = ramp[ramp.length - 1]
      s.set(x, y, c)
      s.set(x + 1, y, mix(c, ramp[ramp.length - 2], 0.5))
      s.set(x, y + 1, ramp[ramp.length - 2])
    }
  }
  if (options.flowers) {
    for (let i = 0; i < blobs.length * 5; i++) {
      const b = blobs[i % blobs.length]
      const x = Math.round(b.x + (rng() - 0.5) * b.r * 1.5)
      const y = Math.round(b.y + (rng() - 0.6) * b.r * 1.4)
      if (inside(x, y) && inside(x - 1, y) && inside(x + 1, y)) s.set(x, y, options.flowers[i % options.flowers.length])
    }
  }
  if (options.sparkle) {
    for (let i = 0; i < blobs.length * 4; i++) {
      const b = blobs[i % blobs.length]
      const x = Math.round(b.x + (rng() - 0.5) * b.r * 1.4)
      const y = Math.round(b.y + (rng() - 0.5) * b.r * 1.4)
      if (!inside(x, y) || !inside(x + 1, y) || !inside(x, y + 1)) continue
      s.set(x, y, options.sparkle)
      s.set(x + 1, y, mix(options.sparkle, ramp[3], 0.4))
      s.set(x, y + 1, mix(options.sparkle, ramp[3], 0.4))
    }
  }
}

function trunk(s: Raster, cx: number, top: number, bottom: number, width: number, bark: Ramp, seed: number) {
  const x0 = Math.round(cx - width / 2)
  for (let y = top; y <= bottom; y++) {
    const flare = y > bottom - 2 ? 1 : 0
    for (let x = x0 - flare; x < x0 + width + flare; x++) {
      const u = (x - x0) / Math.max(1, width - 1)
      let c = u < 0.25 ? bark[3] : u > 0.72 ? bark[0] : bark[2]
      if (hash2(x, y >> 1, seed) < 0.15) c = bark[1]
      s.set(x, y, c)
    }
  }
  for (let x = x0; x < x0 + width; x++) {
    s.shadow(x, top, 0.6)
    s.shadow(x, top + 1, 0.45)
    s.shadow(x, top + 2, 0.25)
  }
}

export function paintTree(kind: TreeKind, size: number, seed: number): Sprite {
  switch (kind) {
    case 'pine':
      return pine(size, seed, P.CONIFER)
    case 'birch':
      return birch(size, seed)
    case 'blossom':
      return roundTree(size, seed, P.BLOSSOM, { flowers: [P.WHITE, P.BLOSSOM[4]] })
    case 'lume':
      return roundTree(size, seed, P.LUME, { sparkle: P.GLOW[3], bark: [rgbDark(P.ROOF_PLUM[0]), P.ROOF_PLUM[1], P.ROOF_PLUM[2], P.ROOF_PLUM[3]] })
    case 'bush':
      return bush(size, seed)
    default:
      return roundTree(size, seed, P.OAK, {})
  }
}

function rgbDark(c: Color) {
  return scale(c, 0.8)
}

function roundTree(size: number, seed: number, ramp: Ramp, options: { flowers?: Color[]; sparkle?: Color; bark?: Ramp }): Sprite {
  const rng = random(seed)
  const r = size
  const trunkH = Math.round(r * 0.55) + 4
  const w = Math.ceil(r * 2.6) + 4
  const h = Math.ceil(r * 2.3 + trunkH) + 4
  const s = new Raster(w, h)
  const cx = w / 2
  const cy = r * 1.15 + 2
  const baseY = h - 3
  trunk(s, cx, Math.round(cy + r * 0.5), baseY, Math.max(4, Math.round(r * 0.32)), options.bark ?? P.TRUNK, seed)
  const blobs: Blob[] = [{ x: cx, y: cy, r: r * 0.82 }]
  const lumps = 5 + Math.floor(rng() * 3)
  for (let i = 0; i < lumps; i++) {
    const angle = Math.PI * (0.85 + (i / (lumps - 1)) * 1.3) + (rng() - 0.5) * 0.3
    const distance = r * (0.45 + rng() * 0.18)
    blobs.push({ x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance * 0.85, r: r * (0.42 + rng() * 0.14) })
  }
  blobs.push({ x: cx - r * 0.45, y: cy + r * 0.38, r: r * 0.46 })
  blobs.push({ x: cx + r * 0.45, y: cy + r * 0.4, r: r * 0.46 })
  canopy(s, blobs, ramp, seed, { flowers: options.flowers, sparkle: options.sparkle })
  return { raster: s, anchorX: Math.floor(cx), anchorY: baseY }
}

function birch(size: number, seed: number): Sprite {
  const rng = random(seed)
  const r = size
  const trunkH = Math.round(r * 1.1) + 4
  const w = Math.ceil(r * 2.2) + 4
  const h = Math.ceil(r * 2.4 + trunkH) + 4
  const s = new Raster(w, h)
  const cx = w / 2
  const cy = r * 1.2 + 2
  const baseY = h - 3
  const tw = Math.max(3, Math.round(r * 0.22))
  const x0 = Math.round(cx - tw / 2)
  for (let y = Math.round(cy); y <= baseY; y++) {
    for (let x = x0; x < x0 + tw; x++) {
      const u = (x - x0) / Math.max(1, tw - 1)
      let c = u > 0.66 ? P.BIRCH_BARK[1] : P.BIRCH_BARK[2]
      if (hash2(x, y >> 1, seed) < 0.18) c = P.INK_SOFT
      s.set(x, y, c)
    }
  }
  const blobs: Blob[] = [{ x: cx, y: cy, r: r * 0.7 }]
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI * (0.9 + i * 0.3) + (rng() - 0.5) * 0.3
    blobs.push({ x: cx + Math.cos(angle) * r * 0.5, y: cy + Math.sin(angle) * r * 0.65, r: r * (0.38 + rng() * 0.12) })
  }
  blobs.push({ x: cx, y: cy + r * 0.55, r: r * 0.42 })
  canopy(s, blobs, P.BIRCH, seed)
  return { raster: s, anchorX: Math.floor(cx), anchorY: baseY }
}

function pine(size: number, seed: number, ramp: Ramp): Sprite {
  const rng = random(seed)
  const r = size
  const height = Math.round(r * 2.9)
  const w = Math.ceil(r * 2.2) + 4
  const h = height + Math.round(r * 0.5) + 6
  const s = new Raster(w, h)
  const cx = w / 2
  const top = 2
  const baseY = h - 3
  const tiers = 4
  trunk(s, cx, top + height - 4, baseY, Math.max(3, Math.round(r * 0.25)), P.TRUNK, seed)
  for (let t = 0; t < tiers; t++) {
    const tierTop = top + Math.round((t * height) / (tiers + 1.2))
    const tierBottom = top + Math.round(((t + 1.9) * height) / (tiers + 1.2))
    const halfWidth = r * (0.45 + (t / (tiers - 1)) * 0.58)
    for (let y = tierTop; y <= tierBottom; y++) {
      const v = (y - tierTop) / Math.max(1, tierBottom - tierTop)
      const jag = (hash2(y, t, seed) - 0.5) * 2.4
      const half = Math.max(1, halfWidth * Math.pow(v, 0.85) + (v > 0.85 ? jag : 0))
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const u = (x + 0.5 - cx) / half
        if (Math.abs(u) > 1) continue
        const light = 0.55 - u * 0.5 - v * 0.25 + (hash2(x >> 1, y, seed + t) - 0.5) * 0.25 + dither(x, y) * 0.18
        let c = ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(light * (ramp.length - 1) + 0.8)))]
        if (Math.abs(u) > 0.9 || y === tierBottom) c = ramp[0]
        s.set(x, y, c)
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = Math.round(cx - halfWidth * (0.2 + rng() * 0.5))
      const y = tierTop + Math.round((tierBottom - tierTop) * (0.5 + rng() * 0.35))
      s.set(x, y, ramp[ramp.length - 1])
    }
  }
  return { raster: s, anchorX: Math.floor(cx), anchorY: baseY }
}

function bush(size: number, seed: number): Sprite {
  const rng = random(seed)
  const r = size
  const w = Math.ceil(r * 2.8) + 4
  const h = Math.ceil(r * 1.9) + 4
  const s = new Raster(w, h)
  const cx = w / 2
  const cy = h - r * 0.9 - 2
  const blobs: Blob[] = [
    { x: cx, y: cy, r: r * 0.85 },
    { x: cx - r * 0.7, y: cy + r * 0.15, r: r * 0.62 },
    { x: cx + r * 0.7, y: cy + r * 0.18, r: r * 0.6 },
    { x: cx + (rng() - 0.5) * r * 0.4, y: cy - r * 0.45, r: r * 0.55 },
  ]
  canopy(s, blobs, P.OAK, seed, { flowers: rng() < 0.5 ? [P.FLOWERS[Math.floor(rng() * P.FLOWERS.length)]] : undefined })
  return { raster: s, anchorX: Math.floor(cx), anchorY: h - 2 }
}

export function treeShadow(map: Raster, x: number, y: number, kind: TreeKind, size: number) {
  const r = kind === 'bush' ? size * 1.2 : kind === 'pine' ? size * 0.9 : size
  map.eachInEllipse(x + r * 0.35, y - r * 0.05, r * 1.05, r * 0.42, (px, py, d) => map.shadow(px, py, d > 0.7 ? 0.28 : 0.45))
}

export function paintLamp(seed: number): Sprite {
  const w = 13
  const h = 46
  const s = new Raster(w, h)
  const cx = 6
  const baseY = h - 2
  s.rect(cx - 3, baseY - 3, 7, 4, P.STONE[3])
  s.hline(cx - 3, cx + 3, baseY - 3, P.STONE[5])
  s.vline(cx + 3, baseY - 3, baseY, P.STONE[1])
  s.rect(cx - 1, 13, 3, baseY - 16, P.METAL[1])
  s.vline(cx - 1, 13, baseY - 4, P.METAL[3])
  s.rect(cx - 2, 26, 5, 2, P.METAL[2])
  s.rect(cx - 4, 3, 9, 11, P.METAL[1])
  s.rect(cx - 3, 4, 7, 9, P.GLASS[3])
  s.rect(cx - 2, 5, 5, 7, P.GLOW[1])
  s.rect(cx - 1, 6, 3, 5, P.GLOW[2])
  s.set(cx, 7, P.GLOW[3])
  s.set(cx, 8, P.GLOW[3])
  s.vline(cx - 4, 3, 13, P.METAL[2])
  s.hline(cx - 5, cx + 5, 2, P.METAL[2])
  s.hline(cx - 3, cx + 3, 1, P.METAL[3])
  s.set(cx, 0, P.GOLD[3])
  s.hline(cx - 4, cx + 4, 14, P.METAL[2])
  void seed
  s.outline(P.INK)
  return { raster: s, anchorX: cx + 1, anchorY: baseY + 1 }
}

export function paintTreeSprite(kind: TreeKind, size: number, seed: number): Sprite {
  const sprite = paintTree(kind, size, seed)
  sprite.raster.outline(kind === 'lume' ? P.LUME[0] : P.INK)
  return { raster: sprite.raster, anchorX: sprite.anchorX + 0, anchorY: sprite.anchorY }
}
