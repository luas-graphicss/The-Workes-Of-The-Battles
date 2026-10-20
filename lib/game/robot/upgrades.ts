import { EXPANSION_UPGRADES } from './expansion'
import { EXPANSION_2_UPGRADES } from './expansion-2'
import type { Part, StatKey, Stats } from './parts'

const KEYS: readonly StatKey[] = ['attack', 'defense', 'speed', 'energy']

export type UpgradeEffect = Partial<Stats> & { walk?: number }

export type Upgrade = {
  id: string
  name: string
  description: string
  effect: UpgradeEffect
  max: number
}

export type UpgradeLevels = Record<string, Record<string, number>>

export type UpgradeRow = [id: string, name: string, description: string, effect: UpgradeEffect, max?: number]
type Row = UpgradeRow

const DEFAULT_MAX = 2

const ROWS: Record<string, Row[]> = {
  'helmet-cap': [
    ['brim', 'Aba reforçada', 'Costura dupla e uma chapa fina escondida na aba: o boné para mais do que parece.', { defense: 1 }],
    ['lining', 'Forro de lã do bosque', 'Mantém o núcleo aquecido nas noites frias; a bateria rende um pouco mais.', { energy: 1 }],
  ],
  'helmet-builder': [
    ['ceramic', 'Casco cerâmico', 'Uma camada de cerâmica entre o plástico e a cabeça. Tijolo nenhum passa.', { defense: 1 }],
    ['headlamp', 'Lanterna frontal', 'Uma lâmpada de obra na testa; a célula dela alimenta o robô de quebra.', { energy: 1 }],
  ],
  'helmet-pilot': [
    ['polarized', 'Viseira polarizada', 'Corta o brilho dos holofotes da arena e segura estilhaços.', { defense: 1 }],
    ['fins', 'Aletas aerodinâmicas', 'Duas aletas atrás das orelhas; o vento passa reto e o robô ganha passo.', { walk: 0.04 }, 3],
  ],
  'helmet-radar': [
    ['dish', 'Prato de alta frequência', 'O prato ouve mais longe e carrega a bateria com o ruído das estrelas.', { energy: 1 }],
    ['tracking', 'Rastreio balístico', 'O radar mira pelo robô: cada golpe sai um pouco mais certeiro.', { attack: 1 }],
  ],
  'helmet-knight': [
    ['tempered', 'Têmpera das muralhas', 'O aço antigo volta ao fogo e sai mais duro do que entrou.', { defense: 1 }],
    ['crest', 'Crista de comando', 'Uma crista de bronze no topo; o robô anda mais confiante e bate mais forte.', { attack: 1 }],
  ],
  'helmet-crown': [
    ['gilding', 'Douração verdadeira', 'Folha de ouro de verdade sobre a sucata: a coroa impõe respeito no ringue.', { attack: 1 }],
    ['jewels', 'Pedras de cristal', 'Lascas de cristal da praça encaixadas nas pontas, cada uma com um pingo de energia.', { energy: 1 }],
  ],
  'helmet-visor': [
    ['hud', 'Mira projetada', 'Uma mira desenhada no vidro da viseira; o alvo nunca sai de foco.', { attack: 1 }],
    ['armored', 'Viseira blindada', 'Vidro laminado de três camadas no lugar do acrílico.', { defense: 1 }],
  ],
  'helmet-miner': [
    ['carbide', 'Lâmpada de carbureto', 'A chama antiga vira célula de energia; brilha mais e dura a noite toda.', { energy: 1 }],
    ['rockguard', 'Protetor de nuca', 'Uma aba de couro e metal atrás, para pedra que cai de onde ninguém olha.', { defense: 1 }],
  ],
  'helmet-diver': [
    ['bolts', 'Parafusos de pressão', 'Doze parafusos novos na gola; o escafandro aguenta golpe de fundo do mar.', { defense: 1 }],
    ['porthole', 'Vigia alargada', 'A janela fica maior e mais clara; o robô enxerga a saída e anda com mais pressa.', { walk: 0.04 }, 3],
  ],
  'helmet-samurai': [
    ['maedate', 'Maedate de bronze', 'O ornamento frontal ganha fio de verdade: cada investida corta mais.', { attack: 1 }],
    ['shikoro', 'Shikoro laminado', 'As lâminas do pescoço descem mais uma fileira e cobrem a nuca.', { defense: 1 }],
  ],
  'helmet-owl': [
    ['nightsight', 'Olhos de coruja', 'As lentes abrem no escuro: o robô vê o golpe antes de ele sair.', { defense: 1 }],
    ['silentwings', 'Plumas silenciosas', 'Penas que abafam o motor; o passo fica leve e rápido como um voo.', { walk: 0.04 }, 3],
  ],
  'helmet-crystal': [
    ['resonance', 'Ressonância do cristal', 'O diadema vibra na frequência da fonte e devolve energia a cada pulso.', { energy: 1 }],
    ['facets', 'Facetas lapidadas', 'Lapidado de novo, o cristal canaliza o ataque como uma lente.', { attack: 1 }],
  ],
  'helmet-meteor': [
    ['ember', 'Brasa do impacto', 'O núcleo da coroa ainda está quente: cada golpe carrega esse calor.', { attack: 1 }],
    ['crust', 'Crosta recozida', 'A pedra do céu endurece na forja e vira o elmo mais grosso da cidade.', { defense: 1 }],
  ],
  'weapon-claw': [
    ['tips', 'Pontas de tungstênio', 'Os três dedos ganham pontas que não cedem nem em blindagem.', { attack: 1 }],
    ['servo', 'Servo de resposta', 'Um servo mais rápido na articulação: a garra fecha antes do inimigo piscar.', { attack: 1 }],
  ],
  'weapon-hammer': [
    ['head', 'Cabeça de aço fundido', 'A cabeça do martelo é fundida de novo, mais densa. A praça treme mais.', { attack: 1 }],
    ['counterweight', 'Contrapeso balanceado', 'Um contrapeso no cabo; o martelo pesa o mesmo, mas o robô anda melhor com ele.', { speed: 1 }],
  ],
  'weapon-drill': [
    ['diamond', 'Ponta diamantada', 'Diamante industrial na ponta da espiral; nada segura a broca.', { attack: 1 }],
    ['gearbox', 'Caixa de redução', 'Mais torque no mesmo motor, e menos energia desperdiçada em cada giro.', { energy: 1 }],
  ],
  'weapon-blaster': [
    ['capacitor', 'Capacitor duplo', 'Dois capacitores em paralelo: o pulso sai mais forte.', { attack: 1 }],
    ['coolant', 'Refrigeração líquida', 'O cano não esquenta e a bateria não sofre entre os disparos.', { energy: 1 }],
  ],
  'weapon-cannon': [
    ['shells', 'Munição perfurante', 'Projéteis com núcleo de ferro de meteoro. O canhão pesado fica mais pesado ainda.', { attack: 1 }],
    ['recoil', 'Amortecedor de recuo', 'O coice vai para o chão e não para o robô: o passo volta ao normal.', { speed: 1 }],
  ],
  'weapon-laser': [
    ['lens', 'Lente de cristal puro', 'Uma lente lapidada da praça no lugar do vidro: o feixe fica mais fino e fundo.', { attack: 1 }],
    ['battery', 'Célula de feixe', 'Uma célula dedicada só ao laser; o resto do robô fica com a bateria inteira.', { energy: 1 }],
  ],
  'weapon-wrench': [
    ['jaw', 'Mandíbula endurecida', 'A boca da chave recebe têmpera: aperta parafuso e amassa blindagem.', { attack: 1 }],
    ['grip', 'Cabo emborrachado', 'Um cabo que não escorrega; o robô segura a chave como escudo quando precisa.', { defense: 1 }],
  ],
  'weapon-saw': [
    ['teeth', 'Dentes de carbeto', 'Dentes novos que não perdem o fio nem em esteira de tanque.', { attack: 1 }],
    ['bearing', 'Rolamento balanceado', 'A serra para de vibrar e o robô para de brigar com o próprio braço.', { speed: 1 }],
  ],
  'weapon-harpoon': [
    ['barbs', 'Farpas serrilhadas', 'Farpas que entram e não saem: cada arremesso rende mais.', { attack: 1 }],
    ['reel', 'Carretel elétrico', 'O arpão volta sozinho para a mão, e volta rápido.', { walk: 0.04 }, 3],
  ],
  'weapon-boxing': [
    ['piston', 'Pistão de alta pressão', 'Mais pressão no pistão: o soco sai como uma marretada.', { attack: 1 }],
    ['guard', 'Guarda de antebraço', 'Uma placa no antebraço para aparar; a luva também defende.', { defense: 1 }],
  ],
  'weapon-sword': [
    ['edge', 'Fio de plasma', 'A lâmina de energia fica mais estreita e muito mais quente.', { attack: 1 }],
    ['cell', 'Célula de lâmina', 'A espada ganha a própria bateria e para de beber a do robô.', { energy: 1 }],
  ],
  'weapon-meteor-mace': [
    ['spikes', 'Espinhos de ferro celeste', 'Pontas forjadas do mesmo meteoro, espetadas na cabeça da maça.', { attack: 1 }],
    ['chain', 'Corrente encurtada', 'A corrente fica mais curta e o robô controla o peso ao andar.', { speed: 1 }],
  ],
  'weapon-crystal-blade': [
    ['tuning', 'Afinação da lâmina', 'A lâmina vibra num tom que corta até escudo magnético.', { attack: 1 }],
    ['glow', 'Brilho interno', 'O cristal guarda luz do dia e a devolve à bateria durante a noite.', { energy: 1 }],
  ],
  'weapon-alien-ray': [
    ['focus', 'Foco estelar', 'O emissor concentra o raio num ponto do tamanho de um parafuso.', { attack: 1 }],
    ['shielding', 'Blindagem do emissor', 'Uma carcaça que protege o emissor e o braço que o segura.', { defense: 1 }],
  ],
  'move-wheels': [
    ['tires', 'Pneus de borracha macia', 'Agarram o paralelepípedo da praça: o robô anda mais rápido pela cidade.', { walk: 0.04 }, 3],
    ['bearings', 'Rolamentos de precisão', 'As rodas giram sem atrito e sobra energia para o resto.', { energy: 1 }],
  ],
  'move-springs': [
    ['steel', 'Molas de aço de relógio', 'Molas mais tensas: cada passo é um pulo maior.', { speed: 1 }],
    ['dampers', 'Amortecedores', 'Os pousos param de sacudir o núcleo; o robô aguenta mais pancada.', { defense: 1 }],
  ],
  'move-heavy': [
    ['plates', 'Placas de canela', 'Placas extras na frente das botas, para chute e estilhaço.', { defense: 1 }],
    ['soles', 'Solas de gel', 'Solas que devolvem o impulso: as botas pesadas ficam quase leves.', { walk: 0.04 }, 3],
  ],
  'move-offroad': [
    ['treads', 'Banda de rodagem funda', 'Sulcos profundos para lama, grama e cascalho.', { walk: 0.04 }, 3],
    ['axle', 'Eixo reforçado', 'Um eixo que não entorta: o robô atravessa qualquer buraco de pé.', { defense: 1 }],
  ],
  'move-tracks': [
    ['links', 'Elos blindados', 'Cada elo da esteira ganha uma placa; nada passa por baixo.', { defense: 1 }],
    ['motor', 'Motor de tração', 'Mais tração nas esteiras: o robô empurra e bate com o peso todo.', { attack: 1 }],
  ],
  'move-hover': [
    ['thrust', 'Impulso calibrado', 'Os propulsores afinados: a base flutua mais alto e mais rápido.', { walk: 0.04 }, 3],
    ['stabilizer', 'Giroscópio', 'Um giroscópio no centro da base; o robô não tomba nem com golpe de martelo.', { defense: 1 }],
  ],
  'move-skates': [
    ['blades', 'Lâminas afiadas', 'Lâminas novas que deslizam no asfalto como se fosse gelo.', { walk: 0.04 }, 3],
    ['ankles', 'Tornozelos travados', 'Reforço nos tornozelos: patins que não torcem no meio da luta.', { defense: 1 }],
  ],
  'move-spider': [
    ['claws', 'Garras de aderência', 'As oito pontas agarram qualquer parede, e qualquer inimigo.', { attack: 1 }],
    ['hydraulics', 'Hidráulica das pernas', 'As pernas ficam mais rápidas e o passo mais firme.', { speed: 1 }],
  ],
  'move-monowheel': [
    ['gyro', 'Giroscópio de equilíbrio', 'A monorroda para de balançar; o robô volta a se defender direito.', { defense: 1 }],
    ['rim', 'Aro leve', 'Um aro de liga leve que gira mais rápido com a mesma energia.', { walk: 0.04 }, 3],
  ],
  'move-rocket': [
    ['fuel', 'Combustível refinado', 'Queima mais limpo: as botas gastam menos bateria por salto.', { energy: 1 }],
    ['nozzles', 'Bocais vetoriais', 'Os bocais giram e apontam o impulso para onde o robô quer ir.', { walk: 0.04 }, 3],
  ],
  'move-golem': [
    ['runes', 'Runas de firmeza', 'As runas da torre gravadas nos pés: o golem não sai do lugar quando não quer.', { defense: 1 }],
    ['stride', 'Passo de pedra', 'Juntas lubrificadas: os pés de golem andam quase como pés de robô.', { walk: 0.04 }, 3],
  ],
  'move-crystal-board': [
    ['wax', 'Cera de cristal', 'A prancha deslizando sem atrito nenhum sobre a rua.', { walk: 0.04 }, 3],
    ['charge', 'Carga da prancha', 'O cristal da prancha alimenta o robô enquanto flutua.', { energy: 1 }],
  ],
  'move-alien-legs': [
    ['tendons', 'Tendões sintéticos', 'As pernas de outro mundo ficam mais rápidas ainda.', { speed: 1 }],
    ['plating', 'Carapaça das pernas', 'Uma carapaça que protege as juntas alienígenas de qualquer golpe baixo.', { defense: 1 }],
  ],
  'module-battery': [
    ['cells', 'Células de alta densidade', 'Mais carga no mesmo tamanho: a bateria extra fica extra mesmo.', { energy: 1 }],
    ['casing', 'Carcaça blindada', 'Uma carcaça que protege as células e as costas do robô.', { defense: 1 }],
  ],
  'module-solar': [
    ['panels', 'Células de alto rendimento', 'O painel colhe até a luz da Árvore-Lume durante a noite.', { energy: 1 }],
    ['tilt', 'Articulação solar', 'O painel segue o sol e sai do caminho na luta: o robô anda mais leve.', { walk: 0.04 }, 3],
  ],
  'module-antenna': [
    ['amplifier', 'Amplificador de sinal', 'O rádio ouve a oficina de qualquer canto da cidade e recarrega no caminho.', { energy: 1 }],
    ['mast', 'Mastro de aço', 'O mastro vira uma barra de proteção para as costas.', { defense: 1 }],
  ],
  'module-backpack': [
    ['straps', 'Alças acolchoadas', 'A mochila para de bater nas costas: o robô anda mais rápido com ela cheia.', { walk: 0.04 }, 3],
    ['frame', 'Armação de alumínio', 'Uma armação rígida que também aguenta golpe por trás.', { defense: 1 }],
  ],
  'module-shield': [
    ['coils', 'Bobinas duplas', 'O campo magnético fica mais denso e desvia mais sucata.', { defense: 1 }],
    ['phase', 'Fase sincronizada', 'O escudo pulsa junto com o núcleo e devolve energia ao desligar.', { energy: 1 }],
  ],
  'module-jetpack': [
    ['burners', 'Queimadores gêmeos', 'Mais empuxo nos dois bicos: o robô cruza a cidade voando baixo.', { walk: 0.04 }, 3],
    ['intake', 'Entrada de ar fria', 'Queima mais eficiente: o jetpack deixa de beber a bateria.', { energy: 1 }],
  ],
  'module-lantern': [
    ['wick', 'Pavio de cristal', 'A lanterna queima lasca de cristal e devolve o brilho em energia.', { energy: 1 }],
    ['cage', 'Gaiola de bronze', 'Uma gaiola em volta do vidro: a lanterna aguenta pancada e protege as costas.', { defense: 1 }],
  ],
  'module-fan': [
    ['blades', 'Pás curvas', 'Pás que puxam mais ar com menos giro: o núcleo nunca esquenta.', { energy: 1 }],
    ['duct', 'Duto direcionado', 'O ar frio vai direto para as pernas e o robô acelera.', { walk: 0.04 }, 3],
  ],
  'module-drone': [
    ['camera', 'Câmera de mira', 'O drone marca o alvo e o robô acerta onde o drone olha.', { attack: 1 }],
    ['rotors', 'Rotores silenciosos', 'Rotores eficientes: o drone voa a noite toda com a bateria do robô intacta.', { energy: 1 }],
  ],
  'module-armor': [
    ['layers', 'Camadas sobrepostas', 'Mais uma camada de placas no peitoral. Pesado, mas quase indestrutível.', { defense: 1 }],
    ['joints', 'Juntas articuladas', 'As placas passam a dobrar com o robô, e o passo volta ao normal.', { speed: 1 }],
  ],
  'module-turbine': [
    ['compressor', 'Compressor de alta', 'As turbinas sopram mais forte: o robô voa rente ao chão.', { walk: 0.04 }, 3],
    ['afterburner', 'Pós-combustor', 'Um sopro extra na hora do golpe: cada investida chega mais forte.', { attack: 1 }],
  ],
  'module-alien-orb': [
    ['orbit', 'Órbita estável', 'O orbe gira mais perto do núcleo e o alimenta sem parar.', { energy: 1 }],
    ['pulse', 'Pulso defensivo', 'O orbe lança um pulso que desvia o golpe antes de chegar.', { defense: 1 }],
  ],
  'module-crystal-wings': [
    ['span', 'Envergadura maior', 'As asas crescem uma lasca de cada lado e o robô plana mais rápido.', { walk: 0.04 }, 3],
    ['lumen', 'Veios luminosos', 'Os veios do cristal brilham e carregam a bateria com cada batida de asa.', { energy: 1 }],
  ],
  'module-meteor-core': [
    ['fusion', 'Fusão contida', 'O núcleo do meteoro queima mais quente dentro da carcaça: energia de sobra.', { energy: 1 }],
    ['gravity', 'Campo de gravidade', 'O núcleo pesa o robô no chão e aguenta golpes que derrubariam um golem.', { defense: 1 }],
  ],
  'helmet-dew-crown': [
    ['droplets', 'Gotas da manhã', 'Mais gotas de orvalho nas folhas da grinalda, cada uma com um pingo de luz para o núcleo.', { energy: 1 }],
    ['vines', 'Ramos trançados', 'Os ramos da coroa se trançam mais firmes e seguram golpe como um elmo.', { defense: 1 }],
  ],
  'weapon-thorn-whip': [
    ['amber', 'Espinhos de âmbar novo', 'Espinhos mais longos e duros brotam do cipó: cada chicotada arranha fundo.', { attack: 1 }],
    ['vine', 'Cipó mais leve', 'O cipó seca ao sol da clareira e fica mais leve no braço do robô.', { speed: 1 }],
  ],
  'module-firefly-jar': [
    ['swarm', 'Mais vaga-lumes', 'Um punhado de vaga-lumes novos entra no vidro e a jarra brilha o dobro.', { energy: 1 }],
    ['lid', 'Tampa furadinha', 'A tampa ganha furinhos certos: os vaga-lumes respiram e o robô anda iluminado.', { walk: 0.04 }, 3],
  ],
}

const CATALOGUE = new Map<string, Upgrade[]>(
  Object.entries({ ...ROWS, ...EXPANSION_UPGRADES, ...EXPANSION_2_UPGRADES }).map(([partId, rows]) => [
    partId,
    rows.map(([id, name, description, effect, max]) => ({ id, name, description, effect, max: max ?? DEFAULT_MAX })),
  ]),
)

export function upgradesFor(partId: string): Upgrade[] {
  return CATALOGUE.get(partId) ?? []
}

export function upgradeLevel(levels: UpgradeLevels, partId: string, upgradeId: string): number {
  const level = levels[partId]?.[upgradeId] ?? 0
  return Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0
}

export function partLevel(levels: UpgradeLevels, partId: string): { level: number; max: number } {
  const list = upgradesFor(partId)
  return {
    level: list.reduce((sum, upgrade) => sum + Math.min(upgrade.max, upgradeLevel(levels, partId, upgrade.id)), 0),
    max: list.reduce((sum, upgrade) => sum + upgrade.max, 0),
  }
}

export function upgradeCost(part: Part, level: number): number {
  return Math.max(10, Math.round((part.price * (0.7 + 0.5 * level)) / 10) * 10)
}

export function upgradeBonus(levels: UpgradeLevels, partId: string): UpgradeEffect {
  const total: UpgradeEffect = {}
  for (const upgrade of upgradesFor(partId)) {
    const level = Math.min(upgrade.max, upgradeLevel(levels, partId, upgrade.id))
    if (level <= 0) continue
    for (const key of KEYS) {
      const value = upgrade.effect[key]
      if (value) total[key] = (total[key] ?? 0) + value * level
    }
    if (upgrade.effect.walk) total.walk = (total.walk ?? 0) + upgrade.effect.walk * level
  }
  return total
}

export function upgradedPart(part: Part, levels: UpgradeLevels): { stats: Partial<Stats>; walk: number } {
  const bonus = upgradeBonus(levels, part.id)
  const stats: Partial<Stats> = {}
  for (const key of KEYS) {
    const value = (part.stats[key] ?? 0) + (bonus[key] ?? 0)
    if (value !== 0) stats[key] = value
  }
  return { stats, walk: (part.speed ?? 1) + (bonus.walk ?? 0) }
}

export function describeEffect(effect: UpgradeEffect, labels: Record<StatKey, string>): string[] {
  const out: string[] = []
  for (const key of KEYS) {
    const value = effect[key]
    if (value) out.push(`${value > 0 ? '+' : ''}${value} ${labels[key]}`)
  }
  if (effect.walk) out.push(`${effect.walk > 0 ? '+' : ''}${Math.round(effect.walk * 100)}% passo`)
  return out
}
