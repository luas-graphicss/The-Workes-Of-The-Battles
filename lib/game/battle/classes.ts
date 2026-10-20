export type RobotClass = 'atirador' | 'lutador' | 'guardiao' | 'veloz' | 'tecnico' | 'elemental'

export const CLASS_IDS: readonly RobotClass[] = ['atirador', 'lutador', 'guardiao', 'veloz', 'tecnico', 'elemental']

export type ClassMods = {
  melee: number
  shot: number
  meleeCooldown: number
  shotCooldown: number
  armor: number
  speed: number
  energy: number
  regen: number
  dodgeCost: number
  guardDrain: number
  parry: number
  cardCost: number
  cardPower: number
  element: number
  ailment: number
  crit: number
  knock: number
}

export type ClassDef = {
  id: RobotClass
  name: string
  title: string
  description: string
  perk: string
  flaw: string
  mods: ClassMods
  icon: string
}

const BASE: ClassMods = {
  melee: 1,
  shot: 1,
  meleeCooldown: 1,
  shotCooldown: 1,
  armor: 1,
  speed: 1,
  energy: 1,
  regen: 1,
  dodgeCost: 1,
  guardDrain: 1,
  parry: 1,
  cardCost: 1,
  cardPower: 1,
  element: 1,
  ailment: 1,
  crit: 0,
  knock: 1,
}

const mods = (overrides: Partial<ClassMods>): ClassMods => ({ ...BASE, ...overrides })

export const CLASSES: Record<RobotClass, ClassDef> = {
  atirador: {
    id: 'atirador',
    name: 'Atirador',
    title: 'mira calibrada',
    description: 'Vê a luta a dez passos de distância. Qualquer arma na mão dele dispara mais forte e mais rápido.',
    perk: 'Tiros +30% de dano e 20% mais rápidos; energia +10%.',
    flaw: 'Golpes corpo a corpo −10%; blindagem levemente mais fina.',
    mods: mods({ shot: 1.3, shotCooldown: 0.8, melee: 0.9, armor: 1.06, energy: 1.1 }),
    icon: 'assets/ui/classes/atirador.webp',
  },
  lutador: {
    id: 'lutador',
    name: 'Lutador',
    title: 'punhos de aço',
    description: 'Gosta de sentir o impacto. Garra, martelo ou broca, tudo vira uma extensão do braço.',
    perk: 'Golpes +30%, swing 15% mais rápido, +8% de crítico e empurrão maior.',
    flaw: 'Tiros −15%.',
    mods: mods({ melee: 1.3, meleeCooldown: 0.85, crit: 0.08, knock: 1.3, shot: 0.85 }),
    icon: 'assets/ui/classes/lutador.webp',
  },
  guardiao: {
    id: 'guardiao',
    name: 'Guardião',
    title: 'muralha ambulante',
    description: 'Aguenta o que ninguém aguenta e devolve na hora certa. O aparo dele é lendário.',
    perk: 'Sofre 22% menos dano, guarda gasta 40% menos e a janela de aparo é 40% maior.',
    flaw: 'Anda 8% mais devagar; esquiva custa 20% mais.',
    mods: mods({ armor: 0.78, guardDrain: 0.6, parry: 1.4, speed: 0.92, dodgeCost: 1.2, shot: 0.95 }),
    icon: 'assets/ui/classes/guardiao.webp',
  },
  veloz: {
    id: 'veloz',
    name: 'Veloz',
    title: 'um borrão no ringue',
    description: 'Nunca está onde o golpe cai. Encadeia esquivas e ataques num ritmo que cansa só de ver.',
    perk: 'Anda 20% mais rápido, esquiva custa 45% menos e tudo recarrega 10% mais rápido.',
    flaw: 'Dano −8% e sofre 10% a mais quando é pego.',
    mods: mods({ speed: 1.2, dodgeCost: 0.55, meleeCooldown: 0.9, shotCooldown: 0.9, melee: 0.92, shot: 0.92, armor: 1.1 }),
    icon: 'assets/ui/classes/veloz.webp',
  },
  tecnico: {
    id: 'tecnico',
    name: 'Técnico',
    title: 'o núcleo é um laboratório',
    description: 'Transforma energia em truques. As cartas do tablet saem mais baratas e mais fortes.',
    perk: 'Energia +20%, regenera 45% mais rápido; cartas custam 30% menos e causam +20%.',
    flaw: 'Golpes e tiros comuns −5%.',
    mods: mods({ regen: 1.45, energy: 1.2, cardCost: 0.7, cardPower: 1.2, melee: 0.95, shot: 0.95 }),
    icon: 'assets/ui/classes/tecnico.webp',
  },
  elemental: {
    id: 'elemental',
    name: 'Elemental',
    title: 'o elemento fala mais alto',
    description: 'Deixa o núcleo decidir a luta. Vantagem de elemento vira vantagem esmagadora.',
    perk: 'Bônus de super eficaz 60% maior e efeitos elementais com o dobro de chance.',
    flaw: 'Dano base −10%.',
    mods: mods({ element: 1.6, ailment: 2, melee: 0.9, shot: 0.9, cardPower: 1.1 }),
    icon: 'assets/ui/classes/elemental.webp',
  },
}

export function classDef(id: RobotClass): ClassDef {
  return CLASSES[id]
}

export function randomClass(random: () => number = Math.random): RobotClass {
  return CLASS_IDS[Math.floor(random() * CLASS_IDS.length)]
}

export function isRobotClass(value: unknown): value is RobotClass {
  return typeof value === 'string' && (CLASS_IDS as readonly string[]).includes(value)
}
