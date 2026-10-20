import { isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const side = (dir) => dir === 'w'

const PAIR = [15, 24]

const lift = (frame, foot) => (frame < 0 ? 0 : foot === 0 ? Number(frame === 1 || frame === 2) : Number(frame === 4 || frame === 5))

const stride = (frame) => (frame < 0 ? 0 : [0, -1, -1, 0, 1, 1][frame])
const pulse = (frame, period = 3) => (frame >= 0 ? frame % period : 0)

function sideBoot(p, dx, fill, hi, sh) {
  p.poly(
    [
      [13 + dx, 38],
      [26 + dx, 38],
      [29 + dx, 42],
      [29 + dx, 44],
      [13 + dx, 44],
    ],
    fill,
    K,
  )
  p.hline(14 + dx, 39, 10, hi)
  p.hline(14 + dx, 43, 14, sh)
}

function pair(p, frame, shoe) {
  PAIR.forEach((x, foot) => shoe(x, 38 - lift(frame, foot), foot))
}

function boot(p, x, y, fill, hi, sh) {
  p.box(x, y, 9, 7, fill, { hi, sh, round: true })
}

function platform(p, dir, frame, h, fill, hi, sh) {
  if (side(dir)) {
    const dx = stride(frame)
    p.box(10 + dx, 44 - h, 20, h, fill, { hi, sh, round: true })
    return
  }
  p.box(13, 44 - h, 20, h, fill, { hi, sh, round: true })
}

function paw(p, x, y, fill) {
  p.box(x, y, 9, 6, fill, { hi: W, sh: K, round: true })
  p.px(x + 2, y + 5, K)
  p.px(x + 4, y + 5, K)
  p.px(x + 6, y + 5, K)
}

export const MOBILITY_3 = [
  {
    id: 'move-moss-boots',
    draw(p, dir, frame) {
      if (side(dir)) {
        sideBoot(p, stride(frame), M, L, K)
        p.px(16 + stride(frame), 37, L)
        p.px(20 + stride(frame), 37, L)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, M, L, K)
        p.px(x + 2, y - 1, L)
        p.px(x + 5, y - 1, L)
        p.px(x + 4, y + 3, L)
      })
    },
  },
  {
    id: 'move-bark-boots',
    draw(p, dir, frame) {
      if (side(dir)) {
        sideBoot(p, stride(frame), M, L, K)
        for (let x = 15; x < 27; x += 3) p.vline(x + stride(frame), 39, 4, K)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, M, L, K)
        p.vline(x + 3, y + 1, 5, K)
        p.vline(x + 6, y + 2, 4, K)
      })
    },
  },
  {
    id: 'move-deer-hooves',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.box(16 + dx, 37, 8, 5, Y, { hi: W, sh: M })
        p.box(15 + dx, 41, 10, 4, K)
        p.hline(16 + dx, 42, 8, L)
        p.px(20 + dx, 43, K)
        return
      }
      pair(p, frame, (x, y) => {
        p.box(x + 1, y, 7, 4, Y, { hi: W, sh: M })
        p.box(x, y + 3, 9, 4, K)
        p.hline(x + 1, y + 4, 7, L)
        p.vline(x + 4, y + 4, 2, K)
      })
    },
  },
  {
    id: 'move-wolf-paws',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.box(13 + dx, 38, 15, 6, L, { hi: W, sh: K, round: true })
        p.px(26 + dx, 44, K)
        p.px(23 + dx, 44, K)
        p.px(20 + dx, 44, K)
        p.hline(14 + dx, 40, 6, M)
        return
      }
      pair(p, frame, (x, y) => {
        paw(p, x, y + 1, L)
        p.px(x + 4, y + 2, M)
      })
    },
  },
  {
    id: 'move-leaf-shoes',
    draw(p, dir, frame) {

      if (side(dir)) {
        const dx = stride(frame)
        p.ellipse(21 + dx, 43, 11, 2, M, K)
        p.hline(13 + dx, 43, 17, L)
        p.box(17 + dx, 38, 8, 5, L, { hi: W, sh: M })
        return
      }
      pair(p, frame, (x, y) => {
        p.ellipse(x + 4, y + 6, 6, 2, M, K)
        p.px(x + 2, y + 6, L)
        p.px(x + 6, y + 6, L)
        p.box(x + 1, y, 7, 6, L, { hi: W, sh: M })
      })
    },
  },
  {
    id: 'move-mushroom-pads',
    draw(p, dir, frame) {
      const squash = frame >= 0 && (frame === 1 || frame === 4) ? 1 : 0
      if (side(dir)) {
        const dx = stride(frame)
        p.ellipse(21 + dx, 41 + squash, 8, 3 - squash, Y, K)
        p.hline(16 + dx, 40 + squash, 4, W)
        p.box(18 + dx, 43, 6, 2, W)
        return
      }
      pair(p, frame, (x, y) => {
        p.ellipse(x + 4, y + 3 + squash, 5, 3 - squash, Y, K)
        p.px(x + 2, y + 2 + squash, W)
        p.px(x + 6, y + 3 + squash, W)
        p.box(x + 2, y + 5, 5, 2, W)
      })
    },
  },
  {
    id: 'move-vine-wraps',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        sideBoot(p, dx, L, W, M)
        for (let i = 0; i < 4; i++) p.line(14 + dx + i * 3, 38, 16 + dx + i * 3, 44, M)
        p.px(27 + dx, 37, Y)
        return
      }
      pair(p, frame, (x, y, foot) => {
        boot(p, x, y, L, W, M)
        p.line(x + 1, y + 1, x + 7, y + 5, M)
        p.line(x + 7, y + 1, x + 1, y + 5, M)
        p.px(foot === 0 ? x : x + 8, y - 1, Y)
      })
    },
  },
  {
    id: 'move-log-rollers',
    draw(p, dir, frame) {
      const roll = pulse(frame)
      if (side(dir)) {
        p.box(14, 37, 12, 4, L, { hi: W, sh: M })
        for (const cx of [14, 26]) {
          p.disc(cx, 42, 3, M, K)
          p.px(cx + (roll === 0 ? -1 : roll === 1 ? 0 : 1), 42, K)
        }
        return
      }
      p.box(13, 37, 20, 4, L, { hi: W, sh: M })
      p.box(11, 40, 24, 5, M, { hi: L, sh: K, round: true })
      for (let x = 13 + roll; x < 34; x += 3) p.px(x, 42, K)
      p.disc(11, 42, 2, M, K)
      p.disc(34, 42, 2, M, K)
    },
  },
  {
    id: 'move-raft-floats',
    draw(p, dir, frame) {
      const bob = frame >= 0 ? [0, 1, 0, 0, 1, 0][frame] : 0
      platform(p, dir, frame, 4 - bob, M, L, K)
      if (side(dir)) {
        const dx = stride(frame)
        for (let x = 11; x < 29; x += 3) p.vline(x + dx, 41 + bob, 3, K)
        p.box(16 + dx, 37, 8, 4, L, { hi: W })
        return
      }
      for (let x = 14; x < 33; x += 3) p.vline(x, 41 + bob, 3, K)
      PAIR.forEach((x) => p.box(x, 37, 9, 4, L, { hi: W }))
    },
  },
  {
    id: 'move-waders',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.box(16 + dx, 30, 9, 9, Y, { hi: W, sh: M })
        sideBoot(p, dx, Y, W, M)
        p.hline(17 + dx, 31, 7, K)
        return
      }
      pair(p, frame, (x, y) => {
        p.box(x + 1, 31, 7, 8, Y, { hi: W, sh: M })
        boot(p, x, y, Y, W, M)
        p.hline(x + 2, 32, 5, K)
      })
    },
  },
  {
    id: 'move-boxing-boots',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.box(16 + dx, 32, 9, 7, W, { hi: W, sh: L })
        sideBoot(p, dx, W, W, L)
        for (let y = 33; y < 38; y += 2) p.px(20 + dx, y, K)
        p.px(27 + dx, 39, Y)
        return
      }
      pair(p, frame, (x, y) => {
        p.box(x + 1, 32, 7, 7, W, { hi: W, sh: L })
        boot(p, x, y, W, W, L)
        for (let yy = 33; yy < 38; yy += 2) p.px(x + 4, yy, K)
        p.hline(x + 2, y + 1, 5, Y)
      })
    },
  },
  {
    id: 'move-neon-sneakers',
    draw(p, dir, frame) {
      const glow = pulse(frame) === 1 ? W : Y
      if (side(dir)) {
        const dx = stride(frame)
        sideBoot(p, dx, K, M, K)
        p.hline(14 + dx, 42, 14, glow)
        p.line(17 + dx, 39, 23 + dx, 41, L)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, K, M, K)
        p.hline(x + 1, y + 5, 7, glow)
        p.px(x + 3, y + 2, L)
      })
    },
  },
  {
    id: 'move-caster-wheels',
    draw(p, dir, frame) {
      const roll = pulse(frame)
      if (side(dir)) {
        p.box(14, 37, 13, 3, L, { hi: W })
        p.vline(20, 40, 2, K)
        p.disc(20, 43, 2, K)
        p.px(20 + (roll - 1), 43, L)
        return
      }
      p.box(13, 37, 20, 3, L, { hi: W })
      for (const cx of [16, 29]) {
        p.vline(cx, 40, 2, K)
        p.disc(cx, 43, 2, K)
        p.px(cx + (roll - 1), 43, L)
      }
    },
  },
  {
    id: 'move-tap-shoes',
    draw(p, dir, frame) {
      const tap = frame >= 0 && (frame === 2 || frame === 5) ? 1 : 0
      if (side(dir)) {
        const dx = stride(frame)
        sideBoot(p, dx, K, L, K)
        p.hline(24 + dx, 43, 5, W)
        if (tap) p.px(30 + dx, 44, Y)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, K, L, K)
        p.hline(x + 1, y + 5, 7, W)
        p.px(x + 4, y + 1, Y)
        if (tap) p.px(x + 4, y + 7, Y)
      })
    },
  },
  {
    id: 'move-kangaroo',
    draw(p, dir, frame) {
      const coil = frame >= 0 ? [0, 1, 2, 1, 0, 1][frame] : 0
      if (side(dir)) {
        const dx = stride(frame)
        p.box(16 + dx, 37, 8, 3, L, { hi: W })
        for (let y = 40; y < 45 - coil; y += 2) p.hline(15 + dx + (y % 4 === 0 ? 0 : 2), y, 7, K)
        p.box(13 + dx, 44, 15, 2, L, { hi: W })
        return
      }
      pair(p, frame, (x) => {
        p.box(x, 37, 9, 3, L, { hi: W })
        for (let y = 40; y < 45 - coil; y += 2) p.hline(x + 1 + (y % 4 === 0 ? 0 : 2), y, 5, K)
        p.box(x - 1, 44, 11, 2, L, { hi: W })
      })
    },
  },
  {
    id: 'move-centipede',
    draw(p, dir, frame) {
      const scuttle = pulse(frame, 2)
      if (side(dir)) {
        p.box(12, 38, 18, 4, M, { hi: L, sh: K, round: true })
        for (let i = 0; i < 6; i++) {
          const x = 13 + i * 3
          const down = (i + scuttle) % 2
          p.line(x, 42, x - 1, 45 - down, K)
          p.px(x - 1, 45 - down, L)
        }
        return
      }
      p.box(12, 38, 22, 4, M, { hi: L, sh: K, round: true })
      for (let i = 0; i < 7; i++) {
        const x = 13 + i * 3
        const down = (i + scuttle) % 2
        p.vline(x, 42, 3 - down, K)
        p.px(x, 45 - down, L)
      }
      p.px(12, 39, Y)
      p.px(33, 39, Y)
    },
  },
  {
    id: 'move-slug-trail',
    draw(p, dir, frame) {
      const ripple = pulse(frame)
      if (side(dir)) {
        const dx = stride(frame)
        p.ellipse(21 + dx, 41, 9, 3, Y, K)
        p.hline(15 + dx, 39, 6, W)
        p.hline(8 + ripple, 44, 7, L)
        p.px(6 + ripple, 44, W)
        return
      }
      p.ellipse(23, 41, 11, 3, Y, K)
      p.hline(15, 39, 7, W)
      p.hline(13 + ripple, 45, 5, L)
      p.hline(27 - ripple, 45, 5, L)
    },
  },
  {
    id: 'move-visitor-pods',
    draw(p, dir, frame) {
      const hover = frame >= 0 ? [0, -1, -1, 0, 0, 1][frame] : 0
      if (side(dir)) {
        p.ellipse(20, 40 + hover, 8, 3, K, K)
        p.hline(14, 39 + hover, 10, M)
        p.px(16, 40 + hover, L)
        p.hline(16, 45, 9, M)
        return
      }
      PAIR.forEach((x) => {
        p.ellipse(x + 4, 40 + hover, 5, 3, K, K)
        p.hline(x + 1, 39 + hover, 6, M)
        p.px(x + 3, 40 + hover, L)
        p.hline(x + 2, 45, 5, M)
      })
    },
  },
  {
    id: 'move-antigrav',
    draw(p, dir, frame) {
      const spin = pulse(frame)
      const hover = frame >= 0 ? [0, 0, -1, -1, 0, 0][frame] : 0
      platform(p, dir, frame, 3, L, W, M)
      const y = 41 + hover
      if (side(dir)) {
        p.hline(12 + spin * 2, 45, 4, M)
        p.hline(22 - spin, 45, 4, M)
        p.px(20, 43, Y)
        return
      }
      p.hline(14 + spin * 3, y + 4, 5, M)
      p.hline(27 - spin * 2, y + 4, 5, M)
      p.px(19, 43, Y)
      p.px(27, 43, Y)
    },
  },
  {
    id: 'move-ozone-trail',
    draw(p, dir, frame) {
      const shimmer = pulse(frame, 2)
      if (side(dir)) {
        const dx = stride(frame)
        sideBoot(p, dx, K, M, K)
        for (let i = 0; i < 4; i++) p.px(10 + dx - i * 2, 41 + (i % 2) + shimmer, i < 2 ? W : L)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, K, M, K)
        p.px(x + 2 + shimmer, y + 7, W)
        p.px(x + 6 - shimmer, y + 8, L)
      })
    },
  },
  {
    id: 'move-seed-roots',
    draw(p, dir, frame) {
      const beat = pulse(frame, 4)
      if (side(dir)) {
        const dx = stride(frame)
        p.box(14 + dx, 37, 13, 6, M, { hi: L, sh: K, round: true })
        p.line(16 + dx, 43, 13 + dx, 46, K)
        p.line(24 + dx, 43, 27 + dx, 46, K)
        p.px(20 + dx, 39, beat === 0 ? W : Y)
        return
      }
      pair(p, frame, (x, y) => {
        boot(p, x, y, M, L, K)
        p.line(x + 1, y + 6, x - 1, y + 8, K)
        p.line(x + 7, y + 6, x + 9, y + 8, K)
        p.px(x + 4, y + 2, beat === 0 ? W : Y)
        if (beat === 2) p.px(x + 4, y + 4, Y)
      })
    },
  },
  {
    id: 'move-tractor-treads',
    draw(p, dir, frame) {
      const roll = pulse(frame)
      if (side(dir)) {
        p.box(10, 38, 20, 7, M, { hi: L, sh: K, round: true })
        for (let x = 12 + roll; x < 29; x += 3) p.vline(x, 39, 5, K)
        p.disc(14, 41, 1, L, K)
        p.disc(25, 41, 1, L, K)
        return
      }
      for (const x of [11, 25]) {
        p.box(x, 38, 11, 7, M, { hi: L, sh: K, round: true })
        for (let y = 40 + roll; y < 44; y += 2) p.hline(x + 2, y, 7, K)
      }
    },
  },
  {
    id: 'move-stone-feet',
    draw(p, dir, frame) {
      if (side(dir)) {
        const dx = stride(frame)
        p.ellipse(21 + dx, 41, 8, 4, L, K)
        p.hline(16 + dx, 39, 5, W)
        p.px(24 + dx, 42, M)
        return
      }
      pair(p, frame, (x, y) => {
        p.ellipse(x + 4, y + 3, 5, 4, L, K)
        p.px(x + 2, y + 1, W)
        p.px(x + 3, y + 1, W)
        p.px(x + 6, y + 4, M)
      })
    },
  },
  {
    id: 'move-firefly-trail',
    draw(p, dir, frame) {
      const blink = pulse(frame)
      if (side(dir)) {
        const dx = stride(frame)
        sideBoot(p, dx, M, L, K)
        p.px(8 + dx, 40, blink === 0 ? W : Y)
        p.px(5 + dx, 43, blink === 1 ? W : Y)
        p.px(10 + dx, 45, blink === 2 ? W : M)
        return
      }
      pair(p, frame, (x, y, foot) => {
        boot(p, x, y, M, L, K)
        p.px(x + (foot === 0 ? -2 : 10), y + 3, blink === foot ? W : Y)
        p.px(x + 4, y + 8, blink === 2 ? Y : M)
      })
    },
  },
  {
    id: 'move-lantern-wheels',
    draw(p, dir, frame) {
      const roll = pulse(frame)
      if (side(dir)) {
        p.box(15, 37, 11, 3, L, { hi: W })
        p.disc(20, 42, 4, Y, K)
        p.px(20 + (roll - 1), 41 + (roll === 1 ? 1 : 0), W)
        p.px(20, 42, K)
        return
      }
      p.box(13, 37, 20, 3, L, { hi: W })
      for (const cx of [16, 29]) {
        p.disc(cx, 42, 3, Y, K)
        p.px(cx + (roll - 1), 41, W)
        p.px(cx, 42, K)
      }
    },
  },
]
