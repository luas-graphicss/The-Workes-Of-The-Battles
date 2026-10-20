import type { BossId } from '../battle/bosses'
import type { EnemyKind } from '../battle/enemies'
import { buildLadder } from './ladder'

export type MissionKind = 'main' | 'side'

export type Wave = { kind: EnemyKind; count: number; boss?: BossId }

export type Mission = {
  id: string
  kind: MissionKind
  order: number
  title: string
  tagline: string
  description: string
  reward: number
  firstBonus?: number
  rounds: Wave[][]
  tier: number
  site?: string
  alienChance?: number

  level?: number
  outro?: string
  world?: number
  boss?: BossId
}

export const MAIN_MISSIONS: readonly Mission[] = buildLadder()

export const SIDE_MISSIONS: readonly Mission[] = [
  {
    id: 'fuga-oeste',
    kind: 'side',
    order: 0,
    site: 'factory-oeste',
    title: 'Fuga na Fundição',
    tagline: 'Sentinelas saem da linha de montagem armados.',
    description:
      'O alarme da Fundição Oeste toca de novo: Sentinelas recém-montados arrombaram o portão e vêm pela Rua dos Jardins. Contenha a fuga antes que cheguem às casas.',
    reward: 60,
    firstBonus: 80,
    rounds: [
      [
        { kind: 'sentinel', count: 2 },
        { kind: 'drone', count: 1 },
      ],
    ],
    tier: 1,
    alienChance: 0.2,
  },
  {
    id: 'turno-noite',
    kind: 'side',
    order: 0,
    site: 'factory-sul',
    title: 'Turno da Noite',
    tagline: 'Um Brutamontes de teste escapou da Engrenagem.',
    description:
      'A Fábrica Engrenagem testava um Brutamontes quando ele arrancou a porta da baia. Um Sentinela foi atrás para "ajudar" e agora os dois caçam qualquer robô na rua.',
    reward: 90,
    firstBonus: 100,
    rounds: [
      [
        { kind: 'sentinel', count: 1 },
        { kind: 'brute', count: 1 },
      ],
    ],
    tier: 1.15,
    alienChance: 0.2,
  },
  {
    id: 'linha-montagem',
    kind: 'side',
    order: 0,
    site: 'factory-leste',
    title: 'Linha de Montagem',
    tagline: 'Zangões em série, zumbindo pela avenida.',
    description:
      'A Autômatos do Leste produz Zangões em lote, e um lote inteiro ganhou vontade própria. Eles são rápidos, mas quebram fácil. Fique perto do portão e golpeie quando passarem.',
    reward: 90,
    firstBonus: 100,
    rounds: [
      [
        { kind: 'drone', count: 3 },
        { kind: 'sentinel', count: 1 },
      ],
    ],
    tier: 1.2,
    alienChance: 0.25,
  },
  {
    id: 'vitrine',
    kind: 'side',
    order: 0,
    site: 'shop-norte',
    title: 'Vitrine Quebrada',
    tagline: 'Os robôs da Robô & Cia saíram da vitrine.',
    description:
      'Dois Sentinelas de mostruário acordaram no meio da noite e quebraram a vitrine da Robô & Cia. O dono promete recompensa a quem os trouxer de volta em pedaços.',
    reward: 55,
    firstBonus: 70,
    rounds: [[{ kind: 'sentinel', count: 2 }]],
    tier: 1,
    alienChance: 0.15,
  },
  {
    id: 'estoque',
    kind: 'side',
    order: 0,
    site: 'shop-oeste',
    title: 'Estoque Rebelde',
    tagline: 'O depósito da Casa dos Androides se esvaziou sozinho.',
    description:
      'A Casa dos Androides guardava Zangões no porão. Guardava. Agora eles zunem pelo Bairro Antigo com um Sentinela liderando a turma.',
    reward: 65,
    firstBonus: 80,
    rounds: [
      [
        { kind: 'drone', count: 2 },
        { kind: 'sentinel', count: 1 },
      ],
    ],
    tier: 1.1,
    alienChance: 0.2,
  },
  {
    id: 'promocao',
    kind: 'side',
    order: 0,
    site: 'shop-sul',
    title: 'Promoção Perigosa',
    tagline: 'Liquidação na Loja Parafuso: tudo deve sair, inclusive os robôs.',
    description:
      'A Loja Parafuso anunciou liquidação e os robôs entenderam literalmente. Um Sentinela e dois Zangões correm pela Rua do Lago assustando os pescadores.',
    reward: 65,
    firstBonus: 80,
    rounds: [
      [
        { kind: 'sentinel', count: 1 },
        { kind: 'drone', count: 2 },
      ],
    ],
    tier: 1.1,
    alienChance: 0.2,
  },
  {
    id: 'pescadores',
    kind: 'side',
    order: 0,
    site: 'shop-riacho',
    title: 'Pesca Proibida',
    tagline: 'Os robôs pescadores da Ferro & Rio voltaram do lago mandando em tudo.',
    description:
      'A Ferro & Rio conserta os robôs dos pescadores da Vila do Riacho. Três deles voltaram do lago com vontade própria e agora patrulham a ponte cobrando pedágio em sucata. Um Brutamontes de carga vem atrás para "ajudar".',
    reward: 110,
    firstBonus: 110,
    rounds: [
      [
        { kind: 'sentinel', count: 2 },
        { kind: 'drone', count: 1 },
      ],
      [{ kind: 'brute', count: 1 }],
    ],
    tier: 1.3,
    alienChance: 0.25,
  },
  {
    id: 'colheita',
    kind: 'side',
    order: 0,
    site: 'factory-campos',
    title: 'Colheita Rebelde',
    tagline: 'Os Zangões da moageira trocaram o trigo pelos fazendeiros.',
    description:
      'A Moageira do Sul usava Zangões para colher e um Brutamontes para carregar os sacos. Numa noite de vento forte, o lote inteiro decidiu que os Campos do Sul agora eram deles. Contenha a revolta antes que a colheita vá para o chão.',
    reward: 120,
    firstBonus: 120,
    rounds: [
      [{ kind: 'drone', count: 3 }],
      [
        { kind: 'brute', count: 1 },
        { kind: 'sentinel', count: 1 },
      ],
    ],
    tier: 1.35,
    alienChance: 0.3,
  },
]

export const MISSIONS: readonly Mission[] = [...MAIN_MISSIONS, ...SIDE_MISSIONS]

export function missionById(id: string | null | undefined): Mission | null {
  return id ? MISSIONS.find((mission) => mission.id === id) ?? null : null
}

export function missionForSite(siteId: string): Mission | null {
  return SIDE_MISSIONS.find((mission) => mission.site === siteId) ?? null
}
