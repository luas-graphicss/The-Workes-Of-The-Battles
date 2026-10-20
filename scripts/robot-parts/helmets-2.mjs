import { FACE_X, HEAD, isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const head = (dir) => HEAD[dir]
const centre = (h) => Math.floor((h.x0 + h.x1) / 2)
const side = (dir) => dir === 'w'

export const HELMETS_2 = [
  {
    id: 'helmet-straw',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)

      p.box(h.x0 - 4, 9, w + 8, 3, Y, { hi: W })
      p.hline(h.x0 - 3, 11, w + 6, M)
      p.ellipse(cx, 7, Math.floor(w / 2) - 2, 4, Y)
      p.hline(h.x0 + 2, 8, w - 4, K)
      p.hline(h.x0 + 3, 7, w - 6, K)
      p.px(cx - 3, 4, W)
      p.px(cx - 2, 4, W)
      if (isBack(dir)) {
        p.px(cx, 8, L)
        p.px(cx + 1, 7, L)
        return
      }
      const bow = side(dir) ? h.x1 - 1 : h.x1 - 3
      p.rect(bow, 7, 2, 2, L)
    },
  },
  {
    id: 'helmet-goggles',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1

      p.box(h.x0, 7, w, 8, M, { hi: L, sh: K })
      p.box(h.x0 - 1, 13, 4, 8, M, { sh: K })
      p.box(h.x1 - 2, 13, 4, 8, M, { sh: K })
      p.hline(h.x0 + 2, 8, w - 4, L)
      if (isBack(dir)) {
        p.hline(h.x0 + 1, 12, w - 2, K)
        p.rect(centre(h) - 1, 11, 3, 3, L)
        return
      }

      const fx = side(dir) ? 15 : FACE_X[dir]
      p.hline(fx - 8, 14, side(dir) ? 12 : 17, K)
      const lenses = side(dir) ? [[fx - 2, 14]] : [[fx - 5, 14], [fx + 5, 14]]
      for (const [lx, ly] of lenses) {
        p.disc(lx, ly, 3, L)
        p.px(lx - 1, ly - 1, W)
        p.px(lx + 1, ly + 1, M)
      }
      if (!side(dir)) p.rect(fx - 1, 13, 3, 2, K)
    },
  },
  {
    id: 'helmet-fisher',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)

      p.ellipse(cx, 8, Math.floor(w / 2), 4, Y)
      p.hline(h.x0 + 3, 5, w - 6, W)
      if (isBack(dir)) {
        p.box(h.x0 - 1, 9, w + 2, 3, Y, { hi: W })
        p.poly(
          [
            [h.x0, 11],
            [h.x1, 11],
            [h.x1 + 2, 22],
            [h.x0 - 2, 22],
          ],
          Y,
          K,
        )
        p.vline(cx, 13, 8, M)
        return
      }
      if (side(dir)) {
        p.box(11, 9, 12, 3, Y, { hi: W })
        p.poly(
          [
            [20, 11],
            [25, 11],
            [27, 21],
            [21, 21],
          ],
          Y,
          K,
        )
        p.vline(24, 13, 7, M)
        return
      }
      p.box(h.x0 - 3, 9, w + 6, 3, Y, { hi: W })
      p.rect(h.x0 - 3, 12, 3, 9, Y)
      p.vline(h.x0 - 4, 12, 9, K)
      p.rect(h.x1 + 1, 12, 3, 9, Y)
      p.vline(h.x1 + 4, 12, 9, K)
      p.hline(h.x0 - 3, 21, 3, K)
      p.hline(h.x1 + 1, 21, 3, K)
    },
  },
  {
    id: 'helmet-bucket',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)
      p.box(h.x0 - 1, 7, w + 2, 17, L, { hi: W, sh: M })
      p.hline(h.x0, 8, w, W)
      p.hline(h.x0 - 1, 12, w + 2, K)
      p.hline(h.x0 - 1, 19, w + 2, K)

      p.line(h.x0 + 1, 7, cx, 2, K)
      p.line(h.x1 - 1, 7, cx, 2, K)
      p.px(cx, 2, L)
      p.px(h.x0 + 4, 15, K)
      p.px(h.x1 - 4, 16, K)
      if (isBack(dir)) return
      const fx = side(dir) ? 14 : FACE_X[dir]
      if (side(dir)) {
        p.rect(fx - 1, 15, 4, 2, K)
        p.px(fx, 15, W)
        return
      }
      p.rect(fx - 6, 15, 4, 2, K)
      p.rect(fx + 3, 15, 4, 2, K)
      p.px(fx - 5, 15, W)
      p.px(fx + 4, 15, W)
    },
  },
  {
    id: 'helmet-antlers',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0, 8, w, 6, M, { hi: L, sh: K })
      p.hline(h.x0 + 1, 13, w - 2, K)

      const tines = [
        [0, 7], [1, 6], [1, 5], [2, 5], [1, 4], [1, 3], [3, 4], [4, 3], [4, 2], [5, 3], [6, 2],
      ]

      const antler = (bx, sign) => {
        const cells = tines.map(([dx, y]) => [bx + sign * dx, y])
        const filled = new Set(cells.map(([x, y]) => `${x},${y}`))
        for (const [x, y] of cells) {
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              const rim = `${x + ox},${y + oy}`
              if (!filled.has(rim) && p.get(x + ox, y + oy) === 0) p.px(x + ox, y + oy, K)
            }
          }
        }
        cells.forEach(([x, y], index) => p.px(x, y, index < 2 ? L : W))
      }
      if (side(dir)) {
        antler(h.x0 + 4, -1)
        antler(h.x1 - 3, 1)
        return
      }
      antler(h.x0 + 2, -1)
      antler(h.x1 - 2, 1)
      if (!isBack(dir)) {
        const fx = FACE_X[dir]
        p.px(fx - 2, 10, L)
        p.px(fx + 2, 10, L)
      }
    },
  },
  {
    id: 'helmet-beacon',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)
      p.box(h.x0, 8, w, 5, L, { hi: W, sh: M })
      p.hline(h.x0 + 1, 12, w - 2, K)

      p.box(cx - 4, 2, 9, 7, Y, { hi: W, sh: M })
      p.hline(cx - 3, 1, 7, K)
      p.rect(cx - 2, 0, 5, 1, L)
      const turn = frame >= 0 ? frame % 4 : 0
      const spot = [cx - 3, cx - 1, cx + 1, cx + 3][turn]
      p.rect(spot, 4, 2, 3, W)
      p.px(cx - 4 + (turn % 2) * 8, 5, K)
      if (isBack(dir)) {
        p.rect(cx - 1, 9, 3, 3, M)
        return
      }
      if (!side(dir)) {
        p.px(h.x0 + 2, 10, M)
        p.px(h.x1 - 2, 10, M)
      }
    },
  },
  {
    id: 'helmet-gasmask',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1

      p.box(h.x0, 8, w, 5, M, { hi: L })
      p.hline(h.x0 + 1, 12, w - 2, K)
      if (isBack(dir)) {
        p.line(h.x0 + 2, 13, h.x1 - 2, 20, K)
        p.line(h.x1 - 2, 13, h.x0 + 2, 20, K)
        p.box(centre(h) - 2, 15, 5, 4, L)
        return
      }
      if (side(dir)) {
        p.box(12, 12, 11, 12, M, { hi: L, sh: K })
        p.disc(16, 15, 2, W)
        p.px(16, 15, K)
        p.disc(13, 21, 2, L)
        p.px(13, 21, K)
        p.px(11, 21, K)
        return
      }
      const fx = FACE_X[dir]
      p.box(fx - 9, 12, 19, 12, M, { hi: L, sh: K })
      for (const ex of [fx - 4, fx + 4]) {
        p.disc(ex, 15, 2, W)
        p.px(ex, 15, K)
      }
      for (const cxx of [fx - 6, fx + 6]) {
        p.disc(cxx, 21, 2, L)
        p.px(cxx, 21, K)
        p.px(cxx, 19, K)
      }
      p.rect(fx - 1, 20, 3, 2, K)
    },
  },
  {
    id: 'helmet-lumberjack',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)

      p.ellipse(cx, 9, Math.floor(w / 2) - 1, 5, Y)
      p.box(h.x0 - 1, 10, w + 2, 3, Y, { hi: W })
      p.hline(cx - 4, 5, 4, W)
      p.vline(cx, 4, 6, M)
      const muffs = side(dir) ? [h.x1 - 2] : [h.x0 - 3, h.x1 - 1]
      for (const mx of muffs) p.box(mx, 14, 5, 7, K)
      for (const mx of muffs) p.rect(mx + 1, 15, 3, 5, M)
      if (isBack(dir)) {
        p.hline(h.x0 + 1, 15, w - 2, K)
        return
      }
      const fx = side(dir) ? 12 : FACE_X[dir]
      const left = side(dir) ? fx : fx - 7
      const width = side(dir) ? 8 : 15
      p.rect(left, 13, width, 1, K)
      for (let y = 14; y <= 20; y++) {
        for (let x = left; x < left + width; x++) if ((x + y) % 2 === 0) p.px(x, y, K)
      }
      p.vline(left, 13, 8, K)
      p.vline(left + width - 1, 13, 8, K)
    },
  },
  {
    id: 'helmet-horned',
    draw(p, dir) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      p.box(h.x0, 7, w, 7, L, { hi: W, sh: M })
      p.hline(h.x0 + 1, 13, w - 2, K)
      p.hline(h.x0 + 1, 10, w - 2, K)
      const horn = (bx, sign) => {
        p.line(bx, 9, bx + sign * 4, 5, K)
        p.line(bx, 10, bx + sign * 5, 6, K)
        p.line(bx + sign * 4, 5, bx + sign * 6, 1, K)
        p.line(bx + sign * 5, 6, bx + sign * 7, 2, K)
        p.line(bx + sign, 9, bx + sign * 5, 5, Y)
        p.line(bx + sign * 5, 5, bx + sign * 6, 2, Y)
        p.px(bx + sign * 6, 1, W)
      }
      if (side(dir)) {
        horn(h.x0 + 2, -1)
        return
      }
      horn(h.x0, -1)
      horn(h.x1, 1)
      if (!isBack(dir)) {
        const fx = FACE_X[dir]
        p.rect(fx - 1, 8, 3, 2, Y)
      }
    },
  },
  {
    id: 'helmet-halo',
    draw(p, dir, frame) {
      const h = head(dir)
      const cx = side(dir) ? 22 : centre(h)
      const rx = side(dir) ? 6 : 9

      p.ellipse(cx, 4, rx, 2, Y, K)
      p.ellipse(cx, 4, rx - 3, 0, 0, 0)
      p.hline(cx - rx + 3, 4, rx * 2 - 5, 0)
      const spin = frame >= 0 ? frame % 4 : 0
      const glints = [
        [cx - rx + 1, 4],
        [cx - 2, 2],
        [cx + rx - 1, 4],
        [cx + 2, 6],
      ]
      p.px(glints[spin][0], glints[spin][1], W)
      p.px(glints[(spin + 2) % 4][0], glints[(spin + 2) % 4][1], W)
      p.hline(h.x0 + 2, 9, h.x1 - h.x0 - 3, L)
      if (!isBack(dir) && !side(dir)) {
        const fx = FACE_X[dir]
        p.px(fx - 6, 11, W)
        p.px(fx + 6, 11, W)
      }
    },
  },
  {
    id: 'helmet-dragon',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)
      p.box(h.x0 - 1, 7, w + 2, 10, M, { hi: L, sh: K })

      for (let y = 9; y <= 15; y += 3) {
        for (let x = h.x0 + 1 + ((y / 3) % 2); x < h.x1; x += 3) p.px(x, y, L)
      }

      const spikes = side(dir) ? [cx - 4, cx, cx + 4] : [cx - 6, cx - 2, cx + 2, cx + 6]
      spikes.forEach((x, index) => {
        const tall = index % 2 === 0 ? 5 : 7
        p.poly(
          [
            [x - 2, 7],
            [x + 2, 7],
            [x, 7 - tall],
          ],
          L,
          K,
        )
        p.px(x, 7 - tall + 2, W)
      })
      if (isBack(dir)) {
        p.vline(cx, 17, 6, K)
        p.px(cx + 1, 18, L)
        p.px(cx - 1, 20, L)
        return
      }
      const fx = side(dir) ? 14 : FACE_X[dir]
      const glow = frame >= 0 && frame % 3 === 0 ? W : Y
      if (side(dir)) {
        p.rect(fx, 11, 3, 2, glow)
        p.box(11, 17, 8, 5, M, { sh: K })
        p.px(12, 21, W)
        p.px(14, 21, W)
        return
      }
      p.rect(fx - 5, 11, 3, 2, glow)
      p.rect(fx + 3, 11, 3, 2, glow)
      p.box(fx - 6, 17, 13, 5, M, { sh: K })
      for (const tx of [fx - 4, fx - 1, fx + 2, fx + 5]) p.px(tx, 21, W)
    },
  },
  {
    id: 'helmet-astronaut',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)
      const rx = Math.floor(w / 2) + 3

      p.ellipse(cx, 14, rx, 11, 0, L)
      p.px(cx - rx + 2, 8, W)
      p.px(cx - rx + 3, 7, W)
      p.px(cx - rx + 4, 6, W)
      p.px(cx - rx + 2, 9, W)
      p.px(cx + rx - 3, 20, W)
      p.box(h.x0 - 2, 23, w + 4, 3, L, { hi: W })
      p.hline(h.x0 - 1, 25, w + 2, K)
      p.vline(cx + rx - 2, 1, 4, K)
      p.px(cx + rx - 2, 0, frame >= 0 && frame % 2 === 0 ? W : Y)
      if (isBack(dir)) {
        p.box(cx - 3, 10, 7, 6, L, { hi: W })
        p.px(cx, 12, Y)
        return
      }
      const fx = side(dir) ? 14 : FACE_X[dir]
      p.px(fx + (side(dir) ? -2 : -5), 24, Y)
      p.px(fx + (side(dir) ? 2 : 5), 24, Y)
    },
  },
  {
    id: 'helmet-storm-crown',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)
      p.box(h.x0 - 1, 9, w + 2, 4, L, { hi: W })
      p.hline(h.x0, 11, w, M)
      const bolts = side(dir) ? [cx - 4, cx, cx + 4] : [cx - 8, cx - 4, cx, cx + 4, cx + 8]
      bolts.forEach((x, index) => {
        const tall = index % 2 === 0 ? 6 : 8
        const flash = frame >= 0 && (frame + index) % 3 === 0

        p.line(x, 9, x + 2, 9 - Math.floor(tall / 2), K)
        p.line(x + 2, 9 - Math.floor(tall / 2), x, 9 - Math.floor(tall / 2) - 1, K)
        p.line(x, 9 - Math.floor(tall / 2) - 1, x + 1, 9 - tall, K)
        p.line(x, 8, x + 1, 9 - Math.floor(tall / 2) + 1, flash ? W : Y)
        p.px(x + 1, 9 - tall + 1, flash ? W : Y)
        p.px(x + 1, 9 - tall, flash ? W : K)
      })
      if (isBack(dir)) {
        p.rect(cx - 1, 10, 3, 2, M)
        return
      }
      if (!side(dir)) {
        p.px(FACE_X[dir] - 7, 11, W)
        p.px(FACE_X[dir] + 7, 11, W)
      }
    },
  },
  {
    id: 'helmet-harvest',
    draw(p, dir, frame) {
      const h = head(dir)
      const w = h.x1 - h.x0 + 1
      const cx = centre(h)

      p.box(h.x0 - 1, 9, w + 2, 3, M, { hi: L })
      const ears = side(dir) ? [cx - 3, cx + 3] : [cx - 7, cx - 2, cx + 3, cx + 8]
      ears.forEach((x, index) => {
        const tall = index % 2 === 0 ? 7 : 5
        p.vline(x, 9 - tall, tall, K)
        for (let y = 9 - tall + 1; y < 9; y += 2) {
          p.px(x - 1, y, Y)
          p.px(x + 1, y + 1, Y)
        }
        p.px(x, 9 - tall - 1, frame >= 0 && (frame + index) % 3 === 0 ? W : Y)
      })
      const sprigs = side(dir) ? [cx] : [cx - 5, cx + 6]
      for (const sx of sprigs) {
        p.vline(sx, 5, 4, K)
        p.px(sx - 1, 5, L)
        p.px(sx + 1, 4, L)
        p.px(sx, 3, L)
      }
      if (isBack(dir)) {
        p.rect(cx - 1, 10, 3, 1, Y)
        return
      }
      if (!side(dir)) {
        p.px(FACE_X[dir] - 6, 10, Y)
        p.px(FACE_X[dir] + 6, 10, Y)
      }
    },
  },
]
