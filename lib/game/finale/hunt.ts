import { LEAGUE, setStoryObstacles, TEXEL, type Point } from '../../world-data'
import type { Sound } from '../audio'
import type { GuardFight } from '../battle/combat'
import { drawEnemy, rankName, type Lineup } from '../battle/lineup'
import { Visitor, visitorActors, type VisitorArt } from '../cutscene/visitors'
import { glowTexture, puffTexture, type RGB } from '../fx/textures'
import type { Mission } from '../missions/data'
import { ladderPower, ladderRank, ladderTier } from '../missions/ladder'
import { currentLevel, ladderCycle } from '../missions/progress'
import { HEART_COUNT, saveProgress, type HuntState, type Progress } from '../robot/progress'
import type { Actor, Scene } from '../scene'
import { directionFromVector } from '../sprite'
import { FINALE_LEVEL, FINALE_TITLE, HARVEST_CARD, HEART_LINES } from '../story/finale'
import type { HudObjective } from '../ui/hud'
import { CORE_SIZE, HEART_ART, heartbeat, heartSprites } from './art'
import { clockText, createHarvestHud } from './hud'
import { guardKinds, HEART_FOOTPRINT, huntSeconds, planHearts, type HeartSpot } from './layout'

export type HeartState = 'guarded' | 'exposed' | 'broken'

export type HuntDeps = {
  scene: Scene
  progress: Progress
  sound: Sound
  surface: HTMLElement
  visitors: VisitorArt
  player: { x: number; y: number }
}

export type Hunt = {
  readonly active: boolean
  readonly busy: boolean
  readonly left: number
  readonly broken: number
  readonly spots: readonly HeartSpot[]
  readonly lastBroken: HeartSpot | null
  begin(): void
  end(): void
  clock(dt: number): 'running' | 'expired'
  tend(dt: number, camera: { x: number; y: number }): void
  tint(base: RGB): RGB
  guardAt(x: number, y: number): number
  fight(index: number): GuardFight | null
  afterFight(won: boolean, mission: Mission): void
  heartAt(x: number, y: number): HeartSpot | null
  shatter(index: number, done: (all: boolean) => void): boolean
  objective(x: number, y: number): HudObjective | null
  announce(kind: 'start' | 'resume' | 'retry'): void
  reset(): void
  showHud(visible: boolean): void
  destroy(): void
}

export const HUNT_START: Point = [LEAGUE.exit[0], LEAGUE.exit[1]]

export function createHuntState(): HuntState {
  const seed = Math.floor(Math.random() * 2147483000) + 1
  const total = huntSeconds(planHearts(seed), HUNT_START)
  return { seed, cleared: [], broken: [], left: total, total }
}

const VIOLET: RGB = [214, 110, 255]
const DUSK: RGB = [150, 120, 206]
const TRIGGER = 540
const SENSE = 1500
const HEART_REACH = 200
const SAVE_EVERY = 4
const SHATTER = { crack: 1.3, done: 2.5 }
const MIX = 0.5

export function createHunt(deps: HuntDeps): Hunt {
  const { scene, progress, sound } = deps
  const sprites = heartSprites()
  const coreGlow = glowTexture([255, 92, 214], 64)
  const tipGlow = glowTexture([220, 180, 255], 32)
  const emberGlow = glowTexture([255, 132, 70], 32)
  const moteSprites = [glowTexture([206, 150, 255], 32), glowTexture([255, 140, 226], 32)]
  const sparkSprites = [glowTexture([255, 240, 255], 32), glowTexture([255, 120, 220], 32), glowTexture([190, 140, 255], 32)]
  const smokeSprites = [0, 1, 2].map((variant) => puffTexture([40, 30, 52], variant))
  const hud = createHarvestHud(deps.surface)
  let spots: HeartSpot[] = []
  let states: HeartState[] = []
  let armed: boolean[] = []
  let sensed: boolean[] = []
  let active = false
  let fighting = -1
  let lastBroken: HeartSpot | null = null
  let breaking: { index: number; t: number; exploded: boolean; done: (all: boolean) => void } | null = null
  let saveClock = SAVE_EVERY
  let time = 0
  let shake = 0
  let lastBeatSecond = -1
  const guards: { visitor: Visitor; heart: number; slot: number }[] = []
  let guardActors: Actor[] = []
  const heartActors: Actor[] = []

  const state = () => progress.story.hunt
  const brokenCount = () => states.filter((entry) => entry === 'broken').length
  const left = () => state()?.left ?? 0
  const urgency = () => {
    const current = state()
    if (!current) return 1
    return current.left <= 60 ? 0.6 : current.left <= 180 ? 0.8 : 1
  }
  const beatOf = (index: number) => {
    const period = (breaking?.index === index ? 0.34 : 1.05) * urgency()
    return heartbeat(time + index * 0.137, period)
  }

  function drawHeart(context: CanvasRenderingContext2D, spot: HeartSpot, originX: number, originY: number, zoom: number) {
    if (!active || !scene.outdoors) return
    const scale = zoom * TEXEL
    const x = originX + spot.x * zoom
    const y = originY + spot.y * zoom
    const width = HEART_ART.width * scale
    const height = HEART_ART.height * scale
    const left = x - HEART_ART.anchorX * scale
    const top = y - HEART_ART.anchorY * scale
    const { canvas } = context
    if (left > canvas.width || left + width < 0 || top > canvas.height || top + height < 0) return
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.imageSmoothingEnabled = false
    if (states[spot.index] === 'broken') {
      context.drawImage(sprites.broken, Math.round(left), Math.round(top), Math.round(width), Math.round(height))
      context.imageSmoothingEnabled = true
      return
    }
    const run = breaking?.index === spot.index && !breaking.exploded ? breaking : null
    const jitter = run ? (Math.random() - 0.5) * scale * 2.4 * Math.min(1, run.t / SHATTER.crack) : 0
    context.drawImage(sprites.body, Math.round(left + jitter), Math.round(top), Math.round(width), Math.round(height))
    const beat = beatOf(spot.index)
    const bob = Math.sin(time * 1.8 + spot.index) * scale * 0.8
    const size = CORE_SIZE * scale * (1 + 0.08 * beat + (run ? 0.12 * Math.random() : 0))
    const cx = left + HEART_ART.coreX * scale + jitter
    const cy = top + HEART_ART.coreY * scale + bob
    const shard = (index: number, front: boolean) => {
      const angle = time * 1.35 + index * 2.094 + spot.index
      if (Math.sin(angle) > 0 !== front) return
      const image = sprites.shards[index % sprites.shards.length]
      const sx = cx + Math.cos(angle) * 15 * scale
      const sy = cy + Math.sin(angle) * 6 * scale - 2 * scale
      context.drawImage(image, Math.round(sx - (image.width * scale) / 2), Math.round(sy - (image.height * scale) / 2), Math.round(image.width * scale), Math.round(image.height * scale))
    }
    for (let index = 0; index < 3; index++) shard(index, false)
    context.drawImage(sprites.cores[beat > 0.45 || run ? 1 : 0], Math.round(cx - size / 2), Math.round(cy - size / 2), Math.round(size), Math.round(size))
    for (let index = 0; index < 3; index++) shard(index, true)
    context.imageSmoothingEnabled = true
  }

  const ground = (context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) => {
    if (!active || !scene.outdoors) return
    const scale = zoom * TEXEL
    const { width, height } = context.canvas
    for (const spot of spots) {
      const x = originX + spot.x * zoom
      const y = originY + spot.y * zoom
      if (x < -400 || x > width + 400 || y < -200 || y > height + 200) continue
      const broken = states[spot.index] === 'broken'
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = broken ? 0.55 : 0.38
      context.fillStyle = '#0a0612'
      context.beginPath()
      context.ellipse(x, y - 2 * scale, 30 * scale, 10 * scale, 0, 0, Math.PI * 2)
      context.fill()
      if (broken) continue
      const beat = beatOf(spot.index)
      const rootWidth = sprites.roots.width * scale
      const rootHeight = sprites.roots.height * scale
      context.globalCompositeOperation = 'lighter'
      context.globalAlpha = 0.3 + 0.55 * beat
      context.imageSmoothingEnabled = false
      context.drawImage(sprites.roots, Math.round(x - rootWidth / 2), Math.round(y - rootHeight / 2 - 2 * scale), Math.round(rootWidth), Math.round(rootHeight))
      context.imageSmoothingEnabled = true
    }
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }

  const glow = (context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) => {
    if (!active || !scene.outdoors) return
    const scale = zoom * TEXEL
    const { width, height } = context.canvas
    for (const spot of spots) {
      const x = originX + spot.x * zoom
      const y = originY + spot.y * zoom
      const current = states[spot.index]
      const beat = beatOf(spot.index)
      const coreY = y - (HEART_ART.anchorY - HEART_ART.coreY) * scale
      if (current !== 'broken') {
        const beamHeight = 1700 * zoom
        const beamWidth = 96 * zoom
        if (x + beamWidth > 0 && x - beamWidth < width && coreY > 0 && coreY - beamHeight < height) {
          context.globalAlpha = 0.26 + 0.24 * beat
          context.drawImage(sprites.beam, x - beamWidth / 2, coreY - beamHeight, beamWidth, beamHeight)
        }
      }
      if (x < -500 || x > width + 500 || y < -700 || y > height + 400) continue
      if (current === 'broken') {
        const size = 120 * zoom
        context.globalAlpha = 0.28 + 0.12 * Math.sin(time * 3.1 + spot.index)
        context.drawImage(emberGlow, x - size / 2, y - 14 * scale - size / 2, size, size)
        continue
      }
      const size = (220 + 160 * beat) * zoom
      context.globalAlpha = Math.min(1, 0.5 + 0.42 * beat)
      context.drawImage(coreGlow, x - size / 2, coreY - size / 2, size, size)
      const tip = (60 + 20 * Math.sin(time * 6 + spot.index)) * zoom
      context.globalAlpha = 0.7
      context.drawImage(tipGlow, x - tip / 2, y - (HEART_ART.anchorY - 1) * scale - tip / 2, tip, tip)
      if (current === 'guarded') {
        const dome = 380 * zoom
        context.globalAlpha = 0.3 + 0.1 * Math.sin(time * 5.3 + spot.index) + 0.16 * beat
        context.drawImage(sprites.dome, x - dome / 2, coreY - dome / 2 + 14 * zoom, dome, dome)
      }
      const run = breaking?.index === spot.index && !breaking.exploded ? breaking : null
      if (run) {
        const amount = Math.min(1, run.t / SHATTER.crack)
        context.globalAlpha = 0.5 + 0.5 * Math.random()
        context.strokeStyle = 'rgba(255, 244, 255, 0.95)'
        context.lineWidth = Math.max(1.5, 2.4 * zoom)
        for (let ray = 0; ray < 7; ray++) {
          const angle = (ray / 7) * Math.PI * 2 + spot.index
          let px = x
          let py = coreY
          context.beginPath()
          context.moveTo(px, py)
          const steps = 5
          for (let step = 1; step <= steps; step++) {
            const reach = ((amount * 150 * step) / steps) * zoom
            px = x + Math.cos(angle + Math.sin(step * 3.1 + ray) * 0.35) * reach
            py = coreY + Math.sin(angle + Math.cos(step * 2.3 + ray) * 0.35) * reach * 0.8
            context.lineTo(px, py)
          }
          context.stroke()
        }
        const flash = (320 + 520 * amount) * zoom
        context.globalAlpha = 0.45 * amount
        context.drawImage(coreGlow, x - flash / 2, coreY - flash / 2, flash, flash)
      }
    }
    context.globalAlpha = 1
  }

  function placeGuards() {
    const count = guardKinds(brokenCount()).length
    const player = deps.player
    for (const entry of guards) {
      const spot = spots[entry.heart]
      const visible = active && scene.outdoors && states[entry.heart] === 'guarded' && fighting !== entry.heart && entry.slot < count
      entry.visitor.visible = visible
      if (!visible || !spot) continue
      const [gx, gy] = spot.guards[entry.slot]
      const near = Math.hypot(player.x - gx, player.y - gy) < 900
      const lookX = near ? player.x : spot.x
      const lookY = near ? player.y : spot.y
      entry.visitor.place(gx, gy, directionFromVector(lookX - gx, lookY - gy, entry.visitor.facing, 0.2))
      entry.visitor.moving = false
      entry.visitor.frame = 0
      entry.visitor.pose = null
      entry.visitor.disguise = 0
      entry.visitor.rise = 1
      entry.visitor.glow = 0.2 + 0.25 * beatOf(entry.heart) + (near ? 0.15 : 0)
    }
  }

  function buildActors() {
    for (const spot of spots) {
      const actor: Actor = { depth: spot.y, draw: (context, originX, originY, zoom) => drawHeart(context, spot, originX, originY, zoom) }
      heartActors.push(actor)
      scene.extras.push(actor)
      spot.guards.forEach((_, slot) => {
        const visitor = new Visitor()
        visitor.visible = false
        guards.push({ visitor, heart: spot.index, slot })
      })
    }
    guardActors = visitorActors(
      guards.map((entry) => entry.visitor),
      deps.visitors,
    )
    scene.extras.push(...guardActors)
    placeGuards()
  }

  function clearActors() {
    for (const actor of [...heartActors, ...guardActors]) {
      const index = scene.extras.indexOf(actor)
      if (index >= 0) scene.extras.splice(index, 1)
    }
    heartActors.length = 0
    guardActors = []
    guards.length = 0
  }

  function burst(spot: HeartSpot, power: number) {
    const coreY = spot.y - (HEART_ART.anchorY - HEART_ART.coreY) * TEXEL
    for (let index = 0; index < Math.round(110 * power); index++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 300 + Math.random() * 1200 * power
      scene.particles.spawn({
        x: spot.x,
        y: coreY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.7,
        drag: 2,
        life: 0.4 + Math.random() * 0.8,
        size: 14 + Math.random() * 14,
        sizeEnd: 4,
        stretch: 0.02,
        sprite: sparkSprites,
        blend: 'add',
      })
    }
    for (let index = 0; index < Math.round(26 * power); index++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 200 + Math.random() * 700
      scene.particles.spawn({
        x: spot.x + Math.cos(angle) * 20,
        y: spot.y - 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        vz: 400 + Math.random() * 900,
        gravity: 2200,
        bounce: 0.3,
        life: 1.6 + Math.random() * 1.6,
        size: 18 + Math.random() * 20,
        spin: (Math.random() - 0.5) * 18,
        angle: Math.random() * 6,
        sprite: sprites.shards,
        shadow: true,
        fadeIn: 0.01,
      })
    }
    for (let index = 0; index < Math.round(10 * power); index++) {
      scene.particles.spawn({
        x: spot.x + (Math.random() - 0.5) * 120,
        y: spot.y - 30,
        vx: (Math.random() - 0.5) * 120,
        rise: 60 + Math.random() * 70,
        life: 2 + Math.random() * 1.6,
        size: 110,
        sizeEnd: 380 + Math.random() * 160,
        alpha: 0.4,
        fadeIn: 0.1,
        sprite: smokeSprites[index % smokeSprites.length],
        blend: 'haze',
      })
    }
    scene.addRing(spot.x, coreY + 60, 900 * power, 0.7, 0.85, true)
    scene.addRing(spot.x, spot.y, 620 * power, 1.3, 0.45, false)
  }

  function shieldBurst(spot: HeartSpot) {
    const coreY = spot.y - (HEART_ART.anchorY - HEART_ART.coreY) * TEXEL
    for (let index = 0; index < 48; index++) {
      const angle = (index / 48) * Math.PI * 2
      scene.particles.spawn({
        x: spot.x + Math.cos(angle) * 170,
        y: coreY + Math.sin(angle) * 150,
        vx: Math.cos(angle) * 380,
        vy: Math.sin(angle) * 300,
        drag: 2.4,
        life: 0.6 + Math.random() * 0.4,
        size: 16,
        sizeEnd: 3,
        sprite: moteSprites,
        blend: 'add',
      })
    }
    scene.addRing(spot.x, coreY, 520, 0.6, 0.7, true)
  }

  function stepBreaking(dt: number) {
    const run = breaking
    if (!run) return
    run.t += dt
    const spot = spots[run.index]
    if (!run.exploded && Math.random() < dt * 26) {
      const angle = Math.random() * Math.PI * 2
      scene.particles.spawn({
        x: spot.x,
        y: spot.y - (HEART_ART.anchorY - HEART_ART.coreY) * TEXEL,
        vx: Math.cos(angle) * 260,
        vy: Math.sin(angle) * 200,
        drag: 3,
        life: 0.4,
        size: 12,
        sizeEnd: 2,
        sprite: sparkSprites,
        blend: 'add',
      })
    }
    if (!run.exploded && run.t >= SHATTER.crack) {
      run.exploded = true
      states[run.index] = 'broken'
      lastBroken = spot
      const current = state()
      if (current && !current.broken.includes(run.index)) current.broken.push(run.index)
      saveProgress(progress)
      burst(spot, 1)
      shake = 1
      scene.flash = Math.max(scene.flash, 0.6)
      sound.stopCue('charge')
      sound.cue('split')
      sound.cue('shadow')
      sound.cue('heavy')
      if (current) hud.set(current.left, current.total, brokenCount())
    }
    if (run.t >= SHATTER.done) {
      breaking = null
      const all = brokenCount() >= HEART_COUNT
      if (!all) hud.banner(HEART_LINES.broken, `${brokenCount()} de ${HEART_COUNT} · ${spot.name}`)
      run.done(all)
    }
  }

  function begin() {
    const current = state()
    if (!current) return
    end()
    spots = planHearts(current.seed)
    states = spots.map((_, index) => (current.broken.includes(index) ? 'broken' : current.cleared.includes(index) ? 'exposed' : 'guarded'))
    armed = spots.map(() => true)
    sensed = spots.map((_, index) => states[index] === 'broken')
    active = true
    fighting = -1
    breaking = null
    lastBroken = null
    buildActors()
    setStoryObstacles(spots.map((spot) => ({ x: spot.x, y: spot.y - 6, rx: HEART_FOOTPRINT.rx, ry: HEART_FOOTPRINT.ry })))
    scene.storyGround = ground
    scene.storyGlow = glow
    hud.set(current.left, current.total, brokenCount())
    hud.show()
  }

  function end() {
    clearActors()
    if (scene.storyGround === ground) scene.storyGround = null
    if (scene.storyGlow === glow) scene.storyGlow = null
    setStoryObstacles([])
    active = false
    breaking = null
    fighting = -1
    hud.hide()
  }

  return {
    get active() {
      return active
    },
    get busy() {
      return breaking !== null
    },
    get left() {
      return left()
    },
    get broken() {
      return brokenCount()
    },
    get spots() {
      return spots
    },
    get lastBroken() {
      return lastBroken
    },
    begin,
    end,

    clock(dt) {
      const current = state()
      if (!active || !current) return 'running'
      current.left = Math.max(0, current.left - dt)
      hud.set(current.left, current.total, brokenCount())
      saveClock -= dt
      if (saveClock <= 0) {
        saveClock = SAVE_EVERY
        saveProgress(progress)
      }
      if (current.left <= 0) {
        saveProgress(progress)
        return 'expired'
      }
      const second = Math.ceil(current.left)
      if (current.left <= 30 && second !== lastBeatSecond) {
        lastBeatSecond = second
        sound.cue('heartbeat')
      }
      return 'running'
    },

    tend(dt, camera) {
      if (!active) return
      time += dt
      placeGuards()
      stepBreaking(dt)
      if (shake > 0) {
        shake = Math.max(0, shake - dt * 2.6)
        const amount = shake * shake * 14
        scene.shakeX = (Math.random() - 0.5) * 2 * amount
        scene.shakeY = (Math.random() - 0.5) * 2 * amount * 0.7
        if (shake <= 0) {
          scene.shakeX = 0
          scene.shakeY = 0
        }
      }
      if (!scene.outdoors) return
      const player = deps.player
      for (const spot of spots) {
        const current = states[spot.index]
        if (!sensed[spot.index] && current !== 'broken' && Math.hypot(player.x - spot.x, player.y - spot.y) < SENSE) {
          sensed[spot.index] = true
          hud.banner(HEART_LINES.sensed, `${spot.name} · ${spot.zone}`)
          sound.cue('heartbeat')
        }
        if (!armed[spot.index] && Math.hypot(player.x - spot.x, player.y - spot.y) > TRIGGER * 1.35) armed[spot.index] = true
        if (Math.abs(camera.x - spot.x) > 2600 || Math.abs(camera.y - spot.y) > 2100) continue
        const beat = beatOf(spot.index)
        if (current === 'broken') {
          scene.worldLights.push({ x: spot.x, y: spot.y - 40, radius: 280, color: [255, 120, 70], intensity: 0.38 })
          if (Math.random() < dt * 1.4) {
            scene.particles.spawn({
              x: spot.x + (Math.random() - 0.5) * 60,
              y: spot.y - 40,
              vx: 10 + Math.random() * 14,
              rise: 50 + Math.random() * 40,
              life: 2.4 + Math.random(),
              size: 40,
              sizeEnd: 170,
              alpha: 0.28,
              fadeIn: 0.25,
              sprite: smokeSprites[Math.floor(Math.random() * smokeSprites.length)],
              blend: 'haze',
            })
          }
          continue
        }
        scene.worldLights.push({ x: spot.x, y: spot.y - 150, radius: 700, color: VIOLET, intensity: 0.72 + 0.45 * beat })
        if (Math.random() < dt * 8) {
          const angle = Math.random() * Math.PI * 2
          const distance = 40 + Math.random() * 200
          scene.particles.spawn({
            x: spot.x + Math.cos(angle) * distance,
            y: spot.y + Math.sin(angle) * distance * 0.5,
            rise: 70 + Math.random() * 110,
            wobble: 60,
            life: 1.6 + Math.random() * 1.4,
            size: 9 + Math.random() * 9,
            sizeEnd: 2,
            sprite: moteSprites,
            blend: 'add',
          })
        }
      }
    },

    tint(base) {
      if (!active) return base
      return [Math.round(base[0] + (DUSK[0] - base[0]) * MIX), Math.round(base[1] + (DUSK[1] - base[1]) * MIX), Math.round(base[2] + (DUSK[2] - base[2]) * MIX)]
    },

    guardAt(x, y) {
      if (!active || breaking) return -1
      let best = -1
      let bestDistance = TRIGGER
      for (const spot of spots) {
        if (states[spot.index] !== 'guarded' || !armed[spot.index]) continue
        const distance = Math.hypot(spot.x - x, spot.y - y)
        if (distance < bestDistance) {
          bestDistance = distance
          best = spot.index
        }
      }
      return best
    },

    fight(index) {
      const spot = spots[index]
      if (!spot || states[index] !== 'guarded') return null
      const level = Math.max(currentLevel(progress), FINALE_LEVEL)
      const cycle = ladderCycle(progress)
      const rank = ladderRank(level)
      const tier = ladderTier(level, cycle) * 0.7
      const power = ladderPower(level, cycle) * 0.85
      const kinds = guardKinds(brokenCount())
      const specs = kinds.map((kind) => {
        const spec = drawEnemy(kind, rank, tier, progress.core.element, Math.random, power)
        if (kind !== 'alien') spec.faction = 'forasteiros'
        return spec
      })
      const counts = new Map<string, number>()
      for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1)
      const mission: Mission = {
        id: `coracao-${index + 1}`,
        kind: 'side',
        order: 0,
        title: `Coração da ${spot.name}`,
        tagline: HEART_LINES.guardsSub,
        description: `${spot.name}, ${spot.zone}. ${HEART_LINES.guardsSub}.`,
        reward: 0,
        rounds: [[...counts].map(([kind, count]) => ({ kind: kind as Mission['rounds'][number][number]['kind'], count }))],
        tier,
        outro: HEART_LINES.outro,
      }
      const lineup: Lineup = { rounds: [specs], level: rank, rank: rankName(rank), reason: '', prize: 0 }
      fighting = index
      return {
        mission,
        lineup,
        spawns: spot.guards,
        alarm: { title: HEART_LINES.guards, sub: `${spot.name} · ${HEART_LINES.guardsSub}`, fight: HEART_LINES.fight },
        at: { x: deps.player.x, y: deps.player.y },
      }
    },

    afterFight(won, mission) {
      const index = Number(/^coracao-(\d+)$/.exec(mission.id)?.[1] ?? 0) - 1
      fighting = -1
      const current = state()
      if (index < 0 || !current || !spots[index]) return
      if (!won) {
        armed[index] = false
        return
      }
      if (!current.cleared.includes(index)) current.cleared.push(index)
      states[index] = 'exposed'
      saveProgress(progress)
      shieldBurst(spots[index])
      sound.cue('light')
      hud.banner(HEART_LINES.exposed, spots[index].name)
    },

    heartAt(x, y) {
      if (!active || breaking) return null
      for (const spot of spots) {
        if (states[spot.index] !== 'exposed') continue
        if (Math.hypot(spot.x - x, (spot.y - y) * 1.3) <= HEART_REACH) return spot
      }
      return null
    },

    shatter(index, done) {
      if (breaking || states[index] !== 'exposed') return false
      breaking = { index, t: 0, exploded: false, done }
      sound.cue('charge', SHATTER.crack)
      sound.cue('heartbeat')
      return true
    },

    objective(x, y) {
      if (!active) return null
      let best: HeartSpot | null = null
      let bestDistance = Infinity
      for (const spot of spots) {
        if (states[spot.index] === 'broken') continue
        const distance = Math.hypot(spot.x - x, spot.y - y)
        if (distance < bestDistance) {
          bestDistance = distance
          best = spot
        }
      }
      if (!best) return null
      const current = states[best.index]
      hud.goal(current === 'exposed' ? 'Quebre o coração exposto' : 'Derrube os guardas', `${best.name} · ${best.zone}`, current === 'exposed' ? 'exposed' : 'guarded')
      return {
        id: `heart:${best.index}:${current}`,
        emblem: 'secret',
        kicker: `A Colheita · ${brokenCount()} de ${HEART_COUNT} corações`,
        title: current === 'exposed' ? 'Quebre o coração exposto' : 'Coração da Colheita',
        goal: `${best.name} · ${best.zone}`,
        target: [best.x, best.y],
      }
    },

    announce(kind) {
      if (kind === 'start') {
        hud.announce(HARVEST_CARD.kicker, HARVEST_CARD.title, HARVEST_CARD.text)
        return
      }
      if (kind === 'resume') {
        hud.announce(FINALE_TITLE, 'A Colheita continua', `${clockText(left())} no relógio. ${HEART_COUNT - brokenCount()} corações ainda batem na floresta.`)
        return
      }
      hud.announce(FINALE_TITLE, 'Mais uma chance', 'O relógio voltou ao começo. Os corações estão onde estavam, e os guardas também.')
    },

    reset() {
      const current = state()
      if (!current) return
      current.left = current.total
      current.cleared = []
      current.broken = []
      saveProgress(progress)
      begin()
    },

    showHud(visible) {
      if (visible && active) hud.show()
      else hud.hide()
    },

    destroy() {
      end()
      hud.destroy()
    },
  }
}
