import { TEXEL } from '../../world-data'
import { badgeLabel, centeredLabel, drawLabel, textLabel } from '../fx/labels'
import type { Particles } from '../fx/particles'
import { drawCell, tinted } from '../fx/supersample'
import { drawShadow, glowTexture, shadowTexture, type RGB } from '../fx/textures'
import type { Player } from '../player'
import type { RobotSheets } from '../robot/sprites'
import type { Actor } from '../scene'
import { ANCHOR, FRAME, ROW } from '../sprite'
import { FORM_GLOW, ROBOT_SCALE, type Afterimage, type Battle, type Popup, type Slash } from './battle'
import { Crowd } from './crowd'
import { CARDS } from './deck'
import { ELEMENTS, ELEMENT_IDS, rgba, type Ailment, type Element } from './elements'
import type { Enemy } from './enemy'
import type { GadgetTag, VehicleArt } from './gadgets'
import { specLook } from './lineup'
import type { EnemyArt } from './sprites'

const ROBOT_PIXEL = TEXEL
const S = ROBOT_SCALE
const SHADOW = 'rgba(24, 18, 12, 0.3)'
const FONT = '"Geist", ui-sans-serif, system-ui, sans-serif'
const TEAL: RGB = [126, 255, 224]
const GOLD: RGB = [255, 214, 110]
const RED: RGB = [255, 96, 80]
const INK = 'rgba(8, 10, 12, 0.82)'
const FLOODLIGHT: RGB = [255, 226, 180]

export const AILMENT_TAG: Record<Ailment, string> = {
  queimadura: 'QUE',
  encharcado: 'ENC',
  abalado: 'ABA',
  arrastado: 'ARR',
  choque: 'CHQ',
  congelado: 'CGL',
  ofuscado: 'OFS',
  drenado: 'DRN',
}

const AILMENT_ELEMENT: Record<Ailment, Element> = {
  queimadura: 'fogo',
  encharcado: 'agua',
  abalado: 'terra',
  arrastado: 'vento',
  choque: 'raio',
  congelado: 'gelo',
  ofuscado: 'luz',
  drenado: 'sombra',
}

export type RendererOptions = {
  assetBase: string
  robot(): RobotSheets
}

type FloodCone = { x: number; y: number; gradient: CanvasGradient; ax: number; ay: number; bx: number; by: number }

export class BattleRenderer {
  private readonly emblems = new Map<Element, HTMLImageElement>()
  private readonly shadow = shadowTexture(SHADOW)
  private readonly enemyActors = new WeakMap<Enemy, Actor>()
  private cones: FloodCone[] | null = null
  private conesRing: Battle['ring'] | null = null
  private crowd: Crowd | null = null
  private readonly vehicles: VehicleArt

  constructor(
    private readonly art: EnemyArt,
    private readonly player: Player,
    private readonly options: RendererOptions,
  ) {
    for (const id of ELEMENT_IDS) {
      const image = new Image()
      image.decoding = 'async'
      image.src = `${options.assetBase}${ELEMENTS[id].icon}`
      this.emblems.set(id, image)
    }
    const vehicle = (name: string) => {
      const image = new Image()
      image.decoding = 'async'
      image.src = `${options.assetBase}assets/battle/${name}.webp`
      return image
    }
    this.vehicles = { tank: vehicle('tank'), car: vehicle('car') }
  }

  tick(battle: Battle, dt: number, particles: Particles) {
    if (battle.mode !== 'ring') return
    if (!this.crowd || this.crowd.ring !== battle.ring) this.crowd = new Crowd(particles, battle.ring)
    this.crowd.update(dt, battle.excitement, battle.outcome === 'victory')
  }

  actors(battle: Battle, out: Actor[], now: number) {
    out.length = 0
    for (const enemy of battle.enemies) out.push(this.enemyActor(enemy))
    const time = now / 1000
    for (const bolt of battle.bolts) {
      out.push({ depth: bolt.y + 1, draw: (context, originX, originY, zoom) => battle.fx.drawBoltCore(context, originX, originY, zoom, bolt, time) })
    }
    for (const meteor of battle.meteors) {
      if (meteor.delay > 0.32) continue
      out.push({ depth: meteor.y + 2, draw: (context, originX, originY, zoom) => battle.fx.drawMeteorFall(context, originX, originY, zoom, meteor, time) })
    }
    battle.gadgets.actors(out, this.vehicles)
    if (battle.mode === 'ring') this.crowd?.actors(out, battle.excitement, now)
  }

  ground(battle: Battle, context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, now: number) {
    const time = now / 1000
    battle.fx.drawGround(context, originX, originY, zoom)
    this.stanceRing(context, originX, originY, zoom, this.player.x, this.player.y, 62 * battle.robotScale / S, ELEMENTS[battle.element].color, 0.5)
    for (const enemy of battle.enemies) {
      if (!enemy.alive || enemy.alpha < 0.3) continue
      this.stanceRing(context, originX, originY, zoom, enemy.x, enemy.y, 58 * enemy.scale, ELEMENTS[enemy.element].color, 0.42 * enemy.alpha)
    }
    for (const meteor of battle.meteors) battle.fx.drawMeteorMark(context, originX, originY, zoom, meteor, time, meteor.owner === 'enemy')
    battle.gadgets.drawGround(context, originX, originY, zoom, time)
    for (const enemy of battle.enemies) {
      if (!enemy.alive) continue
      if (enemy.state === 'cast' && enemy.cast) this.castTelegraph(context, originX, originY, zoom, enemy, time)
      if (enemy.telegraph <= 0 || enemy.state === 'cast') continue
      const x = originX + enemy.x * zoom
      const y = originY + enemy.y * zoom
      const t = enemy.telegraph
      if (enemy.def.behaviour === 'bruiser' && !enemy.ranged) {
        const radius = enemy.def.reach * S * (enemy.form === 'tita' ? 1.25 : 1) * zoom
        context.fillStyle = rgba(RED, 0.1 + 0.16 * t)
        context.beginPath()
        context.ellipse(x, y, radius, radius * 0.6, 0, 0, Math.PI * 2)
        context.fill()
        context.strokeStyle = rgba(RED, 0.45 + 0.4 * Math.abs(Math.sin(time * 14)))
        context.lineWidth = Math.max(1.5, 3 * zoom)
        context.stroke()
        context.fillStyle = rgba(RED, 0.3 + 0.3 * t)
        context.beginPath()
        context.ellipse(x, y, radius * t, radius * 0.6 * t, 0, 0, Math.PI * 2)
        context.fill()
        continue
      }
      const radius = (enemy.ranged ? 44 : 60) * zoom * enemy.scale * S
      context.fillStyle = rgba(ELEMENTS[enemy.element].glow, 0.12 + 0.3 * t * Math.abs(Math.sin(time * 18)))
      context.beginPath()
      context.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2)
      context.fill()
    }
    if (battle.action === 'guard') {
      const x = originX + this.player.x * zoom
      const y = originY + this.player.y * zoom
      const radius = 70 * zoom * battle.robotScale / S
      context.strokeStyle = rgba(TEAL, 0.55 + 0.25 * Math.sin(time * 9))
      context.lineWidth = Math.max(1.5, 3 * zoom)
      context.beginPath()
      context.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2)
      context.stroke()
    }
  }

  private stanceRing(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, wx: number, wy: number, radius: number, color: RGB, alpha: number) {
    const x = originX + wx * zoom
    const y = originY + wy * zoom
    const rx = radius * zoom
    context.strokeStyle = rgba(color, alpha)
    context.lineWidth = Math.max(1, 2.5 * zoom)
    context.beginPath()
    context.ellipse(x, y, rx, rx * 0.42, 0, 0, Math.PI * 2)
    context.stroke()
  }

  private castTelegraph(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, enemy: Enemy, time: number) {
    const cast = enemy.cast
    if (!cast) return
    const t = enemy.telegraph
    const x = originX + enemy.x * zoom
    const y = originY + enemy.y * zoom
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(time * 16))
    const card = CARDS[cast.card]
    if (card.kind === 'transform') {
      const glow = FORM_GLOW[cast.card]
      const radius = (70 + 60 * t) * zoom * enemy.scale
      context.strokeStyle = rgba(glow, 0.5 + 0.4 * pulse)
      context.lineWidth = Math.max(2, 4 * zoom)
      context.beginPath()
      context.ellipse(x, y, radius, radius * 0.45, 0, 0, Math.PI * 2)
      context.stroke()
      return
    }
    context.lineCap = 'round'
    switch (cast.card) {
      case 'rajada': {
        const angle = Math.atan2(cast.y - enemy.y, cast.x - enemy.x)
        context.strokeStyle = rgba(RED, (0.25 + 0.5 * t) * pulse)
        context.lineWidth = Math.max(1.5, 4 * zoom)
        for (let i = -2; i <= 2; i++) {
          const a = angle + i * 0.19
          const length = (260 + 420 * t) * zoom
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(x + Math.cos(a) * length, y + Math.sin(a) * length)
          context.stroke()
        }
        break
      }
      case 'onda': {
        const radius = 300 * zoom
        context.fillStyle = rgba(RED, 0.08 + 0.14 * t)
        context.beginPath()
        context.ellipse(x, y, radius, radius / 1.5, 0, 0, Math.PI * 2)
        context.fill()
        context.strokeStyle = rgba(RED, 0.5 + 0.4 * pulse)
        context.lineWidth = Math.max(1.5, 3 * zoom)
        context.stroke()
        context.fillStyle = rgba(RED, 0.25 + 0.3 * t)
        context.beginPath()
        context.ellipse(x, y, radius * t, (radius / 1.5) * t, 0, 0, Math.PI * 2)
        context.fill()
        break
      }
      case 'investida': {
        const angle = Math.atan2(cast.y - enemy.y, cast.x - enemy.x)
        const length = 1350 * 0.42 * zoom
        const ex = x + Math.cos(angle) * length
        const ey = y + Math.sin(angle) * length
        context.strokeStyle = rgba(RED, (0.2 + 0.4 * t) * pulse)
        context.lineWidth = Math.max(4, 46 * zoom * enemy.scale * S)
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(ex, ey)
        context.stroke()
        context.fillStyle = rgba(RED, 0.5 + 0.4 * t)
        const head = 26 * zoom
        context.beginPath()
        context.moveTo(ex + Math.cos(angle) * head, ey + Math.sin(angle) * head)
        context.lineTo(ex + Math.cos(angle + 2.4) * head, ey + Math.sin(angle + 2.4) * head)
        context.lineTo(ex + Math.cos(angle - 2.4) * head, ey + Math.sin(angle - 2.4) * head)
        context.closePath()
        context.fill()
        break
      }
      case 'chuva': {
        const radius = (60 + 40 * t) * zoom
        context.strokeStyle = rgba(ELEMENTS[enemy.element].glow, 0.4 + 0.5 * pulse)
        context.lineWidth = Math.max(1.5, 3 * zoom)
        context.beginPath()
        context.ellipse(x, y, radius, radius * 0.5, 0, 0, Math.PI * 2)
        context.stroke()
        break
      }
    }
  }

  glow(battle: Battle, context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, now: number) {
    const time = now / 1000
    if (battle.mode === 'ring') this.drawFloodlights(battle, context, originX, originY, zoom, time)
    for (const image of battle.afterimages) this.drawAfterimage(context, originX, originY, zoom, image)
    for (const bolt of battle.bolts) battle.fx.drawBoltGlow(context, originX, originY, zoom, bolt)
    for (const meteor of battle.meteors) battle.fx.drawMeteorGlow(context, originX, originY, zoom, meteor)
    for (const enemy of battle.enemies) {
      if (!enemy.alive || enemy.alpha <= 0.05) continue
      const scale = enemy.scale * S
      const element = ELEMENTS[enemy.element]
      const headY = enemy.y - enemy.z - enemy.lift * S - 34 * ROBOT_PIXEL * scale
      const flicker = 0.3 + 0.1 * Math.sin(time * 11 + enemy.id)
      this.halo(context, originX, originY, zoom, enemy.x, headY, 34 * scale, enemy.def.glow, flicker * enemy.alpha)
      if (enemy.telegraph > 0) {
        this.halo(context, originX, originY, zoom, enemy.x, enemy.y - enemy.lift * S - 60 * scale, 90 * scale, element.glow, 0.25 + 0.6 * enemy.telegraph)
      }
      if (enemy.state === 'cast' && enemy.cast && CARDS[enemy.cast.card].kind === 'transform') {
        this.drawPillar(context, originX, originY, zoom, enemy.x, enemy.y, FORM_GLOW[enemy.cast.card], enemy.telegraph, scale)
      }
      if (enemy.form) {
        const pulse = 0.45 + 0.2 * Math.sin(time * 6 + enemy.id)
        this.halo(context, originX, originY, zoom, enemy.x, enemy.y - 60 * scale, 150 * scale, FORM_GLOW[enemy.form], pulse * enemy.alpha)
      }
      if (enemy.def.behaviour === 'phaser') {
        const pulse = 0.45 + 0.2 * Math.sin(time * 3 + enemy.id)
        this.halo(context, originX, originY, zoom, enemy.x, enemy.y - enemy.lift * S - 70 * S, 150 * S, element.color, pulse * enemy.alpha)
      }
      this.statusOverlay(context, originX, originY, zoom, enemy.status.list(), time, (color, alpha) => {
        const sheets = this.art.sheets(specLook(enemy.spec))
        this.drawSilhouette(context, originX, originY, zoom, enemy.moving ? sheets.walk : sheets.idle, enemy.facing, enemy.moving ? enemy.frame : 0, enemy.x, enemy.y - enemy.z - enemy.lift * S, scale, color, alpha * enemy.alpha)
      })
      if (enemy.flash > 0) this.halo(context, originX, originY, zoom, enemy.x, enemy.y - enemy.lift * S - 60 * scale, 110 * scale, [255, 244, 220], enemy.flash * 0.6)
    }
    for (const slash of battle.slashes) this.drawSlash(context, originX, originY, zoom, slash)
    battle.fx.drawGlow(context, originX, originY, zoom, time)
    battle.gadgets.drawGlow(context, originX, originY, zoom, time)
    const robotScale = battle.robotScale
    if (battle.form) {
      const glow = battle.form === 'prisma' ? ELEMENTS[ELEMENT_IDS[Math.floor(time * 6) % ELEMENT_IDS.length]].glow : FORM_GLOW[battle.form]
      const pulse = 0.45 + 0.15 * Math.sin(time * 7)
      this.halo(context, originX, originY, zoom, this.player.x, this.player.y - 70 * robotScale, 190 * robotScale, glow, pulse)
      this.halo(context, originX, originY, zoom, this.player.x, this.player.y - 4, 120 * robotScale, glow, pulse * 0.6)
    }
    if (!battle.gadgets.vehicle) this.statusOverlay(context, originX, originY, zoom, battle.status.list(), time, (color, alpha) => {
      const sheets = this.options.robot()
      const player = this.player
      this.drawSilhouette(context, originX, originY, zoom, player.moving ? sheets.walk : sheets.idle, player.facing, player.moving ? player.frame : 0, player.x, player.y, robotScale, color, alpha)
    })
    if (battle.action === 'guard') {
      const strength = 0.3 + 0.1 * Math.sin(time * 9)
      this.halo(context, originX, originY, zoom, this.player.x, this.player.y - 60 * robotScale, 120 * robotScale, TEAL, strength)
    }
    if (battle.action === 'dodge') this.halo(context, originX, originY, zoom, this.player.x, this.player.y - 60 * robotScale, 110 * robotScale, TEAL, 0.35)
    if (battle.mode === 'ring') this.crowd?.drawGlow(context, originX, originY, zoom)
  }

  top(battle: Battle, context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number) {
    for (const enemy of battle.enemies) {
      if (!enemy.alive || enemy.state === 'spawn' || enemy.alpha < 0.3) continue
      this.drawPlate(context, originX, originY, zoom, enemy, battle.gadgets.tags(enemy))
    }
    for (const popup of battle.popups) this.drawPopup(context, originX, originY, zoom, popup)
  }

  private enemyActor(enemy: Enemy): Actor {
    let actor = this.enemyActors.get(enemy)
    if (!actor) {
      actor = {
        get depth() {
          return enemy.y
        },
        draw: (context, originX, originY, zoom) => this.drawEnemy(context, originX, originY, zoom, enemy),
      }
      this.enemyActors.set(enemy, actor)
    }
    return actor
  }

  private drawEnemy(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, enemy: Enemy) {
    const sheets = this.art.sheets(specLook(enemy.spec))
    const scale = zoom * ROBOT_PIXEL * enemy.scale * S
    const groundX = originX + enemy.x * zoom
    const groundY = originY + enemy.y * zoom
    const height = enemy.z + enemy.lift * S
    const feetY = groundY - height * zoom
    const dying = !enemy.alive
    const alpha = enemy.alpha * enemy.formAlpha

    if (alpha <= 0.01) return
    const spread = Math.max(0.3, 1 - height / 900)
    context.globalAlpha = 0.9 * enemy.alpha * spread
    context.imageSmoothingEnabled = true
    drawShadow(context, this.shadow, groundX, groundY - scale * 0.5, scale * 12 * spread, scale * 4 * spread)

    const sx = (enemy.moving ? enemy.frame : 0) * FRAME.width
    const sy = ROW[enemy.facing] * FRAME.height
    const sheet = enemy.moving ? sheets.walk : sheets.idle
    const flash = enemy.moving ? sheets.walkGlow : sheets.idleGlow
    const wobble = enemy.state === 'stagger' ? Math.sin(performance.now() / 28) * 2 * zoom : 0
    const left = groundX - ANCHOR.x * scale + wobble
    const drawWidth = FRAME.width * scale
    const drawHeight = FRAME.height * scale
    let top = feetY - ANCHOR.y * scale
    let clip = false
    if (dying) {
      const sink = (1 - Math.max(0, enemy.timer / 0.6)) * drawHeight * 0.5
      top += sink
      clip = true
      context.save()
      context.beginPath()
      context.rect(left - scale, top - scale - sink, drawWidth + scale * 2, feetY - (top - scale - sink))
      context.clip()
    }
    context.globalAlpha = alpha
    drawCell(context, sheet, sx, sy, FRAME.width, FRAME.height, left, top, drawWidth, drawHeight)
    const overlay = dying ? Math.max(enemy.flash, 0.6) : enemy.flash
    if (overlay > 0) {
      context.globalAlpha = alpha * Math.min(1, overlay)
      drawCell(context, flash, sx, sy, FRAME.width, FRAME.height, left, top, drawWidth, drawHeight)
    }
    if (clip) context.restore()
    context.globalAlpha = 1
  }

  private drawPlate(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, enemy: Enemy, extra: readonly GadgetTag[]) {
    const scale = enemy.scale * S
    const width = Math.round((enemy.isBoss ? 168 : 124) * zoom * Math.max(0.95, scale + 0.2))
    const barHeight = Math.max(3, Math.round((enemy.isBoss ? 9 : 7) * zoom))
    const centerX = Math.round(originX + enemy.x * zoom)
    const barY = Math.round(originY + (enemy.y - enemy.z - enemy.lift * S - (ANCHOR.y + 6) * ROBOT_PIXEL * scale) * zoom)
    const left = centerX - Math.round(width / 2)
    const fraction = enemy.health / enemy.maxHealth
    const color = fraction > 0.5 ? TEAL : fraction > 0.25 ? GOLD : RED
    const element = ELEMENTS[enemy.element]
    const fontSize = Math.max(9, Math.round(19 * zoom))
    const emblem = Math.max(12, Math.round(30 * zoom))
    context.globalAlpha = enemy.alpha
    context.fillStyle = INK
    context.fillRect(left - 1, barY - 1, width + 2, barHeight + 2)
    context.fillStyle = rgba(color, 1)
    context.fillRect(left, barY, Math.round(width * fraction), barHeight)
    context.fillStyle = 'rgba(255,255,255,0.28)'
    context.fillRect(left, barY, Math.round(width * fraction), Math.max(1, Math.round(barHeight / 3)))
    if (enemy.flash > 0) {
      context.fillStyle = rgba([255, 255, 255], enemy.flash * 0.7)
      context.fillRect(left, barY, Math.round(width * fraction), barHeight)
    }
    const textY = barY - Math.round(3 * zoom)
    const level = enemy.isBoss ? `Campeão Nv.${enemy.level}` : `Nv.${enemy.level}`
    const textLeft = left + emblem * 0.7
    const title = textLabel(
      [
        { text: `${level} `, font: `700 ${fontSize}px ${FONT}`, fill: rgba(GOLD, 1) },
        { text: enemy.def.name, font: `600 ${fontSize}px ${FONT}`, fill: rgba(element.glow, 1) },
      ],
      INK,
      Math.max(2, fontSize / 4.5),
      fontSize * 1.4,
    )
    drawLabel(context, title, textLeft, textY)
    const icon = this.emblems.get(enemy.element)
    const iconX = left - emblem * 0.45
    const iconY = barY + barHeight / 2 - emblem * 0.75
    if (icon && icon.complete && icon.naturalWidth > 0) {
      context.drawImage(icon, iconX, iconY, emblem, emblem)
    } else {
      context.fillStyle = rgba(element.color, 1)
      context.beginPath()
      context.arc(iconX + emblem / 2, iconY + emblem / 2, emblem / 2, 0, Math.PI * 2)
      context.fill()
    }
    const tags: { text: string; color: RGB }[] = []
    if (enemy.form) tags.push({ text: CARDS[enemy.form].short.toUpperCase(), color: FORM_GLOW[enemy.form] })
    for (const ailment of enemy.status.list()) tags.push({ text: AILMENT_TAG[ailment], color: ELEMENTS[AILMENT_ELEMENT[ailment]].color })
    for (const tag of extra) tags.push(tag)
    if (tags.length) {
      const tagSize = Math.max(8, Math.round(14 * zoom))
      const font = `800 ${tagSize}px ${FONT}`
      let x = left
      const top = barY + barHeight + Math.round(3 * zoom)
      for (const tag of tags) {
        const badge = badgeLabel(tag.text, font, tagSize, rgba(tag.color, 0.92), '#0b0d10')
        context.drawImage(badge.canvas, Math.round(x), top)
        x += badge.advance + Math.round(3 * zoom)
      }
    }
    context.globalAlpha = 1
  }

  private drawAfterimage(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, image: Afterimage) {
    const t = image.age / image.life
    const alpha = (1 - t) * 0.55
    if (alpha <= 0.02) return
    const sheets = image.enemy ? this.art.sheets(specLook(image.enemy.spec)) : this.options.robot()
    const sheet = image.moving ? sheets.walk : sheets.idle
    const lift = image.enemy ? image.enemy.lift * S : 0
    this.drawSilhouette(context, originX, originY, zoom, sheet, image.facing, image.moving ? image.frame : 0, image.x, image.y - lift, image.scale, image.color, alpha)
  }

  private drawSilhouette(
    context: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    zoom: number,
    sheet: HTMLCanvasElement,
    facing: Afterimage['facing'],
    frame: number,
    x: number,
    y: number,
    robotScale: number,
    color: RGB,
    alpha: number,
  ) {
    const scale = zoom * ROBOT_PIXEL * robotScale
    const sx = frame * FRAME.width
    const sy = ROW[facing] * FRAME.height
    const left = originX + x * zoom - ANCHOR.x * scale
    const top = originY + y * zoom - ANCHOR.y * scale
    context.globalAlpha = Math.min(1, alpha)
    drawCell(context, tinted(sheet, color), sx, sy, FRAME.width, FRAME.height, left, top, FRAME.width * scale, FRAME.height * scale)
    context.globalAlpha = 1
  }

  private statusOverlay(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, ailments: Ailment[], time: number, draw: (color: RGB, alpha: number) => void) {
    for (const ailment of ailments) {
      if (ailment === 'congelado') draw([150, 215, 255], 0.38)
      else if (ailment === 'choque') draw([255, 240, 120], Math.sin(time * 60) > 0 ? 0.55 : 0.1)
      else if (ailment === 'queimadura') draw([255, 120, 40], 0.12 + 0.12 * Math.abs(Math.sin(time * 14)))
      else if (ailment === 'drenado') draw([150, 80, 230], 0.16 + 0.1 * Math.sin(time * 5))
      else if (ailment === 'ofuscado') draw([255, 250, 220], 0.14 + 0.14 * Math.abs(Math.sin(time * 9)))
    }
  }

  private drawPillar(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, x: number, y: number, color: RGB, strength: number, scale: number) {
    const sprite = glowTexture(color, 64)
    const width = 120 * scale * zoom * (0.6 + strength * 0.6)
    const height = 520 * zoom * (0.4 + strength * 0.8)
    context.globalAlpha = 0.35 + strength * 0.5
    context.drawImage(sprite, originX + x * zoom - width / 2, originY + y * zoom - height, width, height)
    context.globalAlpha = 1
  }

  private floodCones(context: CanvasRenderingContext2D, ring: Battle['ring']): FloodCone[] {
    if (this.cones && this.conesRing === ring) return this.cones
    const [cx, cy] = ring.center
    this.cones = ring.lamps.map(([lx, ly]) => {
      const fromY = ly - 90
      const angle = Math.atan2(cy - fromY, cx - lx)
      const length = Math.hypot(cx - lx, cy - fromY) * 1.08
      const spread = 300
      const endX = Math.cos(angle) * length
      const endY = Math.sin(angle) * length
      const gradient = context.createLinearGradient(0, 0, endX, endY)
      gradient.addColorStop(0, rgba(FLOODLIGHT, 0.2))
      gradient.addColorStop(0.7, rgba(FLOODLIGHT, 0.07))
      gradient.addColorStop(1, rgba(FLOODLIGHT, 0))
      return {
        x: lx,
        y: fromY,
        gradient,
        ax: endX + Math.cos(angle + Math.PI / 2) * spread,
        ay: endY + Math.sin(angle + Math.PI / 2) * spread * 0.6,
        bx: endX + Math.cos(angle - Math.PI / 2) * spread,
        by: endY + Math.sin(angle - Math.PI / 2) * spread * 0.6,
      }
    })
    this.conesRing = ring
    return this.cones
  }

  private drawFloodlights(battle: Battle, context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, time: number) {
    const dusk = battle.dusk
    if (dusk <= 0.02) return
    const ring = battle.ring
    const cones = this.floodCones(context, ring)
    for (let index = 0; index < cones.length; index++) {
      const cone = cones[index]
      const flicker = 0.92 + 0.08 * Math.sin(time * 2.3 + index * 1.7)
      context.setTransform(zoom, 0, 0, zoom, originX + cone.x * zoom, originY + cone.y * zoom)
      context.globalAlpha = dusk * flicker
      context.fillStyle = cone.gradient
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(cone.ax, cone.ay)
      context.lineTo(cone.bx, cone.by)
      context.closePath()
      context.fill()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.globalAlpha = 1
      this.halo(context, originX, originY, zoom, cone.x, cone.y, 90, FLOODLIGHT, 0.6 * dusk * flicker)
    }
    const south = ring.ring.y + ring.ring.h
    const foe = battle.standing[0]?.element ?? battle.lineup.rounds[battle.round]?.[0]?.element ?? 'fogo'
    for (const [x, y] of ring.posts) {
      const element = y >= south - 1 ? battle.element : foe
      const pulse = 0.55 + 0.25 * Math.sin(time * 4 + x)
      this.halo(context, originX, originY, zoom, x, y - 26, 70, ELEMENTS[element].glow, pulse * dusk)
    }
  }

  private drawSlash(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, slash: Slash) {
    const t = slash.age / slash.life
    const alpha = (1 - t) * 0.95
    if (alpha <= 0.01) return
    const x = originX + slash.x * zoom
    const y = originY + slash.y * zoom
    const radius = slash.radius * zoom * (0.6 + 0.5 * t)
    const sweep = 0.95
    const start = slash.angle - sweep + t * 0.4
    const end = slash.angle + sweep - (1 - t) * 0.9
    context.save()
    context.translate(x, y)
    context.scale(1, 0.7)
    context.lineCap = 'round'
    context.strokeStyle = rgba(slash.color, alpha * 0.8)
    context.lineWidth = Math.max(3, 22 * zoom * (1 - t * 0.6))
    context.beginPath()
    context.arc(0, 0, radius, start, end)
    context.stroke()
    context.strokeStyle = rgba(slash.glow, alpha)
    context.lineWidth = Math.max(2, 10 * zoom * (1 - t * 0.5))
    context.beginPath()
    context.arc(0, 0, radius, start, end)
    context.stroke()
    context.strokeStyle = rgba([255, 255, 255], alpha * 0.85)
    context.lineWidth = Math.max(1, 4 * zoom * (1 - t))
    context.beginPath()
    context.arc(0, 0, radius, start + 0.2, end)
    context.stroke()
    context.restore()
  }

  private halo(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, x: number, y: number, radius: number, color: RGB, alpha: number) {
    if (alpha <= 0.01) return
    const sprite = glowTexture(color, 64)
    const size = radius * 2 * zoom
    context.globalAlpha = Math.min(1, alpha)
    context.drawImage(sprite, originX + x * zoom - size / 2, originY + y * zoom - size / 2, size, size)
    context.globalAlpha = 1
  }

  private drawPopup(context: CanvasRenderingContext2D, originX: number, originY: number, zoom: number, popup: Popup) {
    const t = popup.age / popup.life
    const alpha = 1 - t * t
    if (alpha <= 0.02) return
    const x = originX + popup.x * zoom
    const y = originY + (popup.y - popup.z) * zoom
    const size = Math.max(10, Math.round(popup.size * 30 * zoom * (t < 0.12 ? 0.8 + (t / 0.12) * 0.3 : 1.1 - (t - 0.12) * 0.12)))

    const peak = Math.max(10, Math.round(popup.size * 30 * zoom * 1.1))
    const label = centeredLabel(popup.text, `800 ${peak}px ${FONT}`, rgba(popup.color, 1), INK, Math.max(2, peak / 4.5), peak * 1.4)
    const factor = size / peak
    const width = label.canvas.width * factor
    const height = label.canvas.height * factor
    context.globalAlpha = alpha
    context.imageSmoothingEnabled = true
    context.drawImage(label.canvas, x - width / 2, y - height / 2, width, height)
    context.globalAlpha = 1
  }
}
