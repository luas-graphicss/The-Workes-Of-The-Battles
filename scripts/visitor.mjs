import { createCanvas, ImageData } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BODY_BOB, MIRROR } from './robot-parts/anatomy.mjs'
import { CELL, Layer, WALK_FRAMES } from './robot-parts/raster.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/game/assets/visitor')
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))

const K = 1
const SKIN = 2
const SKIN_SH = 3
const SKIN_HI = 4
const SUIT = 5
const SUIT_HI = 6
const SEAM = 7
const EYE = 8
const GLOW = 9
const W = 10
const CORE = 11
const RIM = 12

const PALETTE = {
  [K]: [26, 18, 42],
  [SKIN]: [172, 164, 204],
  [SKIN_SH]: [118, 106, 158],
  [SKIN_HI]: [222, 216, 242],
  [SUIT]: [40, 32, 64],
  [SUIT_HI]: [72, 60, 108],
  [SEAM]: [152, 110, 240],
  [EYE]: [14, 8, 28],
  [GLOW]: [202, 168, 255],
  [W]: [250, 246, 255],
  [CORE]: [30, 24, 48],
  [RIM]: [100, 84, 150],
}

const DIRECTIONS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
const STRIDE = [0, 3, 3, 0, -3, -3]
const LIFT_LEFT = [1, 2, 1, 0, 0, 0]
const LIFT_RIGHT = [0, 0, 0, 1, 2, 1]
const SWING_LEFT = [0, 0, 0, -1, -2, -1]
const SWING_RIGHT = [-1, -2, -1, 0, 0, 0]

const at = (table, frame) => (frame < 0 ? 0 : table[frame])

function shape(L, x0, y0, rows, fill) {
  const inside = (x, y) => {
    const row = rows[y - y0]
    return row !== undefined && x >= x0 + row[0] && x < x0 + row[0] + row[1]
  }
  rows.forEach(([inset, width], index) => {
    const y = y0 + index
    for (let x = x0 + inset; x < x0 + inset + width; x++) {
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)
      L.px(x, y, edge ? K : fill)
    }
  })
}

function limb(L, x0, y0, x1, y1, fill) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) <= 1) L.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, K)
  L.line(x0, y0, x1, y1, fill)
}

function glowHand(L, x, y) {
  L.rect(x - 1, y - 1, 3, 3, K)
  L.rect(x - 1, y, 3, 1, GLOW)
  L.px(x, y - 1, GLOW)
  L.px(x, y, W)
}

const HEAD_FRONT = [[4, 4], [2, 8], [1, 10], [1, 10], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [1, 10], [1, 10], [2, 8], [3, 6], [4, 4]]
const HEAD_SIDE = [[3, 5], [1, 9], [0, 11], [0, 12], [0, 12], [0, 12], [0, 12], [0, 11], [0, 10], [1, 8], [1, 7], [2, 5], [3, 3]]

function headFront(L, x0, y0, faceShift, showFace) {
  shape(L, x0, y0, HEAD_FRONT, SKIN)
  L.vline(x0 + 10, y0 + 4, 5, SKIN_SH)
  L.vline(x0 + 9, y0 + 9, 2, SKIN_SH)
  L.hline(x0 + 4, y0 + 12, 4, SKIN_SH)
  L.hline(x0 + 3, y0 + 1, 2, SKIN_HI)
  L.px(x0 + 2, y0 + 2, SKIN_HI)
  if (!showFace) {
    L.vline(x0 + 6, y0 + 3, 8, SKIN_SH)
    L.px(x0 + 3, y0 + 3, SKIN_HI)
    return
  }
  const fx = x0 + faceShift
  L.hline(fx + 2, y0 + 6, 2, EYE)
  L.px(fx + 2, y0 + 7, EYE)
  L.px(fx + 3, y0 + 7, GLOW)
  L.px(fx + 4, y0 + 7, EYE)
  L.hline(fx + 3, y0 + 8, 2, EYE)
  L.hline(fx + 8, y0 + 6, 2, EYE)
  L.px(fx + 7, y0 + 7, EYE)
  L.px(fx + 8, y0 + 7, GLOW)
  L.px(fx + 9, y0 + 7, EYE)
  L.hline(fx + 7, y0 + 8, 2, EYE)
  L.hline(fx + 5, y0 + 11, 2, SKIN_SH)
}

function headSide(L, x0, y0) {
  shape(L, x0, y0, HEAD_SIDE, SKIN)
  L.vline(x0 + 10, y0 + 3, 4, SKIN_SH)
  L.hline(x0 + 7, y0 + 8, 2, SKIN_SH)
  L.hline(x0 + 3, y0 + 1, 3, SKIN_HI)
  L.px(x0 + 2, y0 + 2, SKIN_HI)
  L.hline(x0 + 1, y0 + 6, 2, EYE)
  L.px(x0 + 1, y0 + 7, GLOW)
  L.px(x0 + 2, y0 + 7, EYE)
  L.px(x0 + 3, y0 + 7, EYE)
  L.hline(x0 + 2, y0 + 8, 2, EYE)
  L.px(x0 + 1, y0 + 11, SKIN_SH)
}

const TORSO_FRONT = [[0, 12], [0, 12], [1, 10], [1, 10], [1, 10], [2, 8], [2, 8], [2, 8], [2, 8], [2, 8], [2, 8], [2, 8]]
const TORSO_SIDE = [[1, 7], [0, 8], [0, 8], [0, 8], [1, 7], [1, 7], [1, 7], [1, 7], [1, 7], [1, 7], [1, 7], [1, 7]]

function crystal(L, cx, y) {
  L.hline(cx - 1, y, 2, RIM)
  L.px(cx - 2, y + 1, RIM)
  L.hline(cx - 1, y + 1, 2, CORE)
  L.px(cx + 1, y + 1, RIM)
  L.hline(cx - 1, y + 2, 2, RIM)
}

function torsoFront(L, bob, back) {
  const y0 = 19 + bob
  L.rect(23, y0 - 1, 2, 1, SKIN_SH)
  shape(L, 18, y0, TORSO_FRONT, SUIT)
  L.vline(19, y0 + 1, 3, SUIT_HI)
  L.vline(20, y0 + 4, 6, SUIT_HI)
  if (back) {
    L.vline(23, y0 + 1, 10, SEAM)
    L.hline(20, y0 + 2, 8, SUIT_HI)
    return y0
  }
  L.line(19, y0 + 1, 22, y0 + 4, SEAM)
  L.line(28, y0 + 1, 25, y0 + 4, SEAM)
  L.vline(23, y0 + 7, 4, SEAM)
  L.vline(24, y0 + 7, 4, SEAM)
  crystal(L, 24, y0 + 3)
  return y0
}

function armFront(L, x, y) {
  L.box(x, y, 3, 12, SUIT)
  L.px(x + 1, y + 1, SUIT_HI)
  L.rect(x, y + 11, 3, 2, SKIN)
  L.px(x, y + 12, K)
  L.px(x + 2, y + 12, K)
  L.px(x + 1, y + 13, SKIN_SH)
}

function legsFront(L, frame) {
  const left = at(LIFT_LEFT, frame)
  const right = at(LIFT_RIGHT, frame)
  legFront(L, 19, left)
  legFront(L, 25, right)
}

function legFront(L, x, lift) {
  L.box(x, 30, 4, 12 - lift, SUIT)
  L.px(x + 1, 31, SUIT_HI)
  L.box(x - (x < 24 ? 1 : 0), 41 - lift, 5, 3, SUIT_HI)
  L.hline(x - (x < 24 ? 1 : 0) + 1, 42 - lift, 3, SEAM)
  L.hline(x - (x < 24 ? 1 : 0), 43 - lift, 5, K)
}

function torsoSide(L, bob, frame) {
  const y0 = 19 + bob
  L.rect(22, y0 - 1, 2, 1, SKIN_SH)
  shape(L, 20, y0, TORSO_SIDE, SUIT)
  L.vline(21, y0 + 2, 8, SUIT_HI)
  L.vline(25, y0 + 2, 9, SEAM)
  L.px(21, y0 + 3, RIM)
  L.px(21, y0 + 4, CORE)
  const swing = -at(STRIDE, frame)
  const x = 22 + Math.round(swing * 0.8)
  L.box(x, y0 + 1, 3, 12, SUIT)
  L.px(x + 1, y0 + 2, SUIT_HI)
  L.rect(x, y0 + 12, 3, 2, SKIN)
  L.px(x, y0 + 13, K)
  L.px(x + 2, y0 + 13, K)
}

function legsSide(L, frame) {
  const stride = at(STRIDE, frame)
  legSide(L, 23 + stride, 1)
  legSide(L, 21 - stride, 0)
}

function legSide(L, x, raise) {
  L.box(x, 30, 4, 12 - raise, SUIT)
  L.px(x + 1, 31, SUIT_HI)
  L.box(x - 1, 41 - raise, 5, 3, SUIT_HI)
  L.hline(x, 42 - raise, 3, SEAM)
  L.hline(x - 1, 43 - raise, 5, K)
}

function draw(dir, frame) {
  const L = new Layer()
  const bob = frame < 0 ? 0 : BODY_BOB[frame]
  if (dir === 'w') {
    legsSide(L, frame)
    torsoSide(L, bob, frame)
    headSide(L, 17, 6 + bob)
    return L
  }
  const back = dir === 'n' || dir === 'nw'
  legsFront(L, frame)
  const y0 = torsoFront(L, bob, back)
  armFront(L, 15, y0 + 1 + at(SWING_LEFT, frame))
  armFront(L, 30, y0 + 1 + at(SWING_RIGHT, frame))
  headFront(L, dir === 'sw' || dir === 'nw' ? 17 : 18, 5 + bob, dir === 'sw' ? -1 : 0, !back)
  return L
}

function cell(dir, frame) {
  const drawn = MIRROR[dir] ?? dir
  const layer = draw(drawn, frame)
  return MIRROR[dir] ? layer.mirrored() : layer
}

function reach() {
  const L = new Layer()
  legFront(L, 19, 0)
  legFront(L, 25, 0)
  const y0 = torsoFront(L, 0, true)
  limb(L, 17, y0 + 2, 12, y0 - 9, SUIT)
  limb(L, 30, y0 + 2, 35, y0 - 9, SUIT)
  glowHand(L, 12, y0 - 10)
  glowHand(L, 35, y0 - 10)
  headFront(L, 18, 5, 0, false)
  return L
}

function recoil() {
  const L = new Layer()
  legFront(L, 18, 2)
  legFront(L, 26, 0)
  const y0 = torsoFront(L, 1, true)
  limb(L, 17, y0 + 2, 8, y0 + 5, SUIT)
  limb(L, 30, y0 + 2, 39, y0 + 5, SUIT)
  L.rect(6, y0 + 4, 3, 2, SKIN)
  L.rect(39, y0 + 4, 3, 2, SKIN)
  headFront(L, 19, 7, 0, false)
  return L
}

function kneel() {
  const L = new Layer()
  L.box(17, 36, 8, 4, SUIT)
  L.box(14, 38, 5, 6, SUIT_HI)
  L.hline(14, 43, 5, K)
  L.box(26, 33, 4, 9, SUIT)
  L.box(25, 41, 5, 3, SUIT_HI)
  L.hline(25, 43, 5, K)
  shape(L, 18, 25, TORSO_FRONT.slice(0, 11), SUIT)
  L.vline(19, 26, 3, SUIT_HI)
  L.line(19, 26, 22, 29, SEAM)
  L.line(28, 26, 25, 29, SEAM)
  crystal(L, 24, 28)
  armFront(L, 15, 27)
  limb(L, 31, 27, 33, 38, SUIT)
  L.rect(32, 39, 3, 2, SKIN)
  headFront(L, 18, 12, 0, true)
  return L
}

function toRGBA(cells, columns) {
  const width = CELL * columns
  const height = CELL * cells.length
  const data = new Uint8ClampedArray(width * height * 4)
  cells.forEach((row, r) => {
    row.forEach((layer, c) => {
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const v = layer.d[y * CELL + x]
          if (!v) continue
          const i = ((r * CELL + y) * width + c * CELL + x) * 4
          const [red, green, blue] = PALETTE[v]
          data[i] = red
          data[i + 1] = green
          data[i + 2] = blue
          data[i + 3] = 255
        }
      }
    })
  })
  return { data, width, height }
}

async function writeSheet(file, cells, columns) {
  const { data, width, height } = toRGBA(cells, columns)
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0)
  await writeFile(file, canvas.toBuffer('image/png'))
}

async function preview(file, rows) {
  const SCALE = 6
  const columns = Math.max(...rows.map((row) => row.length))
  const canvas = createCanvas(columns * CELL * SCALE, rows.length * CELL * SCALE)
  const context = canvas.getContext('2d')
  context.fillStyle = '#3f5a3a'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  rows.forEach((row, r) =>
    row.forEach((layer, c) => {
      const { data, width, height } = toRGBA([[layer]], 1)
      const tile = createCanvas(width, height)
      tile.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0)
      context.drawImage(tile, 0, 0, CELL, CELL, c * CELL * SCALE, r * CELL * SCALE, CELL * SCALE, CELL * SCALE)
    }),
  )
  await writeFile(file, canvas.toBuffer('image/png'))
}

const idle = DIRECTIONS.map((dir) => [cell(dir, -1)])
const walk = DIRECTIONS.map((dir) => Array.from({ length: WALK_FRAMES }, (_, frame) => cell(dir, frame)))
const poses = [[reach(), recoil(), kneel()]]
await mkdir(out, { recursive: true })
await writeSheet(path.join(out, 'idle.png'), idle, 1)
await writeSheet(path.join(out, 'walk.png'), walk, WALK_FRAMES)
await writeSheet(path.join(out, 'pose.png'), poses, poses[0].length)
console.log(`Folhas dos Visitantes gravadas em ${path.relative(root, out)}`)
if (args.get('preview')) {
  await preview(args.get('preview'), [...DIRECTIONS.map((_, row) => [idle[row][0], ...walk[row]]), poses[0]])
  console.log(`Prévia em ${args.get('preview')}`)
}
