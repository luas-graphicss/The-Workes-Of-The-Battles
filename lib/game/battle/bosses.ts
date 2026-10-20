import type { CardId } from './deck'
import type { EnemyDef, EnemyKind } from './enemies'

export type BossId = 'capitao' | 'prime' | 'rainha' | 'arauto' | 'ferrugem' | 'tempestade' | 'eclipse' | 'colosso' | 'lenda' | 'coracao'

export type BossDef = EnemyDef & {
  id: BossId
  world: number
  epithet: string
  intro: string
  cards: CardId[]
}

type Row = {
  id: BossId
  kind: EnemyKind
  name: string
  title: string
  epithet: string
  intro: string
  hint: string
  speed: number
  reach: number
  cooldown: number
  windup: number
  behaviour: EnemyDef['behaviour']
  scale: number
  loadout: EnemyDef['loadout']
  tint: EnemyDef['tint']
  glow: EnemyDef['glow']
  pushback: number
  shot?: EnemyDef['shot']
  cards: CardId[]
}

const bossHealth = (world: number) => 300 + 92 * world
const bossDamage = (world: number) => 14 + 2.9 * world
const bossBounty = (world: number) => 70 + 30 * world

const ROWS: Row[] = [
  {
    id: 'capitao',
    kind: 'sentinel',
    name: 'Capitão R-7X',
    title: 'o primeiro muro do Mirante',
    epithet: 'Campeão do Mundo 1',
    intro: 'O Sentinela que comanda a patrulha da Fundição Oeste. Dispara mais rápido que os outros e nunca recua.',
    hint: 'Aparo devolve o pulso dele com juros. Golpeie entre uma rajada e outra.',
    speed: 330,
    reach: 100,
    cooldown: 1.35,
    windup: 0.4,
    behaviour: 'chaser',
    scale: 1.2,
    loadout: { helmet: 'helmet-knight', weapon: 'weapon-blaster', mobility: 'move-tracks', module: 'module-shield' },
    tint: [96, 118, 164],
    glow: [255, 214, 110],
    pushback: 0.7,
    shot: { speed: 690, life: 1.2, damage: 11, size: 16 },
    cards: ['rajada', 'sobrecarga'],
  },
  {
    id: 'prime',
    kind: 'brute',
    name: 'Brutamontes Prime',
    title: 'T-9M de demolição',
    epithet: 'Campeão do Mundo 2',
    intro: 'A Engrenagem fundiu um Brutamontes com o dobro de placas e um martelo que já derrubou uma ponte.',
    hint: 'O círculo vermelho é maior do que parece. Saia e castigue quando o martelo estiver no chão.',
    speed: 180,
    reach: 165,
    cooldown: 2.6,
    windup: 0.95,
    behaviour: 'bruiser',
    scale: 1.5,
    loadout: { helmet: 'helmet-builder', weapon: 'weapon-hammer', mobility: 'move-heavy', module: 'module-armor' },
    tint: [172, 62, 50],
    glow: [255, 150, 70],
    pushback: 0.2,
    cards: ['onda', 'tita'],
  },
  {
    id: 'rainha',
    kind: 'drone',
    name: 'Rainha Zangão',
    title: 'Z-3Q, a matriz do enxame',
    epithet: 'Campeã do Mundo 3',
    intro: 'O lote inteiro da Autômatos do Leste obedece a ela. Voa mais alto, investe mais fundo e não quebra fácil.',
    hint: 'Ela orbita e investe. Defenda quando o zumbido subir de tom e golpeie na saída da investida.',
    speed: 480,
    reach: 84,
    cooldown: 1.05,
    windup: 0.3,
    behaviour: 'orbiter',
    scale: 1.15,
    loadout: { helmet: 'helmet-radar', weapon: 'weapon-saw', mobility: 'move-hover', module: 'module-jetpack' },
    tint: [222, 182, 62],
    glow: [120, 255, 236],
    pushback: 1.1,
    cards: ['investida', 'fantasma'],
  },
  {
    id: 'arauto',
    kind: 'alien',
    name: 'Arauto das Estrelas',
    title: 'veio antes do meteoro',
    epithet: 'Campeão do Mundo 4',
    intro: 'Um visitante maior que os outros, com três olhos de luz. Some, reaparece e chama chuva de meteoros.',
    hint: 'Os círculos no chão mostram onde a chuva cai. Fique perto dele: a chuva mira onde você estava.',
    speed: 265,
    reach: 96,
    cooldown: 1.9,
    windup: 0.55,
    behaviour: 'phaser',
    scale: 1.3,
    loadout: null,
    tint: [124, 82, 232],
    glow: [222, 184, 255],
    pushback: 1,
    shot: { speed: 590, life: 1.6, damage: 14, size: 20 },
    cards: ['chuva', 'prisma'],
  },
  {
    id: 'ferrugem',
    kind: 'brute',
    name: 'Ferrugem',
    title: 'o campeão caído de Bosque Alto',
    epithet: 'Campeão do Mundo 5',
    intro: 'Antes do B-01, Ferrugem defendia o título todas as noites. Voltou com a maça de meteoro e pés de golem.',
    hint: 'Ele não cambaleia. Use esquiva perfeita para abrir espaço e castigue na recuperação da maça.',
    speed: 195,
    reach: 170,
    cooldown: 2.4,
    windup: 0.9,
    behaviour: 'bruiser',
    scale: 1.55,
    loadout: { helmet: 'helmet-crown', weapon: 'weapon-meteor-mace', mobility: 'move-golem', module: 'module-meteor-core' },
    tint: [156, 92, 52],
    glow: [255, 176, 64],
    pushback: 0.15,
    cards: ['onda', 'tita'],
  },
  {
    id: 'tempestade',
    kind: 'sentinel',
    name: 'Tempestade',
    title: 'R-7 reprogramada pelo raio',
    epithet: 'Campeã do Mundo 6',
    intro: 'Um raio caiu na linha de montagem e esta Sentinela acordou diferente: patins, laser e asas de cristal.',
    hint: 'Ela atira em sequência. Aparo no primeiro feixe quebra a cadência; aproxime-se na brecha.',
    speed: 370,
    reach: 100,
    cooldown: 1.2,
    windup: 0.35,
    behaviour: 'chaser',
    scale: 1.25,
    loadout: { helmet: 'helmet-visor', weapon: 'weapon-laser', mobility: 'move-skates', module: 'module-crystal-wings' },
    tint: [82, 124, 196],
    glow: [164, 224, 255],
    pushback: 0.7,
    shot: { speed: 780, life: 1.3, damage: 15, size: 16 },
    cards: ['rajada', 'sobrecarga'],
  },
  {
    id: 'eclipse',
    kind: 'alien',
    name: 'Eclipse',
    title: 'a sombra do visitante',
    epithet: 'Campeão do Mundo 7',
    intro: 'Quando o Arauto caiu, algo escapou da luz dele. Eclipse se move no escuro e drena quem o toca.',
    hint: 'Ele vira fantasma abaixo da metade da vida. Espere ele reaparecer e use cartas de área.',
    speed: 285,
    reach: 96,
    cooldown: 1.7,
    windup: 0.5,
    behaviour: 'phaser',
    scale: 1.35,
    loadout: null,
    tint: [64, 44, 96],
    glow: [186, 126, 255],
    pushback: 0.9,
    shot: { speed: 630, life: 1.7, damage: 17, size: 20 },
    cards: ['chuva', 'fantasma'],
  },
  {
    id: 'colosso',
    kind: 'brute',
    name: 'Colosso',
    title: 'o maior chassi já fundido',
    epithet: 'Campeão do Mundo 8',
    intro: 'As três fábricas trabalharam juntas uma única vez. O resultado precisou sair pelo telhado.',
    hint: 'Lento, mas cada soco derruba. Mantenha distância, atire e só entre quando ele estiver se recuperando.',
    speed: 172,
    reach: 185,
    cooldown: 2.5,
    windup: 1.0,
    behaviour: 'bruiser',
    scale: 1.75,
    loadout: { helmet: 'helmet-diver', weapon: 'weapon-boxing', mobility: 'move-tracks', module: 'module-armor' },
    tint: [104, 104, 116],
    glow: [255, 204, 124],
    pushback: 0.1,
    cards: ['onda', 'tita'],
  },
  {
    id: 'lenda',
    kind: 'sentinel',
    name: 'Lenda Dourada',
    title: 'o campeão de todas as noites',
    epithet: 'Campeão do Mundo 9',
    intro: 'Dizem que nunca perdeu. Kabuto, lâmina de cristal e um orbe alienígena que pensa junto com ele.',
    hint: 'Ele assume o elemento forte contra você na Forma Prisma. Troque o ritmo: esquive, não aparar sempre.',
    speed: 385,
    reach: 112,
    cooldown: 1.1,
    windup: 0.35,
    behaviour: 'chaser',
    scale: 1.3,
    loadout: { helmet: 'helmet-samurai', weapon: 'weapon-crystal-blade', mobility: 'move-alien-legs', module: 'module-alien-orb' },
    tint: [212, 172, 72],
    glow: [255, 242, 186],
    pushback: 0.6,
    shot: { speed: 800, life: 1.3, damage: 18, size: 18 },
    cards: ['investida', 'prisma'],
  },
  {
    id: 'coracao',
    kind: 'alien',
    name: 'Coração do Meteoro',
    title: 'o que caiu com você',
    epithet: 'Campeão do Mundo 10',
    intro: 'O núcleo que acordou o B-01 tinha um irmão. Ele quer o ringue, a cidade e o seu lugar no céu.',
    hint: 'Tudo que ele tem, você também tem. Carga cheia no momento certo decide a luta.',
    speed: 305,
    reach: 104,
    cooldown: 1.5,
    windup: 0.5,
    behaviour: 'phaser',
    scale: 1.6,
    loadout: null,
    tint: [232, 104, 64],
    glow: [255, 224, 156],
    pushback: 0.8,
    shot: { speed: 710, life: 1.8, damage: 20, size: 24 },
    cards: ['chuva', 'sobrecarga'],
  },
]

export const BOSSES: Record<BossId, BossDef> = Object.fromEntries(
  ROWS.map((row, index) => {
    const world = index + 1
    const def: BossDef = {
      ...row,
      world,
      health: bossHealth(world),
      damage: Math.round(bossDamage(world)),
      bounty: bossBounty(world),
      boss: true,
    }
    return [row.id, def]
  }),
) as Record<BossId, BossDef>

export const BOSS_IDS: readonly BossId[] = ROWS.map((row) => row.id)

export function bossForWorld(world: number): BossDef {
  return BOSSES[BOSS_IDS[Math.max(0, Math.min(BOSS_IDS.length - 1, world - 1))]]
}

export function isBossId(value: unknown): value is BossId {
  return typeof value === 'string' && (BOSS_IDS as readonly string[]).includes(value)
}
