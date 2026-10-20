import { fist, weaponDraw } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

function haft(p, length, fill = M, hi = L) {
  p.box(-length, -2, length + 4, 5, fill, { hi })
}

function blade(p, x0, length, half, fill = L, edge = W) {
  p.poly(
    [
      [x0, -half],
      [x0 + length - 3, -half],
      [x0 + length, 0],
      [x0 + length - 3, half],
      [x0, half],
    ],
    fill,
    K,
  )
  p.hline(x0 + 1, 0, length - 3, edge)
}

function spark(p, x, y, flash) {
  p.px(x, y, flash ? W : Y)
  if (flash) {
    p.px(x - 1, y, Y)
    p.px(x + 1, y, Y)
    p.px(x, y - 1, Y)
    p.px(x, y + 1, Y)
  }
}

function pulse(frame, period = 3) {
  return frame >= 0 ? frame % period : 0
}

export const WEAPONS_3 = [
  {
    id: 'weapon-branch-club',
    draw: weaponDraw((p) => {
      haft(p, 10)
      fist(p)

      p.box(4, -3, 10, 7, M, { hi: L, sh: K, round: true })
      p.box(11, -4, 6, 9, M, { hi: L, sh: K, round: true })
      p.px(8, -5, K)
      p.px(8, -4, M)
      p.px(13, 5, K)
      p.px(13, 6, M)
      p.px(14, -2, K)
    }),
  },
  {
    id: 'weapon-bow',
    draw: weaponDraw((p, frame) => {

      const pull = frame >= 0 && (frame === 2 || frame === 5) ? 3 : 0
      p.line(2, -16, 4, 0, M)
      p.line(2, 16, 4, 0, M)
      p.line(1, -16, 3, 0, K)
      p.line(1, 16, 3, 0, K)
      p.line(2, -16, -3 - pull, 0, L)
      p.line(2, 16, -3 - pull, 0, L)
      fist(p)
      p.hline(-3 - pull, 0, 10 + pull, K)
      p.px(7 + 1, 0, Y)
      p.px(1, -16, Y)
      p.px(1, 16, Y)
    }),
  },
  {
    id: 'weapon-spear',
    draw: weaponDraw((p) => {
      haft(p, 16)
      fist(p)
      p.hline(-15, 0, 10, K)

      p.rect(4, -1, 4, 3, K)
      p.px(5, 0, Y)
      p.poly(
        [
          [8, -3],
          [15, -1],
          [18, 0],
          [15, 1],
          [8, 3],
        ],
        L,
        K,
      )
      p.hline(9, 0, 8, W)
    }),
  },
  {
    id: 'weapon-machete',
    draw: weaponDraw((p) => {
      p.box(-8, -2, 12, 5, K)
      p.hline(-7, 0, 10, M)
      fist(p)

      p.poly(
        [
          [4, -2],
          [14, -4],
          [19, -2],
          [18, 2],
          [4, 3],
        ],
        L,
        K,
      )
      p.hline(5, 2, 13, W)
      p.px(16, -3, W)
    }),
  },
  {
    id: 'weapon-torch',
    draw: weaponDraw((p, frame) => {
      haft(p, 9)
      fist(p)
      const flick = pulse(frame)

      p.box(4, -3, 6, 7, K)
      p.hline(5, -1, 4, L)
      p.hline(5, 1, 4, L)
      p.poly(
        [
          [9, -4],
          [14 + flick, -6 + flick],
          [18, -1],
          [15, 3 - flick],
          [9, 4],
        ],
        Y,
        Y,
      )
      p.rect(10, -2, 4, 4, W)
      p.px(15, flick - 1, W)
    }),
  },
  {
    id: 'weapon-net',
    draw: weaponDraw((p, frame) => {
      haft(p, 12)
      fist(p)
      const sway = frame >= 0 ? [0, 1, 1, 0, -1, -1][frame] : 0

      p.ellipse(10, 0, 6, 5, 0, K)
      for (let y = -4; y <= 4; y += 2) p.hline(5, y + sway, 11, M)
      for (let x = 5; x <= 15; x += 2) p.vline(x, -4 + sway, 9, M)
      p.px(16, 0, L)
    }),
  },
  {
    id: 'weapon-boomerang',
    draw: weaponDraw((p, frame) => {
      const spin = pulse(frame)
      haft(p, 4, L)
      fist(p)

      p.poly(
        [
          [3, -2],
          [12, -8],
          [15, -6],
          [9, 0],
          [15, 6],
          [12, 8],
          [3, 2],
        ],
        M,
        K,
      )
      p.line(5, -1, 11, -5, spin === 1 ? W : L)
      p.line(5, 1, 11, 5, spin === 2 ? W : L)
      p.px(13, -6 + spin, Y)
    }),
  },
  {
    id: 'weapon-mallet',
    draw: weaponDraw((p) => {
      haft(p, 11)
      fist(p)

      p.box(5, -7, 11, 15, M, { hi: L, sh: K })
      p.vline(6, -6, 13, K)
      p.vline(14, -6, 13, K)
      p.vline(7, -5, 11, L)
      p.hline(6, 0, 9, K)
    }),
  },
  {
    id: 'weapon-hook',
    draw: weaponDraw((p) => {
      haft(p, 10, L, W)
      fist(p)

      p.box(4, -2, 6, 5, L, { hi: W, sh: K })
      p.line(9, 2, 15, 7, K)
      p.line(15, 7, 18, 1, K)
      p.line(10, 2, 15, 6, L)
      p.line(15, 6, 17, 2, L)
      p.px(18, 0, W)
      p.px(12, -2, Y)
    }),
  },
  {
    id: 'weapon-paddle-blade',
    draw: weaponDraw((p) => {
      haft(p, 12)
      fist(p)
      p.hline(-11, 0, 8, K)

      p.poly(
        [
          [4, -2],
          [8, -6],
          [17, -6],
          [19, 0],
          [17, 6],
          [8, 6],
          [4, 2],
        ],
        M,
        K,
      )
      p.line(8, -5, 17, -5, Y)
      p.line(18, -1, 18, 1, W)
      p.vline(11, -3, 7, L)
    }),
  },
  {
    id: 'weapon-fishing-rod',
    draw: weaponDraw((p, frame) => {
      const bob = frame >= 0 ? [0, 1, 1, 0, -1, -1][frame] : 0
      haft(p, 7)
      fist(p)

      p.line(4, 0, 20, -8, K)
      p.line(4, -1, 19, -9, L)
      p.disc(-3, 4, 2, L, K)
      p.px(-3, 4, Y)
      p.line(20, -8, 20, 2 + bob, L)
      p.rect(19, 3 + bob, 3, 3, Y)
      p.px(20, 4 + bob, W)
    }),
  },
  {
    id: 'weapon-shears',
    draw: weaponDraw((p, frame) => {
      const open = frame >= 0 && frame % 3 === 1 ? 2 : 0
      haft(p, 8, Y, W)
      p.box(-8, 2, 6, 3, Y, { hi: W })
      fist(p)

      blade(p, 4, 15, 2 + open, L)
      p.poly(
        [
          [4, 1],
          [16, 2 + open],
          [18, 4 + open],
          [4, 4],
        ],
        L,
        K,
      )
      p.px(4, 0, K)
      p.px(5, 0, Y)
    }),
  },
  {
    id: 'weapon-pitchfork',
    draw: weaponDraw((p) => {
      haft(p, 14)
      fist(p)
      p.hline(-13, 0, 12, K)

      p.box(4, -5, 3, 11, L, { hi: W, sh: K })
      for (const y of [-4, 0, 4]) {
        p.hline(6, y, 11, L)
        p.px(17, y, W)
        p.px(7, y - 1, K)
      }
      p.hline(6, -5, 10, K)
      p.hline(6, 5, 10, K)
    }),
  },
  {
    id: 'weapon-bat',
    draw: weaponDraw((p) => {
      p.box(-9, -2, 13, 5, M, { hi: L })
      p.hline(-8, 0, 10, K)
      fist(p)

      p.box(4, -3, 14, 7, M, { hi: L, sh: K, round: true })
      for (const x of [8, 12, 16]) {
        p.px(x, -4, L)
        p.px(x, -5, W)
        p.px(x + 1, 4, L)
      }
      p.hline(-7, -2, 3, L)
    }),
  },
  {
    id: 'weapon-chain',
    draw: weaponDraw((p, frame) => {
      const swing = frame >= 0 ? [0, 1, 2, 1, 0, -1][frame] : 0
      haft(p, 6, L, W)
      fist(p)

      for (let i = 0; i < 6; i++) {
        const x = 4 + i * 2
        const y = Math.round(Math.sin((i + swing) * 0.9) * 2)
        p.px(x, y, i % 2 ? L : K)
        p.px(x, y + 1, i % 2 ? K : L)
      }
      const ex = 16
      const ey = Math.round(Math.sin((6 + swing) * 0.9) * 2)
      p.disc(ex, ey, 2, L, K)
      p.px(ex, ey, W)
    }),
  },
  {
    id: 'weapon-bottle',
    draw: weaponDraw((p) => {
      p.box(-7, -2, 11, 5, M, { hi: L })
      fist(p)

      p.box(4, -4, 12, 9, M, { hi: L, sh: K, round: true })
      p.rect(5, -3, 9, 2, L)
      p.poly(
        [
          [15, -4],
          [19, -5],
          [17, -1],
          [20, 1],
          [16, 2],
          [18, 4],
          [15, 4],
        ],
        M,
        K,
      )
      p.rect(7, -1, 5, 3, Y)
      p.px(8, 0, W)
    }),
  },
  {
    id: 'weapon-megaphone',
    draw: weaponDraw((p, frame) => {
      const beat = pulse(frame)
      haft(p, 4, L, W)
      fist(p)

      p.poly(
        [
          [3, -2],
          [13, -7],
          [15, -7],
          [15, 7],
          [13, 7],
          [3, 2],
        ],
        L,
        K,
      )
      p.rect(5, -1, 8, 2, Y)
      p.vline(14, -6, 13, M)
      p.vline(17 + beat, -3, 7, beat === 2 ? W : Y)
      p.px(19 + beat, -5, Y)
      p.px(19 + beat, 5, Y)
    }),
  },
  {
    id: 'weapon-dart-gun',
    draw: weaponDraw((p) => {
      p.box(-3, 0, 6, 7, M, { hi: L, sh: K })
      fist(p)

      p.box(-2, -4, 14, 5, L, { hi: W, sh: M, round: true })
      p.hline(12, -2, 6, K)
      p.px(18, -2, Y)
      p.px(17, -3, W)
      for (const x of [2, 7]) {
        p.hline(x, -6, 4, Y)
        p.px(x + 4, -6, W)
        p.px(x - 1, -6, K)
      }
    }),
  },
  {
    id: 'weapon-crystal-prod',
    draw: weaponDraw((p, frame) => {
      const flash = pulse(frame) === 1
      haft(p, 10, L, W)
      fist(p)

      p.box(4, -1, 9, 3, L, { hi: W })
      p.hline(5, 0, 7, M)
      p.poly(
        [
          [13, -3],
          [19, 0],
          [13, 3],
        ],
        Y,
        K,
      )
      p.px(15, 0, W)
      spark(p, 20, -3, flash)
      spark(p, 21, 3, !flash)
    }),
  },
  {
    id: 'weapon-visitor-staff',
    draw: weaponDraw((p, frame) => {
      const glow = pulse(frame)
      p.box(-16, -1, 22, 3, K)
      p.hline(-15, 0, 20, M)
      fist(p)

      p.line(6, 0, 11, -5, K)
      p.line(6, 0, 11, 5, K)
      p.line(11, -5, 14, -5, K)
      p.line(11, 5, 14, 5, K)
      p.poly(
        [
          [14, -3],
          [18, 0],
          [14, 3],
          [11, 0],
        ],
        K,
        K,
      )
      p.px(14, 0, glow === 2 ? L : M)
      p.px(13, -1, M)
      if (glow === 1) {
        p.px(19, 0, L)
        p.px(10, 0, L)
      }
    }),
  },
  {
    id: 'weapon-ozone-blade',
    draw: weaponDraw((p, frame) => {
      const shimmer = pulse(frame, 2)
      haft(p, 7, K, M)
      fist(p)

      p.box(4, -3, 3, 7, L, { hi: W })
      p.line(7, -2, 20, -1, shimmer ? W : L)
      p.line(7, 2, 20, 1, shimmer ? L : W)
      p.px(21, 0, W)
      for (let x = 9; x < 19; x += 3) p.px(x, shimmer ? -4 : 4, L)
      p.px(14, 0, W)
    }),
  },
  {
    id: 'weapon-seed-lance',
    draw: weaponDraw((p, frame) => {
      const beat = pulse(frame, 4)
      haft(p, 15, M)
      fist(p)
      p.hline(-14, 0, 12, K)

      p.poly(
        [
          [4, -4],
          [12, -5],
          [19, 0],
          [12, 5],
          [4, 4],
        ],
        M,
        K,
      )
      p.line(5, -2, 15, -1, L)
      p.px(12, 0, beat === 0 ? W : Y)
      p.px(11, 0, Y)
      p.px(13, 0, Y)
      if (beat === 2) {
        p.px(12, -2, Y)
        p.px(12, 2, Y)
      }
    }),
  },
  {
    id: 'weapon-gravity-orb',
    draw: weaponDraw((p, frame) => {
      const drift = frame >= 0 ? [0, -1, -1, 0, 1, 1][frame] : 0
      haft(p, 5, L, W)
      p.box(2, -3, 6, 7, L, { hi: W, sh: K })
      fist(p)

      p.disc(15, drift, 4, K)
      p.px(14, drift - 1, M)
      p.px(13, drift - 2, L)
      p.px(10 + drift, -5, L)
      p.px(20 - drift, 4, L)
      p.px(11, 0, M)
    }),
  },
  {
    id: 'weapon-buckler',
    draw: weaponDraw((p) => {
      p.box(-4, -2, 8, 5, M, { hi: L })
      fist(p)

      p.disc(8, 0, 8, L, K)
      p.disc(8, 0, 6, L, M)
      p.disc(8, 0, 2, Y, K)
      p.px(8, 0, W)
      for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) p.px(8 + dx, dy, K)
      p.px(4, -4, W)
    }),
  },
  {
    id: 'weapon-nail-gun',
    draw: weaponDraw((p, frame) => {
      const kick = frame >= 0 && frame % 3 === 0 ? 1 : 0
      p.box(-3, 0, 6, 7, Y, { hi: W, sh: K })
      fist(p)

      p.box(-2, -5, 13, 6, Y, { hi: W, sh: K, round: true })
      p.box(9, -3, 7, 3, L, { hi: W })
      p.line(-4, 2, -8, 5, K)
      p.px(-9, 6, K)
      p.hline(16 + kick, -2, 3, L)
      p.px(19 + kick, -2, W)
    }),
  },
]
