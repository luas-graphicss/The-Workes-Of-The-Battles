import { inRect } from '../city/geometry'
import { paintLeagueFloor } from '../league/floor'
import {
  BAR_ZONE,
  BOOTH_ZONE,
  EXIT_ZONE,
  FORASTEIROS_REACH,
  FORASTEIROS_TABLE,
  LEAGUE_NAME,
  LEAGUE_ROOM,
  leagueWalkable,
  MAIN_RING,
  MAIN_RING_BENCHES,
  MAIN_RING_LAMPS,
  RING_EXIT,
  RING_GATE_ZONE,
  VENDOR,
} from '../league/layout'
import { createCrowd, type Crowd } from '../league/people'
import { leagueProps } from '../league/props'
import type { Space } from '../world-data'
import { ringFromRect, type RingDef } from './battle/ring'
import { CityLayer } from './city'
import type { RGB } from './fx/textures'
import { createRoomLayer, type MapLayer } from './map'
import type { RobotComposer, Sheets } from './robot/sprites'
import type { Scene } from './scene'

export type LeagueSpot = 'exit' | 'ring' | 'bar' | 'booth' | 'vendor' | 'forasteiros'

export const LEAGUE_AMBIENT: RGB = [168, 146, 134]

export const LEAGUE_FIGHT_AMBIENT: RGB = [92, 80, 118]

export const LEAGUE_BACKDROP = '#120f10'

export type League = {
  readonly ring: RingDef
  readonly space: Space
  readonly layer: MapLayer
  readonly city: CityLayer
  readonly crowd: Crowd
  spotAt(x: number, y: number): LeagueSpot | null
}

export type LeagueOptions = {
  composer: RobotComposer
  pilot: Sheets

  atlas: HTMLImageElement
  scene: Scene
}

export function createLeague(options: LeagueOptions): League {
  const layer = createRoomLayer(paintLeagueFloor(), LEAGUE_BACKDROP)
  const city = new CityLayer(options.atlas, leagueProps(), { baked: false })
  const crowd = createCrowd({ composer: options.composer, pilot: options.pilot, particles: options.scene.particles })
  const ring = ringFromRect({
    id: 'liga',
    name: `Ringue Principal da ${LEAGUE_NAME}`,
    place: 'leste da Oficina do Cristal',
    cheer: 'a Liga vem abaixo',
    rect: MAIN_RING.rect,
    exit: RING_EXIT,
    lamps: MAIN_RING_LAMPS,
    benches: MAIN_RING_BENCHES,
    ambient: [LEAGUE_AMBIENT, LEAGUE_FIGHT_AMBIENT],
  })
  const space: Space = { width: LEAGUE_ROOM.width, height: LEAGUE_ROOM.height, walkable: leagueWalkable }

  return {
    ring,
    space,
    layer,
    city,
    crowd,
    spotAt(x, y) {
      if (inRect(EXIT_ZONE, x, y)) return 'exit'
      if (inRect(RING_GATE_ZONE, x, y)) return 'ring'
      if (inRect(VENDOR.zone, x, y)) return 'vendor'
      if (inRect(BAR_ZONE, x, y)) return 'bar'
      if (inRect(BOOTH_ZONE, x, y)) return 'booth'
      if (Math.hypot(x - FORASTEIROS_TABLE[0], y - FORASTEIROS_TABLE[1]) <= FORASTEIROS_REACH) return 'forasteiros'
      return null
    },
  }
}
