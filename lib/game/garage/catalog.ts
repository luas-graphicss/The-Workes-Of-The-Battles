export type Brother = 'charles' | 'sid' | 'james'

export type Currency = 'coins' | 'fragments'

export type UpgradeId =
  | 'visao'
  | 'aguia'
  | 'ferida'
  | 'laser'
  | 'tanque'
  | 'supersoco'
  | 'uivo'
  | 'saudavel'
  | 'forte'
  | 'combo'
  | 'rico'
  | 'imprevisivel'
  | 'lanca'
  | 'minibomba'
  | 'transformador'
  | 'lavajato'

export type UpgradeKind = 'active' | 'passive' | 'perk'

export type UpgradeDef = {
  id: UpgradeId
  brother: Brother
  name: string
  tagline: string
  description: string
  kind: UpgradeKind
  currency: Currency
  costs: readonly number[]
  levels: readonly string[]
  energy: number
  cooldown: readonly number[]
}

export type BrotherDef = {
  id: Brother
  name: string
  title: string
  specialty: string
  accent: string
  station: readonly [number, number]
  greetings: readonly string[]
  bought: readonly string[]
  poor: readonly string[]
  maxed: string
  equipped: string
  removed: string
  full: string
}

export const CHIP_SLOTS = 3
export const MOUNT_SLOTS = 2

export const COIN_NAME = 'Moedas de Ferro'
export const FRAGMENT_NAME = 'Fragmentos'

const COIN_STEPS = [1, 3, 7] as const

const coinCosts = (base: number) => COIN_STEPS.map((step) => base * step)

const percent = (value: number) => `${Math.round(value * 100)}%`

const seconds = (value: number) => `${String(value).replace('.', ',')} s`

export const TUNING = {
  visao: { chance: [0.3, 0.4, 0.5], cooldown: [6, 5, 4], heavyShare: 0.18 },
  aguia: { charges: [2, 3, 4], window: [5, 5, 6], bonus: [0.5, 0.6, 0.75], rest: 4, stagger: 0.6 },
  ferida: { duration: 10, rate: [0.008, 0.011, 0.014], slow: [0.15, 0.2, 0.25], bossShare: 0.5 },
  laser: { duration: [5, 10, 10], power: [1.5, 1.35, 1.7], cooldown: [22, 28, 26], range: 820, pierce: [false, false, true] },
  tanque: { trigger: 0.25, missiles: [5, 6, 7], power: [2.2, 2.4, 2.6], armor: [0.6, 0.55, 0.5], heal: [0, 0.08, 0.15], limit: 14, blast: 130 },
  supersoco: { uses: [1, 1, 2], share: 0.5, bossShare: [0.2, 0.25, 0.3], splash: [0, 0.15, 0.15], bossSplash: 0.06 },
  uivo: { radius: 430, stun: [2.5, 3.5, 4.5], confusion: 15, miss: 0.35, slow: 0.35, bossStun: 0.5, bossConfusion: 0.6, cooldown: [35, 32, 28] },
  saudavel: { bar: 0.3 },
  forte: { bonus: [0.08, 0.16, 0.25] },
  combo: { cap: 18, step: [0.02, 0.03], window: [1.4, 1.6], burst: [0.06, 0.08] },
  rico: { bonus: [0.18, 0.35] },
  imprevisivel: { length: [5, 6], time: [3.6, 4.2], power: [1.2, 1.45], fill: [30, 25] },
  lanca: { power: [1.8, 2.2, 2.4], stagger: [0, 0.8, 0.8], spears: [1, 1, 2], cooldown: [7, 7, 6] },
  minibomba: { bombs: [3, 6, 6], power: [0.9, 0.85, 1], radius: [95, 95, 120], burn: [false, false, true], cooldown: [10, 11, 10], fuse: 0.55 },
  transformador: { duration: [4, 5, 6], speed: 2.3, power: [1.4, 1.6, 1.8], armor: 0.8, rehit: 0.7, cooldown: [24, 22, 20] },
  lavajato: { duration: 1.2, range: 380, cone: 0.5, stun: [1.2, 1.6, 2], power: 0.35, tick: 0.2, cooldown: [16, 15, 14] },
} as const

const T = TUNING

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'visao',
    brother: 'charles',
    name: 'Visão',
    tagline: 'Desvia sozinho da maioria dos golpes.',
    description: `Um chip de previsão lê o motor do adversário e tira o robô do caminho antes do golpe. Não desvia de golpes pesados: cartas especiais, investidas, chuvas, campeões e qualquer pancada acima de ${percent(T.visao.heavyShare)} do núcleo.`,
    kind: 'passive',
    currency: 'coins',
    costs: coinCosts(600),
    levels: T.visao.chance.map((chance, index) => `${percent(chance)} de chance · recarga de ${seconds(T.visao.cooldown[index])}`),
    energy: 0,
    cooldown: T.visao.cooldown,
  },
  {
    id: 'aguia',
    brother: 'charles',
    name: 'Águia',
    tagline: 'Pula por cima e ataca pelas costas.',
    description: 'O robô salta por cima do alvo e cai atrás dele. O adversário cambaleia e, durante a janela, todo golpe nele vale como ataque pelas costas.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(900),
    levels: T.aguia.charges.map((charges, index) => `${charges} saltos por luta · ${seconds(T.aguia.window[index])} de costas · +${percent(T.aguia.bonus[index])} de dano`),
    energy: 10,
    cooldown: [T.aguia.rest, T.aguia.rest, T.aguia.rest],
  },
  {
    id: 'ferida',
    brother: 'charles',
    name: 'Ferida',
    tagline: 'Cada golpe abre um vazamento de óleo.',
    description: `Golpes e tiros furam o tanque do adversário: por ${T.ferida.duration} segundos ele perde núcleo aos poucos e anda mais devagar, como um curto sangramento. Campeões vazam pela metade.`,
    kind: 'passive',
    currency: 'coins',
    costs: coinCosts(1150),
    levels: T.ferida.rate.map((rate, index) => `${String(Math.round(rate * 1000) / 10).replace('.', ',')}% do núcleo por segundo · ${percent(T.ferida.slow[index])} mais lento`),
    energy: 0,
    cooldown: [0, 0, 0],
  },
  {
    id: 'laser',
    brother: 'charles',
    name: 'Laser',
    tagline: 'Um feixe com mira que derrete blindagem.',
    description: 'Um feixe contínuo sai do peito do robô e segue a mira (ou o alvo mais próximo). Dói mais que os golpes, mas o robô fica lento enquanto dispara e não pode atacar nem esquivar.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(1500),
    levels: T.laser.duration.map((duration, index) => `${seconds(duration)} de feixe · ${String(T.laser.power[index]).replace('.', ',')}× golpe por segundo${T.laser.pierce[index] ? ' · atravessa todos' : ''}`),
    energy: 20,
    cooldown: T.laser.cooldown,
  },
  {
    id: 'tanque',
    brother: 'charles',
    name: 'Tanque',
    tagline: 'Com o núcleo crítico, vira um tanque de guerra.',
    description: `Uma vez por luta, quando o núcleo cai abaixo de ${percent(T.tanque.trigger)}, o robô se dobra num tanque blindado. Golpe e tiro disparam mísseis teleguiados que explodem em área. Acabou a munição, volta a ser robô.`,
    kind: 'passive',
    currency: 'coins',
    costs: coinCosts(1800),
    levels: T.tanque.missiles.map((missiles, index) => `${missiles} mísseis · recebe ${percent(T.tanque.armor[index])} do dano${T.tanque.heal[index] ? ` · recupera ${percent(T.tanque.heal[index])}` : ''}`),
    energy: 0,
    cooldown: [0, 0, 0],
  },
  {
    id: 'supersoco',
    brother: 'charles',
    name: 'Super-soco',
    tagline: 'Tira metade do núcleo de um robô.',
    description: `O punho gira, trava e dispara. Robôs comuns perdem ${percent(T.supersoco.share)} do núcleo de uma vez; campeões aguentam melhor.`,
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(3000),
    levels: T.supersoco.uses.map((uses, index) => `${uses}× por luta · campeões perdem ${percent(T.supersoco.bossShare[index])}${T.supersoco.splash[index] ? ' · onda de choque em volta' : ''}`),
    energy: 0,
    cooldown: [0, 0, 0],
  },
  {
    id: 'uivo',
    brother: 'charles',
    name: 'Uivo',
    tagline: 'Um uivo que confunde quem está perto.',
    description: `Um uivo metálico trava os circuitos de quem está em volta: primeiro ficam parados, depois confusos até completar ${T.uivo.confusion} segundos, andando devagar e errando ${percent(T.uivo.miss)} dos golpes. Campeões resistem um pouco.`,
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(4000),
    levels: T.uivo.stun.map((stun, index) => `${seconds(stun)} parados · ${T.uivo.confusion} s confusos · recarga de ${T.uivo.cooldown[index]} s`),
    energy: 30,
    cooldown: T.uivo.cooldown,
  },
  {
    id: 'saudavel',
    brother: 'sid',
    name: 'Saudável',
    tagline: 'Mais uma barra de vida para o robô.',
    description: `Uma solução de fragmentos reforça o núcleo: cada nível acrescenta uma barra extra de vida, com ${percent(T.saudavel.bar)} do núcleo base. As barras extras gastam primeiro.`,
    kind: 'perk',
    currency: 'fragments',
    costs: [2, 4, 7],
    levels: [1, 2, 3].map((bars) => `${bars} ${bars === 1 ? 'barra extra' : 'barras extras'} · +${percent(T.saudavel.bar * bars)} de núcleo`),
    energy: 0,
    cooldown: [0, 0, 0],
  },
  {
    id: 'forte',
    brother: 'sid',
    name: 'Forte',
    tagline: 'Mais dano em cada golpe.',
    description: 'Fragmentos dissolvidos no óleo dos servos: golpes, tiros, cartas e montagens batem mais forte para sempre.',
    kind: 'perk',
    currency: 'fragments',
    costs: [4, 7, 10],
    levels: T.forte.bonus.map((bonus) => `+${percent(bonus)} de dano em tudo`),
    energy: 0,
    cooldown: [0, 0, 0],
  },
  {
    id: 'combo',
    brother: 'sid',
    name: 'Combo',
    tagline: `Combos de até ${T.combo.cap} golpes seguidos.`,
    description: `O combo não para mais no terceiro golpe: segue até ${T.combo.cap}. Cada golpe seguido bate mais forte, e a 6ª, a 12ª e a 18ª pancada soltam uma explosão final que cresce com o combo.`,
    kind: 'perk',
    currency: 'fragments',
    costs: [6, 10],
    levels: T.combo.step.map((step, index) => `+${percent(step)} por golpe seguido · janela de ${seconds(T.combo.window[index])}`),
    energy: 0,
    cooldown: [0, 0],
  },
  {
    id: 'rico',
    brother: 'sid',
    name: 'Rico',
    tagline: 'Mais moedas a cada vitória.',
    description: 'Um ímã de fragmentos no peito puxa cada moeda perdida pela arena. Vale em toda batalha vencida.',
    kind: 'perk',
    currency: 'fragments',
    costs: [15, 22],
    levels: T.rico.bonus.map((bonus) => `+${percent(bonus)} de moedas por vitória`),
    energy: 0,
    cooldown: [0, 0],
  },
  {
    id: 'imprevisivel',
    brother: 'sid',
    name: 'Imprevisível',
    tagline: 'A barra laranja libera uma sequência de golpes.',
    description: 'Uma barra laranja enche enquanto o robô bate e apanha. Cheia, aperte Fúria: o tempo desacelera, uma sequência de botões aparece na tela e cada acerto vira um golpe automático. A última pancada é a mais forte.',
    kind: 'perk',
    currency: 'fragments',
    costs: [20, 28],
    levels: T.imprevisivel.length.map((length, index) => `${length} botões em ${seconds(T.imprevisivel.time[index])} · ${String(T.imprevisivel.power[index]).replace('.', ',')}× golpe cada`),
    energy: 0,
    cooldown: [0, 0],
  },
  {
    id: 'lanca',
    brother: 'james',
    name: 'Lança',
    tagline: 'Uma lança ejetada pelo peito.',
    description: 'Uma escotilha no peito dispara uma lança de aço que atravessa todos os robôs da linha e os empurra para trás.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(900),
    levels: T.lanca.power.map((power, index) => `${String(power).replace('.', ',')}× golpe${T.lanca.stagger[index] ? ' · empala por um instante' : ''}${T.lanca.spears[index] > 1 ? ' · 2 lanças' : ''}`),
    energy: 12,
    cooldown: T.lanca.cooldown,
  },
  {
    id: 'minibomba',
    brother: 'james',
    name: 'Mini-bomba',
    tagline: 'Cospe pequenas bombas em leque.',
    description: 'O robô cospe um leque de bombinhas que quicam, chiam e explodem em área. Ótimas contra grupos.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(1250),
    levels: T.minibomba.bombs.map((bombs, index) => `${bombs} bombas · ${String(T.minibomba.power[index]).replace('.', ',')}× golpe cada${T.minibomba.burn[index] ? ' · área maior e queima' : ''}`),
    energy: 18,
    cooldown: T.minibomba.cooldown,
  },
  {
    id: 'transformador',
    brother: 'james',
    name: 'Transformador',
    tagline: 'Vira um carro e atropela o rival.',
    description: 'Um botão no painel e o robô se dobra num carro. Corre muito mais, atropela quem estiver na frente e aguenta melhor as pancadas, mas não ataca enquanto dirige.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(3000),
    levels: T.transformador.duration.map((duration, index) => `${seconds(duration)} de carro · ${String(T.transformador.power[index]).replace('.', ',')}× golpe por atropelo`),
    energy: 25,
    cooldown: T.transformador.cooldown,
  },
  {
    id: 'lavajato',
    brother: 'james',
    name: 'Lava-Jato',
    tagline: 'Jato de água que causa uma pane rápida.',
    description: 'Um jato de alta pressão encharca quem estiver na frente e dá curto nos circuitos: pane rápida, passos lentos e +50% de dano de Raio. De quebra, apaga a queimadura do próprio robô.',
    kind: 'active',
    currency: 'coins',
    costs: coinCosts(4200),
    levels: T.lavajato.stun.map((stun, index) => `${seconds(stun)} de pane · recarga de ${T.lavajato.cooldown[index]} s`),
    energy: 20,
    cooldown: T.lavajato.cooldown,
  },
]

export const BROTHERS: Record<Brother, BrotherDef> = {
  charles: {
    id: 'charles',
    name: 'Charles',
    title: 'Chips de núcleo',
    specialty: `Upgrades internos com recarga. Cabem ${CHIP_SLOTS} chips no núcleo.`,
    accent: '95 224 207',
    station: [0.2, 0.62],
    greetings: [
      'Shh, estou soldando. Brincadeira. Quer um chip novo no núcleo?',
      'Cada chip conversa com o núcleo do seu robô. Escolha os que combinam com o seu jeito de lutar.',
      'Visão, laser, uivo... tudo passa por esta bancada antes de chegar ao ringue.',
    ],
    bought: ['Chip gravado e testado. O núcleo já reconheceu.', 'Pronto. Solda fria, circuito quente.', 'Instalado. Agora vá estragar a festa de alguém.'],
    poor: ['Faltam moedas. A Liga paga bem quem vence, sabia?', 'Ainda não fecha a conta. Mais uma vitória e conversamos.'],
    maxed: 'Esse chip já está no limite. Nem eu consigo espremer mais.',
    equipped: 'Encaixado no núcleo. Vai sentir na próxima luta.',
    removed: 'Tirei o chip. Fica guardado na gaveta, é seu.',
    full: `O núcleo só aguenta ${CHIP_SLOTS} chips. Tire um antes.`,
  },
  sid: {
    id: 'sid',
    name: 'Sid',
    title: 'Alquimia de fragmentos',
    specialty: 'Melhorias permanentes, pagas em fragmentos achados em batalha.',
    accent: '196 160 255',
    station: [0.53, 0.58],
    greetings: [
      'Fragmentos! Trouxe fragmentos? Eles caem de alguns robôs, sobretudo dos campeões.',
      'Isto aqui não se desfaz, meu caro. O que eu misturo no seu robô fica para sempre.',
      'Cuidado com o frasco roxo. Não, o outro. Esse sim.',
    ],
    bought: ['Borbulhou, chiou e grudou. Permanente!', 'Hah! Funcionou de primeira. Quase sempre funciona.', 'Mistura pronta. Seu robô agradece em silêncio.'],
    poor: ['Faltam fragmentos. Vença os campeões: eles sempre largam alguns.', 'Ainda não. Os fragmentos caem de algumas batalhas, continue lutando.'],
    maxed: 'Mais que isso e o robô começa a brilhar no escuro.',
    equipped: '',
    removed: '',
    full: '',
  },
  james: {
    id: 'james',
    name: 'James',
    title: 'Montagens de chassi',
    specialty: `Armas montadas no chassi. Cabem ${MOUNT_SLOTS} montagens por vez.`,
    accent: '232 176 74',
    station: [0.86, 0.6],
    greetings: [
      'Lança, bomba, carro, mangueira. Se cabe no chassi, eu monto.',
      'Chassi bom é chassi cheio. Mas só cabem duas montagens, então escolha bem.',
      'Martelo, solda e paciência. O resto é com você no ringue.',
    ],
    bought: ['Parafusado, soldado e pintado. Pode bater.', 'Montagem firme. Isso aí não cai nem com terremoto.', 'Pronto! Teste no primeiro azarado que aparecer.'],
    poor: ['Moeda curta, montagem curta. Volte depois de umas vitórias.', 'Não dá ainda. A forja não trabalha de graça.'],
    maxed: 'Mais reforço que isso e o chassi entorta.',
    equipped: 'Montado no chassi. Aperta o botão e sai de baixo.',
    removed: 'Desmontei. Fica na prateleira até você querer de volta.',
    full: `Só cabem ${MOUNT_SLOTS} montagens no chassi. Desmonte uma antes.`,
  },
}

export const BROTHER_ORDER: readonly Brother[] = ['charles', 'sid', 'james']

const BY_ID = new Map<UpgradeId, UpgradeDef>(UPGRADES.map((upgrade) => [upgrade.id, upgrade]))

export function upgradeDef(id: UpgradeId): UpgradeDef {
  return BY_ID.get(id) as UpgradeDef
}

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === 'string' && BY_ID.has(value as UpgradeId)
}

export function upgradesOf(brother: Brother): UpgradeDef[] {
  return UPGRADES.filter((upgrade) => upgrade.brother === brother)
}

export function upgradeIcon(assetBase: string, id: UpgradeId) {
  return `${assetBase}assets/garage/icons/${id}.webp`
}

export function brotherPortrait(assetBase: string, brother: Brother) {
  return `${assetBase}assets/garage/${brother}.webp`
}

export function currencyIcon(assetBase: string, currency: Currency) {
  return `${assetBase}assets/ui/emblems/${currency === 'coins' ? 'coin' : 'fragment'}.webp`
}

export function slotKind(upgrade: UpgradeDef): 'chip' | 'mount' | null {
  if (upgrade.brother === 'charles') return 'chip'
  if (upgrade.brother === 'james') return 'mount'
  return null
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const
