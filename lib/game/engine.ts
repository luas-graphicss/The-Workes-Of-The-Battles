import { CRYSTAL_CRATES, openness, woodsZoneAt } from '../city/woods'
import { GAME_TITLE } from './brand'
import { DOOR, ENTRY, LEAGUE_NAME, LEAGUE_SUBTITLE, RING_GATE_ZONE } from '../league/layout'
import { FORASTEIRO_LOOK } from '../league/people'
import {
  ARENA,
  BEACON_TOP,
  campAt,
  campCacheAt,
  CAMPS,
  clearingById,
  clearingRelicAt,
  clearingUnlocked,
  enterSpace,
  GARAGE,
  HOME_START,
  HOUSE,
  isAtArenaGate,
  isAtGarageDoor,
  isAtHouseDoor,
  isAtLeagueDoor,
  isAtShopDoor,
  LEAGUE,
  METEOR_SITE,
  secretSpotAt,
  secretSpotById,
  secretSpotUnlocked,
  SHOP,
  siteAt,
  SITES,
  WORLD,
  type Camp,
  type Clearing,
  type ClearingId,
  type Point,
  type Site,
} from '../world-data'
import { createSound } from './audio'
import { CLASSES } from './battle/classes'
import { createCombat, NO_MOUSE, type Combat, type MouseInput } from './battle/combat'
import { CARDS, type CardId } from './battle/deck'
import { ELEMENTS } from './battle/elements'
import { actionFor, labelFor, panelKey } from './bindings'
import { Camera, NO_INSET, pickScale, TOUCH_ZOOM, type View } from './camera'
import { CityLayer } from './city'
import { Companion } from './companion'
import { Cinema, type CinemaScript } from './cutscene/cinema'
import { Director } from './cutscene/director'
import { easeInOutCubic } from './cutscene/easing'
import { creditsScript, drawSeedTree, endingScript, fallScript, harvestScript, type FinaleCineDeps } from './cutscene/finale'
import { createOverlay } from './cutscene/overlay'
import { SkyShot } from './cutscene/sky-shot'
import { createDrops, type Drops } from './drops'
import { createFade } from './fade'
import { createCreditsRoll } from './finale/credits'
import { createFallScreen } from './finale/fall'
import { clockText } from './finale/hud'
import { createHunt, createHuntState, HUNT_START, type Hunt } from './finale/hunt'
import type { HeartSpot } from './finale/layout'
import { blurredSnapshot } from './fx/backdrop'
import { glowTexture, puffTexture, type RGB } from './fx/textures'
import { createLeague, LEAGUE_AMBIENT, type League, type LeagueSpot } from './league'
import { createHint, key } from './hint'
import { garageFront } from './garage/front'
import { createGarage, type Garage } from './garage/ui'
import { houseFront } from './house/front'
import { createHouse, type House } from './house/ui'
import { createKeyboard, createPointer, mergeMovement, readGamepad, readGamepadConfirm } from './input'
import { createJoystick } from './joystick'
import { createMapLayer, type MapLayer } from './map'
import { prepareMeteor } from './meteor'
import { missionForSite, type Mission } from './missions/data'
import { LEVEL_COUNT, worldData } from './missions/ladder'
import { currentLevel, ladderCycle, nextMainMission } from './missions/progress'
import { BOND_MAX, bondLevel, GREET_COOLDOWN, nextBondLevel } from './npcs/bond'
import {
  befriend,
  canGrow,
  completeLesson,
  FRIEND_GIFT,
  FRIEND_LEVELS,
  FRIEND_MAX,
  friendship,
  lessonDone,
  MASTERS,
  OIL_PRICE,
  type BefriendResult,
  type Master,
  type Rival,
} from './npcs/data'
import { dressPilot } from './npcs/art'
import { createDialogue, type TalkPage } from './npcs/dialogue'
import { createBubble, createTown, type Town } from './npcs/town'
import { Player } from './player'
import { createPrompt } from './prompt'
import { conditionOf, DAMAGED_AT, repairCost } from './robot/condition'
import { BODY_NAME, equippedParts, formatCredits, speedMultiplier, type Loadout } from './robot/parts'
import { campLoot, collectCamp, collectClearing, collectSpot, hasSavedProgress, HEART_COUNT, loadProgress, resetProgress, saveProgress, type Progress } from './robot/progress'
import { ROBOT_ASSET_IDS, RobotComposer, robotSheetPaths, type RobotSheets, type Sheets } from './robot/sprites'
import { vendorStock } from './robot/vendor'
import { Scene, type WorldDraw } from './scene'
import { clearingEntries } from './secrets/clearings'
import { secretPickups } from './secrets/pickups'
import { settings, type Settings } from './settings'
import { shopFront } from './shop/front'
import { createShop, type Shop } from './shop/ui'
import type { Direction } from './sprite'
import {
  BARTENDER_ANSWER,
  bartenderPages,
  beatAfterWin,
  FORASTEIROS_AFTER,
  FORASTEIROS_GONE,
  FORASTEIROS_NEAR,
  markBeat,
  OVERHEAR_VISIT,
  OVERHEARD,
  VISITANTES_TITLE,
  type Beat,
} from './story/visitantes'
import { AFTERMATH, FINALE_TITLE, finaleReady, unmaskedPages, type FinaleVoices } from './story/finale'
import { CACHE_TEXT, campFoundPages } from './story/woods'
import { cellCanvas } from './ui/cell'
import { createHud, regionAt, type HudObjective } from './ui/hud'
import { emblemPath, type EmblemName } from './ui/kit'
import { createMenu, type Menu, type SaveSummary } from './ui/menu'
import { createToast } from './ui/toast'

export type GameOptions = { assetBase: string }
export type GameHandle = { destroy(): void }

type Stage = 'loading' | 'title' | 'intro' | 'play' | 'shop' | 'house' | 'garage' | 'cinema' | 'fall'

type PromptTarget =
  | { kind: 'shop' }
  | { kind: 'house' }
  | { kind: 'garage' }
  | { kind: 'arena' }
  | { kind: 'site'; site: Site }
  | { kind: 'master'; master: Master }
  | { kind: 'rival'; rival: Rival }
  | { kind: 'companion' }
  | { kind: 'clearing'; clearing: Clearing }
  | { kind: 'camp'; camp: Camp }
  | { kind: 'league' }
  | { kind: 'hall'; spot: LeagueSpot }
  | { kind: 'heart'; spot: HeartSpot }

const BACKGROUND = '#151e1b'
const CHIMNEY_RANGE = { x: 2400, y: 1800 }
const STEAM_COLOR = [176, 172, 164] as const
const SPARK_COLOR = [214, 150, 255] as const
const LETTERBOX = '#050608'
const HINT_DURATION = 7000
const SHOP_HINT_DURATION = 8000
const SKIP_HOLD = 0.85
const MAX_STEP = 0.05
const MAX_INTRO_STEP = 0.1
const SKIP_KEYS = new Set(['Escape', 'Enter', 'NumpadEnter', 'Space'])
const IGNORED_KEYS = /^(Shift|Control|Alt|Meta|CapsLock|Tab|F\d+|KeyM)/
const PLAY_LABEL = `${GAME_TITLE}: você caminha por Bosque Alto com seu robô ao lado.`
const SHOP_LABEL = `${GAME_TITLE}: dentro da ${SHOP.name}, escolhendo peças para o robô.`
const HOUSE_LABEL = `${GAME_TITLE}: dentro da ${HOUSE.name}, na bancada de melhorias.`
const GARAGE_LABEL = `${GAME_TITLE}: dentro da ${GARAGE.name}, com Charles, Sid e James.`
const TELEPORT = /#at=(-?\d+),(-?\d+)/

const INTRO_SEEK = /(^|[#&])intro=(\d+(?:\.\d+)?)(&|$)/

const FIXED_RESOLUTION = /(^|[#&])fixed(&|$)/
const FORCE_TOUCH = /(^|[#&])touch(&|$)/
const LEAGUE_TARGET: Point = [LEAGUE.door[0], LEAGUE.door[1] + 30]
const RING_TARGET: Point = [RING_GATE_ZONE.x + RING_GATE_ZONE.w / 2, RING_GATE_ZONE.y + RING_GATE_ZONE.h / 2]
const LEAGUE_LABEL = `${GAME_TITLE}: dentro da ${LEAGUE_NAME}, entre mesas, apostadores e ringues.`
const BET_PRICE = 60
const BET_PRIZE = 130
const BET_ODDS = 0.45
const BET_COOLDOWN = 20000
const CHATTER_EVERY = 7
const SHOP_TARGET: Point = [SHOP.door[0], SHOP.door[1] + 30]
const HOUSE_TARGET: Point = [HOUSE.door[0], HOUSE.door[1] + 30]
const GARAGE_TARGET: Point = [GARAGE.door[0], GARAGE.door[1] + 40]
const FIND_ICON = 56
const REVEAL_ICON = 72
const REGION_CHECK = 0.5
const OBJECTIVE_CHECK = 0.2

const GREET_RANGE = 150
const GREET_IDLE = 0.9
const BUBBLE_LIFT = 170
const CLEARING_CARD: Record<ClearingId, CardId> = { orvalho: 'orvalho', raizes: 'raizes', vagalumes: 'enxame' }
const CAMPFIRE_RANGE = { x: 1800, y: 1400 }
const DAYLIGHT: RGB = [255, 255, 255]

const CANOPY: RGB = [204, 216, 196]
const EERIE: RGB = [176, 164, 218]
const SHADE_EASE = 1.4
const ALIEN_CAMP = CAMPS.find((camp) => camp.id === 'forasteiros') ?? CAMPS[0]
const GREET_LINES: readonly (readonly string[])[] = [
  ['Bip?', 'Bzz... oi!', 'Bip-bop?'],
  ['Bip-bip!', 'Pronto para a próxima!', 'Mais uma luta?'],
  ['Juntos até o campeão!', 'Bip! Melhor piloto da cidade.', 'Confio em você.'],
  ['Nada nos para!', 'Parceiros para sempre. Bip!', 'Vamos mostrar quem manda!'],
]
const FPS_SAMPLE_MS = 500
const PAUSE_BLUR = { blur: 7, saturate: 0.7 }
const CARDS_BLUR = { blur: 5, saturate: 0.8 }

const TITLE_FADE_MS = 800

const CARD_FADE_MS = 400

const LOW_FPS = 48
const HIGH_FPS = 58
const LOW_SAMPLES = 4

const INTRO_LOW_SAMPLES = 2
const INTRO_SETTLE_MS = 1500
const RECOVER_MS = 12000
const RECOVER_MAX_MS = 180000
const SETTLE_MS = 5000
const LEAGUE_DARK: RGB = [64, 52, 92]
const UNMASK_FLICKER = 2.6
const HARVEST_LOCK = 'A Liga trancou as portas. Os corações batem na floresta: siga o marcador.'
const HARVEST_LABEL = `${GAME_TITLE}: a Colheita começou. Nove corações batem nas clareiras da floresta.`

const ASSETS = {
  preview: WORLD.image,
  props: WORLD.props,
  sky: 'assets/fx/sky.webp',
  trees: 'assets/fx/sky-trees.webp',
  meteor: 'assets/fx/meteor.webp',
  meteorGlow: 'assets/fx/meteor-glow.webp',
  crater: 'assets/fx/crater.webp',
  visitorIdle: 'assets/visitor/idle.png',
  visitorWalk: 'assets/visitor/walk.png',
  visitorPose: 'assets/visitor/pose.png',
} as const

type LoadedAssets = Record<keyof typeof ASSETS, HTMLImageElement> & { robot: Map<string, Sheets>; pilot: Sheets }

const PILOT_ID = 'pilot'

const pilotSheetPaths = (base: string) => ({ idle: `${base}assets/pilot/idle.png`, walk: `${base}assets/pilot/walk.png` })

export function createGame(surface: HTMLElement, options: GameOptions): GameHandle {
  surface.classList.add('game-root')

  const canvas = document.createElement('canvas')
  canvas.className = 'game-canvas'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', `${GAME_TITLE}: um meteoro cai sobre a floresta de Bosque Alto durante a noite.`)
  surface.append(canvas)
  const rendering = canvas.getContext('2d', { alpha: false })
  if (!rendering) throw new Error('Canvas 2D indisponível.')
  const context: CanvasRenderingContext2D = rendering

  const media = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches
  const touchFirst = media('(pointer: coarse)') || (media('(hover: none)') && navigator.maxTouchPoints > 0) || FORCE_TOUCH.test(window.location.hash)
  const reducedMotion = media('(prefers-reduced-motion: reduce)')
  surface.dataset.touch = String(touchFirst)

  const player = new Player(HOME_START)
  const robot = new Player(HOME_START)
  const companion = new Companion(robot)
  const camera = new Camera(HOME_START)
  const view: View = { width: 1, height: 1, scale: 4 }
  let pixelRatio = 1
  const keyboard = createKeyboard()
  const pointer = createPointer(surface)
  const joystick = createJoystick(surface)
  joystick.setEnabled(false)
  const hint = createHint(surface)
  const overlay = createOverlay(surface, { touch: touchFirst })
  const prompt = createPrompt(surface, { assetBase: options.assetBase })
  const fade = createFade(surface, reducedMotion)
  const sound = createSound()
  const hud = createHud(surface, { assetBase: options.assetBase, touch: touchFirst })
  const toast = createToast(surface)
  const dialogue = createDialogue(surface, { touch: touchFirst, reducedMotion, cue: (name) => sound.cue(name) })
  const bubble = createBubble(surface)
  const fall = createFallScreen(surface, { touch: touchFirst, reducedMotion, onRetry: () => void retryHarvest(), onTitle: () => fallToTitle(), cue: (name) => sound.cue(name) })
  const credits = createCreditsRoll(surface, { assetBase: options.assetBase, touch: touchFirst, reducedMotion })
  const steamSprites = [0, 1, 2].map((variant) => puffTexture(STEAM_COLOR, variant))
  const sparkSprite = glowTexture(SPARK_COLOR, 32)
  const heartSprite = paintHeart()
  overlay.onToggleSound(() => settings.set('muted', !settings.value.muted))
  prompt.onActivate(() => activatePrompt())
  hud.onMenu(() => openPause())

  let stage: Stage = 'loading'
  let map: MapLayer | null = null
  let scene: Scene | null = null
  let sky: SkyShot | null = null
  let director: Director | null = null
  let shop: Shop | null = null
  let house: House | null = null
  let garage: Garage | null = null
  let combat: Combat | null = null
  let composer: RobotComposer | null = null
  let progress: Progress | null = null
  let robotSheets: RobotSheets | null = null
  let promptTarget: PromptTarget | null = null
  let animation = 0
  let previous = performance.now()
  let destroyed = false
  let awaitingFirstMove = false
  let shopHintPending = true
  let transitioning = false
  let skipHold = 0
  let confirmWasHeld = false
  const heldSkipKeys = new Set<string>()
  let menu: Menu | null = null
  let paused = false
  let visitedShop = false
  let regionId: string | null = null
  let regionTimer = 0
  let fpsFrames = 0
  let drawnFrames = 0
  let fpsSince = performance.now()
  let titleShownAt = 0
  let cardOpenSince = 0
  let renderScale = 1
  let lowSamples = 0
  let highSince = 0
  let settleUntil = 0
  let recoverMs = RECOVER_MS
  let robotSpeed = 1
  let deployed = false
  let town: Town | null = null
  let idleTime = 0
  let greetReadyAt = 0
  let city: CityLayer | null = null
  let loaded: LoadedAssets | null = null
  let league: League | null = null
  let inside = false
  let drops: Drops | null = null
  let outdoorAmbient: RGB = [255, 255, 255]
  let chatterTimer = 3
  let betReadyAt = 0
  let cameraFocus: Point | null = null
  let sceneRunning = false
  let canopyShade = 0
  let eerieShade = 0
  let sceneBars = 0
  let sceneBarsShown = false
  let objectiveTimer = 0
  let hunt: Hunt | null = null
  let finaleDeps: FinaleCineDeps | null = null
  let cinema: Cinema | null = null
  let cinemaDone: (() => void) | null = null
  let collapsing = false
  let flicker = 0
  const seedGlow: WorldDraw = (target, originX, originY, zoom, now) => {
    if (scene?.outdoors) drawSeedTree(target, originX, originY, zoom, now / 1000, 1)
  }

  const frameInset = { right: 0, bottom: 0 }
  const focusPoint = { x: 0, y: 0 }

  function applySettings(value: Readonly<Settings>) {
    joystick.setMode(value.stick)
    const scale = value.uiScale / 100
    surface.style.setProperty('--ui-scale', String(scale))
    document.documentElement.style.fontSize = scale === 1 ? '' : `${16 * scale}px`
    surface.dataset.motion = value.motion
    surface.dataset.hud = value.hud ? 'on' : 'off'
    surface.dataset.marker = value.marker ? 'on' : 'off'
    surface.dataset.hints = value.hints ? 'on' : 'off'
    sound.setVolumes({ master: value.master / 100, ambience: value.ambience / 100, effects: value.effects / 100 })
    sound.setMuted(value.muted)
    overlay.setMuted(value.muted)
    if (!value.fps) hud.setFps(null)
  }
  const unsubscribeSettings = settings.subscribe(applySettings)

  function resize() {
    const bounds = surface.getBoundingClientRect()
    const deviceRatio = window.devicePixelRatio || 1

    const ratio = deviceRatio * renderScale
    pixelRatio = ratio
    const cssWidth = Math.max(1, bounds.width)
    const cssHeight = Math.max(1, bounds.height)
    view.width = Math.max(1, Math.round(cssWidth * ratio))
    view.height = Math.max(1, Math.round(cssHeight * ratio))
    view.scale = Math.max(1, Math.round(pickScale(cssWidth, cssHeight, deviceRatio, touchFirst ? TOUCH_ZOOM : 1) * renderScale))
    canvas.width = view.width
    canvas.height = view.height
    canvas.dataset.scaled = renderScale < 1 ? 'true' : 'false'
    camera.follow(player, 0, view, true)
    render(performance.now())
  }

  function setRenderScale(next: number, now: number) {
    if (next === renderScale) return
    renderScale = next
    lowSamples = 0
    highSince = 0
    settleUntil = now + SETTLE_MS
    resize()
  }

  function adaptResolution(fps: number, now: number, drewEveryFrame: boolean) {

    const rendering = drewEveryFrame && (stage === 'play' || stage === 'intro' || stage === 'cinema') && !paused && !document.hidden
    if (!rendering || now < settleUntil || FIXED_RESOLUTION.test(window.location.hash)) {
      lowSamples = 0
      highSince = 0
      return
    }
    if (fps < LOW_FPS) {
      highSince = 0
      if (++lowSamples >= (stage === 'intro' ? INTRO_LOW_SAMPLES : LOW_SAMPLES) && renderScale > 0.5) {
        setRenderScale(0.5, now)
        recoverMs = Math.min(RECOVER_MAX_MS, recoverMs * 2)
      }
      return
    }
    lowSamples = 0

    if (renderScale >= 1 || fps < HIGH_FPS || stage === 'intro') {
      highSince = 0
      return
    }
    if (!highSince) highSince = now
    else if (now - highSince >= recoverMs) setRenderScale(1, now)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(surface)
  resize()

  function resetClock() {
    previous = performance.now()
  }
  document.addEventListener('visibilitychange', resetClock)

  loadAssets(options.assetBase, (amount) => overlay.setLoading(amount))
    .then((assets) => {
      if (destroyed) return
      const meteor = prepareMeteor(assets.meteor, assets.meteorGlow)
      composer = new RobotComposer(assets.robot)
      progress = loadProgress()
      const saved = progress
      robotSpeed = speedMultiplier(progress.equipped, progress.upgrades, progress.condition)
      map = createMapLayer(options.assetBase, assets.preview)
      const secrets = secretPickups({
        collected: (spot) => saved.spots.includes(spot),
        unlocked: (spot) => {
          const found = secretSpotById(spot)
          return found !== null && secretSpotUnlocked(found, saved.missions.main)
        },
        focus: () => [player.x, player.y],
      })
      const clearings = clearingEntries({
        looted: (id) => saved.clearings.includes(id),
        unlocked: (id) => {
          const found = clearingById(id)
          return found !== null && clearingUnlocked(found, saved.missions.main)
        },
      })
      loaded = assets
      city = new CityLayer(assets.props, [...shopFront(composer), ...houseFront(), ...garageFront(), ...secrets, ...clearings])
      robotSheets = composer.compose(progress.equipped)
      scene = new Scene({ map, city, crater: assets.crater, meteor, robot: robotSheets, pilot: assets.pilot })
      scene.companion = robot
      town = createTown({ composer, pilot: assets.pilot, progress })
      scene.townsfolk = town.actors
      setupDrops()
      sky = new SkyShot({ sky: assets.sky, trees: assets.trees, meteor })
      const visitors = { idle: assets.visitorIdle, walk: assets.visitorWalk, pose: assets.visitorPose, disguise: dressPilot(assets.pilot, FORASTEIRO_LOOK) }
      director = new Director({ scene, sky, sound, overlay, player, robot, meteor, visitors, reducedMotion })
      finaleDeps = { scene, sound, overlay, player, robot, visitors }
      hunt = createHunt({ scene, progress: saved, sound, surface, visitors, player })
      shop = createShop(surface, {
        composer,
        progress,
        sound,
        assetBase: options.assetBase,
        touch: touchFirst,
        reducedMotion,
        textDelay: () => 16,
        onLoadoutChange: applyLoadout,
      })
      shop.onExit(() => void leaveShop())
      house = createHouse(surface, {
        composer,
        progress,
        sound,
        assetBase: options.assetBase,
        touch: touchFirst,
        onChange: applyLoadout,
      })
      house.onExit(() => void leaveHouse())
      garage = createGarage(surface, {
        progress,
        sound,
        assetBase: options.assetBase,
        touch: touchFirst,
        reducedMotion,
      })
      garage.onExit(() => void leaveGarage())
      setupCombat()
      menu = createMenu(surface, {
        assetBase: options.assetBase,
        touch: touchFirst,
        sound,
        version: WORLD.version,
        handlers: { continueGame, newGame, resume: resumeGame, quitToTitle },
        backdrop: () => blurredSnapshot(canvas, PAUSE_BLUR, 'menu-backdrop'),
      })
      stage = 'title'
      overlay.setPhase('title')
      sound.bed('night')
      menu.showTitle(hasSavedProgress() ? saveSummary() : null)
      titleShownAt = performance.now()
    })
    .catch((error: unknown) => {
      console.error(`${GAME_TITLE}: falha ao preparar o jogo`, error)
      if (!destroyed) hint.show(['Não foi possível abrir a arte do jogo. Recarregue a página.'])
    })

  function setupCombat() {
    const fallback = robotSheets
    if (!scene || !composer || !progress || !fallback) return
    combat?.destroy()
    combat = createCombat(surface, {
      assetBase: options.assetBase,
      touch: touchFirst,
      player,
      scene,
      composer,
      progress,
      sound,
      host: {
        transition,
        place: placeParty,
        deploy,
        recall,
        describe: (text) => overlay.describe(text),
        robot: () => robotSheets ?? fallback,
        backdrop: () => blurredSnapshot(canvas, CARDS_BLUR, 'cards-backdrop'),
        wear: refreshSpeed,
        payout: (amount, x, y) => drops?.spawn(amount, x, y, inside ? 'league' : 'city'),
        afterRing: (won, mission) => {
          if (!won || !progress) return
          if (finaleReady(progress, mission)) {
            playUnmasking(mission)
            return
          }
          if (progress.story.finale !== 'none') return
          const beat = beatAfterWin(progress, mission)
          if (beat) playBeat(beat)
        },
        afterOpen: (won, mission) => {
          if (hunt?.active) hunt.afterFight(won, mission)
        },
      },
    })
  }

  function setupDrops() {
    if (!scene || !progress) return
    const saved = progress
    drops?.destroy()
    drops = createDrops({
      scene,
      progress: saved,
      onCollect: (amount) => {
        sound.cue('coin')
        hud.setCredits(saved.credits)
        hud.setIron(saved.garage.coins, saved.garage.fragments)
        overlay.describe(`Ficha recolhida: ${formatCredits(amount)} créditos.`)
      },
    })
  }

  function refreshSpeed() {
    if (!progress) return
    robotSpeed = speedMultiplier(progress.equipped, progress.upgrades, progress.condition)
    if (deployed) player.speedMultiplier = robotSpeed
  }

  function repairObjective(): HudObjective | null {
    const saved = progress
    if (!saved) return null
    const damaged = equippedParts(saved.equipped).filter((part) => conditionOf(saved.condition, part.id) < DAMAGED_AT)
    if (!damaged.length) return null
    const cheapest = Math.min(...damaged.map((part) => repairCost(part, conditionOf(saved.condition, part.id))))
    if (saved.credits < cheapest) return null
    return {
      id: 'repair',
      emblem: 'capsule',
      kicker: damaged.length === 1 ? 'Peça danificada' : `${damaged.length} peças danificadas`,
      title: 'Cápsula de reparo',
      goal: HOUSE.name,
      target: HOUSE_TARGET,
    }
  }

  function saveSummary(): SaveSummary | null {
    if (!progress) return null
    return {
      credits: progress.credits,
      wins: progress.missions.wins,
      losses: progress.missions.losses,
      next: progress.story.finale === 'hunt' ? `${FINALE_TITLE} · ${progress.story.hunt?.broken.length ?? 0} de ${HEART_COUNT} corações` : nextMainMission(progress).title,
      core: { element: ELEMENTS[progress.core.element].name, cls: CLASSES[progress.core.cls].name },
    }
  }

  function dropsObjective(): HudObjective | null {
    if (!drops) return null
    const space = inside ? 'league' : 'city'
    const pending = drops.pending(space)
    const at = drops.centroid(space)
    if (!pending || !at) return null
    return { id: `drops:${space}`, emblem: 'credit', kicker: 'Prêmio no chão', title: `${formatCredits(pending)} ¢ em fichas`, goal: 'Ande sobre elas', target: at }
  }

  function currentObjective(): HudObjective | null {
    if (!progress) return null
    const { missions } = progress
    if (hunt?.active && !inside) {
      const heart = hunt.objective(player.x, player.y)
      if (heart) return heart
    }
    const chips = dropsObjective()
    if (chips) return chips
    if (inside) {
      const level = currentLevel(progress)
      const next = nextMainMission(progress)
      return {
        id: `ring:${missions.main}`,
        emblem: 'arena',
        kicker: `${next.boss ? 'Campeão' : 'Nível'} ${level} de ${LEVEL_COUNT}${progress.story.overheard && progress.story.finale === 'none' ? ' · contra os Forasteiros' : ''}`,
        title: next.title,
        goal: 'Ringue Principal',
        target: RING_TARGET,
      }
    }
    if (!visitedShop && progress.owned.length === 0 && missions.wins === 0 && missions.losses === 0) {
      return { id: 'workshop', emblem: 'workshop', kicker: 'Primeiro passo', title: SHOP.name, goal: 'Praça do Cristal', target: SHOP_TARGET }
    }
    if (!progress.homeVisited && missions.wins > 0 && progress.owned.length > 0) {
      return { id: 'home', emblem: 'house', kicker: 'Sua casa', title: HOUSE.name, goal: HOUSE.district, target: HOUSE_TARGET }
    }
    if (!progress.garage.visited && missions.wins > 0) {
      return { id: 'garage', emblem: 'workshop', kicker: 'Gaste suas Moedas de Ferro', title: GARAGE.name, goal: GARAGE.district, target: GARAGE_TARGET }
    }
    const repair = repairObjective()
    if (repair) return repair
    const mentor = MASTERS[0]
    if (!progress.lessons.length && missions.wins >= 2) {
      return { id: `master:${mentor.id}`, emblem: 'master', kicker: mentor.title, title: mentor.name, goal: mentor.district, target: [mentor.at[0], mentor.at[1] + 40] }
    }
    const level = currentLevel(progress)
    const cycle = ladderCycle(progress)
    const next = nextMainMission(progress)
    return {
      id: `arena:${missions.main}`,
      emblem: 'arena',
      kicker: `${next.boss ? 'Campeão' : 'Nível'} ${level} de ${LEVEL_COUNT} · ${worldData(level).kicker}${cycle > 1 ? ` · ${cycle}º ciclo` : ''}`,
      title: next.title,
      goal: LEAGUE.name,
      target: LEAGUE_TARGET,
    }
  }

  function continueGame() {
    if (stage !== 'title' || !director) return
    menu?.close()
    startIntro()
    director.skip()
  }

  function newGame() {
    if (stage !== 'title' || !progress) return
    menu?.close()
    if (hasSavedProgress()) {
      resetProgress(progress)
      setupCombat()
      setupDrops()
    } else {
      saveProgress(progress)
    }
    hunt?.end()
    collapsing = false
    surface.dataset.harvest = 'off'
    league?.crowd.setGone(false)
    visitedShop = false
    shopHintPending = true
    applyLoadout(progress.equipped)
    applyAftermath()
    startIntro()
  }

  function openPause() {
    if (stage !== 'play' || transitioning || paused || !menu || menu.open) return
    paused = true
    joystick.setEnabled(false)
    prompt.hide()
    promptTarget = null
    hud.setVisible(false)
    sound.cue('select')
    menu.showPause(saveSummary() as SaveSummary, { canQuit: !(combat?.active ?? false) })
    overlay.describe('Jogo pausado.')
  }

  function resumeGame() {
    if (!paused) return
    menu?.close()
    paused = false
    joystick.setEnabled(true)
    pointer.consume()
    resetClock()
    overlay.describe('De volta ao jogo.')
  }

  function quitToTitle() {
    if (!paused || combat?.active) return
    menu?.close()
    paused = false
    hint.hide()
    dialogue.close()
    bubble.hide()
    combat?.setIdle(false)
    if (inside) restoreOutdoors()
    hunt?.end()
    collapsing = false
    surface.dataset.harvest = 'off'
    placeParty(HOME_START[0], HOME_START[1], 's')
    regionId = null
    stage = 'title'
    overlay.setPhase('title')
    sound.bed('night')
    canvas.setAttribute('aria-label', `${GAME_TITLE}: menu inicial.`)
    menu?.showTitle(saveSummary())
    titleShownAt = performance.now()
    render(titleShownAt)
  }

  function greetRegion(dt: number) {
    regionTimer -= dt
    if (regionTimer > 0 || sceneRunning) return
    regionTimer = REGION_CHECK
    const region = regionAt(player.x, player.y)
    if (!region || region.id === regionId) return
    regionId = region.id
    hud.greet(region)
  }

  function applyLoadout(loadout: Loadout) {
    if (!scene || !composer || !progress) return
    robotSheets = composer.compose(loadout)
    scene.setRobot(robotSheets)
    robotSpeed = speedMultiplier(loadout, progress.upgrades, progress.condition)
    if (deployed) player.speedMultiplier = robotSpeed
    saveProgress(progress)
  }

  function placeParty(x: number, y: number, facing: Direction) {
    player.place(x, y, facing)
    companion.settle(x, y, facing)
    if (deployed) companion.watch(player)
    camera.x = player.x
    camera.y = player.y
    camera.follow(player, 0, view, true)
  }

  function readMouse(): MouseInput {
    const edges = pointer.consume()
    const held = pointer.held
    const swap = settings.value.mouseSwap
    const primary = edges.primary || held.primary
    const secondary = edges.secondary || held.secondary
    const position = settings.value.mouseAim ? pointer.position : null
    if (!position) return { aim: null, attack: swap ? secondary : primary, shoot: swap ? primary : secondary }
    const lens = camera.lens(view)
    return {
      aim: { x: lens.x + (position.x * pixelRatio - view.width / 2) / lens.zoom, y: lens.y + (position.y * pixelRatio - view.height / 2) / lens.zoom },
      attack: swap ? secondary : primary,
      shoot: swap ? primary : secondary,
    }
  }

  function deploy() {
    if (!scene) return
    deployed = true
    scene.heroKind = 'robot'
    player.speedMultiplier = robotSpeed
    companion.settle(player.x, player.y)
    companion.watch(player)
  }

  function recall() {
    if (!scene) return
    deployed = false
    scene.heroKind = 'pilot'
    player.speedMultiplier = 1
    companion.settle(player.x, player.y, player.facing)
  }

  async function transition(change: () => void) {
    transitioning = true
    prompt.hide()
    promptTarget = null
    hint.hide()
    await fade.cover()
    if (destroyed) return
    change()
    resetClock()
    render(performance.now())
    await fade.clear()
    transitioning = false
  }

  function companionReady() {
    if (!progress || deployed || idleTime < GREET_IDLE || performance.now() < greetReadyAt) return false
    return Math.hypot(robot.x - player.x, robot.y - player.y) <= GREET_RANGE
  }

  function targetAt(x: number, y: number): PromptTarget | null {
    if (inside) {
      const spot = league?.spotAt(x, y) ?? null
      if (spot) return { kind: 'hall', spot }
      return companionReady() ? { kind: 'companion' } : null
    }
    const heart = hunt?.heartAt(x, y) ?? null
    if (heart) return { kind: 'heart', spot: heart }
    if (isAtShopDoor(x, y)) return { kind: 'shop' }
    if (isAtHouseDoor(x, y)) return { kind: 'house' }
    if (isAtGarageDoor(x, y)) return { kind: 'garage' }
    if (isAtLeagueDoor(x, y)) return { kind: 'league' }
    if (isAtArenaGate(x, y)) return { kind: 'arena' }
    const site = siteAt(x, y)
    if (site) return { kind: 'site', site }
    const clearing = clearingRelicAt(x, y)
    if (clearing && progress && !progress.clearings.includes(clearing.id)) return { kind: 'clearing', clearing }
    const camp = campCacheAt(x, y)
    if (camp && progress && campLoot(progress, camp).kind !== 'empty') return { kind: 'camp', camp }
    const person = town?.nearest(x, y)
    if (person) return person.kind === 'master' ? { kind: 'master', master: person.data } : { kind: 'rival', rival: person.data }
    return companionReady() ? { kind: 'companion' } : null
  }

  function sameTarget(a: PromptTarget, b: PromptTarget | null) {
    if (!b || a.kind !== b.kind) return false
    if (a.kind === 'site' && b.kind === 'site') return a.site.id === b.site.id
    if (a.kind === 'master' && b.kind === 'master') return a.master.id === b.master.id
    if (a.kind === 'rival' && b.kind === 'rival') return a.rival.id === b.rival.id
    if (a.kind === 'clearing' && b.kind === 'clearing') return a.clearing.id === b.clearing.id
    if (a.kind === 'camp' && b.kind === 'camp') return a.camp.id === b.camp.id
    if (a.kind === 'hall' && b.kind === 'hall') return a.spot === b.spot
    if (a.kind === 'heart' && b.kind === 'heart') return a.spot.index === b.spot.index
    return true
  }

  function emblemIcon(name: EmblemName) {
    const icon = new Image(FIND_ICON, FIND_ICON)
    icon.src = emblemPath(options.assetBase, name)
    icon.alt = ''
    icon.decoding = 'async'
    return icon
  }

  function beginTalk() {
    prompt.hide()
    promptTarget = null
    hint.hide()
    combat?.setIdle(false)
  }

  function endTalk(reward?: { emblem: EmblemName; kicker: string; name: string }) {
    promptTarget = null
    combat?.setIdle(true)
    if (reward) toast.show({ icon: emblemIcon(reward.emblem), kicker: reward.kicker, name: reward.name })
  }

  function controls() {
    return { touch: touchFirst, key: labelFor }
  }

  function talkToMaster(master: Master) {
    if (!progress || !town) return
    const saved = progress
    beginTalk()
    sound.cue('select')
    const speaker = { name: master.name, kicker: master.title, accent: 'master' as const, portrait: town.portrait(master.id) }
    if (lessonDone(saved, master.id)) {
      dialogue.start(speaker, [{ text: master.recap, kicker: `${master.title} · lição concluída` }], () => endTalk())
      return
    }
    let earned = false
    const quiz = (): TalkPage => ({
      text: master.quiz.question,
      kicker: 'Prova do mestre',
      choices: master.quiz.options.map((label, index) => ({
        label,
        pick: () => {
          if (index !== master.quiz.answer) {
            sound.cue('deny')
            dialogue.show([{ text: master.quiz.wrong, kicker: 'Prova do mestre', choices: [{ label: 'Tentar de novo', pick: () => dialogue.show([quiz()]) }] }])
            return
          }
          earned = completeLesson(saved, master)
          saveProgress(saved)
          sound.cue('coin')
          dialogue.show([{ text: master.quiz.right, kicker: `Lição concluída · +${formatCredits(master.reward)} créditos` }])
          overlay.describe(`Lição de ${master.name} concluída. Você ganhou ${master.reward} créditos.`)
        },
      })),
    })
    const lesson = master.lesson(controls()).map((text): TalkPage => ({ text }))
    dialogue.start(speaker, [...lesson, quiz()], () =>
      endTalk(earned ? { emblem: 'master', kicker: 'Lição concluída', name: `${master.name} · +${formatCredits(master.reward)} ¢` } : undefined),
    )
  }

  function talkToRival(rival: Rival) {
    if (!progress || !town) return
    const saved = progress
    beginTalk()
    sound.cue('select')
    const meter = () => {
      const { level } = friendship(saved, rival.id)
      return { level, max: FRIEND_MAX, label: FRIEND_LEVELS[level] }
    }
    const speaker = { name: rival.name, kicker: `${rival.origin} · ${rival.district}`, accent: 'rival' as const, portrait: town.portrait(rival.id), meter: meter() }
    const { level } = friendship(saved, rival.id)
    if (level === 0) {
      befriend(saved, rival.id)
      saveProgress(saved)
      sound.cue('coin')
      dialogue.start({ ...speaker, meter: meter() }, [{ text: rival.lines[0], kicker: `Amizade · ${FRIEND_LEVELS[1]}` }], () => endTalk())
      overlay.describe(`Você conheceu ${rival.name}. Amizade: ${FRIEND_LEVELS[1]}.`)
      return
    }
    if (level >= FRIEND_MAX) {
      dialogue.start(speaker, [{ text: rival.lines[3] }], () => endTalk())
      return
    }
    let gift = false
    const respond = (result: BefriendResult) => {
      saveProgress(saved)
      dialogue.setMeter(meter())
      if (result === 'poor') {
        sound.cue('deny')
        dialogue.show([{ text: 'Óleo? Você nem tem moeda para isso. Guarda para a Cápsula, eu espero.' }])
        return
      }
      if (result === 'waiting' || result === 'max' || result === 'met') {
        dialogue.show([{ text: rival.waiting }])
        return
      }
      sound.cue(result === 'friends' ? 'win' : 'coin')
      gift = result === 'friends'
      const next = friendship(saved, rival.id).level
      dialogue.show([{ text: rival.lines[result === 'friends' ? 2 : 1], kicker: `Amizade · ${FRIEND_LEVELS[next]}${gift ? ` · +${formatCredits(FRIEND_GIFT)} créditos` : ''}` }])
      overlay.describe(`Amizade com ${rival.name}: ${FRIEND_LEVELS[next]}.`)
    }
    const ready = canGrow(saved, rival.id)
    dialogue.start(
      speaker,
      [
        {
          text: rival.hello,
          choices: [
            { label: 'Conversar', note: ready ? undefined : 'Após nova vitória', pick: () => respond(befriend(saved, rival.id)) },
            { label: 'Dar uma lata de óleo', note: `${OIL_PRICE} ¢`, disabled: saved.credits < OIL_PRICE, pick: () => respond(befriend(saved, rival.id, true)) },
            { label: 'Até mais', pick: () => dialogue.close() },
          ],
        },
      ],
      () => endTalk(gift ? { emblem: 'rival', kicker: `Amizade com ${rival.name}`, name: `Amigos · +${formatCredits(FRIEND_GIFT)} ¢` } : undefined),
    )
  }

  function greetCompanion() {
    if (!progress || !scene) return
    const before = bondLevel(progress.bond)
    progress.bond = Math.min(BOND_MAX, progress.bond + 1)
    const after = bondLevel(progress.bond)
    saveProgress(progress)
    greetReadyAt = performance.now() + GREET_COOLDOWN * 1000
    idleTime = 0
    promptTarget = null
    prompt.hide()
    companion.watch(player)
    sound.cue('ready')
    for (let index = 0; index < 6; index++) {
      scene.particles.spawn({
        x: robot.x + (Math.random() - 0.5) * 50,
        y: robot.y - 120,
        vx: (Math.random() - 0.5) * 40,
        rise: 70 + Math.random() * 50,
        life: 1 + Math.random() * 0.5,
        size: 34,
        sizeEnd: 18,
        alpha: 0.95,
        fadeIn: 0.05,
        sprite: heartSprite,
        blend: 'normal',
      })
    }
    const lines = GREET_LINES[after.index] ?? GREET_LINES[0]
    bubble.say(lines[Math.floor(Math.random() * lines.length)], () => ({ x: robot.x, y: robot.y }), BUBBLE_LIFT)
    if (after.index > before.index) {
      toast.show({ icon: emblemIcon('crest'), kicker: `Vínculo com o ${BODY_NAME}`, name: `${after.name} · +${after.charge} de Carga inicial` })
      overlay.describe(`Vínculo com o ${BODY_NAME}: ${after.name}. ${after.line}`)
      return
    }
    const next = nextBondLevel(progress.bond)
    overlay.describe(`Você cumprimentou o ${BODY_NAME}.${next ? ` Faltam ${next.at - progress.bond} cumprimentos para o vínculo ${next.name}.` : ''}`)
  }

  function openClearing(clearing: Clearing) {
    if (!progress || !composer || !scene) return
    if (!clearingUnlocked(clearing, progress.missions.main)) {
      sound.cue('deny')
      hint.show([`O selo da ${clearing.name} se abre depois que você vencer o nível ${clearing.wins} na ${LEAGUE.name}`], HINT_DURATION)
      return
    }
    const card = CLEARING_CARD[clearing.id]
    const part = collectClearing(progress, clearing.id, card)
    if (!part) return
    saveProgress(progress)
    sound.cue('warp')
    const [rx, ry] = clearing.relic
    for (let index = 0; index < 18; index++) {
      const angle = (index / 18) * Math.PI * 2
      scene.particles.spawn({
        x: rx + Math.cos(angle) * 8,
        y: ry - 40,
        vx: Math.cos(angle) * (40 + Math.random() * 40),
        rise: 80 + Math.random() * 70,
        life: 0.8 + Math.random() * 0.6,
        size: 30,
        sizeEnd: 4,
        alpha: 0.9,
        fadeIn: 0,
        sprite: sparkSprite,
        blend: 'add',
      })
    }
    beginTalk()
    const art = new Image()
    art.src = `${options.assetBase}${CARDS[card].art}`
    art.alt = ''
    art.className = 'talk-card-art'
    const key = ' Para levá-la às lutas, coloque-a na sua mão de cartas, na Oficina do Cristal.'
    dialogue.start(
      { name: clearing.name, kicker: 'Clareira secreta', accent: 'clearing', portrait: cellCanvas(composer, part.id, part.name, 'shop-cell', REVEAL_ICON) },
      [
        {
          text: `O relicário se abre num estalo de luz. Lá dentro: ${part.name}, uma peça que não existe em loja nenhuma. Ela já está no seu depósito; equipe pela estante de casa.`,
          kicker: 'Peça exclusiva',
        },
        { text: `Junto dela, uma carta antiga: ${CARDS[card].name}. ${CARDS[card].description}${key}`, kicker: 'Carta secreta no baralho', portrait: art },
      ],
      () => endTalk({ emblem: 'clearing', kicker: clearing.name, name: 'Peça e carta secretas' }),
    )
    overlay.describe(`${clearing.name} descoberta: ${part.name} foi para o depósito e a carta ${CARDS[card].name} entrou no baralho.`)
  }

  function openCache(camp: Camp) {
    if (!progress || !composer || !scene) return
    const text = CACHE_TEXT[camp.id]
    const loot = collectCamp(progress, camp)
    if (loot.kind === 'waiting') {
      sound.cue('deny')
      hint.show([text.wait.replace('{level}', String(loot.level))], HINT_DURATION)
      return
    }
    if (loot.kind !== 'ready') return
    saveProgress(progress)
    sound.cue('warp')
    const [cx, cy] = camp.cache
    for (let index = 0; index < 14; index++) {
      const angle = (index / 14) * Math.PI * 2
      scene.particles.spawn({
        x: cx + Math.cos(angle) * 10,
        y: cy - 30,
        vx: Math.cos(angle) * (30 + Math.random() * 40),
        rise: 70 + Math.random() * 60,
        life: 0.7 + Math.random() * 0.5,
        size: 26,
        sizeEnd: 4,
        alpha: 0.9,
        fadeIn: 0,
        sprite: sparkSprite,
        blend: 'add',
      })
    }
    const { part, left } = loot
    beginTalk()
    dialogue.start(
      {
        name: text.name,
        kicker: camp.name,
        accent: camp.id === 'forasteiros' ? 'visitor' : 'clearing',
        portrait: cellCanvas(composer, part.id, part.name, 'shop-cell', REVEAL_ICON),
      },
      [
        { text: text.open, kicker: 'Achado no acampamento' },
        {
          text: `${part.name} foi para o seu depósito; equipe pela estante de casa. ${left ? `${left === 1 ? 'Resta mais uma coisa' : `Restam mais ${left} coisas`} aqui. ${text.later}` : text.last}`,
          kicker: 'Peça de acampamento',
        },
      ],
      () => endTalk({ emblem: 'capsule', kicker: camp.name, name: part.name }),
    )
    overlay.describe(`${text.name}, ${camp.name}: ${part.name} foi para o depósito.`)
  }

  function playCampFound() {
    if (!progress || !scene) return
    const saved = progress
    saved.story.campFound = true
    saveProgress(saved)
    beginTalk()
    hud.dismissGreeting()
    sceneRunning = true
    joystick.setEnabled(false)
    sound.cue('heartbeat')
    const [crateX, crateY] = CRYSTAL_CRATES[0]
    const shots = {
      beacon: () => {
        cameraFocus = [BEACON_TOP[0], BEACON_TOP[1] + 140]
      },
      tents: () => {
        cameraFocus = [ALIEN_CAMP.center[0], ALIEN_CAMP.center[1] + 60]
      },
      crates: () => {
        cameraFocus = [crateX, crateY - 30]
      },
      robot: () => {
        cameraFocus = [(robot.x + player.x) / 2, (robot.y + player.y) / 2 - 40]
      },
    }
    const voice = { name: BODY_NAME, kicker: 'Seu robô', portrait: robotSheets ? robotPortraitCanvas(robotSheets) : null }
    dialogue.start({ name: ALIEN_CAMP.name, kicker: 'Fundo do Bosque', accent: 'visitor', portrait: null }, campFoundPages(saved.story.overheard, shots, voice), () => {
      sceneRunning = false
      cameraFocus = null
      joystick.setEnabled(true)
      sound.stopCue('heartbeat')
      endTalk({ emblem: 'secret', kicker: VISITANTES_TITLE, name: 'O Acampamento' })
      bubble.say('...bip.', () => ({ x: robot.x, y: robot.y }), BUBBLE_LIFT)
      overlay.describe('Você encontrou o acampamento dos Forasteiros no Fundo do Bosque. A caixa lacrada perto das barracas cede aos poucos, conforme você sobe de nível na Liga.')
    })
  }

  function tendWoods(dt: number, time: number) {
    if (!scene) return
    scene.worldLights.length = 0
    for (const camp of CAMPS) {
      const [x, y] = camp.fire
      if (Math.abs(camera.x - x) > CAMPFIRE_RANGE.x || Math.abs(camera.y - y) > CAMPFIRE_RANGE.y) continue
      scene.campfire(dt, x, y, time, camp.id === 'forasteiros')
    }
    const [beaconX, beaconY] = BEACON_TOP
    if (Math.abs(camera.x - beaconX) < CAMPFIRE_RANGE.x && Math.abs(camera.y - beaconY) < CAMPFIRE_RANGE.y + 400) scene.beacon(dt, beaconX, beaconY + 14, time)
    if (combat?.active) return
    const shade = woodsZoneAt(player.x, player.y) ? 1 - openness(player.x, player.y) * 0.75 : 0
    const reach = Math.hypot(player.x - ALIEN_CAMP.center[0], player.y - ALIEN_CAMP.center[1]) / ALIEN_CAMP.radius
    const eerie = Math.min(1, Math.max(0, (1.6 - reach) / 0.7))
    const ease = Math.min(1, dt * SHADE_EASE)
    canopyShade += (shade - canopyShade) * ease
    eerieShade += (eerie - eerieShade) * ease
    const mix = (channel: 0 | 1 | 2) => {
      const shaded = DAYLIGHT[channel] + (CANOPY[channel] - DAYLIGHT[channel]) * canopyShade
      return Math.round(shaded + (EERIE[channel] - shaded) * eerieShade)
    }
    const base: RGB = [mix(0), mix(1), mix(2)]
    scene.ambient = hunt?.active ? hunt.tint(base) : base
  }

  function showPrompt(target: PromptTarget) {
    if (!progress || !combat) return
    if (target.kind === 'heart') {
      prompt.show({ kicker: `${FINALE_TITLE} · ${hunt?.broken ?? 0} de ${HEART_COUNT}`, title: target.spot.name, action: 'Quebrar o coração', kind: 'heart' })
      return
    }
    if (target.kind === 'shop') {
      prompt.show({ kicker: 'Praça do Cristal', title: SHOP.name, action: 'Entrar', kind: 'shop' })
      return
    }
    if (target.kind === 'house') {
      prompt.show({ kicker: HOUSE.district, title: HOUSE.name, action: 'Entrar em casa', kind: 'house' })
      return
    }
    if (target.kind === 'garage') {
      prompt.show({ kicker: GARAGE.district, title: GARAGE.name, action: 'Entrar na mecânica', kind: 'shop' })
      return
    }
    if (target.kind === 'arena') {
      prompt.show({ kicker: 'Arena fechada', title: ARENA.name, action: 'Ler o aviso', kind: 'arena' })
      return
    }
    if (target.kind === 'league') {
      if (hunt?.active) {
        prompt.show({ kicker: FINALE_TITLE, title: LEAGUE_SUBTITLE, action: 'Portas trancadas', kind: 'arena', locked: true })
        return
      }
      const next = nextMainMission(progress)
      prompt.show({ kicker: `${LEAGUE.name} · ${next.boss ? 'Campeão' : 'Nível'} ${currentLevel(progress)}`, title: LEAGUE_SUBTITLE, action: 'Entrar', kind: 'arena' })
      return
    }
    if (target.kind === 'hall') {
      showHallPrompt(target.spot)
      return
    }
    if (target.kind === 'master') {
      const done = lessonDone(progress, target.master.id)
      prompt.show({ kicker: target.master.title, title: target.master.name, action: done ? 'Relembrar a lição' : 'Aprender', kind: 'master' })
      return
    }
    if (target.kind === 'rival') {
      const { level } = friendship(progress, target.rival.id)
      prompt.show({
        kicker: `${level ? FRIEND_LEVELS[level] : 'Robô fugitivo'} · ${target.rival.district}`,
        title: level ? target.rival.name : 'Robô desconhecido',
        action: level ? 'Conversar' : 'Cumprimentar',
        kind: 'rival',
      })
      return
    }
    if (target.kind === 'companion') {
      prompt.show({ kicker: `Seu robô · vínculo ${bondLevel(progress.bond).name}`, title: BODY_NAME, action: 'Cumprimentar', kind: 'companion' })
      return
    }
    if (target.kind === 'clearing') {
      const open = clearingUnlocked(target.clearing, progress.missions.main)
      prompt.show({
        kicker: 'Clareira secreta',
        title: target.clearing.name,
        action: open ? 'Abrir o relicário' : `Selado · vença o nível ${target.clearing.wins}`,
        kind: 'clearing',
        locked: !open,
      })
      return
    }
    if (target.kind === 'camp') {
      const loot = campLoot(progress, target.camp)
      prompt.show({
        kicker: target.camp.name,
        title: CACHE_TEXT[target.camp.id].name,
        action: loot.kind === 'waiting' ? `Vazio por ora · volte no nível ${loot.level}` : 'Vasculhar',
        kind: 'clearing',
        locked: loot.kind !== 'ready',
      })
      return
    }
    const mission = missionForSite(target.site.id)
    const open = combat.siteStatus(target.site) === 'open'
    prompt.show({
      kicker: target.site.name,
      title: mission?.title ?? target.site.district,
      action: open ? 'Ver missão' : 'Trancado',
      kind: 'site',
      locked: !open,
    })
  }

  function activatePrompt() {
    if (stage !== 'play' || transitioning || !promptTarget || !combat || combat.active || combat.blocksMovement) return
    if (promptTarget.kind === 'shop') {
      void enterShop()
      return
    }
    if (promptTarget.kind === 'house') {
      void enterHouse()
      return
    }
    if (promptTarget.kind === 'garage') {
      void enterGarage()
      return
    }
    if (promptTarget.kind === 'arena') {
      readArenaNotice()
      return
    }
    if (promptTarget.kind === 'heart') {
      shatterHeart(promptTarget.spot)
      return
    }
    if (promptTarget.kind === 'league') {
      if (hunt?.active) {
        sound.cue('deny')
        hint.show([HARVEST_LOCK], HINT_DURATION)
        return
      }
      void enterLeague()
      return
    }
    if (promptTarget.kind === 'hall') {
      activateHall(promptTarget.spot)
      return
    }
    if (promptTarget.kind === 'master') {
      talkToMaster(promptTarget.master)
      return
    }
    if (promptTarget.kind === 'rival') {
      talkToRival(promptTarget.rival)
      return
    }
    if (promptTarget.kind === 'companion') {
      greetCompanion()
      return
    }
    if (promptTarget.kind === 'clearing') {
      openClearing(promptTarget.clearing)
      return
    }
    if (promptTarget.kind === 'camp') {
      openCache(promptTarget.camp)
      return
    }
    if (!combat.offerSite(promptTarget.site)) {
      hint.show([`Vença a próxima luta na ${LEAGUE.name} para liberar esta missão`], HINT_DURATION)
    }
  }

  function ensureLeague(): League | null {
    if (league) return league
    if (!scene || !composer || !loaded) return null
    league = createLeague({ composer, pilot: loaded.pilot, atlas: loaded.props, scene })
    return league
  }

  function restoreOutdoors() {
    if (!scene || !map || !city) return
    inside = false
    enterSpace(null)
    scene.setWorld(map, city, true)
    scene.townsfolk = town?.actors ?? []
    scene.ambient = outdoorAmbient
    cameraFocus = null
  }

  async function enterLeague() {
    if (stage !== 'play' || transitioning || inside || !scene || !progress || combat?.active || hunt?.active) return
    const hall = ensureLeague()
    if (!hall) return
    const saved = progress
    sound.unlock()
    sound.cue('door')
    combat?.setIdle(false)
    joystick.setEnabled(false)
    const firstVisit = saved.story.visits === 0
    await transition(() => {
      if (!scene) return
      inside = true
      enterSpace(hall.space)
      outdoorAmbient = scene.ambient
      scene.ambient = LEAGUE_AMBIENT
      scene.setWorld(hall.layer, hall.city, false)
      scene.townsfolk = hall.crowd.actors
      hall.crowd.setGone(saved.story.finale !== 'none')
      placeParty(ENTRY[0], ENTRY[1], 'n')
      saved.story.visits += 1
      saveProgress(saved)
      chatterTimer = 2.5
    })
    if (destroyed) return
    joystick.setEnabled(true)
    combat?.setIdle(true)
    canvas.setAttribute('aria-label', LEAGUE_LABEL)
    hud.greet({ id: 'league', name: LEAGUE_NAME, type: 'city', position: ENTRY, labelPosition: ENTRY, description: LEAGUE_SUBTITLE })
    overlay.describe(`Dentro da ${LEAGUE_NAME}. Mesas, apostadores, dois ringues de exibição e o ringue principal no fim do tapete vermelho.`)
    if (firstVisit) hint.show(['Siga o tapete vermelho até o ringue principal para desafiar a trilha'], HINT_DURATION)
  }

  async function leaveLeague() {
    if (stage !== 'play' || transitioning || !inside || combat?.active) return
    sound.cue('door')
    combat?.setIdle(false)
    joystick.setEnabled(false)
    await transition(() => {
      restoreOutdoors()
      placeParty(LEAGUE.exit[0], LEAGUE.exit[1], 's')
      regionId = null
      regionTimer = 0.6
    })
    if (destroyed) return
    joystick.setEnabled(true)
    combat?.setIdle(true)
    canvas.setAttribute('aria-label', PLAY_LABEL)
    overlay.describe('De volta à rua, em frente à porta vermelha da Liga.')
  }

  function showHallPrompt(spot: LeagueSpot) {
    if (!progress) return
    if (spot === 'exit') {
      prompt.show({ kicker: 'Porta da frente', title: 'Voltar à cidade', action: 'Sair', kind: 'house' })
      return
    }
    if (spot === 'ring') {
      const next = nextMainMission(progress)
      prompt.show({ kicker: `Ringue Principal · ${next.boss ? 'Campeão' : 'Nível'} ${currentLevel(progress)}`, title: next.title, action: 'Desafiar', kind: 'arena' })
      return
    }
    if (spot === 'bar') {
      prompt.show({ kicker: 'Bar do Tião', title: 'Tião', action: 'Conversar', kind: 'master' })
      return
    }
    if (spot === 'booth') {
      prompt.show({ kicker: 'Banca de Apostas', title: 'Lutas de exibição', action: `Apostar ${BET_PRICE} ¢`, kind: 'site' })
      return
    }
    if (spot === 'vendor') {
      prompt.show({ kicker: 'Sucata & Segredos', title: 'Vendedor clandestino', action: 'Ver peças', kind: 'shop' })
      return
    }
    const { story } = progress
    const gone = story.finale !== 'none'
    prompt.show({
      kicker: 'Mesa do canto',
      title: gone ? 'Mesa vazia' : story.overheard ? 'Os Forasteiros' : 'Forasteiros',
      action: gone || story.overheard ? 'Observar' : 'Chegar mais perto',
      kind: 'rival',
    })
  }

  function activateHall(spot: LeagueSpot) {
    if (!combat || !league) return
    if (spot === 'exit') void leaveLeague()
    else if (spot === 'ring') combat.offerTrail(league.ring)
    else if (spot === 'bar') talkToBartender()
    else if (spot === 'booth') placeBet()
    else if (spot === 'vendor') openVendor()
    else approachForasteiros()
  }

  function readArenaNotice() {
    beginTalk()
    sound.cue('select')
    dialogue.start(
      { name: ARENA.name, kicker: 'Aviso pregado no portão', accent: 'league', portrait: null },
      [
        { text: 'FECHADA PARA REFORMA. Por ordem da prefeitura, a arena pública não recebe lutas até segunda ordem.', kicker: 'Aviso' },
        { text: 'Embaixo, a lápis, outra letra: "As lutas de verdade são na porta vermelha, leste da Oficina. Pergunte pelo Tião."', kicker: 'Rabisco' },
      ],
      () => endTalk(),
    )
  }

  function talkToBartender() {
    if (!progress || !league) return
    const saved = progress
    beginTalk()
    sound.cue('select')
    const speaker = { name: 'Tião', kicker: 'Bar do Tião · dono da casa', accent: 'league' as const, portrait: league.crowd.portrait('bartender') }
    dialogue.start(
      speaker,
      bartenderPages(saved, () => dialogue.show(BARTENDER_ANSWER)),
      () => endTalk(),
    )
  }

  function placeBet() {
    if (!progress || !league) return
    const saved = progress
    beginTalk()
    sound.cue('select')
    const speaker = { name: 'Banca de Apostas', kicker: 'Lutas de exibição · ringues laterais', accent: 'league' as const, portrait: league.crowd.portrait('bookie') }
    if (performance.now() < betReadyAt) {
      dialogue.start(speaker, [{ text: 'Calma, a próxima luta ainda não começou. Volte daqui a pouco.' }], () => endTalk())
      return
    }
    const bet = (side: 'oeste' | 'leste') => {
      if (saved.credits < BET_PRICE) {
        sound.cue('deny')
        dialogue.show([{ text: `Sessenta fichas, piloto. Você tem ${formatCredits(saved.credits)}. A banca não fia.` }])
        return
      }
      saved.credits -= BET_PRICE
      betReadyAt = performance.now() + BET_COOLDOWN
      const won = Math.random() < BET_ODDS
      if (won) saved.credits += BET_PRIZE
      saveProgress(saved)
      sound.cue(won ? 'coin' : 'deny')
      dialogue.show([
        { text: `Sino! O ringue ${side} ferve. Golpe, guarda, contragolpe... e cai um.`, kicker: 'A luta' },
        won
          ? { text: `O seu levou a melhor. ${BET_PRIZE} fichas, conta aí. Não gasta tudo no Sucata.`, kicker: `+${formatCredits(BET_PRIZE)} ¢` }
          : { text: 'Caiu o seu. A banca agradece a visita.', kicker: `-${formatCredits(BET_PRICE)} ¢` },
      ])
      overlay.describe(won ? `Aposta vencida: ${BET_PRIZE} créditos.` : `Aposta perdida: ${BET_PRICE} créditos.`)
    }
    dialogue.start(
      speaker,
      [
        {
          text: `Ringue oeste ou leste? ${BET_PRICE} fichas, paga ${BET_PRIZE} se o seu ficar de pé.`,
          choices: [
            { label: 'Oeste', note: `${BET_PRICE} ¢`, pick: () => bet('oeste') },
            { label: 'Leste', note: `${BET_PRICE} ¢`, pick: () => bet('leste') },
            { label: 'Só olhando', pick: () => dialogue.close() },
          ],
        },
      ],
      () => endTalk(),
    )
  }

  function openVendor() {
    if (!progress || !league || !composer) return
    const saved = progress
    const art = composer
    beginTalk()
    sound.cue('select')
    const speaker = { name: 'Sucata & Segredos', kicker: 'Vendedor clandestino · peças sem nota', accent: 'league' as const, portrait: league.crowd.portrait('vendor') }
    const stock = vendorStock(saved)
    if (!stock.length) {
      dialogue.start(speaker, [{ text: 'Hoje não chegou nada. Volta depois de uma luta; a sucata boa aparece de noite.' }], () => endTalk())
      return
    }
    let bought: { name: string; id: string } | null = null
    const offer = (): TalkPage => ({
      text: 'Procedência discreta, preço justo. O que entra no seu depósito, ninguém pergunta de onde veio.',
      choices: [
        ...vendorStock(saved).map((part) => ({
          label: part.name,
          note: `${formatCredits(part.price)} ¢`,
          disabled: saved.credits < part.price,
          pick: () => {
            saved.credits -= part.price
            saved.owned.push(part.id)
            saveProgress(saved)
            bought = { name: part.name, id: part.id }
            sound.cue('buy')
            dialogue.show([
              { text: `${part.name}. ${part.description}`, kicker: 'Peça exclusiva', portrait: cellCanvas(art, part.id, part.name, 'shop-cell', REVEAL_ICON) },
              { text: 'Já está no seu depósito. Equipa pela estante de casa e não conta pra ninguém.', choices: [{ label: 'Ver mais', pick: () => dialogue.show([offer()]) }, { label: 'Até mais', pick: () => dialogue.close() }] },
            ])
            overlay.describe(`${part.name} comprada por ${part.price} créditos.`)
          },
        })),
        { label: 'Só olhando', pick: () => dialogue.close() },
      ],
    })
    dialogue.start(speaker, [offer()], () => endTalk(bought ? { emblem: 'secret', kicker: 'Sucata & Segredos', name: bought.name } : undefined))
  }

  function approachForasteiros() {
    if (!progress || !league) return
    const { story } = progress
    if (!story.overheard && story.finale === 'none' && story.visits >= OVERHEAR_VISIT) {
      playOverheard()
      return
    }
    beginTalk()
    sound.cue('select')
    const gone = story.beats.includes('empty-table') || story.finale !== 'none'
    dialogue.start(
      { name: gone ? 'Mesa vazia' : 'Forasteiros', kicker: 'Mesa do canto', accent: 'visitor', portrait: gone ? null : league.crowd.portrait('forasteiros') },
      gone ? FORASTEIROS_GONE : story.overheard ? FORASTEIROS_AFTER : FORASTEIROS_NEAR,
      () => endTalk(),
    )
  }

  function playOverheard() {
    if (!progress || !league || !scene) return
    const saved = progress
    beginTalk()
    sceneRunning = true
    joystick.setEnabled(false)
    const table = league.crowd.forasteiro(2)
    cameraFocus = [(table[0] + player.x) / 2, (table[1] + player.y) / 2 - 40]
    player.place(player.x, player.y, table[0] < player.x ? 'w' : 'e')
    sound.cue('heartbeat')
    dialogue.start({ name: 'Vozes baixas', kicker: 'Mesa do canto', accent: 'visitor', portrait: league.crowd.portrait('forasteiros') }, OVERHEARD, () => {
      saved.story.overheard = true
      saved.story.winsSince = 0
      saveProgress(saved)
      sceneRunning = false
      cameraFocus = null
      joystick.setEnabled(true)
      sound.stopCue('heartbeat')
      endTalk({ emblem: 'secret', kicker: VISITANTES_TITLE, name: 'A Conversa' })
      bubble.say('...bip.', () => ({ x: robot.x, y: robot.y }), BUBBLE_LIFT)
      overlay.describe('Você ouviu o plano dos Forasteiros. A partir de agora, cada luta da trilha é contra um robô deles.')
      hint.show(['As próximas lutas da trilha são contra os robôs dos Forasteiros'], HINT_DURATION)
    })
  }

  function playBeat(beat: Beat) {
    if (!progress || !league) return
    const saved = progress
    beginTalk()
    sound.cue(beat.speaker === 'robot' ? 'ready' : 'select')
    const speakers = {
      tiao: { name: 'Tião', kicker: 'Bar do Tião', accent: 'league' as const, portrait: league.crowd.portrait('bartender') },
      forasteira: { name: 'A forasteira', kicker: 'Mesa do canto', accent: 'visitor' as const, portrait: league.crowd.portrait('forasteiros') },
      robot: { name: BODY_NAME, kicker: 'Seu robô', accent: 'rival' as const, portrait: robotSheets ? robotPortraitCanvas(robotSheets) : null },
      note: { name: 'Bilhete', kicker: 'Achado no ringue', accent: 'visitor' as const, portrait: null },
    }
    dialogue.start(speakers[beat.speaker], beat.pages, () => {
      markBeat(saved, beat)
      saveProgress(saved)
      endTalk(beat.toast ? { emblem: 'secret', kicker: beat.toast.kicker, name: beat.toast.name } : undefined)
    })
  }

  function riseDust(x: number, y: number) {
    if (!scene) return
    for (let index = 0; index < 64; index++) {
      scene.particles.spawn({
        x: x + (Math.random() - 0.5) * 300,
        y: y + (Math.random() - 0.5) * 140,
        vx: (Math.random() - 0.5) * 40,
        rise: 90 + Math.random() * 170,
        wobble: 40,
        life: 1.8 + Math.random() * 1.8,
        size: 14 + Math.random() * 20,
        sizeEnd: 3,
        alpha: 0.9,
        fadeIn: 0.15,
        sprite: sparkSprite,
        blend: 'add',
      })
    }
    scene.addRing(x, y, 560, 0.9, 0.6, true)
  }

  function playUnmasking(mission: Mission) {
    if (!progress || !league || !scene) return
    const saved = progress
    const hall = league
    const hallScene = scene
    beginTalk()
    hud.dismissGreeting()
    sceneRunning = true
    joystick.setEnabled(false)
    sound.cue('heartbeat')
    const [ringX, ringY] = hall.ring.center
    const table = hall.crowd.forasteiro(2)
    const face = hall.crowd.portrait('forasteiros')
    const shots = {
      ring: () => {
        cameraFocus = [ringX, ringY]
        flicker = UNMASK_FLICKER
        riseDust(ringX, ringY)
        sound.cue('shadow')
      },
      table: () => {
        cameraFocus = [table[0], table[1] - 50]
      },
      door: () => {
        cameraFocus = [(DOOR.x0 + DOOR.x1) / 2, DOOR.y - 300]
        hall.crowd.depart()
        flicker = UNMASK_FLICKER
        sound.cue('door')
      },
      robot: () => {
        cameraFocus = [(robot.x + player.x) / 2, (robot.y + player.y) / 2 - 40]
        hallScene.companionGlow = 0.85
        sound.cue('warp')
      },
    }
    const voices: FinaleVoices = {
      tiao: { name: 'Tião', kicker: 'Bar do Tião', portrait: hall.crowd.portrait('bartender') },
      forasteira: { name: 'A forasteira', kicker: 'De óculos escuros', portrait: face },
      alto: { name: 'O forasteiro alto', kicker: 'Mesa do canto', portrait: face },
      baixo: { name: 'O forasteiro baixo', kicker: 'Mesa do canto', portrait: face },
      robot: { name: BODY_NAME, kicker: 'Seu robô', portrait: robotSheets ? robotPortraitCanvas(robotSheets) : null },
      radio: { name: 'Sinal no cristal', kicker: 'Frequência dos Visitantes', portrait: null },
      scene: { name: LEAGUE_NAME, kicker: FINALE_TITLE, portrait: null },
    }
    dialogue.start(
      { name: LEAGUE_NAME, kicker: FINALE_TITLE, accent: 'visitor', portrait: null },
      unmaskedPages({ herald: mission.boss === 'arauto', overheard: saved.story.overheard, voices, shots }),
      () => {
        saved.story.finale = 'hunt'
        saved.story.hunt = createHuntState()
        saveProgress(saved)
        sound.stopCue('heartbeat')
        hallScene.companionGlow = 0
        flicker = 0
        overlay.describe('Os Visitantes revelaram o plano: nove corações escondidos na floresta mantêm a Máquina viva. A Colheita começou.')
        void startHarvest()
      },
    )
  }

  async function startHarvest() {
    if (!scene || !finaleDeps || !hunt) return
    const deps = finaleDeps
    sceneRunning = false
    cameraFocus = null
    combat?.setIdle(false)
    joystick.setEnabled(false)
    sound.cue('door')
    await transition(() => {
      restoreOutdoors()
      placeParty(HUNT_START[0], HUNT_START[1], 's')
      regionId = null
      sound.bed('night')
      playCinema(harvestScript(deps, HUNT_START), () => beginHunt('start'))
    })
  }

  function beginHunt(kind: 'start' | 'resume' | 'retry', fresh = true) {
    if (!hunt || !progress?.story.hunt) return
    collapsing = false
    if (fresh) hunt.begin()
    surface.dataset.harvest = 'on'
    stage = 'play'
    overlay.setPhase('done')
    overlay.setBars(0)
    joystick.setEnabled(true)
    combat?.setIdle(true)
    sound.bed('night')
    canvas.setAttribute('aria-label', HARVEST_LABEL)
    hunt.announce(kind)
    objectiveTimer = 0
    regionTimer = 1.2
    resetClock()
  }

  function resumeHunt() {
    placeParty(HUNT_START[0], HUNT_START[1], 's')
    beginHunt('resume')
  }

  function shatterHeart(spot: HeartSpot) {
    if (!hunt) return
    const started = hunt.shatter(spot.index, (all) => {
      cameraFocus = null
      if (all) finishHunt()
    })
    if (!started) return
    prompt.hide()
    promptTarget = null
    hint.hide()
    cameraFocus = [spot.x, spot.y - 90]
    overlay.describe(`Quebrando o coração da ${spot.name}.`)
  }

  function finishHunt() {
    if (!progress || !hunt || !finaleDeps) return
    const saved = progress
    const deps = finaleDeps
    const left = saved.story.hunt?.left ?? 0
    saved.story.finale = 'won'
    saveProgress(saved)
    const last = hunt.lastBroken
    surface.dataset.harvest = 'off'
    playCinema(
      endingScript(deps, last, () => hunt?.end()),
      () => rollCredits(`Os nove corações caíram com ${clockText(left)} de sobra no relógio da Colheita.`),
    )
  }

  function rollCredits(summary: string) {
    if (!finaleDeps) return
    applyAftermath()
    playCinema(creditsScript(finaleDeps), () => undefined)
    overlay.setPhase('done')
    credits.play(summary, () => void returnToTown())
  }

  async function returnToTown() {
    if (!scene) return
    await fade.cover()
    if (destroyed) return
    const running = cinema
    cinemaDone = null
    cinema = null
    running?.skip()
    scene.companionGlow = 0
    scene.lights.length = 0
    placeParty(HOME_START[0], HOME_START[1], 's')
    stage = 'play'
    overlay.setPhase('done')
    overlay.setBars(0)
    overlay.hideCaption()
    overlay.hideLine()
    joystick.setEnabled(true)
    combat?.setIdle(true)
    sound.bed('day')
    applyAftermath()
    canvas.setAttribute('aria-label', PLAY_LABEL)
    regionId = null
    regionTimer = 1.2
    resetClock()
    render(performance.now())
    await fade.clear()
    toast.show({ icon: emblemIcon('crest'), kicker: AFTERMATH.kicker, name: AFTERMATH.name })
    hint.show([AFTERMATH.hint], HINT_DURATION)
    overlay.describe(`${AFTERMATH.name}. ${AFTERMATH.hint}.`)
  }

  function collapse() {
    if (!hunt || !finaleDeps || collapsing) return
    const deps = finaleDeps
    const broken = hunt.broken
    collapsing = true
    combat?.abort()
    dialogue.close()
    bubble.hide()
    prompt.hide()
    promptTarget = null
    hint.hide()
    cameraFocus = null
    if (inside) restoreOutdoors()
    const back: Point = [player.x, player.y]
    playCinema(fallScript(deps, back), () => {
      stage = 'fall'
      overlay.setPhase('done')
      overlay.setBars(0)
      fall.show(broken)
      overlay.describe(`A Colheita terminou. ${broken} de ${HEART_COUNT} corações quebrados. Tentar de novo ou voltar ao título.`)
    })
  }

  async function retryHarvest() {
    if (!hunt || !fall.open) return
    fall.hide()
    await fade.cover()
    if (destroyed) return
    cinema = null
    cinemaDone = null
    hunt.reset()
    placeParty(HUNT_START[0], HUNT_START[1], 's')
    beginHunt('retry', false)
    render(performance.now())
    await fade.clear()
  }

  function fallToTitle() {
    if (!hunt || !progress || !fall.open) return
    fall.hide()
    const state = progress.story.hunt
    if (state) {
      state.left = state.total
      state.cleared = []
      state.broken = []
    }
    saveProgress(progress)
    hunt.end()
    surface.dataset.harvest = 'off'
    collapsing = false
    cinema = null
    cinemaDone = null
    hint.hide()
    bubble.hide()
    combat?.setIdle(false)
    placeParty(HOME_START[0], HOME_START[1], 's')
    regionId = null
    stage = 'title'
    overlay.setPhase('title')
    sound.bed('night')
    canvas.setAttribute('aria-label', `${GAME_TITLE}: menu inicial.`)
    menu?.showTitle(saveSummary())
    titleShownAt = performance.now()
    render(titleShownAt)
  }

  function playCinema(script: CinemaScript, done: () => void) {
    if (!scene) return
    cinema = new Cinema(scene, script)
    cinemaDone = done
    stage = 'cinema'
    skipHold = 0
    heldSkipKeys.clear()
    overlay.setSkipProgress(0)
    overlay.setPhase('playing')
    joystick.setEnabled(false)
    prompt.hide()
    promptTarget = null
    hint.hide()
    bubble.hide()
    combat?.setIdle(false)
    resetClock()
  }

  function applyAftermath() {
    if (!scene) return
    const won = progress?.story.finale === 'won' && !(hunt?.active ?? false)
    if (won) scene.storyGlow = seedGlow
    else if (scene.storyGlow === seedGlow) scene.storyGlow = null
  }

  function robotPortraitCanvas(sheets: RobotSheets): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context2d = canvas.getContext('2d')
    if (context2d) {
      context2d.imageSmoothingEnabled = false
      context2d.drawImage(sheets.idle, 8, 2, 32, 32, 0, 0, 32, 32)
    }
    canvas.className = 'talk-portrait-art'
    return canvas
  }

  function smokeChimneys(dt: number) {
    if (!scene) return
    for (const site of SITES) {
      for (const [x, y] of site.chimneys) {
        if (Math.abs(camera.x - x) > CHIMNEY_RANGE.x || Math.abs(camera.y - y) > CHIMNEY_RANGE.y) continue
        if (Math.random() >= dt * 2.4) continue
        scene.particles.spawn({
          x: x + (Math.random() - 0.5) * 14,
          y,
          vx: 16 + Math.random() * 20,
          rise: 55 + Math.random() * 35,
          life: 2.4 + Math.random() * 1.4,
          size: 30,
          sizeEnd: 150 + Math.random() * 70,
          alpha: 0.34,
          fadeIn: 0.25,
          sprite: steamSprites[Math.floor(Math.random() * steamSprites.length)],
          blend: 'haze',
        })
      }
    }
  }

  function startIntro() {
    if (stage !== 'title' || !scene) return
    sound.unlock()
    stage = 'intro'

    scene.heroKind = 'pilot'
    scene.companion = robot
    if (town) town.visible = false
    const seek = INTRO_SEEK.exec(window.location.hash)
    if (seek) director?.seek(Number(seek[2]))
    overlay.setPhase('playing')
    resetClock()
    lowSamples = 0
    settleUntil = Math.max(settleUntil, performance.now() + INTRO_SETTLE_MS)
  }

  function finishIntro() {
    stage = 'play'
    sky?.release()
    joystick.setEnabled(true)
    overlay.setPhase('done')
    overlay.setBars(0)
    if (scene) {
      scene.heroKind = 'pilot'
      scene.companion = robot
    }
    const teleport = TELEPORT.exec(window.location.hash)
    if (teleport) placeParty(Number(teleport[1]), Number(teleport[2]), 's')
    camera.x = player.x
    camera.y = player.y
    camera.follow(player, 0, view, true)
    canvas.setAttribute('aria-label', PLAY_LABEL)
    overlay.describe('O robô agora segue você. Vocês estão livres para caminhar.')
    hint.show(
      touchFirst
        ? ['Toque e arraste à esquerda para caminhar']
        : ['Use ', key(labelFor('up')), key(labelFor('left')), key(labelFor('down')), key(labelFor('right')), ' ou as setas para caminhar'],
      HINT_DURATION,
    )
    awaitingFirstMove = true
    combat?.setIdle(true)
    regionId = null
    regionTimer = 1.2
    if (progress?.story.finale === 'hunt' && progress.story.hunt) resumeHunt()
    else applyAftermath()
  }

  async function enterShop() {
    if (stage !== 'play' || transitioning || !shop || combat?.active) return
    transitioning = true
    visitedShop = true
    prompt.hide()
    promptTarget = null
    hint.hide()
    combat?.setIdle(false)
    joystick.setEnabled(false)
    sound.unlock()
    sound.cue('door')
    await fade.cover()
    if (destroyed) return
    stage = 'shop'
    shop.show()
    canvas.setAttribute('aria-label', SHOP_LABEL)
    overlay.describe(`Dentro da ${SHOP.name}. Escolha uma prateleira para ver as peças.`)
    await fade.clear()
    transitioning = false
  }

  async function leaveShop() {
    if (stage !== 'shop' || transitioning || !shop) return
    transitioning = true
    sound.cue('door')
    await fade.cover()
    if (destroyed) return
    shop.hide()
    placeParty(SHOP.exit[0], SHOP.exit[1], 's')
    stage = 'play'
    joystick.setEnabled(true)
    canvas.setAttribute('aria-label', PLAY_LABEL)
    overlay.describe('De volta à praça, em frente à Oficina.')
    resetClock()
    render(performance.now())
    await fade.clear()
    transitioning = false
    combat?.setIdle(true)
  }

  async function enterHouse() {
    if (stage !== 'play' || transitioning || !house || !progress || combat?.active) return
    transitioning = true
    prompt.hide()
    promptTarget = null
    hint.hide()
    combat?.setIdle(false)
    joystick.setEnabled(false)
    sound.unlock()
    sound.cue('door')
    if (!progress.homeVisited) {
      progress.homeVisited = true
      saveProgress(progress)
    }
    await fade.cover()
    if (destroyed) return
    stage = 'house'
    house.show()
    canvas.setAttribute('aria-label', HOUSE_LABEL)
    overlay.describe(`Dentro da ${HOUSE.name}. A bancada melhora as peças, a estante guarda as secretas e a cápsula repara o desgaste das lutas.`)
    await fade.clear()
    transitioning = false
  }

  async function leaveHouse() {
    if (stage !== 'house' || transitioning || !house) return
    transitioning = true
    sound.cue('door')
    await fade.cover()
    if (destroyed) return
    house.hide()
    placeParty(HOUSE.exit[0], HOUSE.exit[1], 's')
    stage = 'play'
    joystick.setEnabled(true)
    canvas.setAttribute('aria-label', PLAY_LABEL)
    overlay.describe('De volta ao parque, em frente à sua casa.')
    resetClock()
    render(performance.now())
    await fade.clear()
    transitioning = false
    combat?.setIdle(true)
  }

  async function enterGarage() {
    if (stage !== 'play' || transitioning || !garage || !progress || combat?.active) return
    transitioning = true
    prompt.hide()
    promptTarget = null
    hint.hide()
    combat?.setIdle(false)
    joystick.setEnabled(false)
    sound.unlock()
    sound.cue('door')
    await fade.cover()
    if (destroyed) return
    stage = 'garage'
    garage.show()
    canvas.setAttribute('aria-label', GARAGE_LABEL)
    overlay.describe(`Dentro da ${GARAGE.name}. Charles grava chips no núcleo, Sid mistura fragmentos e James monta armas no chassi.`)
    await fade.clear()
    transitioning = false
  }

  async function leaveGarage() {
    if (stage !== 'garage' || transitioning || !garage) return
    transitioning = true
    sound.cue('door')
    await fade.cover()
    if (destroyed) return
    garage.hide()
    placeParty(GARAGE.exit[0], GARAGE.exit[1], 's')
    stage = 'play'
    joystick.setEnabled(true)
    canvas.setAttribute('aria-label', PLAY_LABEL)
    overlay.describe(`De volta à ${GARAGE.district}, em frente à ${GARAGE.name}.`)
    resetClock()
    render(performance.now())
    await fade.clear()
    transitioning = false
    combat?.setIdle(true)
  }

  function pickUpSecret() {
    if (!progress || !scene || !composer) return
    const spot = secretSpotAt(player.x, player.y)
    if (!spot || progress.spots.includes(spot.id) || !secretSpotUnlocked(spot, progress.missions.main)) return
    const part = collectSpot(progress, spot.id)
    if (!part) return
    saveProgress(progress)
    sound.cue('buy')
    toast.show({ icon: cellCanvas(composer, part.id, part.name, 'shop-cell', FIND_ICON), kicker: 'Peça secreta encontrada', name: part.name })
    overlay.describe(`Peça secreta encontrada: ${part.name}. Ela já está no seu depósito.`)
    for (let index = 0; index < 14; index++) {
      const angle = (index / 14) * Math.PI * 2
      scene.particles.spawn({
        x: spot.at[0] + Math.cos(angle) * 6,
        y: spot.at[1] - 10,
        vx: Math.cos(angle) * (30 + Math.random() * 30),
        rise: 70 + Math.random() * 60,
        life: 0.7 + Math.random() * 0.5,
        size: 26,
        sizeEnd: 4,
        alpha: 0.9,
        fadeIn: 0,
        sprite: sparkSprite,
        blend: 'add',
      })
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.isComposing || event.keyCode === 229) return
    if (event.code === 'KeyM' && stage !== 'loading' && !event.repeat) {
      settings.set('muted', !settings.value.muted)
      return
    }
    sound.unlock()
    if (menu?.open) {
      if (menu.handleKey(event)) event.preventDefault()
      return
    }
    if (stage === 'title') {
      if (!IGNORED_KEYS.test(event.code)) event.preventDefault()
      return
    }
    if (stage === 'intro') {
      overlay.revealSkip()
      if (SKIP_KEYS.has(event.code)) {
        event.preventDefault()
        heldSkipKeys.add(event.code)
      }
      return
    }
    if (stage === 'cinema') {
      if (credits.open) {
        if (credits.handleKey(event)) event.preventDefault()
        return
      }
      overlay.revealSkip()
      if (SKIP_KEYS.has(event.code)) {
        event.preventDefault()
        heldSkipKeys.add(event.code)
      }
      return
    }
    if (stage === 'fall') {
      if (fall.handleKey(event)) event.preventDefault()
      return
    }
    if (stage === 'play' && dialogue.open) {
      if (dialogue.handleKey(event)) event.preventDefault()
      return
    }
    if (stage === 'play' && combat && combat.handleKey(event)) {
      event.preventDefault()
      return
    }
    const action = actionFor(event.code)
    if (stage === 'play' && (event.code === 'Escape' || action === 'pause') && !event.repeat) {
      event.preventDefault()
      openPause()
      return
    }
    if (stage === 'play' && action === 'interact' && !event.repeat && prompt.visible) {
      event.preventDefault()
      activatePrompt()
      return
    }
    if (stage === 'shop' && shop && !transitioning && !event.repeat) {
      if (shop.handleKey(panelKey(event, 'KeyE'))) event.preventDefault()
    }
    if (stage === 'house' && house && !transitioning && !event.repeat) {
      if (house.handleKey(panelKey(event, 'KeyE'))) event.preventDefault()
    }
    if (stage === 'garage' && garage && !transitioning) {
      if (garage.handleKey(panelKey(event, 'KeyE'))) event.preventDefault()
    }
  }
  function onKeyUp(event: KeyboardEvent) {
    heldSkipKeys.delete(event.code)
    menu?.handleKeyUp(event)
    combat?.handleKeyUp(event)
    if (credits.open) credits.handleKeyUp(event)
    if (stage === 'shop') shop?.handleKeyUp(event)
    if (stage === 'house') house?.handleKeyUp(event)
    if (stage === 'garage') garage?.handleKeyUp(panelKey(event, 'KeyE'))
  }
  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') surface.dataset.touch = 'true'
    else if (event.pointerType === 'mouse') surface.dataset.touch = 'false'
    if (stage === 'intro' || (stage === 'cinema' && !credits.open)) overlay.revealSkip()
  }
  function onPointerUp() {
    if (stage !== 'loading') sound.unlock()
  }
  function onBlur() {
    heldSkipKeys.clear()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  surface.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)

  animation = requestAnimationFrame(tick)

  const probe = { long: 0, maxGap: 0, cpu: 0, maxCpu: 0 }
  function tick(now: number) {
    const elapsed = Math.max(0, (now - previous) / 1000)
    previous = now
    if (elapsed > 0.02) probe.long++
    probe.maxGap = Math.max(probe.maxGap, elapsed * 1000)
    const cpuStart = performance.now()
    update(elapsed, now)
    if (canvasVisible(now)) {
      render(now)
      drawnFrames++
    }
    const cpu = performance.now() - cpuStart
    probe.cpu += cpu
    probe.maxCpu = Math.max(probe.maxCpu, cpu)
    sampleFps(now)
    animation = requestAnimationFrame(tick)
  }

  function canvasVisible(now: number) {
    if (paused || stage === 'fall') return false
    if (stage === 'title' && menu?.open) return now - titleShownAt < TITLE_FADE_MS
    cardOpenSince = combat?.cardOpen ? cardOpenSince || now : 0
    if (cardOpenSince) return now - cardOpenSince < CARD_FADE_MS
    return true
  }

  function sampleFps(now: number) {
    fpsFrames++
    if (now - fpsSince < FPS_SAMPLE_MS) return
    const fps = Math.round((fpsFrames * 1000) / (now - fpsSince))
    const frames = Math.max(1, fpsFrames)
    const drewEveryFrame = drawnFrames >= fpsFrames
    fpsFrames = 0
    drawnFrames = 0
    fpsSince = now
    if (settings.value.fps && stage === 'play') hud.setFps(fps)
    if (/probe/.test(window.location.hash)) {
      const stages = scene?.profiler.report() ?? ''
      console.log(
        `[v0] fps ${stage} t=${(director?.time ?? 0).toFixed(1)} scale=${renderScale} ${fps} long=${probe.long} gap=${probe.maxGap.toFixed(0)} cpu=${(probe.cpu / frames).toFixed(1)}/${probe.maxCpu.toFixed(1)}${stages ? ' | ' + stages : ''}`,
      )
    }
    probe.long = 0
    probe.maxGap = 0
    probe.cpu = 0
    probe.maxCpu = 0
    adaptResolution(fps, now, drewEveryFrame)
  }

  function update(elapsed: number, now: number) {
    const dt = Math.min(MAX_STEP, elapsed)
    const confirm = readGamepadConfirm()
    const confirmPressed = confirm && !confirmWasHeld
    const confirmReleased = !confirm && confirmWasHeld
    confirmWasHeld = confirm
    if (!map || !scene || !director || !shop) return
    hud.setVisible(stage === 'play' && !paused && !(combat?.active ?? false))
    if (hunt) {
      hunt.showHud(hunt.active && stage === 'play' && !paused && !collapsing)
      const harvest = hunt.active ? 'on' : 'off'
      if (surface.dataset.harvest !== harvest) surface.dataset.harvest = harvest
    }

    if (stage === 'title') {
      if (confirmPressed) menu?.confirm()
      map.stream(director.lens(view), view.width, view.height)
      return
    }

    if (paused) {
      if (confirmPressed) menu?.confirm()
      return
    }

    if (stage === 'intro') {
      if (confirmPressed) overlay.revealSkip()
      const holding = heldSkipKeys.size > 0 || overlay.skipHeld || confirm
      skipHold = holding ? skipHold + dt : Math.max(0, skipHold - dt * 3)
      overlay.setSkipProgress(skipHold / SKIP_HOLD)
      if (skipHold >= SKIP_HOLD) {
        skipHold = 0
        overlay.setSkipProgress(0)
        director.skip()
      } else {
        director.update(Math.min(MAX_INTRO_STEP, elapsed), view)
      }
      map.stream(director.lens(view), view.width, view.height)
      if (director.finished) finishIntro()
      return
    }

    if (stage === 'cinema') {
      const active = cinema
      if (!active) return
      if (credits.open) {
        if (confirmPressed) {
          credits.confirm()
          credits.hold(true)
        } else if (confirmReleased) credits.hold(false)
      } else {
        if (confirmPressed) overlay.revealSkip()
        const holding = heldSkipKeys.size > 0 || overlay.skipHeld || confirm
        skipHold = holding ? skipHold + dt : Math.max(0, skipHold - dt * 3)
        overlay.setSkipProgress(skipHold / SKIP_HOLD)
        if (skipHold >= SKIP_HOLD) {
          skipHold = 0
          overlay.setSkipProgress(0)
          active.skip()
        }
      }
      if (!active.finished) active.update(Math.min(MAX_INTRO_STEP, elapsed))
      map.stream(active.lens(view), view.width, view.height)
      if (active.finished && cinema === active) {
        cinema = null
        const done = cinemaDone
        cinemaDone = null
        done?.()
      }
      return
    }

    if (stage === 'fall') {
      if (confirmPressed) fall.confirm()
      return
    }

    if (stage === 'shop') {
      shop.tick(dt)
      return
    }

    if (stage === 'house') {
      house?.tick(dt)
      return
    }

    if (stage === 'garage') {
      garage?.tick(dt)
      return
    }

    const talking = dialogue.open
    const breaking = hunt?.busy ?? false
    const blocked = transitioning || talking || breaking || (combat?.blocksMovement ?? false)
    const movement = blocked ? mergeMovement() : mergeMovement(keyboard.read(), joystick.read(), readGamepad())
    if (combat?.cardOpen && confirmPressed) combat.confirm()
    if (talking && confirmPressed) dialogue.confirm()
    const mouse = readMouse()
    if (town) town.visible = !inside && !(combat?.active ?? false)
    if (inside) league?.crowd.update(dt, player)
    sceneBars = Math.min(1, Math.max(0, sceneBars + (sceneRunning ? dt * 1.6 : -dt * 2)))
    if (combat?.active) {
      if (prompt.visible) prompt.hide()
      promptTarget = null
      idleTime = 0
      combat.update(dt, movement, view, blocked ? NO_MOUSE : mouse)
      companion.watch(player)
    } else {
      player.update(dt, movement)
      companion.follow(dt, player)
      if (!inside) town?.update(dt, player)
      idleTime = blocked || movement.magnitude > 0 ? 0 : idleTime + dt
      if (!blocked && !inside) pickUpSecret()
      if (!blocked && !inside && progress && !progress.story.campFound && campAt(player.x, player.y)?.id === 'forasteiros') playCampFound()
      if (!blocked && !inside && hunt?.active && !collapsing) {
        const guarded = hunt.guardAt(player.x, player.y)
        const fight = guarded >= 0 ? hunt.fight(guarded) : null
        if (fight && combat?.offerGuard(fight)) {
          prompt.hide()
          promptTarget = null
          hint.hide()
          bubble.hide()
          idleTime = 0
        }
      }
      if (awaitingFirstMove && movement.magnitude > 0) {
        awaitingFirstMove = false
        hint.hide()
        if (shopHintPending) {
          shopHintPending = false
          hint.show([`A ${SHOP.name} fica na praça central, a oeste da sua casa`], SHOP_HINT_DURATION)
        }
      }
      const target = blocked ? null : targetAt(player.x, player.y)
      if (target && !sameTarget(target, promptTarget)) {
        promptTarget = target
        showPrompt(target)
        if (shopHintPending && target.kind === 'shop') {
          shopHintPending = false
          hint.hide()
        }
        if (target.kind === 'hall' && target.spot === 'forasteiros' && progress && !progress.story.overheard && progress.story.finale === 'none' && progress.story.visits >= OVERHEAR_VISIT) {
          playOverheard()
        }
      } else if (!target && promptTarget) {
        promptTarget = null
        prompt.hide()
      }
      if (target && confirmPressed && !talking && !combat?.cardOpen) activatePrompt()
      if (inside && league && !blocked) {
        chatterTimer -= dt
        if (chatterTimer <= 0) {
          chatterTimer = CHATTER_EVERY + Math.random() * 4
          const line = league.crowd.chatter(player)
          if (line) bubble.say(line.text, () => ({ x: line.at()[0], y: line.at()[1] }), BUBBLE_LIFT, 3.4)
        }
      }
    }
    if (hunt?.active && !collapsing && !transitioning && !breaking && !(combat?.cardOpen ?? false) && hunt.clock(dt) === 'expired') collapse()
    drops?.update(dt, player, inside ? 'league' : 'city')
    const cssInset = combat?.cameraInset() ?? NO_INSET
    frameInset.right = cssInset.right * pixelRatio
    frameInset.bottom = cssInset.bottom * pixelRatio
    camera.setBoost(combat?.cameraZoom(view, frameInset) ?? 1)
    if (cameraFocus) {
      focusPoint.x = cameraFocus[0]
      focusPoint.y = cameraFocus[1]
    }
    camera.follow(combat?.cameraTarget() ?? (cameraFocus ? focusPoint : player), dt, view, false, frameInset)
    const lens = camera.lens(view)
    bubble.track(lens, view, pixelRatio)
    if (!inside) {
      const nearCrater = Math.abs(camera.x - METEOR_SITE[0]) < 3200 && Math.abs(camera.y - METEOR_SITE[1]) < 3200
      if (nearCrater) scene.smolder(dt, now / 1000)
      smokeChimneys(dt)
      tendWoods(dt, now / 1000)
      hunt?.tend(dt, camera)
    } else {
      if (scene.worldLights.length) scene.worldLights.length = 0
      if (flicker > 0) {
        flicker = Math.max(0, flicker - dt)
        scene.ambient = flicker > 0 && Math.random() < 0.32 ? LEAGUE_DARK : LEAGUE_AMBIENT
      }
    }
    scene.update(dt * (combat?.timeScale ?? 1))
    map.stream(lens, view.width, view.height)
    if (hud.visible && progress) {
      hud.setCredits(progress.credits)
      hud.setIron(progress.garage.coins, progress.garage.fragments)

      objectiveTimer -= dt
      if (objectiveTimer <= 0) {
        objectiveTimer = OBJECTIVE_CHECK
        hud.setObjective(currentObjective())
      }
      hud.track(player, lens, view, pixelRatio)
      greetRegion(dt)
    }
  }

  function render(now: number) {
    const { width, height } = view
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalCompositeOperation = 'source-over'
    context.globalAlpha = 1
    if (!scene || !sky || !director || stage === 'loading' || stage === 'shop' || stage === 'house' || stage === 'garage' || stage === 'fall') {
      context.fillStyle = stage === 'fall' ? LETTERBOX : BACKGROUND
      context.fillRect(0, 0, width, height)
      return
    }
    if (stage === 'title') {
      sky.draw(context, width, height, 0, now / 1000, 0, 0)
      scene.flash = 0
      scene.vignette = 0.85
      scene.grain = 1
      scene.drawFinish(context, width, height, now)
      return
    }
    if (stage === 'intro') {
      const bar = letterboxHeight(director.bars())
      scene.profiler.begin(context)

      if (bar > 0) {
        context.save()
        context.beginPath()
        context.rect(0, bar, width, height - bar * 2)
        context.clip()
      }
      director.render(context, view, now)
      if (bar > 0) context.restore()
      drawLetterbox(bar)
      scene.profiler.mark(context, 'bars')
      return
    }
    if (stage === 'cinema' && cinema) {
      const bar = letterboxHeight(cinema.bars())
      scene.profiler.begin(context)
      if (bar > 0) {
        context.save()
        context.beginPath()
        context.rect(0, bar, width, height - bar * 2)
        context.clip()
      }
      cinema.render(context, view, player, now)
      if (bar > 0) context.restore()
      drawLetterbox(bar)
      return
    }
    scene.profiler.begin(context)
    scene.render(context, view, camera.lens(view), player, now)
    if (sceneBars > 0 || sceneBarsShown) {
      const bar = letterboxHeight(sceneBars)
      drawLetterbox(bar)
      sceneBarsShown = bar > 0
    }
  }

  function letterboxHeight(amount: number) {
    const { width, height } = view
    const full = Math.min(height * 0.14, Math.max(height * 0.09, (height - width / 2.39) / 2))
    return Math.round(full * easeInOutCubic(amount))
  }

  function drawLetterbox(bar: number) {
    const { width, height } = view
    overlay.setBars(bar / pixelRatio)
    if (bar <= 0) return
    context.fillStyle = LETTERBOX
    context.fillRect(0, 0, width, bar)
    context.fillRect(0, height - bar, width, bar)
  }

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(animation)
      observer.disconnect()
      document.removeEventListener('visibilitychange', resetClock)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      surface.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      keyboard.destroy()
      pointer.destroy()
      joystick.destroy()
      hint.destroy()
      prompt.destroy()
      fade.destroy()
      shop?.destroy()
      house?.destroy()
      garage?.destroy()
      toast.destroy()
      dialogue.destroy()
      bubble.destroy()
      combat?.destroy()
      hunt?.destroy()
      fall.destroy()
      credits.destroy()
      hud.destroy()
      menu?.destroy()
      unsubscribeSettings()
      document.documentElement.style.fontSize = ''
      overlay.destroy()
      sound.destroy()
      map?.destroy()
      canvas.remove()
      surface.classList.remove('game-root')
    },
  }
}

function paintHeart(): HTMLCanvasElement {
  const rows = ['.kk.kk.', 'kffkffk', 'kfwfffk', 'kfffffk', '.kfffk.', '..kfk..', '...k...']
  const cell = 4
  const canvas = document.createElement('canvas')
  canvas.width = rows[0].length * cell
  canvas.height = rows.length * cell
  const paint = canvas.getContext('2d')
  if (!paint) return canvas
  const colour: Record<string, string> = { k: '#3a1012', f: '#f0503f', w: '#ffd2c8' }
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = colour[row[x]]
      if (!fill) continue
      paint.fillStyle = fill
      paint.fillRect(x * cell, y * cell, cell, cell)
    }
  })
  return canvas
}

function loadAssets(base: string, onProgress: (amount: number) => void): Promise<LoadedAssets> {
  const entries = Object.entries(ASSETS) as [keyof typeof ASSETS, string][]
  const sheets = [PILOT_ID, ...ROBOT_ASSET_IDS].flatMap((id) => {
    const paths = id === PILOT_ID ? pilotSheetPaths(base) : robotSheetPaths(base, id)
    return [
      { id, kind: 'idle' as const, path: paths.idle },
      { id, kind: 'walk' as const, path: paths.walk },
    ]
  })
  const total = entries.length + sheets.length
  let done = 0
  const step = () => {
    done++
    onProgress(done / total)
  }
  onProgress(0)
  const art = Promise.all(
    entries.map(([name, path]) =>
      loadImage(`${base}${path}`).then((image) => {
        step()
        return [name, image] as const
      }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as Record<keyof typeof ASSETS, HTMLImageElement>)
  const robot = Promise.all(
    sheets.map((sheet) =>
      loadImage(sheet.path).then((image) => {
        step()
        return { ...sheet, image }
      }),
    ),
  ).then((loaded) => {
    const map = new Map<string, Sheets>()
    for (const { id, kind, image } of loaded) {
      const entry = map.get(id) ?? ({} as Sheets)
      entry[kind] = image
      map.set(id, entry)
    }
    return map
  })
  return Promise.all([art, robot]).then(([images, sheets]) => {
    const pilot = sheets.get(PILOT_ID)
    if (!pilot) throw new Error('A folha de sprites do piloto não foi carregada.')
    sheets.delete(PILOT_ID)
    return { ...images, robot: sheets, pilot }
  })
}

const IMAGE_SLOTS = 24
const IMAGE_ATTEMPTS = 3
let busyImageSlots = 0
const imageSlotQueue: (() => void)[] = []

function takeImageSlot() {
  if (busyImageSlots < IMAGE_SLOTS) {
    busyImageSlots++
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => imageSlotQueue.push(resolve))
}

function freeImageSlot() {
  const next = imageSlotQueue.shift()
  if (next) next()
  else busyImageSlots--
}

async function loadImage(source: string): Promise<HTMLImageElement> {
  for (let attempt = 1; ; attempt++) {
    await takeImageSlot()
    try {
      return await decodeImage(source)
    } catch (error) {
      if (attempt >= IMAGE_ATTEMPTS) throw error
    } finally {
      freeImageSlot()
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
  }
}

function decodeImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      image.decode().then(
        () => resolve(image),
        () => resolve(image),
      )
    }
    image.onerror = () => reject(new Error(`Não foi possível carregar ${source}`))
    image.src = source
  })
}
