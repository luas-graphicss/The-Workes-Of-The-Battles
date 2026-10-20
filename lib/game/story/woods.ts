import type { CampId } from '../../city/woods'
import type { TalkPage } from '../npcs/dialogue'

export type CacheText = {
  name: string

  open: string

  later: string

  last: string

  wait: string
}

export const CACHE_TEXT: Record<CampId, CacheText> = {
  cacadores: {
    name: 'Baú de couro',
    open: 'Entre cordas, armadilhas e facas de esfolar, os caçadores guardaram uma coisa que não serve para caçar bicho nenhum.',
    later: 'Os caçadores voltam com mais quando a lua enche.',
    last: 'O baú ficou vazio de vez; só sobrou o cheiro de couro e fumaça.',
    wait: 'Os caçadores ainda não voltaram. Venha de novo depois de vencer o nível {level} na Liga.',
  },
  lenhadores: {
    name: 'Caixa de ferramentas',
    open: 'Debaixo de serrotes e cunhas, embrulhada num pano cheio de serragem, uma peça que alguém achou no oco de um carvalho.',
    later: 'Cada árvore que cai na mata tem um oco, e cada oco guarda alguma coisa.',
    last: 'Na caixa só ficaram ferramentas cegas e um bilhete: "o resto foi para a serraria".',
    wait: 'Só serragem por enquanto. Os lenhadores ainda têm muita árvore para derrubar: volte depois do nível {level} na Liga.',
  },
  eremita: {
    name: 'Arca do eremita',
    open: 'A arca range. Por cima de raízes secas e potes de mel, um embrulho de folhas com um bilhete torto: "para o piloto do robô de cristal".',
    later: 'O eremita anda pela mata e sempre acha mais.',
    last: 'No fundo da arca vazia, um último bilhete: "a mata já te deu o que tinha. O resto está com eles, onde as árvores abrem."',
    wait: 'Só mel e raízes. O eremita ainda está andando pela mata; volte depois de vencer o nível {level} na Liga.',
  },
  forasteiros: {
    name: 'Caixa lacrada',
    open: 'O lacre se desfaz num chiado de ozônio. Entre cristais apagados, uma peça que não foi feita neste planeta.',
    later: 'O lacre volta a zumbir, mais fraco a cada robô deles que cai na Liga.',
    last: 'A caixa está vazia. No fundo, a marca de uma coisa redonda, grande demais para ser cristal de robô. Do tamanho do Coração do meteoro.',
    wait: 'O lacre zumbe e não cede. Ele afrouxa a cada robô dos Forasteiros que cai: volte depois de vencer o nível {level} na Liga.',
  },
}

export type CampShots = { beacon(): void; tents(): void; crates(): void; robot(): void }
export type RobotVoice = { name: string; kicker: string; portrait: HTMLCanvasElement | null }

export function campFoundPages(overheard: boolean, shot: CampShots, robot: RobotVoice): TalkPage[] {
  const pages: TalkPage[] = [
    {
      text: 'As árvores abrem de uma vez. No meio da clareira, uma torre preta e lisa, sem porta nem emenda, zumbe baixinho. No alto, uma luz roxa pisca devagar, como quem conversa com o céu.',
      onShow: shot.beacon,
    },
    {
      text: 'Em volta, barracas de um tecido que não amassa e uma fogueira que queima roxo sem esquentar. Ninguém à vista. As pegadas no chão terminam do nada, como se quem andou por aqui tivesse subido.',
      onShow: shot.tents,
    },
    {
      text: 'Caixas lacradas ao pé da torre. Por uma fresta: cristais vermelhos, azuis, verdes, dourados. Cristais de peito de robô. Dezenas. Todos apagados.',
      onShow: shot.crates,
    },
    {
      text: 'O seu robô leva a mão ao próprio cristal, como quem confere se ele ainda está ali. ...bip.',
      name: robot.name,
      kicker: robot.kicker,
      portrait: robot.portrait,
      onShow: shot.robot,
    },
  ]
  if (overheard) {
    pages.push(
      { text: 'Então era isso. Cada robô que eles derrotam na Liga perde mais do que a luta. O plano não é só humilhar a cidade: é apagar os cristais, um por um, e levar a luz embora.' },
      { text: 'Ninguém em Bosque Alto vai acreditar sem prova. Mas a caixa lacrada perto das barracas zumbe cada vez mais fraco, e cada robô deles que cai na Liga afrouxa o lacre mais um pouco.' },
    )
  } else {
    pages.push(
      { text: 'Quem guarda cristais de robô numa caixa, no meio do mato, longe de tudo? Tião, no bar da Liga, sabe de tudo que acontece lá embaixo. Talvez saiba disso também.' },
      { text: 'Perto das barracas, uma caixa lacrada zumbe baixinho. O lacre parece mais fraco do que o resto. Talvez ceda, com o tempo.' },
    )
  }
  return pages
}
