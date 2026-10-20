import { isRobotClass, randomClass, type RobotClass } from '../battle/classes'
import { BASE_CARDS, DEFAULT_HAND, DRAFT_OFFER, HAND_SIZE, isCardId, SECRET_CARDS, type CardId } from '../battle/deck'
import { isElement, randomElement, type Element } from '../battle/elements'
import { CAMPS, type Camp } from '../../city/woods'
import { CONDITION_MAX, readCondition, repairCost } from './condition'
import { campParts } from './expansion-2'
import {
  conditionOf,
  EMPTY_LOADOUT,
  partById,
  secretForClearing,
  secretForMission,
  secretForSpot,
  SLOTS,
  type Condition,
  type Loadout,
  type Part,
  type Slot,
} from './parts'
import { upgradeCost, upgradeLevel, upgradesFor, type UpgradeLevels } from './upgrades'
import { defaultGarage, readGarage, type GarageState } from '../garage/state'

export type Core = { element: Element; cls: RobotClass }

export type MissionProgress = {
  main: number
  side: Record<string, number>
  wins: number
  losses: number
  kills: number
}

export type Friendship = { level: number; lastWin: number }

export const HEART_COUNT = 9

export type FinalePhase = 'none' | 'hunt' | 'won'

export type HuntState = { seed: number; cleared: number[]; broken: number[]; left: number; total: number }

export type StoryState = {

  visits: number

  overheard: boolean

  beats: string[]

  winsSince: number

  campFound: boolean
  finale: FinalePhase
  hunt: HuntState | null
}

export type Drop = { x: number; y: number; amount: number; space: 'city' | 'league' }

export type Progress = {
  credits: number
  owned: string[]
  equipped: Loadout
  missions: MissionProgress
  core: Core
  upgrades: UpgradeLevels
  spots: string[]
  homeVisited: boolean

  condition: Condition

  lessons: string[]

  friends: Record<string, Friendship>

  bond: number

  cards: CardId[]
  hand: CardId[]

  clearings: string[]

  camps: Record<string, number>
  story: StoryState

  drops: Drop[]
  garage: GarageState
}

export function defaultStory(): StoryState {
  return { visits: 0, overheard: false, beats: [], winsSince: 0, campFound: false, finale: 'none', hunt: null }
}

const STORAGE_KEY = 'bosque-alto:robot:v2'
const LEGACY_KEY = 'bosque-alto:robot:v1'

export const STARTING_CREDITS = 450

export function defaultMissions(): MissionProgress {
  return { main: 0, side: {}, wins: 0, losses: 0, kills: 0 }
}

export function rollCore(): Core {
  return { element: randomElement(), cls: randomClass() }
}

export function defaultProgress(): Progress {
  return {
    credits: STARTING_CREDITS,
    owned: [],
    equipped: { ...EMPTY_LOADOUT },
    missions: defaultMissions(),
    core: rollCore(),
    upgrades: {},
    spots: [],
    homeVisited: false,
    condition: {},
    lessons: [],
    friends: {},
    bond: 0,
    cards: [],
    hand: [...DEFAULT_HAND],
    clearings: [],
    camps: {},
    story: defaultStory(),
    drops: [],
    garage: defaultGarage(),
  }
}

function readStory(data: unknown): StoryState {
  const story = defaultStory()
  if (!data || typeof data !== 'object') return story
  const raw = data as Record<string, unknown>
  story.visits = count(raw.visits)
  story.overheard = raw.overheard === true
  story.beats = strings(raw.beats, () => true)
  story.winsSince = count(raw.winsSince)
  story.campFound = raw.campFound === true
  story.hunt = readHunt(raw.hunt)
  story.finale = raw.finale === 'won' ? 'won' : raw.finale === 'hunt' && story.hunt ? 'hunt' : 'none'
  return story
}

function readHunt(data: unknown): HuntState | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  const total = count(raw.total)
  if (!total) return null
  const indices = (value: unknown) =>
    Array.isArray(value) ? [...new Set(value.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0 && entry < HEART_COUNT))] : []
  const left = typeof raw.left === 'number' && Number.isFinite(raw.left) ? Math.max(0, Math.min(total, raw.left)) : total
  return { seed: count(raw.seed), cleared: indices(raw.cleared), broken: indices(raw.broken), left, total }
}

export function ownedCards(progress: Pick<Progress, 'cards'>): CardId[] {
  return [...BASE_CARDS, ...SECRET_CARDS.filter((id) => progress.cards.includes(id))]
}

export function cleanHand(list: readonly CardId[], owned: readonly CardId[]): CardId[] {
  const hand: CardId[] = []
  for (const id of list) if (owned.includes(id) && !hand.includes(id) && hand.length < HAND_SIZE) hand.push(id)
  return hand
}

function readHand(data: unknown, cards: CardId[]): CardId[] {
  if (!Array.isArray(data)) return [...DEFAULT_HAND]
  return cleanHand(strings(data, isCardId) as CardId[], ownedCards({ cards }))
}

export function setHand(progress: Progress, list: readonly CardId[]): CardId[] {
  progress.hand = cleanHand(list, ownedCards(progress))
  return progress.hand
}

export function drawOffer(progress: Progress, random: () => number = Math.random): CardId[] {
  const pool = ownedCards(progress)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, DRAFT_OFFER)
}

function readDrops(data: unknown): Drop[] {
  if (!Array.isArray(data)) return []
  const out: Drop[] = []
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    const amount = count(raw.amount)
    if (!amount || typeof raw.x !== 'number' || typeof raw.y !== 'number' || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) continue
    out.push({ x: raw.x, y: raw.y, amount, space: raw.space === 'league' ? 'league' : 'city' })
  }
  return out
}

const FRIEND_MAX = 3

function readFriends(data: unknown): Record<string, Friendship> {
  const out: Record<string, Friendship> = {}
  if (!data || typeof data !== 'object') return out
  for (const [id, entry] of Object.entries(data as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const level = Math.min(FRIEND_MAX, count((entry as Record<string, unknown>).level))
    const lastWin = count((entry as Record<string, unknown>).lastWin)
    if (level > 0 || lastWin > 0) out[id] = { level, lastWin }
  }
  return out
}

function readCamps(data: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!data || typeof data !== 'object') return out
  for (const camp of CAMPS) {
    const taken = Math.min(campParts(camp.id).length, count((data as Record<string, unknown>)[camp.id]))
    if (taken > 0) out[camp.id] = taken
  }
  return out
}

const strings = (data: unknown, keep: (id: string) => boolean) =>
  Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string' && keep(id)) : []

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)

function readRaw(): { raw: string; legacy: boolean } | null {
  const current = localStorage.getItem(STORAGE_KEY)
  if (current) return { raw: current, legacy: false }
  const old = localStorage.getItem(LEGACY_KEY)
  return old ? { raw: old, legacy: true } : null
}

function readUpgrades(data: unknown): UpgradeLevels {
  const out: UpgradeLevels = {}
  if (!data || typeof data !== 'object') return out
  for (const [partId, entry] of Object.entries(data as Record<string, unknown>)) {
    if (!partById(partId) || !entry || typeof entry !== 'object') continue
    for (const upgrade of upgradesFor(partId)) {
      const level = Math.min(upgrade.max, count((entry as Record<string, unknown>)[upgrade.id]))
      if (level > 0) (out[partId] ??= {})[upgrade.id] = level
    }
  }
  return out
}

export function loadProgress(): Progress {
  const fallback = defaultProgress()
  try {
    const stored = readRaw()
    if (!stored) return fallback
    const data = JSON.parse(stored.raw) as Partial<Progress>
    const owned = Array.isArray(data.owned) ? data.owned.filter((id): id is string => typeof id === 'string' && partById(id) !== null) : []
    const equipped: Loadout = { ...EMPTY_LOADOUT }
    for (const slot of SLOTS) {
      const id = data.equipped?.[slot]
      const part = partById(id)
      if (part && part.slot === slot && owned.includes(part.id)) equipped[slot] = part.id
    }
    const credits = typeof data.credits === 'number' && Number.isFinite(data.credits) ? Math.max(0, Math.floor(data.credits)) : fallback.credits
    const saved = data.missions
    const side: Record<string, number> = {}
    if (saved && typeof saved.side === 'object' && saved.side) {
      for (const [id, clears] of Object.entries(saved.side)) if (count(clears) > 0) side[id] = count(clears)
    }
    const missions: MissionProgress = saved
      ? { main: count(saved.main), side, wins: count(saved.wins), losses: count(saved.losses), kills: count(saved.kills) }
      : defaultMissions()
    const core: Core = isElement(data.core?.element) && isRobotClass(data.core?.cls) ? { element: data.core.element, cls: data.core.cls } : fallback.core
    const spots = strings(data.spots, (id) => secretForSpot(id) !== null)
    const clearings = strings(data.clearings, (id) => secretForClearing(id) !== null)
    const cards = strings(data.cards, isCardId) as CardId[]
    const progress: Progress = {
      credits,
      owned,
      equipped,
      missions,
      core,
      upgrades: readUpgrades(data.upgrades),
      spots,
      homeVisited: data.homeVisited === true,
      condition: readCondition(data.condition, owned),
      lessons: strings(data.lessons, () => true),
      friends: readFriends(data.friends),
      bond: count(data.bond),
      cards,
      hand: readHand(data.hand, cards),
      clearings,
      camps: readCamps(data.camps),
      story: readStory(data.story),
      drops: readDrops(data.drops),
      garage: readGarage((data as Record<string, unknown>).garage, missions.wins, missions.main),
    }
    let granted = false
    for (const camp of CAMPS) {
      for (const part of campParts(camp.id).slice(0, progress.camps[camp.id] ?? 0)) if (grantPart(progress, part)) granted = true
    }
    for (const id of Object.keys(side)) {
      const part = secretForMission(id)
      if (part && grantPart(progress, part)) granted = true
    }
    for (const id of spots) {
      const part = secretForSpot(id)
      if (part && grantPart(progress, part)) granted = true
    }
    for (const id of clearings) {
      const part = secretForClearing(id)
      if (part && grantPart(progress, part)) granted = true
    }
    if (stored.legacy || !data.core || granted) saveProgress(progress)
    return progress
  } catch {
    return fallback
  }
}

export function saveProgress(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
  }
}

export function hasSavedProgress() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(LEGACY_KEY) !== null
  } catch {
    return false
  }
}

export function resetProgress(progress: Progress) {
  Object.assign(progress, defaultProgress())
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
  }
  saveProgress(progress)
}

export type PurchaseResult = 'bought' | 'owned' | 'poor'

export function buyPart(progress: Progress, id: string): PurchaseResult {
  const part = partById(id)
  if (!part) return 'poor'
  if (progress.owned.includes(id)) {
    progress.equipped[part.slot] = id
    return 'owned'
  }
  if (progress.credits < part.price) return 'poor'
  progress.credits -= part.price
  progress.owned.push(id)
  progress.equipped[part.slot] = id
  return 'bought'
}

export function equipPart(progress: Progress, slot: Slot, id: string | null) {
  if (id === null) {
    progress.equipped[slot] = null
    return true
  }
  const part = partById(id)
  if (!part || part.slot !== slot || !progress.owned.includes(id)) return false
  progress.equipped[slot] = id
  return true
}

export function grantPart(progress: Progress, part: Part): boolean {
  if (progress.owned.includes(part.id)) return false
  progress.owned.push(part.id)
  return true
}

export function collectSpot(progress: Progress, spotId: string): Part | null {
  if (progress.spots.includes(spotId)) return null
  const part = secretForSpot(spotId)
  if (!part) return null
  progress.spots.push(spotId)
  grantPart(progress, part)
  return part
}

export function collectClearing(progress: Progress, clearingId: string, card: CardId | null): Part | null {
  if (progress.clearings.includes(clearingId)) return null
  const part = secretForClearing(clearingId)
  if (!part) return null
  progress.clearings.push(clearingId)
  grantPart(progress, part)
  if (card && !progress.cards.includes(card)) progress.cards.push(card)
  return part
}

export type CampLoot = { kind: 'ready'; part: Part; index: number; left: number } | { kind: 'waiting'; level: number } | { kind: 'empty' }

export function campLoot(progress: Progress, camp: Camp): CampLoot {
  const parts = campParts(camp.id)
  const index = progress.camps[camp.id] ?? 0
  const part = parts[index]
  if (!part) return { kind: 'empty' }
  const level = camp.wins[index] ?? camp.wins[camp.wins.length - 1] ?? 0
  if (progress.missions.main < level) return { kind: 'waiting', level }
  return { kind: 'ready', part, index, left: parts.length - index - 1 }
}

export function collectCamp(progress: Progress, camp: Camp): CampLoot {
  const loot = campLoot(progress, camp)
  if (loot.kind !== 'ready') return loot
  progress.camps[camp.id] = loot.index + 1
  grantPart(progress, loot.part)
  return loot
}

export type RepairResult = 'repaired' | 'intact' | 'poor' | 'invalid'

export function repairPart(progress: Progress, partId: string): RepairResult {
  const part = partById(partId)
  if (!part || !progress.owned.includes(partId)) return 'invalid'
  const value = conditionOf(progress.condition, partId)
  if (value >= CONDITION_MAX) return 'intact'
  const cost = repairCost(part, value)
  if (progress.credits < cost) return 'poor'
  progress.credits -= cost
  delete progress.condition[partId]
  return 'repaired'
}

export function repairAll(progress: Progress, partIds: readonly string[]): { repaired: number; spent: number } {
  const queue = partIds
    .map((id) => partById(id))
    .filter((part): part is Part => part !== null && conditionOf(progress.condition, part.id) < CONDITION_MAX)
    .sort((a, b) => repairCost(a, conditionOf(progress.condition, a.id)) - repairCost(b, conditionOf(progress.condition, b.id)))
  let repaired = 0
  let spent = 0
  for (const part of queue) {
    const cost = repairCost(part, conditionOf(progress.condition, part.id))
    if (progress.credits < cost) break
    progress.credits -= cost
    delete progress.condition[part.id]
    repaired++
    spent += cost
  }
  return { repaired, spent }
}

export type UpgradeResult = 'bought' | 'maxed' | 'poor' | 'invalid'

export function buyUpgrade(progress: Progress, partId: string, upgradeId: string): UpgradeResult {
  const part = partById(partId)
  const upgrade = upgradesFor(partId).find((entry) => entry.id === upgradeId)
  if (!part || !upgrade || !progress.owned.includes(partId)) return 'invalid'
  const level = upgradeLevel(progress.upgrades, partId, upgradeId)
  if (level >= upgrade.max) return 'maxed'
  const cost = upgradeCost(part, level + 1)
  if (progress.credits < cost) return 'poor'
  progress.credits -= cost
  ;(progress.upgrades[partId] ??= {})[upgradeId] = level + 1
  return 'bought'
}
