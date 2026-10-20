import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { loadImage, createCanvas } = createRequire(path.join(root, 'package.json'))('@napi-rs/canvas')
const sources = path.join(root, '.gen')
const ui = path.join(root, 'public/game/assets/ui')

const EMBLEMS = { credit: 160, arena: 192, workshop: 192, mission: 192, victory: 256, defeat: 256, crest: 256 }

async function pixels(file) {
  const image = await loadImage(file)
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  return { canvas, context, image: context.getImageData(0, 0, image.width, image.height), width: image.width, height: image.height }
}

function knockOutPaper(data, width, height) {
  const light = (i) => {
    const low = Math.min(data[i], data[i + 1], data[i + 2])
    const high = Math.max(data[i], data[i + 1], data[i + 2])
    return low > 178 && high - low < 26
  }
  const seen = new Uint8Array(width * height)
  const queue = [0, width - 1, (height - 1) * width, height * width - 1]
  while (queue.length) {
    const index = queue.pop()
    if (seen[index]) continue
    seen[index] = 1
    if (!light(index * 4)) continue
    data[index * 4 + 3] = 0
    const x = index % width
    const y = (index - x) / width
    if (x > 0) queue.push(index - 1)
    if (x < width - 1) queue.push(index + 1)
    if (y > 0) queue.push(index - width)
    if (y < height - 1) queue.push(index + width)
  }
  for (let pass = 0; pass < 2; pass++) {
    const alpha = new Uint8Array(width * height)
    for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3]
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x
        if (alpha[index] === 0) continue
        const edge = alpha[index - 1] === 0 || alpha[index + 1] === 0 || alpha[index - width] === 0 || alpha[index + width] === 0
        if (!edge) continue
        const i = index * 4
        const lightness = (data[i] + data[i + 1] + data[i + 2]) / 765
        if (lightness > 0.55) data[i + 3] = Math.round(alpha[index] * Math.max(0, 1 - (lightness - 0.55) / 0.45))
      }
    }
  }
}

function opaqueBounds(data, width, height) {
  let left = width
  let right = 0
  let top = height
  let bottom = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 12) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

await mkdir(path.join(ui, 'emblems'), { recursive: true })
await mkdir(path.join(ui, 'menu'), { recursive: true })

for (const [name, size] of Object.entries(EMBLEMS)) {
  const { canvas, context, image, width, height } = await pixels(path.join(sources, `${name}.png`))
  knockOutPaper(image.data, width, height)
  context.putImageData(image, 0, 0)
  const box = opaqueBounds(image.data, width, height)
  const side = Math.max(box.width, box.height)
  const out = createCanvas(size, size)
  const paint = out.getContext('2d')
  paint.imageSmoothingEnabled = true
  paint.imageSmoothingQuality = 'high'
  const scale = size / side
  paint.drawImage(
    canvas,
    box.left,
    box.top,
    box.width,
    box.height,
    (size - box.width * scale) / 2,
    (size - box.height * scale) / 2,
    box.width * scale,
    box.height * scale,
  )
  const target = path.join(ui, 'emblems', `${name}.webp`)
  await writeFile(target, await out.encode('webp', 88))
  console.log(`emblems/${name}.webp · ${size}px`)
}

{
  const source = process.argv[2] ? path.resolve(process.argv[2]) : path.join(sources, 'keyart.png')
  const { canvas, width, height } = await pixels(source)
  await writeFile(path.join(ui, 'menu', 'keyart.webp'), await canvas.encode('webp', 86))
  console.log(`menu/keyart.webp · ${width}x${height}`)
}
