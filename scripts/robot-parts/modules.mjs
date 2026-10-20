import { FREE_SIDE, isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const freeX = (dir, width) => (FREE_SIDE[dir] === 'left' ? 12 - width : 36)

export const MODULES = [
  {
    id: 'module-lantern',
    layer: 'front',
    draw(p, dir, frame) {
      const x = FREE_SIDE[dir] === 'left' ? 5 : 33
      const flicker = frame >= 0 ? frame % 3 : 0
      p.vline(x + 4, 35, 3, K)
      p.px(x + 3, 36, K)
      p.box(x + 1, 37, 7, 2, Y, { hi: W })
      p.box(x, 39, 9, 7, Y, { hi: W, sh: M })
      p.rect(x + 2, 40, 5, 4, flicker === 2 ? Y : W)
      p.px(x + 4, 41, W)
      p.px(x + 4 + (flicker === 1 ? 1 : -1), 42, Y)
      p.hline(x + 1, 46, 7, K)
      p.px(x + 4, 47, K)
    },
  },
  {
    id: 'module-drone',
    layer: 'front',
    draw(p, dir, frame) {
      const hover = frame >= 0 ? [0, -1, -1, 0, 1, 1][frame] : 0
      const x = dir === 'w' ? 33 : 38
      const y = (dir === 'w' ? 4 : 5) + hover
      p.hline(x - 1, y, 10, K)
      p.px(x, y - 1, frame >= 0 && frame % 2 ? L : 0)
      p.px(x + 7, y - 1, frame >= 0 && frame % 2 ? 0 : L)
      p.vline(x + 3, y + 1, 1, K)
      p.vline(x + 4, y + 1, 1, K)
      p.box(x, y + 2, 8, 6, M, { hi: L, sh: K })
      p.rect(x + 2, y + 4, 3, 2, K)
      p.rect(x + 2, y + 4, 2, 1, W)
      p.px(x + 6, y + 6, Y)
      p.hline(x + 1, y + 8, 6, K)
    },
  },
  {
    id: 'module-fan',
    layer: 'back',
    draw(p, dir, frame) {
      const spin = frame >= 0 ? frame % 2 : 0
      if (dir === 'w') {
        p.box(27, 26, 8, 14, M, { hi: L, sh: K })
        p.vline(32, 28, 10, L)
        p.px(33, 30, spin ? W : L)
        p.px(33, 35, spin ? L : W)
        return
      }
      const cx = dir === 'sw' || dir === 'nw' ? 23 : 24
      p.box(cx - 17, 26, 35, 14, M, { hi: L, sh: K })
      p.box(cx - 16, 27, 6, 12, K)
      p.box(cx + 11, 27, 6, 12, K)
      for (let y = 29; y <= 37; y += 2) {
        p.hline(cx - 15, y, 4, L)
        p.hline(cx + 12, y, 4, L)
      }
      p.disc(cx, 33, 6, K)
      p.disc(cx, 33, 5, M)
      if (spin) {
        p.line(cx - 4, 33, cx + 4, 33, L)
        p.line(cx, 29, cx, 37, L)
      } else {
        p.line(cx - 3, 30, cx + 3, 36, L)
        p.line(cx + 3, 30, cx - 3, 36, L)
      }
      p.disc(cx, 33, 1, Y)
      p.px(cx, 33, W)
    },
  },
  {
    id: 'module-armor',
    layer: 'front',
    draw(p, dir) {
      if (isBack(dir)) {
        p.line(17, 28, 30, 36, K)
        p.line(30, 28, 17, 36, K)
        p.line(18, 28, 30, 35, Y)
        p.line(29, 28, 17, 35, Y)
        p.box(22, 30, 4, 4, L, { hi: W })
        return
      }
      if (dir === 'w') {
        p.box(16, 27, 7, 10, L, { hi: W, sh: M })
        p.vline(19, 29, 6, K)
        p.px(17, 28, Y)
        p.px(21, 35, Y)
        p.box(23, 28, 6, 3, Y, { hi: W })
        return
      }
      p.box(17, 27, 14, 10, L, { hi: W, sh: M })
      p.vline(23, 28, 8, K)
      p.vline(24, 28, 8, M)
      p.hline(18, 32, 12, K)
      for (const [x, y] of [
        [18, 28],
        [29, 28],
        [18, 35],
        [29, 35],
      ]) {
        p.px(x, y, Y)
      }
      p.px(20, 30, W)
    },
  },
  {
    id: 'module-turbine',
    layer: 'back',
    draw(p, dir, frame) {
      const burn = frame >= 0 ? frame % 2 : 0
      const cylinders = dir === 'w' ? [29] : dir === 'n' || dir === 's' ? [5, 35] : [4, 34]
      for (const x of cylinders) {
        p.box(x, 24, 8, 17, M, { hi: L, sh: K })
        p.box(x, 24, 8, 4, Y, { hi: W })
        p.rect(x + 2, 25, 4, 2, K)
        p.px(x + 2, 25, W)
        p.hline(x + 1, 32, 6, L)
        p.px(x + 1, 29, K)
        p.px(x + 6, 36, K)
        p.rect(x + 2, 40, 4, 1, K)
        if (frame >= 0) {
          p.px(x + 3, 41, W)
          p.px(x + 4, 41, W)
          p.px(x + 3 + burn, 42, Y)
          p.px(x + 2 + burn * 2, 43, burn ? Y : 0)
        }
      }
      if (dir !== 'w') {
        const left = cylinders[0] + 8
        p.box(left, 29, cylinders[1] - left, 4, L, { hi: W })
      }
    },
  },
  {
    id: 'module-meteor-core',
    layer: 'back',
    draw(p, dir, frame) {
      const pulse = frame >= 0 ? frame % 3 : 0
      if (dir === 'w') {
        p.box(27, 27, 8, 13, L, { hi: W, sh: M })
        p.disc(32, 33, 3, Y)
        p.px(32, 33, W)
        p.px(31, 32, W)
        p.px(35, 31 + pulse, W)
        return
      }
      const cx = dir === 'sw' || dir === 'nw' ? 23 : 24
      p.box(cx - 10, 26, 21, 15, L, { hi: W, sh: M })
      p.rect(cx - 8, 28, 17, 11, K)
      for (const [x, y] of [
        [cx - 8, 28],
        [cx + 7, 28],
        [cx - 8, 37],
        [cx + 7, 37],
      ]) {
        p.rect(x, y, 2, 2, L)
      }
      p.disc(cx, 33, 5, Y)
      p.disc(cx, 33, 2, W)
      p.px(cx - 2, 31, W)
      p.px(cx + 3, 35, M)
      const reach = pulse === 1 ? 2 : 1
      for (const y of [29, 33, 37]) {
        p.hline(cx - 13 - reach, y, 3, pulse === 2 ? Y : W)
        p.hline(cx + 11 + reach, y, 3, pulse === 2 ? Y : W)
      }
    },
  },
  {
    id: 'module-crystal-wings',
    layer: 'back',
    draw(p, dir, frame) {
      const flap = frame >= 0 ? [0, -1, -2, -1, 0, 1][frame] : 0
      const cx = dir === 'w' ? 30 : dir === 'sw' || dir === 'nw' ? 23 : 24
      const span = dir === 'w' ? 1 : 2
      p.box(cx - 4, 27, 9, 6, L, { hi: W, sh: M })
      p.px(cx, 29, Y)
      const shards = [
        [20, -13],
        [17, -6],
        [13, 1],
      ]
      const sides = dir === 'w' ? [1] : [-1, 1]
      for (const sign of sides) {
        shards.forEach(([dx, dy], index) => {
          const tipX = cx + sign * Math.round(dx * (span / 2))
          const tipY = 30 + dy + flap * (index === 0 ? 1 : 0.5)
          const baseX = cx + sign * 4
          const baseY = 30 + index * 2
          p.line(baseX, baseY - 1, tipX, tipY - 1, K)
          p.line(baseX, baseY + 1, tipX, tipY + 1, K)
          p.line(baseX, baseY, tipX, tipY, L)
          p.px(tipX, tipY, W)
          p.px(tipX - sign, tipY, K)
          p.px(Math.round((baseX + tipX) / 2), Math.round((baseY + tipY) / 2), W)
        })
      }
    },
  },
  {
    id: 'module-alien-orb',
    layer: 'front',
    draw(p, dir, frame) {
      const x = FREE_SIDE[dir] === 'left' ? 2 : 38
      const bob = frame >= 0 ? [0, -1, -1, 0, 1, 1][frame] : 0
      const y = 27 + bob
      p.disc(x + 4, y + 4, 3, M)
      p.px(x + 3, y + 3, W)
      p.px(x + 2, y + 4, L)
      p.hline(x, y + 5, 9, K)
      p.px(x, y + 5, L)
      p.px(x + 8, y + 5, L)
      const phase = frame >= 0 ? frame : 0
      const orbit = [
        [x + 4, y - 2],
        [x + 9, y + 2],
        [x + 7, y + 9],
        [x + 1, y + 9],
        [x - 1, y + 2],
        [x + 4, y - 2],
      ]
      for (let k = 0; k < 3; k++) {
        const [mx, my] = orbit[(phase + k * 2) % orbit.length]
        p.px(mx, my, k === 0 ? W : Y)
      }
    },
  },
  {
    id: 'module-firefly-jar',
    layer: 'front',
    draw(p, dir, frame) {
      const x = FREE_SIDE[dir] === 'left' ? 4 : 34
      const phase = frame >= 0 ? frame : 0
      p.vline(x + 5, 34, 2, K)
      p.px(x + 4, 35, K)
      p.px(x + 6, 35, K)
      p.box(x + 2, 36, 7, 3, Y, { hi: W })
      p.box(x, 38, 11, 9, L, { round: true })
      p.rect(x + 2, 40, 7, 5, M)
      p.vline(x + 1, 40, 4, W)
      p.px(x + 2, 39, W)
      const spots = [
        [x + 3, 41],
        [x + 6, 40],
        [x + 8, 42],
        [x + 5, 43],
        [x + 3, 44],
        [x + 7, 44],
      ]
      for (let k = 0; k < 3; k++) {
        const [fx, fy] = spots[(phase + k * 2) % spots.length]
        p.px(fx, fy, k === 0 ? W : Y)
      }
    },
  },
]
