import type { Site } from '../../world-data'
import type { Sound } from '../audio'
import { actionFor, GEAR_ACTIONS, HAND_ACTIONS, MOUNT_ACTIONS, panelKey } from '../bindings'
import { playZoom, type Inset, type View } from '../camera'
import type { RGB } from '../fx/textures'
import { NO_PAD_BUTTONS, readGamepadButtons, type Movement, type PadButtons } from '../input'
import { missionForSite, type Mission } from '../missions/data'
import { worldData } from '../missions/ladder'
import type { UpgradeId } from '../garage/catalog'
import { applyReward, formatAmount, loadoutOf, victoryReward, type GarageReward } from '../garage/state'
import { completeMission, currentLevel, failMission, nextMainMission, pendingSecret, sideClears, sideUnlocked, type Reward } from '../missions/progress'
import type { Player } from '../player'
import { applyWear, conditionTier } from '../robot/condition'
import { partIcon } from '../robot/icon-canvas'
import { drawOffer, saveProgress, type Progress } from '../robot/progress'
import type { RobotComposer, RobotSheets } from '../robot/sprites'
import type { Scene } from '../scene'
import { settings } from '../settings'
import type { Direction } from '../sprite'
import { Battle, type AimPoint, type BattleAlarm, type BattleEvents, type BattleInput, type BattleMode } from './battle'
import { createCards, robotPortrait } from './cards'
import { CARDS, type CardId } from './deck'
import { planLineup, type Lineup } from './lineup'
import { BattleRenderer } from './render'
import type { RingDef } from './ring'
import { EnemyArt } from './sprites'
import { createFuryOverlay } from './fury'
import type { QteDir } from './gadgets'
import { createTablet } from './tablet'

export type CombatHost = {
  transition(change: () => void): Promise<void>
  place(x: number, y: number, facing: Direction): void
  deploy(mode: BattleMode): void
  recall(): void
  describe(text: string): void
  robot(): RobotSheets

  backdrop?: () => HTMLElement

  wear?: () => void

  payout(amount: number, x: number, y: number, mission: Mission): void

  afterRing?: (won: boolean, mission: Mission) => void
  afterOpen?: (won: boolean, mission: Mission) => void
}

export type GuardFight = {
  mission: Mission
  lineup: Lineup
  spawns: readonly (readonly [number, number])[]
  alarm: BattleAlarm
  at: { x: number; y: number }
}

export type CombatOptions = {
  assetBase: string
  touch: boolean
  player: Player
  scene: Scene
  composer: RobotComposer
  progress: Progress
  sound: Sound
  host: CombatHost
}

export type SiteStatus = 'open' | 'locked' | 'none'

export type MouseInput = { aim: AimPoint | null; attack: boolean; shoot: boolean }

export const NO_MOUSE: MouseInput = { aim: null, attack: false, shoot: false }

export type Combat = {
  readonly active: boolean
  readonly blocksMovement: boolean
  readonly cardOpen: boolean
  readonly timeScale: number

  offerTrail(ring: RingDef | null): void
  offerSite(site: Site): boolean
  offerGuard(fight: GuardFight): boolean
  abort(): void
  siteStatus(site: Site): SiteStatus
  cameraTarget(): { x: number; y: number } | null
  cameraInset(): Inset

  cameraZoom(view: View, inset: Inset): number
  update(dt: number, movement: Movement, view: View, mouse: MouseInput): void
  confirm(): void
  handleKey(event: KeyboardEvent): boolean
  handleKeyUp(event: KeyboardEvent): void
  setIdle(idle: boolean): void
  destroy(): void
}

const ZERO: Movement = { x: 0, y: 0, magnitude: 0 }
const NONE: BattleInput = { attack: false, shoot: false, dodge: false, guard: false, card: null, aim: null }
const SHAKE_DECAY = 2.4
const SHAKE_PIXELS = 16

const RING_FILL = { width: 0.86, height: 0.78 }
const RING_ZOOM_SCALE_MAX = 6
const RING_ZOOM_MAX = 2.2
const QTE_KEYS: Record<string, QteDir> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }

export function createCombat(surface: HTMLElement, options: CombatOptions): Combat {
  const { player, scene, progress, sound, host } = options
  const art = new EnemyArt(options.composer)
  const renderer = new BattleRenderer(art, player, { assetBase: options.assetBase, robot: () => host.robot() })
  const cards = createCards(surface, {
    assetBase: options.assetBase,
    touch: options.touch,
    art,
    partIcon: (id, label, size) => partIcon(options.composer, id, label, 'shop-cell', size),
    backdrop: host.backdrop,
    cue: (name) => sound.cue(name),
  })
  const tablet = createTablet(surface, {
    assetBase: options.assetBase,
    touch: options.touch,
    progress,
    onAction: (action, pressed) => {
      if (action === 'guard') guard.tablet = pressed
      else if (pressed) presses[action] = true
    },
    onCard: (card) => {
      presses.card = card
    },
    onClose: () => closeMissions(),
    onOpen: () => openMissions(),
    onTrail: () => {
      if (battle || cards.open || transitioning) return
      openTrail(null)
    },
    onGadget: (id) => {
      presses.gadget = id
    },
    onFury: () => {
      presses.fury = true
    },
  })
  const fury = createFuryOverlay(surface, {
    touch: options.touch,
    onPress: (dir) => {
      presses.qte = dir
    },
  })

  let battle: Battle | null = null
  let mission: Mission | null = null
  let lineup: Lineup | null = null
  let mode: BattleMode = 'open'
  let site: Site | null = null
  let transitioning = false
  let resultShown = false
  let idle = false
  let shake = 0
  let pendingPayout = 0
  let hand: readonly CardId[] = progress.hand
  let sentry: GuardFight | null = null
  let savedAmbient: RGB = scene.ambient
  const presses: { attack: boolean; shoot: boolean; dodge: boolean; card: CardId | null; gadget: UpgradeId | null; fury: boolean; qte: QteDir | null } = {
    attack: false,
    shoot: false,
    dodge: false,
    card: null,
    gadget: null,
    fury: false,
    qte: null,
  }
  const guard = { key: false, tablet: false }
  let padWas: PadButtons = NO_PAD_BUTTONS

  const events: BattleEvents = {
    cue: (name, duration) => sound.cue(name, duration),
    banner: (kind, text, sub) => {
      cards.banner(kind, text, sub)
      host.describe(sub ? `${text}: ${sub}.` : `${text}.`)
    },
    phase: (phase) => {
      if (phase === 'versus' && battle) cards.versus(battle.mission, battle.lineup.rounds[0] ?? [], robotPortrait(host.robot().idle), progress.core, battle.lineup)
    },
    hud: () => tablet.refresh(),
    reward: (credits) => {
      progress.credits += credits
      progress.missions.kills += 1
      saveProgress(progress)
      tablet.gain(credits)
    },
    shake: (amount) => {
      shake = Math.max(shake, amount)
    },
    cutin: (info) => {
      cards.cutin(info)
      if (info.phase === 'play') host.describe(`${info.actor} usou ${CARDS[info.card].name}.`)
    },
  }

  function start(next: Mission, nextMode: BattleMode, nextSite: Site | null, nextLineup: Lineup, ring: RingDef | null, nextHand: readonly CardId[], fight: GuardFight | null = null) {
    mission = next
    lineup = nextLineup
    mode = nextMode
    site = nextSite
    hand = [...nextHand]
    sentry = fight
    resultShown = false
    shake = 0
    padWas = readGamepadButtons()
    presses.attack = presses.shoot = presses.dodge = presses.fury = false
    presses.card = null
    presses.gadget = null
    presses.qte = null
    host.deploy(nextMode)
    battle = new Battle({
      mission: next,
      mode: nextMode,
      site: nextSite,
      player,
      scene,
      loadout: progress.equipped,
      upgrades: progress.upgrades,
      condition: progress.condition,
      unlockedCards: progress.cards,
      bond: progress.bond,
      core: progress.core,
      lineup: nextLineup,
      events,
      ring: ring ?? undefined,
      startEnergy: 0,
      hand,
      spawns: fight?.spawns,
      alarm: fight?.alarm,
      gadgets: loadoutOf(progress.garage),
    })
    const current = battle
    scene.hooks = {
      ground: (context, originX, originY, zoom, now) => renderer.ground(current, context, originX, originY, zoom, now),
      glow: (context, originX, originY, zoom, now) => renderer.glow(current, context, originX, originY, zoom, now),
      top: (context, originX, originY, zoom) => renderer.top(current, context, originX, originY, zoom),
    }
    tablet.setToggleVisible(false)
    tablet.showBattle(current)
    host.describe(
      nextMode === 'ring'
        ? `${next.title}: o robô entra no ringue da ${current.ring.name}. A energia começa em zero e sobe a cada golpe.`
        : fight
          ? `${next.title}: ${fight.alarm.sub}. O tablet de combate abriu.`
          : `${next.title}: robôs em fuga saem de ${nextSite?.name ?? 'uma fábrica'}. O tablet de combate abriu.`,
    )
  }

  function teardown() {
    if (battle) host.recall()
    battle?.dispose()
    battle = null
    mission = null
    site = null
    sentry = null
    scene.actors.length = 0
    scene.hooks = {}
    scene.lights.length = 0
    scene.ambient = savedAmbient
    scene.shakeX = 0
    scene.shakeY = 0
    scene.playerScale = 1
    scene.playerAlpha = 1
    scene.flash = 0
    fury.sync(null)
    shake = 0
    guard.key = false
    guard.tablet = false
  }

  async function beginRing(next: Mission, nextLineup: Lineup, ring: RingDef, nextHand: readonly CardId[]) {
    if (transitioning) return
    cards.hide()
    transitioning = true
    sound.cue('select')
    savedAmbient = scene.ambient
    await host.transition(() => {
      host.place(ring.playerStart[0], ring.playerStart[1], 'n')
      start(next, 'ring', null, nextLineup, ring, nextHand)
    })
    transitioning = false
  }

  function beginOpen(next: Mission, at: Site, nextLineup: Lineup) {
    if (transitioning) return
    cards.hide()
    sound.cue('select')
    savedAmbient = scene.ambient
    start(next, 'open', at, nextLineup, null, progress.hand)
  }

  function draft(next: Mission, onPick: (picked: CardId[]) => void, back: () => void, backLabel?: string) {
    tablet.hide()
    tablet.setToggleVisible(false)
    sound.cue('card')
    cards.draft(next, drawOffer(progress), { confirm: onPick, back, backLabel })
    host.describe(`${next.title}. Antes do sino, escolha três das cinco cartas que saíram do seu baralho.`)
  }

  function decline() {
    cards.hide()
    sound.cue('select')
    tablet.setToggleVisible(idle)
  }

  function brief(next: Mission, at: Site | null, nextLineup: Lineup, accept: () => void, back?: () => void) {
    tablet.hide()
    tablet.setToggleVisible(false)
    sound.cue('select')
    const handlers = back ? { accept, decline: back, declineLabel: 'Voltar à trilha' } : { accept, decline }
    cards.briefing(next, at, nextLineup, progress.core, handlers, pendingSecret(progress, next), next.boss ? null : progress.hand)
  }

  function openTrail(ring: RingDef | null) {
    tablet.hide()
    tablet.setToggleVisible(false)
    sound.cue('select')
    const next = nextMainMission(progress)
    const level = currentLevel(progress)
    cards.trail(progress, robotPortrait(host.robot().idle), {
      locked: ring ? undefined : 'Lute num ringue da Liga',
      challenge: () => {
        if (!ring) {
          sound.cue('deny')
          host.describe('Para lutar, entre na Liga de Robôs e vá até um ringue vazio.')
          return
        }
        const drawn = planLineup(next, progress, progress.core.element)
        const enter = () => {
          if (!next.boss) {
            void beginRing(next, drawn, ring, progress.hand)
            return
          }
          draft(next, (picked) => void beginRing(next, drawn, ring, picked), () => brief(next, null, drawn, enter, () => openTrail(ring)))
        }
        brief(next, null, drawn, enter, () => openTrail(ring))
        host.describe(`${next.title}. ${next.tagline} Entrar no ringue, examinar o adversário ou voltar à trilha.`)
      },
      close: decline,
    })
    host.describe(
      `Trilha dos Campeões aberta. ${worldData(level).kicker}, ${worldData(level).name}. Próxima luta: ${next.boss ? 'o campeão' : `nível ${level}`}, ${next.title}.${
        ring ? '' : ' As lutas acontecem nos ringues da Liga de Robôs.'
      } Setas trocam de mundo.`,
    )
  }

  function showResult() {
    if (!battle || !mission) return
    resultShown = true
    const won = battle.outcome === 'victory'
    let reward: Reward | null = null
    let garage: GarageReward | null = null
    if (won) {
      const firstSide = mission.kind === 'side' && sideClears(progress, mission) === 0
      const cleared = progress.missions.main
      reward = completeMission(progress, mission, battle.bounties, true)
      garage = victoryReward(
        progress.garage,
        mission,
        { kills: battle.kills, bestCombo: battle.stats.bestCombo, parries: battle.stats.parries, supers: battle.stats.supers, damageTaken: battle.wear.damageTaken },
        cleared,
        firstSide,
      )
      applyReward(progress.garage, garage)
    } else failMission(progress)
    pendingPayout = reward?.pending ?? 0
    const wear = applyWear(progress.condition, progress.equipped, {
      ...battle.wear,
      maxHealth: battle.maxHealth,
      won,
      boss: Boolean(mission.boss),
    })
    saveProgress(progress)
    host.wear?.()
    tablet.hide()
    cards.result(
      { outcome: won ? 'victory' : 'defeat', mission, reward, bounties: battle.bounties, kills: battle.kills, seconds: battle.elapsed, stats: battle.stats, wear, garage },
      { continue: () => void finish(), retry: won ? undefined : () => retry() },
    )
    const damaged = wear.filter((entry) => conditionTier(entry.after) !== 'boa')
    host.describe(
      `${
        won
          ? `Vitória. ${reward ? `${reward.total} créditos no total${reward.pending ? `, ${reward.pending} deles em fichas para recolher do chão` : ''}.` : ''}${garage ? ` A Mecânica dos Irmãos pagou ${formatAmount(garage.coins)} moedas de ferro${garage.fragments ? ` e ${garage.fragments} ${garage.fragments === 1 ? 'fragmento' : 'fragmentos'}` : ''}.` : ''}`
          : `Derrota. A sucata recolhida, ${battle.bounties} créditos, continua sua.`
      }${damaged.length ? ` ${damaged.length === 1 ? 'Uma peça precisa' : `${damaged.length} peças precisam`} de reparo na Cápsula, em casa.` : ''}`,
    )
  }

  async function finish() {
    if (transitioning || !battle) return
    const wasRing = mode === 'ring'
    const ring = battle.ring
    const ended = mission
    const won = battle.outcome === 'victory'
    const payout = pendingPayout
    const fight = sentry
    pendingPayout = 0
    cards.hide()
    tablet.hide()
    if (wasRing) {
      transitioning = true
      sound.cue('door')
      await host.transition(() => {
        teardown()
        host.place(ring.exit[0], ring.exit[1], 's')
      })
      transitioning = false
      host.describe(`Fora do ringue da ${ring.name}.${payout ? ' As fichas do prêmio rolam pelo chão: ande sobre elas para recolher.' : ''}`)
      if (payout && ended) host.payout(payout, ring.exit[0], ring.exit[1], ended)
      if (ended) host.afterRing?.(won, ended)
    } else {
      teardown()
      host.describe(fight ? (won ? 'Os guardas caíram. O Coração está exposto.' : 'Os guardas continuam de pé em volta do Coração.') : `A rua ficou em silêncio de novo.${payout ? ' O prêmio da missão ficou espalhado pelo chão em fichas.' : ''}`)
      if (payout && ended) host.payout(payout, player.x, player.y, ended)
      if (ended) host.afterOpen?.(won, ended)
    }
    tablet.setToggleVisible(idle)
  }

  function retry() {
    if (transitioning || !battle || !mission || !lineup) return
    if (mission.boss) {
      draft(mission, (picked) => void restart(picked), () => void finish(), 'Recuar')
      return
    }
    void restart(hand)
  }

  async function restart(nextHand: readonly CardId[]) {
    if (transitioning || !battle || !mission || !lineup) return
    const again = mission
    const sameLineup = lineup
    const at = site
    const fight = sentry
    const wasRing = mode === 'ring'
    const ring = battle.ring
    pendingPayout = 0
    cards.hide()
    tablet.hide()
    transitioning = true
    sound.cue('select')
    await host.transition(() => {
      teardown()
      if (wasRing) host.place(ring.playerStart[0], ring.playerStart[1], 'n')
      else if (fight) host.place(fight.at.x, fight.at.y, 'n')
      else if (at) host.place(at.door[0], at.door[1] + 110, 'n')
      start(again, wasRing ? 'ring' : 'open', at, sameLineup, wasRing ? ring : null, nextHand, fight)
    })
    transitioning = false
  }

  function openMissions() {
    if (battle || cards.open || transitioning || !idle) return
    sound.cue('select')
    tablet.showMissions()
    host.describe('App de missões aberto no tablet.')
  }

  function closeMissions() {
    if (tablet.mode !== 'missions') return
    sound.cue('select')
    tablet.hide()
    tablet.setToggleVisible(idle)
  }

  function padCard(current: Battle): CardId | null {
    if (!current.form) {
      const form = current.hand.find((id) => CARDS[id].kind === 'transform' && current.cardState(id).ready)
      if (form) return form
    }
    return current.hand.find((id) => CARDS[id].kind === 'special' && current.cardState(id).ready) ?? current.hand[0] ?? null
  }

  function padGadget(current: Battle, pad: PadButtons): UpgradeId | null {
    if (pad.gear >= 0 && pad.gear !== padWas.gear) return current.gadgets.loadout.chips[pad.gear]?.id ?? null
    if (pad.mount >= 0 && pad.mount !== padWas.mount) return current.gadgets.loadout.mounts[pad.mount]?.id ?? null
    return null
  }

  function padQte(current: Battle, pad: PadButtons): QteDir | null {
    if (!current.gadgets.qteView || !pad.direction || pad.direction === padWas.direction) return null
    return pad.direction
  }

  function update(dt: number, movement: Movement, view: View, mouse: MouseInput) {
    if (!battle) return
    const pad = readGamepadButtons()
    const free = !pad.modifier
    const input: BattleInput = {
      attack: presses.attack || mouse.attack || (free && pad.attack && !padWas.attack),
      shoot: presses.shoot || mouse.shoot || (free && pad.shoot && !padWas.shoot),
      dodge: presses.dodge || (free && pad.dodge && !padWas.dodge),
      guard: guard.key || guard.tablet || pad.guard,
      card: presses.card ?? (free && pad.card && !padWas.card ? padCard(battle) : null),
      aim: mouse.aim,
      gadget: presses.gadget ?? padGadget(battle, pad),
      fury: presses.fury || (pad.fury && !padWas.fury),
      qte: presses.qte ?? padQte(battle, pad),
    }
    padWas = pad
    presses.attack = presses.shoot = presses.dodge = presses.fury = false
    presses.card = null
    presses.gadget = null
    presses.qte = null
    const blocked = transitioning || cards.open
    battle.update(dt, blocked ? ZERO : movement, blocked ? NONE : input)
    const now = performance.now()
    renderer.tick(battle, dt, scene.particles)
    renderer.actors(battle, scene.actors, now)
    tablet.tick()
    fury.sync(battle.gadgets.qteView)
    if (battle.mode === 'ring') scene.ambient = battle.ambient()
    shake = Math.max(0, shake - dt * SHAKE_DECAY)
    const amplitude = shake * shake * SHAKE_PIXELS * (view.scale / 4) * (settings.value.shake / 100)
    scene.shakeX = amplitude > 0.5 ? (Math.random() - 0.5) * 2 * amplitude : 0
    scene.shakeY = amplitude > 0.5 ? (Math.random() - 0.5) * 2 * amplitude * 0.7 : 0
    if (battle.finished && !resultShown) showResult()
  }

  function onBlur() {
    guard.key = false
  }
  window.addEventListener('blur', onBlur)

  return {
    get active() {
      return battle !== null
    },
    get blocksMovement() {
      return transitioning || cards.open
    },
    get cardOpen() {
      return cards.open
    },
    get timeScale() {
      return battle && battle.freeze > 0 ? 0.08 : 1
    },

    offerTrail(ring) {
      if (battle || cards.open || transitioning) return
      openTrail(ring)
    },

    offerSite(at) {
      if (battle || cards.open || transitioning) return false
      const next = missionForSite(at.id)
      if (!next) return false
      if (!sideUnlocked(progress, next)) {
        sound.cue('deny')
        return false
      }
      const drawn = planLineup(next, progress, progress.core.element)
      brief(next, at, drawn, () => beginOpen(next, at, drawn))
      host.describe(`${next.title}. ${next.tagline} Aceitar, examinar os robôs ou agora não.`)
      return true
    },

    offerGuard(fight) {
      if (battle || cards.open || transitioning) return false
      cards.hide()
      savedAmbient = scene.ambient
      start(fight.mission, 'open', null, fight.lineup, null, progress.hand, fight)
      return true
    },

    abort() {
      cards.hide()
      tablet.hide()
      pendingPayout = 0
      if (battle) teardown()
      tablet.setToggleVisible(idle)
    },

    siteStatus(at) {
      const next = missionForSite(at.id)
      if (!next) return 'none'
      return sideUnlocked(progress, next) ? 'open' : 'locked'
    },

    cameraTarget() {
      return battle?.cameraTarget() ?? null
    },

    cameraInset() {
      return tablet.inset
    },

    cameraZoom(view, inset) {
      if (!battle || battle.mode !== 'ring' || battle.finished || battle.phase === 'victory' || battle.phase === 'defeat') return 1
      const zoom = playZoom(view)
      const free = { width: Math.max(1, view.width - inset.right), height: Math.max(1, view.height - inset.bottom) }
      const rect = battle.ring.ring
      const fit = Math.min((free.width * RING_FILL.width) / ((rect.w + 160) * zoom), (free.height * RING_FILL.height) / ((rect.h + 220) * zoom))
      const cap = Math.min(RING_ZOOM_MAX, Math.max(1, RING_ZOOM_SCALE_MAX / view.scale))
      return Math.max(1, Math.min(cap, fit))
    },

    update,

    confirm() {
      if (!cards.open) return
      cards.handleKey(new KeyboardEvent('keydown', { code: 'Enter' }))
    },

    handleKey(event) {
      if (cards.open) return !event.repeat && cards.handleKey(panelKey(event, 'Enter'))
      const action = actionFor(event.code)
      if (battle) {
        if (battle.gadgets.qteView) {
          const dir = QTE_KEYS[event.code] ?? (action === 'up' || action === 'down' || action === 'left' || action === 'right' ? action : null)
          if (dir) {
            if (!event.repeat) presses.qte = dir
            return true
          }
        }
        const gear = action ? GEAR_ACTIONS.indexOf(action) : -1
        if (gear >= 0) {
          if (!event.repeat) presses.gadget = battle.gadgets.loadout.chips[gear]?.id ?? null
          return true
        }
        const mount = action ? MOUNT_ACTIONS.indexOf(action) : -1
        if (mount >= 0) {
          if (!event.repeat) presses.gadget = battle.gadgets.loadout.mounts[mount]?.id ?? null
          return true
        }
        if (action === 'fury') {
          if (!event.repeat) presses.fury = true
          return true
        }
        const slot = action ? HAND_ACTIONS.indexOf(action) : -1
        if (slot >= 0) {
          if (!event.repeat) presses.card = battle.hand[slot] ?? null
          return true
        }
        switch (action) {
          case 'attack':
            if (!event.repeat) presses.attack = true
            return true
          case 'shoot':
            if (!event.repeat) presses.shoot = true
            return true
          case 'guard':
            guard.key = true
            return true
          case 'dodge':
            if (!event.repeat) presses.dodge = true
            return true
          default:
            return false
        }
      }
      if (action === 'missions' && !event.repeat) {
        if (tablet.mode === 'missions') closeMissions()
        else openMissions()
        return true
      }
      if (event.code === 'Escape' && tablet.mode === 'missions') {
        closeMissions()
        return true
      }
      if (event.code === 'KeyT' && tablet.mode === 'missions' && !event.repeat) {
        openTrail(null)
        return true
      }
      return false
    },

    handleKeyUp(event) {
      if (actionFor(event.code) === 'guard') guard.key = false
    },

    setIdle(next) {
      idle = next
      if (!next && tablet.mode === 'missions') tablet.hide()
      tablet.setToggleVisible(next && !battle)
    },

    destroy() {
      window.removeEventListener('blur', onBlur)
      teardown()
      tablet.destroy()
      fury.destroy()
      cards.destroy()
    },
  }
}
