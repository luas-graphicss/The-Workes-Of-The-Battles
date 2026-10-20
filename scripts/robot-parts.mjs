import { createCanvas, ImageData, loadImage } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARM_SWING, BODY_BOB, DRAWN, MIRROR, Pen, ROW } from './robot-parts/anatomy.mjs'
import { HELMETS } from './robot-parts/helmets.mjs'
import { HELMETS_2 } from './robot-parts/helmets-2.mjs'
import { HELMETS_3 } from './robot-parts/helmets-3.mjs'
import { MOBILITY } from './robot-parts/mobility.mjs'
import { MOBILITY_2 } from './robot-parts/mobility-2.mjs'
import { MOBILITY_3 } from './robot-parts/mobility-3.mjs'
import { MODULES } from './robot-parts/modules.mjs'
import { MODULES_2 } from './robot-parts/modules-2.mjs'
import { MODULES_3 } from './robot-parts/modules-3.mjs'
import { CELL, Layer, sheetToRGBA, WALK_FRAMES } from './robot-parts/raster.mjs'
import { WEAPONS } from './robot-parts/weapons.mjs'
import { WEAPONS_2 } from './robot-parts/weapons-2.mjs'
import { WEAPONS_3 } from './robot-parts/weapons-3.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sheets = path.join(root, 'public/game/assets/robot')
const args = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')))
const only = args.get('only')?.split(',')

const MOTION = {
  helmet: BODY_BOB,
  weapon: ARM_SWING,
  mobility: null,
  module: BODY_BOB,
}

const DESIGNS = [
  ...[...HELMETS, ...HELMETS_2, ...HELMETS_3].map((part) => ({ ...part, slot: 'helmet', layer: 'front' })),
  ...[...WEAPONS, ...WEAPONS_2, ...WEAPONS_3].map((part) => ({ ...part, slot: 'weapon', layer: 'front' })),
  ...[...MOBILITY, ...MOBILITY_2, ...MOBILITY_3].map((part) => ({ ...part, slot: 'mobility', layer: 'legs' })),
  ...[...MODULES, ...MODULES_2, ...MODULES_3].map((part) => ({ ...part, slot: 'module' })),
].filter((part) => !only || only.includes(part.id))

const DIRECTIONS = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se']

function cell(part, dir, frame) {
  const drawn = MIRROR[dir] ?? dir
  const layer = new Layer()
  part.draw(new Pen(layer), drawn, frame)
  const motion = MOTION[part.slot]
  const dy = motion && frame >= 0 ? motion[frame] : 0
  const placed = dy ? layer.shifted(0, dy) : layer
  return MIRROR[dir] ? placed.mirrored() : placed
}

function buildSheets(part) {
  const idle = DIRECTIONS.map((dir) => [cell(part, dir, -1)])
  const walk = DIRECTIONS.map((dir) => Array.from({ length: WALK_FRAMES }, (_, frame) => cell(part, dir, frame)))
  return { idle, walk }
}

async function writeSheet(file, cells, columns) {
  const { data, width, height } = sheetToRGBA(cells, columns)
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.putImageData(new ImageData(data, width, height), 0, 0)
  await writeFile(file, canvas.toBuffer('image/png'))
}

async function preview(file, built) {
  const body = { idle: await loadImage(path.join(sheets, 'b01/idle.png')), walk: await loadImage(path.join(sheets, 'b01/walk.png')) }
  const SCALE = 3
  const columns = DIRECTIONS.length + WALK_FRAMES
  const canvas = createCanvas(columns * CELL * SCALE + 150, built.length * CELL * SCALE)
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = false
  context.fillStyle = '#3b2a44'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.font = '13px sans-serif'
  built.forEach(({ part, idle, walk }, row) => {
    const y = row * CELL * SCALE
    context.fillText(part.id, 4, y + 16)
    const draw = (sheet, sx, sy, column) => {
      const x = 150 + column * CELL * SCALE
      const away = DIRECTIONS[sy] === 'n' || DIRECTIONS[sy] === 'nw' || DIRECTIONS[sy] === 'ne'
      const bodyFirst = part.layer !== 'back' || away
      const drawBody = () => context.drawImage(sheet === 'idle' ? body.idle : body.walk, sx * CELL, sy * CELL, CELL, CELL, x, y, CELL * SCALE, CELL * SCALE)
      const drawPart = () => {
        const layer = sheet === 'idle' ? idle[sy][0] : walk[sy][sx]
        const { data, width, height } = sheetToRGBA([[layer]], 1)
        const tile = createCanvas(width, height)
        tile.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0)
        context.drawImage(tile, 0, 0, CELL, CELL, x, y, CELL * SCALE, CELL * SCALE)
      }
      if (bodyFirst) {
        drawBody()
        drawPart()
      } else {
        drawPart()
        drawBody()
      }
    }
    DIRECTIONS.forEach((_, index) => draw('idle', 0, index, index))
    for (let frame = 0; frame < WALK_FRAMES; frame++) draw('walk', frame, 0, DIRECTIONS.length + frame)
  })
  await writeFile(file, canvas.toBuffer('image/png'))
}

const built = []
for (const part of DESIGNS) {
  const { idle, walk } = buildSheets(part)
  const folder = path.join(sheets, part.id)
  await mkdir(folder, { recursive: true })
  await writeSheet(path.join(folder, 'idle.png'), idle, 1)
  await writeSheet(path.join(folder, 'walk.png'), walk, WALK_FRAMES)
  built.push({ part, idle, walk })
}
console.log(`${built.length} folhas de peças gravadas em ${path.relative(root, sheets)}`)
if (args.get('preview')) {
  await preview(args.get('preview'), built)
  console.log(`Prévia em ${args.get('preview')}`)
}
