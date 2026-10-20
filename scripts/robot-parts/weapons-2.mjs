import { fist, weaponDraw } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

export const WEAPONS_2 = [
  {
    id: 'weapon-pickaxe',
    draw: weaponDraw((p) => {
      p.box(-12, -2, 18, 5, M, { hi: L })
      p.hline(-11, 0, 4, K)
      fist(p)

      p.box(4, -2, 5, 5, L, { hi: W, sh: K })
      p.poly(
        [
          [4, -3],
          [9, -3],
          [8, -10],
          [5, -10],
        ],
        L,
        K,
      )
      p.poly(
        [
          [4, 3],
          [9, 3],
          [8, 10],
          [5, 10],
        ],
        L,
        K,
      )
      p.vline(6, -9, 6, W)
      p.vline(6, 4, 6, W)
      p.px(6, -11, K)
      p.px(6, 11, K)
      p.px(7, 0, Y)
    }),
  },
  {
    id: 'weapon-slingshot',
    draw: weaponDraw((p, frame) => {
      p.box(-9, -2, 6, 5, M, { hi: L })
      fist(p)

      p.line(4, 0, 9, -6, K)
      p.line(4, 0, 9, 6, K)
      p.line(5, -1, 9, -5, M)
      p.line(5, 1, 9, 5, M)
      p.rect(9, -7, 2, 3, L)
      p.rect(9, 5, 2, 3, L)
      p.px(9, -7, K)
      p.px(9, 7, K)
      const pull = frame >= 0 && frame % 3 === 2 ? 1 : 0
      p.line(10, -6, 3 - pull, 0, K)
      p.line(10, 6, 3 - pull, 0, K)
      p.rect(1 - pull, -1, 3, 3, Y)
      p.px(2 - pull, 0, W)
    }),
  },
  {
    id: 'weapon-shock-rod',
    draw: weaponDraw((p, frame) => {
      p.box(-11, -2, 15, 5, K)
      p.hline(-10, -1, 13, M)
      p.hline(-10, 1, 13, M)
      fist(p)
      p.box(4, -1, 9, 3, L, { hi: W })

      p.hline(12, -3, 5, Y)
      p.hline(12, 3, 5, Y)
      p.px(12, -2, Y)
      p.px(12, 2, Y)
      p.px(16, -3, K)
      p.px(16, 3, K)
      const spark = frame >= 0 ? frame % 3 : 0
      if (spark === 0) {
        p.px(15, -1, W)
        p.px(16, 0, W)
        p.px(15, 1, W)
      } else if (spark === 1) {
        p.px(14, -2, W)
        p.px(15, 0, W)
        p.px(14, 2, W)
      }
    }),
  },
  {
    id: 'weapon-crossbow',
    draw: weaponDraw((p) => {
      p.box(-12, -2, 20, 6, M, { hi: L, sh: K })
      p.rect(-4, 3, 4, 3, M)
      p.hline(-4, 5, 4, K)
      fist(p)

      p.vline(7, -9, 19, K)
      p.vline(8, -8, 17, L)
      p.px(8, -9, W)
      p.px(8, 9, W)
      p.line(8, -9, -1, 0, K)
      p.line(8, 9, -1, 0, K)
      p.hline(1, 0, 14, W)
      p.hline(1, 0, 3, L)
      p.px(15, 0, K)
      p.px(14, -1, K)
      p.px(14, 1, K)
      p.px(2, -1, Y)
      p.px(2, 1, Y)
    }),
  },
  {
    id: 'weapon-anchor',
    draw: weaponDraw((p) => {

      for (let x = -11; x < 2; x += 3) {
        p.px(x, 0, K)
        p.px(x + 1, 0, L)
        p.px(x + 1, -1, K)
        p.px(x + 1, 1, K)
      }
      fist(p)
      p.disc(4, 0, 2, L)
      p.px(4, 0, 0)

      p.hline(6, -1, 9, K)
      p.hline(6, 0, 9, L)
      p.hline(6, 1, 9, K)
      p.vline(7, -6, 13, K)
      p.vline(8, -5, 11, L)
      p.px(8, -6, Y)
      p.px(8, 6, Y)
      p.line(14, 0, 12, -7, K)
      p.line(14, 0, 12, 7, K)
      p.line(15, 0, 13, -6, L)
      p.line(15, 0, 13, 6, L)
      p.poly(
        [
          [12, -7],
          [16, -6],
          [13, -3],
        ],
        L,
        K,
      )
      p.poly(
        [
          [12, 7],
          [16, 6],
          [13, 3],
        ],
        L,
        K,
      )
      p.px(16, 0, W)
    }),
  },
  {
    id: 'weapon-flamethrower',
    draw: weaponDraw((p, frame) => {

      p.line(-3, 3, -9, 6, K)
      p.line(-9, 6, -13, 4, K)
      p.px(-12, 5, M)
      fist(p)
      p.box(3, -4, 9, 8, M, { hi: L, sh: K })
      p.rect(4, -3, 7, 2, Y)
      p.rect(5, 1, 2, 2, W)
      p.box(11, -2, 5, 5, K)
      p.hline(12, 0, 3, L)
      p.px(14, -1, L)
      const lick = frame >= 0 ? frame % 3 : -1
      if (lick >= 0) {
        p.px(16, 0, W)
        p.px(17, 0, Y)
        p.px(17, lick === 1 ? -1 : 1, Y)
        if (lick === 2) p.px(18, 0, Y)
      }
    }),
  },
  {
    id: 'weapon-scythe',
    draw: weaponDraw((p) => {
      p.box(-14, -1, 20, 3, M, { hi: L })
      p.hline(-13, 0, 6, K)
      p.rect(-6, -3, 2, 7, M)
      p.vline(-7, -3, 7, K)
      fist(p)

      p.poly(
        [
          [5, -1],
          [8, -2],
          [12, -7],
          [16, -14],
          [13, -5],
          [9, 0],
          [6, 2],
        ],
        L,
        K,
      )
      p.line(9, -2, 15, -12, W)
      p.px(16, -14, W)
      p.rect(4, -2, 3, 4, K)
      p.px(5, -1, Y)
      p.px(5, 1, Y)
    }),
  },
  {
    id: 'weapon-chainsaw',
    draw: weaponDraw((p, frame) => {
      p.box(-9, -2, 6, 5, K)
      p.hline(-8, 0, 4, M)
      fist(p)

      p.box(3, -5, 9, 10, M, { hi: L, sh: K })
      p.rect(4, -4, 7, 2, Y)
      p.rect(5, 1, 3, 2, K)
      p.px(6, 1, W)
      p.px(2, -6, K)
      p.px(3, -7, Y)
      p.px(10, 5, K)

      p.box(11, -2, 7, 5, L, { hi: W })
      p.hline(12, 0, 5, M)
      const run = frame >= 0 ? frame % 2 : 0
      for (let x = 11 + run; x <= 17; x += 2) {
        p.px(x, -3, K)
        p.px(x + (run ? -1 : 1), 3, K)
      }
      p.px(18, 0, K)
      p.px(18, -1, run ? K : 0)
      p.px(18, 1, run ? 0 : K)
    }),
  },
  {
    id: 'weapon-lantern-staff',
    draw: weaponDraw((p, frame) => {
      p.box(-14, -1, 24, 3, M, { hi: L })
      p.hline(-13, 0, 9, K)
      p.px(-14, 0, Y)
      fist(p)

      p.vline(10, -2, 5, K)
      p.box(11, -6, 7, 12, Y, { hi: W, sh: M })
      p.rect(13, -4, 3, 8, W)
      const glow = frame >= 0 ? frame % 3 : 0
      p.rect(13, -1 + (glow === 1 ? -1 : 0), 3, 2, Y)
      p.px(14, 0, glow === 2 ? Y : W)
      p.hline(12, -7, 5, K)
      p.px(14, -8, K)
      p.px(14, 6, K)
    }),
  },
  {
    id: 'weapon-tesla',
    draw: weaponDraw((p, frame) => {
      p.box(-9, -2, 10, 5, M, { hi: L, sh: K })
      p.hline(-8, 0, 7, K)
      fist(p)

      p.box(3, -4, 8, 8, L, { hi: W })
      for (let x = 4; x <= 9; x += 2) p.vline(x, -3, 6, Y)
      p.px(10, -3, K)
      p.px(10, 3, K)
      p.disc(14, 0, 3, Y)
      p.px(13, -1, W)
      p.px(14, 0, W)
      const arc = frame >= 0 ? frame % 3 : 0
      const sparks = [
        [[17, -3], [18, 1]],
        [[18, -1], [16, 4]],
        [[17, 3], [18, -2]],
      ][arc]
      for (const [sx, sy] of sparks) p.px(sx, sy, W)
      p.px(17, 0, arc === 1 ? W : 0)
    }),
  },
  {
    id: 'weapon-gauntlets',
    draw: weaponDraw((p) => {
      p.box(-9, -3, 6, 7, L, { hi: W, sh: M })
      p.vline(-7, -2, 5, K)
      fist(p)

      p.box(-4, -6, 13, 13, L, { hi: W, sh: M, round: true })
      p.hline(-2, -3, 9, K)
      p.hline(-2, 1, 9, K)
      p.rect(-2, -2, 9, 1, M)
      for (const y of [-5, -2, 1, 4]) p.px(7, y, Y)
      for (const y of [-4, -1, 2, 5]) p.px(9, y, K)
      p.px(-3, -5, W)
      p.px(1, 4, M)
    }),
  },
  {
    id: 'weapon-glaive',
    draw: weaponDraw((p, frame) => {
      p.box(-14, -1, 20, 3, L, { hi: W })
      p.hline(-13, 0, 10, M)
      fist(p)

      p.disc(6, 0, 2, Y)
      p.px(6, 0, W)
      p.poly(
        [
          [8, -1],
          [11, -7],
          [17, -3],
          [19, 0],
          [17, 3],
          [11, 7],
          [8, 1],
        ],
        L,
        K,
      )
      p.hline(9, 0, 9, W)
      p.line(12, -5, 16, -2, W)
      const glint = frame >= 0 ? frame % 3 : 0
      p.px(11 + glint * 2, 3, W)
      p.px(14, -1 + glint, M)
    }),
  },
  {
    id: 'weapon-railgun',
    draw: weaponDraw((p, frame) => {
      p.box(-8, -3, 8, 7, M, { hi: L, sh: K })
      p.hline(-7, 0, 5, K)
      fist(p)

      p.box(3, -5, 8, 11, M, { hi: L, sh: K })
      p.disc(6, 7, 2, Y)
      p.px(6, 7, W)
      p.rect(4, -4, 5, 2, Y)
      p.rect(5, 0, 3, 2, K)
      p.px(6, 0, W)
      p.hline(10, -4, 9, K)
      p.hline(10, -3, 9, Y)
      p.hline(10, -2, 9, L)
      p.hline(10, 2, 9, L)
      p.hline(10, 3, 9, Y)
      p.hline(10, 4, 9, K)
      p.px(19, -3, K)
      p.px(19, 3, K)
      const charge = frame >= 0 ? frame % 3 : -1
      if (charge >= 0) {
        p.px(12 + charge * 2, 0, W)
        p.px(13 + charge * 2, -1, W)
        p.px(13 + charge * 2, 1, W)
      }
    }),
  },
  {
    id: 'weapon-sawmill-axe',
    draw: weaponDraw((p) => {
      p.box(-12, -2, 18, 5, M, { hi: L })
      p.hline(-11, 0, 5, K)
      p.px(-12, 0, L)
      fist(p)

      p.box(5, -8, 8, 17, L, { hi: W, sh: M })
      p.vline(12, -7, 15, W)
      p.px(12, -8, K)
      p.px(12, 8, K)
      p.px(5, -8, 0)
      p.px(5, 8, 0)
      p.px(6, -8, K)
      p.px(6, 8, K)
      p.px(5, -7, K)
      p.px(5, 7, K)
      p.rect(7, -2, 4, 5, Y)
      p.px(8, -1, W)
      p.px(9, 1, M)
      p.hline(6, -4, 6, M)
      p.hline(6, 4, 6, M)
    }),
  },
]
