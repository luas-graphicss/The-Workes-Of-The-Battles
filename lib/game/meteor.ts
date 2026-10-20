import { METEOR, METEOR_SITE } from '../world-data'
import { glowTexture, shaftTexture, type ShaftProfile } from './fx/textures'

const GAP_PROFILE: ShaftProfile = [
  [0, 0],
  [0.24, 1],
  [0.8, 1],
  [1, 0],
]

type Vec = readonly [number, number]

type Half = { side: -1 | 1; rock: HTMLCanvasElement; glow: HTMLCanvasElement; pivotX: number }

export type MeteorArt = {
  rock: HTMLImageElement
  glow: HTMLImageElement
  width: number
  height: number
  halves: readonly [Half, Half]
  crack: readonly Vec[]
}

export type MeteorPose = {
  visible: boolean
  crack: number
  split: number
  heat: number
  jitter: number
  gap: number
  rays: number
  time: number
}

const CRACK: readonly Vec[] = [
  [0.53, -0.02],
  [0.49, 0.1],
  [0.55, 0.22],
  [0.5, 0.35],
  [0.54, 0.5],
  [0.47, 0.63],
  [0.52, 0.76],
  [0.46, 0.89],
  [0.5, 1.02],
]
const CRACK_MIDDLE = 4

export function prepareMeteor(rock: HTMLImageElement, glow: HTMLImageElement): MeteorArt {
  const width = rock.naturalWidth
  const height = rock.naturalHeight
  const crack = CRACK.map(([x, y]) => [x * width, y * height] as const)
  const [left, right] = ([-1, 1] as const).map((side) => {
    const edge = side < 0 ? -4 : width + 4
    const outline: Vec[] = [[edge, -4], ...crack, [edge, height + 4]]
    const rockHalf = clippedCopy(rock, outline, width, height, (context) => {
      strokePath(context, crack, 16, '#2a0f0b')
      strokePath(context, crack, 7, '#b4461c')
    })
    const glowHalf = clippedCopy(glow, outline, width, height, (context) => {
      strokePath(context, crack, 12, 'rgba(255,150,70,0.85)')
      strokePath(context, crack, 4, 'rgba(255,244,214,1)')
    })
    return { side, rock: rockHalf, glow: glowHalf, pivotX: side < 0 ? width * 0.25 : width * 0.75 }
  })
  return { rock, glow, width, height, halves: [left, right], crack }
}

function clippedCopy(
  source: CanvasImageSource,
  outline: readonly Vec[],
  width: number,
  height: number,
  decorate: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para o meteoro.')
  context.beginPath()
  outline.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
  context.closePath()
  context.clip()
  context.drawImage(source, 0, 0)
  context.globalCompositeOperation = 'source-atop'
  decorate(context)
  return canvas
}

function strokePath(context: CanvasRenderingContext2D, points: readonly Vec[], width: number, color: string) {
  context.beginPath()
  points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)))
  context.lineWidth = width
  context.lineJoin = 'round'
  context.lineCap = 'round'
  context.strokeStyle = color
  context.stroke()
}

function spriteScale(art: MeteorArt, zoom: number) {
  return (METEOR.width * zoom) / art.width
}

const REACH = 3.2

function offscreen(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
  const reach = METEOR.width * zoom * REACH
  const centerX = originX + METEOR_SITE[0] * zoom
  const centerY = originY + METEOR_SITE[1] * zoom
  const { width, height } = context.canvas
  return centerX + reach < 0 || centerY + reach < 0 || centerX - reach > width || centerY - reach > height
}

function jitterOffset(pose: MeteorPose): Vec {
  if (!pose.jitter) return [0, 0]
  return [Math.sin(pose.time * 71) * pose.jitter, Math.cos(pose.time * 53) * pose.jitter * 0.6]
}

function halfTransform(
  context: CanvasRenderingContext2D,
  art: MeteorArt,
  half: Half,
  originX: number,
  originY: number,
  zoom: number,
  split: number,
) {
  const scale = spriteScale(art, zoom)
  const offset = half.side * split * METEOR.splitOffset
  const angle = half.side * split * METEOR.splitTilt
  const pivotX = originX + (METEOR_SITE[0] + half.side * METEOR.width * 0.25 + offset) * zoom
  const pivotY = originY + (METEOR_SITE[1] + METEOR.height * 0.5) * zoom
  const cos = Math.cos(angle) * scale
  const sin = Math.sin(angle) * scale
  context.setTransform(cos, sin, -sin, cos, pivotX, pivotY)
  return { x: -half.pivotX, y: -art.height }
}

export function drawMeteor(
  context: CanvasRenderingContext2D,
  art: MeteorArt,
  originX: number,
  originY: number,
  zoom: number,
  pose: MeteorPose,
) {
  if (!pose.visible || offscreen(context, originX, originY, zoom)) return
  const scale = spriteScale(art, zoom)
  const [jx, jy] = jitterOffset(pose)
  const centerX = originX + (METEOR_SITE[0] + jx) * zoom
  const centerY = originY + (METEOR_SITE[1] + jy) * zoom
  const width = art.width * scale
  const height = art.height * scale

  context.fillStyle = 'rgba(14, 8, 6, 0.42)'
  if (pose.split <= 0) {
    context.beginPath()
    context.ellipse(centerX, centerY + height * 0.36, width * 0.47, height * 0.13, 0, 0, Math.PI * 2)
    context.fill()
    context.drawImage(art.rock, centerX - width / 2, centerY - height / 2, width, height)
    return
  }
  for (const half of art.halves) {
    const shadowX = centerX + (half.side * METEOR.width * 0.26 + half.side * pose.split * METEOR.splitOffset) * zoom
    context.beginPath()
    context.ellipse(shadowX, centerY + height * 0.38, width * 0.25, height * 0.12, 0, 0, Math.PI * 2)
    context.fill()
  }
  for (const half of art.halves) {
    const at = halfTransform(context, art, half, originX + jx * zoom, originY + jy * zoom, zoom, pose.split)
    context.drawImage(half.rock, at.x, at.y)
  }
  context.setTransform(1, 0, 0, 1, 0, 0)
}

export function drawMeteorGlow(
  context: CanvasRenderingContext2D,
  art: MeteorArt,
  originX: number,
  originY: number,
  zoom: number,
  pose: MeteorPose,
) {
  if (!pose.visible || offscreen(context, originX, originY, zoom)) return
  const scale = spriteScale(art, zoom)
  const [jx, jy] = jitterOffset(pose)
  const left = originX + (METEOR_SITE[0] + jx) * zoom - (art.width * scale) / 2
  const top = originY + (METEOR_SITE[1] + jy) * zoom - (art.height * scale) / 2

  for (let remaining = pose.heat; remaining > 0.01; remaining -= 1) {
    context.globalAlpha = Math.min(1, remaining)
    if (pose.split <= 0) {
      context.drawImage(art.glow, left, top, art.width * scale, art.height * scale)
    } else {
      for (const half of art.halves) {
        const at = halfTransform(context, art, half, originX + jx * zoom, originY + jy * zoom, zoom, pose.split)
        context.drawImage(half.glow, at.x, at.y)
      }
      context.setTransform(1, 0, 0, 1, 0, 0)
    }
  }
  context.globalAlpha = 1

  if (pose.rays > 0) drawRays(context, art, left, top, scale, pose)
  if (pose.crack > 0 && pose.split <= 0) {
    const points = art.crack.map(([x, y]) => [left + x * scale, top + y * scale] as const)
    const flicker = 0.8 + 0.2 * Math.sin(pose.time * 37)
    const upper = points.slice(0, CRACK_MIDDLE + 1).reverse()
    const lower = points.slice(CRACK_MIDDLE)
    for (const [width, color] of [
      [14, `rgba(255,120,40,${0.35 * flicker})`],
      [6, `rgba(255,200,120,${0.8 * flicker})`],
      [2.2, 'rgba(255,255,240,1)'],
    ] as const) {
      strokePartial(context, upper, pose.crack, width * scale, color)
      strokePartial(context, lower, pose.crack, width * scale, color)
    }
  }
  if (pose.gap > 0 && pose.split > 0) {
    const gapWidth = Math.max(4, pose.split * METEOR.splitOffset * 2 * zoom)
    const centerX = originX + (METEOR_SITE[0] + jx) * zoom
    const height = art.height * scale
    context.globalAlpha = Math.min(1, pose.gap)
    context.drawImage(shaftTexture([255, 248, 230], [255, 190, 120], GAP_PROFILE), centerX - gapWidth, top, gapWidth * 2, height)
    const glow = glowTexture([255, 226, 180])
    const size = height * 1.6 * Math.min(1.4, pose.gap)
    context.drawImage(glow, centerX - size / 2, top + height * 0.5 - size / 2, size, size)
    context.globalAlpha = 1
  }
}

function drawRays(context: CanvasRenderingContext2D, art: MeteorArt, left: number, top: number, scale: number, pose: MeteorPose) {
  const reach = art.width * scale * 2.6
  for (let i = 0; i < 12; i++) {
    const anchor = art.crack[1 + (i % (art.crack.length - 2))]
    const x = left + anchor[0] * scale
    const y = top + anchor[1] * scale
    const side = i % 2 ? 1 : -1
    const angle = (side > 0 ? 0 : Math.PI) + (fract(Math.sin(i * 12.9898) * 43758.5) - 0.5) * 1.3
    const flicker = 0.55 + 0.45 * Math.sin(pose.time * (9 + i) + i * 1.7)
    const length = reach * (0.55 + fract(Math.sin(i * 78.233) * 12345.6) * 0.6) * (0.6 + pose.rays * 0.4)
    const spread = 0.05 + fract(Math.sin(i * 3.1) * 999.1) * 0.06
    const endX = x + Math.cos(angle) * length
    const endY = y + Math.sin(angle) * length
    const gradient = context.createLinearGradient(x, y, endX, endY)
    gradient.addColorStop(0, `rgba(255,244,220,${0.55 * pose.rays * flicker})`)
    gradient.addColorStop(1, 'rgba(255,190,120,0)')
    context.fillStyle = gradient
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle - spread) * length, y + Math.sin(angle - spread) * length)
    context.lineTo(x + Math.cos(angle + spread) * length, y + Math.sin(angle + spread) * length)
    context.closePath()
    context.fill()
  }
}

function strokePartial(context: CanvasRenderingContext2D, points: readonly Vec[], fraction: number, width: number, color: string) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  let remaining = total * Math.min(1, fraction)
  context.beginPath()
  context.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length && remaining > 0; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    const length = Math.hypot(bx - ax, by - ay)
    const step = Math.min(1, remaining / length)
    context.lineTo(ax + (bx - ax) * step, ay + (by - ay) * step)
    remaining -= length
  }
  context.lineWidth = width
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = color
  context.stroke()
}

export function drawFireball(
  context: CanvasRenderingContext2D,
  art: MeteorArt,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  size: number,
  trail: number,
  spin: number,
  intensity: number,
) {
  const length = Math.hypot(directionX, directionY) || 1
  const dx = directionX / length
  const dy = directionY / length
  const layers = [
    { width: 2.6, reach: 1, head: `rgba(255,120,50,${0.5 * intensity})`, tail: 'rgba(190,40,20,0)' },
    { width: 1.45, reach: 0.85, head: `rgba(255,196,120,${0.85 * intensity})`, tail: 'rgba(255,110,40,0)' },
    { width: 0.55, reach: 0.55, head: 'rgba(255,255,244,1)', tail: 'rgba(255,220,170,0)' },
  ]
  for (const layer of layers) {
    const half = (size * layer.width) / 2
    const tailX = x - dx * trail * layer.reach
    const tailY = y - dy * trail * layer.reach
    const gradient = context.createLinearGradient(x, y, tailX, tailY)
    gradient.addColorStop(0, layer.head)
    gradient.addColorStop(1, layer.tail)
    context.fillStyle = gradient
    context.beginPath()
    context.moveTo(x - dy * half, y + dx * half)
    context.lineTo(tailX, tailY)
    context.lineTo(x + dy * half, y - dx * half)
    context.arc(x, y, half, Math.atan2(-dx, dy), Math.atan2(dx, -dy))
    context.closePath()
    context.fill()
  }

  const halo = glowTexture([255, 190, 120])
  context.globalAlpha = Math.min(1, 0.85 * intensity)
  context.drawImage(halo, x - size * 4, y - size * 4, size * 8, size * 8)
  context.globalAlpha = 1
  const core = glowTexture([255, 255, 255])
  context.drawImage(core, x - size * 1.5, y - size * 1.5, size * 3, size * 3)

  const rockSize = size * 1.25
  const rockScale = rockSize / art.width
  context.setTransform(Math.cos(spin) * rockScale, Math.sin(spin) * rockScale, -Math.sin(spin) * rockScale, Math.cos(spin) * rockScale, x, y)
  context.globalCompositeOperation = 'source-over'
  context.globalAlpha = 0.9
  context.drawImage(art.rock, -art.width / 2, -art.height / 2)
  context.globalCompositeOperation = 'lighter'
  context.globalAlpha = 1
  context.drawImage(art.glow, -art.width / 2, -art.height / 2)
  context.setTransform(1, 0, 0, 1, 0, 0)
}

function fract(value: number) {
  return value - Math.floor(value)
}
