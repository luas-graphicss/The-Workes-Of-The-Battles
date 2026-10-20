import { BOSS_IDS, BOSSES, type BossId } from '../battle/bosses'
import type { EnemyKind } from '../battle/enemies'
import type { Mission, Wave } from './data'

export const LEVEL_COUNT = 100
export const WORLD_SIZE = 10
export const WORLD_COUNT = LEVEL_COUNT / WORLD_SIZE

export type World = {
  index: number
  name: string
  kicker: string
  flavor: string
  boss: BossId

  accent: string
}

export const WORLDS: readonly World[] = [
  { index: 1, name: 'Luzes do Mirante', kicker: 'Mundo 1', flavor: 'As primeiras noites sob os holofotes: Sentinelas de patrulha e os primeiros Zangões.', boss: 'capitao', accent: '95 224 207' },
  { index: 2, name: 'Turno das Fábricas', kicker: 'Mundo 2', flavor: 'A Engrenagem manda seus Brutamontes. O ringue aprende a tremer.', boss: 'prime', accent: '255 150 70' },
  { index: 3, name: 'Enxame', kicker: 'Mundo 3', flavor: 'A Autômatos do Leste solta um lote inteiro de Zangões e a arena vira um zumbido.', boss: 'rainha', accent: '222 182 62' },
  { index: 4, name: 'Visitantes', kicker: 'Mundo 4', flavor: 'Algo mais caiu do céu naquela noite. Luzes violetas aparecem e somem entre as cordas.', boss: 'arauto', accent: '186 140 255' },
  { index: 5, name: 'Liga de Aço', kicker: 'Mundo 5', flavor: 'As três fábricas unem seus melhores modelos. Rodadas longas, sem descanso.', boss: 'ferrugem', accent: '232 176 74' },
  { index: 6, name: 'Tempestade', kicker: 'Mundo 6', flavor: 'Raios, feixes e tiros em sequência. Quem para de se mover, cai.', boss: 'tempestade', accent: '140 200 255' },
  { index: 7, name: 'Sombras', kicker: 'Mundo 7', flavor: 'A arena escurece. Visitantes drenam energia e somem no breu.', boss: 'eclipse', accent: '150 100 230' },
  { index: 8, name: 'Titãs', kicker: 'Mundo 8', flavor: 'Blindagem sobre blindagem. Cada golpe inimigo pesa como uma prensa.', boss: 'colosso', accent: '200 200 214' },
  { index: 9, name: 'Lendas', kicker: 'Mundo 9', flavor: 'Os campeões antigos de Bosque Alto voltam para medir o B-01.', boss: 'lenda', accent: '255 220 120' },
  { index: 10, name: 'Celestial', kicker: 'Mundo 10', flavor: 'O fim da trilha. O céu inteiro assiste do Mirante.', boss: 'coracao', accent: '255 160 100' },
]

const TITLES: readonly (readonly string[])[] = [
  ['Estreia no Mirante', 'Dupla de Ferro', 'Patrulha Noturna', 'Primeiro Zumbido', 'Sentinelas em Linha', 'Ronda Dupla', 'Holofotes Acesos', 'Enxame Tímido', 'Véspera do Capitão'],
  ['Turno da Noite', 'Chapa Grossa', 'Esteiras na Areia', 'O Peso do Martelo', 'Dois Brutamontes', 'Cobertura de Fogo', 'Linha de Produção', 'Prensa Hidráulica', 'Véspera do Prime'],
  ['Zumbido Baixo', 'Lote Defeituoso', 'Volta Completa', 'Investida em Série', 'Colmeia Aberta', 'Rastro de Faísca', 'Nuvem Dourada', 'Favo Blindado', 'Véspera da Rainha'],
  ['Clarão Violeta', 'Sinal do Céu', 'Entre as Cordas', 'Dois Pontos de Luz', 'Chuva Fina', 'Órbita Baixa', 'Vigília Estelar', 'Eco do Impacto', 'Véspera do Arauto'],
  ['Primeiro Torneio', 'Aço Misturado', 'Três Fábricas', 'Sem Intervalo', 'Rodada Longa', 'Ferro e Luz', 'Liga Completa', 'Noite do Título', 'Véspera de Ferrugem'],
  ['Trovoada', 'Feixe Cruzado', 'Chuva Elétrica', 'Patins no Metal', 'Descarga', 'Relâmpago Duplo', 'Céu Fechado', 'Olho do Furacão', 'Véspera da Tempestade'],
  ['Apagão', 'Sombra Longa', 'Sem Lua', 'Drenagem', 'Breu no Ringue', 'Ecos no Escuro', 'Luz Minguante', 'Última Lanterna', 'Véspera do Eclipse'],
  ['Placa Dupla', 'Chão Rachado', 'Pés de Chumbo', 'Muralha Viva', 'Dois Colossos', 'Prensa e Martelo', 'Blindagem Total', 'Terremoto', 'Véspera do Colosso'],
  ['Campeões Antigos', 'Kabuto Dourado', 'Lâmina e Cristal', 'Noite das Lendas', 'Salão da Fama', 'Título em Jogo', 'Cinturão Pesado', 'Último Desafio', 'Véspera da Lenda'],
  ['Primeira Estrela', 'Órbita Alta', 'Chuva de Fogo', 'Núcleo Exposto', 'Luz Total', 'Coroa de Meteoro', 'O Céu Inteiro', 'Cratera Aberta', 'Véspera do Coração'],
]

const KIND_NAME: Record<EnemyKind, [string, string]> = {
  sentinel: ['Sentinela', 'Sentinelas'],
  brute: ['Brutamontes', 'Brutamontes'],
  drone: ['Zangão', 'Zangões'],
  alien: ['Visitante', 'Visitantes'],
}

const COST: Record<EnemyKind, number> = { sentinel: 1, drone: 1, brute: 2, alien: 2 }

export function worldOf(level: number) {
  return Math.min(WORLD_COUNT, Math.max(1, Math.ceil(level / WORLD_SIZE)))
}

export function positionOf(level: number) {
  return ((level - 1) % WORLD_SIZE) + 1
}

export function isBossLevel(level: number) {
  return positionOf(level) === WORLD_SIZE
}

export function worldData(level: number): World {
  return WORLDS[worldOf(level) - 1]
}

export function ladderTier(level: number, cycle = 1) {
  return (1.2 + 0.056 * (level - 1)) * (1 + 0.5 * (cycle - 1))
}

export function ladderPower(level: number, cycle = 1) {
  return (1.16 + 0.031 * (level - 1)) * (1 + 0.35 * (cycle - 1))
}

export function ladderRank(level: number) {
  return worldOf(level)
}

export function levelReward(level: number) {
  const base = 30 + 7 * (level - 1)
  return Math.round(base / 5) * 5
}

export function bossReward(level: number) {
  return levelReward(level) * 4 + 150
}

export function cycleRewardFactor(cycle: number) {
  return 1 + 0.4 * (cycle - 1)
}

function seeded(seed: number) {
  let state = (seed * 2654435761) >>> 0 || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function pool(world: number, position: number): EnemyKind[] {
  const kinds: EnemyKind[] = ['sentinel']
  if (world >= 2 || position >= 4) kinds.push('drone')
  if (world >= 2 && (world >= 3 || position >= 3)) kinds.push('brute')
  if (world >= 4 && (world >= 5 || position >= 2)) kinds.push('alien')
  if (world === 3) kinds.push('drone', 'drone')
  if (world === 7) kinds.push('alien')
  if (world === 8) kinds.push('brute', 'brute')
  return kinds
}

function waves(kinds: EnemyKind[]): Wave[] {
  const counts = new Map<EnemyKind, number>()
  for (const kind of kinds) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  return [...counts].map(([kind, count]) => ({ kind, count }))
}

function composeRounds(level: number): Wave[][] {
  const world = worldOf(level)
  const position = positionOf(level)
  const random = seeded(level)
  if (isBossLevel(level)) {
    const boss = WORLDS[world - 1].boss
    const bossWave: Wave = { kind: BOSSES[boss].kind, count: 1, boss }
    if (world <= 2) return [[bossWave]]
    const escort: EnemyKind[] = world >= 7 ? ['sentinel', 'drone', 'alien'] : world >= 4 ? ['sentinel', 'drone'] : ['drone', 'drone']
    return [waves(escort), [bossWave]]
  }
  const roundCount = position <= 3 ? (world >= 5 ? 2 : 1) : position <= 7 ? 2 : 3
  const choices = pool(world, position)
  const rounds: Wave[][] = []

  const cap = Math.min(5, 2 + Math.floor((world - 1) / 2))
  const base = 1 + Math.floor((world - 1) / 3)
  const stage = position <= 3 ? 0 : position <= 6 ? 1 : 2
  for (let round = 0; round < roundCount; round++) {
    const budget = Math.min(cap, base + stage + Math.floor(round / 2))
    const kinds: EnemyKind[] = []
    let spent = 0
    let guard = 0
    while (spent < budget && kinds.length < 5 && guard++ < 20) {
      const kind = choices[Math.floor(random() * choices.length)]
      if (spent + COST[kind] > budget && kinds.length) break
      kinds.push(kind)
      spent += COST[kind]
    }
    if (!kinds.length) kinds.push('sentinel')
    rounds.push(waves(kinds))
  }
  return rounds
}

function rosterText(rounds: Wave[][]) {
  const counts = new Map<EnemyKind, number>()
  for (const round of rounds) for (const wave of round) if (!wave.boss) counts.set(wave.kind, (counts.get(wave.kind) ?? 0) + wave.count)
  const parts = [...counts].map(([kind, count]) => `${count} ${KIND_NAME[kind][count === 1 ? 0 : 1]}`)
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
}

const TAGLINES: Record<number, string[]> = {
  1: ['A arena mede o recém-chegado.', 'Os holofotes ainda são novidade.', 'A cidade começa a aprender seu nome.'],
  2: ['A Engrenagem quer o troco.', 'O chão do ringue sente o peso.', 'Blindagem pesada na areia.'],
  3: ['O zumbido não para.', 'Um lote inteiro de uma vez.', 'Investidas vindas de todos os lados.'],
  4: ['Luz violeta entre as cordas.', 'Eles somem antes do golpe.', 'O meteoro não veio sozinho.'],
  5: ['Rodadas longas, prêmio alto.', 'Todos os modelos no mesmo ringue.', 'Sem intervalo entre as rodadas.'],
  6: ['Feixes cruzam a arena.', 'Quem para, cai.', 'O céu fechado sobre o Mirante.'],
  7: ['O ringue quase sem luz.', 'Sombras drenam quem toca.', 'Só os holofotes resistem.'],
  8: ['Cada soco pesa uma prensa.', 'Placas por cima de placas.', 'O chão racha a cada passo.'],
  9: ['Campeões antigos voltam ao ringue.', 'O título em jogo.', 'A arquibancada lotada.'],
  10: ['O céu inteiro assiste.', 'A trilha chega ao fim.', 'Nada mais a provar, tudo a ganhar.'],
}

export function buildLadder(): Mission[] {
  const missions: Mission[] = []
  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const world = worldOf(level)
    const position = positionOf(level)
    const data = WORLDS[world - 1]
    const rounds = composeRounds(level)
    const boss = isBossLevel(level) ? BOSSES[data.boss] : null
    const roster = rosterText(rounds)
    const roundWord = rounds.length === 1 ? 'uma rodada' : `${rounds.length} rodadas`
    if (boss) {
      missions.push({
        id: `nivel-${level}`,
        kind: 'main',
        order: level,
        level,
        world,
        boss: boss.id,
        title: boss.name,
        tagline: `${boss.epithet}: ${boss.title}.`,
        description: `${boss.intro} ${roster ? `Antes dele, ${roster} abrem a noite. ` : ''}Vencer o campeão paga o grande prêmio do mundo e abre ${world < WORLD_COUNT ? `o ${WORLDS[world].kicker}` : 'um novo ciclo da trilha'}.`,
        reward: bossReward(level),
        rounds,
        tier: ladderTier(level),
      })
      continue
    }
    const taglines = TAGLINES[world]
    missions.push({
      id: `nivel-${level}`,
      kind: 'main',
      order: level,
      level,
      world,
      title: TITLES[world - 1][position - 1],
      tagline: taglines[(position - 1) % taglines.length],
      description: `${data.flavor} Nesta noite: ${roster} em ${roundWord}. ${position >= 7 ? `O campeão do ${data.kicker} está a ${WORLD_SIZE - position} ${WORLD_SIZE - position === 1 ? 'luta' : 'lutas'} daqui.` : 'Prêmio pequeno, mas cada vitória aproxima o grande prêmio do campeão.'}`,
      reward: levelReward(level),
      rounds,
      tier: ladderTier(level),
    })
  }
  return missions
}

export { BOSS_IDS }
