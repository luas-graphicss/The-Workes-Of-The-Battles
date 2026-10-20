import { HOME_START, HOUSE, METEOR, METEOR_SITE, TEXEL, type Point } from '../../world-data'
import type { Sound } from '../audio'
import { LOOK_ABOVE_FEET, clampLens, playZoom, type Lens, type View } from '../camera'
import { mixColor } from '../fx/lighting'
import { chipTextures, glowTexture, type RGB } from '../fx/textures'
import type { MeteorArt } from '../meteor'
import type { Player } from '../player'
import type { Actor, Scene, WorldDraw } from '../scene'
import { directionFromVector, FRAME, type Direction } from '../sprite'
import {
  clamp01,
  decay,
  easeInOutCubic,
  easeInOutSine,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  lerp,
  progress,
  smoothstep,
} from './easing'
import type { Overlay } from './overlay'
import { SKY, type SkyShot } from './sky-shot'
import { Visitor, visitorActors, type VisitorArt } from './visitors'

export const TIMELINE = {
  meteorAppear: SKY.appear,
  cut: SKY.cut,
  impact: 6.6,
  caption: 7.4,
  captionEnd: 10.6,
  toHouse: 11.2,
  houseCaption: 11.9,
  houseCaptionEnd: 15.6,
  houseBeats: [12.8, 13.8, 14.6, 15.2],
  robotLooks: 13.2,
  pilotLooks: 14.1,
  toCrater: 16.4,
  craterBeats: [17, 17.7, 18.3],
  crackStart: 17.2,
  split: 19.4,
  emerge: [20, 20.7, 21.4],
  stepOut: 23.2,
  stepOutEnd: 24.8,
  reach: 25.8,
  reachBeats: [26.5, 27.2, 27.8, 28.3, 28.7, 29],
  reject: 29.3,
  stand: 31.2,
  line1: 31.4,
  line2: 33.6,
  linesEnd: 36.9,
  dawnStart: 34,
  dawnEnd: 39,
  disguise: [37.2, 38.1, 39],
  line3: 40.3,
  line3End: 42.6,
  walkStart: 41.2,
  caption2: 43.4,
  caption2End: 47,
  toHome: 47.6,
  doorOpen: 48.1,
  exitStart: 48.3,
  exitEnd: 49.5,
  barsOut: 49.9,
  end: 51,
} as const

const NIGHT: RGB = [44, 54, 100]
const HOUSE_NIGHT: RGB = [62, 70, 118]
const DAWN: RGB = [238, 182, 152]
const MORNING: RGB = [255, 238, 214]
const DAY: RGB = [255, 255, 255]
const CAMPFIRE = [6848, 1600] as const

type Key = { time: number; x: number; y: number; zoom: number; ease: (t: number) => number }
type Shot = 'sky' | 'crater' | 'house' | 'home'

const [SITE_X, SITE_Y] = METEOR_SITE
const [DOOR_X, DOOR_Y] = HOUSE.door
const HEART: Point = [SITE_X, SITE_Y + 6]
const DIVE_START = [SITE_X + 760, SITE_Y - 380, 900] as const
const DIVE_EASE = 1.35

const RISE_AT: readonly Point[] = [
  [SITE_X - 34, SITE_Y + 104],
  [SITE_X + 30, SITE_Y + 100],
  [SITE_X - 2, SITE_Y + 112],
]
const STATIONS: readonly Point[] = [
  [SITE_X - 120, SITE_Y + 206],
  [SITE_X + 4, SITE_Y + 240],
  [SITE_X + 124, SITE_Y + 210],
]
const LOOKS: readonly (readonly Direction[])[] = [
  ['sw', 'w', 's'],
  ['s', 'se', 'sw'],
  ['se', 'e', 's'],
]
const PUSH = 110
const TRAIL: readonly Point[] = [
  [6812, 1990],
  [6770, 2200],
  [6690, 2420],
  [6650, 2600],
  [6664, 2780],
]
const WALK_SPEED = 190

const HANDS: readonly Point[] = [
  [(12 - 24) * TEXEL, (9 - 44) * TEXEL],
  [(35 - 24) * TEXEL, (9 - 44) * TEXEL],
]
const HOUSE_PILOT: Point = [DOOR_X - 56, DOOR_Y + 96]
const HOUSE_ROBOT: Point = [DOOR_X + 58, DOOR_Y + 104]
const DOORSTEP: Point = [DOOR_X, DOOR_Y + 16]
const ROBOT_BESIDE: Point = [HOME_START[0] + 72, HOME_START[1] - 8]

const KEYS: Key[] = [
  { time: TIMELINE.cut, x: SITE_X + 280, y: SITE_Y - 260, zoom: 0.8, ease: (t) => t },
  { time: TIMELINE.impact, x: SITE_X + 150, y: SITE_Y - 150, zoom: 0.86, ease: easeInOutSine },
  { time: TIMELINE.impact + 0.5, x: SITE_X + 140, y: SITE_Y - 140, zoom: 0.86, ease: (t) => t },
  { time: TIMELINE.toHouse, x: SITE_X + 40, y: SITE_Y - 10, zoom: 1.08, ease: easeInOutSine },
  { time: TIMELINE.toHouse, x: DOOR_X + 40, y: DOOR_Y - 40, zoom: 1.05, ease: (t) => t },
  { time: TIMELINE.toCrater, x: DOOR_X + 6, y: DOOR_Y + 14, zoom: 1.38, ease: easeInOutSine },
  { time: TIMELINE.toCrater, x: SITE_X, y: SITE_Y + 30, zoom: 1.5, ease: (t) => t },
  { time: TIMELINE.split, x: SITE_X, y: SITE_Y + 40, zoom: 1.95, ease: easeInOutSine },
  { time: TIMELINE.stepOut, x: SITE_X, y: SITE_Y + 90, zoom: 1.7, ease: easeOutCubic },
  { time: TIMELINE.reach, x: SITE_X, y: SITE_Y + 124, zoom: 1.45, ease: easeInOutSine },
  { time: TIMELINE.reject, x: SITE_X, y: SITE_Y + 90, zoom: 1.85, ease: easeInQuad },
  { time: TIMELINE.reject + 0.7, x: SITE_X, y: SITE_Y + 160, zoom: 1.5, ease: easeOutCubic },
  { time: TIMELINE.disguise[0] - 0.4, x: SITE_X, y: SITE_Y + 210, zoom: 1.36, ease: easeInOutSine },
  { time: TIMELINE.walkStart, x: SITE_X, y: SITE_Y + 250, zoom: 1.6, ease: easeInOutSine },
  { time: TIMELINE.toHome, x: DOOR_X, y: DOOR_Y + 40, zoom: 1.25, ease: (t) => t },
  { time: TIMELINE.end - 0.3, x: HOME_START[0], y: HOME_START[1] - LOOK_ABOVE_FEET, zoom: 1, ease: easeInOutCubic },
]
const WALK_KEY = KEYS.find((key) => key.time === TIMELINE.walkStart) ?? KEYS[0]

const CUTS = [TIMELINE.toHouse, TIMELINE.toCrater, TIMELINE.toHome]

export type DirectorDeps = {
  scene: Scene
  sky: SkyShot
  sound: Sound
  overlay: Overlay

  player: Player
  robot: Player
  meteor: MeteorArt
  visitors: VisitorArt
  reducedMotion: boolean
}

export class Director {
  time = 0
  finished = false
  private readonly fired = new Set<string>()
  private readonly chips: HTMLCanvasElement[]
  private readonly sparkSprites: HTMLCanvasElement[]
  private readonly moteSprite: HTMLCanvasElement
  private readonly violetSprite: HTMLCanvasElement
  private readonly heartSprite: HTMLCanvasElement
  private readonly visitors: Visitor[] = [new Visitor(), new Visitor(), new Visitor()]
  private readonly actors: Actor[]
  private staged = false
  private lastStepFrame = 0
  private shakeX = 0
  private shakeY = 0

  constructor(private readonly deps: DirectorDeps) {
    this.chips = chipTextures(deps.meteor.rock)
    this.sparkSprites = [glowTexture([255, 252, 236], 32), glowTexture([255, 214, 130], 32), glowTexture([255, 140, 60], 32)]
    this.moteSprite = glowTexture([206, 232, 255], 32)
    this.violetSprite = glowTexture([196, 160, 255], 32)
    this.heartSprite = glowTexture([255, 232, 186], 64)
    this.actors = visitorActors(this.visitors, deps.visitors)
  }

  update(dt: number, view: View) {
    if (this.finished) return
    this.time += dt
    const t = this.time
    const { scene, sky } = this.deps
    this.runCues(t)
    this.updateShake(t, view)

    if (t < SKY.cut) {
      sky.update(dt, t)
      scene.flash = Math.pow(smoothstep(SKY.whiteout, SKY.cut, t), 1.5)
      scene.grain = 1
      scene.vignette = 0.85
      return
    }

    this.stage()
    scene.lights.length = 0
    scene.playerRise = 1
    scene.playerGlow = 0
    this.approach(t, dt)
    this.aftermath(t, dt)
    this.awakening(t, dt)
    this.choreograph(t, dt)
    this.household(t)
    scene.update(dt)
    if (t >= TIMELINE.end) this.finish()
  }

  lens(view: View): Lens {
    const t = Math.max(this.time, TIMELINE.cut)
    let { x, y, zoom } = keyed(t)
    if (t >= TIMELINE.walkStart && t < TIMELINE.toHome) {
      const [cx, cy] = this.groupCenter()
      const follow = smoothstep(TIMELINE.walkStart, TIMELINE.walkStart + 1.6, t)
      x = lerp(WALK_KEY.x, cx, follow)
      y = lerp(WALK_KEY.y, cy - 70, follow)
      zoom = lerp(WALK_KEY.zoom, 1.3, follow)
    }
    const beats = [...TIMELINE.houseBeats, ...TIMELINE.craterBeats, ...TIMELINE.reachBeats]
    const kick =
      beats.reduce((sum, beat) => sum + 0.018 * decay(beat, t, 5), 0) + 0.05 * decay(TIMELINE.split, t, 4) + 0.07 * decay(TIMELINE.reject, t, 3.5)
    return clampLens({ x, y, zoom: playZoom(view) * zoom * (1 + kick) }, view)
  }

  bars() {
    return smoothstep(0, 0.9, this.time) * (1 - smoothstep(TIMELINE.barsOut, TIMELINE.end - 0.1, this.time))
  }

  seek(time: number) {
    if (this.finished || this.time > 0) return
    this.time = Math.max(0, Math.min(TIMELINE.end - 0.1, time))
  }

  render(context: CanvasRenderingContext2D, view: View, now: number) {
    const { scene, sky, player } = this.deps
    if (this.time < SKY.cut) {
      sky.draw(context, view.width, view.height, this.time, now / 1000, this.shakeX, this.shakeY, scene.profiler)
      scene.drawFinish(context, view.width, view.height, now)
      return
    }
    scene.shakeX = this.shakeX
    scene.shakeY = this.shakeY
    scene.render(context, view, this.lens(view), player, now)
    const black = blackout(this.time)
    if (black > 0.001) {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = Math.min(1, black)
      context.fillStyle = '#050608'
      context.fillRect(0, 0, view.width, view.height)
      context.globalAlpha = 1
    }
  }

  skip() {
    if (this.finished) return
    const { scene, sound, overlay } = this.deps
    this.time = TIMELINE.end
    this.stage()
    scene.particles.clear()
    scene.rings.length = 0
    scene.lights.length = 0
    this.aftermath(this.time, 0)
    this.awakening(this.time, 0)
    this.choreograph(this.time, 0)
    this.household(this.time)
    scene.fireball.visible = false
    scene.flash = 0
    scene.shakeX = 0
    scene.shakeY = 0
    sound.stopCues()
    sound.bed('day')
    overlay.hideCaption()
    overlay.hideLine()
    this.finish()
  }

  private stage() {
    if (this.staged) return
    this.staged = true
    const { scene } = this.deps
    scene.actors.push(...this.actors)
    scene.hooks = { ...scene.hooks, glow: this.glowHook }
  }

  private finish() {
    const { scene, player, robot, overlay } = this.deps
    this.finished = true
    scene.grain = 0
    scene.vignette = 0
    scene.flash = 0
    scene.shakeX = 0
    scene.shakeY = 0
    scene.playerRise = 1
    scene.playerGlow = 0
    scene.playerVisible = true
    scene.companionVisible = true
    scene.companionGlow = 0
    scene.ambient = DAY
    for (const visitor of this.visitors) visitor.visible = false
    for (const actor of this.actors) {
      const index = scene.actors.indexOf(actor)
      if (index >= 0) scene.actors.splice(index, 1)
    }
    if (scene.hooks.glow === this.glowHook) scene.hooks = { ...scene.hooks, glow: undefined }
    player.place(HOME_START[0], HOME_START[1], 's')
    player.moving = false
    robot.place(ROBOT_BESIDE[0], ROBOT_BESIDE[1], 's')
    robot.moving = false
    overlay.hideLine()
  }

  private once(key: string, when: number, action: () => void) {
    if (this.time >= when && !this.fired.has(key)) {
      this.fired.add(key)
      action()
    }
  }

  private shot(t: number): Shot {
    if (t < SKY.cut) return 'sky'
    if (t < TIMELINE.toHouse) return 'crater'
    if (t < TIMELINE.toCrater) return 'house'
    if (t < TIMELINE.toHome) return 'crater'
    return 'home'
  }

  private runCues(t: number) {
    const { sound, overlay, scene } = this.deps
    this.once('meteor', TIMELINE.meteorAppear, () => {
      sound.cue('meteor', TIMELINE.impact - TIMELINE.meteorAppear)
      overlay.describe('Um meteoro em chamas corta o céu noturno sobre a floresta.')
    })
    this.once('impact', TIMELINE.impact, () => {
      sound.stopCue('meteor')
      sound.cue('impact')
      sound.bed('fire')
      this.impactBurst()
      overlay.describe('O meteoro atinge o antigo acampamento e abre uma cratera no meio da floresta.')
    })
    this.once('caption', TIMELINE.caption, () => overlay.caption('Floresta de Bosque Alto', 'O antigo acampamento'))
    this.once('caption-end', TIMELINE.captionEnd, () => overlay.hideCaption())
    this.once('house', TIMELINE.toHouse, () => {
      sound.bed('night')
      overlay.describe('Enquanto isso, na sua casa, o chão ainda treme. O cristal no peito do seu robô começa a pulsar.')
    })
    this.once('house-caption', TIMELINE.houseCaption, () => overlay.caption('Enquanto isso', 'Sua casa, no Parque da Árvore-Lume'))
    this.once('house-caption-end', TIMELINE.houseCaptionEnd, () => overlay.hideCaption())
    TIMELINE.houseBeats.forEach((beat, index) => this.once(`house-beat-${index}`, beat, () => sound.cue('heartbeat')))
    this.once('robot-looks', TIMELINE.robotLooks, () => overlay.describe('O robô vira a cabeça para o norte, na direção da floresta, como se ouvisse um chamado.'))
    this.once('crater', TIMELINE.toCrater, () => sound.bed('fire'))
    TIMELINE.craterBeats.forEach((beat, index) =>
      this.once(`crater-beat-${index}`, beat, () => {
        sound.cue('heartbeat')
        scene.addRing(SITE_X, SITE_Y + 60, 820, 0.9, 0.42, true)
      }),
    )
    this.once('crack', TIMELINE.crackStart, () => {
      sound.cue('crack', TIMELINE.split - TIMELINE.crackStart)
      overlay.describe('Na cratera, a rocha pulsa como um coração e começa a rachar.')
    })
    this.once('split', TIMELINE.split, () => {
      sound.stopCue('crack')
      sound.cue('split')
      this.splitBurst()
      overlay.describe('O meteoro se parte ao meio. De dentro da luz, sobem três figuras altas e magras.')
    })
    TIMELINE.emerge.forEach((when, index) => this.once(`emerge-${index}`, when, () => sound.cue('warp')))
    this.once('reach', TIMELINE.reach, () => {
      sound.cue('charge', TIMELINE.reject - TIMELINE.reach)
      overlay.describe('Os três estendem as mãos para o coração do meteoro. Fios de luz roxa tentam arrancá-lo da rocha.')
    })
    TIMELINE.reachBeats.forEach((beat, index) => this.once(`reach-beat-${index}`, beat, () => sound.cue('heartbeat')))
    this.once('reject', TIMELINE.reject, () => {
      sound.stopCue('charge')
      sound.cue('light')
      sound.cue('heavy')
      this.rejectBurst()
      overlay.describe('O coração explode em luz dourada e arremessa os três para trás. Ele não se deixa levar.')
    })
    this.once('line-1', TIMELINE.line1, () => overlay.line('Visitante · língua desconhecida', 'Ele nos recusa.'))
    this.once('line-2', TIMELINE.line2, () => overlay.line('Visitante', 'Mas responde aos cristais dos robôs deles. Então vamos buscá-los, um por um.'))
    this.once('lines-end', TIMELINE.linesEnd, () => overlay.hideLine())
    this.once('day', TIMELINE.dawnStart + 2, () => sound.bed('day'))
    TIMELINE.disguise.forEach((when, index) =>
      this.once(`disguise-${index}`, when, () => {
        sound.cue('transform')
        if (index === 0) overlay.describe('Ao amanhecer, uma linha de luz desce pelo corpo de cada um. Por baixo dela aparecem casacos compridos e rostos humanos.')
      }),
    )
    this.once('line-3', TIMELINE.line3, () => overlay.line('Visitante', 'Sorriam. Sem mostrar os dentes.'))
    this.once('line-3-end', TIMELINE.line3End, () => overlay.hideLine())
    this.once('walk', TIMELINE.walkStart, () => overlay.describe('Os três forasteiros descem a trilha na direção da cidade.'))
    this.once('caption-2', TIMELINE.caption2, () => overlay.caption('Na manhã seguinte', 'Três forasteiros chegaram a Bosque Alto'))
    this.once('caption-2-end', TIMELINE.caption2End, () => overlay.hideCaption())
    this.once('home', TIMELINE.toHome, () => overlay.describe('Na manhã seguinte, você sai de casa com o seu robô.'))
    this.once('door', TIMELINE.doorOpen, () => sound.cue('door'))
    const walking = (t >= TIMELINE.walkStart && t < TIMELINE.toHome) || (t >= TIMELINE.exitStart && t < TIMELINE.exitEnd)
    if (walking) {
      const frame = walkFrame(t, 0)
      if (frame !== this.lastStepFrame && frame % 3 === 0) sound.cue('step')
      this.lastStepFrame = frame
    }
  }

  private updateShake(t: number, view: View) {
    const motion = this.deps.reducedMotion ? 0.2 : 1
    const crack = this.crackAmount(t)
    const sky = t < SKY.cut ? 0.007 * Math.pow(this.deps.sky.progress, 2) : 0
    const beats = [...TIMELINE.craterBeats, ...TIMELINE.reachBeats].reduce((sum, beat) => sum + 0.004 * decay(beat, t, 7), 0)
    const tremor = t >= TIMELINE.toHouse && t < TIMELINE.toCrater ? 0.006 * decay(TIMELINE.toHouse, t, 1.4) : 0
    const amplitude =
      view.height *
      motion *
      (sky +
        0.034 * decay(TIMELINE.impact, t, 2.1) +
        0.013 * decay(TIMELINE.split, t, 3.2) +
        0.02 * decay(TIMELINE.reject, t, 2.6) +
        0.004 * crack * crack +
        beats +
        tremor)
    this.shakeX = amplitude * (Math.sin(t * 47.3) * 0.6 + Math.sin(t * 91.7 + 1.3) * 0.4)
    this.shakeY = amplitude * (Math.sin(t * 53.9 + 0.7) * 0.6 + Math.sin(t * 83.1 + 2.1) * 0.4)
  }

  private crackAmount(t: number) {
    return t >= TIMELINE.split ? 1 : easeInQuad(progress(TIMELINE.crackStart, TIMELINE.split - 0.15, t))
  }

  private pull(t: number) {
    return t < TIMELINE.reject ? smoothstep(TIMELINE.reach + 0.3, TIMELINE.reject - 0.1, t) : 0
  }

  private approach(t: number, dt: number) {
    const { scene } = this.deps
    const flashScale = this.deps.reducedMotion ? 0.45 : 1
    const fromWhite = 1 - progress(TIMELINE.cut, TIMELINE.cut + 0.3, t)
    scene.flash = Math.max(
      fromWhite * fromWhite,
      flashScale * decay(TIMELINE.impact, t, 3.2),
      0.85 * flashScale * decay(TIMELINE.split, t, 4),
      0.75 * flashScale * decay(TIMELINE.reject, t, 3),
    )
    scene.grain = this.bars()
    scene.vignette = 0.85 * this.bars()

    const ball = scene.fireball
    if (t >= TIMELINE.impact) {
      ball.visible = false
      return
    }
    scene.ambient = NIGHT
    scene.crater = 0
    const flicker = 0.85 + 0.1 * Math.sin(t * 19) + 0.05 * Math.sin(t * 47)
    scene.lights.push({ x: CAMPFIRE[0], y: CAMPFIRE[1], radius: 600, color: [255, 160, 80], intensity: flicker })

    const duration = TIMELINE.impact - TIMELINE.cut
    const u = progress(TIMELINE.cut, TIMELINE.impact, t)
    const eased = Math.pow(u, DIVE_EASE)
    const rate = (DIVE_EASE * Math.pow(Math.max(u, 0.02), DIVE_EASE - 1)) / duration
    const [startX, startY, startZ] = DIVE_START
    ball.visible = true
    ball.x = lerp(startX, SITE_X, eased)
    ball.y = lerp(startY, SITE_Y, eased)
    ball.z = lerp(startZ, 0, eased)
    ball.vx = (SITE_X - startX) * rate
    ball.vy = (SITE_Y - startY) * rate
    ball.vz = -startZ * rate
    ball.size = lerp(70, 150, eased)
    ball.trail = lerp(900, 1500, eased)
    ball.spin = t * 6
    scene.lights.push({ x: ball.x, y: ball.y, radius: lerp(1100, 2800, eased), color: [255, 214, 160], intensity: lerp(0.35, 1.7, eased) })

    const speed = Math.hypot(ball.vx, ball.vy, ball.vz) || 1
    const count = Math.ceil(dt * 220)
    for (let i = 0; i < count; i++) {
      scene.particles.spawn({
        x: ball.x + (Math.random() - 0.5) * ball.size * 0.5,
        y: ball.y + (Math.random() - 0.5) * ball.size * 0.3,
        z: ball.z + (Math.random() - 0.5) * ball.size * 0.4,
        vx: (-ball.vx / speed) * 260 + (Math.random() - 0.5) * 120,
        vy: (-ball.vy / speed) * 260 + (Math.random() - 0.5) * 120,
        vz: (-ball.vz / speed) * 260,
        life: 0.3 + Math.random() * 0.35,
        size: ball.size * (1.4 + Math.random() * 0.8),
        sizeEnd: ball.size * 0.3,
        sprite: scene.fireSprites,
        blend: 'add',
        alpha: 0.85,
      })
    }
  }

  private aftermath(t: number, dt: number) {
    const { scene } = this.deps
    if (t < TIMELINE.impact) return
    scene.crater = 1
    const shot = this.shot(t)
    if (shot === 'house') {
      scene.ambient = HOUSE_NIGHT
      scene.fires = 0
      return
    }
    if (shot === 'home') {
      scene.ambient = mixColor(MORNING, DAY, smoothstep(TIMELINE.toHome, TIMELINE.end - 0.4, t))
      scene.fires = 0.4
      return
    }
    const dawn = smoothstep(TIMELINE.dawnStart, TIMELINE.dawnEnd, t)
    scene.ambient = dawn < 0.5 ? mixColor(NIGHT, DAWN, dawn * 2) : mixColor(DAWN, DAY, (dawn - 0.5) * 2)
    scene.lights.push({ x: SITE_X, y: SITE_Y, radius: 4200, color: [255, 226, 182], intensity: 2.6 * decay(TIMELINE.impact, t, 1.25) })

    const fires = smoothstep(TIMELINE.impact, TIMELINE.impact + 0.25, t) * (1.25 - 0.6 * smoothstep(TIMELINE.dawnStart, TIMELINE.toHome, t))
    scene.fires = fires
    scene.burnFires(dt, fires, t)

    if (dt <= 0) return
    const since = t - TIMELINE.impact
    const smokeRate = since < 6 ? 16 * (1 - since / 7) : 2.5
    if (Math.random() < smokeRate * dt) {
      scene.particles.spawn({
        x: SITE_X + (Math.random() - 0.5) * 160,
        y: SITE_Y + (Math.random() - 0.5) * 80,
        vx: 20 + Math.random() * 40,
        rise: 70 + Math.random() * 70,
        life: 4 + Math.random() * 3,
        size: 180,
        sizeEnd: 620 + Math.random() * 300,
        alpha: 0.4,
        fadeIn: 0.15,
        sprite: scene.smokeSprites[Math.floor(Math.random() * scene.smokeSprites.length)],
        blend: 'haze',
      })
    }
    const heat = scene.pose.heat
    if (Math.random() < heat * 10 * dt) {
      scene.particles.spawn({
        x: SITE_X + (Math.random() - 0.5) * METEOR.width,
        y: SITE_Y + (Math.random() - 0.2) * METEOR.height * 0.6,
        vx: (Math.random() - 0.5) * 80,
        rise: 120 + Math.random() * 140,
        wobble: 70,
        life: 1.4 + Math.random() * 1.4,
        size: 12 + Math.random() * 10,
        sizeEnd: 4,
        sprite: this.sparkSprites[1],
        blend: 'add',
      })
    }
  }

  private awakening(t: number, dt: number) {
    const { scene, meteor } = this.deps
    const pose = scene.pose
    if (t < TIMELINE.impact) {
      pose.visible = false
      return
    }
    const crack = this.crackAmount(t)
    const beats = [...TIMELINE.craterBeats, ...TIMELINE.reachBeats].reduce((sum, beat) => sum + 1.1 * decay(beat, t, 4.5), 0)
    const opened = t >= TIMELINE.split
    const pull = this.pull(t)
    const flare = t >= TIMELINE.reject ? decay(TIMELINE.reject, t, 1.6) : 0
    pose.visible = true
    pose.time = t
    pose.crack = crack
    pose.split = opened ? Math.min(1.06, easeOutBack(progress(TIMELINE.split, TIMELINE.split + 0.7, t), 1.2)) : 0
    if (opened && t > TIMELINE.split + 0.7) pose.split = 1
    pose.jitter = !opened && t >= TIMELINE.crackStart ? 1.5 + 9 * crack * crack : pull * 2.5
    pose.rays = Math.max(smoothstep(0.3, 1, crack) * (opened ? decay(TIMELINE.split, t, 6) : 1), pull * 0.55, flare)
    pose.gap = opened ? 1.7 * decay(TIMELINE.split, t, 0.9) + 1.3 * flare : 0
    pose.heat = opened
      ? 0.7 + decay(TIMELINE.split, t, 1.2) + pull * 0.9 + flare * 1.5 + (t >= TIMELINE.reach ? beats * 0.5 : 0)
      : 0.85 + 1.4 * decay(TIMELINE.impact, t, 0.8) + beats + crack * 0.9
    scene.pillar = smoothstep(TIMELINE.split, TIMELINE.split + 0.15, t) * (1 - smoothstep(TIMELINE.split + 2.4, TIMELINE.split + 3.6, t))

    if (this.shot(t) !== 'crater') return
    scene.lights.push({ x: SITE_X, y: SITE_Y + 40, radius: 900, color: [255, 130, 60], intensity: 0.45 * pose.heat })
    if (beats > 0.01) scene.lights.push({ x: SITE_X, y: SITE_Y + 40, radius: 1200, color: [255, 150, 80], intensity: 0.8 * beats })
    if (crack > 0 && !opened) scene.lights.push({ x: SITE_X, y: SITE_Y, radius: 1300, color: [255, 228, 188], intensity: 0.3 + 1.5 * crack })
    scene.lights.push({ x: SITE_X, y: SITE_Y, radius: 3600, color: [255, 244, 230], intensity: 2.8 * decay(TIMELINE.split, t, 1.1) + 2.2 * flare })
    if (pull > 0) scene.lights.push({ x: SITE_X, y: SITE_Y + 60, radius: 1100, color: [176, 130, 255], intensity: 1.1 * pull })
    if (scene.pillar > 0) scene.lights.push({ x: SITE_X, y: SITE_Y + 60, radius: 1500, color: [220, 236, 255], intensity: 1.2 * scene.pillar })

    if (dt <= 0) return
    if (!opened && crack > 0 && Math.random() < crack * dt * 14) {
      const [px, py] = meteor.crack[1 + Math.floor(Math.random() * (meteor.crack.length - 2))]
      this.throwChip(SITE_X + (px / meteor.width - 0.5) * METEOR.width, SITE_Y + (py / meteor.height - 0.5) * METEOR.height, 0.5)
    }
    if (opened && t < TIMELINE.emerge[2] + 1.6 && Math.random() < 30 * dt) {
      const angle = Math.random() * Math.PI * 2
      const distance = 40 + Math.random() * 160
      scene.particles.spawn({
        x: SITE_X + Math.cos(angle) * distance,
        y: SITE_Y + 80 + Math.sin(angle) * distance * 0.6,
        rise: 70 + Math.random() * 90,
        wobble: 90,
        life: 1.5 + Math.random() * 1.2,
        size: 12 + Math.random() * 12,
        sizeEnd: 3,
        sprite: Math.random() < 0.55 ? this.violetSprite : this.moteSprite,
        blend: 'add',
      })
    }
    if (pull > 0 && Math.random() < pull * 40 * dt) {
      const visitor = this.visitors[Math.floor(Math.random() * this.visitors.length)]
      const [hx, hy] = HANDS[Math.random() < 0.5 ? 0 : 1]
      const u = Math.random()
      scene.particles.spawn({
        x: lerp(visitor.x + hx, HEART[0], u),
        y: lerp(visitor.y + hy, HEART[1], u),
        rise: 20 + Math.random() * 40,
        wobble: 30,
        life: 0.5 + Math.random() * 0.5,
        size: 10 + Math.random() * 8,
        sizeEnd: 2,
        sprite: this.violetSprite,
        blend: 'add',
      })
    }
  }

  private choreograph(t: number, dt: number) {
    const { scene } = this.deps
    const onStage = this.shot(t) === 'crater' && t >= TIMELINE.toCrater
    this.visitors.forEach((visitor, index) => {
      const emerge = TIMELINE.emerge[index]
      visitor.visible = onStage && t >= emerge
      if (!visitor.visible) return
      const [riseX, riseY] = RISE_AT[index]
      const [stationX, stationY] = STATIONS[index]
      const pushedX = stationX + (stationX - SITE_X) * 0.35
      const pushedY = stationY + PUSH
      const stepStart = TIMELINE.stepOut + index * 0.25
      const stepEnd = TIMELINE.stepOutEnd + index * 0.25
      const reachAt = TIMELINE.reach + index * 0.15
      const disguiseAt = TIMELINE.disguise[index]
      const walkAt = TIMELINE.walkStart + index * 0.45
      visitor.moving = false
      visitor.frame = 0
      visitor.pose = null
      visitor.disguise = 0
      visitor.rise = 1

      if (t < stepStart) {
        visitor.place(riseX, riseY, 's')
        visitor.rise = easeOutCubic(progress(emerge, emerge + 1.1, t))
        visitor.pose = t < emerge + 1.5 ? 'kneel' : null
        visitor.glow = t < emerge + 1.1 ? 1 : 1 - 0.85 * smoothstep(emerge + 1.1, emerge + 2.6, t)
      } else if (t < stepEnd) {
        const u = easeInOutSine(progress(stepStart, stepEnd, t))
        visitor.place(lerp(riseX, stationX, u), lerp(riseY, stationY, u), directionFromVector(stationX - riseX, stationY - riseY, visitor.facing))
        visitor.moving = true
        visitor.frame = walkFrame(t, index)
        visitor.glow = 0.15
      } else if (t < reachAt) {
        const look = LOOKS[index]
        const span = reachAt - stepEnd
        const slot = Math.min(look.length - 1, Math.floor(((t - stepEnd) / span) * look.length))
        visitor.place(stationX, stationY, look[slot])
        visitor.glow = 0.15
      } else if (t < TIMELINE.reject) {
        visitor.place(stationX, stationY, 'n')
        visitor.pose = 'reach'
        visitor.glow = 0.2 + 0.7 * this.pull(t)
      } else if (t < TIMELINE.stand) {
        const u = easeOutCubic(progress(TIMELINE.reject, TIMELINE.reject + 0.5, t))
        visitor.place(lerp(stationX, pushedX, u), lerp(stationY, pushedY, u), 'n')
        visitor.pose = t < TIMELINE.reject + 0.55 ? 'recoil' : 'kneel'
        visitor.glow = 0.9 * decay(TIMELINE.reject, t, 1.4)
      } else if (t < walkAt) {
        const facing: Direction = t < disguiseAt - 0.6 ? 'n' : 's'
        visitor.place(pushedX, pushedY, facing)
        visitor.disguise = easeInOutSine(progress(disguiseAt, disguiseAt + 0.9, t))
        visitor.glow = t < disguiseAt ? 0.08 : 0
        if (dt > 0 && visitor.disguise > 0 && visitor.disguise < 1 && Math.random() < 50 * dt) {
          scene.particles.spawn({
            x: visitor.x + (Math.random() - 0.5) * 70,
            y: visitor.y - (1 - visitor.disguise) * 8 * TEXEL - 34 * TEXEL * (1 - visitor.disguise) * Math.random(),
            rise: 30 + Math.random() * 50,
            wobble: 40,
            life: 0.6 + Math.random() * 0.5,
            size: 9 + Math.random() * 8,
            sizeEnd: 2,
            sprite: this.violetSprite,
            blend: 'add',
          })
        }
      } else {
        const path: Point[] = [[pushedX, pushedY], [SITE_X + (index - 1) * 44, SITE_Y + 430], ...TRAIL.map(([x, y]): Point => [x + (index - 1) * 36, y])]
        const along = pointAlong(path, (t - walkAt) * WALK_SPEED)
        visitor.place(along.x, along.y, along.done ? 's' : directionFromVector(along.dx, along.dy, visitor.facing))
        visitor.moving = !along.done
        visitor.frame = walkFrame(t, index)
        visitor.disguise = 1
        visitor.glow = 0
      }
      if (visitor.glow > 0.05) {
        scene.lights.push({ x: visitor.x, y: visitor.y - 80, radius: 420, color: [190, 150, 255], intensity: 0.75 * visitor.glow })
      }
    })
  }

  private household(t: number) {
    const { scene, player, robot } = this.deps
    const shot = this.shot(t)
    scene.companionGlow = 0
    if (shot === 'house') {
      scene.playerVisible = true
      scene.companionVisible = true
      player.place(HOUSE_PILOT[0], HOUSE_PILOT[1], t >= TIMELINE.pilotLooks ? 'n' : t >= TIMELINE.robotLooks + 0.4 ? 'e' : 's')
      player.moving = false
      player.frame = 0
      robot.place(HOUSE_ROBOT[0], HOUSE_ROBOT[1], t >= TIMELINE.robotLooks ? 'n' : 'sw')
      robot.moving = false
      robot.frame = 0
      const beat = TIMELINE.houseBeats.reduce((sum, at) => sum + decay(at, t, 3.2), 0)
      const awake = smoothstep(TIMELINE.houseBeats[0] - 0.2, TIMELINE.houseBeats[0], t)
      scene.companionGlow = Math.min(1, awake * (0.22 + beat))
      scene.lights.push({ x: robot.x, y: robot.y - 60, radius: 420, color: [214, 232, 255], intensity: awake * (0.25 + 0.9 * beat) })
      return
    }
    if (shot === 'home') {
      const pilotWalk = easeInOutSine(progress(TIMELINE.exitStart, TIMELINE.exitEnd, t))
      const robotWalk = easeInOutSine(progress(TIMELINE.exitStart + 0.35, TIMELINE.exitEnd + 0.35, t))
      scene.playerVisible = t >= TIMELINE.doorOpen
      scene.companionVisible = t >= TIMELINE.exitStart + 0.35
      player.place(lerp(DOORSTEP[0], HOME_START[0], pilotWalk), lerp(DOORSTEP[1], HOME_START[1], pilotWalk), pilotWalk < 1 ? directionFromVector(HOME_START[0] - DOORSTEP[0], HOME_START[1] - DOORSTEP[1], player.facing) : 's')
      player.moving = pilotWalk > 0 && pilotWalk < 1
      player.frame = walkFrame(t, 0)
      robot.place(lerp(DOORSTEP[0], ROBOT_BESIDE[0], robotWalk), lerp(DOORSTEP[1], ROBOT_BESIDE[1], robotWalk), robotWalk < 1 ? directionFromVector(ROBOT_BESIDE[0] - DOORSTEP[0], ROBOT_BESIDE[1] - DOORSTEP[1], robot.facing) : 'sw')
      robot.moving = robotWalk > 0 && robotWalk < 1
      robot.frame = walkFrame(t, 2)
      return
    }
    scene.playerVisible = false
    scene.companionVisible = false
  }

  private groupCenter(): Point {
    let x = 0
    let y = 0
    for (const visitor of this.visitors) {
      x += visitor.x
      y += visitor.y
    }
    return [x / this.visitors.length, y / this.visitors.length]
  }

  private readonly glowHook: WorldDraw = (context, originX, originY, zoom) => {
    const t = this.time
    const shot = this.shot(t)
    context.globalCompositeOperation = 'lighter'
    if (shot === 'crater' && t >= TIMELINE.split && t < TIMELINE.walkStart + 2) this.drawHeart(context, originX, originY, zoom, t)
    if (shot === 'house') this.drawDistantLight(context, originX, originY, zoom, t)
  }

  private drawHeart(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, t: number) {
    const pull = this.pull(t)
    const flare = t >= TIMELINE.reject ? decay(TIMELINE.reject, t, 1.4) : 0
    const beats = TIMELINE.reachBeats.reduce((sum, beat) => sum + decay(beat, t, 5), 0)
    const settle = 1 - smoothstep(TIMELINE.disguise[0], TIMELINE.walkStart + 2, t)
    const strength = Math.min(1.6, (0.3 + 0.5 * pull + 0.35 * beats) * settle + 1.4 * flare)
    const hx = originX + HEART[0] * zoom
    const hy = originY + HEART[1] * zoom
    const size = (150 + 140 * pull + 80 * beats + 900 * flare) * zoom
    context.globalAlpha = Math.min(1, strength)
    context.drawImage(this.heartSprite, hx - size / 2, hy - size / 2, size, size)
    context.globalAlpha = 1
    if (pull <= 0.02) return
    for (const visitor of this.visitors) {
      if (visitor.pose !== 'reach') continue
      for (const [ox, oy] of HANDS) {
        const sx = originX + (visitor.x + ox) * zoom
        const sy = originY + (visitor.y + oy) * zoom
        const nx = hy - sy
        const ny = sx - hx
        const length = Math.hypot(nx, ny) || 1
        context.beginPath()
        context.moveTo(sx, sy)
        const steps = 7
        for (let k = 1; k < steps; k++) {
          const u = k / steps
          const swing = Math.sin(t * 23 + k * 1.9 + ox) * 9 * zoom * Math.sin(u * Math.PI) * (0.6 + pull)
          context.lineTo(lerp(sx, hx, u) + (nx / length) * swing, lerp(sy, hy, u) + (ny / length) * swing)
        }
        context.lineTo(hx, hy)
        context.strokeStyle = `rgba(176, 128, 255, ${0.55 * pull})`
        context.lineWidth = Math.max(2, 7 * zoom)
        context.stroke()
        context.strokeStyle = `rgba(246, 238, 255, ${0.85 * pull})`
        context.lineWidth = Math.max(1, 2.2 * zoom)
        context.stroke()
      }
    }
  }

  private drawDistantLight(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, t: number) {
    const { width, height } = context.canvas
    const beat = TIMELINE.houseBeats.reduce((sum, at) => sum + decay(at, t, 3), 0)
    const rise = smoothstep(TIMELINE.toHouse + 0.4, TIMELINE.toHouse + 2.4, t)
    const strength = rise * (0.45 + 0.4 * Math.min(1, beat))
    if (strength <= 0.01) return
    const x = Math.min(width * 0.85, Math.max(width * 0.15, originX + SITE_X * zoom))
    const columnWidth = Math.max(10, 90 * zoom)
    const reach = height * 0.48
    const column = context.createLinearGradient(0, 0, 0, reach)
    column.addColorStop(0, `rgba(226, 214, 255, ${0.6 * strength})`)
    column.addColorStop(0.55, `rgba(190, 160, 255, ${0.22 * strength})`)
    column.addColorStop(1, 'rgba(190, 160, 255, 0)')
    context.fillStyle = column
    context.fillRect(x - columnWidth / 2, 0, columnWidth, reach)
    const halo = context.createLinearGradient(0, 0, 0, reach * 0.8)
    halo.addColorStop(0, `rgba(196, 170, 255, ${0.16 * strength})`)
    halo.addColorStop(1, 'rgba(196, 170, 255, 0)')
    context.fillStyle = halo
    context.fillRect(x - columnWidth * 2.5, 0, columnWidth * 5, reach * 0.8)
  }

  private throwChip(x: number, y: number, power: number) {
    const angle = Math.random() * Math.PI * 2
    const speed = (250 + Math.random() * 850) * power
    this.deps.scene.particles.spawn({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.75,
      vz: (500 + Math.random() * 1200) * power,
      gravity: 2600,
      bounce: 0.32,
      life: 2.5 + Math.random() * 2.5,
      size: 14 + Math.random() * 26,
      spin: (Math.random() - 0.5) * 24,
      angle: Math.random() * 6,
      sprite: this.chips[Math.floor(Math.random() * this.chips.length)],
      shadow: true,
      fadeIn: 0.01,
    })
  }

  private impactBurst() {
    const { scene } = this.deps
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 700 + Math.random() * 1900
      scene.particles.spawn({
        x: SITE_X,
        y: SITE_Y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.75,
        drag: 1.7,
        life: 0.4 + Math.random() * 0.8,
        size: 16 + Math.random() * 16,
        sizeEnd: 6,
        stretch: 0.018,
        sprite: this.sparkSprites,
        blend: 'add',
      })
    }
    for (let i = 0; i < 64; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 60 + Math.random() * 360
      scene.particles.spawn({
        x: SITE_X + Math.cos(angle) * distance,
        y: SITE_Y + Math.sin(angle) * distance * 0.75,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 90,
        rise: 60 + Math.random() * 110,
        life: 0.7 + Math.random() * 0.9,
        size: 150 + Math.random() * 160,
        sizeEnd: 30,
        sprite: scene.fireSprites,
        blend: 'add',
        alpha: 0.9,
      })
    }
    for (let i = 0; i < 84; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 400 + Math.random() * 1200
      scene.particles.spawn({
        x: SITE_X + Math.cos(angle) * 60,
        y: SITE_Y + Math.sin(angle) * 45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.75,
        drag: 2.3,
        life: 2.6 + Math.random() * 2.6,
        size: 200 + Math.random() * 140,
        sizeEnd: 700 + Math.random() * 360,
        alpha: 0.5,
        fadeIn: 0.05,
        sprite: scene.dustSprites[Math.floor(Math.random() * scene.dustSprites.length)],
        blend: 'haze',
      })
    }
    for (let i = 0; i < 70; i++) this.throwChip(SITE_X + (Math.random() - 0.5) * 120, SITE_Y + (Math.random() - 0.5) * 80, 1)
    for (let i = 0; i < 22; i++) {
      scene.particles.spawn({
        x: SITE_X + (Math.random() - 0.5) * 200,
        y: SITE_Y + (Math.random() - 0.5) * 120,
        vx: (Math.random() - 0.5) * 360,
        vy: (Math.random() - 0.5) * 200,
        drag: 0.6,
        rise: 90 + Math.random() * 120,
        life: 4 + Math.random() * 3,
        size: 300,
        sizeEnd: 1100,
        alpha: 0.45,
        fadeIn: 0.1,
        sprite: scene.smokeSprites[i % scene.smokeSprites.length],
        blend: 'haze',
      })
    }
    scene.addRing(SITE_X, SITE_Y, 900, 0.55, 1, true)
    scene.addRing(SITE_X, SITE_Y, 3000, 1.25, 0.95, true)
    scene.addRing(SITE_X, SITE_Y, 1800, 2.2, 0.55, false)
  }

  private splitBurst() {
    const { scene, meteor } = this.deps
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 400 + Math.random() * 1300
      scene.particles.spawn({
        x: SITE_X,
        y: SITE_Y + 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.75,
        drag: 1.9,
        life: 0.5 + Math.random() * 0.8,
        size: 14 + Math.random() * 12,
        sizeEnd: 5,
        stretch: 0.02,
        sprite: this.sparkSprites,
        blend: 'add',
      })
    }
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 300 + Math.random() * 700
      scene.particles.spawn({
        x: SITE_X + Math.cos(angle) * 120,
        y: SITE_Y + 90 + Math.sin(angle) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        drag: 2.6,
        life: 2 + Math.random() * 1.6,
        size: 140,
        sizeEnd: 420 + Math.random() * 200,
        alpha: 0.42,
        sprite: scene.dustSprites[i % scene.dustSprites.length],
        blend: 'haze',
      })
    }
    for (let i = 0; i < 24; i++) {
      const [px, py] = meteor.crack[Math.floor(Math.random() * meteor.crack.length)]
      this.throwChip(SITE_X + (px / meteor.width - 0.5) * METEOR.width, SITE_Y + (py / meteor.height - 0.5) * METEOR.height, 0.8)
    }
    scene.addRing(SITE_X, SITE_Y + 60, 1500, 1, 0.8, true)
    scene.addRing(SITE_X, SITE_Y + 60, 1000, 1.6, 0.45, false)
  }

  private rejectBurst() {
    const { scene } = this.deps
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 500 + Math.random() * 1500
      scene.particles.spawn({
        x: HEART[0],
        y: HEART[1] + 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.75,
        drag: 2,
        life: 0.5 + Math.random() * 0.9,
        size: 14 + Math.random() * 14,
        sizeEnd: 4,
        stretch: 0.02,
        sprite: i % 3 === 0 ? this.violetSprite : this.sparkSprites,
        blend: 'add',
      })
    }
    for (let i = 0; i < 26; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 260 + Math.random() * 600
      scene.particles.spawn({
        x: HEART[0] + Math.cos(angle) * 90,
        y: HEART[1] + 120 + Math.sin(angle) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.6,
        drag: 2.4,
        life: 1.8 + Math.random() * 1.4,
        size: 130,
        sizeEnd: 380 + Math.random() * 160,
        alpha: 0.36,
        sprite: scene.dustSprites[i % scene.dustSprites.length],
        blend: 'haze',
      })
    }
    scene.addRing(HEART[0], HEART[1] + 60, 1300, 0.8, 0.9, true)
    scene.addRing(HEART[0], HEART[1] + 60, 700, 1.3, 0.5, false)
  }
}

function keyed(t: number) {
  let index = KEYS.findIndex((key) => key.time > t)
  if (index === -1) index = KEYS.length - 1
  const to = KEYS[index]
  const from = KEYS[Math.max(0, index - 1)]
  const amount = to === from ? 1 : to.ease(clamp01((t - from.time) / (to.time - from.time)))
  return { x: lerp(from.x, to.x, amount), y: lerp(from.y, to.y, amount), zoom: lerp(from.zoom, to.zoom, amount) }
}

function blackout(t: number) {
  let black = 0
  for (const cut of CUTS) {
    if (t >= cut - 0.45 && t < cut) black = Math.max(black, smoothstep(cut - 0.45, cut, t))
    else if (t >= cut && t < cut + 0.6) black = Math.max(black, 1 - smoothstep(cut, cut + 0.6, t))
  }
  return black
}

function walkFrame(t: number, offset: number) {
  return (Math.floor(t * 9) + offset * 2) % FRAME.walkFrames
}

function pointAlong(path: readonly Point[], distance: number) {
  let left = Math.max(0, distance)
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i]
    const [bx, by] = path[i + 1]
    const length = Math.hypot(bx - ax, by - ay)
    if (left <= length) {
      const u = length > 0 ? left / length : 1
      return { x: lerp(ax, bx, u), y: lerp(ay, by, u), dx: bx - ax, dy: by - ay, done: false }
    }
    left -= length
  }
  const [lx, ly] = path[path.length - 1]
  const [px, py] = path[path.length - 2] ?? path[path.length - 1]
  return { x: lx, y: ly, dx: lx - px, dy: ly - py, done: true }
}
