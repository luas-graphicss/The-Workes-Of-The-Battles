import type { RGB } from '../fx/textures'

export type Element = 'fogo' | 'agua' | 'terra' | 'vento' | 'raio' | 'gelo' | 'luz' | 'sombra'

export const ELEMENT_IDS: readonly Element[] = ['fogo', 'agua', 'terra', 'vento', 'raio', 'gelo', 'luz', 'sombra']

export type Ailment = 'queimadura' | 'encharcado' | 'abalado' | 'arrastado' | 'choque' | 'congelado' | 'ofuscado' | 'drenado'

export type AilmentDef = {
  id: Ailment
  name: string
  effect: string
  duration: number
}

export type ElementDef = {
  id: Element
  name: string
  epithet: { m: string; f: string }
  matter: string
  description: string
  color: RGB
  glow: RGB
  dark: RGB
  strong: readonly [Element, Element]
  ailment: Ailment
  icon: string
}

export const AILMENTS: Record<Ailment, AilmentDef> = {
  queimadura: { id: 'queimadura', name: 'Queimadura', effect: 'perde núcleo aos poucos enquanto arde', duration: 3.2 },
  encharcado: { id: 'encharcado', name: 'Encharcado', effect: 'anda mais devagar e conduz choques (+50% de Raio)', duration: 4 },
  abalado: { id: 'abalado', name: 'Abalado', effect: 'cambaleia e é empurrado para muito mais longe', duration: 0.8 },
  arrastado: { id: 'arrastado', name: 'Arrastado', effect: 'é jogado pelo vento e perde a mira por um instante', duration: 1.4 },
  choque: { id: 'choque', name: 'Choque', effect: 'trava no lugar, sem agir, por um instante', duration: 0.75 },
  congelado: { id: 'congelado', name: 'Congelado', effect: 'muito mais lento; ataques e cartas recarregam devagar', duration: 3.5 },
  ofuscado: { id: 'ofuscado', name: 'Ofuscado', effect: 'perde a mira: metade dos golpes erra o alvo', duration: 2.6 },
  drenado: { id: 'drenado', name: 'Drenado', effect: 'o dano sofrido vira núcleo para quem o acertou', duration: 3 },
}

export const ELEMENTS: Record<Element, ElementDef> = {
  fogo: {
    id: 'fogo',
    name: 'Fogo',
    epithet: { m: 'Ígneo', f: 'Ígnea' },
    matter: 'de Brasa',
    description: 'Um núcleo que nunca esfria. Cada golpe deixa brasas e queima por mais alguns segundos.',
    color: [255, 128, 48],
    glow: [255, 232, 150],
    dark: [150, 36, 18],
    strong: ['gelo', 'sombra'],
    ailment: 'queimadura',
    icon: 'assets/ui/elements/fogo.webp',
  },
  agua: {
    id: 'agua',
    name: 'Água',
    epithet: { m: 'das Marés', f: 'das Marés' },
    matter: 'de Maré',
    description: 'Flui em volta de qualquer defesa e encharca o adversário, deixando-o lento e condutor.',
    color: [70, 160, 255],
    glow: [200, 240, 255],
    dark: [20, 60, 140],
    strong: ['fogo', 'terra'],
    ailment: 'encharcado',
    icon: 'assets/ui/elements/agua.webp',
  },
  terra: {
    id: 'terra',
    name: 'Terra',
    epithet: { m: 'de Pedra', f: 'de Pedra' },
    matter: 'de Rocha',
    description: 'Peso e paciência. Bate devagar, mas cada impacto abala o chão e joga o inimigo longe.',
    color: [176, 128, 80],
    glow: [240, 214, 160],
    dark: [84, 56, 32],
    strong: ['raio', 'vento'],
    ailment: 'abalado',
    icon: 'assets/ui/elements/terra.webp',
  },
  vento: {
    id: 'vento',
    name: 'Vento',
    epithet: { m: 'Ciclônico', f: 'Ciclônica' },
    matter: 'de Rajada',
    description: 'Lâminas de ar que cortam de longe e arrastam quem está no caminho para fora de posição.',
    color: [170, 236, 220],
    glow: [240, 255, 250],
    dark: [60, 120, 120],
    strong: ['fogo', 'luz'],
    ailment: 'arrastado',
    icon: 'assets/ui/elements/vento.webp',
  },
  raio: {
    id: 'raio',
    name: 'Raio',
    epithet: { m: 'Trovejante', f: 'Trovejante' },
    matter: 'de Faísca',
    description: 'Puro impulso elétrico. Rápido, errático, e trava os circuitos de quem leva o choque.',
    color: [255, 230, 80],
    glow: [255, 255, 220],
    dark: [120, 90, 10],
    strong: ['agua', 'vento'],
    ailment: 'choque',
    icon: 'assets/ui/elements/raio.webp',
  },
  gelo: {
    id: 'gelo',
    name: 'Gelo',
    epithet: { m: 'Glacial', f: 'Glacial' },
    matter: 'de Geada',
    description: 'Cristais que congelam juntas e engrenagens. O inimigo congelado mal consegue reagir.',
    color: [150, 220, 255],
    glow: [235, 250, 255],
    dark: [40, 100, 160],
    strong: ['agua', 'terra'],
    ailment: 'congelado',
    icon: 'assets/ui/elements/gelo.webp',
  },
  luz: {
    id: 'luz',
    name: 'Luz',
    epithet: { m: 'Prismático', f: 'Prismática' },
    matter: 'de Prisma',
    description: 'Feixes puros do cristal da praça. Ofuscam sensores e dissolvem sombras ao toque.',
    color: [255, 244, 190],
    glow: [255, 255, 255],
    dark: [200, 160, 60],
    strong: ['sombra', 'gelo'],
    ailment: 'ofuscado',
    icon: 'assets/ui/elements/luz.webp',
  },
  sombra: {
    id: 'sombra',
    name: 'Sombra',
    epithet: { m: 'Umbral', f: 'Umbral' },
    matter: 'de Névoa',
    description: 'A escuridão que veio junto com o meteoro. Drena energia de quem toca e devolve a quem a usa.',
    color: [140, 80, 220],
    glow: [220, 180, 255],
    dark: [40, 16, 80],
    strong: ['luz', 'raio'],
    ailment: 'drenado',
    icon: 'assets/ui/elements/sombra.webp',
  },
}

export type Effectiveness = 'super' | 'normal' | 'weak' | 'resist'

export const EFFECT_FACTOR: Record<Effectiveness, number> = { super: 1.5, normal: 1, weak: 0.65, resist: 0.8 }

export const EFFECT_LABEL: Record<Effectiveness, string> = { super: 'Super eficaz!', normal: '', weak: 'Pouco eficaz…', resist: 'Resistiu' }

export function effectiveness(attacker: Element, defender: Element): Effectiveness {
  if (attacker === defender) return 'resist'
  if (ELEMENTS[attacker].strong.includes(defender)) return 'super'
  if (ELEMENTS[defender].strong.includes(attacker)) return 'weak'
  return 'normal'
}

export function weaknessesOf(defender: Element): Element[] {
  return ELEMENT_IDS.filter((element) => ELEMENTS[element].strong.includes(defender))
}

export function counterOf(defender: Element): Element {
  const options = weaknessesOf(defender)
  const safe = options.find((element) => !ELEMENTS[defender].strong.includes(element))
  return safe ?? options[0] ?? defender
}

export function randomElement(random: () => number = Math.random): Element {
  return ELEMENT_IDS[Math.floor(random() * ELEMENT_IDS.length)]
}

export function elementDef(id: Element): ElementDef {
  return ELEMENTS[id]
}

export function isElement(value: unknown): value is Element {
  return typeof value === 'string' && (ELEMENT_IDS as readonly string[]).includes(value)
}

export const rgba = ([r, g, b]: RGB, alpha: number) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`
