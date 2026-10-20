import { FACE_X, HEAD, isBack, isFront } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const head = (dir) => HEAD[dir]

export const HELMETS = [
  {
    id: 'helmet-visor',
    draw(p, dir) {
      const h = head(dir)
      p.box(h.x0, 9, h.x1 - h.x0 + 1, 4, Y, { hi: W })
      if (isBack(dir)) {
        p.rect(h.x0 + 3, 10, 3, 2, M)
        p.rect(h.x1 - 5, 10, 3, 2, M)
        return
      }
      if (dir === 'w') {
        p.box(12, 12, 10, 12, M, { hi: L })
        p.rect(13, 16, 6, 2, K)
        p.rect(14, 16, 4, 2, W)
        p.rect(12, 19, 2, 5, K)
        return
      }
      const fx = FACE_X[dir]
      const left = fx - 9
      p.box(left, 12, 19, 12, M, { hi: L, sh: K })
      p.rect(left + 3, 16, 13, 3, K)
      p.rect(left + 4, 17, 11, 1, W)
      p.rect(left + 4, 16, 2, 1, W)
      p.px(left + 2, 21, Y)
      p.px(left + 16, 21, Y)
    },
  },
  {
    id: 'helmet-miner',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0 + 2, 5, w - 4, 6, L, { hi: W })
      p.hline(h.x0 + 3, 4, w - 6, K)
      p.hline(h.x0 + 4, 5, w - 8, W)
      p.box(h.x0 - 1, 9, w + 2, 3, L, { hi: W })
      p.hline(h.x0, 11, w, M)
      if (isBack(dir)) {
        p.rect(h.x0 + 4, 7, 2, 2, K)
        p.rect(h.x1 - 5, 7, 2, 2, K)
        return
      }
      const lx = dir === 'w' ? 13 : FACE_X[dir] - 3
      p.box(lx, 5, 7, 6, Y, { hi: W })
      p.rect(lx + 2, 7, 3, 2, W)
      if (dir === 'w') {
        p.rect(11, 7, 2, 2, W)
        p.px(10, 8, W)
      }
    },
  },
  {
    id: 'helmet-diver',
    draw(p, dir) {
      const h = head(dir)
      const cx = Math.floor((h.x0 + h.x1) / 2)
      const rx = Math.floor((h.x1 - h.x0) / 2) + 2
      p.ellipse(cx, 16, rx, 10, L)
      p.hline(cx - rx + 3, 8, 4, W)
      p.px(cx - rx + 2, 9, W)
      p.px(cx - rx + 1, 10, W)
      p.box(h.x0 - 1, 23, h.x1 - h.x0 + 3, 3, Y, { hi: W })
      for (const x of [cx - rx + 4, cx, cx + rx - 4]) p.px(x, 7, Y)
      if (isBack(dir)) {
        p.box(cx - 2, 12, 5, 5, M)
        p.px(cx, 14, Y)
        p.vline(cx, 9, 3, K)
        return
      }
      const px = dir === 'w' ? 14 : FACE_X[dir] - 6
      const pw = dir === 'w' ? 8 : 13
      p.box(px, 12, pw, 10, 0, { round: true })
      p.hline(px + 1, 12, pw - 2, Y)
      p.hline(px + 1, 21, pw - 2, Y)
      p.vline(px, 13, 8, Y)
      p.vline(px + pw - 1, 13, 8, Y)
      p.px(px + 1, 13, W)
      p.px(px + 1, 20, K)
      p.px(px + pw - 2, 13, K)
      p.px(px + pw - 2, 20, K)
      p.px(px + 2, 14, W)
    },
  },
  {
    id: 'helmet-samurai',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = Math.floor((h.x0 + h.x1) / 2)
      p.box(h.x0, 6, w, 8, M, { hi: L })
      p.hline(h.x0 + 1, 6, w - 2, K)
      p.hline(h.x0 + 2, 7, w - 4, L)
      p.hline(h.x0, 12, w, K)
      p.hline(h.x0 + 1, 13, w - 2, Y)
      if (dir === 'w') {
        p.box(h.x1 - 1, 12, 5, 10, M, { sh: K })
        p.hline(h.x1, 15, 3, K)
        p.hline(h.x1, 18, 3, K)
      } else {
        p.box(h.x0 - 4, 12, 5, 10, M, { sh: K })
        p.box(h.x1, 12, 5, 10, M, { sh: K })
        p.hline(h.x0 - 3, 15, 3, K)
        p.hline(h.x0 - 3, 18, 3, K)
        p.hline(h.x1 + 1, 15, 3, K)
        p.hline(h.x1 + 1, 18, 3, K)
      }
      const crestX = dir === 'w' ? 18 : isFront(dir) ? FACE_X[dir] + 1 : cx
      p.line(crestX - 1, 6, crestX - 6, 1, K)
      p.line(crestX + 1, 6, crestX + 6, 1, K)
      p.line(crestX - 1, 7, crestX - 5, 3, Y)
      p.line(crestX + 1, 7, crestX + 5, 3, Y)
      p.px(crestX - 6, 0, Y)
      p.px(crestX + 6, 0, Y)
      p.disc(crestX, 5, 2, Y)
      p.px(crestX, 5, W)
    },
  },
  {
    id: 'helmet-meteor',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0, 8, w, 4, K)
      p.hline(h.x0 + 1, 9, w - 2, M)
      p.hline(h.x0 + 1, 10, w - 2, L)
      const spikes = dir === 'w' ? [-6, -2, 2, 6] : [-10, -5, 0, 5, 10]
      const heights = dir === 'w' ? [5, 7, 6, 4] : [5, 7, 8, 7, 5]
      const cx = Math.floor((h.x0 + h.x1) / 2)
      spikes.forEach((offset, index) => {
        const x = cx + offset
        const tall = heights[index]
        p.poly(
          [
            [x - 2, 9],
            [x + 2, 9],
            [x, 9 - tall],
          ],
          L,
          K,
        )
        p.vline(x, 9 - tall + 2, tall - 3, W)
        p.px(x + 1, 8, M)
        p.px(x + 1, 7, M)
        const glint = frame >= 0 && (frame + index) % 3 === 0
        p.px(x, 9 - tall, glint ? W : K)
        p.px(x, 9 - tall + 1, glint ? W : L)
      })
    },
  },
  {
    id: 'helmet-crystal',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0 - 1, 9, w + 2, 4, Y, { hi: W })
      if (isBack(dir)) {
        p.rect(Math.floor((h.x0 + h.x1) / 2) - 1, 10, 3, 2, M)
        return
      }
      const shard = (x, half, tall, glint) => {
        p.poly(
          [
            [x - half, 9],
            [x + half, 9],
            [x, 9 - tall],
          ],
          L,
          K,
        )
        p.vline(x, 9 - tall + 2, tall - 3, W)
        for (let y = 9 - tall + 3; y < 9; y++) p.px(x + 1, y, M)
        p.px(x, 9 - tall, glint ? W : K)
        p.px(x, 9 - tall + 1, glint ? W : L)
      }
      const cx = dir === 'w' ? 15 : FACE_X[dir]
      const pulse = frame >= 0 ? frame % 3 : -1
      shard(cx, 3, 8, pulse === 1)
      if (dir === 'w') {
        shard(cx + 5, 2, 5, pulse === 0)
      } else {
        shard(cx - 7, 2, 5, pulse === 0)
        shard(cx + 7, 2, 5, pulse === 2)
        p.px(cx - 4, 11, W)
        p.px(cx + 4, 11, W)
      }
    },
  },
  {
    id: 'helmet-owl',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0, 9, w, 15, L, { hi: W, sh: M })
      p.line(h.x0 + 1, 9, h.x0 + 2, 4, K)
      p.line(h.x0 + 5, 9, h.x0 + 2, 4, K)
      p.vline(h.x0 + 2, 5, 4, L)
      p.px(h.x0 + 3, 7, L)
      p.line(h.x1 - 1, 9, h.x1 - 2, 4, K)
      p.line(h.x1 - 5, 9, h.x1 - 2, 4, K)
      p.vline(h.x1 - 2, 5, 4, L)
      p.px(h.x1 - 3, 7, L)
      if (isBack(dir)) {
        for (let y = 13; y <= 21; y += 4) {
          for (let x = h.x0 + 2; x < h.x1 - 1; x += 4) {
            p.px(x, y, M)
            p.px(x + 1, y + 1, M)
          }
        }
        return
      }
      const blink = frame === 4
      const eyes = dir === 'w' ? [16] : [FACE_X[dir] - 5, FACE_X[dir] + 5]
      for (const ex of eyes) {
        p.disc(ex, 16, 3, W)
        if (blink) p.hline(ex - 2, 16, 5, K)
        else {
          p.rect(ex, 16, 2, 2, K)
          p.px(ex - 1, 15, M)
        }
      }
      const bx = dir === 'w' ? 13 : FACE_X[dir]
      p.px(bx, 19, Y)
      p.rect(bx - 1, 20, 3, 1, Y)
      p.px(bx, 21, K)
      if (dir === 'w') {
        p.px(12, 20, K)
      } else {
        p.px(bx - 1, 19, K)
        p.px(bx + 1, 19, K)
      }
    },
  },
  {
    id: 'helmet-dew-crown',
    draw(p, dir, frame) {
      const h = head(dir)
      p.hline(h.x0 - 1, 9, h.x1 - h.x0 + 3, K)
      for (let x = h.x0 - 1; x <= h.x1 + 1; x++) p.px(x, 10, x % 3 === 0 ? L : M)
      p.hline(h.x0 - 1, 11, h.x1 - h.x0 + 3, K)
      const LEAVES = {
        s: [[15, -1, 3], [19, -1, 4], [29, 1, 4], [33, 1, 3]],
        sw: [[16, -1, 3], [25, 1, 4], [30, 1, 3]],
        w: [[20, 1, 4], [25, 1, 4], [29, 1, 3]],
        nw: [[16, -1, 3], [20, -1, 4], [27, 1, 4], [31, 1, 3]],
        n: [[15, -1, 3], [19, -1, 4], [29, 1, 4], [33, 1, 3]],
      }
      LEAVES[dir].forEach(([bx, sign, tall], index) => {
        const tipX = bx + sign * 2
        const tipY = 9 - tall
        p.poly(
          [
            [bx - 2, 9],
            [bx + 2, 9],
            [tipX, tipY],
          ],
          M,
          K,
        )
        p.line(bx, 8, tipX, tipY + 1, L)
        const glint = frame >= 0 && (frame + index) % 3 === 0
        p.px(tipX, tipY - 1, glint ? Y : W)
      })
      if (isBack(dir)) {
        const cx = dir === 'n' ? 24 : 23
        p.box(cx - 2, 9, 5, 4, M, { hi: L })
        p.vline(cx - 1, 13, 3, K)
        p.vline(cx + 1, 13, 4, K)
        p.px(cx + 1, 17, M)
        return
      }
      const gx = dir === 'w' ? h.x0 : FACE_X[dir]
      p.px(gx, 7, K)
      p.disc(gx, 10, 2, W)
      p.px(gx, 8, W)
      p.px(gx + 1, 11, L)
      p.px(gx - 1, 9, frame >= 0 && frame % 3 === 1 ? Y : W)
    },
  },
]
