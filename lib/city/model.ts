import type { Point, Polygon, Rect } from './geometry'

export const ART = 4
export const STORY = 42
export const PLINTH = 4

export type BuildingStyle =
  | 'cottage'
  | 'townhouse'
  | 'shell'
  | 'garden'
  | 'tower'
  | 'stone'
  | 'shop'
  | 'workshop'
  | 'civic'
  | 'academy'
  | 'barn'
  | 'greenhouse'
  | 'pavilion'
  | 'factory'
  | 'robotshop'
  | 'league'

export type RoofColor = 'teal' | 'slate' | 'terracotta' | 'plum' | 'ochre' | 'moss'
export type WallColor = 'plaster' | 'cream' | 'sage' | 'stone' | 'wood'

export type Building = {
  id: string
  style: BuildingStyle
  x: number
  y: number
  w: number
  h: number
  floors: number
  roof?: RoofColor
  wall?: WallColor
  roofKind?: 'dome' | 'flat' | 'gable'
  timber?: boolean
  accent?: number
  door?: number
  seed: number
}

export function facadeHeight(floors: number) {
  return (floors * STORY + PLINTH) * ART
}

export function roofDepth(building: Pick<Building, 'h' | 'floors'>) {
  return building.h - facadeHeight(building.floors)
}

export function doorPoint(building: Building): Point {
  return [building.x + (building.door ?? building.w / 2), building.y + building.h]
}

export type PavingKind = 'avenue' | 'street' | 'plaza' | 'promenade' | 'gravel' | 'dirt' | 'market'

export type Paving =
  | { kind: PavingKind; shape: 'stroke'; points: readonly Point[]; width: number }
  | { kind: PavingKind; shape: 'circle'; center: Point; radius: number }
  | { kind: PavingKind; shape: 'polygon'; points: Polygon }

export type TreeKind = 'oak' | 'birch' | 'pine' | 'blossom' | 'lume' | 'bush'
export type Tree = { kind: TreeKind; x: number; y: number; size: number; seed: number }

export type PropKind = 'lamp' | 'bench-h' | 'bench-v' | 'planter' | 'crates' | 'barrels' | 'well' | 'signpost' | 'cart' | 'statue'
export type Prop = { kind: PropKind; x: number; y: number; seed: number }

export type FenceKind = 'wood' | 'hedge' | 'stone'
export type Fence = { kind: FenceKind; points: readonly Point[] }

export type FieldKind = 'wheat' | 'vegetables' | 'lavender' | 'flowers' | 'orchard'
export type Field = { kind: FieldKind; rect: Rect; rows: 'h' | 'v' }

export type GardenKind = 'flowers' | 'glow-flowers' | 'lawn' | 'hedge-maze' | 'pond'
export type Garden = { kind: GardenKind; rect: Rect }

export type Stall = { x: number; y: number; w: number; h: number; color: number; goods: 'fruit' | 'crystals' | 'bread' | 'fabric' | 'flowers' | 'potions' }

export type LandmarkKind = 'crystal-fountain' | 'lanterns' | 'ring-tower' | 'windmill' | 'islands' | 'lume-tree'
export type Landmark = {
  kind: LandmarkKind
  id: string
  x: number
  y: number
  base?: Rect
  radius?: number
  points?: readonly (readonly [number, number, number])[]
}

export type Bridge = { rect: Rect; axis: 'h' | 'v'; kind: 'stone' | 'wood' }

export type TentColor = 'ochre' | 'rust' | 'olive' | 'canvas' | 'night'
export type Tent = { x: number; y: number; w: number; h: number; color: TentColor }
