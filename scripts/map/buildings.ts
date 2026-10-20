import { hash2, random } from '../../lib/city/geometry'
import { PLINTH, roofDepth, STORY, type Building } from '../../lib/city/model'
import * as P from './palette'
import { mix, Raster, scale, type Color } from './raster'

type Ramp = Color[]

const EAVE = 3

const ROOFS: Record<NonNullable<Building['roof']>, Ramp> = {
  teal: P.ROOF_TEAL,
  slate: P.ROOF_SLATE,
  terracotta: P.ROOF_TERRACOTTA,
  plum: P.ROOF_PLUM,
  ochre: P.ROOF_OCHRE,
  moss: P.ROOF_MOSS,
}

const WALLS: Record<NonNullable<Building['wall']>, Ramp> = {
  plaster: P.PLASTER,
  cream: P.CREAM,
  sage: P.SAGE,
  stone: P.STONE,
  wood: P.WOOD,
}

type Frame = {
  s: Raster
  rng: () => number
  seed: number
  left: number
  top: number
  width: number
  height: number
  roofH: number
  wallTop: number
  wallBottom: number
  wallX0: number
  wallX1: number
  floors: number
  wall: Ramp
  roof: Ramp
  accent: Color
}

export function paintBuilding(building: Building): Raster {
  const width = building.w / 4
  const height = building.h / 4
  const s = new Raster(width + 2, height + 2)
  const roofH = roofDepth(building) / 4
  const frame: Frame = {
    s,
    rng: random(building.seed),
    seed: building.seed,
    left: 1,
    top: 1,
    width,
    height,
    roofH,
    wallTop: 1 + roofH,
    wallBottom: height,
    wallX0: 1 + EAVE,
    wallX1: width - EAVE,
    floors: building.floors,
    wall: WALLS[building.wall ?? 'plaster'],
    roof: ROOFS[building.roof ?? 'teal'],
    accent: P.AWNINGS[building.accent ?? 0],
  }
  STYLES[building.style](frame, building)
  s.outline(P.INK)
  return s
}

const STYLES: Record<Building['style'], (f: Frame, b: Building) => void> = {
  cottage(f, b) {
    wall(f, 'plaster', b.timber, false)
    frontGable(f)
    facade(f, b, { window: 'grid', shutters: f.rng() < 0.6, boxes: true })
    door(f, b, { kind: 'arch', lamp: 'left' })
    chimney(f, Math.round(f.width * (f.rng() < 0.5 ? 0.22 : 0.72)), true)
  },
  townhouse(f, b) {
    wall(f, 'plaster', b.timber)
    gableRoof(f, { dormers: f.width > 110 ? 2 : 1, chimney: true })
    facade(f, b, { window: 'tall', shutters: true, boxes: true, balcony: f.floors > 1 })
    door(f, b, { kind: 'transom', lamp: 'right' })
  },
  shell(f, b) {
    wall(f, 'plaster')
    roundCorners(f)
    vaultRoof(f)
    facade(f, b, { window: 'round', boxes: false, wide: true })
    door(f, b, { kind: 'round', lamp: 'both' })
    planters(f, b)
  },
  garden(f, b) {
    wall(f, 'wood')
    gardenRoof(f)
    facade(f, b, { window: 'panel', boxes: false })
    door(f, b, { kind: 'glass', lamp: 'left' })
    planters(f, b)
  },
  tower(f, b) {
    wall(f, 'plaster')
    if (b.roofKind === 'dome') domeRoof(f)
    else gardenRoof(f)
    facade(f, b, { window: 'panel', boxes: false, terraces: true })
    door(f, b, { kind: 'glass', lamp: 'both' })
  },
  stone(f, b) {
    wall(f, 'stone')
    gableRoof(f, { dormers: 0, chimney: true, steep: true })
    facade(f, b, { window: 'small', shutters: f.rng() < 0.5, boxes: f.rng() < 0.6, glow: true })
    door(f, b, { kind: 'plank', lamp: 'left' })
    ivy(f)
  },
  shop(f, b) {
    wall(f, 'plaster')
    if (b.roofKind === 'flat') gardenRoof(f)
    else gableRoof(f, { dormers: 1, chimney: f.rng() < 0.5 })
    facade(f, b, { window: 'tall', shutters: false, boxes: true, shopFront: true })
    door(f, b, { kind: 'glass', lamp: 'none' })
    awning(f, b)
    sign(f, b)
  },
  workshop(f, b) {
    wall(f, 'stone')
    gableRoof(f, { dormers: 0, chimney: true })
    facade(f, b, { window: 'small', shutters: true, boxes: false, glow: true })
    door(f, b, { kind: 'barn', lamp: 'right' })
    sign(f, b)
  },
  civic(f, b) {
    civicHall(f, b)
  },
  academy(f, b) {
    academyHall(f, b)
  },
  barn(f, b) {
    wall(f, 'wood')
    gableRoof(f, { dormers: 0, chimney: false })
    facade(f, b, { window: 'small', shutters: false, boxes: false })
    door(f, b, { kind: 'barn', lamp: 'none' })
  },
  greenhouse(f) {
    greenhouse(f)
  },
  pavilion(f) {
    pavilion(f)
  },
  factory(f, b) {
    wall(f, 'stone')
    industrialRoof(f)
    facade(f, b, { window: 'panel', boxes: false, glow: true })
    door(f, b, { kind: 'barn', lamp: 'both' })
    hazardPlinth(f, b)
    gearSign(f, b)
  },
  robotshop(f, b) {
    wall(f, 'plaster')
    gableRoof(f, { dormers: 1, chimney: false })
    facade(f, b, { window: 'tall', shutters: false, boxes: true, shopFront: true })
    door(f, b, { kind: 'glass', lamp: 'none' })
    awning(f, b)
    neonRobot(f, b)
  },
  league(f, b) {
    wall(f, 'stone')
    soot(f)
    industrialRoof(f)
    facade(f, b, { window: 'panel', boxes: false, glow: true })
    door(f, b, { kind: 'barn', lamp: 'both' })
    hazardPlinth(f, b)
    leagueMarquee(f, b)
  },
}

function soot(f: Frame) {
  const { s, wallTop, wallBottom, wallX0, wallX1, seed } = f
  for (let y = wallTop; y <= wallBottom; y++) {
    for (let x = wallX0; x <= wallX1; x++) {
      const streak = hash2(x >> 2, 0, seed + 77) < 0.3 ? 0.08 : 0
      s.shadow(x, y, 0.22 + streak + 0.1 * ((y - wallTop) / Math.max(1, wallBottom - wallTop)))
    }
  }
}

const NEON_FONT: Record<string, string[]> = {
  L: ['1000', '1000', '1000', '1000', '1111'],
  I: ['111', '010', '010', '010', '111'],
  G: ['0111', '1000', '1011', '1001', '0111'],
  A: ['0110', '1001', '1111', '1001', '1001'],
}

function leagueMarquee(f: Frame, b: Building) {
  const { s, wallBottom } = f
  const cx = doorCentre(f, b)
  const boardW = 46
  const boardH = 16
  const x0 = cx - Math.floor(boardW / 2)
  const y0 = wallBottom - PLINTH - 62
  s.eachInEllipse(cx, y0 + boardH / 2, boardW * 0.9, boardH * 1.4, (x, y, d) => s.blend(x, y, P.CRYSTAL[2], 0.26 * (1 - d)))
  s.rect(x0 - 1, y0 - 1, boardW + 2, boardH + 2, P.METAL[0])
  s.rect(x0, y0, boardW, boardH, P.INK)
  s.hline(x0, x0 + boardW - 1, y0, P.CRYSTAL[2])
  s.hline(x0, x0 + boardW - 1, y0 + boardH - 1, P.CRYSTAL[1])
  s.vline(x0, y0, y0 + boardH - 1, P.CRYSTAL[2])
  s.vline(x0 + boardW - 1, y0, y0 + boardH - 1, P.CRYSTAL[1])
  s.set(x0, y0, P.CRYSTAL[4])
  s.set(x0 + boardW - 1, y0 + boardH - 1, P.CRYSTAL[0])
  const word = 'LIGA'
  const scaleUp = 2
  let penX = x0 + 5
  const penY = y0 + 3
  for (const letter of word) {
    const glyph = NEON_FONT[letter]
    glyph.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] !== '1') continue
        for (let dy = 0; dy < scaleUp; dy++) {
          for (let dx = 0; dx < scaleUp; dx++) {
            const edge = dy === scaleUp - 1 || dx === scaleUp - 1
            s.set(penX + rx * scaleUp + dx, penY + ry * scaleUp + dy, edge ? P.GLOW[1] : P.GLOW[2])
          }
        }
      }
    })
    penX += (glyph[0].length + 1) * scaleUp
  }
  s.set(x0 + 5, penY, P.GLOW[3])

  for (const bx of [x0 + 4, x0 + boardW - 5]) {
    s.vline(bx, y0 + boardH, y0 + boardH + 3, P.GOLD[1])
    s.set(bx, y0 + boardH + 4, P.GOLD[2])
  }
  const ey = y0 + boardH + 7
  s.eachInEllipse(cx, ey, 5, 3, (x, y, d) => s.set(x, y, d > 0.6 ? P.GOLD[2] : P.INK))
  s.set(cx - 1, ey, P.CRYSTAL[3])
  s.set(cx + 1, ey, P.CRYSTAL[3])
}

function industrialRoof(f: Frame) {
  const { s, left, top, width, roofH, seed, accent } = f
  const bottom = top + roofH + 1
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x < left + width; x++) {
      const t = (y - top) / (bottom - top)
      const sheet = (x - left) % 3
      let c = sheet === 0 ? P.METAL[3] : P.METAL[2]
      if (t > 0.8) c = scale(c, 0.82)
      if (hash2(x >> 3, y >> 3, seed + 121) < 0.08) c = mix(c, P.ROOF_TERRACOTTA[2], 0.4)
      s.set(x, y, c)
    }
  }
  s.hline(left, left + width - 1, top, P.METAL[4])
  s.hline(left, left + width - 1, bottom, P.METAL[0])
  for (let y = top; y <= bottom; y++) {
    s.set(left, y, mix(s.get(left, y), P.WHITE, 0.2))
    s.set(left + width - 1, y, P.METAL[0])
  }
  for (let x = left + 1; x < left + width - 1; x++) s.set(x, bottom - 1, Math.floor((x - left) / 4) % 2 ? accent : P.INK_SOFT)
  const rows = Math.max(1, Math.floor((roofH - 24) / 15))
  const stackX = left + width - 22
  for (let r = 0; r < rows; r++) {
    const y = top + 7 + r * 15
    for (let x = left + 7; x < stackX - 12; x++) {
      const rib = (x - left) % 10 === 0
      for (let k = 0; k < 8; k++) {
        const c = k === 0 ? P.METAL[4] : k < 3 ? P.GLASS[4] : k < 6 ? P.GLASS[2] : k === 6 ? P.GLASS[1] : P.METAL[1]
        s.set(x, y + k, rib ? P.METAL[1] : c)
      }
      if (!rib && (x + y) % 13 < 2) s.set(x, y + 1, P.GLASS[5])
    }
    for (let x = left + 7; x < stackX - 12; x++) s.shadow(x, y + 8, 0.3)
  }
  for (const vx of [stackX - 8, stackX + 8]) {
    s.eachInEllipse(vx + 1, bottom - 7, 3, 2, (x, y) => s.shadow(x, y, 0.35))
    s.rect(vx - 2, bottom - 12, 5, 6, P.METAL[2])
    s.hline(vx - 2, vx + 2, bottom - 12, P.METAL[4])
    s.hline(vx - 2, vx + 2, bottom - 9, P.METAL[1])
    s.vline(vx + 2, bottom - 12, bottom - 7, P.METAL[1])
  }
  smokestack(f, stackX, top + 12, bottom - 2)
}

function smokestack(f: Frame, cx: number, mouthY: number, baseY: number) {
  const { s } = f
  const half = 4
  s.eachInEllipse(cx + 5, baseY, half + 3, 2, (x, y) => s.shadow(x, y, 0.4))
  for (let y = mouthY; y <= baseY; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const d = (x - cx) / half
      const shade = d < -0.6 ? P.METAL[4] : d < 0.2 ? P.METAL[3] : d < 0.7 ? P.METAL[2] : P.METAL[1]
      s.set(x, y, shade)
    }
  }
  for (const y of [mouthY + 4, mouthY + Math.round((baseY - mouthY) * 0.55)]) {
    s.hline(cx - half - 1, cx + half + 1, y, P.GOLD[1])
    s.hline(cx - half - 1, cx + half + 1, y + 1, P.GOLD[2])
  }
  s.rect(cx - half - 1, mouthY - 2, half * 2 + 3, 3, P.METAL[1])
  s.hline(cx - half - 1, cx + half + 1, mouthY - 2, P.METAL[4])
  s.hline(cx - half, cx + half, mouthY - 1, P.INK)
  s.set(cx, mouthY - 1, P.ROOF_TERRACOTTA[3])
  s.set(cx - 1, mouthY - 1, P.ROOF_TERRACOTTA[2])
}

function hazardPlinth(f: Frame, b: Building) {
  const { s, wallX0, wallX1, wallBottom, accent } = f
  const doorX = doorCentre(f, b)
  for (let x = wallX0 + 1; x < wallX1; x++) {
    if (Math.abs(x - doorX) < 18) continue
    s.set(x, wallBottom - PLINTH, Math.floor(x / 4) % 2 ? accent : P.INK_SOFT)
  }
}

function gearSign(f: Frame, b: Building) {
  const { s, wallBottom } = f
  const cx = doorCentre(f, b)
  const cy = wallBottom - PLINTH - 44
  s.rect(cx - 9, cy - 9, 19, 19, P.METAL[0])
  s.rect(cx - 8, cy - 8, 17, 17, P.METAL[2])
  s.hline(cx - 8, cx + 8, cy - 8, P.METAL[3])
  s.vline(cx - 8, cy - 8, cy + 8, P.METAL[3])
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * Math.PI * 2
    s.rect(cx + Math.round(Math.cos(angle) * 6) - 1, cy + Math.round(Math.sin(angle) * 6) - 1, 3, 3, P.GOLD[1])
  }
  s.eachInEllipse(cx, cy, 5.5, 5.5, (x, y, d) => s.set(x, y, d > 0.7 ? P.GOLD[2] : d > 0.4 ? P.GOLD[3] : P.METAL[1]))
  s.set(cx, cy, P.GLOW[2])
  s.set(cx - 2, cy - 2, P.GOLD[4])
}

function neonRobot(f: Frame, b: Building) {
  const { s, wallBottom } = f
  const cx = doorCentre(f, b)
  const y = wallBottom - PLINTH - 52
  s.eachInEllipse(cx, y + 4, 12, 8, (x, yy, d) => s.blend(x, yy, P.GLOW[1], 0.22 * (1 - d)))
  const head = ['0111110', '1000001', '1011101', '1000001', '1010101', '1000001', '0111110']
  head.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== '1') continue
      const edge = ry === 0 || ry === head.length - 1 || rx === 0 || rx === row.length - 1
      s.set(cx - 3 + rx, y + ry, edge ? P.GLOW[1] : P.GLOW[2])
    }
  })
  s.set(cx - 1, y + 2, P.GLOW[3])
  s.set(cx + 1, y + 2, P.GLOW[3])
  s.vline(cx, y - 3, y - 1, P.GLOW[1])
  s.set(cx, y - 4, P.GLOW[3])
  s.hline(cx - 5, cx + 5, y + 8, P.METAL[1])
  s.set(cx - 5, y + 9, P.METAL[1])
  s.set(cx + 5, y + 9, P.METAL[1])
}

function wall(f: Frame, kind: 'plaster' | 'stone' | 'wood', timber = false, eaveShadow = true) {
  const { s, wall: ramp, wallTop, wallBottom, wallX0, wallX1, seed } = f
  const material = kind === 'wood' ? P.WOOD : ramp
  for (let y = wallTop; y <= wallBottom; y++) {
    for (let x = wallX0; x <= wallX1; x++) {
      let c = material[3]
      const n = hash2(x, y, seed)
      if (kind === 'plaster') {
        c = n < 0.05 ? material[2] : n > 0.97 ? material[4] : material[3]
      } else if (kind === 'stone') {
        const row = Math.floor((y - wallTop) / 5)
        const offset = row % 2 ? 4 : 0
        const course = (y - wallTop) % 5
        const brick = Math.floor((x - wallX0 + offset + (row * 7) % 3) / 8)
        const joint = course === 4 || (x - wallX0 + offset + (row * 7) % 3) % 8 === 0
        const tint = hash2(brick, row, seed + 3)
        c = joint ? material[1] : tint < 0.3 ? material[2] : tint > 0.8 ? material[4] : material[3]
        if (!joint && course === 0) c = mix(c, material[5], 0.5)
      } else {
        const plank = x - wallX0
        const gap = plank % 5 === 0
        const tint = hash2(Math.floor(plank / 5), 0, seed + 5)
        c = gap ? material[1] : tint < 0.35 ? material[2] : tint > 0.75 ? material[4] : material[3]
        if (!gap && hash2(x, y, seed + 9) < 0.03) c = material[2]
      }
      s.set(x, y, c)
    }
  }
  for (let y = wallTop; y <= wallBottom; y++) {
    s.set(wallX0, y, mix(s.get(wallX0, y), P.WHITE, 0.25))
    s.set(wallX1, y, scale(s.get(wallX1, y), 0.78))
    s.set(wallX1 - 1, y, scale(s.get(wallX1 - 1, y), 0.9))
  }
  if (timber) {
    const beam = P.WOOD[1]
    for (let y = wallTop; y <= wallBottom - PLINTH; y++) {
      s.set(wallX0 + 1, y, beam)
      s.set(wallX0 + 2, y, beam)
      s.set(wallX1 - 1, y, beam)
      s.set(wallX1 - 2, y, beam)
    }
    for (let floor = 1; floor < f.floors; floor++) {
      const y = wallBottom - PLINTH - floor * STORY
      s.rect(wallX0, y, wallX1 - wallX0 + 1, 2, beam)
      s.rect(wallX0, y + 2, wallX1 - wallX0 + 1, 1, scale(f.wall[2], 0.9))
    }
  }
  for (let y = wallBottom - PLINTH + 1; y <= wallBottom; y++) {
    for (let x = wallX0; x <= wallX1; x++) {
      const joint = (x - wallX0 + (y % 2) * 3) % 7 === 0 || y === wallBottom - PLINTH + 1
      s.set(x, y, joint ? P.STONE[1] : y === wallBottom ? P.STONE[2] : P.STONE[3])
    }
  }
  s.hline(wallX0, wallX1, wallBottom - PLINTH, mix(f.wall[1], P.STONE[4], 0.3))
  if (!eaveShadow) return
  const falloff = [0.55, 0.5, 0.45, 0.42, 0.26, 0.12]
  for (let k = 0; k < falloff.length; k++) for (let x = wallX0; x <= wallX1; x++) s.shadow(x, wallTop + k, falloff[k])
}

function roundCorners(f: Frame) {
  const { s, wallTop, wallBottom, wallX0, wallX1 } = f
  for (let y = wallTop; y <= wallBottom; y++) {
    s.set(wallX0, y, mix(s.get(wallX0 + 2, y), P.WHITE, 0.35))
    s.set(wallX0 + 1, y, mix(s.get(wallX0 + 2, y), P.WHITE, 0.2))
    s.set(wallX1 - 2, y, scale(s.get(wallX1 - 3, y), 0.9))
    s.set(wallX1 - 1, y, scale(s.get(wallX1 - 3, y), 0.8))
    s.set(wallX1, y, scale(s.get(wallX1 - 3, y), 0.7))
  }
}

type FacadeOptions = {
  window: 'grid' | 'tall' | 'round' | 'panel' | 'small'
  shutters?: boolean
  boxes?: boolean
  balcony?: boolean
  wide?: boolean
  glow?: boolean
  shopFront?: boolean
  terraces?: boolean
}

function doorCentre(f: Frame, b: Building) {
  return 1 + Math.round((b.door ?? b.w / 2) / 4)
}

function facade(f: Frame, b: Building, options: FacadeOptions) {
  const { wallX0, wallX1, wallBottom, floors } = f
  const doorX = doorCentre(f, b)
  const spacing = options.window === 'panel' ? 31 : options.window === 'small' ? 26 : 29
  const inner = wallX1 - wallX0 + 1 - 16
  const count = Math.max(1, Math.floor(inner / spacing) + 1)
  const start = Math.round((wallX0 + wallX1) / 2 - ((count - 1) * spacing) / 2)
  const slots = Array.from({ length: count }, (_, i) => start + i * spacing)
  for (let floor = 0; floor < floors; floor++) {
    const floorBottom = wallBottom - PLINTH - floor * STORY
    const floorTop = floorBottom - STORY + 1
    if (options.terraces && floor > 0) terrace(f, floorBottom + 1, floor)
    if (options.balcony && floor === 1) balcony(f, floorBottom + 1, doorX)
    for (const x of slots) {
      const nearDoor = Math.abs(x - doorX) < 21
      if (floor === 0 && nearDoor) continue
      if (floor === 0 && options.shopFront) continue
      const kind = options.window
      const glow = options.glow && hash2(x, floor, f.seed + 17) < 0.35
      if (kind === 'round') {
        if (options.wide && floor === 0 && slots.length > 2 && x === slots[slots.length - 1] && !nearDoor) {
          windowPanel(f, x - 11, floorTop + 12, 22, 19, false)
        } else {
          windowRound(f, x, floorTop + 20, 7)
        }
      } else if (kind === 'panel') {
        windowPanel(f, x - 10, floorTop + 9, 20, 25, hash2(x, floor, f.seed) < 0.2)
      } else if (kind === 'small') {
        windowGrid(f, x - 6, floorTop + 14, 12, 15, { shutters: options.shutters, box: options.boxes, glow, arch: false })
      } else if (kind === 'tall') {
        windowGrid(f, x - 7, floorTop + 10, 14, 22, { shutters: options.shutters, box: options.boxes && floor > 0, glow, arch: true })
      } else {
        windowGrid(f, x - 7, floorTop + 12, 14, 17, { shutters: options.shutters, box: options.boxes, glow, arch: false })
      }
    }
  }
  if (options.shopFront) shopFront(f, doorX)
}

function windowGrid(
  f: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
  options: { shutters?: boolean; box?: boolean; glow?: boolean; arch?: boolean },
) {
  const { s } = f
  const trim = P.PLASTER[4]
  const trimShade = P.PLASTER[1]
  s.rect(x - 1, y - 1, w + 2, h + 2, trim)
  s.vline(x + w, y - 1, y + h, trimShade)
  const glass = options.glow ? [mix(P.GOLD[1], P.GLASS[1], 0.4), P.GOLD[2], P.GOLD[3], P.GOLD[4]] : [P.GLASS[1], P.GLASS[2], P.GLASS[3], P.GLASS[5]]
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      let c = yy < h * 0.35 ? glass[1] : glass[0]
      if ((xx + yy) % 9 === 3 || (xx + yy) % 9 === 4) c = glass[2]
      if (options.glow && yy > h * 0.4) c = mix(c, glass[3], 0.35)
      s.set(x + xx, y + yy, c)
    }
  }
  s.set(x + 1, y + 1, glass[3])
  s.set(x + 2, y + 1, glass[3])
  s.set(x + 1, y + 2, glass[3])
  if (options.arch) {
    s.set(x, y, trim)
    s.set(x + w - 1, y, trim)
    s.set(x, y + 1, trim)
    s.set(x + w - 1, y + 1, trim)
    s.set(x + 1, y, trim)
    s.set(x + w - 2, y, trim)
    s.hline(x, x + w - 1, y - 2, trim)
    s.hline(x + 2, x + w - 3, y - 3, trim)
  }
  const mid = x + Math.floor(w / 2)
  s.vline(mid, y, y + h - 1, trim)
  s.hline(x, x + w - 1, y + Math.round(h * 0.45), trim)
  s.rect(x - 2, y + h + 1, w + 4, 1, P.PLASTER[4])
  s.rect(x - 2, y + h + 2, w + 4, 1, scale(f.wall[1], 0.85))
  if (options.shutters) {
    const shutter = f.accent
    for (const sx of [x - 5, x + w + 1]) {
      s.rect(sx, y - 1, 4, h + 2, shutter)
      for (let yy = y; yy < y + h; yy += 2) s.hline(sx, sx + 3, yy, scale(shutter, 0.72))
      s.vline(sx + 3, y - 1, y + h, scale(shutter, 0.6))
    }
  }
  if (options.box) flowerBox(f, x - 1, y + h + 2, w + 2)
}

function windowRound(f: Frame, cx: number, cy: number, r: number) {
  const { s } = f
  s.eachInEllipse(cx, cy, r + 1.5, r + 1.5, (x, y) => s.set(x, y, P.PLASTER[4]))
  s.eachInEllipse(cx, cy, r, r, (x, y, d) => {
    const lit = x - cx + (y - cy) < -r * 0.6
    s.set(x, y, lit ? P.GLASS[4] : d > 0.55 ? P.GLASS[1] : P.GLASS[2])
  })
  s.vline(cx, cy - r, cy + r - 1, P.PLASTER[3])
  s.hline(cx - r, cx + r - 1, cy, P.PLASTER[3])
  s.set(cx - 2, cy - 3, P.GLASS[5])
  s.set(cx - 3, cy - 2, P.GLASS[5])
}

function windowPanel(f: Frame, x: number, y: number, w: number, h: number, glow: boolean) {
  const { s } = f
  const frame = P.METAL[1]
  s.rect(x - 1, y - 1, w + 2, h + 2, frame)
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      let c = yy < h / 3 ? P.GLASS[2] : P.GLASS[1]
      const streak = (xx + yy) % 12
      if (streak === 2 || streak === 3) c = P.GLASS[3]
      if (glow) c = mix(c, P.GLOW[1], yy > h / 2 ? 0.35 : 0.2)
      s.set(x + xx, y + yy, c)
    }
  }
  s.vline(x + Math.floor(w / 2), y, y + h - 1, frame)
  s.hline(x, x + w - 1, y + h - 1, P.GLASS[0])
  s.set(x + 1, y + 1, P.GLASS[5])
  s.set(x + 2, y + 1, P.GLASS[5])
  s.set(x + 1, y + 2, P.GLASS[5])
  s.rect(x - 2, y + h + 1, w + 4, 1, P.PLASTER[4])
  s.rect(x - 2, y + h + 2, w + 4, 1, scale(f.wall[1], 0.85))
}

function flowerBox(f: Frame, x: number, y: number, w: number) {
  const { s, seed } = f
  s.rect(x, y + 1, w, 3, P.WOOD[3])
  s.hline(x, x + w - 1, y + 3, P.WOOD[1])
  for (let xx = x; xx < x + w; xx++) {
    const n = hash2(xx, y, seed + 21)
    s.set(xx, y, n < 0.45 ? P.OAK[3] : P.OAK[4])
    if (n > 0.55) s.set(xx, y - 1, P.OAK[3])
    if (n > 0.72) s.set(xx, y - 1, P.FLOWERS[Math.floor(hash2(xx, 3, seed) * P.FLOWERS.length)])
  }
}

function balcony(f: Frame, y: number, doorX: number) {
  const { s } = f
  const x0 = doorX - 17
  const x1 = doorX + 17
  s.rect(x0 - 1, y - 1, x1 - x0 + 3, 3, P.PLASTER[4])
  s.hline(x0 - 1, x1 + 1, y + 2, P.PLASTER[1])
  s.hline(x0, x1, y + 3, scale(P.PLASTER[1], 0.85))
  s.hline(x0, x1, y - 8, P.METAL[2])
  for (let x = x0; x <= x1; x += 3) s.vline(x, y - 8, y - 2, P.METAL[2])
  for (let x = x0 + 1; x < x1; x++) if (hash2(x, y, f.seed + 7) < 0.5) s.set(x, y - 9, hash2(x, 9, f.seed) < 0.3 ? P.FLOWERS[1] : P.OAK[4])
}

function terrace(f: Frame, y: number, floor: number) {
  const { s, wallX0, wallX1, seed } = f
  s.rect(wallX0 - 1, y - 1, wallX1 - wallX0 + 3, 3, P.PLASTER[4])
  s.hline(wallX0 - 1, wallX1 + 1, y + 2, P.PLASTER[0])
  for (let x = wallX0; x <= wallX1; x++) {
    const n = hash2(x, floor, seed + 31)
    if (n < 0.55) {
      s.set(x, y - 2, n < 0.2 ? P.OAK[2] : P.OAK[4])
      const hang = Math.floor(hash2(x, floor + 5, seed) * 6)
      for (let k = 0; k < hang; k++) s.set(x, y + 3 + k, k % 2 ? P.OAK[2] : P.OAK[3])
      if (n < 0.08) s.set(x, y + 3 + hang, P.FLOWERS[Math.floor(n * 70) % P.FLOWERS.length])
    }
  }
}

function shopFront(f: Frame, doorX: number) {
  const { s, wallX0, wallX1, wallBottom } = f
  const top = wallBottom - PLINTH - 26
  for (const [x0, x1] of [
    [wallX0 + 4, doorX - 14],
    [doorX + 14, wallX1 - 4],
  ]) {
    if (x1 - x0 < 8) continue
    s.rect(x0 - 1, top - 1, x1 - x0 + 3, 24, P.WOOD[1])
    for (let y = top; y < top + 21; y++) {
      for (let x = x0; x <= x1; x++) {
        const streak = (x + y) % 11
        s.set(x, y, streak < 2 ? P.GLASS[3] : y < top + 6 ? P.GLASS[2] : P.GLASS[1])
      }
    }
    for (let x = x0 + 12; x < x1; x += 13) s.vline(x, top, top + 20, P.WOOD[1])
    for (let x = x0; x <= x1; x++) {
      const n = hash2(x, top, f.seed + 41)
      s.set(x, top + 18, n < 0.5 ? P.FLOWERS[Math.floor(n * 14) % P.FLOWERS.length] : P.WOOD[4])
      if (n < 0.3) s.set(x, top + 17, P.GOLD[3])
      s.set(x, top + 19, P.WOOD[3])
      s.set(x, top + 20, P.WOOD[2])
    }
    s.set(x0 + 1, top + 1, P.GLASS[5])
    s.set(x0 + 2, top + 1, P.GLASS[5])
  }
}

function awning(f: Frame, b: Building) {
  const { s, wallX0, wallX1, wallBottom, accent } = f
  const top = wallBottom - PLINTH - 35
  const x0 = wallX0 + 2
  const x1 = wallX1 - 2
  for (let y = 0; y < 7; y++) {
    for (let x = x0 - (y > 2 ? 1 : 0); x <= x1 + (y > 2 ? 1 : 0); x++) {
      const stripe = Math.floor((x - x0) / 5) % 2 === 0
      const base = stripe ? accent : P.AWNING_STRIPE
      s.set(x, top + y, y < 2 ? mix(base, P.WHITE, 0.15) : y === 6 ? scale(base, 0.8) : base)
    }
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const phase = (x - x0 + 5) % 5
    if (phase > 0 && phase < 4) s.set(x, top + 7, Math.floor((x - x0) / 5) % 2 === 0 ? scale(accent, 0.8) : scale(P.AWNING_STRIPE, 0.85))
  }
  for (let x = x0; x <= x1; x++) s.shadow(x, top + 8, 0.45)
  for (let x = x0; x <= x1; x++) s.shadow(x, top + 9, 0.25)
  void b
}

function sign(f: Frame, b: Building) {
  const { s } = f
  const doorX = doorCentre(f, b)
  const x = doorX + 13
  const y = f.wallBottom - PLINTH - 41
  s.hline(x - 1, x + 5, y, P.METAL[1])
  s.vline(x + 1, y + 1, y + 2, P.METAL[1])
  s.vline(x + 5, y + 1, y + 2, P.METAL[1])
  s.rect(x, y + 3, 7, 7, P.WOOD[3])
  s.hline(x, x + 6, y + 9, P.WOOD[1])
  s.vline(x + 6, y + 3, y + 9, P.WOOD[1])
  const icon = [P.GOLD[3], P.GLOW[1], P.FLOWERS[1], P.CRYSTAL[3]][b.seed % 4]
  s.rect(x + 2, y + 5, 3, 3, icon)
  s.set(x + 3, y + 4, icon)
}

function planters(f: Frame, b: Building) {
  const { s, wallX0, wallX1, wallBottom, seed } = f
  const doorX = doorCentre(f, b)
  for (const x of [wallX0 + 3, wallX1 - 9]) {
    if (Math.abs(x + 3 - doorX) < 14) continue
    s.rect(x, wallBottom - 5, 7, 5, P.STONE[4])
    s.hline(x, x + 6, wallBottom - 5, P.STONE[5])
    s.vline(x + 6, wallBottom - 5, wallBottom, P.STONE[2])
    for (let xx = x; xx < x + 7; xx++) {
      const n = hash2(xx, wallBottom, seed + 61)
      s.set(xx, wallBottom - 6, n < 0.5 ? P.OAK[3] : P.OAK[4])
      if (n > 0.35) s.set(xx, wallBottom - 7, P.OAK[3])
      if (n > 0.75) s.set(xx, wallBottom - 8, P.GLOW_FLOWERS[Math.floor(n * 9) % P.GLOW_FLOWERS.length])
    }
  }
}

function ivy(f: Frame) {
  const { s, wallX0, wallTop, wallBottom, seed } = f
  const side = hash2(1, 2, seed) < 0.5 ? wallX0 : f.wallX1 - 6
  for (let y = wallTop + 2; y < wallBottom - 2; y++) {
    const reach = Math.floor(3 + 4 * hash2(0, Math.floor(y / 3), seed + 71))
    for (let k = 0; k < reach; k++) {
      const x = side === wallX0 ? side + k : side + 6 - k
      if (hash2(x, y, seed + 73) < 0.62) s.set(x, y, hash2(x, y, 5) < 0.4 ? P.OAK[2] : P.OAK[3])
    }
  }
}

function door(f: Frame, b: Building, options: { kind: 'arch' | 'transom' | 'round' | 'glass' | 'plank' | 'barn'; lamp: 'left' | 'right' | 'both' | 'none' }) {
  const { s, wallBottom, seed } = f
  const cx = doorCentre(f, b)
  const wide = options.kind === 'barn'
  const w = wide ? 28 : 18
  const h = wide ? 33 : 30
  const x = cx - Math.floor(w / 2)
  const y = wallBottom - h + 1
  const frameColor = options.kind === 'glass' ? P.METAL[1] : P.PLASTER[4]
  s.rect(x - 2, y - 2, w + 4, h + 2, frameColor)
  s.vline(x + w + 1, y - 2, wallBottom, scale(frameColor, 0.75))
  if (options.kind === 'glass') {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const streak = (xx + yy) % 10
        s.set(x + xx, y + yy, streak < 2 ? P.GLASS[3] : yy < 6 ? P.GLASS[2] : P.GLASS[1])
      }
    }
    s.vline(cx, y, wallBottom, P.METAL[1])
    s.set(cx - 2, y + 15, P.GOLD[3])
    s.set(cx + 1, y + 15, P.GOLD[3])
  } else {
    const wood = options.kind === 'barn' ? P.WOOD : [P.WOOD[0], P.WOOD[1], P.WOOD[2], P.WOOD[3], P.WOOD[4]]
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const plank = xx % 4 === 0
        s.set(x + xx, y + yy, plank ? wood[1] : hash2(xx, yy, seed) < 0.08 ? wood[2] : wood[3])
      }
    }
    if (options.kind === 'barn') {
      s.line(x, y, x + w - 1, y + h - 1, P.WOOD[4])
      s.line(x + w - 1, y, x, y + h - 1, P.WOOD[4])
      s.vline(cx, y, wallBottom, P.WOOD[0])
    } else {
      s.set(x + w - 4, y + 16, P.GOLD[3])
      s.set(x + w - 4, y + 17, P.GOLD[1])
      if (options.kind === 'plank') {
        s.hline(x, x + w - 1, y + 6, P.METAL[1])
        s.hline(x, x + w - 1, y + h - 7, P.METAL[1])
      }
      s.rect(x + 3, y + 4, w - 6, 1, wood[1])
      s.rect(x + 3, y + Math.round(h * 0.55), w - 6, 1, wood[1])
    }
    if (options.kind === 'arch' || options.kind === 'round') {
      for (let xx = -2; xx < w + 2; xx++) {
        const d = Math.abs(xx - (w - 1) / 2) / ((w + 3) / 2)
        const lift = Math.round(Math.sqrt(Math.max(0, 1 - d * d)) * (options.kind === 'round' ? 5 : 3))
        for (let k = 1; k <= lift; k++) s.set(x + xx, y - 2 - k, frameColor)
      }
      if (options.kind === 'round') {
        for (let xx = 1; xx < w - 1; xx++) {
          const d = Math.abs(xx - (w - 1) / 2) / (w / 2)
          const lift = Math.round(Math.sqrt(Math.max(0, 1 - d * d)) * 3)
          for (let k = 0; k <= lift; k++) s.set(x + xx, y - k, k === 0 ? P.GLASS[2] : P.GLASS[3])
        }
      }
    }
    if (options.kind === 'transom') {
      s.rect(x, y - 1, w, 4, P.GLASS[2])
      s.set(x + 1, y - 1, P.GLASS[5])
      s.hline(x, x + w - 1, y + 3, frameColor)
    }
  }
  s.rect(x - 3, wallBottom - 1, w + 6, 2, P.STONE[5])
  s.hline(x - 3, x + w + 2, wallBottom, P.STONE[3])
  const lamps = options.lamp === 'both' ? [-1, 1] : options.lamp === 'left' ? [-1] : options.lamp === 'right' ? [1] : []
  for (const side of lamps) crystalLamp(f, side < 0 ? x - 7 : x + w + 4, y + 6)
}

function crystalLamp(f: Frame, x: number, y: number) {
  const { s } = f
  s.eachInEllipse(x + 1, y + 3, 5, 5, (px, py, d) => s.blend(px, py, P.GLOW[2], 0.28 * (1 - d)))
  s.hline(x - 1, x + 3, y - 1, P.METAL[1])
  s.rect(x, y, 3, 5, P.METAL[1])
  s.set(x + 1, y + 1, P.GLOW[2])
  s.set(x + 1, y + 2, P.GLOW[3])
  s.set(x + 1, y + 3, P.GLOW[1])
  s.set(x + 1, y + 5, P.METAL[1])
}

function gableRoof(f: Frame, options: { dormers: number; chimney: boolean; steep?: boolean }) {
  const { s, roof, left, top, width, roofH, seed } = f
  const ridge = top + Math.round(roofH * (options.steep ? 0.3 : 0.36))
  const bottom = top + roofH + 2
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x < left + width; x++) {
      let c: Color
      if (y < ridge) {
        const course = (y - top) % 4
        const offset = Math.floor((y - top) / 4) % 2 ? 3 : 0
        const joint = (x - left + offset) % 6 === 0
        c = course === 3 ? roof[3] : joint ? roof[3] : course === 0 ? roof[5] : roof[4]
      } else if (y < ridge + 3) {
        c = y === ridge ? roof[5] : y === ridge + 1 ? roof[4] : roof[1]
        if ((x - left) % 6 === 0 && y < ridge + 2) c = roof[3]
      } else {
        const local = y - ridge - 3
        const course = local % 5
        const offset = Math.floor(local / 5) % 2 ? 4 : 0
        const joint = (x - left + offset) % 7 === 0
        const depth = local / Math.max(1, bottom - ridge - 3)
        const base = depth > 0.82 ? roof[1] : roof[2 + (depth < 0.35 ? 1 : 0)]
        c = course === 4 ? roof[1] : joint ? roof[1] : course === 0 ? mix(base, roof[4], 0.5) : base
        if (hash2(x >> 2, Math.floor(local / 5), seed + 81) < 0.07) c = mix(c, roof[1], 0.22)
      }
      s.set(x, y, c)
    }
  }
  s.hline(left, left + width - 1, bottom, roof[0])
  s.hline(left, left + width - 1, bottom - 1, roof[1])
  for (let y = top; y <= bottom; y++) {
    s.set(left, y, mix(s.get(left, y), P.WHITE, 0.2))
    s.set(left + width - 1, y, roof[0])
    s.set(left + width - 2, y, scale(s.get(left + width - 2, y), 0.85))
  }
  if (options.chimney) chimney(f, left + Math.round(width * (hash2(3, 4, seed) < 0.5 ? 0.24 : 0.7)), false, ridge)
  for (let d = 0; d < options.dormers; d++) {
    const cx = left + Math.round((width * (d + 1)) / (options.dormers + 1))
    dormer(f, cx, ridge + 5)
  }
}

function dormer(f: Frame, cx: number, y: number) {
  const { s, roof, wall } = f
  const w = 16
  const x = cx - w / 2
  s.rect(x, y + 5, w, 11, wall[3])
  s.vline(x + w - 1, y + 5, y + 15, wall[1])
  s.vline(x, y + 5, y + 15, wall[4])
  s.rect(x + 3, y + 7, 10, 8, P.PLASTER[4])
  s.rect(x + 4, y + 8, 8, 6, P.GLASS[2])
  s.set(x + 5, y + 9, P.GLASS[5])
  s.set(x + 6, y + 9, P.GLASS[4])
  s.vline(x + 8, y + 8, y + 13, P.PLASTER[4])
  for (let k = 0; k < 8; k++) {
    const shade = k === 0 ? roof[1] : k < 3 ? roof[4] : roof[3]
    s.hline(x - 1 + k, x + w - k, y + 5 - k, shade)
    s.set(x + w - k, y + 5 - k, roof[1])
  }
  s.hline(x - 1, x + w, y + 16, roof[0])
  for (let xx = x; xx < x + w; xx++) s.shadow(xx, y + 17, 0.35)
}

function chimney(f: Frame, cx: number, frontGableRoof: boolean, ridge?: number) {
  const { s, top, roofH } = f
  const baseY = ridge ?? top + Math.round(roofH * 0.45)
  const h = frontGableRoof ? 16 : 14
  const x = cx - 4
  const y = baseY - h + 5
  s.eachInEllipse(x + 10, y + h - 1, 6, 3, (px, py) => s.shadow(px, py, 0.35))
  s.rect(x, y, 9, h, P.STONE[3])
  for (let yy = y; yy < y + h; yy += 3) {
    s.hline(x, x + 8, yy, P.STONE[2])
    s.set(x + ((yy >> 1) % 2 ? 3 : 6), yy + 1, P.STONE[2])
  }
  s.vline(x + 8, y, y + h - 1, P.STONE[1])
  s.vline(x + 7, y, y + h - 1, P.STONE[2])
  s.vline(x, y, y + h - 1, P.STONE[5])
  s.rect(x - 1, y - 3, 11, 3, P.STONE[4])
  s.hline(x - 1, x + 9, y - 3, P.STONE[5])
  s.hline(x - 1, x + 9, y - 1, P.STONE[1])
  s.set(x + 4, y - 6, P.GLOW[3])
  s.set(x + 4, y - 5, P.GLOW[2])
  s.set(x + 3, y - 4, P.GLOW[1])
  s.set(x + 4, y - 4, P.GLOW[3])
  s.set(x + 5, y - 4, P.GLOW[0])
  s.eachInEllipse(x + 4.5, y - 5, 6, 5, (px, py, d) => s.blend(px, py, P.GLOW[2], 0.2 * (1 - d)))
}

function frontGable(f: Frame) {
  const { s, roof, left, top, width, roofH, wallTop, wallX0, wallX1, wall, seed } = f
  const mid = left + Math.floor(width / 2)
  const bottom = top + roofH + 2
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x < left + width; x++) {
      const leftSide = x < mid
      const course = (y - top) % 5
      const offset = Math.floor((y - top) / 5) % 2 ? 3 : 0
      const joint = (x - left + offset) % 7 === 0
      const base = leftSide ? roof[4] : roof[2]
      let c = course === 4 ? (leftSide ? roof[3] : roof[1]) : joint ? (leftSide ? roof[3] : roof[1]) : base
      if (course === 0) c = mix(c, roof[5], leftSide ? 0.4 : 0.2)
      if (hash2(x >> 2, y >> 2, seed + 85) < 0.05) c = mix(c, roof[1], 0.25)
      s.set(x, y, c)
    }
  }
  for (let y = top; y <= bottom; y++) {
    s.set(mid - 1, y, roof[5])
    s.set(mid, y, roof[4])
    s.set(left, y, roof[4])
    s.set(left + width - 1, y, roof[0])
  }
  const gableH = Math.min(roofH - 6, Math.round((wallX1 - wallX0) * 0.32))
  for (let k = 0; k <= gableH; k++) {
    const y = wallTop - k
    const half = Math.round(((gableH - k) / gableH) * ((wallX1 - wallX0) / 2))
    for (let x = mid - half; x <= mid + half; x++) s.set(x, y, hash2(x, y, seed) < 0.05 ? wall[2] : wall[3])
    s.set(mid - half - 1, y, roof[1])
    s.set(mid - half - 2, y, roof[0])
    s.set(mid + half + 1, y, roof[0])
    s.set(mid + half + 2, y, roof[1])
  }
  for (let y = wallTop + 1; y <= wallTop + 2; y++) {
    for (let x = wallX0; x <= wallX1; x++) s.set(x, y, hash2(x, y, seed) < 0.05 ? wall[2] : wall[3])
  }
  for (let x = wallX0; x <= wallX1; x++) {
    s.shadow(x, wallTop + 3, 0.18)
    s.set(x, wallTop + 1, mix(s.get(x, wallTop + 1), wall[4], 0.3))
  }
  windowRound(f, mid, wallTop - Math.round(gableH * 0.42), 4)
}

function vaultRoof(f: Frame) {
  const { s, roof, left, top, width, roofH, seed } = f
  const bottom = top + roofH + 2
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top)
    const light = t < 0.12 ? 0.82 : t < 0.3 ? 1 : 0.95 - t * 0.9
    const base = roof[Math.max(0, Math.min(roof.length - 1, Math.round(light * (roof.length - 1))))]
    for (let x = left; x < left + width; x++) {
      const corner = Math.min(x - left, left + width - 1 - x)
      if (y - top < 3 - corner) continue
      const seam = (x - left) % 6
      let c = seam === 0 ? mix(base, P.WHITE, 0.18) : seam === 1 ? scale(base, 0.86) : base
      if (hash2(x >> 2, y >> 3, seed + 91) < 0.06) c = mix(c, roof[0], 0.18)
      s.set(x, y, c)
    }
  }
  const sy = top + Math.round(roofH * 0.2)
  for (let x = left + 8; x < left + width - 8; x++) {
    for (let y = sy; y < sy + 4; y++) s.set(x, y, (x + y) % 7 < 2 ? P.GLASS[4] : y === sy ? P.GLASS[3] : P.GLASS[2])
    if ((x - left) % 12 === 0) s.vline(x, sy, sy + 3, P.METAL[2])
  }
  s.hline(left, left + width - 1, bottom, roof[0])
  s.hline(left + 1, left + width - 2, bottom - 1, roof[1])
  for (let y = top + 3; y <= bottom; y++) {
    s.set(left, y, mix(s.get(left, y), P.WHITE, 0.25))
    s.set(left + width - 1, y, roof[0])
  }
}

function gardenRoof(f: Frame) {
  const { s, left, top, width, roofH, seed, rng } = f
  const bottom = top + roofH + 1
  s.rect(left, top, width, bottom - top + 1, P.PLASTER[4])
  s.rect(left + 3, top + 3, width - 6, bottom - top - 5, P.PLASTER[1])
  for (let y = top + 4; y <= bottom - 3; y++) {
    for (let x = left + 4; x < left + width - 4; x++) {
      const n = hash2(x >> 1, y >> 1, seed + 101)
      let c = n < 0.3 ? P.MEADOW[1] : n < 0.8 ? P.MEADOW[2] : P.MEADOW[3]
      if (hash2(x, y, seed + 103) < 0.03) c = P.MEADOW[4]
      s.set(x, y, c)
    }
  }
  s.hline(left + 4, left + width - 5, top + 4, P.MEADOW[0])
  s.hline(left, left + width - 1, bottom, P.PLASTER[1])
  s.vline(left + width - 1, top, bottom, P.PLASTER[1])
  s.vline(left, top, bottom, P.PLASTER[5 - 1])
  const kind = rng()
  const w = Math.min(22, Math.round(width * 0.3))
  const x = left + Math.round(width * (0.18 + rng() * 0.15))
  const y = top + Math.round(roofH * 0.3)
  const h = Math.max(6, Math.round(roofH * 0.35))
  if (kind < 0.5) {
    s.rect(x - 1, y - 1, w + 2, h + 2, P.METAL[2])
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) s.set(x + xx, y + yy, (xx + yy) % 8 < 2 ? P.GLASS[4] : P.GLASS[2])
    s.vline(x + (w >> 1), y, y + h - 1, P.METAL[2])
  } else {
    s.rect(x - 1, y - 1, w + 2, h + 2, P.STONE[4])
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) s.set(x + xx, y + yy, yy === 0 ? P.WATER[2] : (xx * 3 + yy * 5) % 11 === 0 ? P.WATER[6] : P.WATER[4])
  }
  const shrubs = Math.max(2, Math.round(width / 26))
  for (let i = 0; i < shrubs; i++) {
    const sx = left + 8 + Math.round(((width - 16) * (i + 0.5)) / shrubs) + Math.round((rng() - 0.5) * 6)
    const sy = top + roofH - 6 - Math.round(rng() * 4)
    if (sx > x - 5 && sx < x + w + 5 && sy > y - 4 && sy < y + h + 4) continue
    shrub(s, sx, sy, 4 + Math.round(rng() * 2), seed + i)
  }
  for (let xx = left + width - 16; xx < left + width - 8; xx++) {
    s.set(xx, top + 7, P.WOOD[4])
    s.set(xx, top + 8, P.WOOD[2])
  }
}

function shrub(s: Raster, cx: number, cy: number, r: number, seed: number) {
  s.eachInEllipse(cx + 1, cy + 2, r, r * 0.6, (x, y) => s.shadow(x, y, 0.35))
  s.eachInEllipse(cx, cy, r, r * 0.85, (x, y, d) => {
    const lit = x - cx + (y - cy) < -r * 0.3
    const n = hash2(x, y, seed)
    s.set(x, y, d > 0.75 ? P.OAK[1] : lit ? (n < 0.5 ? P.OAK[4] : P.OAK[5]) : n < 0.4 ? P.OAK[2] : P.OAK[3])
  })
  if (hash2(cx, cy, seed) < 0.5) s.set(cx - 1, cy - 1, P.FLOWERS[seed % P.FLOWERS.length])
}

function domeRoof(f: Frame) {
  const { s, left, top, width, roofH } = f
  gardenRoof(f)
  const cx = left + width / 2
  const cy = top + roofH * 0.62
  const rx = Math.round(width * 0.3)
  const ry = Math.round(roofH * 0.62)
  glassDome(s, cx, cy, rx, ry)
}

function glassDome(s: Raster, cx: number, cy: number, rx: number, ry: number) {
  s.eachInEllipse(cx + 2, cy + ry * 0.35, rx + 1, ry * 0.45, (x, y) => s.shadow(x, y, 0.4))
  s.eachInEllipse(cx, cy, rx, ry, (x, y, d) => {
    const nx = (x + 0.5 - cx) / rx
    const ny = (y + 0.5 - cy) / ry
    if (ny > 0.35) return
    const light = 0.62 - nx * 0.45 - ny * 0.35
    let c = P.GLASS[Math.max(1, Math.min(5, Math.round(light * 5)))]
    const rib = Math.abs(Math.round(nx * 4) - nx * 4) < 0.12
    if (rib || Math.abs(ny + 0.35) < 0.05 || Math.abs(ny + 0.7) < 0.04) c = P.GOLD[2]
    if (d > 0.9) c = P.GOLD[1]
    s.set(x, y, c)
  })
  const baseY = Math.round(cy + ry * 0.35)
  s.rect(Math.round(cx - rx), baseY, rx * 2, 2, P.GOLD[2])
  s.hline(Math.round(cx - rx), Math.round(cx + rx - 1), baseY + 2, P.GOLD[0])
  const tipY = Math.round(cy - ry)
  s.vline(Math.round(cx), tipY - 5, tipY, P.GOLD[3])
  s.set(Math.round(cx), tipY - 6, P.GLOW[3])
}

function civicHall(f: Frame, b: Building) {
  const { s, left, top, width, roofH, wallTop, wallBottom, wallX0, wallX1 } = f
  wall(f, 'plaster')
  gardenRoof(f)
  s.rect(left, top + roofH - 1, width, 4, P.ROOF_TEAL[3])
  s.hline(left, left + width - 1, top + roofH - 1, P.ROOF_TEAL[5])
  s.hline(left, left + width - 1, top + roofH + 2, P.ROOF_TEAL[0])
  glassDome(s, left + width / 2, top + roofH * 0.62, Math.round(width * 0.17), Math.round(roofH * 0.7))
  const cx = doorCentre(f, b)
  const portico = 56
  for (let floor = 0; floor < f.floors; floor++) {
    const floorBottom = wallBottom - PLINTH - floor * STORY
    for (let x = wallX0 + 14; x < wallX1 - 10; x += 26) {
      if (Math.abs(x - cx) < portico / 2 + 12) continue
      windowGrid(f, x - 7, floorBottom - STORY + 10, 14, 24, { arch: true, box: floor === 0, glow: floor === 1 && x % 3 === 0 })
    }
  }
  const px0 = cx - portico / 2
  const px1 = cx + portico / 2
  const py = wallTop + 6
  s.rect(px0 - 4, py, portico + 9, wallBottom - py + 1, P.PLASTER[2])
  for (let y = py; y <= wallBottom; y++) s.shadow(px0 - 4, y, 0.2)
  s.rect(px0, py + 5, portico, wallBottom - py - 8, P.PLASTER[1])
  for (let x = px0; x <= px1; x += 14) {
    s.rect(x, py + 6, 6, wallBottom - py - 8, P.PLASTER[4])
    s.vline(x, py + 6, wallBottom - 3, P.WHITE)
    s.vline(x + 5, py + 6, wallBottom - 3, P.PLASTER[1])
    s.vline(x + 3, py + 8, wallBottom - 5, P.PLASTER[3])
    s.rect(x - 1, py + 5, 8, 2, P.PLASTER[4])
    s.rect(x - 1, wallBottom - 3, 8, 2, P.PLASTER[3])
  }
  for (let k = 0; k < 10; k++) s.hline(px0 - 4 + k, px1 + 5 - k, py - k, k === 0 ? P.PLASTER[1] : k < 3 ? P.PLASTER[4] : P.PLASTER[3])
  s.set(cx, py - 6, P.GLOW[3])
  s.set(cx - 1, py - 5, P.GLOW[1])
  s.set(cx + 1, py - 5, P.GLOW[1])
  s.set(cx, py - 4, P.GLOW[2])
  for (const x of [px0 + 8, px1 - 11]) {
    s.rect(x, py + 9, 5, 19, P.ROOF_TEAL[3])
    s.vline(x + 4, py + 9, py + 27, P.ROOF_TEAL[1])
    s.vline(x, py + 9, py + 27, P.ROOF_TEAL[4])
    s.set(x + 2, py + 14, P.GOLD[3])
    s.set(x + 1, py + 15, P.GOLD[3])
    s.set(x + 3, py + 15, P.GOLD[3])
    s.set(x + 2, py + 16, P.GOLD[3])
    s.set(x + 1, py + 28, P.ROOF_TEAL[3])
    s.set(x + 3, py + 28, P.ROOF_TEAL[1])
  }
  door(f, b, { kind: 'transom', lamp: 'both' })
  for (let k = 0; k < 3; k++) s.rect(px0 - 6 - k * 2, wallBottom - 2 + k, portico + 13 + k * 4, 1, k % 2 ? P.STONE[3] : P.STONE[5])
}

function academyHall(f: Frame, b: Building) {
  const { s, left, top, width, roofH, wallTop, wallBottom } = f
  wall(f, 'stone')
  gableRoof(f, { dormers: 3, chimney: false })
  facade(f, b, { window: 'tall', shutters: false, boxes: true, glow: true })
  const cx = doorCentre(f, b)
  const tw = 36
  const tx = cx - tw / 2
  const ty = top + 2
  for (let y = ty + 12; y < wallTop + 2; y++) {
    for (let x = tx; x < tx + tw; x++) {
      const row = Math.floor((y - ty) / 5)
      const joint = (y - ty) % 5 === 0 || (x - tx + (row % 2) * 4) % 8 === 0
      s.set(x, y, joint ? P.STONE[2] : hash2(x >> 3, row, 7) < 0.3 ? P.STONE[3] : P.STONE[4])
    }
  }
  s.vline(tx, ty + 12, wallTop + 2, P.STONE[5])
  s.vline(tx + tw - 1, ty + 12, wallTop + 2, P.STONE[1])
  s.vline(tx + tw - 2, ty + 12, wallTop + 2, P.STONE[2])
  for (let k = 0; k < 14; k++) s.hline(tx - 2 + Math.floor(k * 1.35), tx + tw + 1 - Math.floor(k * 1.35), ty + 12 - k, k < 2 ? P.ROOF_SLATE[1] : k % 3 === 0 ? P.ROOF_SLATE[3] : P.ROOF_SLATE[4])
  s.set(cx, ty - 3, P.GOLD[3])
  s.set(cx, ty - 4, P.GOLD[3])
  const clockY = ty + 26
  s.eachInEllipse(cx, clockY, 10, 10, (x, y, d) => s.set(x, y, d > 0.72 ? P.GOLD[2] : P.PLASTER[4]))
  s.eachInEllipse(cx, clockY, 7, 7, (x, y, d) => d > 0.62 && s.set(x, y, P.GLOW[1]))
  s.vline(cx, clockY - 5, clockY, P.INK)
  s.hline(cx, cx + 4, clockY, P.INK)
  windowGrid(f, cx - 6, clockY + 15, 12, 15, { arch: true })
  door(f, b, { kind: 'arch', lamp: 'both' })
  void roofH
  void width
  void left
}

function greenhouse(f: Frame) {
  const { s, left, top, width, height, roofH, wallTop, wallBottom, seed } = f
  for (let y = top; y <= top + roofH + 1; y++) {
    const t = (y - top) / (roofH + 1)
    for (let x = left; x < left + width; x++) {
      const corner = Math.min(x - left, left + width - 1 - x)
      if (y - top < 3 - corner) continue
      const frame = (x - left) % 8 === 0 || (y - top) % 7 === 0
      const plant = hash2(x >> 2, y >> 2, seed) < 0.35 && t > 0.35
      let c = frame ? P.PLASTER[4] : plant ? mix(P.OAK[3], P.GLASS[3], 0.45) : t < 0.3 ? P.GLASS[4] : P.GLASS[3]
      if (!frame && (x + y) % 13 < 2) c = P.GLASS[5]
      s.set(x, y, c)
    }
  }
  for (let y = wallTop; y <= wallBottom; y++) {
    for (let x = left + 2; x < left + width - 2; x++) {
      const frame = (x - left) % 12 === 2 || y === wallTop || y === wallTop + 1
      let c = frame ? P.PLASTER[4] : (x + y) % 15 < 2 ? P.GLASS[4] : y < wallTop + 8 ? P.GLASS[3] : P.GLASS[2]
      if (y > wallBottom - 4) c = y === wallBottom - 3 ? P.STONE[5] : P.STONE[3]
      s.set(x, y, c)
    }
  }
  const pots = Math.floor((width - 8) / 12)
  for (let i = 0; i < pots; i++) {
    const px = left + 8 + i * 12
    if (Math.abs(px - (left + width / 2)) < 12) continue
    const py = wallBottom - 8
    s.eachInEllipse(px, py - 6, 5, 6, (x, y, d) => s.set(x, y, mix(d > 0.6 ? P.OAK[2] : hash2(x, y, seed) < 0.5 ? P.OAK[3] : P.OAK[4], P.GLASS[3], 0.3)))
    if (hash2(i, 2, seed) < 0.6) s.set(px - 1, py - 9, mix(P.FLOWERS[i % P.FLOWERS.length], P.GLASS[4], 0.2))
    s.rect(px - 3, py - 1, 6, 4, mix(P.ROOF_TERRACOTTA[3], P.GLASS[3], 0.25))
  }
  for (let x = left + 4; x < left + width - 4; x += 5) {
    const drop = 3 + Math.floor(hash2(x, 1, seed) * 7)
    for (let k = 0; k < drop; k++) s.set(x, wallTop + 2 + k, mix(k % 2 ? P.OAK[2] : P.OAK[4], P.GLASS[3], 0.3))
  }
  const cx = left + Math.floor(width / 2)
  s.rect(cx - 8, wallBottom - 26, 16, 24, P.GLASS[1])
  s.rect(cx - 9, wallBottom - 27, 18, 1, P.PLASTER[4])
  s.vline(cx, wallBottom - 26, wallBottom - 3, P.PLASTER[4])
  s.rect(cx - 10, wallBottom - 1, 20, 2, P.STONE[5])
  void height
}

function pavilion(f: Frame) {
  const { s, left, top, width, roofH, wallTop, wallBottom } = f
  s.rect(left + 2, wallTop + 4, width - 4, wallBottom - wallTop - 3, P.PLAZA[3])
  for (let x = left + 2; x < left + width - 2; x += 6) s.vline(x, wallTop + 4, wallBottom, P.PLAZA[2])
  s.rect(left + 1, wallBottom - 2, width - 2, 3, P.STONE[4])
  s.hline(left + 1, left + width - 2, wallBottom, P.STONE[2])
  for (let y = wallTop; y < wallTop + 14; y++) for (let x = left + 2; x < left + width - 2; x++) s.shadow(x, y, 0.6 - (y - wallTop) * 0.035)
  s.rect(left + width / 2 - 12, wallBottom - 14, 24, 3, P.WOOD[3])
  s.hline(left + width / 2 - 12, left + width / 2 + 11, wallBottom - 12, P.WOOD[1])
  s.vline(left + width / 2 - 10, wallBottom - 11, wallBottom - 8, P.WOOD[1])
  s.vline(left + width / 2 + 9, wallBottom - 11, wallBottom - 8, P.WOOD[1])
  for (const x of [left + 4, left + Math.round(width / 3), left + Math.round((width * 2) / 3), left + width - 8]) {
    s.rect(x, wallTop, 4, wallBottom - wallTop - 2, P.PLASTER[4])
    s.vline(x + 3, wallTop, wallBottom - 3, P.PLASTER[1])
    s.vline(x, wallTop, wallBottom - 3, P.WHITE)
  }
  const cx = left + width / 2
  s.eachInEllipse(cx, top + roofH * 0.95, width / 2, roofH * 0.95, (x, y) => {
    if (y > top + roofH + 1) return
    const nx = (x + 0.5 - cx) / (width / 2)
    const ny = (y - top) / roofH
    const light = 0.75 - nx * 0.5 - (1 - ny) * 0.1
    let c = P.ROOF_TEAL[Math.max(0, Math.min(5, Math.round(light * 5)))]
    if (Math.abs(Math.round(nx * 3) - nx * 3) < 0.1) c = P.ROOF_TEAL[1]
    s.set(x, y, c)
  })
  s.hline(left, left + width - 1, top + roofH + 1, P.ROOF_TEAL[0])
  s.vline(Math.round(cx), top - 4, top + 1, P.GOLD[3])
  s.set(Math.round(cx), top - 5, P.GLOW[3])
}
