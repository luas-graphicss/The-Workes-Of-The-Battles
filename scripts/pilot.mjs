import { createCanvas, ImageData } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BODY_BOB, MIRROR } from './robot-parts/anatomy.mjs'
import { CELL, Layer, WALK_FRAMES } from './robot-parts/raster.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/game/assets/pilot')
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))

const K = 1
const SKIN = 2
const SKIN_SH = 3
const HAIR = 4
const HAIR_HI = 5
const COAT = 6
const COAT_HI = 7
const PANTS = 8
const BOOT = 9
const W = 10
const Y = 11
const LENS = 12

const PALETTE = {
  [K]: [41, 62, 53],
  [SKIN]: [243, 201, 164],
  [SKIN_SH]: [208, 150, 116],
  [HAIR]: [92, 56, 44],
  [HAIR_HI]: [144, 94, 66],
  [COAT]: [222, 104, 66],
  [COAT_HI]: [247, 152, 98],
  [PANTS]: [60, 80, 108],
  [BOOT]: [72, 52, 46],
  [W]: [255, 253, 245],
  [Y]: [239, 199, 103],
  [LENS]: [128, 214, 204],
}

const DIRECTIONS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']
const STRIDE = [0, 3, 3, 0, -3, -3]
const LIFT_LEFT = [1, 2, 1, 0, 0, 0]
const LIFT_RIGHT = [0, 0, 0, 1, 2, 1]
const SWING_LEFT = [0, 0, 0, -1, -2, -1]
const SWING_RIGHT = [-1, -2, -1, 0, 0, 0]

const at = (table, frame) => (frame < 0 ? 0 : table[frame])

function headFront(L, x0, bob, faceShift, showFace) {
  const y0 = 12 + bob
  L.box(x0, y0, 14, 13, SKIN, { round: true })
  L.rect(x0 + 1, y0 + 1, 12, 2, HAIR)
  L.hline(x0 + 2, y0 + 1, 5, HAIR_HI)
  L.px(x0 + 1, y0 + 3, HAIR)
  L.px(x0 + 12, y0 + 3, HAIR)
  if (!showFace) {
    L.rect(x0 + 1, y0 + 3, 12, 9, HAIR)
    L.hline(x0 + 1, y0 + 4, 12, Y)
    L.px(x0 + 6, y0 + 4, K)
    L.px(x0 + 7, y0 + 4, K)
    L.vline(x0 + 3, y0 + 6, 4, HAIR_HI)
    L.hline(x0 + 2, y0 + 11, 10, HAIR)
    L.rect(x0 + 4, y0 + 12, 6, 1, SKIN_SH)
    return
  }
  L.hline(x0 + 1, y0 + 3, 12, Y)
  for (const lx of [x0 + 2, x0 + 8]) {
    L.rect(lx, y0 + 2, 4, 3, K)
    L.rect(lx + 1, y0 + 3, 2, 1, LENS)
    L.px(lx + 1, y0 + 3, W)
  }
  L.vline(x0 + 1, y0 + 5, 2, HAIR)
  L.vline(x0 + 12, y0 + 5, 2, HAIR)
  const fx = x0 + 7 + faceShift
  L.px(fx - 3, y0 + 7, K)
  L.px(fx + 2, y0 + 7, K)
  L.hline(fx - 3, y0 + 6, 2, HAIR)
  L.hline(fx + 1, y0 + 6, 2, HAIR)
  L.px(fx, y0 + 10, SKIN_SH)
  L.hline(x0 + 3, y0 + 11, 8, SKIN_SH)
  L.rect(x0 + 1, y0 + 5, 1, 2, HAIR)
}

function headSide(L, bob) {
  const y0 = 12 + bob
  const x0 = 18
  L.box(x0, y0, 12, 13, SKIN, { round: true })
  L.rect(x0 + 1, y0 + 1, 10, 2, HAIR)
  L.rect(x0 + 6, y0 + 3, 5, 9, HAIR)
  L.hline(x0 + 2, y0 + 1, 4, HAIR_HI)
  L.vline(x0 + 9, y0 + 4, 4, HAIR_HI)
  L.hline(x0 + 1, y0 + 3, 10, Y)
  L.rect(x0 + 1, y0 + 2, 4, 3, K)
  L.rect(x0 + 2, y0 + 3, 2, 1, LENS)
  L.px(x0 + 2, y0 + 3, W)
  L.rect(x0 + 6, y0 + 7, 2, 2, SKIN)
  L.px(x0 + 6, y0 + 8, SKIN_SH)
  L.px(x0 + 2, y0 + 7, K)
  L.hline(x0 + 1, y0 + 6, 2, HAIR)
  L.px(x0 + 1, y0 + 10, SKIN_SH)
  L.hline(x0 + 2, y0 + 11, 4, SKIN_SH)
}

function torsoFront(L, bob, frame, back) {
  const y0 = 26 + bob
  L.rect(22, y0 - 1, 4, 1, SKIN)
  L.box(18, y0, 12, 10, COAT)
  L.vline(19, y0 + 1, 8, COAT_HI)
  if (back) {
    L.vline(24, y0 + 1, 8, COAT_HI)
    L.rect(20, y0 + 1, 8, 1, COAT_HI)
  } else {
    L.rect(23, y0, 2, 3, W)
    L.px(22, y0 + 1, W)
    L.px(25, y0 + 1, W)
    L.vline(24, y0 + 3, 6, K)
    L.px(21, y0 + 5, Y)
    L.px(27, y0 + 5, Y)
  }
  L.px(24, y0 + 9, Y)
  const left = at(SWING_LEFT, frame)
  const right = at(SWING_RIGHT, frame)
  arm(L, 15, y0 + 1 + left, back)
  arm(L, 30, y0 + 1 + right, back)
}

function arm(L, x, y, back) {
  L.box(x, y, 3, 8, COAT)
  L.rect(x, y + 7, 3, 2, back ? COAT : SKIN)
  L.px(x, y + 8, K)
  L.px(x + 2, y + 8, K)
}

function legsFront(L, frame) {
  const left = at(LIFT_LEFT, frame)
  const right = at(LIFT_RIGHT, frame)
  L.box(18, 36, 12, 5, PANTS)
  L.vline(24, 37, 4, K)
  leg(L, 18, left)
  leg(L, 25, right)
}

function leg(L, x, lift) {
  if (lift) L.rect(x, 41 - lift, 5, lift, PANTS)
  L.box(x, 41 - lift, 5, 4, BOOT)
  L.hline(x + 1, 41 - lift, 3, PANTS)
  L.px(x, 41 - lift, K)
  L.px(x + 4, 41 - lift, K)
  L.hline(x + 1, 44 - lift, 3, K)
}

function torsoSide(L, bob, frame) {
  const y0 = 26 + bob
  L.rect(22, y0 - 1, 4, 1, SKIN)
  L.box(20, y0, 8, 10, COAT)
  L.vline(21, y0 + 1, 8, COAT_HI)
  L.px(21, y0, W)
  L.px(22, y0 + 1, W)
  L.px(23, y0 + 9, Y)
  const swing = -at(STRIDE, frame)
  const x = 22 + Math.round(swing * 0.7)
  L.box(x, y0 + 1, 3, 8, COAT)
  L.rect(x, y0 + 8, 3, 2, SKIN)
  L.px(x, y0 + 9, K)
  L.px(x + 2, y0 + 9, K)
}

function legsSide(L, frame) {
  const stride = at(STRIDE, frame)
  const near = -stride
  const far = stride
  L.box(20, 36, 8, 5, PANTS)
  legSide(L, 23 + far, 1, true)
  legSide(L, 21 + near, 0, false)
}

function legSide(L, x, raise, far) {
  const shade = far ? SKIN_SH : PANTS
  L.rect(x, 39, 4, 2, far ? PANTS : PANTS)
  L.box(x, 41 - raise, 5, 4, BOOT)
  L.hline(x + 1, 41 - raise, 3, shade === SKIN_SH ? PANTS : PANTS)
  L.px(x, 41 - raise, K)
  L.px(x + 4, 41 - raise, K)
  L.hline(x + 1, 44 - raise, 3, K)
}

function draw(dir, frame) {
  const L = new Layer()
  const bob = frame < 0 ? 0 : BODY_BOB[frame]
  if (dir === 'w') {
    legsSide(L, frame)
    torsoSide(L, bob, frame)
    headSide(L, bob)
    return L
  }
  const back = dir === 'n' || dir === 'nw'
  legsFront(L, frame)
  torsoFront(L, bob, frame, back)
  headFront(L, dir === 'sw' || dir === 'nw' ? 16 : 17, bob, dir === 'sw' ? -2 : 0, !back)
  return L
}

function cell(dir, frame) {
  const drawn = MIRROR[dir] ?? dir
  const layer = draw(drawn, frame)
  return MIRROR[dir] ? layer.mirrored() : layer
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

async function preview(file, idle, walk) {
  const SCALE = 6
  const columns = 1 + WALK_FRAMES
  const canvas = createCanvas(columns * CELL * SCALE, DIRECTIONS.length * CELL * SCALE)
  const context = canvas.getContext('2d')
  context.fillStyle = '#5a3d6b'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const blit = (layer, column, row) => {
    const { data, width, height } = toRGBA([[layer]], 1)
    const tile = createCanvas(width, height)
    tile.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0)
    context.imageSmoothingEnabled = false
    context.drawImage(tile, 0, 0, CELL, CELL, column * CELL * SCALE, row * CELL * SCALE, CELL * SCALE, CELL * SCALE)
  }
  DIRECTIONS.forEach((_, row) => {
    blit(idle[row][0], 0, row)
    walk[row].forEach((layer, frame) => blit(layer, 1 + frame, row))
  })
  await writeFile(file, canvas.toBuffer('image/png'))
}

const idle = DIRECTIONS.map((dir) => [cell(dir, -1)])
const walk = DIRECTIONS.map((dir) => Array.from({ length: WALK_FRAMES }, (_, frame) => cell(dir, frame)))
await mkdir(out, { recursive: true })
await writeSheet(path.join(out, 'idle.png'), idle, 1)
await writeSheet(path.join(out, 'walk.png'), walk, WALK_FRAMES)
console.log(`Folhas do piloto gravadas em ${path.relative(root, out)}`)
if (args.get('preview')) {
  await preview(args.get('preview'), idle, walk)
  console.log(`Prévia em ${args.get('preview')}`)
}
