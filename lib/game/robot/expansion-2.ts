import type { CampId } from '../../city/woods'
import type { Layer, Part, SecretOrigin, Slot, StatKey, Stats } from './parts'
import type { UpgradeRow } from './upgrades'

export type { CampId }

export const CAMP_HINTS: Record<CampId, string> = {
  cacadores: 'Os caçadores acampam no bosque a leste da Vila do Riacho, onde a trilha de terra some entre os pinheiros.',
  lenhadores: 'Lenhadores deixaram um acampamento na mata ao sul da serraria. Siga as toras caídas.',
  eremita: 'Dizem que um eremita vive na parte mais funda do bosque do sul, além dos Campos. Ele guarda o que acha.',
  forasteiros: 'Além do Mirante, onde as árvores abrem, luzes roxas sobem à noite. O que os Forasteiros guardam ali não é deles.',
}

type Hidden = { spot: string; hint: string }
type Where = number | 'vendor' | CampId | Hidden

type Row = [string, string, string, number, Where, Partial<Stats>, number?]

const VENDOR_HINT = 'À venda, sem nota, na banca Sucata & Segredos dentro da Liga de Robôs. O estoque muda a cada noite.'

const HIDDEN: Record<string, Hidden> = {
  pinhal: { spot: 'pinhal', hint: 'Um arco ficou pendurado num galho da clareira onde os veados pastam, no fundo do Pinhal dos Caçadores.' },
  lagoa: { spot: 'lagoa-escura', hint: 'Na margem norte da Lagoa Escura, além dos Campos do Sul, um rastro azulado na lama não seca nunca.' },
  circulo: { spot: 'circulo', hint: 'Sobre a laje no meio do Círculo de Pedras, no Alto do Bosque, alguém deixou uma tiara que não brilha.' },
  queimada: { spot: 'queimada', hint: 'Algo pesado pousou na Clareira Queimada, além do Mirante. Entre as marcas no chão, uma esfera escura ainda flutua.' },
}

function origin(where: Where): SecretOrigin | undefined {
  if (typeof where === 'number') return undefined
  if (where === 'vendor') return { kind: 'vendor', hint: VENDOR_HINT }
  if (typeof where === 'object') return { kind: 'hidden', spot: where.spot, hint: where.hint }
  return { kind: 'camp', camp: where, hint: CAMP_HINTS[where] }
}

function build(slot: Slot, layer: Layer | ((id: string) => Layer), rows: readonly Row[]): Part[] {
  return rows.map(([id, name, description, price, where, stats, speed]) => ({
    id,
    slot,
    name,
    description,
    price,
    stats,
    layer: typeof layer === 'function' ? layer(id) : layer,
    ...(typeof where === 'number' ? { tier: where } : {}),
    ...(speed !== undefined ? { speed } : {}),
    ...(origin(where) ? { secret: origin(where) } : {}),
  }))
}

const HELMETS: readonly Row[] = [
  ['helmet-moss-hood', 'Capuz de musgo', 'Um capuz fofo de musgo vivo colhido nas pedras do bosque. Abafa o barulho da cabeça e segura a chuva fina.', 320, 1, { defense: 1, energy: 1 }],
  ['helmet-acorn', 'Capacete de bolota', 'A cúpula de uma bolota gigante do bosque, lixada por dentro. Dura como madeira velha e cheira a outono.', 360, 1, { defense: 2 }],
  ['helmet-mushroom', 'Chapéu-cogumelo', 'Um cogumelo de aba larga que ainda está vivo. As pintas brilham fraco no escuro e dão um pingo de energia.', 640, 2, { energy: 2, defense: 1 }],
  ['helmet-ranger', 'Chapéu de guarda-florestal', 'Aba reta, copa amassada e um cordão de couro. Quem usa anda com passo de quem conhece cada trilha.', 700, 2, { speed: 2, defense: 1 }],
  ['helmet-riverstone', 'Capacete de seixo', 'Um seixo liso do riacho, oco, com a marca da água. Golpe escorrega nele como a correnteza.', 980, 3, { defense: 3 }],
  ['helmet-pinecone', 'Elmo de pinha', 'Escamas de pinha sobrepostas em camadas. Cada escama absorve um pouco do impacto e devolve o resto.', 1150, 3, { defense: 2, attack: 1, energy: 1 }],
  ['helmet-firewatch', 'Capacete de vigia', 'O capacete vermelho dos vigias de incêndio, com a lanterna de latão no topo. Vê longe e não apaga.', 1500, 4, { energy: 3, defense: 1 }],
  ['helmet-headphones', 'Fones do locutor', 'Os fones do locutor da Liga. Ouve a multidão, o sino e o inimigo chegando antes de aparecer.', 1700, 4, { speed: 2, energy: 2 }],
  ['helmet-bark', 'Elmo de casca', 'Um pedaço inteiro de casca de carvalho, com o nó e tudo. Pesado, mas nada passa por ele.', 2300, 'lenhadores', { defense: 4, speed: -1, attack: 1 }],
  ['helmet-welder', 'Máscara de solda', 'Máscara de solda da serraria, viseira escura que abaixa na hora do golpe. Protege da faísca e do medo.', 2600, 5, { defense: 3, attack: 2 }],
  ['helmet-fox', 'Capuz de raposa', 'Capuz ruivo com orelhas pontudas e queixo branco. Esperto, rápido e nunca entra na mesma armadilha duas vezes.', 3400, 6, { speed: 3, attack: 2 }],
  ['helmet-stag-skull', 'Crânio de cervo', 'Um crânio branco de cervo com a galhada inteira, achado no bosque fundo. Os outros robôs recuam.', 3800, 6, { attack: 4, defense: 2 }],
  ['helmet-beekeeper', 'Véu de apicultor', 'Capacete branco com véu até os ombros. Nenhuma ferroada passa, nenhum golpe baixo também.', 4300, 'eremita', { defense: 4, energy: 2 }],
  ['helmet-top-hat', 'Cartola do mestre de cerimônias', 'A cartola de seda de quem apresenta as lutas. Alta, elegante e cheia de truques escondidos no forro.', 4800, 7, { attack: 2, energy: 3, speed: 1 }],
  ['helmet-boxer-guard', 'Protetor de ringue', 'Protetor acolchoado de treino, grosso nas bochechas. Feito para apanhar a noite inteira e continuar de pé.', 5400, 8, { defense: 5, speed: 1 }],
  ['helmet-lantern-crown', 'Coroa de lanternas', 'Uma argola de lanterninhas de papel do Mercado. Cada uma guarda uma chama que alimenta o núcleo.', 6000, 8, { energy: 5, defense: 1 }],
  ['helmet-wolf', 'Máscara de lobo', 'Pele de lobo com as orelhas em pé e o focinho sobre a testa. O robô que a usa ataca primeiro e pergunta depois.', 6800, 'cacadores', { attack: 5, speed: 2 }],
  ['helmet-comet-tail', 'Elmo cauda de cometa', 'Capacete liso e baixo com uma cauda de faíscas que não apaga. Corta o ar como a pedra que caiu do céu.', 7600, 9, { speed: 4, attack: 2, energy: 1 }],
  ['helmet-seed-crown', 'Coroa da Semente', 'Cinco cascas de semente abertas em volta de um núcleo que pulsa. Lembra o Coração no fundo da cratera.', 9000, 10, { attack: 3, defense: 3, energy: 3 }],
  ['helmet-league-mask', 'Máscara da Liga', 'Máscara de lutador com chamas em volta dos olhos. Na Liga ninguém usa o nome de verdade, muito menos o rosto.', 2400, 'vendor', { attack: 3, defense: 2 }],
  ['helmet-bookie-visor', 'Viseira de apostador', 'Viseira verde e lápis atrás da orelha. Quem a usa calcula o golpe antes de ele sair.', 2900, 'vendor', { speed: 2, energy: 2, attack: 1 }],
  ['helmet-neon-cap', 'Boné neon', 'Boné virado para trás com uma faixa de neon que nunca apaga. É o uniforme não oficial da Liga.', 1900, 'vendor', { speed: 3, energy: 1 }],
  ['helmet-dark-crystal', 'Tiara do cristal apagado', 'Uma tiara com um cristal que não brilha. Igual ao dos robôs dos Forasteiros. Frio ao toque, mesmo ao sol.', 5200, HIDDEN.circulo, { attack: 4, energy: -1, defense: 3 }],
  ['helmet-visitor-veil', 'Véu dos Forasteiros', 'O capuz alto e liso que os Forasteiros usam por baixo do disfarce. Esconde tudo, até o que não deveria existir.', 7200, 'forasteiros', { defense: 4, speed: 2, energy: 2 }],
  ['helmet-ozone-dome', 'Redoma de ozônio', 'Uma redoma de vidro selada com ar de outro mundo. Cheira a tempestade e deixa o robô leve e alerta.', 7800, 'forasteiros', { energy: 4, speed: 3, defense: 1 }],
]

const WEAPONS: readonly Row[] = [
  ['weapon-branch-club', 'Clava de galho', 'Um galho torto de carvalho, nodoso e pesado na ponta. A arma mais velha do mundo ainda funciona.', 300, 1, { attack: 2 }],
  ['weapon-torch', 'Tocha de acampamento', 'Trapo encharcado de piche amarrado num cabo. Ilumina a trilha e assusta quem vem do escuro.', 380, 1, { attack: 1, energy: 2 }],
  ['weapon-spear', 'Lança de caçador', 'Lança de caça com ponta de ferro amarrada em corda. Alcança longe e acerta antes de ser acertada.', 620, 'cacadores', { attack: 3, speed: 1 }],
  ['weapon-net', 'Rede de caçador', 'Um aro de madeira com rede de corda. Não machuca muito, mas quem cai nela demora a sair.', 700, 2, { attack: 1, defense: 2, speed: 1 }],
  ['weapon-machete', 'Facão de mato', 'Lâmina larga que abre caminho na mata fechada. Cada golpe tira um pedaço do que estiver na frente.', 1000, 3, { attack: 4 }],
  ['weapon-fishing-rod', 'Vara de pesca', 'Vara comprida com molinete e uma isca que brilha. Fisga de longe e puxa para perto do golpe.', 1100, 3, { attack: 2, speed: 2, energy: 1 }],
  ['weapon-pitchfork', 'Forcado dos Campos', 'Três dentes de ferro num cabo de freixo. Vira feno e vira robô com a mesma facilidade.', 1550, 4, { attack: 4, defense: 1 }],
  ['weapon-boomerang', 'Bumerangue de lei', 'Uma asa de madeira polida que sempre volta. Acerta na ida, acerta na volta e ainda volta para a mão.', 1750, 4, { attack: 3, speed: 3 }],
  ['weapon-mallet', 'Malho de lenhador', 'Cabeça de madeira maciça com anéis de ferro. Lento para erguer, impossível de ignorar quando desce.', 2250, 5, { attack: 6, speed: -1 }],
  ['weapon-shears', 'Tesourão de jardim', 'Tesoura de poda com lâminas compridas. Abre, fecha e o que estava no meio não está mais inteiro.', 2700, 'eremita', { attack: 4, defense: 2 }],
  ['weapon-hook', 'Gancho de serraria', 'O gancho curvo que vira toras na serraria. Prende, puxa e derruba robô maior do que ele.', 3500, 'lenhadores', { attack: 5, defense: 2 }],
  ['weapon-paddle-blade', 'Remo-lâmina', 'Um remo da Vila do Riacho com a borda afiada em latão. Rema no ar e corta na volta.', 3900, 6, { attack: 4, speed: 3 }],
  ['weapon-megaphone', 'Megafone do locutor', 'O megafone que anuncia as lutas da Liga. No volume máximo, o som derruba antes do soco.', 4400, 7, { attack: 3, energy: 4 }],
  ['weapon-crystal-prod', 'Aguilhão de cristal', 'Uma lasca de cristal na ponta de um bastão isolado. Cada toque solta um arco de luz.', 4900, 7, { attack: 5, energy: 3 }],
  ['weapon-buckler', 'Broquel de latão', 'Um escudo redondo de latão preso ao punho. Apara o golpe e devolve com a borda.', 5500, 8, { attack: 2, defense: 6 }],
  ['weapon-nail-gun', 'Pistola de pregos', 'Pistola pneumática da serraria, mangueira e tudo. Prega o adversário no lugar, um prego por vez.', 6200, 8, { attack: 6, speed: 2 }],
  ['weapon-chain', 'Corrente do ringue', 'A corrente que cercava o ringue velho da arena, com um peso na ponta. Alcança onde a mão não chega.', 7000, 9, { attack: 6, speed: 3 }],
  ['weapon-gravity-orb', 'Orbe de gravidade', 'Uma esfera escura que flutua sobre o berço e puxa tudo em volta. O golpe vem de onde ninguém espera.', 7800, 9, { attack: 5, energy: 3, defense: 2 }],
  ['weapon-seed-lance', 'Lança da Semente', 'Uma casca de semente aberta em volta de um núcleo que pulsa, montada num cabo. Parece viva porque é.', 9200, 10, { attack: 7, energy: 3 }],
  ['weapon-bow', 'Arco de teixo', 'Arco longo de teixo, cordas de tendão. Silencioso, preciso e proibido na arena da prefeitura.', 2600, HIDDEN.pinhal, { attack: 4, speed: 2 }],
  ['weapon-bat', 'Taco do apostador', 'Taco de madeira com fita no cabo e pregos no corpo. Usado para cobrar dívidas; agora cobra golpes.', 2200, 'vendor', { attack: 5 }],
  ['weapon-bottle', 'Garrafa do Tião', 'Uma garrafa grossa de vidro com a boca quebrada. Tião jura que não é dele. É.', 1500, 'vendor', { attack: 3, speed: 2 }],
  ['weapon-dart-gun', 'Dardos do apostador', 'Lançador de dardos de bolso com dois dardos reservas. Mira certa e sem barulho.', 3300, 'vendor', { attack: 4, speed: 3, defense: -1 }],
  ['weapon-visitor-staff', 'Cajado dos Forasteiros', 'Vara preta com uma forquilha que segura uma pedra escura flutuando. Não obedece a quem a segura; obedece a quem a entende.', 7400, 'forasteiros', { attack: 6, energy: 4, defense: -1 }],
  ['weapon-ozone-blade', 'Lâmina de ozônio', 'Uma lâmina feita de ar ionizado: só o fio aparece. Corta sem tocar e cheira a tempestade.', 8200, 'forasteiros', { attack: 7, speed: 3, defense: -1 }],
]

const MOBILITY: readonly Row[] = [
  ['move-moss-boots', 'Botas de musgo', 'Botas forradas de musgo macio. Não fazem barulho e cada passo parece pisar em travesseiro.', 300, 'eremita', { speed: 1, defense: 1 }, 1.03],
  ['move-leaf-shoes', 'Raquetes de folhas', 'Raquetes trançadas com folhas largas. Flutuam sobre a lama do bosque sem afundar.', 360, 1, { speed: 2 }, 1.05],
  ['move-bark-boots', 'Botas de casca', 'Botas feitas de casca de árvore inteira. Pesadas no começo; depois o robô para de sentir pedra.', 620, 2, { defense: 3, speed: -1 }, 0.97],
  ['move-vine-wraps', 'Enfaixes de cipó', 'Cipós verdes enrolados nos pés que seguram firme no chão. Quem tenta derrubar o robô acaba derrubado.', 700, 2, { defense: 2, speed: 1 }, 1.02],
  ['move-deer-hooves', 'Cascos de cervo', 'Cascos de cervo em pernas finas e rápidas. Saltam raiz, tronco e golpe baixo.', 1000, 3, { speed: 3 }, 1.1],
  ['move-stone-feet', 'Pés de seixo', 'Dois seixos lisos do riacho no lugar dos pés. Não escorregam nem na pedra molhada.', 1150, 3, { defense: 3, energy: 1 }, 0.98],
  ['move-waders', 'Galochas de pescador', 'Botas altas e amarelas até a cintura. Atravessam o riacho, o canal e qualquer poça de óleo do ringue.', 1500, 4, { defense: 2, speed: 2 }, 1.04],
  ['move-log-rollers', 'Rolos de tora', 'Uma prancha sobre duas toras que rolam. Lento para virar, rápido em linha reta.', 1700, 'lenhadores', { speed: 3, defense: 1 }, 1.08],
  ['move-tractor-treads', 'Esteiras de trator', 'Esteiras de trator dos Campos do Sul. Passam por cima de tudo e não param em lama nenhuma.', 2300, 5, { defense: 4, attack: 1, speed: -1 }, 0.95],
  ['move-raft-floats', 'Boias de jangada', 'Uma jangada pequena com boias de barril. Balança, flutua e deixa o golpe passar por baixo.', 2600, 5, { defense: 2, energy: 2, speed: 1 }, 1.03],
  ['move-mushroom-pads', 'Almofadas de cogumelo', 'Dois cogumelos elásticos sob os pés. Cada passo afunda e devolve com um pulo.', 3400, 6, { speed: 3, energy: 2 }, 1.12],
  ['move-wolf-paws', 'Patas de lobo', 'Patas com garras e almofadas grossas. Correm como matilha e não fazem barulho na folha seca.', 3800, 'cacadores', { speed: 3, attack: 2 }, 1.12],
  ['move-kangaroo', 'Pernas de canguru', 'Molas grossas que se comprimem e soltam. O robô não anda: ele pula, e cada pulo é um golpe.', 4300, 7, { attack: 3, speed: 3 }, 1.1],
  ['move-caster-wheels', 'Rodízios do bar', 'Rodízios tirados dos banquinhos do Bar do Tião. Deslizam para qualquer lado sem avisar.', 4800, 7, { speed: 4, defense: 1 }, 1.15],
  ['move-centipede', 'Patas de centopeia', 'Catorze patinhas que se movem em onda. Nunca estão todas no chão, nunca estão todas no ar.', 5400, 8, { speed: 3, defense: 3 }, 1.1],
  ['move-firefly-trail', 'Pegadas de vaga-lume', 'Botas que deixam um rastro de luzinhas verdes. Cada pegada devolve um pouco de energia ao núcleo.', 6000, 8, { energy: 4, speed: 2 }, 1.08],
  ['move-lantern-wheels', 'Rodas-lanterna', 'Duas rodas de lanterna de papel do Mercado, acesas por dentro. Rolam leves e iluminam o caminho.', 6800, 9, { speed: 4, energy: 3 }, 1.15],
  ['move-slug-trail', 'Rastro de lesma', 'Um pé único e macio que desliza sobre um rastro brilhante. Esquisito, rápido e impossível de derrubar.', 7600, 9, { speed: 3, defense: 4 }, 1.1],
  ['move-seed-roots', 'Raízes da Semente', 'Raízes vivas que se cravam no chão a cada passo e pulsam como o Coração. O robô não sai do lugar se não quiser.', 9000, 10, { defense: 5, attack: 2, energy: 3 }, 1.05],
  ['move-boxing-boots', 'Botas de ringue', 'Botas brancas de cano alto, amarradas até o joelho. Dançam no ringue como ninguém.', 2500, 'vendor', { speed: 3, attack: 1 }, 1.1],
  ['move-neon-sneakers', 'Tênis neon', 'Tênis pretos com a sola que acende a cada passo. O chão da Liga vira pista de dança.', 2000, 'vendor', { speed: 3, energy: 1 }, 1.12],
  ['move-tap-shoes', 'Sapatos de sapateado', 'Os sapatos do mestre de cerimônias. Cada passo é um estalo e cada estalo distrai o adversário.', 3000, 'vendor', { speed: 2, attack: 2, energy: 1 }, 1.08],
  ['move-ozone-trail', 'Rastro de ozônio', 'Botas pretas que deixam um brilho azulado atrás. O ar fica fino e o robô, mais rápido do que deveria.', 5000, HIDDEN.lagoa, { speed: 5, defense: -1 }, 1.2],
  ['move-visitor-pods', 'Casulos dos Forasteiros', 'Dois casulos escuros que flutuam um palmo acima do chão. Não deixam pegada. Não deveriam existir.', 7400, 'forasteiros', { speed: 4, defense: 3 }, 1.18],
  ['move-antigrav', 'Discos antigravidade', 'Um disco liso que zumbe baixinho e levanta o robô do chão. Tecnologia que não é deste planeta.', 8400, 'forasteiros', { speed: 5, energy: 3 }, 1.22],
]

const MODULES: readonly Row[] = [
  ['module-bird-nest', 'Ninho no ombro', 'Um ninho de gravetos no ombro com dois filhotes que piam. Eles avisam quando o perigo chega por trás.', 320, 1, { defense: 1, energy: 1 }],
  ['module-camp-kettle', 'Chaleira de acampamento', 'Uma chaleira amassada pendurada no cinto, sempre fumegando. Esquenta o núcleo nas noites frias do bosque.', 380, 1, { energy: 2 }],
  ['module-bedroll', 'Saco de dormir', 'Um cobertor enrolado atrás dos ombros. Amortece o golpe que vem de trás e serve de cama na floresta.', 640, 2, { defense: 2, energy: 1 }],
  ['module-fishing-creel', 'Cesto de pesca', 'Cesto de vime na cintura com um peixe sempre tentando sair. Lastro leve que ajuda no equilíbrio.', 700, 2, { defense: 2, speed: 1 }],
  ['module-quiver', 'Aljava de caçador', 'Aljava de couro com flechas emplumadas. Mesmo sem arco, uma flecha na mão resolve muita coisa.', 1000, 'cacadores', { attack: 3 }],
  ['module-mushroom-cluster', 'Cogumelos nas costas', 'Um cacho de cogumelos que brotou na placa das costas e nunca mais saiu. Brilham e alimentam o núcleo.', 1150, 3, { energy: 3, defense: 1 }],
  ['module-squirrel', 'Esquilo companheiro', 'Um esquilo que decidiu morar no ombro do robô. Rápido, nervoso e morde quem chega perto demais.', 1500, 4, { speed: 2, attack: 2 }],
  ['module-log-pack', 'Mochila de toras', 'Três toras de lenha num quadro de carga. Pesa, protege as costas e ainda serve de arma.', 1750, 'lenhadores', { defense: 4, speed: -1, attack: 1 }],
  ['module-hay-pack', 'Fardo de feno', 'Um fardo de feno amarrado nas costas. Macio por fora, surpreendentemente duro de atravessar.', 2250, 5, { defense: 3, energy: 2 }],
  ['module-crow', 'Corvo no ombro', 'Um corvo preto que não vai embora. Grasna antes do golpe inimigo e bica quem erra o alvo.', 2700, 5, { attack: 3, speed: 2 }],
  ['module-water-wheel', 'Roda d\u2019água', 'Uma roda de moinho pequena girando nas costas. Carrega o núcleo com o vento que o robô mesmo faz.', 3500, 6, { energy: 4, defense: 1 }],
  ['module-pinecone-bombs', 'Bandoleira de pinhas', 'Uma bandoleira cruzando o peito com pinhas secas. Estalam no fogo e estalam no inimigo.', 3900, 6, { attack: 4, speed: 1 }],
  ['module-fern-cloak', 'Capa de samambaia', 'Uma capa de folhas de samambaia que balança no vento. Na floresta o robô some; no ringue, confunde.', 4400, 'eremita', { defense: 3, speed: 3 }],
  ['module-moth-wings', 'Asas de mariposa', 'Asas empoeiradas de mariposa gigante com olhos desenhados. Batem devagar e levantam o robô um palmo.', 4900, 7, { speed: 3, energy: 3 }],
  ['module-speaker', 'Caixa de som', 'A caixa de som que anima a Liga. Cada batida sacode o adversário e empurra o robô para a frente.', 5500, 8, { attack: 4, energy: 3 }],
  ['module-ring-bell', 'Sino do ringue', 'O sino que abre e fecha as lutas, parafusado no ombro. Quando toca, o adversário hesita.', 6200, 8, { attack: 3, defense: 3, energy: 1 }],
  ['module-champion-belt', 'Cinturão de campeão', 'Um cinturão largo com placa de ouro. Não é só enfeite: o couro grosso aguenta golpe e o ouro impõe respeito.', 7000, 9, { defense: 4, attack: 3 }],
  ['module-bar-tap', 'Barril com torneira', 'Um barril pequeno do Bar do Tião com torneira de latão. O que sai dele não é para beber, é para carregar o núcleo.', 7800, 9, { energy: 5, defense: 2 }],
  ['module-seed-pod', 'Vagem da Semente', 'Uma vagem fechada que veio do fundo da cratera. As veias pulsam no ritmo do cristal no peito.', 9400, 10, { attack: 3, defense: 3, energy: 4 }],
  ['module-betting-board', 'Quadro de apostas', 'Uma lousa com as cotações da noite presa nas costas. Pesa pouco, protege muito e ninguém aposta contra.', 2400, 'vendor', { defense: 3, energy: 1 }],
  ['module-neon-sign', 'Letreiro neon', 'Uma seta de neon num poste acima da cabeça. Zumbe, pisca e aponta para o robô como alvo e como estrela.', 2800, 'vendor', { energy: 3, attack: 1 }],
  ['module-dark-orb', 'Orbe apagado', 'Uma esfera escura que flutua sobre o ombro, cercada de um halo frio. Puxa o golpe inimigo para longe do corpo.', 4200, HIDDEN.queimada, { defense: 4, speed: 1, energy: -1 }],
  ['module-crystal-cage', 'Gaiola de cristais', 'Uma gaiola de ferro cheia de cristais que ainda brilham. Não pergunte de onde vieram. O vendedor também não.', 5600, 'vendor', { energy: 5, attack: 2, defense: -1 }],
  ['module-ozone-tank', 'Tanques de ozônio', 'Dois cilindros selados com o ar que os Forasteiros respiram. Sibilam de vez em quando. Deixam o robô leve e frio.', 7400, 'forasteiros', { speed: 3, energy: 4 }],
  ['module-visitor-beacon', 'Farol dos Forasteiros', 'A torre preta que eles acendem no acampamento para falar com o céu. Uma luz sobe por ela devagar, sempre.', 8600, 'forasteiros', { energy: 4, attack: 3, defense: 2 }],
]

const FRONT_MODULES = new Set([
  'module-bird-nest',
  'module-squirrel',
  'module-camp-kettle',
  'module-fishing-creel',
  'module-crow',
  'module-champion-belt',
  'module-ring-bell',
  'module-dark-orb',
  'module-pinecone-bombs',
])

export const EXPANSION_2_PARTS: readonly Part[] = [
  ...build('helmet', 'front', HELMETS),
  ...build('weapon', 'front', WEAPONS),
  ...build('mobility', 'legs', MOBILITY),
  ...build('module', (id) => (FRONT_MODULES.has(id) ? 'front' : 'back'), MODULES),
]

export function campParts(camp: CampId): Part[] {
  return EXPANSION_2_PARTS.filter((part) => part.secret?.kind === 'camp' && part.secret.camp === camp).sort((a, b) => a.price - b.price)
}

const KEYS: readonly StatKey[] = ['attack', 'defense', 'speed', 'energy']

type Flavor = [id: string, name: string, description: string]

const FLAVORS: Record<Slot, Record<StatKey, [Flavor, Flavor]>> = {
  helmet: {
    attack: [
      ['crest', 'Crista afiada', 'Uma crista de latão no alto: o robô baixa a cabeça e investe com ela.'],
      ['glare', 'Olhar de caçador', 'Lentes estreitas no visor; o alvo entra em foco e o golpe sai mais certeiro.'],
    ],
    defense: [
      ['padding', 'Forro acolchoado', 'Uma camada a mais de forro entre a cabeça e o mundo.'],
      ['plate', 'Chapa escondida', 'Uma chapa fina costurada por dentro; para o que a forma não parava.'],
    ],
    speed: [
      ['vents', 'Aberturas de ar', 'Furos certos onde o vento entra: a cabeça esfria e o passo acelera.'],
      ['light', 'Casco aliviado', 'Metade do peso, a mesma proteção. O robô corre sem balançar a cabeça.'],
    ],
    energy: [
      ['coil', 'Bobina na copa', 'Uma bobina escondida na copa recolhe a estática do ar e devolve ao núcleo.'],
      ['lamp', 'Lâmpada de bosque', 'Uma lâmpada pequena acesa com seiva de Árvore-Lume; a célula dela sobra para o robô.'],
    ],
  },
  weapon: {
    attack: [
      ['edge', 'Fio novo', 'De volta à pedra de amolar: cada golpe entra mais fundo.'],
      ['weight', 'Peso na ponta', 'Um contrapeso de chumbo onde o golpe termina; a arma desce mais pesada.'],
    ],
    defense: [
      ['guard', 'Guarda-mão', 'Uma guarda de ferro acima do punho; apara o que vinha para os dedos.'],
      ['brace', 'Braçadeira', 'Uma braçadeira prende a arma ao antebraço: ela vira escudo quando precisa.'],
    ],
    speed: [
      ['grip', 'Empunhadura de couro', 'Couro macio e seco no cabo; a arma responde no instante em que a mão pensa.'],
      ['balance', 'Equilíbrio refeito', 'O peso volta para o punho e a arma gira como se fosse parte do braço.'],
    ],
    energy: [
      ['shard', 'Lasca de cristal', 'Uma lasca de cristal da praça encaixada no cabo pinga energia a cada golpe.'],
      ['wire', 'Fio condutor', 'Um fio de cobre corre do cabo ao núcleo: o impacto vira carga.'],
    ],
  },
  mobility: {
    attack: [
      ['spikes', 'Cravos', 'Cravos curtos na sola: cada pisada é um golpe a mais.'],
      ['kick', 'Ponteira de aço', 'Ponteira de aço na frente; o chute do robô passa a contar.'],
    ],
    defense: [
      ['shin', 'Caneleiras', 'Caneleiras de couro grosso por cima: o golpe baixo não derruba mais.'],
      ['sole', 'Sola reforçada', 'Sola dupla e costura nova; o robô aguenta firme onde pisa.'],
    ],
    speed: [
      ['stride', 'Passo longo', 'Articulação solta e passo mais comprido; o robô cobre mais chão por segundo.'],
      ['lace', 'Amarração justa', 'Tudo preso e justo: nada balança e nada atrasa.'],
    ],
    energy: [
      ['dynamo', 'Dínamo no calcanhar', 'Um dínamo pequeno gira a cada passo e alimenta o núcleo.'],
      ['spring', 'Mola de retorno', 'A mola guarda o impulso da pisada e devolve como carga.'],
    ],
  },
  module: {
    attack: [
      ['barbs', 'Farpas', 'Farpas curtas na borda: quem encosta no módulo sai arranhado.'],
      ['aim', 'Mira auxiliar', 'O módulo observa e corrige: o braço do robô acerta mais.'],
    ],
    defense: [
      ['shell', 'Casco externo', 'Um casco de chapa por fora do módulo; protege ele e as costas do robô.'],
      ['mount', 'Suporte firme', 'Suporte novo e parafusos grossos: o módulo não solta nem com golpe.'],
    ],
    speed: [
      ['trim', 'Peso cortado', 'Tudo que não era essencial saiu; o robô anda mais leve.'],
      ['fins', 'Aletas', 'Aletas finas cortam o ar e o robô ganha passo.'],
    ],
    energy: [
      ['cell', 'Célula extra', 'Uma célula a mais presa ao módulo, ligada direto ao núcleo.'],
      ['tap', 'Derivação', 'Um fio puxado do módulo para o núcleo; nada se perde.'],
    ],
  },
}

function upgradeRows(part: Part): UpgradeRow[] {
  const ranked = KEYS.map((key) => [key, part.stats[key] ?? 0] as const)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key)
  const picks: StatKey[] = ranked.length >= 2 ? ranked.slice(0, 2) : [ranked[0] ?? 'defense', ranked[0] === 'energy' ? 'defense' : 'energy']
  const seed = part.id.length
  return picks.map((key, index) => {
    const [id, name, description] = FLAVORS[part.slot][key][(seed + index) % 2]
    if (part.slot === 'mobility' && key === 'speed') return [id, name, description, { walk: 0.04 }, 3]
    return [id, name, description, { [key]: 1 }]
  })
}

export const EXPANSION_2_UPGRADES: Record<string, UpgradeRow[]> = Object.fromEntries(EXPANSION_2_PARTS.map((part) => [part.id, upgradeRows(part)]))
