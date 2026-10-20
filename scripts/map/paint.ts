import { createCanvas } from '@napi-rs/canvas'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as L from '../../lib/city/layout'
import { ART } from '../../lib/city/model'
import { bakeWorld } from './bake'
import { paintBuilding } from './buildings'
import { paintForest } from './forest'
import { buildMasks, paintBase, paintBridges, paintFences, paintFields, paintGardens, paintPaving, paintWater } from './ground'
import { paintCrystal, paintIsland, paintLantern, paintRingTower, paintRotor, paintRuneStone, paintShard, paintWindmillTower, type LandmarkSprite } from './landmarks'
import { paintLamp, paintTreeSprite, treeShadow } from './nature'
import * as P from './palette'
import { paintArena, paintCamp, paintFountainBasin, paintPlatform, paintProp, paintRuneRing, paintStall, paintYard } from './props'
import { Raster } from './raster'
import { paintWoods } from './woods'

export const ARTWORK = L.SIZE / ART
const TILE = 256
const GUTTER = 2
const COLUMNS = ARTWORK / TILE
const PREVIEW = ARTWORK / 2

export type PaintOptions = { root: string; debugFile?: string; quality: number }

function castShadow(map: Raster, sprite: Raster, left: number, top: number, offsetX: number, offsetY: number, strength: number) {
  const { width, height, data } = sprite
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && data[y * width + x] >>> 24 > 128
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!solid(x, y)) continue
      const rim = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)
      map.shadow(left + x + offsetX, top + y + offsetY, rim ? strength * 0.6 : strength)
    }
  }
}

function toCanvas(raster: Raster) {
  const canvas = createCanvas(raster.width, raster.height)
  const context = canvas.getContext('2d')
  const image = context.createImageData(raster.width, raster.height)
  image.data.set(raster.bytes())
  context.putImageData(image, 0, 0)
  return canvas
}

type AtlasEntry = { name: string; sprite: LandmarkSprite }

function buildAtlas(entries: AtlasEntry[]) {
  const width = 512
  const padding = 2
  let x = padding
  let y = padding
  let rowHeight = 0
  const placed: { name: string; sprite: LandmarkSprite; x: number; y: number }[] = []
  const sorted = [...entries].sort((a, b) => b.sprite.raster.height - a.sprite.raster.height)
  for (const entry of sorted) {
    const { raster } = entry.sprite
    if (x + raster.width + padding > width) {
      x = padding
      y += rowHeight + padding
      rowHeight = 0
    }
    placed.push({ ...entry, x, y })
    x += raster.width + padding
    rowHeight = Math.max(rowHeight, raster.height)
  }
  const height = y + rowHeight + padding
  const atlas = new Raster(width, height)
  const sprites: Record<string, [number, number, number, number, number, number]> = {}
  const extra: Record<string, Record<string, number | number[]>> = {}
  for (const item of placed) {
    atlas.draw(item.sprite.raster, item.x, item.y)
    sprites[item.name] = [item.x, item.y, item.sprite.raster.width, item.sprite.raster.height, item.sprite.anchorX, item.sprite.anchorY]
    if (item.sprite.extra) extra[item.name] = item.sprite.extra
  }
  return { atlas, manifest: { width, height, sprites, extra } }
}

export async function paint(options: PaintOptions) {
  const started = Date.now()
  const map = new Raster(ARTWORK, ARTWORK, P.FOREST_FLOOR[1])
  const masks = buildMasks(ARTWORK)
  paintBase(map, masks)
  paintWater(map, masks)
  paintPaving(map, masks)
  paintFields(map)
  paintGardens(map)
  paintBridges(map)
  paintCamp(map)
  paintWoods(map, masks)

  for (const landmark of L.LANDMARKS) {
    if (landmark.kind === 'crystal-fountain') paintFountainBasin(map, landmark.x, landmark.y, landmark.radius ?? 150)
    if (landmark.kind === 'windmill') paintYard(map, landmark.x, landmark.y - 34, 124, 84)
    if (landmark.kind === 'ring-tower') paintPlatform(map, landmark.x, landmark.y - 50, 170, 110)
    if (landmark.kind === 'lume-tree') paintRuneRing(map, landmark.x, landmark.y + 10, 170)
  }
  paintArena(map)
  paintFences(map)

  const treeSprites = new Map<string, LandmarkSprite>()
  for (const [kind, variants] of Object.entries(L.TREE_VARIANTS)) {
    variants.forEach((variant, index) => treeSprites.set(`tree:${kind}:${index}`, paintTreeSprite(kind as never, variant.size, variant.seed)))
  }
  const lamp = paintLamp(1)
  const windmill = paintWindmillTower()
  const ringTower = paintRingTower()

  const buildingSprites = L.BUILDINGS.map((building) => ({ building, sprite: paintBuilding(building) }))
  for (const { building, sprite } of buildingSprites) {
    const lift = Math.min(26, 8 + building.floors * 6)
    castShadow(map, sprite, building.x / ART - 1, building.y / ART - 1, lift, Math.round(lift * 0.45), 0.5)
  }
  for (const tree of L.TREES) treeShadow(map, tree.x / ART, tree.y / ART, tree.kind, tree.size)
  for (const prop of L.PROPS) if (prop.kind === 'lamp') map.ellipseShadow(prop.x / ART + 3, prop.y / ART, 5, 2, 0.4)
  for (const landmark of L.LANDMARKS) {
    const art = landmark.kind === 'windmill' ? windmill : landmark.kind === 'ring-tower' ? ringTower : null
    if (!art) continue
    castShadow(map, art.raster, landmark.x / ART - art.anchorX, landmark.y / ART - art.anchorY, 18, 8, 0.45)
  }

  for (const { building, sprite } of [...buildingSprites].sort((a, b) => a.building.y + a.building.h - (b.building.y + b.building.h))) {
    map.draw(sprite, building.x / ART - 1, building.y / ART - 1)
  }
  for (const stall of L.STALLS) paintStall(map, stall)
  for (const prop of L.PROPS) if (prop.kind !== 'lamp') paintProp(map, prop)
  paintForest(map, masks)

  const tilesDir = path.join(options.root, 'public/game/assets/map/tiles')
  await mkdir(tilesDir, { recursive: true })
  let totalBytes = 0
  for (let row = 0; row < COLUMNS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const tile = new Raster(TILE + GUTTER * 2, TILE + GUTTER * 2)
      for (let y = 0; y < tile.height; y++) {
        const sy = Math.min(ARTWORK - 1, Math.max(0, row * TILE - GUTTER + y))
        for (let x = 0; x < tile.width; x++) {
          const sx = Math.min(ARTWORK - 1, Math.max(0, column * TILE - GUTTER + x))
          tile.data[y * tile.width + x] = map.data[sy * ARTWORK + sx] | 0xff000000
        }
      }
      const bytes = await toCanvas(tile).encode('webp', options.quality)
      totalBytes += bytes.length
      await writeFile(path.join(tilesDir, `${column}-${row}.webp`), bytes)
    }
  }

  const preview = new Raster(PREVIEW, PREVIEW)
  for (let y = 0; y < PREVIEW; y++) {
    for (let x = 0; x < PREVIEW; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const c = map.data[(y * 2 + dy) * ARTWORK + x * 2 + dx]
        r += c & 255
        g += (c >>> 8) & 255
        b += (c >>> 16) & 255
      }
      preview.data[y * PREVIEW + x] = ((255 << 24) | ((b >> 2) << 16) | ((g >> 2) << 8) | (r >> 2)) >>> 0
    }
  }
  await writeFile(path.join(options.root, 'public/game/assets/map/preview.webp'), await toCanvas(preview).encode('webp', 82))

  const entries: AtlasEntry[] = [
    ...[...treeSprites.entries()].map(([name, sprite]) => ({ name, sprite })),
    { name: 'lamp', sprite: lamp },
    { name: 'windmill', sprite: windmill },
    ...Array.from({ length: 8 }, (_, frame) => ({ name: `rotor:${frame}`, sprite: paintRotor(frame) })),
    { name: 'ring-tower', sprite: ringTower },
    { name: 'rune', sprite: paintRuneStone(false) },
    { name: 'rune-dim', sprite: paintRuneStone(true) },
    { name: 'crystal', sprite: paintCrystal() },
    { name: 'shard', sprite: paintShard() },
    { name: 'lantern', sprite: paintLantern() },
    { name: 'island:0', sprite: paintIsland(0) },
    { name: 'island:1', sprite: paintIsland(1) },
  ]
  const { atlas, manifest } = buildAtlas(entries)
  await writeFile(path.join(options.root, 'public/game/assets/map/props.png'), toCanvas(atlas).toBuffer('image/png'))
  await writeFile(path.join(options.root, 'lib/city/atlas.json'), `${JSON.stringify(manifest)}\n`)
  await writeFile(path.join(options.root, 'lib/city/baked.json'), `${JSON.stringify(bakeWorld(masks))}\n`)

  if (options.debugFile) {
    const view = new Raster(ARTWORK, ARTWORK)
    view.data.set(map.data)
    const byName = new Map(entries.map((entry) => [entry.name, entry.sprite]))
    const stamps: { y: number; draw: () => void }[] = []
    const stamp = (name: string, x: number, y: number, depth = y) => {
      const sprite = byName.get(name)
      if (sprite) stamps.push({ y: depth, draw: () => view.draw(sprite.raster, Math.round(x - sprite.anchorX), Math.round(y - sprite.anchorY)) })
    }
    for (const tree of L.TREES) stamp(`tree:${tree.kind}:${tree.seed}`, tree.x / ART, tree.y / ART)
    for (const prop of L.PROPS) if (prop.kind === 'lamp') stamp('lamp', prop.x / ART, prop.y / ART)
    for (const landmark of L.LANDMARKS) {
      const x = landmark.x / ART
      const y = landmark.y / ART
      if (landmark.kind === 'windmill') {
        stamp('windmill', x, y)
        stamp('rotor:1', x - windmill.anchorX + Number(windmill.extra?.hubX), y - windmill.anchorY + Number(windmill.extra?.hubY) + 3, y + 1)
      } else if (landmark.kind === 'ring-tower') {
        stamp('ring-tower', x, y)
        const rings = ringTower.extra?.rings as number[]
        for (let r = 0; r < rings.length; r += 3) {
          for (let k = 0; k < 10; k++) {
            const angle = (k / 10) * Math.PI * 2
            const front = Math.sin(angle) > 0
            stamp(front ? 'rune' : 'rune-dim', x + Math.cos(angle) * rings[r + 1], y - ringTower.anchorY + rings[r] + Math.sin(angle) * rings[r + 2], front ? y + 2 : y - 1)
          }
        }
      } else if (landmark.kind === 'crystal-fountain') {
        stamp('crystal', x, y - 34, y + 1)
      } else if (landmark.kind === 'lanterns') {
        for (const [dx, dy, height] of landmark.points ?? []) stamp('lantern', x + dx / ART, y + (dy - height) / ART, 99999)
      } else if (landmark.kind === 'islands') {
        landmark.points?.forEach(([dx, dy, height], index) => stamp(`island:${index}`, x + dx / ART, y + (dy - height) / ART, 99999))
      }
    }
    stamps.sort((a, b) => a.y - b.y)
    for (const item of stamps) item.draw()
    await writeFile(options.debugFile, toCanvas(view).toBuffer('image/png'))
  }
  return { ms: Date.now() - started, tilesKB: Math.round(totalBytes / 1024), atlas: `${manifest.width}x${manifest.height}`, sprites: entries.length }
}
