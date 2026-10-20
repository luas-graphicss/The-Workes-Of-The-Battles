import { SECRET_SPOTS } from '../../world-data'
import { secretForMission, secretForSpot, type Part } from '../robot/parts'
import { grantPart, type Progress } from '../robot/progress'
import { MAIN_MISSIONS, SIDE_MISSIONS, type Mission } from './data'
import { cycleRewardFactor, LEVEL_COUNT, WORLD_SIZE, worldOf } from './ladder'

export type MissionStatus = 'done' | 'next' | 'locked' | 'open'

export function ladderCycle(progress: Progress) {
  return Math.floor(progress.missions.main / LEVEL_COUNT) + 1
}

export function currentLevel(progress: Progress) {
  return (progress.missions.main % LEVEL_COUNT) + 1
}

export function currentWorld(progress: Progress) {
  return worldOf(currentLevel(progress))
}

export function clearedLevels(progress: Progress) {
  return progress.missions.main
}

export function nextMainMission(progress: Progress): Mission {
  return MAIN_MISSIONS[currentLevel(progress) - 1]
}

export function chainComplete(progress: Progress) {
  return progress.missions.main >= LEVEL_COUNT
}

export function mainStatus(progress: Progress, mission: Mission): MissionStatus {
  const index = MAIN_MISSIONS.indexOf(mission)
  if (index < 0) return 'open'
  const cursor = progress.missions.main % LEVEL_COUNT
  if (index < cursor) return 'done'
  if (index === cursor) return 'next'
  return 'locked'
}

export function sideClears(progress: Progress, mission: Mission) {
  return progress.missions.side[mission.id] ?? 0
}

export function sideUnlocked(progress: Progress, mission: Mission) {
  const index = SIDE_MISSIONS.indexOf(mission)
  return index >= 0 && index <= Math.max(1, Math.floor(progress.missions.main / 3))
}

export type Reward = {
  bounties: number
  reward: number
  bonus: number
  total: number
  secret: Part | null
  clue: Part | null

  worldCleared: number | null

  cycleCleared: number | null

  pending: number
}

function revealedClue(progress: Progress): Part | null {
  const spot = SECRET_SPOTS.find((entry) => entry.wins === progress.missions.main && !progress.spots.includes(entry.id))
  return spot ? secretForSpot(spot.id) : null
}

export function missionReward(progress: Progress, mission: Mission) {
  if (mission.kind !== 'main') return mission.reward
  return Math.round((mission.reward * cycleRewardFactor(ladderCycle(progress))) / 5) * 5
}

export function completeMission(progress: Progress, mission: Mission, bounties: number, defer = false): Reward {
  const first = mission.kind === 'main' ? false : sideClears(progress, mission) === 0
  const bonus = first && mission.firstBonus ? mission.firstBonus : 0
  const reward = missionReward(progress, mission)
  const total = bounties + reward + bonus
  const pending = defer ? reward + bonus : 0
  if (!defer) progress.credits += reward + bonus
  progress.missions.wins += 1
  let secret: Part | null = null
  let clue: Part | null = null
  let worldCleared: number | null = null
  let cycleCleared: number | null = null
  if (mission.kind === 'main') {
    if (progress.story.overheard) progress.story.winsSince += 1
    const index = MAIN_MISSIONS.indexOf(mission)
    if (index >= 0 && index === progress.missions.main % LEVEL_COUNT) {
      const level = index + 1
      progress.missions.main += 1
      clue = revealedClue(progress)
      if (level % WORLD_SIZE === 0) worldCleared = worldOf(level)
      if (level === LEVEL_COUNT) cycleCleared = ladderCycle(progress) - 1
    }
  } else {
    progress.missions.side[mission.id] = sideClears(progress, mission) + 1
    const prize = secretForMission(mission.id)
    if (prize && grantPart(progress, prize)) secret = prize
  }
  return { bounties, reward, bonus, total, secret, clue, worldCleared, cycleCleared, pending }
}

export function pendingSecret(progress: Progress, mission: Mission): Part | null {
  if (mission.kind !== 'side') return null
  const prize = secretForMission(mission.id)
  return prize && !progress.owned.includes(prize.id) ? prize : null
}

export function failMission(progress: Progress) {
  progress.missions.losses += 1
}
