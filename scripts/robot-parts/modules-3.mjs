import { FREE_SIDE, isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const mid = (dir) => (dir === 'sw' || dir === 'nw' ? 23 : 24)
const leftHand = (dir) => FREE_SIDE[dir] === 'left'
const pulse = (frame, period = 3) => (frame >= 0 ? frame % period : 0)

const shoulderX = (dir) => (dir === 'w' ? 26 : leftHand(dir) ? 10 : 37)

function pack(p, dir, w, h, fill, hi, sh, top = 26) {
  if (dir === 'w') {
    p.box(27, top, Math.min(w, 10), h, fill, { hi, sh, round: true })
    return { x: 27, y: top, w: Math.min(w, 10) }
  }
  const x = mid(dir) - Math.floor(w / 2)
  p.box(x, top, w, h, fill, { hi, sh, round: true })
  return { x, y: top, w }
}

function straps(p, dir) {
  if (isBack(dir) || dir === 'w') return
  const cx = mid(dir)
  p.vline(cx - 5, 27, 9, K)
  p.vline(cx + 5, 27, 9, K)
}

function wingPair(p, dir, frame, paint) {
  const flap = frame >= 0 ? [0, 1, 2, 1, 0, 1][frame] : 0
  if (dir === 'w') {
    paint(29, 24 - flap, 1, flap)
    return
  }
  const cx = mid(dir)
  paint(cx - 8, 24 - flap, -1, flap)
  paint(cx + 8, 24 - flap, 1, flap)
}

export const MODULES_3 = [
  {
    id: 'module-bird-nest',
    layer: 'front',
    draw(p, dir, frame) {
      const x = shoulderX(dir)
      const peep = pulse(frame) === 1

      p.ellipse(x, 26, 5, 3, M, K)
      for (let dx = -4; dx <= 4; dx += 2) p.px(x + dx, 25 + (dx % 4 === 0 ? 0 : 1), L)
      if (isBack(dir)) return
      p.rect(x - 3, 22, 3, 3, Y)
      p.rect(x + 1, 22 - (peep ? 1 : 0), 3, 3 + (peep ? 1 : 0), Y)
      p.px(x - 2, 23, K)
      p.px(x + 2, 23 - (peep ? 1 : 0), K)
    },
  },
  {
    id: 'module-squirrel',
    layer: 'front',
    draw(p, dir, frame) {
      const x = shoulderX(dir)
      const twitch = pulse(frame) === 2 ? 1 : 0

      p.poly(
        [
          [x + 2, 27],
          [x + 6, 22 - twitch],
          [x + 4, 17],
          [x, 20],
        ],
        Y,
        K,
      )
      p.ellipse(x - 1, 25, 2, 3, M, K)
      p.disc(x - 1, 21, 2, M, K)
      p.px(x - 2, 19, K)
      p.px(x, 19, K)
      if (!isBack(dir)) p.px(x - 2, 21, W)
    },
  },
  {
    id: 'module-mushroom-cluster',
    layer: 'back',
    draw(p, dir) {

      const base = dir === 'w' ? 29 : mid(dir)
      for (const [dx, h, r] of [[-4, 6, 3], [1, 9, 4], [5, 5, 2]]) {
        const x = base + (dir === 'w' ? Math.min(dx, 2) : dx)
        p.vline(x, 30 - h, h, W)
        p.vline(x - 1, 30 - h, h, L)
        p.ellipse(x, 30 - h, r, 2, Y, K)
        p.px(x - 1, 29 - h, W)
      }
    },
  },
  {
    id: 'module-quiver',
    layer: 'back',
    draw(p, dir) {

      if (dir === 'w') {
        p.box(28, 24, 5, 14, M, { hi: L, sh: K, round: true })
        for (const dx of [0, 2]) {
          p.vline(29 + dx, 18, 6, K)
          p.px(29 + dx, 17, Y)
          p.px(28 + dx, 18, Y)
        }
        return
      }
      const cx = mid(dir)
      p.poly(
        [
          [cx + 2, 25],
          [cx + 8, 25],
          [cx + 5, 39],
          [cx - 1, 39],
        ],
        M,
        K,
      )
      p.hline(cx + 3, 27, 4, L)
      for (const dx of [3, 5, 7]) {
        p.vline(cx + dx, 19, 6, K)
        p.px(cx + dx, 18, Y)
        p.px(cx + dx - 1, 19, Y)
      }
    },
  },
  {
    id: 'module-camp-kettle',
    layer: 'front',
    draw(p, dir, frame) {
      const x = leftHand(dir) ? 6 : 32
      const steam = pulse(frame)

      p.hline(x + 3, 34, 4, K)
      p.px(leftHand(dir) ? x + 7 : x + 2, 33, K)
      p.box(x, 36, 10, 8, L, { hi: W, sh: M, round: true })
      p.px(x - 1, 38, K)
      p.px(x - 2, 37, K)
      p.px(x + 10, 39, K)
      p.px(x + 4, 38, Y)
      p.px(x - 2 - steam % 2, 34 - steam, W)
    },
  },
  {
    id: 'module-bedroll',
    layer: 'back',
    draw(p, dir) {

      if (dir === 'w') {
        p.ellipse(29, 25, 4, 3, Y, K)
        p.px(28, 24, W)
        p.vline(29, 23, 5, K)
        return
      }
      const cx = mid(dir)
      p.box(cx - 10, 22, 21, 6, Y, { hi: W, sh: M, round: true })
      p.vline(cx - 5, 22, 6, K)
      p.vline(cx + 5, 22, 6, K)
      p.disc(cx - 10, 25, 2, M, K)
      p.disc(cx + 10, 25, 2, M, K)
    },
  },
  {
    id: 'module-fishing-creel',
    layer: 'front',
    draw(p, dir, frame) {
      const x = leftHand(dir) ? 2 : 34
      const swing = frame >= 0 ? [0, 0, 1, 0, 0, -1][frame] : 0

      p.line(x + 5, 31, x + 5, 36, K)
      p.box(x + swing, 36, 11, 8, Y, { hi: W, sh: M, round: true })
      for (let y = 38; y < 43; y += 2) p.hline(x + 1 + swing, y, 9, M)
      p.px(x + 7 + swing, 35, L)
      p.px(x + 8 + swing, 34, L)
      p.px(x + 9 + swing, 35, L)
    },
  },
  {
    id: 'module-log-pack',
    layer: 'back',
    draw(p, dir) {

      const { x, w } = pack(p, dir, 16, 13, M, L, K, 25)
      for (let i = 0; i < 3; i++) {
        const y = 27 + i * 4
        p.hline(x + 1, y, w - 2, K)
        p.hline(x + 1, y + 1, w - 2, L)
      }
      p.disc(x + w - 1, 31, 2, M, K)
      straps(p, dir)
    },
  },
  {
    id: 'module-water-wheel',
    layer: 'back',
    draw(p, dir, frame) {
      const turn = pulse(frame, 4)
      const cx = dir === 'w' ? 31 : mid(dir)

      p.disc(cx, 25, 8, 0, K)
      p.disc(cx, 25, 6, 0, M)
      for (let i = 0; i < 4; i++) {
        const a = ((i + turn / 4) * Math.PI) / 2
        p.line(cx, 25, cx + Math.round(Math.cos(a) * 7), 25 + Math.round(Math.sin(a) * 7), i === 0 ? W : L)
      }
      p.disc(cx, 25, 1, Y, K)
      p.px(cx - 6, 20, W)
    },
  },
  {
    id: 'module-hay-pack',
    layer: 'back',
    draw(p, dir) {

      const { x, w } = pack(p, dir, 18, 12, Y, W, M, 26)
      for (let yy = 28; yy < 37; yy += 3) for (let xx = x + 1 + (yy % 2); xx < x + w - 1; xx += 3) p.px(xx, yy, M)
      p.vline(x + 4, 26, 12, K)
      p.vline(x + w - 5, 26, 12, K)
      straps(p, dir)
    },
  },
  {
    id: 'module-crow',
    layer: 'front',
    draw(p, dir, frame) {
      const x = shoulderX(dir)
      const caw = pulse(frame) === 1

      p.ellipse(x, 24, 3, 2, K, K)
      p.disc(x + (leftHand(dir) ? 2 : -2), 21 - (caw ? 1 : 0), 2, K, K)
      p.hline(x - 5, 23, 4, K)
      if (isBack(dir)) return
      p.px(x + (leftHand(dir) ? 4 : -4), 21 - (caw ? 1 : 0), Y)
      p.px(x + (leftHand(dir) ? 2 : -2), 20 - (caw ? 1 : 0), W)
    },
  },
  {
    id: 'module-betting-board',
    layer: 'back',
    draw(p, dir) {

      const { x, w } = pack(p, dir, 18, 14, K, M, K, 24)
      for (let i = 0; i < 4; i++) {
        const y = 26 + i * 3
        p.hline(x + 2, y, Math.max(3, w - 6 - (i % 2) * 3), i === 1 ? Y : W)
        p.px(x + w - 3, y, L)
      }
      straps(p, dir)
    },
  },
  {
    id: 'module-champion-belt',
    layer: 'front',
    draw(p, dir) {

      const cx = dir === 'w' ? 22 : mid(dir)
      const w = dir === 'w' ? 12 : 17
      p.box(cx - Math.floor(w / 2), 34, w, 4, M, { hi: L, sh: K })
      if (isBack(dir)) {
        p.px(cx, 35, K)
        return
      }
      p.box(cx - 3, 33, 7, 6, Y, { hi: W, sh: M, round: true })
      p.px(cx, 35, W)
      p.px(cx - 1, 36, K)
      p.px(cx + 1, 36, K)
    },
  },
  {
    id: 'module-neon-sign',
    layer: 'back',
    draw(p, dir, frame) {
      const buzz = pulse(frame) === 2

      const cx = dir === 'w' ? 30 : mid(dir)
      p.vline(cx, 10, 17, K)
      p.poly(
        [
          [cx - 7, 3],
          [cx + 4, 3],
          [cx + 8, 7],
          [cx + 4, 11],
          [cx - 7, 11],
        ],
        K,
        K,
      )
      p.hline(cx - 5, 7, 9, buzz ? L : Y)
      p.px(cx + 5, 7, W)
      p.hline(cx - 5, 5, 6, buzz ? M : W)
      p.hline(cx - 5, 9, 6, buzz ? M : W)
    },
  },
  {
    id: 'module-speaker',
    layer: 'back',
    draw(p, dir, frame) {
      const thump = pulse(frame) === 0 ? 1 : 0

      const { x, w } = pack(p, dir, 14, 15, K, M, K, 23)
      const cx = x + Math.floor(w / 2)
      p.disc(cx, 30, 4 + thump, M, L)
      p.disc(cx, 30, 1, Y, K)
      p.hline(x + 2, 25, w - 4, L)
      if (thump) {
        p.px(x - 1, 30, L)
        p.px(x + w, 30, L)
      }
      straps(p, dir)
    },
  },
  {
    id: 'module-bar-tap',
    layer: 'back',
    draw(p, dir, frame) {
      const drip = pulse(frame)

      const { x, w } = pack(p, dir, 14, 13, M, L, K, 25)
      p.hline(x + 1, 28, w - 2, K)
      p.hline(x + 1, 34, w - 2, K)
      const tx = dir === 'w' ? x + w : x + w
      p.hline(tx, 31, 3, Y)
      p.px(tx + 2, 32, Y)
      if (drip === 2) p.px(tx + 2, 34, W)
      straps(p, dir)
    },
  },
  {
    id: 'module-ring-bell',
    layer: 'front',
    draw(p, dir, frame) {
      const x = shoulderX(dir)
      const ring = pulse(frame) === 1 ? 1 : 0

      p.box(x - 2, 25, 5, 3, L, { hi: W })
      p.poly(
        [
          [x - 4, 24],
          [x + 4, 24],
          [x + 2, 17],
          [x - 2, 17],
        ],
        Y,
        K,
      )
      p.px(x - 1, 19, W)
      p.px(x + ring, 25, K)
      p.px(x, 16, K)
    },
  },
  {
    id: 'module-visitor-beacon',
    layer: 'back',
    draw(p, dir, frame) {
      const glow = pulse(frame, 4)

      const cx = dir === 'w' ? 30 : mid(dir)
      p.poly(
        [
          [cx - 3, 28],
          [cx + 3, 28],
          [cx + 1, 8],
          [cx - 1, 8],
        ],
        K,
        K,
      )
      p.vline(cx - 1, 10, 16, M)
      p.hline(cx - 3 + Math.floor(glow / 2), 26 - glow * 4, 6 - glow, glow === 3 ? W : L)
      p.px(cx, 7, glow === 0 ? W : L)
    },
  },
  {
    id: 'module-crystal-cage',
    layer: 'back',
    draw(p, dir, frame) {
      const twinkle = pulse(frame)

      const { x, w } = pack(p, dir, 16, 14, K, M, K, 24)
      for (let xx = x + 2; xx < x + w - 1; xx += 3) p.vline(xx, 25, 12, L)
      p.hline(x + 1, 31, w - 2, L)
      for (const [dx, dy] of [[3, 29], [7, 35], [11, 28], [5, 34], [13, 33]]) {
        if (dx >= w - 1) continue
        p.px(x + dx, dy, (dx + twinkle) % 3 === 0 ? W : Y)
      }
      straps(p, dir)
    },
  },
  {
    id: 'module-ozone-tank',
    layer: 'back',
    draw(p, dir, frame) {
      const hiss = pulse(frame) === 2

      if (dir === 'w') {
        p.box(27, 23, 7, 16, L, { hi: W, sh: M, round: true })
        p.vline(30, 20, 3, K)
        if (hiss) p.px(31, 18, W)
        return
      }
      const cx = mid(dir)
      for (const dx of [-7, 1]) {
        p.box(cx + dx, 23, 7, 16, L, { hi: W, sh: M, round: true })
        p.vline(cx + dx + 3, 20, 3, K)
        p.hline(cx + dx + 1, 30, 5, M)
      }
      p.hline(cx - 4, 21, 9, K)
      if (hiss) p.px(cx + 5, 18, W)
      straps(p, dir)
    },
  },
  {
    id: 'module-seed-pod',
    layer: 'back',
    draw(p, dir, frame) {
      const beat = pulse(frame, 4)

      const cx = dir === 'w' ? 30 : mid(dir)
      p.ellipse(cx, 30, 6, 9, M, K)
      p.line(cx, 22, cx, 38, L)
      p.line(cx - 4, 26, cx, 30, L)
      p.line(cx + 4, 26, cx, 30, L)
      p.px(cx, 30, beat === 0 ? W : Y)
      if (beat === 2) {
        p.px(cx - 1, 30, Y)
        p.px(cx + 1, 30, Y)
      }
      p.vline(cx, 19, 3, K)
    },
  },
  {
    id: 'module-dark-orb',
    layer: 'front',
    draw(p, dir, frame) {
      const x = shoulderX(dir)
      const drift = frame >= 0 ? [0, -1, -1, 0, 1, 1][frame] : 0

      p.disc(x, 19 + drift, 3, K, K)
      p.px(x - 1, 18 + drift, M)
      p.px(x - 4, 19 + drift, M)
      p.px(x + 4, 19 + drift, M)
      p.px(x, 23 + drift, M)
    },
  },
  {
    id: 'module-moth-wings',
    layer: 'back',
    draw(p, dir, frame) {

      wingPair(p, dir, frame, (x, y, s, flap) => {
        p.poly(
          [
            [x - s * 2, y + 4],
            [x + s * 9, y - 2 - flap],
            [x + s * 10, y + 8],
            [x + s * 4, y + 12],
          ],
          L,
          K,
        )
        p.disc(x + s * 6, y + 4, 1, Y, K)
        p.px(x + s * 6, y + 4, W)
      })
    },
  },
  {
    id: 'module-fern-cloak',
    layer: 'back',
    draw(p, dir, frame) {
      const sway = frame >= 0 ? [0, 1, 0, 0, -1, 0][frame] : 0

      if (dir === 'w') {
        p.poly(
          [
            [26, 26],
            [31, 26],
            [33 + sway, 42],
            [26, 42],
          ],
          M,
          K,
        )
        for (let y = 29; y < 41; y += 3) p.hline(27, y, 4, L)
        return
      }
      const cx = mid(dir)
      p.poly(
        [
          [cx - 8, 26],
          [cx + 8, 26],
          [cx + 10 + sway, 43],
          [cx - 10 + sway, 43],
        ],
        M,
        K,
      )
      for (let y = 29; y < 42; y += 3) {
        p.hline(cx - 6, y, 5, L)
        p.hline(cx + 2, y + 1, 5, L)
      }
      p.hline(cx - 9 + sway, 43, 19, K)
    },
  },
  {
    id: 'module-pinecone-bombs',
    layer: 'front',
    draw(p, dir) {

      if (isBack(dir)) {
        p.line(16, 27, 31, 36, M)
        return
      }
      const cx = dir === 'w' ? 22 : mid(dir)
      p.line(cx - 7, 27, cx + 7, 36, M)
      p.line(cx - 7, 28, cx + 7, 37, K)
      for (let i = 0; i < 3; i++) {
        const x = cx - 5 + i * 5
        const y = 28 + i * 3
        p.ellipse(x, y, 1, 2, M, K)
        p.px(x, y - 1, Y)
      }
    },
  },
]
