import { drawArt, drawGlow, pushLight, type Entry } from '../game/city'
import { canvasOf, GOLD, METAL, pixel } from '../game/fx/plate'
import type { RGB } from '../game/fx/textures'
import { BAR, BOOTH, CEILING_LAMPS, DOOR, LEAGUE_ROOM, MAIN_RING, MAIN_RING_LAMPS, VENDOR, WALLS } from './layout'

const WARM: RGB = [255, 206, 140]
const RING_LIGHT: RGB = [255, 236, 200]
const NEON: RGB = [255, 106, 213]
const STREET: RGB = [150, 190, 230]
const BOTTLE: RGB = [120, 220, 255]
const BOARD: RGB = [126, 240, 160]
const LANTERN: RGB = [255, 214, 150]

const HANG = 150
const RING_HANG = 190

function paintFixture(wide: boolean): HTMLCanvasElement {
  const width = wide ? 15 : 11
  const height = 20
  const paint = canvasOf(width, height)
  const center = Math.floor(width / 2)
  pixel(paint, center, 0, METAL[0], 1, 11)
  pixel(paint, center - 1, 11, METAL[1], 3, 1)
  for (let row = 0; row < 5; row++) {
    const half = 1 + row
    pixel(paint, center - half, 12 + row, row === 4 ? METAL[3] : METAL[1], half * 2 + 1, 1)
    pixel(paint, center - half, 12 + row, METAL[2])
  }
  pixel(paint, center - 2, 17, GOLD[3], 5, 2)
  pixel(paint, center - 1, 18, GOLD[4], 3, 1)
  return paint.canvas
}

function hangingLamp(x: number, y: number, art: HTMLCanvasElement, hang: number, colour: RGB, radius: number, phase: number): Entry {
  const top = y - hang
  return {
    depth: y + 2,
    x0: x - 200,
    y0: top - 120,
    x1: x + 200,
    y1: y + 80,
    cover: null,
    draw: (frame) => drawArt(frame, art, x, top, Math.floor(art.width / 2), art.height - 2),
    glow: (frame) => {
      const flicker = 0.9 + 0.06 * Math.sin(frame.time * 5.1 + phase) + 0.04 * Math.sin(frame.time * 11.7 + phase)
      drawGlow(frame, colour, x, top + 4, 64, 0.5 * flicker)
      drawGlow(frame, colour, x, top + 4, 24, 0.7 * flicker)
    },
    light: (frame, out, night) => pushLight(frame, out, x, y - 30, radius, colour, 0.85 * night),
  }
}

function neonSign(): Entry {
  const x = MAIN_RING.rect.x + MAIN_RING.rect.w / 2
  const y = 150
  return {
    depth: 1,
    x0: x - 700,
    y0: 0,
    x1: x + 700,
    y1: WALLS.back + 200,
    cover: null,
    glow: (frame) => {
      const hum = 0.86 + 0.1 * Math.sin(frame.time * 1.7) + (Math.sin(frame.time * 23) > 0.97 ? -0.3 : 0)
      drawGlow(frame, NEON, x - 300, y, 170, 0.28 * hum)
      drawGlow(frame, NEON, x, y, 220, 0.34 * hum)
      drawGlow(frame, NEON, x + 300, y, 170, 0.28 * hum)
    },
    light: (frame, out, night) => {
      pushLight(frame, out, x - 240, y + 120, 520, NEON, 0.35 * night)
      pushLight(frame, out, x + 240, y + 120, 520, NEON, 0.35 * night)
    },
  }
}

function doorLight(): Entry {
  const x = (DOOR.x0 + DOOR.x1) / 2
  const y = LEAGUE_ROOM.height - WALLS.front
  return {
    depth: LEAGUE_ROOM.height + 10,
    x0: x - 300,
    y0: y - 300,
    x1: x + 300,
    y1: LEAGUE_ROOM.height,
    cover: null,
    glow: (frame) => drawGlow(frame, STREET, x, y + 40, 150, 0.22),
    light: (frame, out, night) => pushLight(frame, out, x, y - 40, 380, STREET, 0.5 * night),
  }
}

function softGlow(x: number, y: number, colour: RGB, radius: number, alpha: number, lightRadius: number, intensity: number, depth: number): Entry {
  return {
    depth,
    x0: x - radius * 2,
    y0: y - radius * 2,
    x1: x + radius * 2,
    y1: y + radius * 2,
    cover: null,
    glow: (frame) => drawGlow(frame, colour, x, y, radius, alpha * (0.9 + 0.1 * Math.sin(frame.time * 2.2 + x))),
    light: (frame, out, night) => pushLight(frame, out, x, y, lightRadius, colour, intensity * night),
  }
}

function ringPosts(): Entry[] {
  const { rect } = MAIN_RING
  return [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h],
  ].map(([x, y]) => ({
    depth: y + 1,
    x0: x - 100,
    y0: y - 160,
    x1: x + 100,
    y1: y + 40,
    cover: null,
    glow: (frame) => drawGlow(frame, GOLD_LIGHT, x, y - 68, 40, 0.3 + 0.1 * Math.sin(frame.time * 3 + x * 0.01)),
  }))
}

const GOLD_LIGHT: RGB = [255, 217, 138]

export function leagueProps(): Entry[] {
  const plain = paintFixture(false)
  const wide = paintFixture(true)
  const ringLamps = new Set(MAIN_RING_LAMPS.map(([x, y]) => `${x}:${y}`))
  const lamps = CEILING_LAMPS.map(([x, y], index) => {
    const ring = ringLamps.has(`${x}:${y}`)
    return hangingLamp(x, y, ring ? wide : plain, ring ? RING_HANG : HANG, ring ? RING_LIGHT : WARM, ring ? 560 : 460, index * 1.3)
  })
  const barX = BAR.counter.x + BAR.counter.w / 2
  const boothX = BOOTH.counter.x + BOOTH.counter.w / 2
  return [
    ...lamps,
    neonSign(),
    doorLight(),
    ...ringPosts(),
    softGlow(barX - 300, 190, BOTTLE, 110, 0.18, 300, 0.25, 2),
    softGlow(barX + 300, 190, BOTTLE, 110, 0.18, 300, 0.25, 2),
    softGlow(boothX, 170, BOARD, 150, 0.2, 360, 0.3, 2),
    softGlow(VENDOR.stall.x + VENDOR.stall.w / 2, VENDOR.stall.y - 30, LANTERN, 70, 0.5, 300, 0.6, VENDOR.stall.y - 1),
  ]
}
