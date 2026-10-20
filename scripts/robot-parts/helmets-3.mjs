import { FACE_X, HEAD, isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const head = (dir) => HEAD[dir]
const centre = (h) => Math.floor((h.x0 + h.x1) / 2)
const width = (h) => h.x1 - h.x0 + 1
const side = (dir) => dir === 'w'
const faceX = (dir) => (side(dir) ? 15 : FACE_X[dir])

function dome(p, h, top, fill, { hi = W, rim = true } = {}) {
  const cx = centre(h)
  const rx = Math.floor(width(h) / 2)
  const ry = 10 - top + 1
  for (let dy = -ry; dy <= 0; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const inside = (dx * dx) / ((rx + 0.5) * (rx + 0.5)) + (dy * dy) / ((ry + 0.5) * (ry + 0.5)) <= 1
      if (!inside) continue
      const edge = (dx * dx) / ((rx - 0.5) * (rx - 0.5)) + (dy * dy) / ((ry - 0.5) * (ry - 0.5)) > 1
      p.px(cx + dx, 10 + dy, edge ? K : dx < -rx / 2 && dy < -1 ? hi : fill)
    }
  }
  if (rim) p.hline(h.x0, 10, width(h), K)
}

function band(p, h, y, rows, fill, hi) {
  p.box(h.x0 - 1, y, width(h) + 2, rows, fill, { hi })
}

function visor(p, dir, h, y, rows, fill, glint = W) {
  if (isBack(dir)) return
  const x0 = side(dir) ? h.x0 - 1 : h.x0 - 1
  const w = side(dir) ? Math.floor(width(h) * 0.75) + 1 : width(h) + 2
  p.box(x0, y, w, rows, fill, { sh: K })
  p.px(x0 + 2, y + 1, glint)
  p.px(x0 + 3, y + 1, glint)
}

function leaf(p, x, y, dir, color = M) {
  p.px(x, y, color)
  p.px(x + dir, y - 1, color)
  p.px(x + dir * 2, y - 2, L)
  p.px(x + dir, y, K)
}

function gem(p, x, y, bright) {
  p.px(x, y - 1, K)
  p.px(x - 1, y, K)
  p.px(x + 1, y, K)
  p.px(x, y + 1, K)
  p.px(x, y, bright ? W : Y)
}

export const HELMETS_3 = [
  {
    id: 'helmet-moss-hood',
    draw(p, dir) {
      const h = head(dir)

      dome(p, h, 4, M, { hi: L })
      p.box(h.x0 - 2, 10, width(h) + 4, 4, M, { sh: K })
      for (let x = h.x0 - 1; x <= h.x1 + 1; x += 3) p.px(x, 13, L)
      if (!isBack(dir)) p.hline(h.x0 + 1, 13, width(h) - 2, K)
      leaf(p, h.x1 - 1, 6, 1)
      leaf(p, h.x0 + 2, 5, -1, L)
    },
  },
  {
    id: 'helmet-acorn',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 3, M, { hi: L })
      for (let y = 5; y <= 9; y += 2) for (let x = h.x0 + 1 + (y % 4 === 1 ? 0 : 2); x < h.x1; x += 4) p.px(x, y, K)
      band(p, h, 10, 3, M, L)
      p.vline(cx, 1, 3, K)
      p.px(cx + 1, 1, M)
      p.px(cx + 1, 0, L)
    },
  },
  {
    id: 'helmet-mushroom',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      p.ellipse(cx, 8, Math.floor(width(h) / 2) + 4, 5, Y)
      p.hline(h.x0 - 3, 12, width(h) + 6, K)
      for (let x = h.x0 - 2; x <= h.x1 + 2; x += 2) p.px(x, 11, L)
      for (const [dx, dy] of [[-6, 6], [-1, 4], [5, 7], [2, 9], [-7, 9]]) {
        p.px(cx + dx, dy, W)
        p.px(cx + dx + 1, dy, W)
      }
      p.hline(h.x0 + 1, 5, 4, W)
    },
  },
  {
    id: 'helmet-ranger',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      p.box(h.x0 - 4, 10, width(h) + 8, 2, M, { hi: L })
      p.poly(
        [
          [h.x0 + 1, 10],
          [h.x1, 10],
          [h.x1 - 3, 3],
          [cx, 4],
          [h.x0 + 4, 3],
        ],
        M,
        K,
      )
      p.hline(h.x0 + 2, 9, width(h) - 3, K)
      p.px(cx - 1, 4, L)
      p.px(cx + 1, 4, L)
      if (!isBack(dir)) p.px(faceX(dir), 9, Y)
    },
  },
  {
    id: 'helmet-beekeeper',
    draw(p, dir) {
      const h = head(dir)

      p.box(h.x0 - 3, 8, width(h) + 6, 3, W, { sh: L })
      dome(p, h, 3, W, { hi: W })
      p.hline(h.x0 + 1, 9, width(h) - 2, L)
      if (isBack(dir)) {
        p.rect(h.x0 - 1, 11, width(h) + 2, 12, L)
        for (let y = 12; y < 23; y += 2) p.hline(h.x0 - 1, y, width(h) + 2, M)
        return
      }
      for (let y = 11; y <= 24; y++) {
        for (let x = h.x0 - 1; x <= h.x1 + 1; x++) if ((x + y) % 3 === 0) p.px(x, y, L)
      }
      p.vline(h.x0 - 1, 11, 14, K)
      p.vline(h.x1 + 1, 11, 14, K)
    },
  },
  {
    id: 'helmet-wolf',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 5, L, { hi: W })
      for (const ex of [h.x0 + 2, h.x1 - 5]) {
        p.poly(
          [
            [ex, 7],
            [ex + 4, 7],
            [ex + 2, 1],
          ],
          L,
          K,
        )
        p.px(ex + 2, 5, M)
      }
      if (isBack(dir)) {
        p.rect(h.x0 - 1, 11, width(h) + 2, 10, L)
        for (let x = h.x0 - 1; x <= h.x1 + 1; x += 3) p.vline(x, 18, 4, M)
        return
      }
      p.box(cx - 5, 9, 11, 4, L, { sh: M })
      p.px(cx - 4, 10, K)
      p.px(cx + 4, 10, K)
      p.px(cx, 12, K)
      p.px(cx - 2, 12, W)
      p.px(cx + 2, 12, W)
    },
  },
  {
    id: 'helmet-stag-skull',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 5, W, { hi: W })
      for (const s of [-1, 1]) {
        const x = cx + s * 6
        p.line(x, 6, x + s * 5, 0, K)
        p.line(x + s, 6, x + s * 6, 1, L)
        p.px(x + s * 2, 3, K)
        p.px(x + s * 3, 1, K)
        p.px(x + s * 4, 3, L)
      }
      if (isBack(dir)) return
      p.rect(cx - 6, 11, 13, 3, W)
      p.px(cx - 4, 12, K)
      p.px(cx - 3, 12, K)
      p.px(cx + 3, 12, K)
      p.px(cx + 4, 12, K)
      p.px(cx, 13, M)
    },
  },
  {
    id: 'helmet-firewatch',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 4, Y, { hi: W })
      band(p, h, 10, 3, Y, W)
      p.box(cx - 3, 1, 7, 5, L, { hi: W, sh: M })
      p.rect(cx - 1, 2, 3, 3, W)
      p.px(cx, 3, Y)
      p.hline(cx - 2, 6, 5, K)
      if (!isBack(dir)) p.hline(h.x0 + 2, 11, width(h) - 4, K)
    },
  },
  {
    id: 'helmet-fox',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 4, Y, { hi: W })
      for (const ex of [h.x0 + 1, h.x1 - 4]) {
        p.poly(
          [
            [ex, 7],
            [ex + 4, 7],
            [ex + 2, 2],
          ],
          Y,
          K,
        )
        p.px(ex + 2, 6, K)
      }
      band(p, h, 10, 2, Y, W)
      if (isBack(dir)) {
        p.rect(h.x0, 12, width(h), 6, Y)
        p.hline(h.x0, 18, width(h), W)
        return
      }
      p.rect(cx - 2, 11, 5, 2, W)
      p.px(cx, 13, K)
    },
  },
  {
    id: 'helmet-lantern-crown',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      band(p, h, 8, 3, M, L)
      const xs = side(dir) ? [cx - 5, cx, cx + 5] : [cx - 8, cx - 3, cx + 3, cx + 8]
      xs.forEach((x, i) => {
        p.box(x - 1, 2 + (i % 2), 4, 6, Y, { hi: W, sh: M, round: true })
        p.px(x, 1 + (i % 2), K)
        p.px(x, 5 + (i % 2), W)
      })
    },
  },
  {
    id: 'helmet-league-mask',
    draw(p, dir) {
      const h = head(dir)

      dome(p, h, 4, M, { hi: L })
      p.rect(h.x0, 10, width(h), 14, M)
      p.vline(h.x0, 10, 14, K)
      p.vline(h.x1, 10, 14, K)
      if (isBack(dir)) {
        for (let y = 12; y < 22; y += 3) {
          p.px(centre(h) - 1, y, K)
          p.px(centre(h) + 1, y + 1, K)
        }
        return
      }
      const fx = faceX(dir)
      p.poly(
        [
          [fx - 8, 14],
          [fx - 3, 10],
          [fx + 3, 10],
          [fx + 8, 14],
          [fx + 6, 17],
          [fx - 6, 17],
        ],
        Y,
        K,
      )
      p.rect(fx - 5, 13, 3, 3, K)
      p.rect(fx + 3, 13, 3, 3, K)
      p.px(fx - 4, 14, W)
      p.px(fx + 4, 14, W)
      p.rect(fx - 2, 19, 5, 3, K)
    },
  },
  {
    id: 'helmet-bookie-visor',
    draw(p, dir) {
      const h = head(dir)

      p.box(h.x0 - 1, 10, width(h) + 2, 2, K)
      if (!isBack(dir)) {
        const w = side(dir) ? 12 : width(h) + 6
        p.box(h.x0 - 3, 11, w, 3, M, { hi: L })
        p.hline(h.x0 - 2, 12, w - 2, L)
      }
      const pencil = side(dir) ? h.x0 + 1 : h.x1 + 1
      p.vline(pencil, 9, 7, Y)
      p.px(pencil, 16, K)
      p.px(pencil, 8, W)
    },
  },
  {
    id: 'helmet-boxer-guard',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 7, L, { hi: W })
      p.box(h.x0 - 2, 10, 5, 12, L, { hi: W, sh: M, round: true })
      p.box(h.x1 - 2, 10, 5, 12, L, { hi: W, sh: M, round: true })
      p.hline(h.x0, 10, width(h), K)
      if (isBack(dir)) {
        p.rect(h.x0 + 2, 11, width(h) - 4, 3, L)
        p.px(cx, 12, K)
        return
      }
      p.hline(h.x0 + 2, 22, width(h) - 4, K)
      p.px(cx, 21, Y)
    },
  },
  {
    id: 'helmet-neon-cap',
    draw(p, dir) {
      const h = head(dir)

      dome(p, h, 6, K, { hi: M })
      band(p, h, 10, 2, K, M)
      p.hline(h.x0 + 1, 7, width(h) - 2, Y)
      p.hline(h.x0 + 2, 7, 3, W)
      if (isBack(dir)) {
        p.box(h.x0 - 3, 10, 5, 3, K)
        p.hline(h.x0 - 2, 11, 3, M)
        return
      }
      const peak = side(dir) ? h.x1 - 1 : h.x1 + 1
      p.box(peak - 2, 10, 5, 3, K)
      p.px(peak, 11, Y)
    },
  },
  {
    id: 'helmet-welder',
    draw(p, dir) {
      const h = head(dir)

      dome(p, h, 7, M, { hi: L })
      if (isBack(dir)) {
        band(p, h, 10, 3, M, L)
        p.rect(h.x0 + 2, 13, width(h) - 4, 2, K)
        return
      }
      const w = side(dir) ? width(h) - 2 : width(h) + 2
      p.box(h.x0 - 1, 10, w, 14, M, { hi: L, sh: K })
      p.box(h.x0 + 2, 13, w - 6, 5, K)
      p.px(h.x0 + 3, 14, Y)
      p.px(h.x0 + 4, 14, W)
      p.hline(h.x0 + 1, 21, w - 4, K)
    },
  },
  {
    id: 'helmet-top-hat',
    draw(p, dir) {
      const h = head(dir)

      p.box(h.x0 - 3, 9, width(h) + 6, 2, K)
      p.box(h.x0 + 1, 0, width(h) - 2, 10, K)
      p.vline(h.x0 + 2, 1, 8, M)
      p.hline(h.x0 + 1, 0, width(h) - 2, M)
      p.hline(h.x0 + 1, 7, width(h) - 2, Y)
      p.px(h.x0 + 3, 7, W)
      p.hline(h.x0 - 2, 9, 3, L)
    },
  },
  {
    id: 'helmet-headphones',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      for (let dx = -8; dx <= 8; dx++) {
        const y = 7 + Math.round((dx * dx) / 14)
        p.px(cx + dx, y, K)
        p.px(cx + dx, y + 1, dx % 2 ? L : M)
      }
      const cups = side(dir) ? [h.x0 - 1] : [h.x0 - 2, h.x1 - 2]
      for (const x of cups) {
        p.box(x, 13, 5, 7, M, { hi: L, sh: K, round: true })
        p.px(x + 2, 16, Y)
      }
      if (isBack(dir)) return
      const mx = side(dir) ? h.x0 + 3 : h.x1 - 3
      p.line(mx - 2, 20, faceX(dir) + (side(dir) ? -3 : 3), 22, K)
      p.px(faceX(dir) + (side(dir) ? -4 : 4), 22, L)
    },
  },
  {
    id: 'helmet-visitor-veil',
    draw(p, dir) {
      const h = head(dir)

      p.poly(
        [
          [h.x0 - 1, 24],
          [h.x1 + 1, 24],
          [h.x1, 10],
          [centre(h) + 1, 2],
          [h.x0, 10],
        ],
        K,
        K,
      )
      p.line(h.x0 + 1, 10, centre(h), 4, M)
      p.vline(h.x0 + 1, 11, 12, M)
      if (isBack(dir)) return
      const fx = faceX(dir)
      p.hline(fx - 3, 15, 7, M)
      p.px(fx - 2, 15, Y)
      p.px(fx + 2, 15, Y)
    },
  },
  {
    id: 'helmet-dark-crystal',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      band(p, h, 11, 2, L, W)
      p.poly(
        [
          [cx - 3, 11],
          [cx + 3, 11],
          [cx + 2, 4],
          [cx, 1],
          [cx - 2, 4],
        ],
        K,
        K,
      )
      p.line(cx - 1, 5, cx - 1, 9, M)
      p.px(cx, 3, M)
      for (const s of [-1, 1]) {
        p.px(cx + s * 5, 10, K)
        p.px(cx + s * 6, 8, K)
        p.px(cx + s * 6, 9, M)
      }
    },
  },
  {
    id: 'helmet-ozone-dome',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      const rx = Math.floor(width(h) / 2) + 2
      for (let dy = -11; dy <= 0; dy++) {
        for (let dx = -rx; dx <= rx; dx++) {
          const d = (dx * dx) / ((rx + 0.5) * (rx + 0.5)) + (dy * dy) / (11.5 * 11.5)
          if (d > 1) continue
          const edge = (dx * dx) / ((rx - 0.5) * (rx - 0.5)) + (dy * dy) / (10.5 * 10.5) > 1
          if (edge) p.px(cx + dx, 13 + dy, K)
          else if ((dx + dy) % 5 === 0 && dx < 0) p.px(cx + dx, 13 + dy, W)
          else if (dy === -9 && dx > -4 && dx < 2) p.px(cx + dx, 13 + dy, W)
        }
      }
      band(p, h, 13, 2, L, W)
      p.px(h.x0, 14, K)
      p.px(h.x1, 14, K)
    },
  },
  {
    id: 'helmet-seed-crown',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      band(p, h, 10, 2, M, L)
      for (const s of [-8, -4, 0, 4, 8]) {
        const tall = s === 0 ? 7 : Math.abs(s) === 4 ? 5 : 3
        p.poly(
          [
            [cx + s - 2, 10],
            [cx + s + 2, 10],
            [cx + s, 10 - tall],
          ],
          M,
          K,
        )
        p.px(cx + s, 9, L)
      }
      gem(p, cx, 6, true)
      p.px(cx, 4, Y)
    },
  },
  {
    id: 'helmet-pinecone',
    draw(p, dir) {
      const h = head(dir)

      dome(p, h, 2, M, { hi: L })
      for (let y = 4; y <= 10; y += 2) {
        for (let x = h.x0 + 1 + ((y / 2) % 2) * 2; x < h.x1; x += 4) {
          p.px(x, y, K)
          p.px(x + 1, y, K)
          p.px(x, y - 1, L)
        }
      }
      band(p, h, 10, 2, M, L)
      p.px(centre(h), 1, Y)
    },
  },
  {
    id: 'helmet-bark',
    draw(p, dir) {
      const h = head(dir)

      p.box(h.x0 - 1, 3, width(h) + 2, 10, M, { hi: L, sh: K })
      for (let x = h.x0 + 1; x < h.x1; x += 3) p.vline(x, 4, 8, K)
      p.disc(side(dir) ? h.x0 + 3 : h.x1 - 3, 7, 2, M, K)
      p.px(side(dir) ? h.x0 + 3 : h.x1 - 3, 7, K)
      p.hline(h.x0, 3, 3, L)
      leaf(p, h.x0 + 1, 2, -1)
    },
  },
  {
    id: 'helmet-riverstone',
    draw(p, dir) {
      const h = head(dir)
      const cx = centre(h)

      dome(p, h, 3, L, { hi: W })
      band(p, h, 10, 2, L, W)
      p.hline(h.x0 + 2, 6, width(h) - 4, M)
      p.px(cx - 4, 7, W)
      p.px(cx + 3, 8, W)
      if (!isBack(dir)) {
        p.px(h.x0 + 2, 12, W)
        p.px(h.x0 + 2, 13, L)
        p.px(h.x1 - 3, 12, W)
      }
    },
  },
  {
    id: 'helmet-comet-tail',
    draw(p, dir, frame) {
      const h = head(dir)
      const cx = centre(h)
      const flick = frame >= 0 ? frame % 3 : 0

      dome(p, h, 6, L, { hi: W })
      band(p, h, 10, 3, L, W)
      p.hline(h.x0 + 1, 11, width(h) - 2, Y)
      const back = side(dir) ? h.x1 + 1 : isBack(dir) ? cx : h.x0 - 1
      const dirX = side(dir) ? 1 : -1
      for (let i = 0; i < 6; i++) {
        const y = 5 + i
        const x = isBack(dir) ? cx - 3 + i : back + dirX * (i + (i > 2 ? 1 : 0))
        p.px(x, isBack(dir) ? 2 + (i % 2) : y, (i + flick) % 3 === 0 ? W : Y)
      }
    },
  },
]
