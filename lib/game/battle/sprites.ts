import type { RGB } from '../fx/textures'
import { CLASS_CRYSTAL, HOLLOW_CRYSTAL, paintCrystal, type CrystalPalette } from '../robot/crystal'
import type { RobotComposer, RobotSheets } from '../robot/sprites'
import { ANCHOR, DIRECTIONS, FRAME, ROW, type Direction } from '../sprite'
import { BOSSES, type BossId } from './bosses'
import type { RobotClass } from './classes'
import { ELEMENTS, type Element } from './elements'
import { ENEMIES, type EnemyDef, type EnemyKind } from './enemies'

const TINT_STRENGTH = 0.78
const GLOW_THRESHOLD = 236

const ELEMENT_TINT = 0.55

const FORASTEIRO_TINT: RGB = [96, 70, 140]
const FORASTEIRO_GLOW: RGB = [190, 120, 255]

export type EnemyLook = { kind: EnemyKind; element?: Element; boss?: BossId; cls?: RobotClass; forasteiro?: boolean }

export class EnemyArt {
  private readonly cache = new Map<string, RobotSheets>()

  constructor(private readonly composer: RobotComposer) {}

  sheets(look: EnemyLook): RobotSheets {
    const { kind, element, boss, cls, forasteiro } = look
    const key = `${boss ?? kind}:${element ?? ''}:${cls ?? ''}:${forasteiro ? 'f' : ''}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const base: EnemyDef = boss ? BOSSES[boss] : ENEMIES[kind]

    const blend = boss ? ELEMENT_TINT * 0.4 : ELEMENT_TINT
    let def: EnemyDef = element ? { ...base, tint: mix(base.tint, ELEMENTS[element].color, blend), glow: boss ? base.glow : ELEMENTS[element].glow } : base
    if (forasteiro && !boss) def = { ...def, tint: mix(def.tint, FORASTEIRO_TINT, 0.7), glow: mix(def.glow, FORASTEIRO_GLOW, 0.6) }
    const crystal = forasteiro ? HOLLOW_CRYSTAL : cls ? CLASS_CRYSTAL[cls] : null
    const built = def.loadout ? recolour(this.composer.compose(def.loadout), def, crystal) : alienSheets(def)
    this.cache.set(key, built)
    return built
  }

  portrait(look: EnemyLook) {
    return { image: this.sheets(look).idle, sx: 0, sy: ROW.s * FRAME.height, width: FRAME.width, height: FRAME.height }
  }
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

function canvas(width: number, height: number) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  const context = element.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para os inimigos.')
  context.imageSmoothingEnabled = false
  return context
}

function recolour(sheets: RobotSheets, def: Pick<EnemyDef, 'tint' | 'glow'>, crystal: CrystalPalette | null = null): RobotSheets {
  const idle = tint(sheets.idle, def.tint, def.glow, crystal)
  const walk = tint(sheets.walk, def.tint, def.glow, crystal)
  return { idle, walk, idleGlow: silhouette(idle), walkGlow: silhouette(walk) }
}

export function tintSheets(sheets: RobotSheets, colour: RGB, glow: RGB, crystal: CrystalPalette | null = null): RobotSheets {
  return recolour(sheets, { tint: colour, glow }, crystal)
}

function tint(sheet: HTMLCanvasElement, colour: RGB, glow: RGB, crystal: CrystalPalette | null): HTMLCanvasElement {
  const target = canvas(sheet.width, sheet.height)
  target.drawImage(sheet, 0, 0)
  const image = target.getImageData(0, 0, sheet.width, sheet.height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    if (luminance >= GLOW_THRESHOLD) {
      data[i] = glow[0]
      data[i + 1] = glow[1]
      data[i + 2] = glow[2]
      continue
    }
    const shade = Math.min(1.25, luminance / 170)
    data[i] = Math.round(r * (1 - TINT_STRENGTH) + Math.min(255, colour[0] * shade) * TINT_STRENGTH)
    data[i + 1] = Math.round(g * (1 - TINT_STRENGTH) + Math.min(255, colour[1] * shade) * TINT_STRENGTH)
    data[i + 2] = Math.round(b * (1 - TINT_STRENGTH) + Math.min(255, colour[2] * shade) * TINT_STRENGTH)
  }
  target.putImageData(image, 0, 0)
  if (crystal) {
    const frames = sheet.width / FRAME.width
    for (const direction of DIRECTIONS) {
      const y = ROW[direction] * FRAME.height
      for (let frame = 0; frame < frames; frame++) paintCrystal(target, frame * FRAME.width, y, direction, frames === 1 ? -1 : frame, crystal)
    }
  }
  return target.canvas
}

export function silhouette(sheet: HTMLCanvasElement): HTMLCanvasElement {
  const context = canvas(sheet.width, sheet.height)
  context.drawImage(sheet, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = '#fff8ec'
  context.fillRect(0, 0, sheet.width, sheet.height)
  return context.canvas
}

const rgb = ([r, g, b]: RGB, alpha = 1) => `rgba(${r},${g},${b},${alpha})`
const darker = ([r, g, b]: RGB, amount: number): RGB => [Math.round(r * amount), Math.round(g * amount), Math.round(b * amount)]
const lighter = ([r, g, b]: RGB, amount: number): RGB => [
  Math.min(255, Math.round(r + (255 - r) * amount)),
  Math.min(255, Math.round(g + (255 - g) * amount)),
  Math.min(255, Math.round(b + (255 - b) * amount)),
]

const EYES: Record<Direction, readonly [number, number] | null> = {
  s: [0, 1],
  sw: [-3, 1],
  w: [-6, 0],
  nw: null,
  n: null,
  ne: null,
  e: [6, 0],
  se: [3, 1],
}

function alienSheets(def: EnemyDef): RobotSheets {
  const idle = canvas(FRAME.width, FRAME.height * DIRECTIONS.length)
  const walk = canvas(FRAME.width * FRAME.walkFrames, FRAME.height * DIRECTIONS.length)
  for (const direction of DIRECTIONS) {
    const y = ROW[direction] * FRAME.height
    paintAlien(idle, 0, y, direction, 0, def)
    for (let frame = 0; frame < FRAME.walkFrames; frame++) paintAlien(walk, frame * FRAME.width, y, direction, frame / FRAME.walkFrames, def)
  }
  return { idle: idle.canvas, walk: walk.canvas, idleGlow: silhouette(idle.canvas), walkGlow: silhouette(walk.canvas) }
}

function paintAlien(paint: CanvasRenderingContext2D, left: number, top: number, direction: Direction, phase: number, def: EnemyDef) {
  const wave = Math.sin(phase * Math.PI * 2)
  const bob = Math.round(wave * 1.5)
  const centerX = left + ANCHOR.x
  const feet = top + ANCHOR.y
  const body = def.tint
  const rim = darker(body, 0.55)
  const shine = lighter(body, 0.45)
  const glow = def.glow

  for (let i = -1; i <= 1; i++) {
    const sway = Math.round(Math.sin(phase * Math.PI * 2 + i * 1.7) * 2)
    const x = centerX + i * 5 + sway
    paint.fillStyle = rgb(rim)
    paint.fillRect(x, feet - 15 + bob, 2, 10 - Math.abs(i) * 2)
    paint.fillStyle = rgb(body)
    paint.fillRect(x, feet - 15 + bob, 1, 7 - Math.abs(i) * 2)
  }
  paint.fillStyle = rgb(rim)
  paint.fillRect(centerX - 5, feet - 23 + bob, 10, 10)
  paint.fillStyle = rgb(body)
  paint.fillRect(centerX - 4, feet - 23 + bob, 8, 9)
  paint.fillStyle = rgb(shine)
  paint.fillRect(centerX - 3, feet - 22 + bob, 2, 4)
  paint.fillStyle = rgb(glow, 0.7 + 0.3 * wave)
  paint.fillRect(centerX - 1, feet - 20 + bob, 2, 3)
  const headY = feet - 36 + bob
  ellipse(paint, centerX, headY, 9, 12, rgb(rim))
  ellipse(paint, centerX, headY, 8, 11, rgb(body))
  ellipse(paint, centerX - 3, headY - 4, 3, 4, rgb(shine))
  const eyes = EYES[direction]
  if (eyes) {
    const [ex, ey] = eyes
    for (const side of [-1, 1]) {
      const x = centerX + ex + side * 3
      const squint = Math.abs(ex) >= 6 && Math.sign(side) !== Math.sign(ex) ? 1 : 0
      if (Math.abs(ex) >= 6 && squint) continue
      paint.fillStyle = '#120a1e'
      paint.fillRect(x - 2, headY + ey - 1, 4, 5)
      paint.fillStyle = rgb(glow)
      paint.fillRect(x - 1, headY + ey, 2, 3)
      paint.fillStyle = '#ffffff'
      paint.fillRect(x - 1, headY + ey, 1, 1)
    }
  } else {
    paint.fillStyle = rgb(glow, 0.5)
    for (let i = 0; i < 3; i++) paint.fillRect(centerX - 1, headY - 6 + i * 4, 2, 2)
  }
}

function ellipse(paint: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, colour: string) {
  paint.fillStyle = colour
  for (let y = -ry; y <= ry; y++) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)))
    paint.fillRect(cx - span, cy + y, span * 2 + 1, 1)
  }
}
