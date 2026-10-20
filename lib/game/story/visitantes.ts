import type { Mission } from '../missions/data'
import type { TalkPage } from '../npcs/dialogue'
import type { Progress } from '../robot/progress'

export const OVERHEAR_VISIT = 3

export const VISITANTES_TITLE = 'Os Visitantes'

export const OVERHEARD: readonly TalkPage[] = [
  { text: 'Você se encosta na pilastra, meio escondido pela mesa dos apostadores. As vozes do canto baixam. Não o bastante.', kicker: 'Mesa do canto' },
  { text: 'O Coração não saiu. Três ciclos cavando e a pedra continua presa no fundo da cratera. Os humanos já cercaram tudo de lanterna.', kicker: 'O forasteiro alto' },
  {
    text: 'Porque não é pedra. É semente. Precisa de carga para soltar, e a carga está aqui, andando por aí no peito dessas máquinas de brinquedo.',
    kicker: 'A forasteira de óculos',
  },
  { text: 'Então colecionamos. Um cristal por noite. O ringue entrega os perdedores de bandeja e eles ainda aplaudem.', kicker: 'O forasteiro baixo' },
  { text: 'Humilhar primeiro, colher depois. Quando o Coração acordar, nenhuma frota deste braço da galáxia terá tecnologia igual. Nem a nossa.', kicker: 'A forasteira de óculos' },
  { text: 'O robô deles, o do cristal apagado, vira a cabeça devagar na sua direção. Você prende a respiração.', kicker: 'Mesa do canto' },
  { text: 'Mais baixo. O piloto do B-01 está perto.', kicker: 'O forasteiro alto' },
  {
    text: 'Você se afasta sem pressa, como quem procura o banheiro. O cristal no peito do seu robô pulsa, como se também tivesse ouvido. Decidido: cada luta da trilha, de agora em diante, é contra eles.',
    kicker: 'Decisão',
  },
]

export type Beat = {
  id: string
  speaker: 'tiao' | 'forasteira' | 'robot' | 'note'
  pages: readonly TalkPage[]

  toast?: { kicker: string; name: string }
}

const BEATS: readonly (Beat & { wins: number })[] = [
  {
    id: 'first-blood',
    wins: 1,
    speaker: 'tiao',
    pages: [
      { text: 'Você derrubou um deles. Repara: ninguém da mesa do canto aplaudiu.', kicker: 'Tião, do balcão' },
      { text: 'Eles pagam bem a quem perde para os robôs deles. A quem ganha... eu nunca vi pagarem nada. Cuida desse cristal.', kicker: 'Tião, do balcão' },
    ],
    toast: { kicker: VISITANTES_TITLE, name: 'Primeiro sangue' },
  },
  {
    id: 'note',
    wins: 3,
    speaker: 'note',
    pages: [
      { text: 'No ringue, preso na perna do robô derrotado, um papel dobrado. A letra é toda em ângulos retos.', kicker: 'Bilhete' },
      { text: '"Ponto de coleta: além do Mirante, onde as árvores abrem. Sete cristais até a próxima lua. Não deixem o garoto do B-01 ganhar de novo."', kicker: 'Bilhete' },
    ],
    toast: { kicker: VISITANTES_TITLE, name: 'Um acampamento na floresta' },
  },
  {
    id: 'warning',
    wins: 6,
    speaker: 'forasteira',
    pages: [
      { text: 'Você luta bem, piloto. Pena que luta do lado errado da história.', kicker: 'A forasteira de óculos' },
      { text: 'Ela encosta um dedo frio no cristal do seu robô. "Isto não é seu. É empréstimo. E empréstimo se cobra."', kicker: 'A forasteira de óculos' },
      { text: 'O B-01 dá um passo à frente. Ela sorri, sem mostrar os dentes, e volta para o canto.', kicker: 'Ringue Principal' },
    ],
    toast: { kicker: VISITANTES_TITLE, name: 'A cobrança' },
  },
  {
    id: 'empty-table',
    wins: 10,
    speaker: 'tiao',
    pages: [
      { text: 'A mesa do canto esvaziou no meio da luta. Deixaram as fichas e tudo.', kicker: 'Tião, do balcão' },
      { text: 'Minha prima viu luzes roxas subindo da floresta, para além do Mirante. Se eu fosse você, dava uma olhada. Com o robô carregado.', kicker: 'Tião, do balcão' },
    ],
    toast: { kicker: VISITANTES_TITLE, name: 'Luzes na floresta' },
  },
  {
    id: 'heart',
    wins: 16,
    speaker: 'robot',
    pages: [
      { text: 'Depois do sino, o cristal do B-01 não para de pulsar. Ele olha para a porta, para o lado da cratera, e volta a olhar para você.', kicker: 'B-01' },
      { text: 'Bip. Bip-bip. Pela primeira vez, parece uma pergunta: e quando o Coração acordar?', kicker: 'B-01' },
    ],
    toast: { kicker: VISITANTES_TITLE, name: 'O Coração' },
  },
]

export function beatAfterWin(progress: Progress, mission: Mission): Beat | null {
  const { story } = progress
  if (!story.overheard || mission.kind !== 'main') return null
  for (const beat of BEATS) {
    if (story.winsSince >= beat.wins && !story.beats.includes(beat.id)) return beat
  }
  return null
}

export function markBeat(progress: Progress, beat: Beat) {
  if (!progress.story.beats.includes(beat.id)) progress.story.beats.push(beat.id)
}

export function bartenderPages(progress: Progress, ask: () => void): TalkPage[] {
  const { story } = progress
  if (story.finale === 'won') {
    return [
      { text: 'Você viu o céu naquela noite? A cidade inteira acordou com luz nova no peito dos robôs. E a mesa do canto continua vazia.', kicker: 'Tião' },
      { text: 'Dizem que nasceu uma árvore de luz dentro da cratera. Eu digo que foi você. A primeira rodada é por conta da casa, piloto.' },
    ]
  }
  if (!story.overheard) {
    if (story.visits <= 1) {
      return [
        { text: 'Bem-vindo à Liga, piloto. Aqui embaixo ninguém usa o nome de verdade e ninguém chama a guarda.', kicker: 'Tião' },
        { text: 'O ringue grande, no fim do tapete, é para quem tem trilha. Os dois de lado são exibição: só para apostar e gritar.' },
        {
          text: 'Energia começa no zero quando o sino toca. Quem bate primeiro, carrega primeiro. E o prêmio cai no chão, em fichas: recolhe antes que alguém pise.',
          choices: [
            { label: 'Quem são os de casaco comprido?', pick: ask },
            { label: 'Valeu, Tião', pick: () => undefined },
          ],
        },
      ]
    }
    return [
      {
        text: 'De volta. A trilha não anda sozinha, piloto.',
        choices: [
          { label: 'Quem são os de casaco comprido?', pick: ask },
          { label: 'Só passando', pick: () => undefined },
        ],
      },
    ]
  }
  const stage = story.beats.length
  if (stage === 0) return [{ text: 'Você também reparou neles, né? Vi a sua cara quando saiu de perto da mesa. Cuidado. Aqui embaixo as paredes têm ouvido, e eles pagam bem.' }]
  if (stage < 3) return [{ text: 'Cada noite um deles sobe no ringue contra você e cada noite desce quieto. Isso não é coincidência, é fila.' }]
  if (!story.campFound) return [{ text: 'A floresta além do Mirante. Onde as árvores abrem. É lá que eles guardam o que roubam, se o bilhete não mente.' }]
  return [{ text: 'Você viu o acampamento com os próprios olhos. Agora só falta o resto da cidade acreditar. Vai precisar de mais do que uma vitória.' }]
}

export const BARTENDER_ANSWER: readonly TalkPage[] = [
  { text: 'Chegaram depois do meteoro. Pagam com fichas novas demais, nunca bebem nada e ganham mais do que deviam.' },
  { text: 'O robô deles tem um cristal apagado no peito. Nunca vi igual. Se fosse você, não sentava naquela mesa.' },
]

export const FORASTEIROS_NEAR: readonly TalkPage[] = [
  { text: 'Três pessoas de casaco comprido. Param de falar quando você chega. Um deles sorri sem mostrar os dentes.', kicker: 'Mesa do canto' },
  { text: 'O robô ao lado tem um cristal apagado no peito, como um olho fechado.', kicker: 'Mesa do canto' },
]

export const FORASTEIROS_AFTER: readonly TalkPage[] = [
  { text: 'Eles olham para você sem piscar. A forasteira ergue o copo, vazio, num brinde que não é brinde.', kicker: 'Mesa do canto' },
]

export const FORASTEIROS_GONE: readonly TalkPage[] = [{ text: 'A mesa do canto está vazia. Sobraram fichas novas demais e um cheiro de ozônio.', kicker: 'Mesa do canto' }]
