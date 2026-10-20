import { rgb, type Color } from './raster'

const ramp = (...hex: string[]): Color[] => hex.map((value) => rgb(value))

export const INK = rgb('#1f1a17')
export const INK_SOFT = rgb('#3a302a')
export const WHITE = rgb('#ffffff')

export const GRASS = ramp('#35603a', '#44743f', '#558946', '#679d4f', '#80b35c', '#9cc86b')
export const MEADOW = ramp('#4a7a3c', '#5b8f45', '#6fa451', '#86b95e', '#a3cd72')
export const FOREST_FLOOR = ramp('#162a20', '#1c3326', '#23402d', '#2b4c34')
export const CONIFER = ramp('#122822', '#18342c', '#20453a', '#2c5946', '#3c6f52', '#52885e')
export const OAK = ramp('#20412b', '#2a5534', '#376b3d', '#488348', '#5f9c54', '#7db565')
export const BIRCH = ramp('#3a6532', '#4e7c3b', '#679546', '#82ad55', '#a2c66a')
export const BLOSSOM = ramp('#7e3f63', '#a8577f', '#cc7ca0', '#e9a8c2', '#f8d3e1')
export const LUME = ramp('#123f4d', '#1a5f6b', '#248785', '#3fb3a6', '#7ae3d0', '#c8fff1')
export const TRUNK = ramp('#34251c', '#473223', '#5c412d', '#74573b')
export const BIRCH_BARK = ramp('#6f6a60', '#b9b3a4', '#e6e1d4')

export const PLAZA = ramp('#968d7c', '#aca390', '#c1b9a5', '#d4ccba', '#e6e0d1')
export const COBBLE = ramp('#817662', '#968a74', '#a99c85', '#bcae96', '#cec2a9')
export const ROAD = ramp('#474e5c', '#535a69', '#606878', '#6f7787')
export const CURB_DARK = rgb('#5f584c')
export const CURB_LIGHT = rgb('#f0eadc')
export const GRAVEL = ramp('#a2947a', '#b6a88b', '#c9bc9e', '#d9ceb3')
export const DIRT = ramp('#63492f', '#7a5a3a', '#91704a', '#a9875b', '#bf9e6e')
export const FIELD_SOIL = ramp('#5a3f28', '#6e4e31', '#83603c')
export const WHEAT = ramp('#9c7a2c', '#bd9a3c', '#d7b653', '#ead07a')
export const LAVENDER = ramp('#5a4a8f', '#7462ad', '#907ec8', '#b3a4e0')

export const WATER = ramp('#1c4b5e', '#235c72', '#2b6f86', '#378499', '#4f9fb0', '#7fc3c8', '#cdeee9')
export const QUAY = ramp('#5e6369', '#747a80', '#8b9096', '#a3a8ac', '#bec2c4', '#d6d8d8')
export const SAND = ramp('#a9955f', '#c1ad78', '#d5c38e', '#e4d6a8')
export const REED = ramp('#3d5f2e', '#557a38', '#71964a', '#9fb866')
export const LILY = ramp('#2f6a3c', '#3f8448', '#58a058')

export const PLASTER = ramp('#9f9686', '#bdb4a2', '#d5cdbc', '#e7e0d2', '#f4efe5')
export const CREAM = ramp('#a8946f', '#c4af87', '#d9c6a0', '#e9dbbc', '#f5ecd8')
export const SAGE = ramp('#77856f', '#8f9d86', '#a8b59e', '#c2cdb7', '#dbe3d1')
export const STONE = ramp('#62594c', '#786e5f', '#8f8472', '#a69b87', '#bcb29e', '#d0c8b6')
export const WOOD = ramp('#43291c', '#5a3826', '#724a31', '#8c5e3e', '#a6764f', '#bf9165')

export const ROOF_TEAL = ramp('#1a4a49', '#215f5c', '#297670', '#339088', '#4aab9d', '#7dccbb')
export const ROOF_SLATE = ramp('#222b40', '#2c3853', '#374767', '#465a80', '#5c729b', '#7c91b6')
export const ROOF_TERRACOTTA = ramp('#692c21', '#843a29', '#9f4a33', '#b95f41', '#cf7953', '#e09a72')
export const ROOF_PLUM = ramp('#3a2740', '#4c3353', '#614269', '#795682', '#95709d', '#b08fb6')
export const ROOF_OCHRE = ramp('#62421a', '#7d5622', '#9a6d2e', '#b6883f', '#cda557', '#e0c27a')
export const ROOF_MOSS = ramp('#2f4d2c', '#3c6135', '#4b7640', '#5e8c4b', '#77a45a', '#95bb6d')

export const GLASS = ramp('#1b3a50', '#24526a', '#2f6d87', '#4589a2', '#74b6c7', '#c3ebef')
export const GLOW = ramp('#2fc4b8', '#6ff0de', '#b9fff1', '#f2fffb')
export const GOLD = ramp('#8c5a1c', '#c08433', '#e7b04f', '#ffd98a', '#fff2cc')
export const CRYSTAL = ramp('#4a3590', '#6a52bd', '#8f78e0', '#bba9fb', '#e9e2ff')
export const METAL = ramp('#262a30', '#3a4049', '#545c67', '#7a838f', '#a8b0ba')

export const AWNINGS = ['#c2493b', '#2d8a82', '#d9a634', '#3f68a8', '#4f8a45', '#e07a5f', '#7a5aa6'].map((hex) => rgb(hex))
export const AWNING_STRIPE = rgb('#f2e6c9')
export const FLOWERS = ['#f2d24b', '#e8566c', '#f6f0f0', '#8ab4f8', '#c77dff', '#ff9e5e', '#ffc6d9'].map((hex) => rgb(hex))
export const GLOW_FLOWERS = ['#7ff5e4', '#c9b8ff', '#9fe8ff'].map((hex) => rgb(hex))

export type Ramp = Color[]

export function tone(ramp: Ramp, lightness: number): Color {
  const index = Math.max(0, Math.min(ramp.length - 1, Math.round(lightness * (ramp.length - 1))))
  return ramp[index]
}
