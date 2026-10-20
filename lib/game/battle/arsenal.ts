import { ELEMENTS, type Element } from './elements'

export type WeaponId =
  | 'fists'
  | 'weapon-claw'
  | 'weapon-hammer'
  | 'weapon-drill'
  | 'weapon-blaster'
  | 'weapon-cannon'
  | 'weapon-laser'
  | 'weapon-wrench'
  | 'weapon-saw'
  | 'weapon-harpoon'
  | 'weapon-boxing'
  | 'weapon-sword'
  | 'weapon-meteor-mace'
  | 'weapon-crystal-blade'
  | 'weapon-alien-ray'
  | 'weapon-thorn-whip'
  | 'weapon-pickaxe'
  | 'weapon-slingshot'
  | 'weapon-shock-rod'
  | 'weapon-crossbow'
  | 'weapon-anchor'
  | 'weapon-flamethrower'
  | 'weapon-scythe'
  | 'weapon-chainsaw'
  | 'weapon-lantern-staff'
  | 'weapon-tesla'
  | 'weapon-gauntlets'
  | 'weapon-glaive'
  | 'weapon-railgun'
  | 'weapon-sawmill-axe'

export type WeaponStats = {
  melee: number
  shot: number
  cost: number
  cooldown: number
  knock: number
  heavy: boolean
  bolt: { speed: number; size: number; life: number }
  ranged: boolean
}

type Noun = { noun: string; gender: 'm' | 'f' }

export type WeaponDef = {
  id: WeaponId
  melee: Noun
  shot: Noun
  stats: WeaponStats
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fists: {
    id: 'fists',
    melee: { noun: 'Soco', gender: 'm' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1, shot: 0.7, cost: 20, cooldown: 0.4, knock: 1, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-claw': {
    id: 'weapon-claw',
    melee: { noun: 'Garra', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.15, shot: 0.7, cost: 20, cooldown: 0.32, knock: 1.1, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-hammer': {
    id: 'weapon-hammer',
    melee: { noun: 'Martelo', gender: 'm' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.55, shot: 0.7, cost: 20, cooldown: 0.58, knock: 1.8, heavy: true, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-drill': {
    id: 'weapon-drill',
    melee: { noun: 'Broca', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.3, shot: 0.7, cost: 20, cooldown: 0.36, knock: 0.8, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-blaster': {
    id: 'weapon-blaster',
    melee: { noun: 'Coronhada', gender: 'f' },
    shot: { noun: 'Tiro', gender: 'm' },
    stats: { melee: 1, shot: 1.25, cost: 12, cooldown: 0.4, knock: 1, heavy: false, bolt: { speed: 1050, size: 13, life: 0.8 }, ranged: true },
  },
  'weapon-cannon': {
    id: 'weapon-cannon',
    melee: { noun: 'Culatra', gender: 'f' },
    shot: { noun: 'Canhonaço', gender: 'm' },
    stats: { melee: 1, shot: 1.7, cost: 22, cooldown: 0.5, knock: 1.3, heavy: false, bolt: { speed: 720, size: 22, life: 1 }, ranged: true },
  },
  'weapon-laser': {
    id: 'weapon-laser',
    melee: { noun: 'Corte', gender: 'm' },
    shot: { noun: 'Feixe', gender: 'm' },
    stats: { melee: 1, shot: 1.4, cost: 9, cooldown: 0.4, knock: 1, heavy: false, bolt: { speed: 1500, size: 9, life: 0.6 }, ranged: true },
  },
  'weapon-wrench': {
    id: 'weapon-wrench',
    melee: { noun: 'Chave', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.2, shot: 0.7, cost: 20, cooldown: 0.42, knock: 1.35, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-saw': {
    id: 'weapon-saw',
    melee: { noun: 'Serra', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.3, shot: 0.7, cost: 20, cooldown: 0.28, knock: 0.7, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-harpoon': {
    id: 'weapon-harpoon',
    melee: { noun: 'Arpão', gender: 'm' },
    shot: { noun: 'Arremesso', gender: 'm' },
    stats: { melee: 1.1, shot: 1.05, cost: 14, cooldown: 0.46, knock: 1.25, heavy: false, bolt: { speed: 1250, size: 12, life: 0.9 }, ranged: true },
  },
  'weapon-boxing': {
    id: 'weapon-boxing',
    melee: { noun: 'Soco', gender: 'm' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.45, shot: 0.7, cost: 20, cooldown: 0.5, knock: 1.9, heavy: true, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-sword': {
    id: 'weapon-sword',
    melee: { noun: 'Corte', gender: 'm' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.4, shot: 0.7, cost: 20, cooldown: 0.34, knock: 1, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-meteor-mace': {
    id: 'weapon-meteor-mace',
    melee: { noun: 'Maça', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.7, shot: 0.7, cost: 20, cooldown: 0.62, knock: 2, heavy: true, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-crystal-blade': {
    id: 'weapon-crystal-blade',
    melee: { noun: 'Lâmina', gender: 'f' },
    shot: { noun: 'Lasca', gender: 'f' },
    stats: { melee: 1.45, shot: 0.85, cost: 12, cooldown: 0.34, knock: 1, heavy: false, bolt: { speed: 1300, size: 10, life: 0.6 }, ranged: false },
  },
  'weapon-alien-ray': {
    id: 'weapon-alien-ray',
    melee: { noun: 'Coronhada', gender: 'f' },
    shot: { noun: 'Raio', gender: 'm' },
    stats: { melee: 0.9, shot: 1.55, cost: 11, cooldown: 0.36, knock: 1, heavy: false, bolt: { speed: 1300, size: 11, life: 0.7 }, ranged: true },
  },
  'weapon-thorn-whip': {
    id: 'weapon-thorn-whip',
    melee: { noun: 'Chicotada', gender: 'f' },
    shot: { noun: 'Espinho', gender: 'm' },
    stats: { melee: 1.25, shot: 0.8, cost: 14, cooldown: 0.4, knock: 1.5, heavy: false, bolt: { speed: 1100, size: 10, life: 0.6 }, ranged: false },
  },
  'weapon-pickaxe': {
    id: 'weapon-pickaxe',
    melee: { noun: 'Picaretada', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.3, shot: 0.7, cost: 20, cooldown: 0.5, knock: 1.4, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-slingshot': {
    id: 'weapon-slingshot',
    melee: { noun: 'Tapa', gender: 'm' },
    shot: { noun: 'Lasca', gender: 'f' },
    stats: { melee: 0.9, shot: 1.1, cost: 10, cooldown: 0.38, knock: 0.9, heavy: false, bolt: { speed: 1100, size: 11, life: 0.75 }, ranged: true },
  },
  'weapon-shock-rod': {
    id: 'weapon-shock-rod',
    melee: { noun: 'Bastonada', gender: 'f' },
    shot: { noun: 'Faísca', gender: 'f' },
    stats: { melee: 1.25, shot: 0.8, cost: 12, cooldown: 0.36, knock: 0.9, heavy: false, bolt: { speed: 1000, size: 11, life: 0.6 }, ranged: false },
  },
  'weapon-crossbow': {
    id: 'weapon-crossbow',
    melee: { noun: 'Coronhada', gender: 'f' },
    shot: { noun: 'Virote', gender: 'm' },
    stats: { melee: 0.95, shot: 1.45, cost: 15, cooldown: 0.56, knock: 1.1, heavy: false, bolt: { speed: 1350, size: 11, life: 0.9 }, ranged: true },
  },
  'weapon-anchor': {
    id: 'weapon-anchor',
    melee: { noun: 'Âncora', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.8, shot: 0.7, cost: 20, cooldown: 0.7, knock: 2.3, heavy: true, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-flamethrower': {
    id: 'weapon-flamethrower',
    melee: { noun: 'Maçarico', gender: 'm' },
    shot: { noun: 'Labareda', gender: 'f' },
    stats: { melee: 1, shot: 1.05, cost: 8, cooldown: 0.24, knock: 0.8, heavy: false, bolt: { speed: 720, size: 16, life: 0.45 }, ranged: true },
  },
  'weapon-scythe': {
    id: 'weapon-scythe',
    melee: { noun: 'Ceifa', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.5, shot: 0.7, cost: 20, cooldown: 0.48, knock: 1.3, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-chainsaw': {
    id: 'weapon-chainsaw',
    melee: { noun: 'Motosserra', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.6, shot: 0.7, cost: 20, cooldown: 0.3, knock: 0.8, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-lantern-staff': {
    id: 'weapon-lantern-staff',
    melee: { noun: 'Cajadada', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.15, shot: 1.05, cost: 9, cooldown: 0.4, knock: 1.1, heavy: false, bolt: { speed: 1000, size: 13, life: 0.8 }, ranged: true },
  },
  'weapon-tesla': {
    id: 'weapon-tesla',
    melee: { noun: 'Choque', gender: 'm' },
    shot: { noun: 'Arco', gender: 'm' },
    stats: { melee: 1, shot: 1.45, cost: 14, cooldown: 0.3, knock: 1, heavy: false, bolt: { speed: 1000, size: 13, life: 0.7 }, ranged: true },
  },
  'weapon-gauntlets': {
    id: 'weapon-gauntlets',
    melee: { noun: 'Soco', gender: 'm' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.4, shot: 0.7, cost: 20, cooldown: 0.27, knock: 1.2, heavy: false, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
  'weapon-glaive': {
    id: 'weapon-glaive',
    melee: { noun: 'Glaive', gender: 'm' },
    shot: { noun: 'Lasca', gender: 'f' },
    stats: { melee: 1.7, shot: 0.85, cost: 12, cooldown: 0.46, knock: 1.5, heavy: false, bolt: { speed: 1300, size: 10, life: 0.6 }, ranged: false },
  },
  'weapon-railgun': {
    id: 'weapon-railgun',
    melee: { noun: 'Coronhada', gender: 'f' },
    shot: { noun: 'Tiro de trilho', gender: 'm' },
    stats: { melee: 0.9, shot: 2.1, cost: 26, cooldown: 0.78, knock: 1.6, heavy: false, bolt: { speed: 1900, size: 14, life: 0.9 }, ranged: true },
  },
  'weapon-sawmill-axe': {
    id: 'weapon-sawmill-axe',
    melee: { noun: 'Machadada', gender: 'f' },
    shot: { noun: 'Pulso', gender: 'm' },
    stats: { melee: 1.65, shot: 0.7, cost: 20, cooldown: 0.56, knock: 1.7, heavy: true, bolt: { speed: 900, size: 12, life: 0.7 }, ranged: false },
  },
}

export function weaponFor(partId: string | null | undefined): WeaponDef {
  return partId && partId in WEAPONS ? WEAPONS[partId as WeaponId] : WEAPONS.fists
}

const SIGNATURE: Partial<Record<WeaponId, Partial<Record<Element, { melee?: string; shot?: string }>>>> = {
  fists: {
    fogo: { melee: 'Soco de Brasa' },
    terra: { melee: 'Soco de Rocha' },
    raio: { melee: 'Soco Elétrico' },
    gelo: { melee: 'Soco de Geada' },
  },
  'weapon-claw': {
    fogo: { melee: 'Garra Flamejante' },
    gelo: { melee: 'Garra de Geada' },
    raio: { melee: 'Garra Elétrica' },
    sombra: { melee: 'Garra do Vazio' },
  },
  'weapon-hammer': {
    fogo: { melee: 'Martelo Vulcânico' },
    agua: { melee: 'Martelo da Maré' },
    terra: { melee: 'Terremoto' },
    vento: { melee: 'Martelo de Tufão' },
    raio: { melee: 'Martelo do Trovão' },
    gelo: { melee: 'Martelo de Geleira' },
    luz: { melee: 'Martelo do Alvorecer' },
    sombra: { melee: 'Martelo do Eclipse' },
  },
  'weapon-drill': {
    fogo: { melee: 'Broca de Magma' },
    agua: { melee: 'Broca de Redemoinho' },
    terra: { melee: 'Broca Sísmica' },
    vento: { melee: 'Broca de Ciclone' },
    gelo: { melee: 'Broca de Geleira' },
    luz: { melee: 'Broca de Cristal' },
    sombra: { melee: 'Broca do Vazio' },
  },
  'weapon-blaster': {
    fogo: { shot: 'Tiro de Brasa' },
    agua: { shot: 'Tiro de Bolha' },
    terra: { shot: 'Tiro de Seixo' },
    vento: { shot: 'Tiro de Rajada' },
    raio: { shot: 'Tiro Elétrico' },
    gelo: { shot: 'Tiro de Granizo' },
    luz: { shot: 'Tiro de Lente' },
    sombra: { shot: 'Tiro de Névoa' },
  },
  'weapon-cannon': {
    fogo: { shot: 'Bola de Fogo' },
    agua: { shot: "Tromba d'Água" },
    terra: { shot: 'Pedregulho' },
    vento: { shot: 'Tufão' },
    raio: { shot: 'Trovão' },
    gelo: { shot: 'Geleira' },
    luz: { shot: 'Sol de Bolso' },
    sombra: { shot: 'Eclipse' },
  },
  'weapon-scythe': {
    vento: { melee: 'Ceifa de Tufão' },
    sombra: { melee: 'Ceifa do Eclipse' },
    gelo: { melee: 'Ceifa de Geada' },
  },
  'weapon-chainsaw': {
    fogo: { melee: 'Motosserra Incandescente' },
    raio: { melee: 'Motosserra Elétrica' },
  },
  'weapon-tesla': {
    raio: { shot: 'Arco Voltaico' },
    luz: { shot: 'Arco de Cristal' },
    agua: { shot: 'Arco de Tempestade' },
  },
  'weapon-railgun': {
    raio: { shot: 'Trilho do Trovão' },
    fogo: { shot: 'Trilho de Magma' },
    gelo: { shot: 'Trilho de Geleira' },
  },
  'weapon-anchor': {
    agua: { melee: 'Âncora da Maré' },
    terra: { melee: 'Âncora Sísmica' },
  },
  'weapon-flamethrower': {
    fogo: { shot: 'Labareda Vulcânica' },
    sombra: { shot: 'Labareda Negra' },
  },
  'weapon-laser': {
    fogo: { shot: 'Lança de Brasa' },
    agua: { shot: 'Jato de Pressão' },
    terra: { shot: 'Rajada de Cascalho' },
    vento: { shot: 'Lâmina de Vácuo' },
    raio: { shot: 'Relâmpago em Linha' },
    gelo: { shot: 'Agulha de Geada' },
    luz: { shot: 'Feixe Solar' },
    sombra: { shot: 'Feixe Negro' },
  },
}

const FLAVOR: Record<Element, { melee: string; shot: string; heavyShot: string; thinShot: string }> = {
  fogo: {
    melee: 'o braço se acende e o golpe deixa um rastro de brasas no ar',
    shot: 'uma bola de fogo com cauda de fagulhas que explode em chamas ao bater',
    heavyShot: 'um sol pequeno sai do cano e deixa o chão em chamas onde cai',
    thinShot: 'uma lança de fogo fina e reta que atravessa a arena num piscar',
  },
  agua: {
    melee: 'o golpe vem envolto em água e espirra uma onda em volta do alvo',
    shot: 'um jato de água encapsulado que estoura em gotas pesadas no impacto',
    heavyShot: 'uma tromba inteira sai do cano e alaga tudo em volta de quem acerta',
    thinShot: 'um jato de alta pressão, fino como um fio, que corta e encharca',
  },
  terra: {
    melee: 'o chão racha sob o golpe e lascas de pedra voam para todo lado',
    shot: 'pedras e cascalho voam juntos e se estilhaçam numa nuvem de poeira',
    heavyShot: 'um pedregulho inteiro que rola pelo ar e esmaga o que encontra',
    thinShot: 'uma rajada de cascalho afiado, disparada em sequência',
  },
  vento: {
    melee: 'uma lâmina de ar sai do golpe e empurra o adversário para longe',
    shot: 'um crescente de ar comprimido, quase invisível, que arrasta tudo no caminho',
    heavyShot: 'um pequeno tufão em espiral que derruba e arrasta o que toca',
    thinShot: 'uma lâmina de vácuo tão fina que só se vê pelo rastro de poeira',
  },
  raio: {
    melee: 'faíscas saltam do braço e o golpe estala como um trovão',
    shot: 'um raio em zigue-zague que salta no impacto e trava os circuitos do alvo',
    heavyShot: 'um trovão embalado que explode em arcos elétricos ao redor do alvo',
    thinShot: 'um relâmpago reto, instantâneo, que nem dá tempo de desviar',
  },
  gelo: {
    melee: 'o golpe congela o que toca e deixa geada no chão em volta',
    shot: 'cristais de gelo girando que se estilhaçam e congelam o alvo',
    heavyShot: 'um bloco de geleira que se parte em estacas de gelo ao cair',
    thinShot: 'uma agulha de geada, fina e silenciosa, que congela por dentro',
  },
  luz: {
    melee: 'o braço brilha como o cristal da praça e o golpe cega por um instante',
    shot: 'um pulso de luz pura que explode num clarão e ofusca sensores',
    heavyShot: 'um sol de bolso que cega a arena inteira no impacto',
    thinShot: 'um feixe branco e reto, puro como a luz do cristal',
  },
  sombra: {
    melee: 'névoa escura envolve o golpe e drena energia de quem é atingido',
    shot: 'um orbe de sombra com fios violeta que suga a luz em volta ao bater',
    heavyShot: 'um eclipse em miniatura que engole o alvo em escuridão',
    thinShot: 'um feixe negro que parece um corte na própria luz',
  },
}

export type AttackNames = {
  melee: { name: string; flavor: string }
  shot: { name: string; flavor: string }
}

export function attackNames(weapon: WeaponDef, element: Element): AttackNames {
  const def = ELEMENTS[element]
  const signature = SIGNATURE[weapon.id]?.[element]
  const flavor = FLAVOR[element]
  const shotFlavor = weapon.id === 'weapon-cannon' || weapon.id === 'weapon-railgun' ? flavor.heavyShot : weapon.id === 'weapon-laser' || weapon.id === 'weapon-tesla' ? flavor.thinShot : flavor.shot
  return {
    melee: { name: signature?.melee ?? `${weapon.melee.noun} ${def.epithet[weapon.melee.gender]}`, flavor: flavor.melee },
    shot: { name: signature?.shot ?? `${weapon.shot.noun} ${def.epithet[weapon.shot.gender]}`, flavor: shotFlavor },
  }
}
