import { PARTS, type Part } from './parts'
import type { Progress } from './progress'

export const VENDOR_PARTS: readonly Part[] = PARTS.filter((part) => part.secret?.kind === 'vendor')

export const VENDOR_SHELF = 3

export function vendorStock(progress: Progress, count = VENDOR_SHELF): Part[] {
  const available = VENDOR_PARTS.filter((part) => !progress.owned.includes(part.id))
  if (available.length <= count) return available
  const start = (progress.story.visits * 2 + progress.missions.wins) % available.length
  return Array.from({ length: count }, (_, index) => available[(start + index) % available.length])
}
