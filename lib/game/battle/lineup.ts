import type { Mission } from '../missions/data'
import { ladderPower, ladderRank, ladderTier, WORLDS, worldOf } from '../missions/ladder'
import { currentLevel, ladderCycle, missionReward } from '../missions/progress'
import { BASE_STATS, computeStats, equippedParts, STAT_KEYS } from '../robot/parts'
import type { Progress } from '../robot/progress'
import { BOSSES, type BossId } from './bosses'
import { CLASS_IDS, type RobotClass } from './classes'
import type { CardId } from './deck'
import { ELEMENT_IDS, ELEMENTS, randomElement, weaknessesOf, type Element } from './elements'
import { ENEMIES, type EnemyDef, type EnemyKind } from './enemies'

export type EnemySpec = {
  kind: EnemyKind
  element: Element
  cls: RobotClass
  level: number

  tier: number

  power?: number
  cards: CardId[]
  boss?: BossId

  faction?: 'forasteiros'
}

export function specLook(spec: Pick<EnemySpec, 'kind' | 'element' | 'boss' | 'cls' | 'faction'>) {
  return { kind: spec.kind, element: spec.element, boss: spec.boss, cls: spec.cls, forasteiro: spec.faction === 'forasteiros' }
}

export type Lineup = {
  rounds: EnemySpec[][]
  level: number
  rank: string
  reason: string

  prize: number
}

const DEFAULT_CLASS: Record<EnemyKind, RobotClass> = { sentinel: 'atirador', brute: 'guardiao', drone: 'veloz', alien: 'elemental' }
const CARD_POOL: Record<EnemyKind, { special: CardId; transform: CardId }> = {
  sentinel: { special: 'rajada', transform: 'sobrecarga' },
  brute: { special: 'onda', transform: 'tita' },
  drone: { special: 'investida', transform: 'fantasma' },
  alien: { special: 'chuva', transform: 'prisma' },
}

const RANKS = ['Novato', 'Aprendiz', 'Desafiante', 'Veterano', 'Elite', 'Campeão', 'Lenda', 'Mito', 'Titã', 'Celestial']

export type Difficulty = { level: number; tier: number; power: number; reason: string }

export function specDef(spec: Pick<EnemySpec, 'kind' | 'boss'>): EnemyDef {
  return spec.boss ? BOSSES[spec.boss] : ENEMIES[spec.kind]
}

function format(value: number) {
  return `×${value.toFixed(2).replace(/0$/, '').replace('.', ',')}`
}

export function difficultyFor(mission: Mission, progress: Progress): Difficulty {
  const cycle = ladderCycle(progress)
  if (mission.kind === 'main' && mission.level) {
    const level = ladderRank(mission.level)
    const tier = ladderTier(mission.level, cycle)
    const power = ladderPower(mission.level, cycle)
    const world = WORLDS[worldOf(mission.level) - 1]
    const lap = cycle > 1 ? ` · ${cycle}º ciclo da trilha` : ''
    const reason = `Nível ${mission.level} de 100 · ${world.kicker}, ${world.name}${lap}. Vida dos robôs ${format(tier)}, golpes ${format(power)}.`
    return { level, tier, power, reason }
  }

  const parts = equippedParts(progress.equipped).length
  const stats = computeStats(progress.equipped, progress.upgrades)
  const gains = STAT_KEYS.reduce((sum, key) => sum + Math.max(0, stats[key] - BASE_STATS[key]), 0)
  const ladder = currentLevel(progress)
  const level = Math.max(1, Math.min(10, ladderRank(ladder) + (gains >= 14 ? 1 : 0)))
  const tier = mission.tier * ladderTier(Math.max(1, ladder - 1), cycle) * (1 + 0.02 * parts)
  const power = ladderPower(Math.max(1, ladder - 1), cycle)
  const pieces: string[] = []
  if (parts > 0) pieces.push(`${parts} ${parts === 1 ? 'peça' : 'peças'} no chassi`)
  if (gains > 0) pieces.push(`+${gains} de atributos`)
  pieces.push(`nível ${ladder} na trilha da arena`)
  const reason = `Os robôs em fuga acompanham o seu robô: ${pieces.join(', ')}.`
  return { level, tier, power, reason }
}

export function rankName(level: number) {
  return RANKS[Math.max(0, Math.min(RANKS.length - 1, level - 1))]
}

export function planLineup(mission: Mission, progress: Progress, player: Element, random: () => number = Math.random): Lineup {
  const { level, tier, power, reason } = difficultyFor(mission, progress)

  const forasteiros = mission.kind === 'main' && Boolean(progress.story?.overheard) && progress.story.finale !== 'won'
  const rounds = mission.rounds.map((waves) => {
    const specs: EnemySpec[] = []
    for (const wave of waves) {
      for (let i = 0; i < wave.count; i++) {
        const spec = wave.boss ? drawBoss(wave.boss, level, tier, power, player, random) : drawEnemy(wave.kind, level, tier, player, random, power)
        if (forasteiros && spec.kind !== 'alien') spec.faction = 'forasteiros'
        specs.push(spec)
      }
    }
    return specs
  })
  return { rounds, level, rank: rankName(level), reason, prize: missionReward(progress, mission) }
}

export function drawEnemy(kind: EnemyKind, level: number, tier: number, player: Element, random: () => number = Math.random, power = tier): EnemySpec {
  const element = drawElement(level, player, random)
  const shuffle = Math.min(0.6, Math.max(0, (level - 2) * 0.12))
  const cls = random() < shuffle ? CLASS_IDS[Math.floor(random() * CLASS_IDS.length)] : DEFAULT_CLASS[kind]
  const cards: CardId[] = []
  if (level >= 2) cards.push(CARD_POOL[kind].special)
  if (level >= 4) cards.push(CARD_POOL[kind].transform)
  return { kind, element, cls, level, tier, power, cards }
}

export function drawBoss(id: BossId, level: number, tier: number, power: number, player: Element, random: () => number = Math.random): EnemySpec {
  const def = BOSSES[id]

  const counters = weaknessesOf(player)
  const element = random() < 0.6 ? counters[Math.floor(random() * counters.length)] : randomElement(random)
  const cls = DEFAULT_CLASS[def.kind]
  return { kind: def.kind, element, cls, level: Math.max(level, def.world), tier, power, cards: [...def.cards], boss: id }
}

function drawElement(level: number, player: Element, random: () => number): Element {
  const roll = random()
  const easy = Math.max(0, 0.45 - level * 0.05)
  const hard = Math.min(0.45, Math.max(0, (level - 2) * 0.07))
  if (roll < easy) return ELEMENTS[player].strong[Math.floor(random() * 2)]
  if (roll < easy + hard) {
    const counters = weaknessesOf(player)
    return counters[Math.floor(random() * counters.length)]
  }
  return randomElement(random)
}

export function groupLineup(lineup: Lineup): { kind: EnemyKind; count: number; specs: EnemySpec[] }[] {
  const groups = new Map<EnemyKind, EnemySpec[]>()
  for (const round of lineup.rounds) for (const spec of round) groups.set(spec.kind, [...(groups.get(spec.kind) ?? []), spec])
  return [...groups].map(([kind, specs]) => ({ kind, count: specs.length, specs }))
}

export function flattenLineup(lineup: Lineup): EnemySpec[] {
  return lineup.rounds.flat()
}

export function enemyName(spec: EnemySpec) {
  const name = specDef(spec).name
  return spec.faction === 'forasteiros' && !spec.boss ? `${name} dos Forasteiros` : name
}

export { ELEMENT_IDS }
