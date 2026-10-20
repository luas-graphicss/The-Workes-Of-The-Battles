import type { Point } from '../../world-data'
import type { BindAction } from '../settings'
import type { RGB } from '../fx/textures'
import type { Loadout } from '../robot/parts'
import type { Friendship, Progress } from '../robot/progress'
import type { Direction } from '../sprite'

export type PilotLook = { hair: RGB; hairHi: RGB; coat: RGB; coatHi: RGB; pants: RGB; boot: RGB; lens: RGB }

export type Controls = { touch: boolean; key(action: BindAction): string }

export type Quiz = { question: string; options: readonly string[]; answer: number; wrong: string; right: string }

export type MasterId = 'lumen' | 'bigorna' | 'iara'

export type Master = {
  id: MasterId
  name: string
  title: string
  district: string
  at: Point
  facing: Direction
  look: PilotLook
  reward: number
  lesson(controls: Controls): string[]
  quiz: Quiz
  recap: string
}

export type RivalId = 'faisca' | 'parafuso' | 'brisa' | 'sucatinha'

export type Rival = {
  id: RivalId
  name: string
  origin: string
  district: string
  home: Point
  roam: number
  loadout: Loadout
  tint: RGB
  glow: RGB

  lines: readonly [string, string, string, string]
  hello: string
  waiting: string
}

const cards = (controls: Controls, from: BindAction, to: BindAction, touch: string) =>
  controls.touch ? touch : `teclas ${controls.key(from)} a ${controls.key(to)}`

export const MASTERS: readonly Master[] = [
  {
    id: 'lumen',
    name: 'Mestra Lúmen',
    title: 'Mestra das transformações',
    district: 'Praça do Cristal',
    at: [3420, 3860],
    facing: 'sw',
    look: {
      hair: [226, 230, 238],
      hairHi: [255, 255, 255],
      coat: [56, 148, 140],
      coatHi: [104, 206, 188],
      pants: [44, 52, 70],
      boot: [34, 38, 50],
      lens: [239, 199, 103],
    },
    reward: 120,
    lesson: (controls) => [
      'Então você é o piloto do B-01. Vi suas lutas na arena: muita força, pouco tempo certo. Vamos ajustar isso.',
      'Repare na barra de Carga do tablet. Ela enche quando o B-01 acerta e quando apanha, e enche muito mais quando você apara um golpe ou esquiva no último instante.',
      `Com a Carga cheia, as cartas de transformação acendem (${cards(controls, 'card5', 'card8', 'a segunda fileira de cartas do tablet')}). Cada uma gasta a Carga inteira e muda o B-01 por oito a dez segundos.`,
      'Titã aguenta pancada, Fantasma escapa de quase tudo, Sobrecarga dispara sem parar e Prisma... esse você descobre. O segredo é o momento: transforme quando o rival fraquejar ou quando o campeão preparar o golpe mais forte.',
    ],
    quiz: {
      question: 'Quando as cartas de transformação ficam prontas?',
      options: ['Quando a Energia passa da metade', 'Quando a barra de Carga enche', 'Logo no começo de cada luta'],
      answer: 1,
      wrong: 'Quase. A Energia paga os especiais; as transformações pedem a Carga cheia. Pense de novo.',
      right: 'Isso mesmo. Carga cheia, transformação pronta. Guarde essa lição e estes créditos para a próxima luta.',
    },
    recap: 'Carga cheia, transformação pronta. Aparar golpes enche a barra bem mais rápido do que bater.',
  },
  {
    id: 'bigorna',
    name: 'Mestre Bigorna',
    title: 'Mestre dos ataques especiais',
    district: 'Arena do Mirante',
    at: [3520, 6980],
    facing: 'w',
    look: {
      hair: [150, 150, 158],
      hairHi: [198, 198, 206],
      coat: [126, 56, 46],
      coatHi: [178, 92, 70],
      pants: [58, 50, 44],
      boot: [38, 30, 28],
      lens: [214, 132, 74],
    },
    reward: 120,
    lesson: (controls) => [
      'Ha! Mais um que acha que luta se ganha só no soco. Senta aí que eu explico os especiais.',
      `Os especiais custam Energia (${cards(controls, 'card1', 'card4', 'a primeira fileira de cartas do tablet')}). A Energia volta sozinha com o tempo, e o custo fica no canto de cada carta.`,
      'Depois de usada, a carta escurece enquanto recarrega. Use uma, troque para outra e volte quando ela clarear. Quem repete sempre a mesma carta passa a luta esperando.',
      'E leia o dossiê antes de subir no ringue: especial do elemento certo bate muito mais forte. Elemento errado, o rival quase não sente.',
    ],
    quiz: {
      question: 'O que paga os ataques especiais?',
      options: ['A Energia, que volta com o tempo', 'Os créditos da sua conta', 'A Carga das transformações'],
      answer: 0,
      wrong: 'Nada disso! Créditos ficam na conta e a Carga é das transformações. Tenta de novo.',
      right: 'Agora sim! Energia para os especiais e elemento certo contra o rival. Toma, para gastar na bancada.',
    },
    recap: 'Energia para os especiais, elemento certo contra o rival e nunca a mesma carta duas vezes seguidas.',
  },
  {
    id: 'iara',
    name: 'Mestra Iara',
    title: 'Guardiã da floresta',
    district: 'Parque da Árvore-Lume',
    at: [6880, 3690],
    facing: 's',
    look: {
      hair: [52, 74, 50],
      hairHi: [88, 120, 74],
      coat: [94, 120, 60],
      coatHi: [138, 166, 88],
      pants: [96, 74, 54],
      boot: [62, 46, 36],
      lens: [239, 199, 103],
    },
    reward: 100,
    lesson: (controls) => [
      'Psiu. Fale baixo, os vaga-lumes estão dormindo. Você tem jeito de quem gosta de explorar.',
      'A floresta em volta de Bosque Alto esconde três clareiras. Cada uma guarda uma peça exclusiva e uma carta secreta que não se compra em lugar nenhum.',
      'Procure trilhas de terra que somem entre as árvores, na borda da cidade. As pistas de onde cada uma começa ficam na estante da sua casa.',
      'Os relicários das clareiras têm selos: só abrem para quem já subiu na Trilha dos Campeões. Se encontrar um selo fechado, volte depois de mais vitórias.',
      `As cartas secretas entram no baralho ${controls.touch ? 'numa terceira fileira do tablet' : `nas teclas ${controls.key('card9')}, ${controls.key('card10')} e ${controls.key('card11')}`}. Ah, e peça gasta rende menos: passe na Cápsula de casa depois das lutas.`,
    ],
    quiz: {
      question: 'Onde ficam as pistas das clareiras?',
      options: ['No tablet de combate', 'Na estante da sua casa', 'Com os robôs fugitivos'],
      answer: 1,
      wrong: 'Não, não. Pense na sua casa... o que guarda as peças secretas? Tente outra vez.',
      right: 'Exato. A estante mostra o caminho; o resto você descobre andando. Leve isto para a jornada.',
    },
    recap: 'Trilhas de terra na borda da cidade, pistas na estante e paciência com os selos.',
  },
]

export const RIVALS: readonly Rival[] = [
  {
    id: 'faisca',
    name: 'Faísca',
    origin: 'Fugiu da usina de baterias',
    district: 'Bairro Antigo',
    home: [1180, 3420],
    roam: 220,
    loadout: { helmet: 'helmet-radar', weapon: null, mobility: 'move-springs', module: 'module-battery' },
    tint: [236, 196, 84],
    glow: [255, 244, 170],
    lines: [
      'Bzzt! Não chega perto que eu solto faísca! ...Espera, você não é da usina? Ufa. Eu sou o Faísca. Fugi de lá antes de virar pilha de controle remoto.',
      'Voltou! Vi sua luta pelo telão da praça. Uma dica de quem já fugiu de muita coisa: rival com pouca vida fica afobado. É a hora de aparar e transformar.',
      'Amigo de verdade divide o que tem. Toma: juntei esses créditos para comprar óleo, mas são seus. Você me mostrou que dá para ser um robô livre.',
      'Quando você vencer o próximo campeão, eu vou pular tão alto nessas molas que vou ver a arena daqui!',
    ],
    hello: 'Bzzt! Olha quem voltou. Chega mais, só cuidado com as faíscas.',
    waiting: 'Hmm, ainda estou te conhecendo. Vence mais uma na arena e volta para contar como foi.',
  },
  {
    id: 'parafuso',
    name: 'Parafuso',
    origin: 'Fugiu de uma loja de consertos',
    district: 'Mercado das Lanternas',
    home: [3330, 2160],
    roam: 160,
    loadout: { helmet: 'helmet-builder', weapon: 'weapon-wrench', mobility: 'move-wheels', module: 'module-backpack' },
    tint: [204, 128, 74],
    glow: [255, 214, 160],
    lines: [
      'Ei, cuidado com a mochila, tem peça solta aí dentro. Sou o Parafuso. A loja queria me desmontar para vender as partes; eu preferi me desmontar... de lá.',
      'Você de novo! Repara como o seu robô range quando anda? Peça gasta rende menos, e a Cápsula da sua casa cobra mais quanto maior o estrago. Não deixa acumular.',
      'Pronto, decidi: você é meu amigo. Toma esses créditos que eu ganhei consertando lanternas no mercado. Usa na Cápsula, viu?',
      'Se um dia precisar de uma chave inglesa, eu tenho. Na verdade eu SOU uma chave inglesa, praticamente.',
    ],
    hello: 'Opa, piloto! Chegou na hora: acabei de apertar meus parafusos.',
    waiting: 'Ainda não te conheço direito. Volta depois de mais uma vitória e a gente conversa de mecânico para mecânico.',
  },
  {
    id: 'brisa',
    name: 'Brisa',
    origin: 'Fugiu do moinho automático',
    district: 'Vila dos Moinhos',
    home: [1960, 5900],
    roam: 240,
    loadout: { helmet: 'helmet-cap', weapon: null, mobility: 'move-hover', module: 'module-fan' },
    tint: [128, 184, 230],
    glow: [220, 244, 255],
    lines: [
      'Fuuu... oi! Desculpa o vento. Eu sou a Brisa. Passei a vida girando a hélice de um moinho, até que um dia girei para o outro lado e saí voando.',
      'Sabia que lá de cima eu vejo a cidade toda? Tem trilhas de terra sumindo na floresta, bem na borda. Uma delas começa atrás dos moinhos, onde a cerca acaba.',
      'Você é o primeiro humano que não tentou me prender num moinho. Isso merece um presente: os créditos que o vento me trouxe.',
      'Hoje o vento está bom para voar baixo. Quer apostar corrida até a praça? Brincadeira, você ia perder.',
    ],
    hello: 'Fuuu! Que bom te ver. O vento disse que você vinha.',
    waiting: 'Hmm, o vento ainda não me disse se posso confiar em você. Vence mais uma luta e volta.',
  },
  {
    id: 'sucatinha',
    name: 'Sucatinha',
    origin: 'Fugiu do ferro-velho',
    district: 'Jardins do Lago',
    home: [5760, 6900],
    roam: 220,
    loadout: { helmet: 'helmet-miner', weapon: 'weapon-claw', mobility: 'move-tracks', module: 'module-lantern' },
    tint: [150, 164, 96],
    glow: [240, 236, 170],
    lines: [
      'Ah... oi. Ninguém fala comigo, eu sou meio enferrujado. Me chamam de Sucatinha. Fugi do ferro-velho antes de me transformarem numa geladeira.',
      'Você voltou mesmo! Eu acho coisas no lago, sabia? Ontem achei um parafuso brilhante. Hoje acho que achei um amigo.',
      'Amigo! Amigo de verdade! Toma, é tudo o que eu juntei vendendo sucata. Não é muito, mas é de coração. De motor, no caso.',
      'Minha lanterna pisca quando eu fico feliz. Repara: está piscando agora.',
    ],
    hello: 'Oi... de novo. Eu estava torcendo para você aparecer.',
    waiting: 'Eu sou tímido... vence mais uma luta e volta, aí eu falo mais.',
  },
]

export const FRIEND_MAX = 3
export const FRIEND_LEVELS = ['Desconhecido', 'Conhecido', 'Colega', 'Amigo'] as const
export const FRIEND_GIFT = 120
export const OIL_PRICE = 40

export function masterById(id: string) {
  return MASTERS.find((master) => master.id === id) ?? null
}

export function rivalById(id: string) {
  return RIVALS.find((rival) => rival.id === id) ?? null
}

export function lessonDone(progress: Progress, id: MasterId) {
  return progress.lessons.includes(id)
}

export function completeLesson(progress: Progress, master: Master): boolean {
  if (lessonDone(progress, master.id)) return false
  progress.lessons.push(master.id)
  progress.credits += master.reward
  return true
}

export function friendship(progress: Progress, id: RivalId): Friendship {
  return progress.friends[id] ?? { level: 0, lastWin: 0 }
}

export function canGrow(progress: Progress, id: RivalId) {
  const { level, lastWin } = friendship(progress, id)
  return level < FRIEND_MAX && (level === 0 || progress.missions.wins > lastWin)
}

export type BefriendResult = 'met' | 'closer' | 'friends' | 'waiting' | 'poor' | 'max'

export function befriend(progress: Progress, id: RivalId, oil = false): BefriendResult {
  const { level } = friendship(progress, id)
  if (level >= FRIEND_MAX) return 'max'
  if (oil) {
    if (progress.credits < OIL_PRICE) return 'poor'
    progress.credits -= OIL_PRICE
  } else if (!canGrow(progress, id)) {
    return 'waiting'
  }
  const next = level + 1
  progress.friends[id] = { level: next, lastWin: progress.missions.wins }
  if (next === FRIEND_MAX) progress.credits += FRIEND_GIFT
  return next === 1 ? 'met' : next === FRIEND_MAX ? 'friends' : 'closer'
}
