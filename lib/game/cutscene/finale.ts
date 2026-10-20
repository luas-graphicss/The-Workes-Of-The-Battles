import { LUME_PLAZA } from '../../city/layout'
import { BEACON, BEACON_TOP, COLD_FIRE, HOME_START, METEOR_SITE, type Point } from '../../world-data'
import type { Sound } from '../audio'
import { heartSprites } from '../finale/art'
import type { HeartSpot } from '../finale/layout'
import { mixColor } from '../fx/lighting'
import { glowTexture, puffTexture, type RGB } from '../fx/textures'
import type { Player } from '../player'
import type { Scene, WorldDraw } from '../scene'
import { ENDING_CAPTIONS, ENDING_LINES, GAME_OVER, HARVEST_LINES } from '../story/finale'
import type { CinemaScript } from './cinema'
import { clamp01, decay, easeInOutSine, easeOutCubic, lerp, smoothstep } from './easing'
import type { Overlay } from './overlay'
import { Visitor, visitorActors, type VisitorArt } from './visitors'

export type FinaleCineDeps = {
  scene: Scene
  sound: Sound
  overlay: Overlay
  player: Player
  robot: Player
  visitors: VisitorArt
}

const DAYLIGHT: RGB = [255, 255, 255]
const NIGHT_VIOLET: RGB = [78, 62, 138]
const DUSK: RGB = [150, 120, 206]
const DARK: RGB = [34, 30, 60]
const DAWN: RGB = [244, 186, 150]
const MORNING: RGB = [255, 238, 214]
const GOLD: RGB = [255, 214, 130]
const [TOWER_X, TOWER_TOP] = BEACON_TOP
const [SITE_X, SITE_Y] = METEOR_SITE
const HEART: Point = [SITE_X, SITE_Y + 6]
export const SEED_ROOT: Point = [SITE_X, SITE_Y + 64]
const TREE_DEPTH = 6

type Branch = { x0: number; y0: number; x1: number; y1: number; depth: number; width: number; tint: number }

let branches: Branch[] | null = null
let textures: { violet: HTMLCanvasElement; gold: HTMLCanvasElement; teal: HTMLCanvasElement; white: HTMLCanvasElement; motes: HTMLCanvasElement[]; smoke: HTMLCanvasElement[] } | null = null

function art() {
  textures ??= {
    violet: glowTexture([196, 140, 255], 64),
    gold: glowTexture([255, 214, 130], 64),
    teal: glowTexture([126, 255, 224], 64),
    white: glowTexture([255, 250, 240], 64),
    motes: [glowTexture([255, 120, 120], 32), glowTexture([120, 200, 255], 32), glowTexture([140, 255, 170], 32), glowTexture([255, 214, 110], 32), glowTexture([214, 160, 255], 32)],
    smoke: [0, 1, 2].map((variant) => puffTexture([36, 28, 46], variant)),
  }
  return textures
}

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function treeBranches(): Branch[] {
  if (branches) return branches
  const list: Branch[] = []
  const random = seeded(91)
  const grow = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
    const x1 = x + Math.cos(angle) * length
    const y1 = y + Math.sin(angle) * length * 0.92
    list.push({ x0: x, y0: y, x1, y1, depth, width, tint: random() })
    if (depth >= TREE_DEPTH) return
    const spread = 0.34 + random() * 0.24
    grow(x1, y1, angle - spread + (random() - 0.5) * 0.18, length * (0.7 + random() * 0.1), width * 0.66, depth + 1)
    grow(x1, y1, angle + spread + (random() - 0.5) * 0.18, length * (0.7 + random() * 0.1), width * 0.66, depth + 1)
    if (depth > 0 && depth < 4 && random() < 0.45) grow(x1, y1, angle + (random() - 0.5) * 0.3, length * 0.58, width * 0.6, depth + 1)
  }
  grow(0, 0, -Math.PI / 2, 240, 30, 0)
  branches = list
  return list
}

export function drawSeedTree(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number, growth: number) {
  if (growth <= 0) return
  const baseX = originX + SEED_ROOT[0] * zoom
  const baseY = originY + SEED_ROOT[1] * zoom
  const { width, height } = context.canvas
  if (baseX < -900 * zoom || baseX > width + 900 * zoom || baseY < -100 || baseY - 1100 * zoom > height) return
  const { gold, teal, white } = art()
  context.globalCompositeOperation = 'lighter'
  context.lineCap = 'round'
  const bloom = 700 * zoom * Math.min(1, growth * 1.4)
  context.globalAlpha = 0.32 * Math.min(1, growth * 2)
  context.drawImage(gold, baseX - bloom / 2, baseY - bloom * 0.55, bloom, bloom)
  const levels = TREE_DEPTH + 1
  for (const branch of treeBranches()) {
    const local = clamp01(growth * levels - branch.depth)
    if (local <= 0) continue
    const x0 = baseX + branch.x0 * zoom
    const y0 = baseY + branch.y0 * zoom
    const x1 = baseX + (branch.x0 + (branch.x1 - branch.x0) * local) * zoom
    const y1 = baseY + (branch.y0 + (branch.y1 - branch.y0) * local) * zoom
    const shimmer = 0.78 + 0.22 * Math.sin(time * 2.2 + branch.depth * 1.3 + branch.tint * 6)
    context.globalAlpha = 1
    context.beginPath()
    context.moveTo(x0, y0)
    context.lineTo(x1, y1)
    context.strokeStyle = `rgba(126, 255, 224, ${0.2 * shimmer})`
    context.lineWidth = Math.max(2, branch.width * 2.4 * zoom)
    context.stroke()
    context.strokeStyle = `rgba(255, 226, 150, ${0.5 * shimmer})`
    context.lineWidth = Math.max(1.2, branch.width * 0.95 * zoom)
    context.stroke()
    context.strokeStyle = `rgba(255, 252, 236, ${0.85 * shimmer})`
    context.lineWidth = Math.max(1, branch.width * 0.32 * zoom)
    context.stroke()
    if (branch.depth >= TREE_DEPTH - 1 && local >= 1) {
      const leaf = (46 + 22 * Math.sin(time * 3 + branch.tint * 9)) * zoom * (branch.depth === TREE_DEPTH ? 1 : 0.7)
      context.globalAlpha = 0.8 * shimmer
      context.drawImage(branch.tint > 0.5 ? teal : gold, x1 - leaf / 2, y1 - leaf / 2, leaf, leaf)
      if (branch.tint > 0.85) {
        const spark = leaf * 0.5
        context.globalAlpha = 0.9
        context.drawImage(white, x1 - spark / 2, y1 - spark / 2, spark, spark)
      }
    }
  }
  context.globalAlpha = 1
}

function beamDown(context: CanvasRenderingContext2D, beam: HTMLCanvasElement, x: number, top: number, width: number, alpha: number) {
  if (alpha <= 0.01 || top <= 0) return
  const height = top + 60
  context.globalAlpha = Math.min(1, alpha)
  context.drawImage(beam, x - width / 2, top - height, width, height)
}

function spawnInward(scene: Scene, x: number, y: number, radius: number, sprites: HTMLCanvasElement[], speed: number) {
  const angle = Math.random() * Math.PI * 2
  const distance = radius * (0.6 + Math.random() * 0.4)
  const life = distance / speed
  scene.particles.spawn({
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance * 0.6,
    vx: -Math.cos(angle) * speed,
    vy: -Math.sin(angle) * speed * 0.6,
    life,
    size: 12 + Math.random() * 10,
    sizeEnd: 4,
    sprite: sprites,
    blend: 'add',
    fadeIn: 0.2,
  })
}

export function harvestScript(deps: FinaleCineDeps, back: Point): CinemaScript {
  const { scene, sound, overlay } = deps
  const { violet, white } = art()
  const beam = heartSprites().beam
  let time = 0
  let ignite = 0
  const T = { crater: 4.6, town: 9.2, end: 13.6 }
  const beats = [5.4, 6.3, 7.2, 8.0]
  const glow: WorldDraw = (context, originX, originY, zoom) => {
    context.globalCompositeOperation = 'lighter'
    if (time < T.crater) {
      const x = originX + TOWER_X * zoom
      const top = originY + TOWER_TOP * zoom
      beamDown(context, beam, x, top, (120 + 80 * ignite) * zoom, ignite * (0.78 + 0.22 * Math.sin(time * 23)))
      const size = (160 + 420 * ignite) * zoom
      context.globalAlpha = 0.4 + 0.5 * ignite
      context.drawImage(violet, x - size / 2, top - size / 2, size, size)
    } else if (time < T.town) {
      const pulse = beats.reduce((sum, at) => sum + decay(at, time, 4.5), 0)
      const x = originX + HEART[0] * zoom
      const y = originY + HEART[1] * zoom
      const size = (260 + 260 * pulse) * zoom
      context.globalAlpha = Math.min(1, 0.45 + 0.6 * pulse)
      context.drawImage(violet, x - size / 2, y - size / 2, size, size)
      context.globalAlpha = 0.4 * pulse
      context.drawImage(white, x - size / 4, y - size / 4, size / 2, size / 2)
    }
    context.globalAlpha = 1
  }
  return {
    duration: T.end,
    cuts: [T.crater, T.town],
    glow,
    keys: [
      { at: 0, x: TOWER_X, y: TOWER_TOP + 260, zoom: 0.9 },
      { at: T.crater, x: TOWER_X, y: TOWER_TOP + 150, zoom: 1.08 },
      { at: T.crater, x: SITE_X, y: SITE_Y + 140, zoom: 1.18 },
      { at: T.town, x: SITE_X, y: SITE_Y + 70, zoom: 1.42 },
      { at: T.town, x: back[0], y: back[1] - 250, zoom: 0.82 },
      { at: T.end, x: back[0], y: back[1] - 70, zoom: 1, ease: easeInOutSine },
    ],
    shake: (t) => 10 * decay(2.7, t, 3) + beats.reduce((sum, at) => sum + 3 * decay(at, t, 6), 0),
    cues: [
      { at: 0.3, run: () => overlay.caption(HARVEST_LINES.tower.kicker, HARVEST_LINES.tower.title) },
      { at: 0.4, run: () => sound.cue('charge', 2.3) },
      {
        at: 2.7,
        run: () => {
          sound.stopCue('charge')
          sound.cue('warp')
          sound.cue('heavy')
          scene.flash = Math.max(scene.flash, 0.45)
          scene.addRing(TOWER_X, BEACON.y, 1700, 1.1, 0.8, true)
          scene.addRing(TOWER_X, BEACON.y, 900, 1.6, 0.4, false)
        },
      },
      { at: 4.1, run: () => overlay.hideCaption() },
      { at: 4.9, run: () => overlay.caption(HARVEST_LINES.crater.kicker, HARVEST_LINES.crater.title) },
      ...beats.map((at) => ({
        at,
        run: () => {
          sound.cue('heartbeat')
          scene.addRing(SITE_X, SITE_Y + 60, 1000, 0.9, 0.45, true)
        },
      })),
      { at: 8.7, run: () => overlay.hideCaption() },
      { at: 9.7, run: () => overlay.caption(HARVEST_LINES.town.kicker, HARVEST_LINES.town.title) },
      { at: 12.9, run: () => overlay.hideCaption() },
    ],
    frame: (t, dt) => {
      time = t
      scene.lights.length = 0
      scene.worldLights.length = 0
      if (t < T.crater) {
        scene.playerVisible = false
        scene.companionVisible = false
        scene.ambient = NIGHT_VIOLET
        ignite = smoothstep(2.6, 3, t)
        scene.beacon(dt, TOWER_X, TOWER_TOP + 14, t)
        scene.campfire(dt, COLD_FIRE[0], COLD_FIRE[1], t, true)
        scene.lights.push({ x: TOWER_X, y: TOWER_TOP, radius: 900 + 1400 * ignite, color: [190, 130, 255], intensity: 0.6 + 1.1 * ignite })
        if (ignite > 0 && Math.random() < dt * 40) {
          scene.particles.spawn({
            x: TOWER_X + (Math.random() - 0.5) * 60,
            y: TOWER_TOP,
            vx: (Math.random() - 0.5) * 30,
            rise: 500 + Math.random() * 400,
            life: 1.2,
            size: 14,
            sizeEnd: 4,
            sprite: violet,
            blend: 'add',
          })
        }
        return
      }
      if (t < T.town) {
        scene.ambient = mixColor(NIGHT_VIOLET, DARK, 0.3)
        scene.crater = 1
        scene.pose.visible = true
        scene.pose.time = t
        const pulse = beats.reduce((sum, at) => sum + decay(at, t, 4.5), 0)
        scene.pose.heat = 0.9 + pulse
        scene.pose.rays = 0.2 + 0.5 * pulse
        scene.lights.push({ x: HEART[0], y: HEART[1], radius: 1300, color: [176, 120, 255], intensity: 0.8 + 1.2 * pulse })
        if (Math.random() < dt * 34) spawnInward(scene, HEART[0], HEART[1], 900, [violet], 520)
        return
      }
      scene.playerVisible = true
      scene.companionVisible = true
      scene.ambient = mixColor(DAYLIGHT, DUSK, 0.5 * smoothstep(T.town, T.town + 2.6, t))
      scene.companionGlow = 0.3 + 0.7 * Math.abs(Math.sin(t * 5))
    },
    skip: () => {
      sound.stopCue('charge')
      overlay.hideCaption()
    },
    finish: () => {
      overlay.hideCaption()
      scene.companionGlow = 0
      scene.playerVisible = true
      scene.companionVisible = true
      scene.lights.length = 0
    },
  }
}

export function fallScript(deps: FinaleCineDeps, back: Point): CinemaScript {
  const { scene, sound, overlay } = deps
  const { violet, white } = art()
  const beam = heartSprites().beam
  let time = 0
  const T = { crater: 3.8, town: 7.6, end: 13 }
  const slow = [8.3, 9.3, 10.6, 12.2]
  const glow: WorldDraw = (context, originX, originY, zoom) => {
    context.globalCompositeOperation = 'lighter'
    if (time < T.crater) {
      const surge = smoothstep(0.4, 2.4, time)
      const x = originX + TOWER_X * zoom
      const top = originY + TOWER_TOP * zoom
      beamDown(context, beam, x, top, (180 + 900 * surge) * zoom, 0.9)
      const size = (400 + 2400 * surge) * zoom
      context.globalAlpha = 0.5 + 0.4 * surge
      context.drawImage(violet, x - size / 2, top - size / 2, size, size)
    } else if (time < T.town) {
      const flare = smoothstep(T.crater, T.crater + 1.4, time)
      const x = originX + HEART[0] * zoom
      const y = originY + HEART[1] * zoom
      const size = (300 + 1600 * flare) * zoom
      context.globalAlpha = 0.6 + 0.4 * flare
      context.drawImage(violet, x - size / 2, y - size / 2, size, size)
      context.globalAlpha = 0.5 * flare
      context.drawImage(white, x - size / 6, y - size / 6, size / 3, size / 3)
    }
    context.globalAlpha = 1
  }
  return {
    duration: T.end,
    cuts: [T.crater, T.town],
    fadeOut: 1.6,
    glow,
    keys: [
      { at: 0, x: TOWER_X, y: TOWER_TOP + 220, zoom: 1.05 },
      { at: T.crater, x: TOWER_X, y: TOWER_TOP + 320, zoom: 0.82 },
      { at: T.crater, x: SITE_X, y: SITE_Y + 100, zoom: 1.35 },
      { at: T.town, x: SITE_X, y: SITE_Y + 60, zoom: 1.05 },
      { at: T.town, x: back[0], y: back[1] - 120, zoom: 1.25 },
      { at: T.end, x: back[0], y: back[1] - 80, zoom: 1.45, ease: easeOutCubic },
    ],
    shake: (t) => 22 * decay(2.4, t, 1.8) + 14 * decay(T.crater + 1.2, t, 2.2) + (t < T.crater ? 6 * smoothstep(0.4, 2.4, t) : 0),
    cues: [
      { at: 0.2, run: () => sound.cue('charge', 2.2) },
      {
        at: 2.4,
        run: () => {
          sound.stopCue('charge')
          sound.cue('impact')
          sound.cue('shadow')
          scene.flash = Math.max(scene.flash, 0.7)
          scene.addRing(TOWER_X, BEACON.y, 4200, 1.4, 1, true)
          scene.addRing(TOWER_X, BEACON.y, 2400, 2.2, 0.6, false)
        },
      },
      {
        at: T.crater + 1.2,
        run: () => {
          sound.cue('split')
          sound.cue('light')
          scene.flash = Math.max(scene.flash, 0.55)
          scene.addRing(SITE_X, SITE_Y + 60, 2600, 1.2, 0.9, true)
        },
      },
      { at: T.town + 0.5, run: () => overlay.caption(GAME_OVER.kicker, GAME_OVER.line) },
      ...slow.map((at) => ({ at, run: () => sound.cue('heartbeat') })),
    ],
    frame: (t, dt) => {
      time = t
      scene.lights.length = 0
      scene.worldLights.length = 0
      if (t < T.crater) {
        scene.playerVisible = false
        scene.companionVisible = false
        scene.ambient = NIGHT_VIOLET
        scene.lights.push({ x: TOWER_X, y: TOWER_TOP, radius: 2600, color: [190, 120, 255], intensity: 1.6 })
        if (Math.random() < dt * 50) spawnInward(scene, TOWER_X, BEACON.y - 140, 1200, [violet], 700)
        return
      }
      if (t < T.town) {
        scene.ambient = mixColor(NIGHT_VIOLET, DARK, 0.4)
        scene.crater = 1
        scene.pose.visible = true
        scene.pose.time = t
        const flare = smoothstep(T.crater, T.crater + 1.4, t)
        scene.pose.heat = 1 + 1.6 * flare
        scene.pose.rays = 0.4 + 0.6 * flare
        scene.pillar = flare * (1 - smoothstep(T.town - 1.2, T.town, t))
        scene.lights.push({ x: HEART[0], y: HEART[1], radius: 2400, color: [190, 120, 255], intensity: 1.2 + 1.4 * flare })
        return
      }
      scene.pillar = 0
      scene.playerVisible = true
      scene.companionVisible = true
      const drain = smoothstep(T.town, T.town + 3, t)
      scene.ambient = mixColor(mixColor(DAYLIGHT, DUSK, 0.5), DARK, drain)
      const fading = 1 - smoothstep(T.town + 0.6, T.end - 1.6, t)
      scene.companionGlow = fading * (Math.random() < 0.15 ? 0.1 : 0.6 + 0.4 * Math.sin(t * 9))
      scene.lights.push({ x: deps.robot.x, y: deps.robot.y - 60, radius: 360, color: [214, 232, 255], intensity: 0.7 * fading })
      if (Math.random() < dt * 6 * fading) {
        scene.particles.spawn({
          x: deps.robot.x + (Math.random() - 0.5) * 40,
          y: deps.robot.y - 90,
          rise: 60 + Math.random() * 60,
          wobble: 30,
          life: 1.4,
          size: 10,
          sizeEnd: 2,
          sprite: white,
          blend: 'add',
        })
      }
    },
    skip: () => {
      sound.stopCue('charge')
      overlay.hideCaption()
    },
    finish: () => {
      overlay.hideCaption()
      scene.pillar = 0
      scene.companionGlow = 0
      scene.playerVisible = true
      scene.companionVisible = true
      scene.lights.length = 0
    },
  }
}

export function creditsScript(deps: FinaleCineDeps): CinemaScript {
  const { scene, player, robot } = deps
  const { gold, teal } = art()
  const home: Point = [HOME_START[0] + 30, HOME_START[1] - 90]
  const robotHome: Point = [HOME_START[0] + 72, HOME_START[1] - 8]
  const seedTop: Point = [SEED_ROOT[0], SEED_ROOT[1] - 420]
  return {
    duration: 1800,
    fadeIn: 2.4,
    keys: [
      { at: 0, x: home[0], y: home[1], zoom: 1.24 },
      { at: 30, x: LUME_PLAZA[0], y: LUME_PLAZA[1] - 140, zoom: 0.94, ease: easeInOutSine },
      { at: 64, x: SITE_X, y: SITE_Y - 180, zoom: 0.8, ease: easeInOutSine },
      { at: 98, x: (SITE_X + LUME_PLAZA[0]) / 2, y: (SITE_Y + LUME_PLAZA[1]) / 2 - 120, zoom: 0.86, ease: easeInOutSine },
      { at: 132, x: home[0], y: home[1] - 30, zoom: 1.12, ease: easeInOutSine },
    ],
    frame: (t, dt) => {
      scene.lights.length = 0
      scene.worldLights.length = 0
      scene.pillar = 0
      scene.playerVisible = true
      scene.companionVisible = true
      player.place(HOME_START[0], HOME_START[1], 's')
      robot.place(robotHome[0], robotHome[1], 'sw')
      const warm = 0.5 + 0.5 * Math.sin(t * 0.07)
      scene.ambient = mixColor(MORNING, DAYLIGHT, 0.55 + 0.35 * warm)
      scene.companionGlow = 0.35 + 0.25 * Math.abs(Math.sin(t * 1.6))
      scene.lights.push({ x: SEED_ROOT[0], y: SEED_ROOT[1] - 260, radius: 2200, color: GOLD, intensity: 0.75 + 0.2 * Math.sin(t * 0.9) })
      if (Math.random() < dt * 6) {
        scene.particles.spawn({
          x: seedTop[0] + (Math.random() - 0.5) * 900,
          y: seedTop[1] + Math.random() * 520,
          rise: 30 + Math.random() * 40,
          wobble: 60,
          life: 3.4 + Math.random() * 2,
          size: 8 + Math.random() * 8,
          sizeEnd: 2,
          sprite: Math.random() < 0.5 ? gold : teal,
          blend: 'add',
        })
      }
      if (Math.random() < dt * 4) {
        scene.particles.spawn({
          x: lerp(LUME_PLAZA[0], HOME_START[0], Math.random()) + (Math.random() - 0.5) * 700,
          y: lerp(LUME_PLAZA[1], HOME_START[1], Math.random()),
          rise: 36 + Math.random() * 44,
          wobble: 50,
          life: 3 + Math.random() * 2,
          size: 7 + Math.random() * 6,
          sizeEnd: 2,
          sprite: gold,
          blend: 'add',
        })
      }
    },
    finish: () => {
      scene.companionGlow = 0
      scene.lights.length = 0
    },
  }
}

export function endingScript(deps: FinaleCineDeps, last: HeartSpot | null, release: () => void): CinemaScript {
  const { scene, sound, overlay, player, robot } = deps
  const { violet, gold, white, motes, smoke } = art()
  const beam = heartSprites().beam
  const visitors = [new Visitor(), new Visitor(), new Visitor()]
  const actors = visitorActors(visitors, deps.visitors)
  scene.actors.push(...actors)
  const start: Point = last ? [last.x, last.y] : [player.x, player.y]
  const spots: readonly Point[] = [
    [TOWER_X - 130, BEACON.y + 180],
    [TOWER_X, BEACON.y + 230],
    [TOWER_X + 130, BEACON.y + 180],
  ]
  const T = { tower: 5.2, crater: 23.5, dawn: 36, end: 52 }
  const scans = [9.2, 9.6, 10]
  const beamGone = 13.4
  const kneel = 16.8
  const dissolve = 20.2
  const burstAt = 28.8
  const growStart = 29
  const growEnd = 35
  const robotHome: Point = [HOME_START[0] + 72, HOME_START[1] - 8]
  let time = 0
  let released = false
  const growth = () => clamp01((time - growStart) / (growEnd - growStart))
  const glow: WorldDraw = (context, originX, originY, zoom) => {
    context.globalCompositeOperation = 'lighter'
    if (time >= T.tower && time < T.crater) {
      const x = originX + TOWER_X * zoom
      const top = originY + TOWER_TOP * zoom
      if (time < beamGone) {
        const flicker = time > 6.4 ? (Math.random() < 0.25 ? 0.15 : 0.75) : 0.9
        beamDown(context, beam, x, top, 150 * zoom, flicker)
        const crack = smoothstep(12.2, beamGone, time)
        if (crack > 0) {
          context.globalAlpha = 0.6 + 0.4 * Math.random()
          context.strokeStyle = 'rgba(246, 236, 255, 0.95)'
          context.lineWidth = Math.max(1.5, 3 * zoom)
          for (let line = 0; line < 3; line++) {
            context.beginPath()
            let px = x + (line - 1) * 10 * zoom
            let py = top
            context.moveTo(px, py)
            const steps = 9
            for (let step = 1; step <= steps * crack; step++) {
              px = x + (line - 1) * 10 * zoom + Math.sin(step * 2.1 + line) * 16 * zoom
              py = top + (step / steps) * (BEACON.height + 10) * zoom
              context.lineTo(px, py)
            }
            context.stroke()
          }
        }
      }
      const blast = decay(beamGone, time, 1.6)
      if (blast > 0.01) {
        const size = (300 + 2200 * (1 - blast)) * zoom
        context.globalAlpha = blast
        context.drawImage(violet, x - size / 2, top - size / 2, size, size)
        context.drawImage(white, x - size / 6, top - size / 6, size / 3, size / 3)
      }
    }
    if (time >= T.crater && time < T.dawn) {
      const x = originX + HEART[0] * zoom
      const y = originY + HEART[1] * zoom
      const beat = [24.6, 25.5, 26.4].reduce((sum, at) => sum + decay(at, time, 4), 0)
      const shine = 0.5 + 0.5 * smoothstep(T.crater, burstAt, time)
      const size = (240 + 260 * beat + 600 * decay(burstAt, time, 1.2)) * zoom
      context.globalAlpha = Math.min(1, shine * (0.6 + 0.5 * beat))
      context.drawImage(gold, x - size / 2, y - size / 2, size, size)
      context.globalAlpha = Math.min(1, 0.3 + beat * 0.4)
      context.drawImage(white, x - size / 5, y - size / 5, size / 2.5, size / 2.5)
    }
    if (time >= growStart) drawSeedTree(context, originX, originY, zoom, time, growth())
    context.globalAlpha = 1
  }

  const place = () => {
    visitors.forEach((visitor, index) => {
      const [x, y] = spots[index]
      visitor.visible = time >= T.tower + 0.2 && time < dissolve + 2.2
      visitor.place(x, y, 's')
      visitor.moving = false
      visitor.frame = 0
      const scan = scans[index]
      visitor.disguise = 1 - easeInOutSine(clamp01((time - scan) / 0.9))
      visitor.pose = time >= kneel + index * 0.2 ? 'kneel' : null
      visitor.rise = 1 - easeInOutSine(clamp01((time - dissolve - index * 0.25) / 1.6))
      const lit = time >= scan ? 0.25 : 0
      visitor.glow = Math.min(1, lit + 0.8 * smoothstep(kneel, dissolve + 0.6, time))
    })
  }

  const cleanup = () => {
    for (const actor of actors) {
      const index = scene.actors.indexOf(actor)
      if (index >= 0) scene.actors.splice(index, 1)
    }
    overlay.hideCaption()
    overlay.hideLine()
    scene.pillar = 0
    scene.flash = 0
    scene.lights.length = 0
    scene.playerVisible = true
    scene.companionVisible = true
    scene.companionGlow = 0
    player.place(HOME_START[0], HOME_START[1], 's')
    robot.place(robotHome[0], robotHome[1], 'sw')
    if (!released) {
      released = true
      release()
    }
  }

  return {
    duration: T.end,
    cuts: [T.tower, T.crater, T.dawn],
    fadeOut: 2.2,
    glow,
    keys: [
      { at: 0, x: start[0], y: start[1] - 220, zoom: 1.05 },
      { at: T.tower, x: start[0], y: start[1] - 160, zoom: 1.32 },
      { at: T.tower, x: TOWER_X, y: BEACON.y + 40, zoom: 1.0 },
      { at: 12, x: TOWER_X, y: BEACON.y + 90, zoom: 1.18 },
      { at: 16, x: TOWER_X, y: BEACON.y + 40, zoom: 0.98 },
      { at: T.crater, x: TOWER_X, y: BEACON.y + 140, zoom: 1.12 },
      { at: T.crater, x: SITE_X, y: SITE_Y + 90, zoom: 1.25 },
      { at: burstAt, x: SITE_X, y: SITE_Y + 40, zoom: 1.1 },
      { at: T.dawn, x: SITE_X, y: SITE_Y - 220, zoom: 0.74, ease: easeOutCubic },
      { at: T.dawn, x: LUME_PLAZA[0], y: LUME_PLAZA[1] - 160, zoom: 0.9 },
      { at: 44, x: (LUME_PLAZA[0] + HOME_START[0]) / 2, y: (LUME_PLAZA[1] + HOME_START[1]) / 2 - 60, zoom: 1.02 },
      { at: T.end, x: HOME_START[0] + 30, y: HOME_START[1] - 90, zoom: 1.28, ease: easeInOutSine },
    ],
    shake: (t) => 6 * decay(0, t, 1.5) + 16 * decay(beamGone, t, 2) + 12 * decay(burstAt, t, 2.2),
    cues: [
      { at: 0.6, run: () => overlay.caption(ENDING_CAPTIONS.hearts.kicker, ENDING_CAPTIONS.hearts.title) },
      { at: 1.2, run: () => sound.bed('night') },
      { at: 4.4, run: () => overlay.hideCaption() },
      {
        at: T.tower,
        run: () => {
          if (!released) {
            released = true
            release()
          }
        },
      },
      { at: T.tower + 0.6, run: () => overlay.caption(ENDING_CAPTIONS.tower.kicker, ENDING_CAPTIONS.tower.title) },
      { at: 6.4, run: () => sound.cue('crack', 6.8) },
      { at: 7.2, run: () => overlay.hideCaption() },
      { at: 7.6, run: () => overlay.line('A forasteira de óculos', ENDING_LINES.forasteira) },
      ...scans.map((at) => ({ at, run: () => sound.cue('transform') })),
      { at: 10.6, run: () => overlay.line('O forasteiro alto', ENDING_LINES.alto) },
      {
        at: beamGone,
        run: () => {
          sound.stopCue('crack')
          sound.cue('split')
          sound.cue('heavy')
          scene.flash = Math.max(scene.flash, 0.75)
          scene.addRing(TOWER_X, BEACON.y, 2800, 1.2, 0.9, true)
          for (let index = 0; index < 40; index++) {
            scene.particles.spawn({
              x: TOWER_X + (Math.random() - 0.5) * 80,
              y: TOWER_TOP + Math.random() * BEACON.height,
              vx: (Math.random() - 0.5) * 600,
              vy: (Math.random() - 0.5) * 300,
              vz: 300 + Math.random() * 600,
              gravity: 1800,
              bounce: 0.3,
              life: 1.6 + Math.random(),
              size: 18 + Math.random() * 16,
              spin: (Math.random() - 0.5) * 14,
              sprite: heartSprites().shards,
              shadow: true,
            })
          }
        },
      },
      { at: 14.6, run: () => overlay.line('O forasteiro baixo', ENDING_LINES.baixo) },
      { at: 17.6, run: () => overlay.line('A forasteira de óculos', ENDING_LINES.forasteiraLast) },
      { at: dissolve, run: () => sound.cue('light') },
      { at: 22.4, run: () => overlay.hideLine() },
      { at: T.crater + 0.5, run: () => overlay.caption(ENDING_CAPTIONS.crater.kicker, ENDING_CAPTIONS.crater.title) },
      { at: 24.6, run: () => sound.cue('heartbeat') },
      { at: 25.5, run: () => sound.cue('heartbeat') },
      { at: 26.4, run: () => sound.cue('heartbeat') },
      { at: 26.8, run: () => sound.cue('light') },
      {
        at: burstAt,
        run: () => {
          sound.cue('transform')
          sound.cue('win')
          scene.flash = Math.max(scene.flash, 0.8)
          scene.addRing(SITE_X, SITE_Y + 60, 3200, 1.4, 1, true)
          scene.addRing(SITE_X, SITE_Y + 60, 1800, 2, 0.5, false)
        },
      },
      { at: 34.6, run: () => overlay.hideCaption() },
      { at: T.dawn, run: () => sound.bed('day') },
      { at: T.dawn + 0.8, run: () => overlay.caption(ENDING_CAPTIONS.dawn.kicker, ENDING_CAPTIONS.dawn.title) },
      { at: 42, run: () => overlay.line('B-01', ENDING_LINES.robot) },
      { at: 42.2, run: () => sound.cue('ready') },
      { at: 45.4, run: () => overlay.hideLine() },
      { at: 47.4, run: () => overlay.hideCaption() },
    ],
    frame: (t, dt) => {
      time = t
      scene.lights.length = 0
      scene.worldLights.length = 0
      place()
      if (t < T.tower) {
        scene.ambient = mixColor(mixColor(DAYLIGHT, DUSK, 0.5), NIGHT_VIOLET, smoothstep(0, T.tower, t))
        scene.playerVisible = true
        scene.companionVisible = true
        if (Math.random() < dt * 4) {
          scene.particles.spawn({
            x: start[0] + (Math.random() - 0.5) * 140,
            y: start[1] - 40,
            vx: 10,
            rise: 60 + Math.random() * 40,
            life: 2.6,
            size: 60,
            sizeEnd: 220,
            alpha: 0.3,
            fadeIn: 0.2,
            sprite: smoke[Math.floor(Math.random() * smoke.length)],
            blend: 'haze',
          })
        }
        return
      }
      if (t < T.crater) {
        scene.playerVisible = false
        scene.companionVisible = false
        scene.ambient = NIGHT_VIOLET
        if (t < beamGone) {
          scene.campfire(dt, COLD_FIRE[0], COLD_FIRE[1], t, true)
          scene.lights.push({ x: TOWER_X, y: TOWER_TOP, radius: 1200, color: [190, 130, 255], intensity: 0.9 })
        }
        for (const visitor of visitors) {
          if (!visitor.visible || visitor.glow < 0.05) continue
          scene.lights.push({ x: visitor.x, y: visitor.y - 80, radius: 380, color: [190, 150, 255], intensity: 0.8 * visitor.glow })
          if (t >= dissolve && Math.random() < dt * 30) {
            scene.particles.spawn({
              x: visitor.x + (Math.random() - 0.5) * 60,
              y: visitor.y - Math.random() * 120,
              rise: 140 + Math.random() * 160,
              wobble: 40,
              life: 1.4 + Math.random(),
              size: 10 + Math.random() * 10,
              sizeEnd: 2,
              sprite: violet,
              blend: 'add',
            })
          }
        }
        return
      }
      if (t < T.dawn) {
        scene.ambient = mixColor(NIGHT_VIOLET, [90, 96, 150], smoothstep(T.crater, burstAt, t))
        scene.crater = 1
        scene.pose.visible = true
        scene.pose.time = t
        scene.pose.heat = 0.8 + 0.8 * smoothstep(T.crater, burstAt, t)
        scene.pose.rays = 0.3 + 0.7 * decay(burstAt, t, 1.5)
        scene.pillar = smoothstep(burstAt, burstAt + 0.2, t) * (1 - smoothstep(burstAt + 1.8, burstAt + 3.2, t))
        scene.lights.push({ x: HEART[0], y: HEART[1], radius: 1600 + 1400 * growth(), color: GOLD, intensity: 0.7 + 1.2 * growth() })
        if (t >= 26.6 && t < burstAt && Math.random() < dt * 60) spawnInward(scene, HEART[0], HEART[1], 1100, motes, 620)
        if (t >= burstAt && Math.random() < dt * 40 * (1 - growth() * 0.6)) {
          const angle = Math.random() * Math.PI * 2
          scene.particles.spawn({
            x: HEART[0],
            y: HEART[1] - 40,
            vx: Math.cos(angle) * (300 + Math.random() * 500),
            vy: Math.sin(angle) * (200 + Math.random() * 300) - 120,
            drag: 0.6,
            life: 1.8 + Math.random(),
            size: 12 + Math.random() * 10,
            sizeEnd: 3,
            sprite: motes,
            blend: 'add',
          })
        }
        return
      }
      scene.pillar = 0
      scene.playerVisible = true
      scene.companionVisible = true
      player.place(HOME_START[0], HOME_START[1], 's')
      robot.place(robotHome[0], robotHome[1], 'sw')
      const dawn = smoothstep(T.dawn, T.end - 4, t)
      scene.ambient = dawn < 0.5 ? mixColor(DAWN, MORNING, dawn * 2) : mixColor(MORNING, DAYLIGHT, (dawn - 0.5) * 2)
      scene.companionGlow = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.4))
      scene.lights.push({ x: robot.x, y: robot.y - 60, radius: 420, color: [214, 240, 255], intensity: 0.6 * (1 - dawn) + 0.2 })
      if (Math.random() < dt * 5) {
        scene.particles.spawn({
          x: lerp(LUME_PLAZA[0], HOME_START[0], Math.random()) + (Math.random() - 0.5) * 600,
          y: lerp(LUME_PLAZA[1], HOME_START[1], Math.random()),
          rise: 40 + Math.random() * 50,
          wobble: 50,
          life: 3 + Math.random() * 2,
          size: 8 + Math.random() * 6,
          sizeEnd: 2,
          sprite: gold,
          blend: 'add',
        })
      }
    },
    skip: cleanup,
    finish: cleanup,
  }
}
