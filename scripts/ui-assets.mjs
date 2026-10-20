import { createRequire } from 'node:module'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { loadImage, createCanvas } = createRequire(path.join(root, 'package.json'))('@napi-rs/canvas')
const ui = path.join(root, 'public/game/assets/ui')

async function pixels(file) {
  const image = await loadImage(file)
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  return { canvas, context, image: context.getImageData(0, 0, image.width, image.height), width: image.width, height: image.height }
}

{
  const file = path.join(ui, 'tablet.png')
  const { canvas, context, image, width, height } = await pixels(file)
  const data = image.data
  const bright = (i) => data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225
  const seen = new Uint8Array(width * height)
  const queue = [0, width - 1, (height - 1) * width, height * width - 1]
  while (queue.length) {
    const index = queue.pop()
    if (seen[index]) continue
    seen[index] = 1
    if (!bright(index * 4)) continue
    data[index * 4 + 3] = 0
    const x = index % width
    const y = (index - x) / width
    if (x > 0) queue.push(index - 1)
    if (x < width - 1) queue.push(index + 1)
    if (y > 0) queue.push(index - width)
    if (y < height - 1) queue.push(index + width)
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] === 0) continue
      const edge = [i - 4, i + 4, i - width * 4, i + width * 4].some((n) => data[n + 3] === 0)
      if (!edge) continue
      const light = (data[i] + data[i + 1] + data[i + 2]) / 765
      if (light > 0.6) data[i + 3] = Math.round(255 * (1 - (light - 0.6) / 0.4))
    }
  }
  context.putImageData(image, 0, 0)
  const dark = (x, y) => {
    const i = (y * width + x) * 4
    return data[i + 3] > 0 && data[i] < 40 && data[i + 1] < 56 && data[i + 2] < 56
  }
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height * 0.45)
  let left = cx
  let right = cx
  let top = cy
  let bottom = cy
  while (left > 0 && dark(left - 1, cy)) left--
  while (right < width - 1 && dark(right + 1, cy)) right++
  while (top > 0 && dark(cx, top - 1)) top--
  while (bottom < height - 1 && dark(cx, bottom + 1)) bottom++
  const pct = (value, total) => `${((value / total) * 100).toFixed(2)}%`
  console.log(`tablet ${width}x${height} · tela: left ${pct(left, width)} top ${pct(top, height)} right ${pct(width - 1 - right, width)} bottom ${pct(height - 1 - bottom, height)}`)
  await writeFile(file, canvas.toBuffer('image/png'))
}

{
  const source = path.join(ui, 'arena-backdrop.png')
  const { canvas } = await pixels(source)
  await writeFile(path.join(ui, 'arena-backdrop.webp'), await canvas.encode('webp', 82))
  await rm(source)
  const size = (await readFile(path.join(ui, 'arena-backdrop.webp'))).length
  console.log(`arena-backdrop.webp · ${Math.round(size / 1024)} KB`)
}
