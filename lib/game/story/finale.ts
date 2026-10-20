import { GAME_TITLE } from '../brand'
import type { Mission } from '../missions/data'
import type { TalkPage } from '../npcs/dialogue'
import type { Progress } from '../robot/progress'

export const FINALE_LEVEL = 40
export const FINALE_TITLE = 'Ato Final · A Colheita'

export type Voice = { name: string; kicker: string; portrait: HTMLCanvasElement | HTMLImageElement | null }

export type FinaleVoices = Record<'tiao' | 'forasteira' | 'alto' | 'baixo' | 'robot' | 'radio' | 'scene', Voice>

export type UnmaskShots = { ring(): void; table(): void; door(): void; robot(): void }

export function finaleReady(progress: Progress, mission: Mission): boolean {
  return progress.story.finale === 'none' && mission.kind === 'main' && progress.missions.main >= FINALE_LEVEL
}

function line(voice: Voice, text: string, extra: Partial<TalkPage> = {}): TalkPage {
  return { text, name: voice.name, kicker: voice.kicker, portrait: voice.portrait, ...extra }
}

export function unmaskedPages(options: { herald: boolean; overheard: boolean; voices: FinaleVoices; shots: UnmaskShots }): TalkPage[] {
  const { voices, shots } = options
  return [
    line(
      voices.scene,
      options.herald
        ? 'O Arauto das Estrelas cai de joelhos no centro do ringue e se desfaz num pó violeta que sobe pelos holofotes. A arquibancada demora a entender. Depois, explode.'
        : 'O sino ainda vibra quando todas as lâmpadas da Liga piscam ao mesmo tempo. Lá no canto, uma cadeira arrasta no chão.',
      { onShow: shots.ring },
    ),
    line(voices.tiao, 'Piloto. Não olha agora. A mesa do canto levantou inteira.', { onShow: shots.table }),
    line(
      voices.forasteira,
      options.overheard
        ? 'O bilhete no ringue. O acampamento revirado. E agora isso. Você ouviu tudo naquela noite, não ouviu, piloto do B-01?'
        : 'Bilhetes que somem. Um acampamento revirado. Você não luta por fichas, piloto do B-01. Você luta contra nós.',
    ),
    line(voices.alto, 'Eu avisei. O cristal dele pulsa quando a gente fala. A máquina de brinquedo escuta e conta tudo para ele.'),
    line(
      voices.scene,
      'Por um instante, o rosto da forasteira falha como uma tela velha. Por baixo: pele violeta, olhos sem pupila. No salão cheio, ninguém mais parece ver.',
    ),
    line(voices.forasteira, 'Tanto faz. A semente já bebeu luz suficiente. Se ele sabe, a gente liga a Máquina hoje.'),
    line(voices.baixo, 'Hoje? As peças ainda estão abertas na mata. Se ele achar uma...'),
    line(voices.forasteira, 'Que ache. Ninguém quebra nove antes do fim da Colheita.', { onShow: shots.door }),
    line(voices.scene, 'Os três saem pela porta vermelha sem pressa. As lâmpadas da Liga zumbem e escurecem quando eles passam, uma por uma.'),
    line(voices.robot, 'Bip... bip-bip. O cristal no peito do B-01 acende sozinho, num ritmo que não é o dele. Ele está ouvindo alguma coisa.', { onShow: shots.robot }),
    line(voices.radio, '...as nove peças da Máquina estão plantadas nas clareiras da mata. Cada uma bate como um coração nosso. Enquanto baterem, nós respiramos este ar. E a semente bebe.'),
    line(voices.radio, 'Quando a Colheita terminar, a torre puxa a luz de todo cristal de Bosque Alto de uma vez. Robô por robô. Casa por casa.'),
    line(voices.radio, 'E o do B-01? ... O dele primeiro.'),
    line(
      voices.scene,
      'Nove peças, nove corações. É deles que os Visitantes vivem, e é deles que a Máquina da torre se alimenta. Cada um tem guarda. Quebre os nove antes do fim da Colheita, ou Bosque Alto apaga, e o B-01 junto.',
      { kicker: 'Decisão' },
    ),
  ]
}

export const HARVEST_CARD = {
  kicker: FINALE_TITLE,
  title: 'A Colheita começou',
  text: 'As nove peças da Máquina batem nas clareiras da floresta: são os corações dos Visitantes. Derrube os guardas de cada uma e quebre o coração antes que o relógio chegue a zero.',
}

export const HARVEST_LINES = {
  tower: { kicker: 'Fundo do Bosque', title: 'A Máquina acorda' },
  crater: { kicker: 'A cratera', title: 'A semente começa a beber' },
  town: { kicker: 'Bosque Alto', title: 'As luzes da cidade tremem' },
}

export const GAME_OVER = {
  kicker: FINALE_TITLE,
  title: 'A Colheita',
  line: 'A luz de Bosque Alto se apagou.',
  text: 'Os corações bateram até o fim. A Máquina puxou a luz de cada cristal da cidade, e o do B-01 foi o último a apagar.',
}

export const HEART_LINES = {
  sensed: 'Um coração bate atrás das árvores',
  guards: 'Guardas do Coração',
  guardsSub: 'Visitantes de pé em volta do coração',
  fight: 'Derrube os guardas',
  exposed: 'O escudo caiu. O coração está exposto.',
  broken: 'Coração quebrado',
  outro: 'Os guardas viraram poeira violeta e o escudo estalou. O coração bate exposto no meio da clareira: quebre antes do fim da Colheita.',
}

export const ENDING_LINES = {
  forasteira: 'Nove... Ele achou os nove.',
  alto: 'Então era isso que a semente queria. Que alguém ficasse.',
  baixo: 'Está frio. É assim que este mundo é sem os corações?',
  forasteiraLast: 'Cuide dela, piloto. Ela nunca foi nossa.',
  robot: 'Bip. Bip-bip.',
}

export const ENDING_CAPTIONS = {
  hearts: { kicker: 'Fundo do Bosque', title: 'O último coração para de bater' },
  tower: { kicker: 'A torre', title: 'A Máquina se cala' },
  crater: { kicker: 'A cratera', title: 'A semente, enfim livre' },
  dawn: { kicker: 'Na manhã seguinte', title: 'Bosque Alto acorda com duas Árvores-Lume' },
}

export type CreditSection = {
  title: string
  lines?: readonly (readonly [string, string])[]
  notes?: readonly string[]
  people?: readonly (readonly [string, string])[]
  stanzas?: readonly (readonly string[])[]
  closing?: string
  paragraphs?: readonly string[]
  plate?: { src: string; alt: string; width: number; height: number }
}

export const CREDITS: readonly CreditSection[] = [
  {
    title: 'Canção do Ferro',
    stanzas: [
      ['Rasgou a noite uma estrela ferida,', 'caiu na mata e incendiou o chão;', 'trouxe três sombras sem casa e sem guarida', 'e uma semente com fome de clarão.'],
      ['No pátio, um cristal acendeu sozinho', 'num peito de sucata e de ferrugem;', 'errou a guarda, errou o caminho,', 'e levantou quando as faíscas rugem.'],
      ['Na Liga, as cordas gritaram seu nome;', 'na garagem, três irmãos lhe deram garra;', 'cada vitória era pão contra a fome', 'da Máquina que a velha torre amarra.'],
      ['Veio a Colheita com seu relógio frio,', 'nove corações batendo na clareira;', 'um a um se calaram no desafio,', 'e a torre perdeu a voz inteira.'],
      ['Quando a manhã subiu sobre o telhado,', 'duas Árvores-Lume tomaram o lugar;', 'e o ferro, que era só ferro forjado,', 'amanheceu sabendo como é sonhar.'],
    ],
    closing: 'Ninguém vence sozinho uma batalha de ferro.',
  },
  {
    title: 'Na manhã seguinte, no alto do ferro-velho',
    plate: {
      src: 'assets/ui/credits/plate.webp',
      alt: 'Sid, Charles e James no alto do ferro-velho ao lado do B-01, enquanto o sol nasce sobre Bosque Alto e as duas Árvores-Lume',
      width: 1024,
      height: 576,
    },
  },
  {
    title: 'A história',
    paragraphs: [
      'Numa noite sem lua, um meteoro rasgou o céu e caiu na floresta de Bosque Alto. Do fogo saíram três forasteiros que não eram deste mundo. No pátio de uma casa simples, um cristal acendeu no peito de um robô de sucata: o B-01.',
      'Entre as cordas da Liga de Robôs, as bancadas da Oficina do Cristal e a Mecânica dos irmãos Sid, Charles e James, piloto e máquina aprenderam a lutar juntos. Cada vitória pagou uma peça. Cada derrota ensinou um golpe.',
      'Mas os Visitantes tinham plantado uma semente. Na torre, a Máquina bebia a luz dos cristais da cidade, alimentada por nove corações escondidos nas clareiras da mata. Quando a Colheita começou, restava uma única saída: quebrar os nove antes do fim.',
      'O último coração parou de bater, a torre se calou e a semente, enfim livre, voltou a ser só uma semente. Na manhã seguinte, Bosque Alto acordou com duas Árvores-Lume e com um robô que já não era apenas ferro.',
    ],
  },
  { title: 'Direção', people: [['Diretor do jogo', 'Kaio']] },
  {
    title: 'Programação',
    people: [
      ['Programador principal', 'Pedro'],
      ['Programador ajudante', 'Jurisvaldo'],
    ],
  },
  { title: 'Testes', people: [['GameTest', 'Anônimo']] },
  { title: 'Roteiro', people: [['Roteirista', 'Requiem']] },
  {
    title: 'Arte 2D',
    people: [
      ['Artístico 2D', 'Shocker'],
      ['Fonte das artes 2D principais', 'IA Generativa Nano Banana'],
    ],
  },
  { title: 'Agradecimentos', notes: ['A você, que lutou até o amanhecer.'] },
]

export const CREDITS_CLOSING = {
  kicker: 'Fim do Ato Final',
  lead: GAME_TITLE,
  tagline: 'Uma cidade, um robô de ferro e uma semente que caiu do céu.',
  thanks: 'Obrigado por jogar',
  end: 'Fim',
}

export const AFTERMATH = {
  kicker: 'Bosque Alto',
  name: 'A cidade amanheceu salva',
  hint: 'A Liga reabriu as portas: a trilha dos campeões continua até o nível 100',
}
