import { K, L, Layer, W } from './raster.mjs'

export const DRAWN = ['s', 'sw', 'w', 'nw', 'n']
export const ROW = { s: 0, sw: 1, w: 2, nw: 3, n: 4, ne: 5, e: 6, se: 7 }
export const MIRROR = { e: 'w', se: 'sw', ne: 'nw' }

export const BODY_BOB = [0, -1, 0, 0, -1, 0]
export const ARM_SWING = [0, 0, 1, 0, -2, -1]

export const HEAD = {
  s: { x0: 13, y0: 10, x1: 34, y1: 24 },
  sw: { x0: 14, y0: 10, x1: 33, y1: 24 },
  w: { x0: 15, y0: 10, x1: 30, y1: 24 },
  nw: { x0: 14, y0: 10, x1: 33, y1: 24 },
  n: { x0: 13, y0: 10, x1: 34, y1: 24 },
}

export const FACE_X = { s: 24, sw: 20, w: 16 }

export const TORSO = {
  s: { x0: 16, y0: 27, x1: 31, y1: 37 },
  sw: { x0: 16, y0: 27, x1: 31, y1: 37 },
  w: { x0: 17, y0: 27, x1: 28, y1: 37 },
  nw: { x0: 16, y0: 27, x1: 31, y1: 37 },
  n: { x0: 16, y0: 27, x1: 31, y1: 37 },
}

export const FEET = {
  s: { x0: 16, y0: 37, x1: 32, y1: 44 },
  sw: { x0: 16, y0: 37, x1: 32, y1: 44 },
  w: { x0: 15, y0: 37, x1: 28, y1: 44 },
  nw: { x0: 16, y0: 37, x1: 32, y1: 44 },
  n: { x0: 16, y0: 37, x1: 32, y1: 44 },
}

export const GRIP = {
  s: { x: 35, y: 32, angle: 90 },
  sw: { x: 12, y: 32, angle: 135 },
  w: { x: 19, y: 32, angle: 180 },
  nw: { x: 35, y: 30, angle: 225 },
  n: { x: 12, y: 32, angle: 270 },
}

export const FREE_SIDE = { s: 'left', sw: 'right', w: 'right', nw: 'right', n: 'left' }

export const isFront = (dir) => dir === 's' || dir === 'sw'
export const isBack = (dir) => dir === 'n' || dir === 'nw'
export const isDiagonal = (dir) => dir === 'sw' || dir === 'nw'

export class Pen {
  constructor(layer, ox = 0, oy = 0) {
    this.layer = layer
    this.ox = ox
    this.oy = oy
  }
  px(x, y, c) {
    this.layer.px(x + this.ox, y + this.oy, c)
  }
  get(x, y) {
    return this.layer.get(x + this.ox, y + this.oy)
  }
  rect(x, y, w, h, c) {
    this.layer.rect(x + this.ox, y + this.oy, w, h, c)
  }
  hline(x, y, w, c) {
    this.layer.hline(x + this.ox, y + this.oy, w, c)
  }
  vline(x, y, h, c) {
    this.layer.vline(x + this.ox, y + this.oy, h, c)
  }
  box(x, y, w, h, fill, opts) {
    this.layer.box(x + this.ox, y + this.oy, w, h, fill, opts)
  }
  line(x0, y0, x1, y1, c) {
    this.layer.line(x0 + this.ox, y0 + this.oy, x1 + this.ox, y1 + this.oy, c)
  }
  disc(cx, cy, r, fill, outline) {
    this.layer.disc(cx + this.ox, cy + this.oy, r, fill, outline)
  }
  ellipse(cx, cy, rx, ry, fill, outline) {
    this.layer.ellipse(cx + this.ox, cy + this.oy, rx, ry, fill, outline)
  }
  poly(points, fill, outline) {
    this.layer.poly(
      points.map(([x, y]) => [x + this.ox, y + this.oy]),
      fill,
      outline,
    )
  }
}

export function fist(pen) {
  pen.box(-5, -3, 11, 7, L, { hi: W })
  pen.vline(-1, -2, 5, K)
}

const CANON = 24

export function weaponDraw(canonical) {
  return (pen, dir, frame) => {
    const source = new Layer()
    canonical(new Pen(source, CANON, CANON), frame, dir)
    const grip = GRIP[dir]
    if (dir === 'w') {
      pen.layer.paste(source.mirrored(), grip.x - (CELL_LAST - CANON), grip.y - CANON)
      return
    }
    pen.layer.paste(source.rotated(CANON, CANON, grip.angle, grip.x, grip.y))
  }
}

const CELL_LAST = 47
