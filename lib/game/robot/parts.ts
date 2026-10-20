import { EXPANSION_PARTS } from './expansion'
import { EXPANSION_2_PARTS } from './expansion-2'
import { upgradeBonus, type UpgradeLevels } from './upgrades'

export type Slot = 'helmet' | 'weapon' | 'mobility' | 'module'

export const SLOTS: readonly Slot[] = ['helmet', 'weapon', 'mobility', 'module']

export const SLOT_LABEL: Record<Slot, string> = {
  helmet: 'Capacetes',
  weapon: 'Armas',
  mobility: 'Mobilidade',
  module: 'Módulos',
}

export const SLOT_SINGULAR: Record<Slot, string> = {
  helmet: 'Capacete',
  weapon: 'Arma',
  mobility: 'Mobilidade',
  module: 'Módulo',
}

export type StatKey = 'attack' | 'defense' | 'speed' | 'energy'

export const STAT_KEYS: readonly StatKey[] = ['attack', 'defense', 'speed', 'energy']

export const STAT_LABEL: Record<StatKey, string> = {
  attack: 'Ataque',
  defense: 'Defesa',
  speed: 'Velocidade',
  energy: 'Energia',
}

export type Stats = Record<StatKey, number>

export const STAT_MAX = 10

export type Layer = 'back' | 'legs' | 'front'

export type SecretOrigin =
  | { kind: 'mission'; mission: string; hint: string }
  | { kind: 'hidden'; spot: string; hint: string }
  | { kind: 'clearing'; clearing: string; hint: string }

  | { kind: 'vendor'; hint: string }

  | { kind: 'camp'; camp: string; hint: string }

export type Part = {
  id: string
  slot: Slot
  name: string
  description: string
  price: number
  stats: Partial<Stats>
  layer: Layer
  speed?: number
  secret?: SecretOrigin

  tier?: number
}

export const BODY_ID = 'b01'
export const BODY_NAME = 'B-01'

export const BASE_STATS: Stats = { attack: 2, defense: 2, speed: 3, energy: 3 }

const BASE_PARTS: readonly Part[] = [
  {
    id: 'helmet-cap',
    slot: 'helmet',
    name: 'Boné de mecânico',
    description: 'Um boné surrado de oficina. Protege pouco, mas nenhum robô da praça anda sem estilo.',
    price: 120,
    stats: { defense: 1 },
    layer: 'front',
  },
  {
    id: 'helmet-builder',
    slot: 'helmet',
    name: 'Capacete de obra',
    description: 'Casco amarelo de canteiro. Aguenta tijolo, galho de árvore e a chuva fina do bosque.',
    price: 180,
    stats: { defense: 2 },
    layer: 'front',
  },
  {
    id: 'helmet-pilot',
    slot: 'helmet',
    name: 'Capacete de piloto',
    description: 'Viseira aerodinâmica e forro acolchoado. Corta o vento e deixa a cabeça no lugar nas curvas.',
    price: 260,
    stats: { defense: 2, speed: 1 },
    layer: 'front',
  },
  {
    id: 'helmet-radar',
    slot: 'helmet',
    name: 'Radar orbital',
    description: 'Um prato giratório que escuta o céu. Rende energia extra e um dia vai apontar o caminho.',
    price: 340,
    stats: { defense: 1, energy: 2 },
    layer: 'front',
  },
  {
    id: 'helmet-knight',
    slot: 'helmet',
    name: 'Elmo de guardião',
    description: 'Forjado com o aço das antigas muralhas. A melhor proteção que se compra com créditos.',
    price: 420,
    stats: { defense: 4 },
    layer: 'front',
  },
  {
    id: 'helmet-crown',
    slot: 'helmet',
    name: 'Coroa de sucata',
    description: 'Peças douradas soldadas com carinho. Todo robô que a usa anda um pouco mais confiante.',
    price: 600,
    stats: { attack: 1, defense: 1, energy: 1 },
    layer: 'front',
  },
  {
    id: 'weapon-claw',
    slot: 'weapon',
    name: 'Garra mecânica',
    description: 'Pinça hidráulica de três dedos. Segura, aperta e, se precisar, arranca.',
    price: 150,
    stats: { attack: 2 },
    layer: 'front',
  },
  {
    id: 'weapon-hammer',
    slot: 'weapon',
    name: 'Martelo hidráulico',
    description: 'Pesado como uma bigorna. Cada golpe faz a praça inteira tremer, mas atrasa o passo.',
    price: 240,
    stats: { attack: 3, speed: -1 },
    layer: 'front',
  },
  {
    id: 'weapon-drill',
    slot: 'weapon',
    name: 'Broca espiral',
    description: 'Gira tão rápido que assobia. Feita para atravessar blindagens e portas trancadas.',
    price: 300,
    stats: { attack: 3 },
    layer: 'front',
  },
  {
    id: 'weapon-blaster',
    slot: 'weapon',
    name: 'Blaster de pulso',
    description: 'Dispara pulsos de luz quente. Leve, rápido e com um brilho azul muito bonito à noite.',
    price: 380,
    stats: { attack: 4 },
    layer: 'front',
  },
  {
    id: 'weapon-cannon',
    slot: 'weapon',
    name: 'Canhão pesado',
    description: 'Um canhão de verdade no braço. O recuo empurra o robô para trás um passo inteiro.',
    price: 520,
    stats: { attack: 5, speed: -1 },
    layer: 'front',
  },
  {
    id: 'weapon-laser',
    slot: 'weapon',
    name: 'Laser de precisão',
    description: 'Feixe fino calibrado com o cristal da praça. Não erra, e ainda devolve energia ao núcleo.',
    price: 640,
    stats: { attack: 5, energy: 1 },
    layer: 'front',
  },
  {
    id: 'move-wheels',
    slot: 'mobility',
    name: 'Rodas urbanas',
    description: 'Rodas lisas para o paralelepípedo da cidade. Rolam macias e rendem bem mais que pernas.',
    price: 160,
    stats: { speed: 2 },
    layer: 'legs',
    speed: 1.15,
  },
  {
    id: 'move-springs',
    slot: 'mobility',
    name: 'Pernas de mola',
    description: 'Molas de aço temperado. O robô quica pelas ruas e sobe os degraus da praça sem esforço.',
    price: 220,
    stats: { speed: 2 },
    layer: 'legs',
    speed: 1.2,
  },
  {
    id: 'move-heavy',
    slot: 'mobility',
    name: 'Botas reforçadas',
    description: 'Botas de chumbo com sola de borracha. Firmes como uma rocha, lentas como uma tartaruga.',
    price: 260,
    stats: { defense: 3, speed: -1 },
    layer: 'legs',
    speed: 0.92,
  },
  {
    id: 'move-offroad',
    slot: 'mobility',
    name: 'Rodas off-road',
    description: 'Pneus largos com cravos. Fazem trilha, lama e raiz de árvore parecerem avenida.',
    price: 300,
    stats: { defense: 1, speed: 2 },
    layer: 'legs',
    speed: 1.18,
  },
  {
    id: 'move-tracks',
    slot: 'mobility',
    name: 'Esteiras de tanque',
    description: 'Lagartas de aço. Não são velozes, mas nada no bosque derruba um robô sobre esteiras.',
    price: 420,
    stats: { attack: 1, defense: 3 },
    layer: 'legs',
    speed: 1,
  },
  {
    id: 'move-hover',
    slot: 'mobility',
    name: 'Base flutuante',
    description: 'Um disco antigravidade que paira um palmo do chão. A forma mais rápida de cruzar a cidade.',
    price: 560,
    stats: { speed: 4 },
    layer: 'legs',
    speed: 1.35,
  },
  {
    id: 'module-battery',
    slot: 'module',
    name: 'Bateria extra',
    description: 'Célula de reserva presa às costas. Mais horas de caminhada antes de procurar uma tomada.',
    price: 140,
    stats: { energy: 2 },
    layer: 'back',
  },
  {
    id: 'module-solar',
    slot: 'module',
    name: 'Painel solar',
    description: 'Duas asas de vidro que bebem luz. De dia carregam o núcleo; de noite viram um belo enfeite.',
    price: 220,
    stats: { energy: 3 },
    layer: 'back',
  },
  {
    id: 'module-antenna',
    slot: 'module',
    name: 'Rádio de longo alcance',
    description: 'Capta sinais do outro lado do lago. Consome pouco e ainda sobra energia para o robô.',
    price: 260,
    stats: { energy: 1, defense: 1 },
    layer: 'back',
  },
  {
    id: 'module-backpack',
    slot: 'module',
    name: 'Mochila de coleta',
    description: 'Compartimentos para sucata, cristais e o que mais aparecer pelo caminho. Um dia vai lotar.',
    price: 300,
    stats: { defense: 1, energy: 1 },
    layer: 'back',
  },
  {
    id: 'module-shield',
    slot: 'module',
    name: 'Escudo magnético',
    description: 'Placa de campo magnético no braço livre. Desvia pedras, faíscas e olhares tortos.',
    price: 450,
    stats: { defense: 3 },
    layer: 'front',
  },
  {
    id: 'module-jetpack',
    slot: 'module',
    name: 'Jetpack duplo',
    description: 'Dois propulsores que empurram o robô para a frente em rajadas. Gasta energia, ganha o mundo.',
    price: 700,
    stats: { speed: 3, energy: -1 },
    layer: 'back',
    speed: 1.25,
  },

  {
    id: 'helmet-visor',
    slot: 'helmet',
    name: 'Viseira tática',
    description: 'Máscara de aço com uma fenda de vidro. Protege o rosto e deixa o robô com cara de poucos amigos.',
    price: 220,
    stats: { defense: 2, attack: 1 },
    layer: 'front',
  },
  {
    id: 'helmet-miner',
    slot: 'helmet',
    name: 'Capacete de mineiro',
    description: 'Casco abobadado com lanterna na testa. Ilumina túneis, porões e as noites sem lua do bosque.',
    price: 300,
    stats: { defense: 2, energy: 1 },
    layer: 'front',
  },
  {
    id: 'helmet-diver',
    slot: 'helmet',
    name: 'Escafandro de latão',
    description: 'Um capacete de mergulho polido, com janela redonda e válvula de ar. Pesado, mas nada passa por ele.',
    price: 380,
    stats: { defense: 3, speed: -1 },
    layer: 'front',
  },
  {
    id: 'helmet-samurai',
    slot: 'helmet',
    name: 'Kabuto do bosque',
    description: 'Elmo de guerreiro com chifres dourados e protetores de nuca. Honra a quem o usa e assusta quem o enfrenta.',
    price: 540,
    stats: { attack: 2, defense: 2 },
    layer: 'front',
  },
  {
    id: 'helmet-owl',
    slot: 'helmet',
    name: 'Capuz de coruja',
    description: 'O mascote da Robô & Cia virou capacete: olhos enormes que enxergam no escuro e penas que abafam o som.',
    price: 650,
    stats: { defense: 2, speed: 1, energy: 1 },
    layer: 'front',
    secret: { kind: 'mission', mission: 'vitrine', hint: 'A Robô & Cia recompensa quem devolver os robôs da vitrine.' },
  },
  {
    id: 'helmet-crystal',
    slot: 'helmet',
    name: 'Diadema de cristal',
    description: 'Um aro fino com uma lasca do cristal da praça. Zumbe baixinho e enche o núcleo de energia.',
    price: 700,
    stats: { energy: 3, defense: 1 },
    layer: 'front',
    secret: { kind: 'hidden', spot: 'praca', hint: 'Uma lasca do grande cristal caiu atrás da fonte da Praça do Cristal.' },
  },
  {
    id: 'helmet-meteor',
    slot: 'helmet',
    name: 'Coroa de meteoro',
    description: 'Rocha do próprio meteoro, com cristais que ainda brilham. Quem a usa carrega um pedaço do céu.',
    price: 800,
    stats: { attack: 2, defense: 2, energy: 1 },
    layer: 'front',
    secret: { kind: 'hidden', spot: 'cratera', hint: 'Onde o céu caiu, algo ainda brilha na borda da cratera.' },
  },
  {
    id: 'weapon-wrench',
    slot: 'weapon',
    name: 'Chave inglesa gigante',
    description: 'A chave da oficina, do tamanho de um braço. Aperta parafusos de ponte e serve muito bem de porrete.',
    price: 200,
    stats: { attack: 2, defense: 1 },
    layer: 'front',
  },
  {
    id: 'weapon-saw',
    slot: 'weapon',
    name: 'Serra circular',
    description: 'Disco dentado girando sem parar. Corta chapa, corrente e a paciência de qualquer Sentinela.',
    price: 340,
    stats: { attack: 4, speed: -1 },
    layer: 'front',
  },
  {
    id: 'weapon-harpoon',
    slot: 'weapon',
    name: 'Arpão de pesca',
    description: 'Emprestado dos pescadores do lago. Alcance longo, ponta farpada e um carretel para puxar de volta.',
    price: 420,
    stats: { attack: 3, speed: 1 },
    layer: 'front',
  },
  {
    id: 'weapon-boxing',
    slot: 'weapon',
    name: 'Luva hidráulica',
    description: 'Uma luva de boxe sobre um pistão. Cada soco sai com a força de uma prensa de fábrica.',
    price: 460,
    stats: { attack: 4, defense: 1 },
    layer: 'front',
  },
  {
    id: 'weapon-sword',
    slot: 'weapon',
    name: 'Espada de energia',
    description: 'Lâmina de luz pulsante que nunca perde o fio. Bebe energia do núcleo a cada golpe.',
    price: 580,
    stats: { attack: 5, energy: -1 },
    layer: 'front',
  },
  {
    id: 'weapon-meteor-mace',
    slot: 'weapon',
    name: 'Maça de meteoro',
    description: 'A Fundição Oeste forjou um cabo para o pedaço de meteoro que caiu no pátio. Pesada e devastadora.',
    price: 850,
    stats: { attack: 6, speed: -1 },
    layer: 'front',
    secret: { kind: 'mission', mission: 'fuga-oeste', hint: 'A Fundição Oeste paga em ferro e meteoro a quem contiver a fuga.' },
  },
  {
    id: 'weapon-crystal-blade',
    slot: 'weapon',
    name: 'Lâmina de cristal',
    description: 'Uma espada lapidada de um único cristal. Leve como vidro, afiada como luz, e devolve energia a cada golpe.',
    price: 900,
    stats: { attack: 5, energy: 2 },
    layer: 'front',
    secret: { kind: 'hidden', spot: 'parque', hint: 'Entre as raízes da Árvore-Lume, uma lâmina espera quem olha com atenção.' },
  },
  {
    id: 'weapon-alien-ray',
    slot: 'weapon',
    name: 'Raio alienígena',
    description: 'Os Zangões da Autômatos do Leste copiavam este raio sem entender. Dispara luz violeta que atravessa blindagem.',
    price: 950,
    stats: { attack: 6, speed: 1, defense: -1 },
    layer: 'front',
    secret: { kind: 'mission', mission: 'linha-montagem', hint: 'A Autômatos do Leste esconde um protótipo roubado das estrelas.' },
  },
  {
    id: 'move-skates',
    slot: 'mobility',
    name: 'Patins de aço',
    description: 'Botas com quatro rodinhas cada. Deslizam pelo calçamento da praça e param só quando querem.',
    price: 180,
    stats: { speed: 2 },
    layer: 'legs',
    speed: 1.18,
  },
  {
    id: 'move-spider',
    slot: 'mobility',
    name: 'Pernas de aranha',
    description: 'Quatro pernas articuladas que sobem muro e raiz sem perder o equilíbrio. Firmes em qualquer terreno.',
    price: 340,
    stats: { defense: 2, speed: 1 },
    layer: 'legs',
    speed: 1.1,
  },
  {
    id: 'move-monowheel',
    slot: 'mobility',
    name: 'Monorroda',
    description: 'Uma única roda gorda com giroscópio. Rápida como poucas, mas qualquer encontrão vira tombo.',
    price: 400,
    stats: { speed: 3, defense: -1 },
    layer: 'legs',
    speed: 1.28,
  },
  {
    id: 'move-rocket',
    slot: 'mobility',
    name: 'Botas-foguete',
    description: 'Duas botas com bocais de foguete. O robô quase voa pela cidade e deixa um rastro de faíscas.',
    price: 620,
    stats: { speed: 3, attack: 1, energy: -1 },
    layer: 'legs',
    speed: 1.3,
  },
  {
    id: 'move-golem',
    slot: 'mobility',
    name: 'Pés de golem',
    description: 'Pés de pedra fundidos na Engrenagem num turno que ninguém lembra. Lentos, mas nada os tira do lugar.',
    price: 750,
    stats: { defense: 4, attack: 1, speed: -1 },
    layer: 'legs',
    speed: 0.9,
    secret: { kind: 'mission', mission: 'turno-noite', hint: 'A Fábrica Engrenagem esconde no porão o que o Brutamontes deixou para trás.' },
  },
  {
    id: 'move-crystal-board',
    slot: 'mobility',
    name: 'Prancha de cristal',
    description: 'Uma prancha que flutua sobre cristais. A Loja Parafuso nunca soube de onde veio, e agora é sua.',
    price: 800,
    stats: { speed: 4, energy: 1 },
    layer: 'legs',
    speed: 1.4,
    secret: { kind: 'mission', mission: 'promocao', hint: 'A Loja Parafuso guarda, no fundo da liquidação, algo que nunca esteve à venda.' },
  },
  {
    id: 'move-alien-legs',
    slot: 'mobility',
    name: 'Pernas alienígenas',
    description: 'Pernas de três dedos deixadas na margem do lago. Saltam, nadam e brilham quando o robô corre.',
    price: 850,
    stats: { speed: 3, attack: 1, defense: 1 },
    layer: 'legs',
    speed: 1.3,
    secret: { kind: 'hidden', spot: 'lago', hint: 'Algo pousou na margem dos Jardins do Lago, longe das trilhas.' },
  },
  {
    id: 'module-lantern',
    slot: 'module',
    name: 'Lanterna de bronze',
    description: 'Um lampião pendurado na mão livre. A chama nunca apaga e espanta o que vive no escuro do bosque.',
    price: 160,
    stats: { energy: 2, defense: 1 },
    layer: 'front',
  },
  {
    id: 'module-fan',
    slot: 'module',
    name: 'Ventoinha de resfriamento',
    description: 'Uma hélice nas costas que mantém o núcleo frio. Mais tempo de energia antes de superaquecer.',
    price: 280,
    stats: { energy: 3 },
    layer: 'back',
  },
  {
    id: 'module-drone',
    slot: 'module',
    name: 'Drone-vigia',
    description: 'Um drone pequeno que voa sobre o ombro. Avisa dos perigos e ajuda a mirar no que importa.',
    price: 320,
    stats: { attack: 1, energy: 2 },
    layer: 'front',
  },
  {
    id: 'module-armor',
    slot: 'module',
    name: 'Peitoral blindado',
    description: 'Placa de aço rebitada sobre o torso. Pesa no passo, mas transforma golpes em arranhões.',
    price: 480,
    stats: { defense: 4, speed: -1 },
    layer: 'front',
  },
  {
    id: 'module-turbine',
    slot: 'module',
    name: 'Turbina dupla',
    description: 'Duas turbinas de avião nas costas. O robô voa baixo pela cidade e aterrissa com um estrondo.',
    price: 760,
    stats: { speed: 3, attack: 1, energy: -1 },
    layer: 'back',
    speed: 1.28,
  },
  {
    id: 'module-alien-orb',
    slot: 'module',
    name: 'Orbe alienígena',
    description: 'Uma esfera que flutua ao lado do robô com três luzes girando. Ninguém sabe o que ela pensa.',
    price: 800,
    stats: { energy: 3, attack: 1, defense: 1 },
    layer: 'front',
    secret: { kind: 'mission', mission: 'estoque', hint: 'No porão da Casa dos Androides, algo flutua entre as caixas.' },
  },
  {
    id: 'module-crystal-wings',
    slot: 'module',
    name: 'Asas de cristal',
    description: 'Seis lascas de cristal presas a um arnês. Batem devagar e carregam o robô como uma brisa.',
    price: 950,
    stats: { speed: 3, energy: 2 },
    layer: 'back',
    speed: 1.3,
    secret: { kind: 'hidden', spot: 'moinhos', hint: 'Atrás do moinho mais ao norte da Vila dos Moinhos, o vento guarda um segredo.' },
  },
  {
    id: 'module-meteor-core',
    slot: 'module',
    name: 'Núcleo de meteoro',
    description: 'O coração do meteoro, preso num berço de aço. Pulsa com a mesma luz que acordou o B-01.',
    price: 1000,
    stats: { attack: 2, defense: 2, energy: 3 },
    layer: 'back',
    secret: { kind: 'hidden', spot: 'mercado', hint: 'Um vendedor de cristais do Mercado das Lanternas guarda uma pedra que brilha sozinha no fundo da banca.' },
  },

  {
    id: 'helmet-dew-crown',
    slot: 'helmet',
    name: 'Coroa de orvalho',
    description: 'Uma grinalda de folhas com gotas que nunca secam. Cada gota guarda um pouco da luz da manhã e devolve ao núcleo.',
    price: 950,
    stats: { defense: 2, energy: 2, attack: 1 },
    layer: 'front',
    secret: { kind: 'clearing', clearing: 'orvalho', hint: 'A leste do Parque da Árvore-Lume, uma trilha de terra some entre os pinheiros. Onde o orvalho não seca, algo espera.' },
  },
  {
    id: 'weapon-thorn-whip',
    slot: 'weapon',
    name: 'Chicote de espinhos',
    description: 'Um cipó vivo com espinhos de âmbar, enrolado no braço. Estala longe e deixa o alvo cambaleando.',
    price: 1000,
    stats: { attack: 5, speed: 1 },
    layer: 'front',
    secret: { kind: 'clearing', clearing: 'raizes', hint: 'Atrás dos moinhos, a floresta tem uma clareira onde as raízes crescem em círculo. A trilha começa onde a cerca termina.' },
  },
  {
    id: 'module-firefly-jar',
    slot: 'module',
    name: 'Jarra de vaga-lumes',
    description: 'Um vidro de conserva cheio de vaga-lumes que nunca cansam. Alumia o caminho e sopra energia extra no núcleo.',
    price: 900,
    stats: { energy: 3, speed: 1 },
    layer: 'front',
    secret: { kind: 'clearing', clearing: 'vagalumes', hint: 'Ao norte do Mercado das Lanternas, luzinhas verdes piscam entre as árvores depois que o sol se põe. Siga-as.' },
  },
]

export const PARTS: readonly Part[] = [...BASE_PARTS, ...EXPANSION_PARTS, ...EXPANSION_2_PARTS]

const BY_ID = new Map(PARTS.map((part) => [part.id, part]))

export function partById(id: string | null | undefined): Part | null {
  return id ? BY_ID.get(id) ?? null : null
}

export function partsInSlot(slot: Slot): Part[] {
  return PARTS.filter((part) => part.slot === slot)
}

export function isSecret(part: Part): boolean {
  return part.secret !== undefined
}

export function shopPartsInSlot(slot: Slot): Part[] {
  return PARTS.filter((part) => part.slot === slot && !part.secret)
}

export function partTier(part: Part): number {
  return part.tier ?? (part.price >= 540 ? 2 : 1)
}

export function partUnlocked(part: Part, world: number): boolean {
  return Boolean(part.secret) || partTier(part) <= world
}

export const SECRET_PARTS: readonly Part[] = PARTS.filter((part) => part.secret !== undefined)

export function secretForMission(missionId: string): Part | null {
  return SECRET_PARTS.find((part) => part.secret?.kind === 'mission' && part.secret.mission === missionId) ?? null
}

export function secretForSpot(spotId: string): Part | null {
  return SECRET_PARTS.find((part) => part.secret?.kind === 'hidden' && part.secret.spot === spotId) ?? null
}

export function secretForClearing(clearingId: string): Part | null {
  return SECRET_PARTS.find((part) => part.secret?.kind === 'clearing' && part.secret.clearing === clearingId) ?? null
}

export type Loadout = Record<Slot, string | null>

export const EMPTY_LOADOUT: Loadout = { helmet: null, weapon: null, mobility: null, module: null }

export function equippedParts(loadout: Loadout): Part[] {
  return SLOTS.map((slot) => partById(loadout[slot])).filter((part): part is Part => part !== null)
}

export type Condition = Record<string, number>

export const CONDITION_MAX = 100
export const WORN_AT = 70
export const DAMAGED_AT = 40

export type ConditionTier = 'boa' | 'desgastada' | 'danificada' | 'quebrada'

export function conditionOf(condition: Condition | undefined, partId: string): number {
  const value = condition?.[partId]
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(CONDITION_MAX, value)) : CONDITION_MAX
}

export function conditionTier(value: number): ConditionTier {
  if (value <= 0) return 'quebrada'
  if (value < DAMAGED_AT) return 'danificada'
  if (value < WORN_AT) return 'desgastada'
  return 'boa'
}

export function conditionFactor(value: number): number {
  switch (conditionTier(value)) {
    case 'boa':
      return 1
    case 'desgastada':
      return 0.75
    case 'danificada':
      return 0.5
    default:
      return 0
  }
}

const scaled = (value: number, factor: number) => (value > 0 ? Math.round(value * factor) : value)

export function computeStats(loadout: Loadout, upgrades: UpgradeLevels = {}, condition?: Condition): Stats {
  const total: Stats = { ...BASE_STATS }
  for (const part of equippedParts(loadout)) {
    const bonus = upgradeBonus(upgrades, part.id)
    const factor = conditionFactor(conditionOf(condition, part.id))
    for (const key of STAT_KEYS) total[key] += scaled((part.stats[key] ?? 0) + (bonus[key] ?? 0), factor)
  }
  for (const key of STAT_KEYS) total[key] = Math.max(0, Math.min(STAT_MAX, total[key]))
  return total
}

export function speedMultiplier(loadout: Loadout, upgrades: UpgradeLevels = {}, condition?: Condition): number {
  let factor = 1
  for (const part of equippedParts(loadout)) {
    const own = (part.speed ?? 1) + (upgradeBonus(upgrades, part.id).walk ?? 0)
    const health = conditionFactor(conditionOf(condition, part.id))

    factor *= own > 1 ? 1 + (own - 1) * health : own
  }
  return Math.min(1.6, Math.max(0.8, factor))
}

export function formatCredits(amount: number) {
  return amount.toLocaleString('pt-BR')
}
