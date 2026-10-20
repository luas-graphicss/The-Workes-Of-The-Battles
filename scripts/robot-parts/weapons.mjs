import { fist, weaponDraw } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

export const WEAPONS = [
  {
    id: 'weapon-wrench',
    draw: weaponDraw((p) => {
      p.box(-11, -2, 18, 5, L, { hi: W })
      p.hline(-10, 0, 6, M)
      fist(p)
      p.box(5, -5, 9, 11, L, { hi: W, sh: M })
      p.rect(10, -2, 5, 5, 0)
      p.vline(9, -2, 5, K)
      p.hline(10, -3, 4, K)
      p.hline(10, 3, 4, K)
      p.px(14, -4, K)
      p.px(14, 4, K)
      p.rect(6, 1, 3, 3, Y)
      p.px(7, 2, K)
    }),
  },
  {
    id: 'weapon-saw',
    draw: weaponDraw((p, frame) => {
      p.box(4, -4, 7, 9, M, { hi: L, sh: K })
      p.rect(6, -2, 3, 1, Y)
      p.rect(6, 2, 3, 1, Y)
      fist(p)
      p.disc(11, 0, 4, L)
      const phase = frame >= 0 ? frame % 2 : 0
      const teeth = [
        [11, -5],
        [15, -2],
        [15, 2],
        [11, 5],
        [7, 2],
        [7, -2],
        [14, -4],
        [16, 0],
        [14, 4],
        [8, 4],
        [6, 0],
        [8, -4],
      ]
      teeth.forEach(([x, y], index) => {
        if (index % 2 === phase) p.px(x, y, K)
      })
      p.px(11, 0, W)
      p.px(10, -1, W)
      p.px(12, 1, M)
    }),
  },
  {
    id: 'weapon-harpoon',
    draw: weaponDraw((p) => {
      p.box(-12, -1, 26, 3, L, { hi: W })
      fist(p)
      p.rect(11, -1, 4, 3, K)
      p.px(15, 0, K)
      p.rect(12, 0, 3, 1, W)
      p.px(11, -2, K)
      p.px(11, 2, K)
      p.px(10, -3, K)
      p.px(10, 3, K)
      p.disc(-8, 4, 2, Y)
      p.px(-8, 4, K)
      p.px(-6, 5, K)
      p.px(-4, 5, K)
    }),
  },
  {
    id: 'weapon-sword',
    draw: weaponDraw((p, frame) => {
      p.box(-9, -2, 5, 5, Y, { hi: W })
      p.px(-7, 0, K)
      fist(p)
      p.box(4, -5, 3, 11, Y, { hi: W })
      p.rect(7, -2, 8, 5, K)
      p.rect(7, -1, 7, 3, L)
      p.hline(7, 0, 7, W)
      p.px(14, 0, W)
      const pulse = frame >= 0 ? frame % 3 : 0
      p.px(8 + pulse * 2, -1, W)
      p.px(9 + pulse * 2, 1, W)
    }),
  },
  {
    id: 'weapon-boxing',
    draw: weaponDraw((p) => {
      p.box(-11, -2, 6, 5, L, { hi: W })
      p.hline(-10, 0, 4, K)
      p.box(-6, -5, 14, 11, Y, { hi: W, sh: M, round: true })
      p.hline(-4, -1, 9, K)
      p.rect(-4, 0, 9, 1, M)
      p.px(6, -2, W)
      p.px(6, 2, W)
      p.rect(-3, 2, 3, 2, M)
    }),
  },
  {
    id: 'weapon-crystal-blade',
    draw: weaponDraw((p, frame) => {
      p.box(-8, -2, 4, 5, Y, { hi: W })
      fist(p)
      p.box(4, -4, 3, 9, Y, { hi: W })
      p.line(7, -3, 13, -1, K)
      p.line(7, 3, 13, 1, K)
      p.line(13, -1, 15, 0, K)
      p.line(13, 1, 15, 0, K)
      p.vline(7, -2, 5, K)
      p.rect(8, -2, 5, 5, L)
      p.hline(8, 0, 6, W)
      p.px(13, 0, W)
      p.px(14, 0, W)
      const glint = frame >= 0 ? frame % 3 : 0
      p.px(9 + glint, -1, W)
      p.px(10 + glint, 1, M)
    }),
  },
  {
    id: 'weapon-alien-ray',
    draw: weaponDraw((p, frame) => {
      fist(p)
      p.ellipse(9, 0, 5, 3, M)
      p.vline(7, -2, 5, W)
      p.vline(10, -2, 5, W)
      p.vline(13, -1, 3, W)
      p.px(7, -3, K)
      p.px(10, -3, K)
      p.disc(14, 0, 1, W)
      p.vline(8, -6, 3, K)
      p.px(8, -7, frame >= 0 && frame % 2 === 0 ? W : Y)
      p.px(6, 3, Y)
    }),
  },
  {
    id: 'weapon-meteor-mace',
    draw: weaponDraw((p) => {
      p.box(-9, -2, 15, 5, L, { hi: W })
      p.hline(-8, 0, 3, K)
      fist(p)
      p.box(6, -6, 8, 13, M, { hi: L, sh: K, round: true })
      p.rect(8, -4, 3, 3, L)
      p.rect(10, 1, 3, 3, L)
      p.px(9, -3, W)
      p.px(11, 2, W)
      p.px(7, 3, K)
      p.px(12, -4, K)
      p.px(14, -3, K)
      p.px(15, -4, K)
      p.px(14, 3, K)
      p.px(15, 4, K)
      p.px(9, -7, K)
      p.px(9, 7, K)
      p.px(6, -7, K)
    }),
  },
  {
    id: 'weapon-thorn-whip',
    draw: weaponDraw((p, frame) => {
      const sway = frame >= 0 ? [0, 1, 1, 0, -1, -1][frame] : 0
      p.box(-8, -2, 5, 5, Y, { hi: W })
      p.px(-6, 0, K)
      fist(p)
      p.hline(5, -1, 3, K)
      p.hline(5, 0, 3, M)
      p.hline(5, 1, 3, K)
      p.ellipse(10, 0, 4, 4, M)
      p.ellipse(10, 0, 2, 2, 0)
      p.px(8, -3, L)
      p.px(7, -2, L)
      p.px(13, 2, L)
      for (const [x, y] of [
        [10, -5],
        [14, -3],
        [15, 1],
        [6, -3],
      ]) {
        p.px(x, y, Y)
      }
      p.line(13, 3, 14, 6 + sway, K)
      p.line(12, 3, 13, 6 + sway, M)
      p.px(14, 7 + sway, Y)
    }),
  },
]
