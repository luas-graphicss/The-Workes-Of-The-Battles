import { isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const side = (dir) => dir === 'w'

const PAIR = [15, 24]

const lift = (frame, foot) => (frame < 0 ? 0 : foot === 0 ? Number(frame === 1 || frame === 2) : Number(frame === 4 || frame === 5))

const stride = (frame) => (frame < 0 ? 0 : [0, -1, -1, 0, 1, 1][frame])

function tinCan(p, x, y, w) {

  p.box(x, y, w, 6, L, { hi: W, sh: M })
  p.rect(x + 1, y + 2, w - 2, 2, Y)
  p.px(x + 2, y + 2, W)
  p.hline(x + 1, y + 4, w - 2, M)
  p.box(x + 1, y - 6, w - 2, 7, L, { hi: W, sh: M })
  p.hline(x + 2, y - 2, w - 4, K)
}

function treads(p, x, y, w, h, roll, fill, light, dark) {
  p.box(x, y, w, h, fill, { hi: light, sh: dark, round: true })
  for (let row = y + 3 + roll; row < y + h - 1; row += 2) p.hline(x + 2, row, w - 4, K)
}

function flower(p, x, y, stage) {
  if (stage === 0) {
    p.px(x, y, Y)
    p.px(x, y + 1, M)
    return
  }
  if (stage === 1) {
    p.px(x, y, W)
    p.px(x - 1, y, Y)
    p.px(x + 1, y, Y)
    p.px(x, y - 1, Y)
    p.px(x, y + 1, Y)
    return
  }
  if (stage === 2) {
    p.px(x - 1, y, L)
    p.px(x + 1, y, L)
    p.px(x, y, Y)
  }
}

export const MOBILITY_2 = [
  {
    id: 'move-clogs',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.poly(
          [
            [12 + dx, 43],
            [13 + dx, 40],
            [16 + dx, 38],
            [28 + dx, 38],
            [28 + dx, 44],
            [12 + dx, 44],
          ],
          Y,
          K,
        )
        p.hline(14 + dx, 39, 5, W)
        p.rect(19 + dx, 38, 8, 2, K)
        p.hline(13 + dx, 43, 15, M)
        p.px(15 + dx, 41, W)
        p.px(23 + dx, 41, M)
        return
      }
      PAIR.forEach((x, foot) => {
        const y = 38 - lift(frame, foot)
        p.box(x, y, 9, 7, Y, { hi: W, sh: M, round: true })
        if (isBack(dir)) {
          p.hline(x + 2, y + 1, 5, M)
          p.px(x + 4, y + 3, M)
        } else {
          p.rect(x + 2, y + 1, 5, 2, K)
          p.px(x + 3, y + 4, W)
        }
        p.hline(x + 1, y + 6, 7, K)
      })
    },
  },
  {
    id: 'move-stilts',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        const up = frame >= 0 && frame % 3 === 2 ? 1 : 0
        tinCan(p, 15 + dx, 42 - up, 12)
        p.line(16 + dx, 42 - up, 20, 34, K)
        p.line(26 + dx, 42 - up, 22, 34, K)
        return
      }
      PAIR.forEach((x, foot) => {
        const y = 42 - lift(frame, foot)
        tinCan(p, x, y, 9)
        const hand = foot === 0 ? 11 : 36
        p.line(foot === 0 ? x : x + 8, y, hand, 34, K)
      })
    },
  },
  {
    id: 'move-paddle',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        const flap = frame >= 0 && frame % 3 === 1 ? 1 : 0
        p.poly(
          [
            [8 + dx, 44 - flap],
            [11 + dx, 41],
            [20 + dx, 39],
            [27 + dx, 40],
            [27 + dx, 44],
          ],
          Y,
          K,
        )
        p.line(11 + dx, 43 - flap, 19 + dx, 41, M)
        p.line(10 + dx, 44 - flap, 13 + dx, 43, W)
        p.box(19 + dx, 37, 9, 5, M, { hi: L, sh: K })
        p.px(21 + dx, 39, W)
        return
      }
      PAIR.forEach((x, foot) => {
        const up = lift(frame, foot)
        const y = 38 - up
        p.poly(
          [
            [x + 1, y + 2],
            [x + 7, y + 2],
            [x + 9, y + 7 - up],
            [x - 1, y + 7 - up],
          ],
          Y,
          K,
        )
        p.line(x + 4, y + 3, x + 1, y + 6 - up, M)
        p.line(x + 4, y + 3, x + 4, y + 6 - up, M)
        p.line(x + 4, y + 3, x + 7, y + 6 - up, M)
        p.px(x + 2, y + 3, W)
        p.box(x + 1, y - 1, 7, 4, M, { hi: L, sh: K })
      })
    },
  },
  {
    id: 'move-crawler',
    draw(p, dir, frame) {
      const roll = frame >= 0 ? frame % 2 : 0
      if (side(dir)) {
        p.box(8, 37, 26, 10, M, { round: true })
        p.rect(10, 39, 22, 6, K)
        for (const wx of [13, 21, 29]) {
          p.disc(wx, 42, 2, L)
          p.px(wx, 42, M)
        }
        for (let x = 9 + roll; x < 33; x += 2) {
          p.px(x, 37, L)
          p.px(x, 46, L)
        }
        p.box(10, 34, 22, 4, L, { hi: W, sh: M })
        p.px(12, 35, Y)
        p.px(29, 35, Y)
        return
      }
      for (const x of [12, 25]) {
        treads(p, x, 36, 11, 11, roll, M, L, K)
        p.box(x + 1, 35, 9, 3, L, { hi: W })
        p.px(x + 2, 36, Y)
        p.px(x + 8, 36, Y)
      }
    },
  },
  {
    id: 'move-skis',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.hline(8 + dx, 42, 26, K)
        p.rect(8 + dx, 43, 26, 2, Y)
        p.hline(8 + dx, 45, 26, K)
        p.hline(9 + dx, 43, 24, W)

        p.px(7 + dx, 44, K)
        p.px(6 + dx, 43, K)
        p.px(6 + dx, 42, K)
        p.px(7 + dx, 41, K)
        p.px(7 + dx, 42, Y)
        p.px(7 + dx, 43, Y)
        p.px(34 + dx, 43, K)
        p.px(34 + dx, 44, K)
        p.box(15 + dx, 37, 12, 6, L, { hi: W, sh: M })
        p.hline(16 + dx, 40, 10, K)
        p.px(25 + dx, 39, Y)
        return
      }
      PAIR.forEach((x, foot) => {
        const glide = lift(frame, foot)

        p.box(x + 1, 40 + glide, 7, 8 - glide, Y, { sh: M, round: true })
        p.vline(x + 4, 42 + glide, 4 - glide, W)
        p.hline(x + 2, 46, 5, W)
        p.box(x, 37, 9, 5, L, { hi: W, sh: M })
        p.hline(x + 1, 39, 7, K)
        p.px(x + 7, 38, Y)
      })
    },
  },
  {
    id: 'move-pogo',
    draw(p, dir, frame) {
      const phase = frame >= 0 ? frame % 3 : 0
      const cx = side(dir) ? 21 : 24
      const bar = side(dir) ? { x: 14, w: 15 } : { x: 15, w: 19 }
      const by = 42 + (phase === 1 ? 1 : phase === 2 ? -1 : 0)
      p.box(cx - 3, 33, 7, by - 32, M, { hi: L, sh: K })
      p.px(cx - 1, 35, W)
      p.box(bar.x, by, bar.w, 3, L, { hi: W, sh: M })
      p.px(bar.x + 1, by + 1, Y)
      p.px(bar.x + bar.w - 2, by + 1, Y)

      for (let y = by + 3; y < 46; y++) p.hline(cx - 2 + ((y - by) % 2), y, 4, (y - by) % 2 ? Y : K)
      p.box(cx - 3, 45, 7, 3, K)
      p.hline(cx - 2, 46, 5, M)
    },
  },
  {
    id: 'move-roots',
    draw(p, dir, frame) {
      const sway = frame >= 0 ? [0, 1, 0, -1, 0, 1][frame] : 0
      const bundles = side(dir) ? [[14, 15]] : [[14, 10], [24, 10]]
      bundles.forEach(([x, w], index) => {
        const tips = w > 12 ? [x - 1, x + 4, x + 10, x + 15] : [x - 1, x + 4, x + 9]
        tips.forEach((tx, i) => {
          const s = (i + index) % 2 ? -sway : sway
          const from = Math.max(x + 1, Math.min(x + w - 2, tx + 1))
          p.line(from, 42, tx + s, 46, K)
          p.line(from + 1, 42, tx + s + 1, 45, M)
          p.px(tx + s, 46, L)
        })
        p.box(x, 37, w, 6, M, { hi: L, sh: K })
        p.px(x + 2, 39, K)
        p.px(x + w - 3, 40, K)
        p.hline(x + 3, 41, w - 6, K)

        const leaf = index === 0 ? x - 1 : x + w
        const lean = index === 0 ? -1 : 1
        p.px(leaf, 38, K)
        p.px(leaf + lean, 37, L)
        p.px(leaf + lean * 2, 36, Y)
        p.px(leaf, 37, L)
      })
    },
  },
  {
    id: 'move-glider',
    draw(p, dir, frame) {
      const flap = frame >= 0 ? [0, -1, -2, -1, 0, 1][frame] : 0
      if (side(dir)) {
        p.poly(
          [
            [26, 39],
            [36, 34 + flap],
            [35, 38 + flap],
            [27, 42],
          ],
          W,
          K,
        )
        p.line(28, 40, 34, 36 + flap, L)
        p.box(15, 38, 13, 6, L, { hi: W, sh: M })
        p.hline(16, 41, 11, K)
        p.px(17, 39, Y)
        return
      }
      PAIR.forEach((x, foot) => {
        const out = foot === 0 ? -1 : 1
        const ankle = foot === 0 ? x : x + 8
        p.poly(
          [
            [ankle, 39],
            [ankle + out * 8, 34 + flap],
            [ankle + out * 7, 38 + flap],
            [ankle, 42],
          ],
          W,
          K,
        )
        p.line(ankle + out, 40, ankle + out * 6, 36 + flap, L)
        p.box(x, 38, 9, 6, L, { hi: W, sh: M })
        p.hline(x + 1, 41, 7, K)
        p.px(x + 4, 39, Y)
      })
    },
  },
  {
    id: 'move-gold-tracks',
    draw(p, dir, frame) {
      const roll = frame >= 0 ? frame % 2 : 0
      if (side(dir)) {
        p.box(9, 36, 24, 11, Y, { hi: W, sh: M, round: true })
        p.rect(11, 39, 20, 5, M)
        for (const wx of [14, 21, 28]) {
          p.disc(wx, 41, 2, Y)
          p.px(wx, 41, K)
        }
        for (let x = 10 + roll; x < 32; x += 3) p.px(x, 46, K)
        for (let x = 11 + roll; x < 31; x += 3) p.px(x, 37, W)
        return
      }
      for (const x of [12, 25]) {
        treads(p, x, 36, 11, 11, roll, Y, W, M)
        p.vline(x + 5, 38, 7, M)
        for (const [sx, sy] of [
          [x + 2, 37],
          [x + 8, 37],
          [x + 2, 45],
          [x + 8, 45],
        ]) {
          p.px(sx, sy, W)
        }
      }
    },
  },
  {
    id: 'move-magnet',
    draw(p, dir, frame) {
      const pulse = frame >= 0 ? frame % 3 : 0
      const field = (x, w) => {
        p.hline(x + pulse % 2, 45, w - (pulse % 2) * 2, pulse === 1 ? W : Y)
        if (pulse !== 2) p.hline(x + 2, 47, w - 4, pulse === 0 ? Y : W)
      }
      if (side(dir)) {
        p.box(14, 37, 15, 5, L, { hi: W, sh: M, round: true })
        p.px(16, 39, Y)
        p.box(15, 41, 4, 3, Y, { hi: W })
        p.box(24, 41, 4, 3, Y, { hi: W })
        p.hline(19, 41, 5, K)
        field(15, 13)
        return
      }
      PAIR.forEach((x) => {
        p.box(x, 37, 9, 5, L, { hi: W, sh: M, round: true })
        p.px(x + 2, 38, Y)
        p.box(x, 41, 3, 3, Y)
        p.box(x + 6, 41, 3, 3, Y)
        p.hline(x + 3, 41, 3, K)
        field(x + 1, 7)
      })
    },
  },
  {
    id: 'move-thunder',
    draw(p, dir, frame) {
      const spark = frame >= 0 ? frame % 3 : -1
      const boots = side(dir) ? [[14, 15]] : [[15, 9], [24, 9]]
      boots.forEach(([x, w], index) => {
        p.box(x, 36, w, 7, M, { hi: L, sh: K })
        p.box(x - 1, 42, w + 1, 3, L, { hi: W })
        const bx = x + Math.floor(w / 2)
        p.px(bx, 37, Y)
        p.px(bx - 1, 38, Y)
        p.px(bx, 38, Y)
        p.px(bx, 39, Y)
        p.px(bx + 1, 39, Y)
        p.px(bx, 40, W)
        if (spark === index) {
          p.px(x - 2, 44, W)
          p.px(x - 1, 46, Y)
          p.px(x + w, 45, Y)
          p.px(x + w + 1, 43, W)
        }
      })
    },
  },
  {
    id: 'move-comet',
    draw(p, dir, frame) {
      const flick = frame >= 0 ? frame % 3 : 0
      if (side(dir)) {
        for (let i = 0; i < 7; i++) {
          const x = 31 + i * 2
          p.px(x, 40 + (i % 2), (i + flick) % 3 === 0 ? W : Y)
          if (i < 3) p.px(x + 1, 40 + (i % 2), L)
        }
        p.poly(
          [
            [26, 38],
            [31, 40],
            [26, 42],
          ],
          W,
          K,
        )
        p.box(14, 37, 14, 6, L, { hi: W, sh: M, round: true })
        p.px(16, 39, Y)
        return
      }
      PAIR.forEach((x) => {
        p.px(x + 4, 46, flick === 0 ? W : Y)
        if (flick !== 2) p.px(x + 3 + flick * 2, 47, Y)
        p.poly(
          [
            [x + 2, 42],
            [x + 6, 42],
            [x + 4, 45],
          ],
          W,
          K,
        )
        p.box(x, 37, 9, 6, L, { hi: W, sh: M, round: true })
        p.px(x + 2, 38, Y)
      })
    },
  },
  {
    id: 'move-heron-legs',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)

        p.line(22, 40, 24 + dx, 43, K)
        p.line(24 + dx, 43, 22 + dx * 2, 46, K)
        p.line(21, 40, 23 + dx, 43, Y)
        p.line(23 + dx, 43, 21 + dx * 2, 46, Y)
        p.hline(16 + dx * 2, 46, 7, Y)
        p.hline(16 + dx * 2, 47, 8, K)
        p.px(15 + dx * 2, 46, K)
        p.box(15, 35, 13, 6, W, { sh: L, round: true })
        for (let x = 16; x < 27; x += 2) p.px(x, 40, L)
        p.px(17, 37, L)
        return
      }
      PAIR.forEach((x, foot) => {
        const up = lift(frame, foot)
        p.rect(x + 3, 40, 3, 6 - up, K)
        p.vline(x + 4, 40, 6 - up, Y)
        p.hline(x + 1, 46 - up, 7, Y)
        p.hline(x, 47 - up, 9, K)
        p.px(x, 46 - up, K)
        p.px(x + 8, 46 - up, K)
        p.px(x + 2, 47 - up, Y)
        p.px(x + 6, 47 - up, Y)
        p.box(x, 35, 9, 6, W, { sh: L, round: true })
        for (let fx = x + 1; fx < x + 8; fx += 2) p.px(fx, 40, L)
        p.px(x + 2, 37, L)
      })
    },
  },
  {
    id: 'move-bloom-steps',
    draw(p, dir, frame) {
      const stage = (offset) => (frame < 0 ? 1 : (frame + offset) % 3)
      if (side(dir)) {
        flower(p, 31, 45, stage(0))
        flower(p, 36, 46, stage(2))
        p.hline(13, 45, 16, K)
        p.hline(14, 44, 14, W)
        p.px(14, 44, L)
        p.px(27, 44, L)
        p.line(16, 43, 19, 38, Y)
        p.line(17, 43, 20, 38, K)
        p.hline(21, 41, 6, Y)
        p.px(27, 41, K)
        return
      }
      PAIR.forEach((x, foot) => {
        flower(p, foot === 0 ? x - 2 : x + 10, 45, stage(foot))
        p.hline(x, 45, 9, K)
        p.hline(x + 1, 44, 7, W)
        p.px(x + 1, 44, L)
        p.px(x + 7, 44, L)
        p.hline(x + 1, 39, 7, Y)
        p.hline(x + 1, 42, 7, Y)
        p.px(x, 39, K)
        p.px(x + 8, 39, K)
        p.px(x, 42, K)
        p.px(x + 8, 42, K)
        p.px(x + 4, 39, W)
      })
    },
  },
]
