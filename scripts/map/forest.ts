import { random } from '../../lib/city/geometry'
import type { Masks } from './ground'
import { paintTree, type Sprite } from './nature'
import type { Raster } from './raster'

export function paintForest(map: Raster, masks: Masks) {
  const { size, land, water } = masks
  const pines: Sprite[] = Array.from({ length: 12 }, (_, i) => paintTree('pine', 17 + (i % 6) * 2, 700 + i))
  const oaks: Sprite[] = Array.from({ length: 10 }, (_, i) => paintTree('oak', 18 + (i % 5) * 3, 800 + i))
  const bushes: Sprite[] = Array.from({ length: 6 }, (_, i) => paintTree('bush', 7 + (i % 3) * 2, 900 + i))
  const rng = random(4242)
  const free = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return true
    return !land.data[y * size + x]
  }
  const rooted = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return true
    const i = y * size + x
    return !land.data[i] && !water.data[i]
  }
  type Placed = { sprite: Sprite; x: number; y: number }
  const placed: Placed[] = []
  const tryPlace = (sprite: Sprite, x: number, y: number, inset = 2) => {
    const { raster, anchorX, anchorY } = sprite
    const left = x - anchorX + inset
    const top = y - anchorY + inset
    const right = x - anchorX + raster.width - 1 - inset
    const bottom = y - anchorY + raster.height - 1
    const probes: [number, number][] = [
      [x, y],
      [left, bottom - 2],
      [right, bottom - 2],
      [left, top + raster.height / 2],
      [right, top + raster.height / 2],
      [x, top],
      [left + raster.width * 0.25, top + 3],
      [right - raster.width * 0.25, top + 3],
    ]
    if (!rooted(x, y)) return false
    if (!probes.every(([px, py]) => free(Math.round(px), Math.round(py)))) return false
    placed.push({ sprite, x, y })
    return true
  }
  const nearClearing = (x: number, y: number) => {
    for (let dy = -5; dy <= 5; dy += 5) for (let dx = -5; dx <= 5; dx += 5) if (!free(x + dx, y + dy)) return true
    return false
  }
  for (let gy = 0; gy < size; gy += 7) {
    for (let gx = 0; gx < size; gx += 7) {
      const x = Math.round(gx + (rng() - 0.5) * 5)
      const y = Math.round(gy + (rng() - 0.5) * 5)
      if (!rooted(x, y) || !nearClearing(x, y)) continue
      tryPlace(bushes[Math.floor(rng() * bushes.length)], x, y, 4)
    }
  }
  const step = 19
  for (let gy = -20; gy < size + 60; gy += step) {
    for (let gx = -20; gx < size + 20; gx += step) {
      const x = Math.round(gx + (rng() - 0.5) * step)
      const y = Math.round(gy + (rng() - 0.5) * step)
      const sprite = rng() < 0.62 ? pines[Math.floor(rng() * pines.length)] : oaks[Math.floor(rng() * oaks.length)]
      if (!tryPlace(sprite, x, y)) tryPlace(bushes[Math.floor(rng() * bushes.length)], x, y)
    }
  }
  placed.sort((a, b) => a.y - b.y)
  for (const { sprite, x, y } of placed) map.draw(sprite.raster, x - sprite.anchorX, y - sprite.anchorY)
}
