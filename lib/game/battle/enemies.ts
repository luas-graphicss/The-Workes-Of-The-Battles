import type { RGB } from '../fx/textures'
import type { Loadout } from '../robot/parts'

export type EnemyKind = 'sentinel' | 'brute' | 'drone' | 'alien'

export type Behaviour = 'chaser' | 'bruiser' | 'orbiter' | 'phaser'

export type Shot = {
  speed: number
  life: number
  damage: number
  size: number
}

export type EnemyDef = {
  kind: EnemyKind
  name: string
  title: string
  hint: string
  health: number
  damage: number
  speed: number
  reach: number
  cooldown: number
  windup: number
  bounty: number
  behaviour: Behaviour
  scale: number
  loadout: Loadout | null
  tint: RGB
  glow: RGB
  pushback: number
  shot?: Shot

  boss?: boolean
}

export const SCRAP_SHARE = 0.2

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  sentinel: {
    kind: 'sentinel',
    name: 'Sentinela',
    title: 'R-7 de patrulha',
    hint: 'Avança em linha reta e dispara quando fica longe. Golpeie logo depois do pulso.',
    health: 82,
    damage: 13,
    speed: 300,
    reach: 96,
    cooldown: 1.55,
    windup: 0.45,
    bounty: 60,
    behaviour: 'chaser',
    scale: 1,
    loadout: { helmet: 'helmet-knight', weapon: 'weapon-blaster', mobility: 'move-tracks', module: null },
    tint: [92, 110, 142],
    glow: [255, 92, 72],
    pushback: 1,
    shot: { speed: 640, life: 1.1, damage: 10, size: 14 },
  },
  brute: {
    kind: 'brute',
    name: 'Brutamontes',
    title: 'T-9 de carga',
    hint: 'O círculo vermelho marca onde o martelo cai. Saia dele e castigue na recuperação.',
    health: 240,
    damage: 30,
    speed: 170,
    reach: 150,
    cooldown: 2.7,
    windup: 1.05,
    bounty: 160,
    behaviour: 'bruiser',
    scale: 1.3,
    loadout: { helmet: 'helmet-builder', weapon: 'weapon-hammer', mobility: 'move-heavy', module: 'module-shield' },
    tint: [158, 84, 48],
    glow: [255, 176, 64],
    pushback: 0.25,
  },
  drone: {
    kind: 'drone',
    name: 'Zangão',
    title: 'Z-3 de entrega',
    hint: 'Gira em volta e investe de repente. É frágil: um golpe certeiro basta.',
    health: 40,
    damage: 10,
    speed: 440,
    reach: 70,
    cooldown: 1.2,
    windup: 0.32,
    bounty: 45,
    behaviour: 'orbiter',
    scale: 0.8,
    loadout: { helmet: 'helmet-radar', weapon: null, mobility: 'move-hover', module: 'module-jetpack' },
    tint: [204, 168, 52],
    glow: [120, 255, 236],
    pushback: 1.6,
  },
  alien: {
    kind: 'alien',
    name: 'Visitante',
    title: 'caiu com o meteoro',
    hint: 'Some e reaparece antes de atirar. Mire no clarão: ele fica parado por um instante.',
    health: 150,
    damage: 18,
    speed: 250,
    reach: 90,
    cooldown: 1.95,
    windup: 0.6,
    bounty: 220,
    behaviour: 'phaser',
    scale: 1.1,
    loadout: null,
    tint: [150, 92, 224],
    glow: [214, 164, 255],
    pushback: 1.2,
    shot: { speed: 560, life: 1.5, damage: 15, size: 18 },
  },
}

export const ENEMY_KINDS: readonly EnemyKind[] = ['sentinel', 'brute', 'drone', 'alien']

export function enemyDef(kind: EnemyKind): EnemyDef {
  return ENEMIES[kind]
}
