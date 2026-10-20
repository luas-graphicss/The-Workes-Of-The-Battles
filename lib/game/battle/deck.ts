import type { RGB } from '../fx/textures'

export type CardKind = 'special' | 'transform'
export type CardId = 'rajada' | 'onda' | 'investida' | 'chuva' | 'tita' | 'fantasma' | 'sobrecarga' | 'prisma' | 'enxame' | 'raizes' | 'orvalho'

export const CHARGE_FULL = 100

export const TABLET_LOCK = 2.8

export const TRANSFORM_LOCK = 1.4

export const ADAPTATION_STEP = 0.2
export const ADAPTATION_FLOOR = 0.42

export const ADAPTATION_FADE = 12

export const CARD_IDS: readonly CardId[] = ['rajada', 'onda', 'investida', 'chuva', 'tita', 'fantasma', 'sobrecarga', 'prisma', 'enxame', 'raizes', 'orvalho']
export const SPECIAL_CARDS: readonly CardId[] = ['rajada', 'onda', 'investida', 'chuva']
export const TRANSFORM_CARDS: readonly CardId[] = ['tita', 'fantasma', 'sobrecarga', 'prisma']

export const SECRET_CARDS: readonly CardId[] = ['enxame', 'raizes', 'orvalho']
export const BASE_CARDS: readonly CardId[] = [...SPECIAL_CARDS, ...TRANSFORM_CARDS]
export const HAND_SIZE = 3
export const DRAFT_OFFER = 5
export const DEFAULT_HAND: readonly CardId[] = ['rajada', 'investida', 'tita']

export type FormMods = {
  melee?: number
  shot?: number
  shotCooldown?: number
  shotCost?: number
  armor?: number
  speed?: number
  regen?: number
  knock?: number
  dodgeCost?: number
  parry?: number
  scale?: number
  alpha?: number
  phase?: number
  extraBolts?: number
  extraPower?: number
  ailmentBoost?: number
  overheat?: number
  sureAilment?: boolean
  steady?: boolean
  prism?: boolean
}

export type CardDef = {
  id: CardId
  kind: CardKind
  name: string
  short: string
  title: string
  description: string
  cost: number
  cooldown: number
  duration?: number
  power?: number
  base?: 'melee' | 'shot'
  form?: FormMods
  key: string
  code: string
  art: string
  accent: RGB

  origin?: string
}

export const CARDS: Record<CardId, CardDef> = {
  rajada: {
    id: 'rajada',
    kind: 'special',
    name: 'Rajada Quíntupla',
    short: 'Rajada',
    title: 'cinco de uma vez',
    description: 'Dispara cinco projéteis do seu elemento em leque. Cada um causa 55% de um tiro e pode aplicar o efeito do elemento.',
    cost: 42,
    cooldown: 9,
    power: 0.55,
    base: 'shot',
    key: '1',
    code: 'Digit1',
    art: 'assets/ui/cards/rajada.webp',
    accent: [255, 170, 90],
  },
  onda: {
    id: 'onda',
    kind: 'special',
    name: 'Onda de Choque',
    short: 'Onda',
    title: 'o chão responde',
    description: 'Um impacto no chão que se espalha em círculo. Acerta todos em volta com 115% do golpe, empurra longe e aplica o elemento.',
    cost: 48,
    cooldown: 12,
    power: 1.15,
    base: 'melee',
    key: '2',
    code: 'Digit2',
    art: 'assets/ui/cards/onda.webp',
    accent: [120, 255, 224],
  },
  investida: {
    id: 'investida',
    kind: 'special',
    name: 'Investida Elemental',
    short: 'Investida',
    title: 'atravesse o ringue',
    description: 'O robô vira um projétil: avança invulnerável e acerta tudo no caminho com 100% do golpe, deixando um rastro do elemento.',
    cost: 36,
    cooldown: 8,
    power: 1,
    base: 'melee',
    key: '3',
    code: 'Digit3',
    art: 'assets/ui/cards/investida.webp',
    accent: [255, 214, 110],
  },
  chuva: {
    id: 'chuva',
    kind: 'special',
    name: 'Chuva Elemental',
    short: 'Chuva',
    title: 'chamada do céu',
    description: 'Seis meteoros do seu elemento caem ao redor do alvo mais próximo. Cada um causa 70% de um tiro numa área; os círculos mostram onde.',
    cost: 60,
    cooldown: 18,
    power: 0.7,
    base: 'shot',
    key: '4',
    code: 'Digit4',
    art: 'assets/ui/cards/chuva.webp',
    accent: [200, 150, 255],
  },
  tita: {
    id: 'tita',
    kind: 'transform',
    name: 'Forma Titã',
    short: 'Titã',
    title: 'maior que o ringue',
    description: 'O chassi cresce e endurece: golpes +50%, sofre 35% menos dano, não cambaleia. Em troca, anda 25% mais devagar.',
    cost: CHARGE_FULL,
    cooldown: 28,
    duration: 8,
    form: { melee: 1.5, armor: 0.65, speed: 0.75, knock: 1.6, scale: 1.3, steady: true },
    key: '5',
    code: 'Digit5',
    art: 'assets/ui/cards/tita.webp',
    accent: [255, 196, 96],
  },
  fantasma: {
    id: 'fantasma',
    kind: 'transform',
    name: 'Forma Fantasma',
    short: 'Fantasma',
    title: 'quase não está aqui',
    description: 'O robô fica translúcido e veloz: anda 35% mais rápido, esquiva de graça, e um terço dos golpes atravessa sem ferir.',
    cost: CHARGE_FULL,
    cooldown: 28,
    duration: 8,
    form: { speed: 1.35, dodgeCost: 0, phase: 0.33, alpha: 0.55, melee: 0.9 },
    key: '6',
    code: 'Digit6',
    art: 'assets/ui/cards/fantasma.webp',
    accent: [150, 220, 255],
  },
  sobrecarga: {
    id: 'sobrecarga',
    kind: 'transform',
    name: 'Sobrecarga do Núcleo',
    short: 'Sobrecarga',
    title: 'tudo de uma vez',
    description: 'O núcleo trabalha no limite: tiros 13% mais rápidos e 10% mais baratos, dois projéteis laterais com 30% da força e um pouco mais de chance de aplicar o elemento. Quando a forma acaba, o núcleo superaquece e fica 4 segundos sem regenerar energia.',
    cost: CHARGE_FULL,
    cooldown: 36,
    duration: 5,
    form: { shotCooldown: 0.87, shotCost: 0.9, extraBolts: 1, extraPower: 0.3, ailmentBoost: 1.3, overheat: 4 },
    key: '7',
    code: 'Digit7',
    art: 'assets/ui/cards/sobrecarga.webp',
    accent: [255, 120, 90],
  },
  prisma: {
    id: 'prisma',
    kind: 'transform',
    name: 'Forma Prisma',
    short: 'Prisma',
    title: 'o elemento que falta',
    description: 'O núcleo refrata e assume, a cada golpe, o elemento forte contra o alvo. A janela de aparo dobra e os projéteis aparados voltam com o dobro de força.',
    cost: CHARGE_FULL,
    cooldown: 28,
    duration: 8,
    form: { prism: true, parry: 2 },
    key: '8',
    code: 'Digit8',
    art: 'assets/ui/cards/prisma.webp',
    accent: [255, 255, 255],
  },
  enxame: {
    id: 'enxame',
    kind: 'special',
    name: 'Enxame de Vaga-lumes',
    short: 'Enxame',
    title: 'luz em volta',
    description: 'Oito vaga-lumes do seu elemento saem em círculo e perseguem quem estiver perto. Cada um causa 50% de um tiro e ofusca o alvo.',
    cost: 46,
    cooldown: 13,
    power: 0.5,
    base: 'shot',
    key: '9',
    code: 'Digit9',
    art: 'assets/ui/cards/enxame.webp',
    accent: [180, 255, 120],
    origin: 'Clareira dos Vaga-lumes',
  },
  raizes: {
    id: 'raizes',
    kind: 'special',
    name: 'Muralha de Raízes',
    short: 'Raízes',
    title: 'a floresta segura',
    description: 'Raízes com espinhos de âmbar saltam do chão em volta de você: todos perto levam 80% do golpe, voam longe e ficam presos por dois segundos.',
    cost: 52,
    cooldown: 16,
    power: 0.8,
    base: 'melee',
    key: '0',
    code: 'Digit0',
    art: 'assets/ui/cards/raizes.webp',
    accent: [255, 190, 90],
    origin: 'Clareira das Raízes',
  },
  orvalho: {
    id: 'orvalho',
    kind: 'special',
    name: 'Orvalho da Clareira',
    short: 'Orvalho',
    title: 'a manhã volta',
    description: 'Gotas de luz caem sobre o robô: recupera 25% do núcleo, limpa todas as condições e devolve um pouco de energia. Não causa dano.',
    cost: 58,
    cooldown: 24,
    key: '-',
    code: 'Minus',
    art: 'assets/ui/cards/orvalho.webp',
    accent: [170, 230, 255],
    origin: 'Clareira do Orvalho',
  },
}

export function isSecretCard(id: CardId): boolean {
  return SECRET_CARDS.includes(id)
}

export function cardDef(id: CardId): CardDef {
  return CARDS[id]
}

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && (CARD_IDS as readonly string[]).includes(value)
}

export function cardKindLabel(id: CardId): string {
  return isSecretCard(id) ? 'Secreta' : CARDS[id].kind === 'special' ? 'Especial' : 'Transformação'
}

export function cardCostLabel(id: CardId): string {
  const card = CARDS[id]
  return card.kind === 'special' ? `${card.cost} de energia` : 'Carga cheia'
}
