import { createCanvas, loadImage } from '@napi-rs/canvas'
import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sheets = path.join(root, 'public/game/assets/robot')
const target = path.join(root, 'lib/game/robot/icons.ts')
const CELL = 48
const ALPHA_THRESHOLD = 8

const boxes = {}
for (const id of (await readdir(sheets)).sort()) {
  const image = await loadImage(path.join(sheets, id, 'idle.png'))
  const context = createCanvas(CELL, CELL).getContext('2d')
  context.drawImage(image, 0, 0, CELL, CELL, 0, 0, CELL, CELL)
  const { data } = context.getImageData(0, 0, CELL, CELL)
  let minX = CELL
  let minY = CELL
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (data[(y * CELL + x) * 4 + 3] <= ALPHA_THRESHOLD) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  boxes[id] = maxX < 0 ? [0, 0, CELL, CELL] : [minX, minY, maxX - minX + 1, maxY - minY + 1]
}

const rows = Object.entries(boxes)
  .map(([id, box]) => `  '${id}': [${box.join(', ')}],`)
  .join('\n')

await writeFile(
  target,
  `import { FRAME } from '../sprite'

export const ICON_BOX: Record<string, readonly [number, number, number, number]> = {
${rows}
}

export function iconBox(id: string): readonly [number, number, number, number] {
  return ICON_BOX[id] ?? [0, 0, FRAME.width, FRAME.height]
}
`,
)
console.log(`Limites de ${Object.keys(boxes).length} folhas gravados em ${path.relative(root, target)}`)
