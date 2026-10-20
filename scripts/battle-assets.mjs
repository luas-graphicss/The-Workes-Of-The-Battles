import { createRequire } from 'node:module'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { loadImage, createCanvas } = createRequire(path.join(root, 'package.json'))('@napi-rs/canvas')
const source = path.join(root, '.gen')
const target = path.join(root, 'public/game/assets/ui')

const EMBLEM_SIZE = 160
const CARD_SIZE = { width: 360, height: 480 }

function resample(image, width, height) {
  let current = image
  let w = image.width
  let h = image.height
  while (w / 2 >= width && h / 2 >= height) {
    w = Math.round(w / 2)
    h = Math.round(h / 2)
    const step = createCanvas(w, h)
    const context = step.getContext('2d')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(current, 0, 0, w, h)
    current = step
  }
  const out = createCanvas(width, height)
  const context = out.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(current, 0, 0, width, height)
  return out
}

function backdropColour(data, width, height) {
  const patch = 12
  const sum = [0, 0, 0]
  let count = 0
  for (const [cx, cy] of [
    [0, 0],
    [width - patch, 0],
    [0, height - patch],
    [width - patch, height - patch],
  ]) {
    for (let y = cy; y < cy + patch; y++) {
      for (let x = cx; x < cx + patch; x++) {
        const i = (y * width + x) * 4
        sum[0] += data[i]
        sum[1] += data[i + 1]
        sum[2] += data[i + 2]
        count++
      }
    }
  }
  return sum.map((value) => value / count)
}

async function emblem(file, out) {
  const image = await loadImage(file)
  const { width, height } = image
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  const data = context.getImageData(0, 0, width, height).data
  const [br, bg, bb] = backdropColour(data, width, height)
  let left = width
  let right = 0
  let top = height
  let bottom = 0
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4
      if (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) < 54) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const radius = Math.max(right - left, bottom - top) / 2 - 2
  const size = Math.ceil(radius * 2 + 8)
  const disc = createCanvas(size, size)
  const paint = disc.getContext('2d')
  paint.drawImage(canvas, cx - size / 2, cy - size / 2, size, size, 0, 0, size, size)
  paint.globalCompositeOperation = 'destination-in'
  const mask = paint.createRadialGradient(size / 2, size / 2, radius - 2.5, size / 2, size / 2, radius + 0.5)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  paint.fillStyle = mask
  paint.fillRect(0, 0, size, size)
  const final = resample(disc, EMBLEM_SIZE, EMBLEM_SIZE)
  await writeFile(out, await final.encode('webp', 88))
}

async function card(file, out) {
  const image = await loadImage(file)
  const ratio = CARD_SIZE.width / CARD_SIZE.height
  let cropWidth = image.width
  let cropHeight = image.width / ratio
  if (cropHeight > image.height) {
    cropHeight = image.height
    cropWidth = image.height * ratio
  }
  const crop = createCanvas(Math.round(cropWidth), Math.round(cropHeight))
  crop.getContext('2d').drawImage(image, (image.width - cropWidth) / 2, (image.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, crop.width, crop.height)
  const final = resample(crop, CARD_SIZE.width, CARD_SIZE.height)
  await writeFile(out, await final.encode('webp', 84))
}

const jobs = [
  { folder: 'elements', run: emblem },
  { folder: 'classes', run: emblem },
  { folder: 'cards', run: card },
]

for (const { folder, run } of jobs) {
  const from = path.join(source, folder)
  const files = (await readdir(from).catch(() => [])).filter((name) => name.endsWith('.png'))
  if (!files.length) continue
  await mkdir(path.join(target, folder), { recursive: true })
  const sizes = []
  for (const name of files) {
    const out = path.join(target, folder, name.replace(/\.png$/, '.webp'))
    await run(path.join(from, name), out)
    sizes.push(`${name.replace(/\.png$/, '')} ${Math.round((await stat(out)).size / 1024)} KB`)
  }
  console.log(`${folder}: ${sizes.join(' · ')}`)
}
