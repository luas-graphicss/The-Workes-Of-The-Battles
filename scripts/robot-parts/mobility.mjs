import { FEET } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const feet = (dir) => FEET[dir]
const side = (dir) => dir === 'w'

export const MOBILITY = [
  {
    id: 'move-skates',
    draw(p, dir, frame) {
      const f = feet(dir)
      const roll = frame >= 0 ? frame % 2 : 0
      if (side(dir)) {
        p.box(f.x0 - 1, 36, 16, 7, L, { hi: W, sh: M })
        p.hline(f.x0, 38, 14, Y)
        p.box(f.x0, 42, 14, 2, K)
        for (let i = 0; i < 4; i++) {
          const x = f.x0 + 1 + i * 4
          p.disc(x, 44, 1, L)
          p.px(x, 44, roll === i % 2 ? W : K)
        }
        return
      }
      for (const x of [f.x0 - 1, f.x0 + 8]) {
        p.box(x, 36, 9, 7, L, { hi: W, sh: M })
        p.hline(x + 1, 38, 7, Y)
        p.box(x, 42, 9, 2, K)
        p.disc(x + 2, 44, 1, L)
        p.disc(x + 6, 44, 1, L)
        p.px(x + 2, 44, roll ? W : K)
        p.px(x + 6, 44, roll ? K : W)
      }
    },
  },
  {
    id: 'move-spider',
    draw(p, dir, frame) {
      const f = feet(dir)
      const step = frame >= 0 ? frame % 3 : 0
      p.box(f.x0 - 1, 36, f.x1 - f.x0 + 3, 9, M, { hi: L, sh: K })
      p.rect(f.x0 + 2, 39, f.x1 - f.x0 - 3, 2, K)
      p.px(f.x0 + 3, 39, Y)
      p.px(f.x1 - 2, 39, Y)
      const legs = side(dir)
        ? [
            [f.x0 - 1, 40, f.x0 - 5, 37, f.x0 - 7, 45],
            [f.x0 - 1, 42, f.x0 - 4, 41, f.x0 - 5, 46],
            [f.x1 + 1, 40, f.x1 + 5, 37, f.x1 + 7, 45],
            [f.x1 + 1, 42, f.x1 + 4, 41, f.x1 + 5, 46],
          ]
        : [
            [f.x0 - 1, 40, f.x0 - 6, 36, f.x0 - 9, 45],
            [f.x0 - 1, 42, f.x0 - 5, 40, f.x0 - 7, 46],
            [f.x1 + 1, 40, f.x1 + 6, 36, f.x1 + 9, 45],
            [f.x1 + 1, 42, f.x1 + 5, 40, f.x1 + 7, 46],
          ]
      legs.forEach(([x0, y0, x1, y1, x2, y2], index) => {
        const lift = step === index % 3 && frame >= 0 ? -2 : 0
        p.line(x0, y0, x1, y1 + lift, K)
        p.line(x1, y1 + lift, x2, y2 + lift, K)
        p.px(x1, y1 + lift, L)
        p.px(x2, y2 + lift, L)
      })
    },
  },
  {
    id: 'move-monowheel',
    draw(p, dir, frame) {
      const f = feet(dir)
      const cx = Math.floor((f.x0 + f.x1) / 2)
      const spin = frame >= 0 ? frame % 4 : 0
      if (side(dir)) {
        p.disc(cx, 40, 6, L)
        p.disc(cx, 40, 3, M)
        p.px(cx, 40, W)
        const spokes = [
          [cx, 37],
          [cx + 3, 40],
          [cx, 43],
          [cx - 3, 40],
        ]
        p.px(spokes[spin][0], spokes[spin][1], K)
        p.px(spokes[(spin + 2) % 4][0], spokes[(spin + 2) % 4][1], K)
        p.px(cx - 6, 40, K)
        p.px(cx + 6, 40, K)
        p.box(f.x0 - 1, 36, 6, 4, M, { hi: L })
        p.box(f.x1 - 4, 36, 6, 4, M, { hi: L })
        return
      }
      p.ellipse(cx, 40, 10, 5, M)
      p.rect(cx - 7, 37, 15, 7, L)
      p.hline(cx - 6, 37, 13, W)
      p.rect(cx - 2, 38, 5, 5, M)
      p.px(cx, 40, W)
      for (let x = cx - 6 + (spin % 2); x <= cx + 6; x += 2) p.px(x, 43, K)
      p.hline(cx - 9, 40, 2, K)
      p.hline(cx + 8, 40, 2, K)
      p.px(cx - 8, 39, Y)
      p.px(cx + 8, 39, Y)
    },
  },
  {
    id: 'move-rocket',
    draw(p, dir, frame) {
      const f = feet(dir)
      const burn = frame >= 0 && frame % 2 === 1
      const boots = side(dir) ? [[f.x0 - 1, 15]] : [[f.x0 - 1, 9], [f.x0 + 8, 9]]
      for (const [x, w] of boots) {
        p.box(x, 36, w, 8, Y, { hi: W, sh: M })
        p.rect(x + 1, 40, w - 2, 1, K)
        p.rect(x + 1, 41, w - 2, 2, L)
        p.rect(x + 1, 43, 3, 2, K)
        p.rect(x + w - 4, 43, 3, 2, K)
        if (w > 10) p.rect(x + 6, 43, 3, 2, K)
        if (burn) {
          p.px(x + 2, 45, W)
          p.px(x + w - 3, 45, W)
          p.px(x + 2, 46, Y)
          p.px(x + w - 3, 46, Y)
        } else if (frame >= 0) {
          p.px(x + 2, 45, Y)
          p.px(x + w - 3, 45, Y)
        }
      }
    },
  },
  {
    id: 'move-crystal-board',
    draw(p, dir, frame) {
      const f = feet(dir)
      const glow = frame >= 0 ? frame % 3 : 0
      p.box(f.x0 - 4, 37, f.x1 - f.x0 + 9, 7, L, { hi: W, sh: M })
      for (let x = f.x0 - 2; x < f.x1 + 3; x += 5) {
        p.px(x, 39, W)
        p.px(x + 1, 40, M)
        p.px(x + 2, 41, W)
      }
      p.hline(f.x0 - 3, 42, f.x1 - f.x0 + 7, M)
      const dots = [f.x0 - 1, f.x0 + 4, f.x0 + 9, f.x0 + 14]
      dots.forEach((x, index) => {
        if (x > f.x1 + 3) return
        p.px(x + ((glow + index) % 2), 45, (glow + index) % 3 === 0 ? W : Y)
      })
    },
  },
  {
    id: 'move-alien-legs',
    draw(p, dir, frame) {
      const f = feet(dir)
      const wiggle = frame >= 0 ? frame % 2 : 0
      const legs = side(dir) ? [[f.x0 - 1, 15]] : [[f.x0 - 2, 10], [f.x0 + 8, 10]]
      for (const [x, w] of legs) {
        p.box(x, 36, w, 6, M, { hi: L, sh: K })
        p.ellipse(x + Math.floor(w / 2), 42, Math.floor(w / 2), 2, M)
        const toes = w > 12 ? [x + 1, x + 5, x + 9, x + 13] : [x + 1, x + 4, x + 7]
        toes.forEach((tx, index) => {
          const dip = (index + wiggle) % 2
          p.px(tx, 44, K)
          p.px(tx, 45 + dip, K)
          p.px(tx, 44 + dip, W)
        })
        p.px(x + 2, 38, W)
      }
    },
  },
  {
    id: 'move-golem',
    draw(p, dir) {
      const f = feet(dir)
      const blocks = side(dir) ? [[f.x0 - 2, 16]] : [[f.x0 - 3, 11], [f.x0 + 9, 11]]
      for (const [x, w] of blocks) {
        p.box(x, 35, w, 11, L, { hi: W, sh: M })
        p.hline(x + 1, 40, w - 2, K)
        p.rect(x + 1, 41, w - 2, 4, M)
        p.px(x + 2, 37, K)
        p.px(x + 3, 38, K)
        p.px(x + w - 3, 42, K)
        p.px(x + w - 4, 43, K)
        p.px(x + 2, 43, Y)
        p.px(x + w - 3, 37, Y)
      }
    },
  },
]
