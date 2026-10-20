import { isWalkable, TEXEL, type Point } from '../world-data'
import { centeredLabel } from './fx/labels'
import { glowTexture } from './fx/textures'
import { formatCredits } from './robot/parts'
import { saveProgress, type Drop, type Progress } from './robot/progress'
import type { Actor, Scene } from './scene'

export type DropSpace = Drop['space']

type Chip = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  amount: number
  space: DropSpace
  settled: boolean

  originX: number
  originY: number
  phase: number
  saved: Drop | null
}

type Popup = { x: number; y: number; text: string; age: number }

export type Drops = {

  spawn(amount: number, x: number, y: number, space: DropSpace): void
  update(dt: number, hero: { x: number; y: number }, space: DropSpace): void

  pending(space: DropSpace): number

  centroid(space: DropSpace): Point | null

  destroy(): void
}

export type DropsOptions = {
  scene: Scene
  progress: Progress
  onCollect(amount: number, total: number): void
}

const GRAVITY = 1900
const BOUNCE = 0.42
const DRAG = 1.6
const PICKUP = 46
const MAGNET = 150
const MAGNET_SPEED = 520
const POPUP_LIFE = 0.9
const FRAMES = 6
const CHIP = { width: 11, height: 11 }
const GOLD = { rim: '#7a4a10', face: '#e7b04f', light: '#fff2cc', mark: '#8c5a1c', edge: '#c08433' }
const FONT = "'Chakra Petch', 'Geist', sans-serif"
const SHADOW = 'rgba(20, 14, 8, 0.32)'

export function createDrops(options: DropsOptions): Drops {
  const { scene, progress } = options
  const sheet = paintChips()
  const sparkle = glowTexture([255, 232, 170], 32)
  const chips: Chip[] = []
  const popups: Popup[] = []
  let total = 0

  for (const saved of progress.drops) {
    chips.push({ x: saved.x, y: saved.y, z: 0, vx: 0, vy: 0, vz: 0, amount: saved.amount, space: saved.space, settled: true, originX: saved.x, originY: saved.y, phase: Math.random() * 6, saved })
  }

  const actor: Actor = {
    get depth() {
      return Infinity
    },
    draw: () => {},
  }

  const chipActors = new Map<Chip, Actor>()
  scene.extras.push(actor)
  for (const chip of chips) attach(chip)
  scene.extraGlow = (context, originX, originY, zoom) => {
    const time = performance.now() / 1000
    for (const chip of chips) {
      if (!chip.settled || !visible(chip)) continue
      const pulse = 0.35 + 0.25 * Math.sin(time * 3 + chip.phase)
      const size = 90 * zoom
      context.globalAlpha = pulse
      context.drawImage(sparkle, originX + chip.x * zoom - size / 2, originY + (chip.y - 10) * zoom - size / 2, size, size)
    }
    context.globalAlpha = 1
  }

  let current: DropSpace = 'city'
  const visible = (chip: Chip) => chip.space === current

  function attach(chip: Chip) {
    const entry: Actor = {
      get depth() {
        return chip.y
      },
      draw: (context, originX, originY, zoom) => {
        if (!visible(chip)) return
        drawChip(context, chip, originX, originY, zoom)
      },
    }
    chipActors.set(chip, entry)
    scene.extras.push(entry)
  }

  function detach(chip: Chip) {
    const entry = chipActors.get(chip)
    if (entry) {
      const index = scene.extras.indexOf(entry)
      if (index >= 0) scene.extras.splice(index, 1)
      chipActors.delete(chip)
    }
    const at = chips.indexOf(chip)
    if (at >= 0) chips.splice(at, 1)
  }

  function drawChip(context: CanvasRenderingContext2D, chip: Chip, originX: number, originY: number, zoom: number) {
    const scale = zoom * TEXEL
    const time = performance.now() / 1000
    const frame = Math.floor(((time * 5 + chip.phase) % FRAMES + FRAMES) % FRAMES)
    const width = CHIP.width * scale
    const height = CHIP.height * scale
    const x = originX + chip.x * zoom - width / 2
    const groundY = originY + chip.y * zoom
    const lift = chip.settled ? Math.abs(Math.sin(time * 2.2 + chip.phase)) * 3 * zoom : chip.z * zoom
    context.fillStyle = SHADOW
    context.beginPath()
    context.ellipse(originX + chip.x * zoom, groundY, 5 * scale * Math.max(0.4, 1 - lift / (120 * zoom)), 2 * scale, 0, 0, Math.PI * 2)
    context.fill()
    context.imageSmoothingEnabled = false
    context.drawImage(sheet, frame * CHIP.width, 0, CHIP.width, CHIP.height, Math.round(x), Math.round(groundY - lift - height + 2 * scale), Math.round(width), Math.round(height))
    context.imageSmoothingEnabled = true
  }

  function persist(chip: Chip) {
    if (chip.saved) return
    chip.saved = { x: Math.round(chip.x), y: Math.round(chip.y), amount: chip.amount, space: chip.space }
    progress.drops.push(chip.saved)
    saveProgress(progress)
  }

  function forget(chip: Chip) {
    if (!chip.saved) return
    const index = progress.drops.indexOf(chip.saved)
    if (index >= 0) progress.drops.splice(index, 1)
    chip.saved = null
  }

  function settle(chip: Chip) {
    chip.settled = true
    chip.z = 0
    chip.vx = chip.vy = chip.vz = 0
    if (!isWalkable(chip.x, chip.y)) {

      for (let step = 1; step <= 10; step++) {
        const t = step / 10
        const x = chip.x + (chip.originX - chip.x) * t
        const y = chip.y + (chip.originY - chip.y) * t
        if (isWalkable(x, y)) {
          chip.x = x
          chip.y = y
          break
        }
      }
      if (!isWalkable(chip.x, chip.y)) {
        chip.x = chip.originX
        chip.y = chip.originY
      }
    }
    persist(chip)
  }

  function collect(chip: Chip) {
    forget(chip)
    detach(chip)
    progress.credits += chip.amount
    total += chip.amount
    saveProgress(progress)
    popups.push({ x: chip.x, y: chip.y - 60, text: `+${formatCredits(chip.amount)} ¢`, age: 0 })
    options.onCollect(chip.amount, total)
  }

  actor.draw = (context, originX, originY, zoom) => {
    if (!popups.length) return
    const size = Math.max(11, Math.round(26 * zoom))
    const font = `700 ${size}px ${FONT}`
    for (const popup of popups) {
      const t = popup.age / POPUP_LIFE
      const label = centeredLabel(popup.text, font, '#ffd98a', '#1f1a17', Math.max(2, size / 5), size * 1.4)
      const x = originX + popup.x * zoom
      const y = originY + (popup.y - t * 70) * zoom
      context.globalAlpha = 1 - t * t
      context.drawImage(label.canvas, Math.round(x - label.canvas.width / 2), Math.round(y - label.canvas.height / 2))
    }
    context.globalAlpha = 1
  }

  return {
    spawn(amount, x, y, space) {
      if (amount <= 0) return
      const count = Math.max(5, Math.min(14, Math.round(amount / 25)))
      const each = Math.floor(amount / count)
      let left = amount
      for (let index = 0; index < count; index++) {
        const value = index === count - 1 ? left : each
        left -= value
        const angle = Math.random() * Math.PI * 2
        const speed = 140 + Math.random() * 300
        const chip: Chip = {
          x: x + Math.cos(angle) * 10,
          y: y + Math.sin(angle) * 6,
          z: 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.6,
          vz: 320 + Math.random() * 360,
          amount: value,
          space,
          settled: false,
          originX: x,
          originY: y,
          phase: Math.random() * 6,
          saved: null,
        }
        chips.push(chip)
        attach(chip)
      }
    },

    update(dt, hero, space) {
      current = space
      for (let index = popups.length - 1; index >= 0; index--) {
        popups[index].age += dt
        if (popups[index].age >= POPUP_LIFE) popups.splice(index, 1)
      }
      for (let index = chips.length - 1; index >= 0; index--) {
        const chip = chips[index]
        if (chip.space !== space) continue
        if (!chip.settled) {
          chip.vz -= GRAVITY * dt
          chip.z += chip.vz * dt
          const drag = Math.exp(-DRAG * dt)
          chip.vx *= drag
          chip.vy *= drag
          const nx = chip.x + chip.vx * dt
          const ny = chip.y + chip.vy * dt
          if (isWalkable(nx, ny)) {
            chip.x = nx
            chip.y = ny
          } else {
            chip.vx *= -0.4
            chip.vy *= -0.4
          }
          if (chip.z <= 0) {
            chip.z = 0
            if (Math.abs(chip.vz) < 90) settle(chip)
            else chip.vz = -chip.vz * BOUNCE
          }
          continue
        }
        const dx = hero.x - chip.x
        const dy = hero.y - chip.y
        const distance = Math.hypot(dx, dy)
        if (distance <= PICKUP) {
          collect(chip)
          continue
        }
        if (distance <= MAGNET) {
          const pull = MAGNET_SPEED * dt * (1 - distance / MAGNET + 0.3)
          const nx = chip.x + (dx / distance) * pull
          const ny = chip.y + (dy / distance) * pull
          if (isWalkable(nx, ny)) {
            chip.x = nx
            chip.y = ny
            if (chip.saved) {
              chip.saved.x = Math.round(nx)
              chip.saved.y = Math.round(ny)
            }
          }
        }
      }
    },

    pending(space) {
      let sum = 0
      for (const chip of chips) if (chip.space === space) sum += chip.amount
      return sum
    },

    centroid(space) {
      let count = 0
      let x = 0
      let y = 0
      for (const chip of chips) {
        if (chip.space !== space) continue
        count++
        x += chip.x
        y += chip.y
      }
      return count ? [x / count, y / count] : null
    },

    destroy() {
      for (const chip of [...chips]) detach(chip)
      popups.length = 0
      const index = scene.extras.indexOf(actor)
      if (index >= 0) scene.extras.splice(index, 1)
      if (scene.extraGlow) scene.extraGlow = null
    },
  }
}

function paintChips(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CHIP.width * FRAMES
  canvas.height = CHIP.height
  const context = canvas.getContext('2d') as CanvasRenderingContext2D
  const widths = [5, 4, 2.4, 1, 2.4, 4]
  for (let frame = 0; frame < FRAMES; frame++) {
    const left = frame * CHIP.width
    const cx = left + 5.5
    const cy = 5.5
    const rx = widths[frame]
    const ry = 5
    const dot = (x: number, y: number, colour: string) => {
      context.fillStyle = colour
      context.fillRect(x, y, 1, 1)
    }
    for (let y = 0; y < CHIP.height; y++) {
      for (let x = 0; x < CHIP.width; x++) {
        const nx = (x + 0.5 - 5.5) / (rx + 0.5)
        const ny = (y + 0.5 - cy) / (ry + 0.5)
        const d = nx * nx + ny * ny
        if (d > 1) continue
        const inner = (x + 0.5 - 5.5) ** 2 / Math.max(0.3, rx - 0.6) ** 2 + (y + 0.5 - cy) ** 2 / (ry - 0.6) ** 2
        let colour = inner > 1 ? GOLD.rim : GOLD.face
        if (inner <= 1 && rx >= 4 && Math.abs(x + 0.5 - 5.5) < 1.6 && Math.abs(y - 5) <= 2) colour = GOLD.mark
        if (inner <= 1 && rx < 4 && rx > 1.5) colour = x + 0.5 < cx ? GOLD.edge : GOLD.face
        dot(left + x, y, colour)
      }
    }
    if (rx >= 2.4) {
      dot(Math.round(cx - rx * 0.45) - 1, 2, GOLD.light)
      dot(Math.round(cx - rx * 0.45) - 1, 3, GOLD.light)
    }
  }
  return canvas
}
