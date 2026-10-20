import type { Mission } from '../missions/data'
import { CHIP_SLOTS, isUpgradeId, MOUNT_SLOTS, slotKind, TUNING, upgradeDef, UPGRADES, type UpgradeId } from './catalog'

export type GarageState = {
  coins: number
  fragments: number
  levels: Partial<Record<UpgradeId, number>>
  chips: UpgradeId[]
  mounts: UpgradeId[]
  pity: number
  earned: number
  visited: boolean
  welcome: number
}

export type GadgetSlot = { id: UpgradeId; level: number; slot: 'chip' | 'mount'; index: number }

export type Perks = { saudavel: number; forte: number; combo: number; rico: number; imprevisivel: number }

export type GadgetLoadout = { chips: GadgetSlot[]; mounts: GadgetSlot[]; perks: Perks }

export const EMPTY_LOADOUT: GadgetLoadout = { chips: [], mounts: [], perks: { saudavel: 0, forte: 0, combo: 0, rico: 0, imprevisivel: 0 } }

export type GarageReward = {
  coins: number
  base: number
  style: number
  flawless: number
  rich: number
  fragments: number
  boss: boolean
}

export type BattleTally = { kills: number; bestCombo: number; parries: number; supers: number; damageTaken: number }

export type GarageResult = 'bought' | 'maxed' | 'poor' | 'invalid'

export type EquipResult = 'equipped' | 'removed' | 'full' | 'locked' | 'invalid'

const FRAGMENT_CHANCE = 0.3
const PITY_AFTER = 3
const WELCOME_PER_WIN = 120
const WELCOME_CAP = 30000

const whole = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)

export function defaultGarage(): GarageState {
  return { coins: 0, fragments: 0, levels: {}, chips: [], mounts: [], pity: 0, earned: 0, visited: false, welcome: 0 }
}

export function readGarage(data: unknown, wins: number, mainCleared: number): GarageState {
  const garage = defaultGarage()
  if (!data || typeof data !== 'object') {
    if (wins > 0) {
      garage.welcome = Math.min(WELCOME_CAP, wins * WELCOME_PER_WIN)
      garage.coins = garage.welcome
      garage.fragments = Math.floor(mainCleared / 10) * 3
    }
    return garage
  }
  const raw = data as Record<string, unknown>
  garage.coins = whole(raw.coins)
  garage.fragments = whole(raw.fragments)
  garage.pity = Math.min(PITY_AFTER, whole(raw.pity))
  garage.earned = whole(raw.earned)
  garage.visited = raw.visited === true
  garage.welcome = whole(raw.welcome)
  if (raw.levels && typeof raw.levels === 'object') {
    for (const [id, value] of Object.entries(raw.levels as Record<string, unknown>)) {
      if (!isUpgradeId(id)) continue
      const level = Math.min(upgradeDef(id).costs.length, whole(value))
      if (level > 0) garage.levels[id] = level
    }
  }
  const slots = (value: unknown, kind: 'chip' | 'mount', limit: number) =>
    Array.isArray(value)
      ? [...new Set(value.filter((id): id is UpgradeId => isUpgradeId(id) && slotKind(upgradeDef(id)) === kind && (garage.levels[id] ?? 0) > 0))].slice(0, limit)
      : []
  garage.chips = slots(raw.chips, 'chip', CHIP_SLOTS)
  garage.mounts = slots(raw.mounts, 'mount', MOUNT_SLOTS)
  return garage
}

export function levelOf(garage: GarageState, id: UpgradeId): number {
  return garage.levels[id] ?? 0
}

export function nextCost(garage: GarageState, id: UpgradeId): number | null {
  const def = upgradeDef(id)
  const level = levelOf(garage, id)
  return level >= def.costs.length ? null : def.costs[level]
}

export function wallet(garage: GarageState, id: UpgradeId): number {
  return upgradeDef(id).currency === 'coins' ? garage.coins : garage.fragments
}

export function isEquipped(garage: GarageState, id: UpgradeId): boolean {
  return garage.chips.includes(id) || garage.mounts.includes(id)
}

function slotList(garage: GarageState, id: UpgradeId): { list: UpgradeId[]; limit: number } | null {
  const kind = slotKind(upgradeDef(id))
  if (kind === 'chip') return { list: garage.chips, limit: CHIP_SLOTS }
  if (kind === 'mount') return { list: garage.mounts, limit: MOUNT_SLOTS }
  return null
}

export function buyUpgrade(garage: GarageState, id: UpgradeId): GarageResult {
  if (!isUpgradeId(id)) return 'invalid'
  const def = upgradeDef(id)
  const cost = nextCost(garage, id)
  if (cost === null) return 'maxed'
  if (wallet(garage, id) < cost) return 'poor'
  if (def.currency === 'coins') garage.coins -= cost
  else garage.fragments -= cost
  const first = levelOf(garage, id) === 0
  garage.levels[id] = levelOf(garage, id) + 1
  const slots = slotList(garage, id)
  if (first && slots && slots.list.length < slots.limit && !slots.list.includes(id)) slots.list.push(id)
  return 'bought'
}

export function toggleEquip(garage: GarageState, id: UpgradeId): EquipResult {
  const slots = slotList(garage, id)
  if (!slots) return 'invalid'
  if (levelOf(garage, id) <= 0) return 'locked'
  const index = slots.list.indexOf(id)
  if (index >= 0) {
    slots.list.splice(index, 1)
    return 'removed'
  }
  if (slots.list.length >= slots.limit) return 'full'
  slots.list.push(id)
  return 'equipped'
}

export function loadoutOf(garage: GarageState): GadgetLoadout {
  const build = (list: UpgradeId[], slot: 'chip' | 'mount') =>
    list.filter((id) => levelOf(garage, id) > 0).map((id, index): GadgetSlot => ({ id, level: levelOf(garage, id), slot, index }))
  return {
    chips: build(garage.chips, 'chip'),
    mounts: build(garage.mounts, 'mount'),
    perks: {
      saudavel: levelOf(garage, 'saudavel'),
      forte: levelOf(garage, 'forte'),
      combo: levelOf(garage, 'combo'),
      rico: levelOf(garage, 'rico'),
      imprevisivel: levelOf(garage, 'imprevisivel'),
    },
  }
}

function round5(value: number) {
  return Math.max(5, Math.round(value / 5) * 5)
}

function baseCoins(mission: Mission, mainCleared: number, firstSide: boolean): { base: number; boss: boolean } {
  if (mission.id.startsWith('coracao-')) return { base: 600 + 45 * mainCleared, boss: false }
  if (mission.kind === 'main' && mission.level) {
    const cycle = Math.floor(Math.max(0, mainCleared - 1) / 100) + 1
    const level = mission.level
    const boss = Boolean(mission.boss)
    return { base: (250 + 60 * (level - 1)) * (boss ? 4 : 1) * (1 + 0.5 * (cycle - 1)), boss }
  }
  const ladder = (mainCleared % 100) + 1
  return { base: (300 + 30 * ladder) * mission.tier * (firstSide ? 1.5 : 1), boss: false }
}

export function victoryReward(garage: GarageState, mission: Mission, tally: BattleTally, mainCleared: number, firstSide: boolean, random: () => number = Math.random): GarageReward {
  const { base: raw, boss } = baseCoins(mission, mainCleared, firstSide)
  const base = round5(raw)
  const style = round5(15 * tally.kills + 12 * tally.bestCombo + 40 * tally.parries + 8 * tally.supers)
  const flawless = tally.damageTaken <= 0 ? round5(base * 0.25) : 0
  const subtotal = base + style + flawless
  const richLevel = levelOf(garage, 'rico')
  const rich = richLevel > 0 ? round5(subtotal * TUNING.rico.bonus[richLevel - 1]) : 0
  let fragments = 0
  if (boss) fragments = 3
  else if (mission.id.startsWith('coracao-')) fragments = 1
  else if (mission.kind === 'side' && firstSide) fragments = 1
  else if (garage.pity >= PITY_AFTER || random() < FRAGMENT_CHANCE) fragments = 1
  return { coins: subtotal + rich, base, style, flawless, rich, fragments, boss }
}

export function applyReward(garage: GarageState, reward: GarageReward) {
  garage.coins += reward.coins
  garage.earned += reward.coins
  garage.fragments += reward.fragments
  garage.pity = reward.fragments > 0 ? 0 : Math.min(PITY_AFTER, garage.pity + 1)
}

export function affordableCount(garage: GarageState): number {
  return UPGRADES.filter((upgrade) => {
    const cost = nextCost(garage, upgrade.id)
    return cost !== null && wallet(garage, upgrade.id) >= cost
  }).length
}

export function formatAmount(value: number) {
  return Math.round(value).toLocaleString('pt-BR')
}
