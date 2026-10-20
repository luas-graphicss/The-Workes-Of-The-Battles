import { CRATER, CRATER_FIRES, METEOR_SITE, TEXEL, type Point } from '../world-data'
import type { Lens, View } from './camera'
import type { CityLayer } from './city'
import { drawHollow } from './fx/hollow'
import { createLighting, type Light } from './fx/lighting'
import { Particles } from './fx/particles'
import { createProfiler } from './fx/profile'
import { drawCell } from './fx/supersample'
import { drawShadow, glowTexture, grainSheet, puffTexture, ringTexture, shadowTexture, shaftTexture, type RGB, type ShaftProfile } from './fx/textures'
import { paintingQuality, type MapLayer } from './map'
import { drawFireball, drawMeteor, drawMeteorGlow, type MeteorArt, type MeteorPose } from './meteor'
import type { Player } from './player'
import type { RobotSheets, Sheets } from './robot/sprites'
import { ANCHOR, BODY, FRAME, frameSource } from './sprite'

const BACKGROUND = '#151e1b'
const SHADOW = 'rgba(24, 18, 12, 0.3)'
const DAYLIGHT: RGB = [255, 255, 255]
const BEAM_PROFILE: ShaftProfile = [
  [0, 0.35],
  [0.82, 1],
  [1, 0],
]

const HAZE_DOWNSCALE = 3

const ROBOT_PIXEL = TEXEL

const BODY_HALF_WIDTH = (BODY.width / 2) * ROBOT_PIXEL
const BODY_HEIGHT = BODY.height * ROBOT_PIXEL

export type WorldLight = { x: number; y: number; radius: number; color: RGB; intensity: number }

export type Ring = { x: number; y: number; age: number; life: number; radius: number; alpha: number; additive: boolean }

export type Fireball = { visible: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; trail: number; spin: number }

export type SceneArt = {
  map: MapLayer
  city: CityLayer
  crater: HTMLImageElement
  meteor: MeteorArt
  robot: RobotSheets
  pilot: Sheets
}

export type FigureKind = 'pilot' | 'robot'

type FigureFx = { rise: number; overlay: number; alpha: number; scale: number }

const PLAIN_FIGURE: FigureFx = { rise: 1, overlay: 0, alpha: 1, scale: 1 }

export type Actor = {
  depth: number
  draw(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number): void
}

export type WorldDraw = (context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, now: number) => void

export type SceneHooks = { ground?: WorldDraw; glow?: WorldDraw; top?: WorldDraw }

const enum Slot {
  Player,
  Companion,
  Meteor,
  Actor,
}

type Drawable = { depth: number; kind: Slot; actor: Actor | null }

const FIRE_RAMP: RGB[] = [
  [255, 246, 214],
  [255, 196, 96],
  [255, 128, 48],
  [196, 60, 30],
]

const COLD_RAMP: RGB[] = [
  [246, 238, 255],
  [198, 164, 255],
  [142, 98, 240],
  [74, 42, 150],
]

const RIM_FIRES: Point[] = [
  ...CRATER_FIRES,
  [METEOR_SITE[0] + 420, METEOR_SITE[1] - 170],
  [METEOR_SITE[0] - 470, METEOR_SITE[1] + 120],
  [METEOR_SITE[0] + 180, METEOR_SITE[1] - 330],
  [METEOR_SITE[0] - 160, METEOR_SITE[1] + 360],
]

export class Scene {
  readonly particles = new Particles()
  readonly lights: WorldLight[] = []

  readonly worldLights: WorldLight[] = []
  readonly rings: Ring[] = []
  readonly pose: MeteorPose = { visible: false, crack: 0, split: 0, heat: 0, jitter: 0, gap: 0, rays: 0, time: 0 }
  readonly fireball: Fireball = { visible: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, trail: 0, spin: 0 }
  readonly fireSprites: HTMLCanvasElement[]
  readonly smokeSprites: HTMLCanvasElement[]
  readonly dustSprites: HTMLCanvasElement[]
  crater = 0
  ambient: RGB = DAYLIGHT
  flash = 0
  pillar = 0
  grain = 0
  vignette = 0
  shakeX = 0
  shakeY = 0
  playerVisible = true
  playerRise = 1
  playerGlow = 0
  playerFlash = 0
  playerAlpha = 1
  playerScale = 1
  heroKind: FigureKind = 'pilot'
  companion: Player | null = null
  companionVisible = true

  companionGlow = 0

  outdoors = true
  readonly actors: Actor[] = []

  townsfolk: readonly Actor[] = []

  readonly extras: Actor[] = []

  extraGlow: WorldDraw | null = null
  storyGround: WorldDraw | null = null
  storyGlow: WorldDraw | null = null
  hooks: SceneHooks = {}
  fires = 0
  readonly profiler = createProfiler()
  private readonly lighting = createLighting()
  private readonly screenLights: Light[] = []
  private readonly haze = offscreenContext()
  private readonly vignetteLayer = offscreenContext()
  private readonly drawables: Drawable[] = []
  private drawn = 0
  private readonly shadow = shadowTexture(SHADOW)
  private fireClock = 0
  private coldSprites: HTMLCanvasElement[] | null = null

  constructor(private readonly art: SceneArt) {
    this.fireSprites = FIRE_RAMP.map((color) => glowTexture(color, 64))
    this.smokeSprites = [0, 1, 2].map((variant) => puffTexture([46, 42, 40], variant))
    this.dustSprites = [0, 1].map((variant) => puffTexture([118, 96, 74], variant))
  }

  private slot(depth: number, kind: Slot, actor: Actor | null) {
    const pool = this.drawables
    const index = this.drawn++
    const entry = pool[index]
    if (entry) {
      entry.depth = depth
      entry.kind = kind
      entry.actor = actor
    } else {
      pool.push({ depth, kind, actor })
    }
  }

  reset() {
    this.particles.clear()
    this.rings.length = 0
    this.lights.length = 0
    this.worldLights.length = 0
  }

  update(dt: number) {
    this.particles.update(dt)
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].age += dt
      if (this.rings[i].age >= this.rings[i].life) this.rings.splice(i, 1)
    }
  }

  addRing(x: number, y: number, radius: number, life: number, alpha: number, additive: boolean) {
    this.rings.push({ x, y, radius, life, alpha, additive, age: 0 })
  }

  burnFires(dt: number, strength: number, time: number, spots = RIM_FIRES.length) {
    if (strength <= 0.01) return
    this.fireClock += dt
    const interval = 0.028 / Math.min(1.5, strength)
    while (this.fireClock > interval) {
      this.fireClock -= interval
      const [x, y] = RIM_FIRES[Math.floor(Math.random() * spots)]
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 24,
        vx: (Math.random() - 0.5) * 30,
        rise: 90 + Math.random() * 90,
        life: 0.45 + Math.random() * 0.45,
        size: (70 + Math.random() * 60) * Math.min(1.2, 0.5 + strength * 0.6),
        sizeEnd: 16,
        sprite: this.fireSprites,
        blend: 'add',
        fadeIn: 0.15,
        alpha: 0.9,
      })
      if (Math.random() < 0.25) {
        this.particles.spawn({
          x: x + (Math.random() - 0.5) * 50,
          y: y - 40,
          vx: 12 + Math.random() * 20,
          rise: 50 + Math.random() * 40,
          life: 2.4 + Math.random() * 1.6,
          size: 70,
          sizeEnd: 260 + Math.random() * 120,
          alpha: 0.32 * Math.min(1, strength),
          fadeIn: 0.2,
          sprite: this.smokeSprites[Math.floor(Math.random() * this.smokeSprites.length)],
          blend: 'haze',
        })
      }
      if (Math.random() < 0.2) {
        this.particles.spawn({
          x: x + (Math.random() - 0.5) * 40,
          y,
          vx: (Math.random() - 0.5) * 60,
          rise: 110 + Math.random() * 120,
          wobble: 60,
          life: 1.2 + Math.random() * 1.4,
          size: 10 + Math.random() * 8,
          sizeEnd: 4,
          sprite: this.fireSprites[1],
          blend: 'add',
        })
      }
    }
    for (let i = 0; i < spots; i++) {
      const [x, y] = RIM_FIRES[i]
      const flicker = 0.78 + 0.14 * Math.sin(time * 17 + i * 2.3) + 0.08 * Math.sin(time * 41 + i)
      this.lights.push({ x, y: y - 20, radius: 420, color: [255, 150, 70], intensity: 0.85 * strength * flicker })
    }
  }

  smolder(dt: number, time: number) {
    this.lights.length = 0
    this.pose.time = time
    this.pose.heat = 0.55 + 0.18 * Math.sin(time * 1.6)
    this.burnFires(dt, 0.42, time, CRATER_FIRES.length)
    if (Math.random() < 2.5 * dt) {
      const side = Math.random() < 0.5 ? -1 : 1
      this.particles.spawn({
        x: METEOR_SITE[0] + side * (90 + Math.random() * 40),
        y: METEOR_SITE[1] + 20 + Math.random() * 80,
        vx: side * 10,
        rise: 90 + Math.random() * 80,
        wobble: 50,
        life: 1.6 + Math.random(),
        size: 10 + Math.random() * 6,
        sizeEnd: 3,
        sprite: this.fireSprites[1],
        blend: 'add',
      })
    }
  }

  private coldFlames() {
    return (this.coldSprites ??= COLD_RAMP.map((color) => glowTexture(color, 64)))
  }

  campfire(dt: number, x: number, y: number, time: number, cold: boolean) {
    const flames = cold ? this.coldFlames() : this.fireSprites
    if (Math.random() < dt * 18) {
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 26,
        y: y - 4 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 16,
        rise: 60 + Math.random() * 50,
        life: 0.38 + Math.random() * 0.34,
        size: 40 + Math.random() * 26,
        sizeEnd: 8,
        sprite: flames,
        blend: 'add',
        fadeIn: 0.12,
        alpha: 0.85,
      })
    }
    if (!cold && Math.random() < dt * 1.5) {
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 30,
        vx: 8 + Math.random() * 12,
        rise: 40 + Math.random() * 30,
        life: 2.2 + Math.random() * 1.2,
        size: 36,
        sizeEnd: 150 + Math.random() * 60,
        alpha: 0.26,
        fadeIn: 0.25,
        sprite: this.smokeSprites[Math.floor(Math.random() * this.smokeSprites.length)],
        blend: 'haze',
      })
    }
    if (Math.random() < dt * (cold ? 2.4 : 3.2)) {
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 24,
        y,
        vx: (Math.random() - 0.5) * 50,
        rise: 90 + Math.random() * 110,
        wobble: 40,
        life: 1 + Math.random() * 1.1,
        size: 8 + Math.random() * 5,
        sizeEnd: 3,
        sprite: flames[1],
        blend: 'add',
      })
    }
    const flicker = 0.8 + 0.12 * Math.sin(time * 15 + x) + 0.08 * Math.sin(time * 37 + y)
    this.worldLights.push({ x, y: y - 16, radius: 360, color: cold ? [170, 122, 255] : [255, 156, 72], intensity: (cold ? 0.8 : 0.95) * flicker })
  }

  beacon(dt: number, x: number, y: number, time: number) {
    const ramp = this.coldFlames()
    const breath = 0.5 + 0.5 * Math.sin(time * 1.7)
    if (Math.random() < dt * 10) {
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        rise: 4,
        life: 0.5,
        size: 70 + breath * 60,
        sizeEnd: 34,
        sprite: ramp[1],
        blend: 'add',
        fadeIn: 0.2,
        alpha: 0.35 + breath * 0.4,
      })
    }
    if (Math.random() < dt * 1.6) {
      this.particles.spawn({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: (Math.random() - 0.5) * 20,
        rise: 220 + Math.random() * 200,
        wobble: 30,
        life: 2.2 + Math.random() * 1.4,
        size: 12 + Math.random() * 8,
        sizeEnd: 4,
        sprite: ramp[0],
        blend: 'add',
        alpha: 0.9,
      })
    }
    this.worldLights.push({ x, y, radius: 520, color: [176, 126, 255], intensity: 0.5 + 0.5 * breath })
  }

  private pushScreenLight(light: WorldLight, originX: number, originY: number, zoom: number) {
    this.screenLights.push({
      x: originX + light.x * zoom,
      y: originY + light.y * zoom,
      radius: light.radius * zoom,
      color: light.color,
      intensity: light.intensity,
    })
  }

  render(context: CanvasRenderingContext2D, view: View, lens: Lens, player: Player, now: number) {
    const { width, height } = view
    const zoom = lens.zoom
    const originX = Math.round(width / 2 - lens.x * zoom + this.shakeX)
    const originY = Math.round(height / 2 - lens.y * zoom + this.shakeY)

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1

    if (!this.art.map.covers(originX, originY, zoom, width, height)) {
      context.fillStyle = BACKGROUND
      context.fillRect(0, 0, width, height)
    }
    const probe = this.profiler
    probe.mark(context, 'fill')

    this.art.map.draw(context, originX, originY, zoom, now)
    probe.mark(context, 'map')
    if (this.crater > 0 && this.outdoors) this.drawCrater(context, originX, originY, zoom)
    probe.mark(context, 'crater')
    this.hooks.ground?.(context, originX, originY, zoom, now)
    this.storyGround?.(context, originX, originY, zoom, now)
    probe.mark(context, 'b-ground')

    const city = this.art.city
    city.begin(context, originX, originY, zoom, width, height, now / 1000)
    const playerDepth = player.y
    if (this.playerVisible && this.playerRise > 0) {
      const size = this.playerScale
      city.revealExplorer(player.x - BODY_HALF_WIDTH * size, player.y - BODY_HEIGHT * size, player.x + BODY_HALF_WIDTH * size, player.y, playerDepth)
    }
    this.drawn = 0
    this.slot(playerDepth, Slot.Player, null)
    const buddy = this.companion
    if (buddy && this.companionVisible) this.slot(buddy.y, Slot.Companion, null)
    if (this.outdoors) this.slot(METEOR_SITE[1] + 110, Slot.Meteor, null)
    for (const actor of this.actors) this.slot(actor.depth, Slot.Actor, actor)
    for (const actor of this.townsfolk) this.slot(actor.depth, Slot.Actor, actor)
    for (const actor of this.extras) this.slot(actor.depth, Slot.Actor, actor)
    const drawables = this.drawables

    if (drawables.length > this.drawn) drawables.length = this.drawn
    drawables.sort(byDepth)
    for (let index = 0; index < drawables.length; index++) {
      const item = drawables[index]
      city.drawUntil(item.depth)
      switch (item.kind) {
        case Slot.Player:
          this.drawPlayer(context, player, originX, originY, zoom)
          break
        case Slot.Companion:
          if (buddy) {
            const kind: FigureKind = this.heroKind === 'pilot' ? 'robot' : 'pilot'
            const fx: FigureFx = this.companionGlow > 0 ? { ...PLAIN_FIGURE, overlay: this.companionGlow } : PLAIN_FIGURE
            this.drawFigure(context, buddy, kind, originX, originY, zoom, fx)
          }
          break
        case Slot.Meteor:
          drawMeteor(context, this.art.meteor, originX, originY, zoom, this.pose)
          break
        default:
          item.actor?.draw(context, originX, originY, zoom)
      }
    }
    city.drawUntil(Infinity)
    probe.mark(context, 'city')
    const night = Math.min(1, Math.max(0, (255 - (this.ambient[0] + this.ambient[1] + this.ambient[2]) / 3) / 180))

    this.particles.draw(context, originX, originY, zoom, 'normal')
    probe.mark(context, 'p-norm')
    this.drawHaze(context, originX, originY, zoom)
    probe.mark(context, 'haze')
    this.drawRings(context, originX, originY, zoom, false)
    probe.mark(context, 'rings')

    const lit = this.ambient[0] < 254 || this.ambient[1] < 254 || this.ambient[2] < 254
    if (lit) {
      this.screenLights.length = 0
      for (const light of this.lights) this.pushScreenLight(light, originX, originY, zoom)
      for (const light of this.worldLights) this.pushScreenLight(light, originX, originY, zoom)
      city.pushLights(this.screenLights, night)
      this.lighting.apply(context, width, height, this.ambient, this.screenLights)
    }
    probe.mark(context, 'light')

    context.globalCompositeOperation = 'lighter'
    city.drawGlows(1 + night * 1.2)
    probe.mark(context, 'glows')
    if (this.outdoors) drawMeteorGlow(context, this.art.meteor, originX, originY, zoom, this.pose)
    probe.mark(context, 'mglow')
    this.particles.draw(context, originX, originY, zoom, 'add')
    probe.mark(context, 'p-add')
    this.drawRings(context, originX, originY, zoom, true)
    probe.mark(context, 'rings+')
    if (this.fireball.visible) this.drawFireball(context, originX, originY, zoom)
    probe.mark(context, 'ball')
    if (this.pillar > 0) this.drawPillar(context, originX, originY, zoom)
    probe.mark(context, 'pillar')
    if (this.playerGlow > 0 && this.playerVisible) this.drawPlayerAura(context, player, originX, originY, zoom)
    probe.mark(context, 'aura')
    this.hooks.glow?.(context, originX, originY, zoom, now)
    this.extraGlow?.(context, originX, originY, zoom, now)
    if (this.storyGlow) {
      context.globalCompositeOperation = 'lighter'
      this.storyGlow(context, originX, originY, zoom, now)
    }
    probe.mark(context, 'b-glow')
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    this.hooks.top?.(context, originX, originY, zoom, now)
    probe.mark(context, 'b-top')

    this.drawFinish(context, width, height, now)
  }

  drawFinish(context: CanvasRenderingContext2D, width: number, height: number, now: number) {
    const probe = this.profiler
    if (this.flash > 0.002) {
      context.globalAlpha = Math.min(1, this.flash)
      context.fillStyle = '#fff6ea'
      context.fillRect(0, 0, width, height)
      context.globalAlpha = 1
    }
    probe.mark(context, 'flash')
    if (this.vignette > 0.01) this.drawVignette(context, width, height)
    else if (this.vignetteLayer.canvas.width > 1) this.vignetteLayer.canvas.width = this.vignetteLayer.canvas.height = 1
    probe.mark(context, 'vign')
    if (this.grain > 0.01) this.drawGrain(context, width, height, now)
    probe.mark(context, 'grain')
  }

  private drawGrain(context: CanvasRenderingContext2D, width: number, height: number, now: number) {
    const sheet = grainSheet()
    const offsetX = Math.floor((now * 0.37) % 160)
    const offsetY = Math.floor((now * 0.61) % 160)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'overlay'
    context.globalAlpha = 0.09 * this.grain
    for (let y = offsetY > 0 ? offsetY - sheet.height : 0; y < height; y += sheet.height) {
      for (let x = offsetX > 0 ? offsetX - sheet.width : 0; x < width; x += sheet.width) context.drawImage(sheet, x, y)
    }
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }

  private drawVignette(context: CanvasRenderingContext2D, width: number, height: number) {
    const layer = this.vignetteLayer
    if (layer.canvas.width !== width || layer.canvas.height !== height) {
      layer.canvas.width = width
      layer.canvas.height = height
      const radius = Math.hypot(width, height) / 2
      const gradient = layer.createRadialGradient(width / 2, height / 2, radius * 0.35, width / 2, height / 2, radius)
      gradient.addColorStop(0, 'rgba(6,8,12,0)')
      gradient.addColorStop(1, 'rgba(6,8,12,0.62)')
      layer.fillStyle = gradient
      layer.fillRect(0, 0, width, height)
    }
    context.globalAlpha = Math.min(1, this.vignette)
    context.drawImage(layer.canvas, 0, 0)
    context.globalAlpha = 1
  }

  private drawHaze(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    const layer = this.haze
    const width = Math.ceil(context.canvas.width / HAZE_DOWNSCALE)
    const height = Math.ceil(context.canvas.height / HAZE_DOWNSCALE)
    if (layer.canvas.width !== width || layer.canvas.height !== height) {
      layer.canvas.width = width
      layer.canvas.height = height
    } else {
      layer.clearRect(0, 0, width, height)
    }
    const drawn = this.particles.draw(layer, originX / HAZE_DOWNSCALE, originY / HAZE_DOWNSCALE, zoom / HAZE_DOWNSCALE, 'haze')
    if (!drawn) return
    const left = Math.max(0, Math.floor(drawn.left) - 1)
    const top = Math.max(0, Math.floor(drawn.top) - 1)
    const right = Math.min(width, Math.ceil(drawn.right) + 1)
    const bottom = Math.min(height, Math.ceil(drawn.bottom) + 1)
    if (right <= left || bottom <= top) return
    context.drawImage(
      layer.canvas,
      left,
      top,
      right - left,
      bottom - top,
      left * HAZE_DOWNSCALE,
      top * HAZE_DOWNSCALE,
      (right - left) * HAZE_DOWNSCALE,
      (bottom - top) * HAZE_DOWNSCALE,
    )
  }

  private drawCrater(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    const texelScale = zoom * TEXEL
    context.imageSmoothingEnabled = !(texelScale >= 1 && Math.abs(texelScale - Math.round(texelScale)) < 0.001)
    context.imageSmoothingQuality = paintingQuality(texelScale)
    context.globalAlpha = Math.min(1, this.crater)
    context.drawImage(
      this.art.crater,
      Math.round(originX + CRATER.x * zoom),
      Math.round(originY + CRATER.y * zoom),
      Math.round(CRATER.width * zoom),
      Math.round(CRATER.height * zoom),
    )
    context.globalAlpha = 1
    context.imageSmoothingQuality = 'low'
    context.imageSmoothingEnabled = true
  }

  setRobot(robot: RobotSheets) {
    this.art.robot = robot
  }

  setWorld(map: MapLayer, city: CityLayer, outdoors: boolean) {
    this.art.map = map
    this.art.city = city
    this.outdoors = outdoors
  }

  private drawPlayer(context: CanvasRenderingContext2D, player: Player, originX: number, originY: number, zoom: number) {
    if (!this.playerVisible || this.playerRise <= 0) return
    this.drawFigure(context, player, this.heroKind, originX, originY, zoom, {
      rise: this.playerRise,
      overlay: Math.max(this.playerGlow, this.playerFlash),
      alpha: this.playerAlpha,
      scale: this.playerScale,
    })
  }

  private drawFigure(context: CanvasRenderingContext2D, body: Player, kind: FigureKind, originX: number, originY: number, zoom: number, fx: FigureFx) {
    const scale = zoom * ROBOT_PIXEL * fx.scale
    const feetX = originX + Math.round(body.x * zoom)
    const feetY = originY + Math.round(body.y * zoom)
    const bodyHeight = (ANCHOR.y - BODY.top) * scale
    const sink = Math.round((1 - fx.rise) * bodyHeight)
    const { sx, sy } = frameSource(body.facing, body.moving ? body.frame : 0)
    const robot = kind === 'robot'
    const sheet = robot ? (body.moving ? this.art.robot.walk : this.art.robot.idle) : body.moving ? this.art.pilot.walk : this.art.pilot.idle
    const left = feetX - ANCHOR.x * scale
    const top = feetY - ANCHOR.y * scale + sink
    const drawWidth = FRAME.width * scale
    const drawHeight = FRAME.height * scale

    if (fx.rise >= 1) {
      context.imageSmoothingEnabled = true
      drawShadow(context, this.shadow, feetX, feetY - scale * 0.5, scale * (robot ? 12 : 9), scale * (robot ? 4 : 3))
    }
    context.imageSmoothingEnabled = false
    const clipped = sink > 0
    if (clipped) {
      context.save()
      context.beginPath()
      context.rect(left - scale, top - scale - sink, drawWidth + scale * 2, feetY - (top - scale - sink))
      context.clip()
    }
    context.globalAlpha = fx.alpha
    drawCell(context, sheet, sx, sy, FRAME.width, FRAME.height, left, top, drawWidth, drawHeight)
    if (robot && fx.overlay > 0) {
      const glow = body.moving ? this.art.robot.walkGlow : this.art.robot.idleGlow
      context.globalAlpha = Math.min(1, fx.overlay) * fx.alpha
      drawCell(context, glow, sx, sy, FRAME.width, FRAME.height, left, top, drawWidth, drawHeight)
    }
    context.globalAlpha = 1
    if (clipped) context.restore()
    context.imageSmoothingEnabled = true
  }

  private drawPlayerAura(context: CanvasRenderingContext2D, player: Player, originX: number, originY: number, zoom: number) {
    const glow = glowTexture([220, 236, 255])
    const size = 260 * zoom * (0.9 + 0.1 * Math.sin(performance.now() / 180))
    const x = originX + player.x * zoom
    const y = originY + (player.y - 80) * zoom
    context.globalAlpha = Math.min(1, this.playerGlow * 0.9)
    context.drawImage(glow, x - size / 2, y - size / 2, size, size)
    context.globalAlpha = 1
  }

  private drawRings(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, additive: boolean) {
    const texture = ringTexture(additive ? [255, 236, 200] : [104, 86, 68])
    for (const ring of this.rings) {
      if (ring.additive !== additive) continue
      const t = ring.age / ring.life
      const eased = 1 - Math.pow(1 - t, 3)
      const radius = ring.radius * eased * zoom
      const alpha = ring.alpha * (1 - t) * (1 - t)
      if (alpha <= 0.005 || radius < 1) continue
      context.globalAlpha = alpha
      const x = originX + ring.x * zoom
      const y = originY + ring.y * zoom
      drawHollow(context, texture, x - radius, y - radius * 0.74, radius * 2, radius * 1.48)
    }
    context.globalAlpha = 1
  }

  private drawFireball(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    const ball = this.fireball
    const x = originX + ball.x * zoom
    const y = originY + (ball.y - ball.z) * zoom
    drawFireball(
      context,
      this.art.meteor,
      x,
      y,
      ball.vx,
      ball.vy - ball.vz,
      ball.size * zoom,
      ball.trail * zoom,
      ball.spin,
      1,
    )
  }

  private drawPillar(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    const x = originX + METEOR_SITE[0] * zoom
    const base = originY + (METEOR_SITE[1] + 90) * zoom
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() / 90)
    const width = 240 * zoom * pulse * (0.6 + 0.4 * this.pillar)
    const strength = Math.min(1, this.pillar)
    const length = base + 80 * zoom
    const glow = glowTexture([235, 242, 255])
    context.globalAlpha = strength
    if (length > 0) context.drawImage(shaftTexture([250, 252, 255], [190, 220, 255], BEAM_PROFILE), x - width / 2, 0, width, length)
    context.globalAlpha = 0.5 * strength
    context.drawImage(glow, x - width * 1.1, base - 420 * zoom, width * 2.2, 560 * zoom)
    const size = 900 * zoom * this.pillar
    context.globalAlpha = strength
    context.drawImage(glow, x - size / 2, base - size / 2, size, size)
    context.globalAlpha = 1
  }
}

const byDepth = (a: Drawable, b: Drawable) => a.depth - b.depth

function offscreenContext() {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) throw new Error('Canvas 2D indisponível para a fumaça.')
  return context
}
