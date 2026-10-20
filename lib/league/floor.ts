import type { Point, Rect } from '../city/geometry'
import { canvasOf, GLYPH, GOLD, INK, METAL, paintText, textWidth } from '../game/fx/plate'
import {
  BAR,
  BARRELS,
  BOOTH,
  CARPET,
  CEILING_LAMPS,
  CRATES,
  DOOR,
  LEAGUE_ROOM,
  MAIN_RING,
  MAIN_RING_BENCHES,
  RINGS,
  SIDE_RINGS,
  TABLE_RADIUS,
  TABLES,
  VENDOR,
  WALLS,
} from './layout'

const ART = 4

const px = (value: number) => Math.round(value / ART)

type Paint = CanvasRenderingContext2D

const CONCRETE = { base: '#4a4440', light: '#55504a', dark: '#3f3a36', joint: '#36312e', stain: 'rgba(24, 18, 14, 0.22)' }
const WALL = { base: '#2b2426', panel: '#332b2d', column: '#1d191a', columnHi: '#4a3f41', skirt: '#1a1617', rim: '#241f20', rimHi: '#3a3233' }
const CANVAS = { base: '#c9b998', seam: '#bcab89', worn: 'rgba(90, 70, 40, 0.16)', apron: '#5a2626', apronHi: '#7a3434', apronLo: '#3f1a1a' }
const ROPE = { red: '#c23b3b', redHi: '#e06060', white: '#e8e4d8', blue: '#3b5fc2', blueHi: '#6a8ae0', shadow: 'rgba(0,0,0,0.25)' }
const WOOD = { top: '#7a5436', topHi: '#9a7046', front: '#4a3220', dark: '#3a2518', plank: '#8a6a44', plankLo: '#5a4028' }
const STEEL = { top: '#3d4a5a', topHi: '#55657a', front: '#2a3440', line: '#1e2630' }
const CLOTH = { top: '#5a3a6a', topHi: '#7a5290', front: '#3f2a4b' }
const CARPET_COLOR = { base: '#7a2430', edge: '#b8863a', worn: '#6a1f2a', pile: '#8a2c38' }
const NEON = { tube: '#ff6ad5', core: '#fff0fb', frame: '#1a1416', off: '#5a2a4c' }
const DOOR_COLOR = { dark: '#120f10', leaf: '#4a3328', leafHi: '#6a4a38', street: '#5a4a3a' }
const BOTTLES = ['#4fc3f7', '#ffd54f', '#81c784', '#e57373', '#ba68c8', '#ffb74d']

function rng(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rect(paint: Paint, x: number, y: number, w: number, h: number, colour: string) {
  paint.fillStyle = colour
  paint.fillRect(x, y, w, h)
}

function ellipse(paint: Paint, cx: number, cy: number, rx: number, ry: number, colour: string) {
  paint.fillStyle = colour
  paint.beginPath()
  paint.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  paint.fill()
}

function paintConcrete(paint: Paint, random: () => number) {
  const { width, height } = LEAGUE_ROOM
  const w = px(width)
  const h = px(height)
  rect(paint, 0, 0, w, h, CONCRETE.base)
  for (let index = 0; index < w * h * 0.07; index++) {
    const x = Math.floor(random() * w)
    const y = Math.floor(random() * h)
    rect(paint, x, y, 1, 1, random() < 0.5 ? CONCRETE.light : CONCRETE.dark)
  }
  const floorTop = px(WALLS.back)
  for (let x = px(WALLS.side); x < w; x += 96) rect(paint, x, floorTop, 1, h - floorTop, CONCRETE.joint)
  for (let y = floorTop; y < h; y += 96) rect(paint, 0, y, w, 1, CONCRETE.joint)
  for (let index = 0; index < 26; index++) {
    const cx = 40 + random() * (w - 80)
    const cy = floorTop + 30 + random() * (h - floorTop - 60)
    ellipse(paint, cx, cy, 6 + random() * 16, 3 + random() * 8, CONCRETE.stain)
  }

  paint.fillStyle = WALL.column
  for (const [, ring] of RINGS.entries()) {
    const x = px(ring.rect.x + ring.rect.w / 2) + 30
    rect(paint, x, floorTop, 1, px(ring.rect.y) - floorTop, '#2a2425')
  }
}

function paintLightPools(paint: Paint) {
  for (const [x, y] of CEILING_LAMPS) {
    const cx = px(x)
    const cy = px(y)
    const gradient = paint.createRadialGradient(cx, cy, 4, cx, cy, 78)
    gradient.addColorStop(0, 'rgba(255, 214, 150, 0.22)')
    gradient.addColorStop(0.6, 'rgba(255, 200, 130, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 200, 130, 0)')
    paint.fillStyle = gradient
    paint.beginPath()
    paint.ellipse(cx, cy, 78, 46, 0, 0, Math.PI * 2)
    paint.fill()
  }
}

function paintCarpet(paint: Paint, random: () => number) {
  const x = px(CARPET.x)
  const y = px(CARPET.y)
  const w = px(CARPET.w)
  const h = px(CARPET.h)
  rect(paint, x, y, w, h, CARPET_COLOR.base)
  for (let index = 0; index < w * h * 0.05; index++) {
    rect(paint, x + Math.floor(random() * w), y + Math.floor(random() * h), 1, 1, random() < 0.5 ? CARPET_COLOR.pile : CARPET_COLOR.worn)
  }
  rect(paint, x + 1, y, 1, h, CARPET_COLOR.edge)
  rect(paint, x + w - 2, y, 1, h, CARPET_COLOR.edge)
  rect(paint, x + 3, y, 1, h, CARPET_COLOR.worn)
  rect(paint, x + w - 4, y, 1, h, CARPET_COLOR.worn)
}

function paintBackWall(paint: Paint) {
  const w = px(LEAGUE_ROOM.width)
  const h = px(WALLS.back)
  rect(paint, 0, 0, w, h, WALL.base)
  for (let y = 4; y < h - 6; y += 3) rect(paint, 0, y, w, 1, WALL.panel)
  for (let x = px(WALLS.side); x < w; x += 128) {
    rect(paint, x - 2, 0, 4, h, WALL.column)
    rect(paint, x - 2, 0, 1, h, WALL.columnHi)
  }
  rect(paint, 0, h - 4, w, 4, WALL.skirt)
  rect(paint, 0, h - 4, w, 1, WALL.rimHi)
}

function paintPoster(paint: Paint, x: number, y: number, background: string, ink: string, title: string) {
  rect(paint, x, y, 26, 34, INK)
  rect(paint, x + 1, y + 1, 24, 32, background)

  rect(paint, x + 5, y + 9, 6, 9, ink)
  rect(paint, x + 6, y + 5, 4, 4, ink)
  rect(paint, x + 15, y + 9, 6, 9, ink)
  rect(paint, x + 16, y + 5, 4, 4, ink)
  rect(paint, x + 11, y + 12, 4, 2, GOLD[2])
  rect(paint, x + 3, y + 22, 20, 1, ink)
  paintText(paint, title, x + 13 - Math.floor(textWidth(title) / 2), y + 25, ink)
}

function paintNeonSign(paint: Paint) {
  const title = 'LIGA DE ROBOS'
  const scale = 3
  const width = textWidth(title) * scale
  const centerX = px(MAIN_RING.rect.x + MAIN_RING.rect.w / 2)
  const x = centerX - Math.floor(width / 2)
  const y = 18
  rect(paint, x - 8, y - 7, width + 16, GLYPH.height * scale + 14, NEON.frame)
  rect(paint, x - 7, y - 6, width + 14, 1, METAL[2])
  rect(paint, x - 7, y + GLYPH.height * scale + 6, width + 14, 1, METAL[0])
  const glyphs = canvasOf(textWidth(title), GLYPH.height)
  paintText(glyphs, title, 0, 0, '#ffffff')
  const data = glyphs.getImageData(0, 0, glyphs.canvas.width, glyphs.canvas.height).data
  for (let gy = 0; gy < glyphs.canvas.height; gy++) {
    for (let gx = 0; gx < glyphs.canvas.width; gx++) {
      if (data[(gy * glyphs.canvas.width + gx) * 4 + 3] === 0) continue
      rect(paint, x + gx * scale, y + gy * scale, scale, scale, NEON.tube)
      rect(paint, x + gx * scale + 1, y + gy * scale + 1, 1, 1, NEON.core)
    }
  }
  const sub = 'DESDE A QUEDA'
  paintText(paint, sub, centerX - Math.floor(textWidth(sub) / 2), y + GLYPH.height * scale + 9, GOLD[1])
}

function paintShelves(paint: Paint, random: () => number) {
  const x0 = px(BAR.counter.x) + 10
  const x1 = px(BAR.counter.x + BAR.counter.w) - 10
  for (const shelfY of [30, 50]) {
    rect(paint, x0, shelfY + 9, x1 - x0, 2, WOOD.front)
    rect(paint, x0, shelfY + 9, x1 - x0, 1, WOOD.top)
    for (let x = x0 + 4; x < x1 - 4; x += 7) {
      if (random() < 0.2) continue
      const colour = BOTTLES[Math.floor(random() * BOTTLES.length)]
      const height = 6 + Math.floor(random() * 3)
      rect(paint, x, shelfY + 9 - height, 3, height, colour)
      rect(paint, x + 1, shelfY + 9 - height - 2, 1, 2, colour)
      rect(paint, x, shelfY + 9 - height + 1, 1, height - 2, 'rgba(255,255,255,0.35)')
    }
  }
  const sign = 'BAR DO TIAO'
  paintText(paint, sign, Math.floor((x0 + x1) / 2) - Math.floor(textWidth(sign) / 2), 12, GOLD[2])
}

function paintOddsBoard(paint: Paint, random: () => number) {
  const x = px(BOOTH.counter.x) + 20
  const w = px(BOOTH.counter.w) - 40
  const y = 14
  rect(paint, x, y, w, 56, INK)
  rect(paint, x + 1, y + 1, w - 2, 54, '#101a14')
  const title = 'APOSTAS'
  paintText(paint, title, x + Math.floor(w / 2) - Math.floor(textWidth(title) / 2), y + 4, '#7ef0a0')
  const names = ['FAISCA', 'BRISA', 'MOENDA', 'PARAFUSO', 'CINZA']
  for (const [row, name] of names.entries()) {
    const ry = y + 15 + row * 8
    paintText(paint, name, x + 6, ry, '#c8f0d0')
    const odds = `${1 + Math.floor(random() * 4)}:${1 + Math.floor(random() * 3)}`
    paintText(paint, odds, x + w - 6 - textWidth(odds), ry, GOLD[2])
    rect(paint, x + 62, ry + 3, Math.floor(20 + random() * 60), 2, row % 2 ? '#e06060' : '#6a8ae0')
  }
}

function paintCounter(paint: Paint, counter: Rect, top: string, topHi: string, front: string, rail?: string) {
  const x = px(counter.x)
  const y = px(counter.y)
  const w = px(counter.w)
  const h = px(counter.h)
  const frontH = 12
  rect(paint, x, y, w, h - frontH, top)
  rect(paint, x, y, w, 2, topHi)
  rect(paint, x, y, 1, h - frontH, topHi)
  rect(paint, x, y + h - frontH, w, frontH, front)
  rect(paint, x, y + h - frontH, w, 1, INK)
  if (rail) rect(paint, x + 2, y + h - 3, w - 4, 1, rail)
  for (let gx = x + 6; gx < x + w - 6; gx += 10) rect(paint, gx, y + h - frontH + 2, 1, frontH - 4, 'rgba(0,0,0,0.25)')
}

function paintBar(paint: Paint) {

  rect(paint, px(BAR.counter.x) - 4, px(WALLS.back), px(BAR.counter.w) + 8, px(BAR.counter.y) - px(WALLS.back), '#3a3431')
  paintCounter(paint, BAR.counter, WOOD.top, WOOD.topHi, WOOD.front, GOLD[1])
  const y = px(BAR.counter.y)
  for (const [index, sx] of [40, 95, 150, 205].entries()) {
    const gx = px(BAR.counter.x) + sx
    rect(paint, gx, y + 6, 2, 3, index % 2 ? '#e0f4ff' : '#ffd98a')
    rect(paint, gx, y + 5, 2, 1, '#ffffff')
  }
  for (const sx of BAR.stools) {
    const cx = px(sx)
    const cy = px(BAR.stoolY)
    ellipse(paint, cx, cy + 1, 5, 3, 'rgba(0,0,0,0.3)')
    ellipse(paint, cx, cy, 4, 2.5, '#6a3a2a')
    ellipse(paint, cx, cy - 1, 3, 1.5, '#8a5038')
  }
}

function paintBooth(paint: Paint) {
  rect(paint, px(BOOTH.counter.x) - 4, px(WALLS.back), px(BOOTH.counter.w) + 8, px(BOOTH.counter.y) - px(WALLS.back), '#343a3f')
  paintCounter(paint, BOOTH.counter, STEEL.top, STEEL.topHi, STEEL.front)
  const x = px(BOOTH.counter.x)
  const y = px(BOOTH.counter.y)
  const w = px(BOOTH.counter.w)

  for (let gx = x + 20; gx < x + w - 20; gx += 4) rect(paint, gx, y - 20, 1, 18, STEEL.line)
  rect(paint, x + 40, y + 6, 10, 4, '#f0e6c8')
  rect(paint, x + 41, y + 5, 10, 4, '#fff6dc')
  rect(paint, x + w - 60, y + 6, 8, 4, GOLD[2])
  rect(paint, x + w - 58, y + 5, 8, 4, GOLD[3])
}

function paintStall(paint: Paint, random: () => number) {
  const { stall } = VENDOR
  const x = px(stall.x)
  const y = px(stall.y)
  const w = px(stall.w)
  const h = px(stall.h)
  rect(paint, x, y, w, h - 10, CLOTH.top)
  rect(paint, x, y, w, 2, CLOTH.topHi)
  rect(paint, x, y + h - 10, w, 10, CLOTH.front)
  for (let gx = x + 3; gx < x + w - 3; gx += 6) rect(paint, gx, y + h - 8, 2, 6, 'rgba(255,255,255,0.08)')
  const parts = ['#e7b04f', '#6ff0de', '#e06060', '#6a8ae0', '#b9fff1', '#ffd98a', '#9a7046']
  for (let index = 0; index < 14; index++) {
    const gx = x + 4 + Math.floor(random() * (w - 10))
    const gy = y + 4 + Math.floor(random() * (h - 18))
    rect(paint, gx, gy, 3, 2, parts[Math.floor(random() * parts.length)])
    rect(paint, gx, gy, 1, 1, '#ffffff')
  }
  const sign = 'SUCATA & SEGREDOS'
  const sx = x + Math.floor(w / 2) - Math.floor(textWidth(sign) / 2)
  rect(paint, sx - 3, y - 14, textWidth(sign) + 6, 11, INK)
  rect(paint, sx - 2, y - 13, textWidth(sign) + 4, 9, '#2a1f30')
  paintText(paint, sign, sx, y - 12, GOLD[2])
  rect(paint, x + Math.floor(w / 2) - 1, y - 3, 2, 3, METAL[2])
}

function paintTable(paint: Paint, [cx, cy]: Point) {
  const x = px(cx)
  const y = px(cy)
  const rx = px(TABLE_RADIUS.rx)
  const ry = px(TABLE_RADIUS.ry)

  for (const [dx, dy] of [
    [-rx - 4, 0],
    [rx + 1, 0],
    [-4, -ry - 5],
    [-4, ry + 1],
  ]) {
    rect(paint, x + dx, y + dy, 5, 4, WOOD.front)
    rect(paint, x + dx, y + dy, 5, 1, WOOD.top)
  }
  ellipse(paint, x, y + 3, rx, ry, 'rgba(0,0,0,0.3)')
  ellipse(paint, x, y, rx, ry, WOOD.dark)
  ellipse(paint, x, y - 2, rx, ry, WOOD.top)
  ellipse(paint, x - 4, y - 5, rx * 0.5, ry * 0.4, WOOD.topHi)
  rect(paint, x - 6, y - 4, 2, 3, '#ffd98a')
  rect(paint, x + 4, y - 1, 2, 3, '#e0f4ff')
  rect(paint, x - 1, y + 2, 3, 2, '#f0e6c8')
}

function paintCrate(paint: Paint, [cx, cy]: Point) {
  const x = px(cx) - 15
  const y = px(cy) - 18
  rect(paint, x, y + 6, 36, 12, WOOD.front)
  rect(paint, x, y, 36, 7, WOOD.plank)
  rect(paint, x, y, 36, 1, WOOD.top)
  rect(paint, x, y + 6, 36, 1, WOOD.dark)
  for (let index = 1; index < 6; index++) rect(paint, x + index * 6, y + 7, 1, 11, WOOD.dark)
  rect(paint, x + 2, y + 9, 32, 1, WOOD.plankLo)
  paintText(paint, 'LIGA', x + 10, y + 10, GOLD[0])
}

function paintBarrel(paint: Paint, [cx, cy]: Point) {
  const x = px(cx) - 10
  const y = px(cy) - 24
  ellipse(paint, x + 10, y + 25, 11, 4, 'rgba(0,0,0,0.3)')
  rect(paint, x, y + 3, 20, 20, '#5a3a24')
  rect(paint, x + 7, y + 3, 5, 20, '#6e4a2e')
  ellipse(paint, x + 10, y + 3, 10, 3, '#7a5436')
  ellipse(paint, x + 10, y + 3, 7, 2, '#4a3220')
  rect(paint, x, y + 7, 20, 2, METAL[1])
  rect(paint, x, y + 18, 20, 2, METAL[1])
}

function paintBench(paint: Paint, [cx, cy]: Point) {
  const x = px(cx) - 11
  const y = px(cy) - 8
  rect(paint, x + 1, y + 7, 2, 4, WOOD.dark)
  rect(paint, x + 20, y + 7, 2, 4, WOOD.dark)
  rect(paint, x, y, 23, 6, WOOD.plank)
  rect(paint, x, y, 23, 1, WOOD.top)
  rect(paint, x, y + 6, 23, 2, WOOD.plankLo)
}

function paintRing(paint: Paint, ring: Rect, main: boolean) {
  const x = px(ring.x)
  const y = px(ring.y)
  const w = px(ring.w)
  const h = px(ring.h)

  rect(paint, x - 6, y - 4, w + 12, h + 12, CANVAS.apronLo)
  rect(paint, x - 5, y - 5, w + 10, h + 10, CANVAS.apron)
  rect(paint, x - 5, y - 5, w + 10, 1, CANVAS.apronHi)
  rect(paint, x - 5, y + h + 2, w + 10, 3, CANVAS.apronLo)
  rect(paint, x, y, w, h, CANVAS.base)
  for (let gx = x + 25; gx < x + w; gx += 25) rect(paint, gx, y, 1, h, CANVAS.seam)
  for (let gy = y + 25; gy < y + h; gy += 25) rect(paint, x, gy, w, 1, CANVAS.seam)
  ellipse(paint, x + w / 2, y + h / 2, w * 0.3, h * 0.26, CANVAS.worn)
  if (main) {
    const cx = x + Math.floor(w / 2)
    const cy = y + Math.floor(h / 2)
    paint.lineWidth = 2
    paint.strokeStyle = CANVAS.apron
    paint.beginPath()
    paint.ellipse(cx, cy, 34, 20, 0, 0, Math.PI * 2)
    paint.stroke()
    paint.beginPath()
    paint.ellipse(cx, cy, 22, 13, 0, 0, Math.PI * 2)
    paint.stroke()
    paint.lineWidth = 1
    rect(paint, cx - 1, cy - 7, 2, 14, CANVAS.apron)
    rect(paint, cx - 7, cy - 1, 14, 2, CANVAS.apron)
    const mark = 'LIGA'
    paintText(paint, mark, cx - Math.floor(textWidth(mark) / 2), cy + 22, CANVAS.apron)

    rect(paint, cx - 8, y + h + 5, 16, 3, WOOD.plank)
    rect(paint, cx - 7, y + h + 8, 14, 3, WOOD.plankLo)
    rect(paint, cx - 6, y + h + 11, 12, 2, WOOD.dark)
  }

  const strands: [string, string][] = [
    [ROPE.red, ROPE.redHi],
    [ROPE.white, ROPE.white],
    [ROPE.blue, ROPE.blueHi],
  ]
  for (const [index, [colour, hi]] of strands.entries()) {
    const lift = 10 - index * 4
    rect(paint, x, y - lift, w, 2, colour)
    rect(paint, x, y - lift, w, 1, hi)
    rect(paint, x, y + h - lift, w, 2, colour)
    rect(paint, x, y + h - lift, w, 1, hi)
    rect(paint, x + index * 2, y - 10, 1, h, colour)
    rect(paint, x + w - 1 - index * 2, y - 10, 1, h, colour)
  }
  rect(paint, x, y + h + 1, w, 1, ROPE.shadow)

  for (const [cx, cy] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ]) {
    rect(paint, cx - 3, cy - 16, 6, 18, METAL[1])
    rect(paint, cx - 3, cy - 16, 2, 18, METAL[3])
    rect(paint, cx + 2, cy - 16, 1, 18, METAL[0])
    rect(paint, cx - 3, cy - 18, 6, 3, main ? GOLD[2] : ROPE.red)
    rect(paint, cx - 3, cy - 18, 6, 1, main ? GOLD[4] : ROPE.redHi)
  }
}

function paintSideWalls(paint: Paint) {
  const w = px(LEAGUE_ROOM.width)
  const h = px(LEAGUE_ROOM.height)
  const side = px(WALLS.side)
  rect(paint, 0, 0, side, h, WALL.rim)
  rect(paint, w - side, 0, side, h, WALL.rim)
  rect(paint, side - 2, px(WALLS.back), 2, h - px(WALLS.back), WALL.rimHi)
  rect(paint, w - side, px(WALLS.back), 2, h - px(WALLS.back), WALL.rimHi)
  for (let y = px(WALLS.back) + 8; y < h; y += 40) {
    rect(paint, 2, y, side - 6, 1, WALL.panel)
    rect(paint, w - side + 4, y, side - 6, 1, WALL.panel)
  }
}

function paintFrontWall(paint: Paint) {
  const w = px(LEAGUE_ROOM.width)
  const h = px(LEAGUE_ROOM.height)
  const front = px(WALLS.front)
  const top = h - front
  rect(paint, 0, top, w, front, WALL.rim)
  rect(paint, 0, top, w, 2, WALL.rimHi)
  const x0 = px(DOOR.x0)
  const x1 = px(DOOR.x1)
  rect(paint, x0, top, x1 - x0, front, DOOR_COLOR.dark)
  const gradient = paint.createLinearGradient(0, h, 0, top)
  gradient.addColorStop(0, DOOR_COLOR.street)
  gradient.addColorStop(1, 'rgba(90, 74, 58, 0)')
  paint.fillStyle = gradient
  paint.fillRect(x0 + 2, top, x1 - x0 - 4, front)
  for (const lx of [x0 - 7, x1 + 1]) {
    rect(paint, lx, top - 20, 6, 20 + front, DOOR_COLOR.leaf)
    rect(paint, lx, top - 20, 1, 20 + front, DOOR_COLOR.leafHi)
    rect(paint, lx + 2, top - 6, 2, 3, GOLD[2])
  }
  const sign = 'SAIDA'
  paintText(paint, sign, Math.floor((x0 + x1) / 2) - Math.floor(textWidth(sign) / 2), top - 32, '#7ef0a0')
}

function paintScraps(paint: Paint, random: () => number) {
  const scraps = ['#e06060', '#6a8ae0', '#ffd98a', '#f0e6c8']
  for (const ring of SIDE_RINGS) {
    for (let index = 0; index < 40; index++) {
      const angle = random() * Math.PI * 2
      const reach = 1.1 + random() * 0.5
      const x = px(ring.rect.x + ring.rect.w / 2 + Math.cos(angle) * (ring.rect.w / 2) * reach)
      const y = px(ring.rect.y + ring.rect.h / 2 + Math.sin(angle) * (ring.rect.h / 2) * reach)
      rect(paint, x, y, 1 + Math.floor(random() * 2), 1, scraps[Math.floor(random() * scraps.length)])
    }
  }
}

export function paintLeagueFloor(): HTMLCanvasElement {
  const paint = canvasOf(px(LEAGUE_ROOM.width), px(LEAGUE_ROOM.height))
  const random = rng(20481)
  paintConcrete(paint, random)
  paintLightPools(paint)
  paintCarpet(paint, random)
  paintBackWall(paint)
  paintNeonSign(paint)
  paintShelves(paint, random)
  paintOddsBoard(paint, random)
  paintPoster(paint, 350, 28, '#8a2c38', '#1a0c10', 'NOITE 12')
  paintPoster(paint, 392, 30, '#2a4a7a', '#0a1020', 'CINZA')
  paintPoster(paint, 846, 30, '#c08433', '#2a1a06', 'FAISCA')
  paintPoster(paint, 888, 28, '#3f6a3a', '#0c1a0c', 'BRISA')
  paintScraps(paint, random)
  for (const ring of RINGS) paintRing(paint, ring.rect, ring.id === MAIN_RING.id)
  for (const bench of MAIN_RING_BENCHES) paintBench(paint, bench)
  paintBar(paint)
  paintBooth(paint)
  paintStall(paint, random)
  for (const table of TABLES) paintTable(paint, table.at)
  for (const crate of CRATES) paintCrate(paint, crate)
  for (const barrel of BARRELS) paintBarrel(paint, barrel)
  paintSideWalls(paint)
  paintFrontWall(paint)
  return paint.canvas
}
