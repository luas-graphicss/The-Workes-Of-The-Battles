import {
  CONDITION_MAX,
  conditionOf,
  conditionTier,
  DAMAGED_AT,
  equippedParts,
  partById,
  type Condition,
  type ConditionTier,
  type Loadout,
  type Part,
  type Slot,
} from './parts'

export { CONDITION_MAX, conditionFactor, conditionOf, conditionTier, DAMAGED_AT, WORN_AT, type Condition, type ConditionTier } from './parts'

export const TIER_LABEL: Record<ConditionTier, string> = {
  boa: 'Em ordem',
  desgastada: 'Desgastada',
  danificada: 'Danificada',
  quebrada: 'Quebrada',
}

export const TIER_NOTE: Record<ConditionTier, string> = {
  boa: 'A peça rende tudo o que promete.',
  desgastada: 'Rende 75% dos bônus até passar pela Cápsula.',
  danificada: 'Rende só metade dos bônus. Repare antes da próxima luta.',
  quebrada: 'Não rende bônus algum. Só a Cápsula traz a peça de volta.',
}

const REPAIR_RATE = 0.25
const REPAIR_MIN = 5
const BASE_WEAR = 2
const DEFEAT_WEAR = 1.3
const BOSS_WEAR = 1.15

export function repairCost(part: Part, value: number): number {
  const missing = CONDITION_MAX - Math.max(0, Math.min(CONDITION_MAX, value))
  if (missing <= 0) return 0
  return Math.max(REPAIR_MIN, Math.round((part.price * REPAIR_RATE * missing) / CONDITION_MAX / 5) * 5)
}

export function repairAllCost(parts: readonly Part[], condition: Condition): number {
  return parts.reduce((sum, part) => sum + repairCost(part, conditionOf(condition, part.id)), 0)
}

export type WearEntry = { part: Part; before: number; after: number }

export type BattleWear = {
  maxHealth: number
  damageTaken: number
  meleeTaken: number
  shotTaken: number
  guardedTaken: number
  swings: number
  won: boolean
  boss: boolean
}

const jitter = () => 0.85 + Math.random() * 0.3

function slotWear(slot: Slot, info: BattleWear): number {
  const health = Math.max(1, info.maxHealth)
  const taken = info.damageTaken / health
  const melee = info.meleeTaken / health
  const shots = info.shotTaken / health
  const guarded = info.guardedTaken / health
  switch (slot) {
    case 'helmet':
      return shots * 16 + melee * 8
    case 'module':
      return guarded * 18 + taken * 6
    case 'mobility':
      return melee * 14 + taken * 6
    case 'weapon':
      return Math.min(10, info.swings * 0.08) + taken * 4
  }
}

export function applyWear(condition: Condition, loadout: Loadout, info: BattleWear): WearEntry[] {
  const report: WearEntry[] = []
  const factor = (info.won ? 1 : DEFEAT_WEAR) * (info.boss ? BOSS_WEAR : 1)
  for (const part of equippedParts(loadout)) {
    const before = conditionOf(condition, part.id)
    if (before <= 0) continue
    const amount = (BASE_WEAR + slotWear(part.slot, info)) * factor * jitter()
    const after = Math.max(0, Math.round(before - amount))
    if (after === before) continue
    condition[part.id] = after
    report.push({ part, before, after })
  }
  return report
}

export function worstEquipped(condition: Condition, loadout: Loadout): { part: Part; value: number } | null {
  let worst: { part: Part; value: number } | null = null
  for (const part of equippedParts(loadout)) {
    const value = conditionOf(condition, part.id)
    if (!worst || value < worst.value) worst = { part, value }
  }
  return worst
}

export function hasDamagedParts(condition: Condition, loadout: Loadout): boolean {
  const worst = worstEquipped(condition, loadout)
  return worst !== null && worst.value < DAMAGED_AT
}

export function readCondition(data: unknown, owned: readonly string[]): Condition {
  const out: Condition = {}
  if (!data || typeof data !== 'object') return out
  for (const [partId, value] of Object.entries(data as Record<string, unknown>)) {
    if (!partById(partId) || !owned.includes(partId) || typeof value !== 'number' || !Number.isFinite(value)) continue
    const clamped = Math.max(0, Math.min(CONDITION_MAX, Math.round(value)))
    if (clamped < CONDITION_MAX) out[partId] = clamped
  }
  return out
}
