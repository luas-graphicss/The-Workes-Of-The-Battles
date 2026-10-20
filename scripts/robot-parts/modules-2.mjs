import { FREE_SIDE, isBack } from './anatomy.mjs'
import { K, L, M, W, Y } from './raster.mjs'

const mid = (dir) => (dir === 'sw' || dir === 'nw' ? 23 : 24)
const leftHand = (dir) => FREE_SIDE[dir] === 'left'
const round = Math.round

function shadedPoly(p, points, colorAt, outline = K) {
  const ys = points.map(([, y]) => y)
  for (let y = Math.ceil(Math.min(...ys)); y <= Math.floor(Math.max(...ys)); y++) {
    const xs = []
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i]
      const [x1, y1] = points[(i + 1) % points.length]
      if (y0 === y1 || y < Math.min(y0, y1) || y >= Math.max(y0, y1)) continue
      xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = round(xs[i]); x <= round(xs[i + 1]); x++) p.px(x, y, colorAt(x, y))
  }
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % points.length]
    p.line(round(x0), round(y0), round(x1), round(y1), outline)
  }
}

function canopy(p, cx, base, rx, ry) {
  const inside = (x, y, ax, ay) => (x * x) / (ax * ax) + (y * y) / (ay * ay) <= 1
  const panel = (2 * rx + 1) / 6
  for (let dy = -ry; dy <= 0; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if (!inside(dx, dy, rx + 0.5, ry + 0.5)) continue
      const edge = dy === 0 || !inside(dx, dy, rx - 0.5, ry - 0.5)
      const color = Math.floor((dx + rx) / panel) % 2 ? M : Y
      p.px(cx + dx, base + dy, edge ? K : dy === -ry + 1 && dx < 0 ? W : color)
    }
  }
  for (let dx = -rx; dx <= rx; dx += Math.max(2, round(panel))) p.px(cx + dx, base + 1, K)
  p.px(cx + rx, base + 1, K)
  p.vline(cx, base - ry - 2, 2, K)
}

function lightning(p, x, y, length, flash, vertical) {
  const color = flash === 1 ? W : Y
  for (let i = 0; i < length; i++) {
    const zig = [0, 1, 0, -1][i % 4]
    if (vertical) p.px(x + zig, y + i, i % 3 === 0 ? W : color)
    else p.px(x + i, y + zig, i % 3 === 0 ? W : color)
  }
}

function eagle(p, x, y, facing, flap, fromBehind) {

  if (flap) {
    p.poly(
      [
        [x - 2, y - 7],
        [x - 8, y - 12],
        [x - 6, y - 6],
      ],
      L,
      K,
    )
    p.poly(
      [
        [x + 2, y - 7],
        [x + 8, y - 12],
        [x + 6, y - 6],
      ],
      L,
      K,
    )
  }
  p.ellipse(x, y - 5, 3, 4, M)
  p.vline(x - 2, y - 7, 5, L)
  p.vline(x + 2, y - 7, 5, L)
  if (fromBehind) {
    p.rect(x - 1, y - 2, 3, 3, L)
    p.px(x, y, K)
    p.disc(x, y - 10, 2, M)
    p.px(x, y - 11, L)
    return
  }
  p.px(x, y - 3, W)
  p.disc(x + facing, y - 10, 2, W)
  p.px(x + facing * 2, y - 11, K)
  p.px(x + facing * 3, y - 10, Y)
  p.px(x + facing * 4, y - 9, Y)
  p.px(x + facing * 3, y - 9, K)
  p.px(x - 1, y, Y)
  p.px(x + 1, y, Y)
}

function sail(p, hub, angle, squash) {
  const ux = Math.cos(angle) * squash
  const uy = Math.sin(angle)
  const vx = -Math.sin(angle) * squash
  const vy = Math.cos(angle)
  const r0 = 6
  const r1 = 18
  const width = 5
  const at = (r, w) => [hub[0] + ux * r + vx * w, hub[1] + uy * r + vy * w]
  p.poly([at(r0, 0), at(r1, 0), at(r1, width), at(r0, width)].map(([x, y]) => [round(x), round(y)]), W, K)
  for (let r = r0 + 3; r < r1; r += 3) {
    const [x0, y0] = at(r, 0)
    const [x1, y1] = at(r, width)
    p.line(round(x0), round(y0), round(x1), round(y1), L)
  }
  const [mx0, my0] = at(r0, width / 2)
  const [mx1, my1] = at(r1 - 1, width / 2)
  p.line(round(mx0), round(my0), round(mx1), round(my1), L)
  const [tx, ty] = at(r1 + 1, 0)
  p.line(hub[0], hub[1], round(tx), round(ty), K)
}

export const MODULES_2 = [
  {
    id: 'module-toolbox',
    layer: 'front',
    draw(p, dir, frame) {
      const x = leftHand(dir) ? 2 : 34
      const swing = frame >= 0 ? [0, 0, 1, 0, 0, -1][frame] : 0
      p.hline(x + 3, 35, 5, K)
      p.px(x + 2, 36, K)
      p.px(x + 8, 36, K)
      p.box(x + swing, 37, 11, 9, M, { hi: L, sh: K })
      p.hline(x + 1 + swing, 39, 9, K)
      p.rect(x + 4 + swing, 39, 3, 2, Y)
      p.px(x + 5 + swing, 39, W)
      p.px(x + 2 + swing, 41, W)
      p.vline(x + 3 + swing, 42, 2, L)
      p.vline(x + 7 + swing, 42, 2, L)
    },
  },
  {
    id: 'module-umbrella',
    layer: 'back',
    draw(p, dir) {
      if (dir === 'w') {
        p.line(32, 9, 30, 30, K)
        p.line(33, 9, 31, 30, L)
        canopy(p, 33, 8, 11, 6)
        return
      }
      const cx = mid(dir)
      if (isBack(dir)) {
        p.vline(cx, 9, 24, K)
        p.vline(cx + 1, 9, 24, L)
        p.px(cx, 33, K)
        p.hline(cx + 1, 34, 2, K)
        p.px(cx + 3, 33, K)
        p.px(cx + 3, 32, K)
      }
      canopy(p, cx, 8, 17, 7)
    },
  },
  {
    id: 'module-kite',
    layer: 'back',
    draw(p, dir, frame) {
      const sway = frame >= 0 ? [0, 1, 1, 0, -1, -1][frame] : 0
      const kx = 40 + sway
      const ky = 7
      const anchor = dir === 'w' ? [29, 27] : isBack(dir) ? [mid(dir), 31] : [mid(dir) + 9, 22]
      p.line(kx - 1, ky + 6, anchor[0], anchor[1], L)
      const tail = [
        [kx, ky + 8],
        [kx + 2 - sway, ky + 11],
        [kx + 1 - sway, ky + 14],
        [kx + 3, ky + 17],
      ]
      for (let i = 0; i < tail.length - 1; i++) p.line(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], K)
      for (const [bx, by] of tail.slice(1)) {
        p.px(bx - 1, by, Y)
        p.px(bx + 1, by, Y)
        p.px(bx, by, K)
      }
      p.poly(
        [
          [kx, ky - 6],
          [kx + 5, ky],
          [kx, ky + 7],
          [kx - 5, ky],
        ],
        Y,
        K,
      )
      p.poly(
        [
          [kx - 1, ky - 4],
          [kx - 1, ky - 1],
          [kx - 3, ky - 1],
        ],
        M,
        0,
      )
      p.poly(
        [
          [kx + 1, ky + 1],
          [kx + 3, ky + 1],
          [kx + 1, ky + 4],
        ],
        M,
        0,
      )
      p.vline(kx, ky - 5, 12, K)
      p.hline(kx - 4, ky, 9, K)
      p.px(kx - 2, ky - 2, W)
    },
  },
  {
    id: 'module-beehive',
    layer: 'front',
    draw(p, dir, frame) {
      const x = leftHand(dir) ? 2 : 34
      p.vline(x + 5, 34, 2, K)
      p.poly(
        [
          [x + 1, 45],
          [x + 1, 41],
          [x + 2, 38],
          [x + 5, 36],
          [x + 8, 38],
          [x + 9, 41],
          [x + 9, 45],
        ],
        Y,
        K,
      )
      for (const y of [39, 41, 43]) p.hline(x + 2, y, 7, M)
      p.px(x + 4, 38, W)
      p.px(x + 3, 40, W)
      p.rect(x + 4, 43, 3, 2, K)
      p.hline(x, 46, 11, K)
      const t = frame >= 0 ? frame : 0
      const path = [
        [x - 1, 38],
        [x + 2, 34],
        [x + 9, 34],
        [x + 11, 38],
        [x + 11, 43],
        [x - 1, 43],
      ]
      for (let k = 0; k < 2; k++) {
        const [bx, by] = path[(t + k * 3) % path.length]
        p.px(bx, by, K)
        p.px(bx + 1, by, Y)
        p.px(bx, by - 1, W)
      }
    },
  },
  {
    id: 'module-bellows',
    layer: 'back',
    draw(p, dir, frame) {
      const puff = frame >= 0 ? [0, 1, 2, 1, 0, 0][frame] : 0
      if (dir === 'w') {
        p.poly(
          [
            [27, 24 + puff],
            [35, 25 + puff],
            [36, 33],
            [32, 39],
            [28, 38],
          ],
          M,
          K,
        )
        for (let y = 28; y < 37; y += 2) p.hline(29, y, 6, K)
        p.line(27, 24 + puff, 35, 25 + puff, Y)
        p.box(30, 39, 4, 4, L, { hi: W })
        p.px(31, 43, K)
        return
      }
      const cx = mid(dir)
      const top = 25 + puff
      for (let y = top + 3; y < 35; y += 2) {
        p.hline(cx - 11, y, 23, M)
        p.hline(cx - 11, y + 1, 23, K)
      }
      p.vline(cx - 12, top + 3, 35 - top - 3, K)
      p.vline(cx + 12, top + 3, 35 - top - 3, K)
      p.box(cx - 13, top, 27, 3, Y, { hi: W, sh: M, round: true })
      p.box(cx - 12, 35, 25, 3, Y, { hi: W, sh: M })
      p.box(cx - 2, 38, 5, 4, L, { hi: W })
      p.px(cx, 42, K)
      if (puff === 2) {
        p.px(cx, 44, W)
        p.px(cx - 1, 45, L)
        p.px(cx + 1, 45, L)
      }
    },
  },
  {
    id: 'module-windvane',
    layer: 'back',
    draw(p, dir, frame) {
      const x = dir === 'w' ? 32 : 39
      const turn = frame >= 0 ? [7, 4, -4, -7, -4, 4][frame] : 7
      p.vline(x, 7, 21, K)
      p.vline(x + 1, 8, 19, L)
      p.px(x, 6, Y)

      const head = x - turn
      const tail = x + turn
      p.line(head, 9, tail, 9, K)
      p.px(head, 8, K)
      p.px(head, 10, K)
      p.px(head - Math.sign(turn), 9, K)
      p.px(tail, 8, Y)
      p.px(tail, 10, Y)
      p.px(tail + Math.sign(turn), 9, Y)

      const f = Math.sign(turn) || 1
      p.rect(x - 1, 3, 4, 3, Y)
      p.hline(x - 1, 6, 4, K)
      p.px(x - 2 * f + (f > 0 ? 0 : 1), 2, Y)
      p.px(x - 2 * f + (f > 0 ? 0 : 1), 1, K)
      p.px(x - 2 * f + (f > 0 ? -1 : 2), 2, K)
      p.px(x + 2 * f + (f > 0 ? 1 : 0), 2, K)
      p.px(x + 2 * f + (f > 0 ? 1 : 0), 3, M)
      p.px(x, 4, W)
    },
  },
  {
    id: 'module-cannonette',
    layer: 'front',
    draw(p, dir, frame) {
      const kick = frame === 3 ? 1 : 0
      if (dir === 'w') {
        p.box(25, 23, 7, 5, L, { hi: W, sh: M })
        p.box(13 + kick, 22, 15, 4, M, { hi: L, sh: K })
        p.rect(12 + kick, 21, 2, 6, K)
        p.px(16 + kick, 23, W)
        p.px(27, 25, Y)
        if (kick) {
          p.px(10, 22, W)
          p.px(9, 24, L)
          p.px(10, 25, L)
        }
        return
      }
      const cx = leftHand(dir) ? 10 : 37
      p.box(cx - 4, 24, 9, 4, L, { hi: W, sh: M })
      p.px(cx, 25, Y)
      if (isBack(dir)) {
        p.box(cx - 3, 17, 7, 8, M, { hi: L, sh: K })
        p.disc(cx, 20, 1, Y)
        return
      }

      p.box(cx - 3, 16 + kick, 7, 9 - kick, M, { hi: L, sh: K })
      p.box(cx - 4, 14 + kick, 9, 3, L, { hi: W })
      p.rect(cx - 2, 15 + kick, 5, 1, K)
      p.px(cx - 1, 19, W)
      p.hline(cx - 2, 21, 5, K)
      if (kick) {
        p.px(cx, 11, W)
        p.px(cx - 1, 12, L)
        p.px(cx + 1, 12, L)
      }
    },
  },
  {
    id: 'module-barrier',
    layer: 'front',
    draw(p, dir, frame) {
      const bob = frame >= 0 ? [0, -1, -1, 0, 1, 1][frame] : 0
      const x = leftHand(dir) ? 1 : 37
      const y = 24 + bob
      p.poly(
        [
          [x + 5, y],
          [x + 10, y + 3],
          [x + 10, y + 11],
          [x + 5, y + 14],
          [x, y + 11],
          [x, y + 3],
        ],
        L,
        K,
      )
      p.poly(
        [
          [x + 6, y + 8],
          [x + 9, y + 10],
          [x + 6, y + 12],
        ],
        M,
        0,
      )
      p.line(x + 5, y + 2, x + 5, y + 12, W)
      p.line(x + 2, y + 4, x + 5, y + 7, W)
      p.line(x + 8, y + 4, x + 5, y + 7, M)
      p.px(x + 2, y + 5, W)
      const glints = [
        [x + 5, y - 1],
        [x + 11, y + 3],
        [x + 11, y + 11],
        [x + 5, y + 15],
        [x - 1, y + 11],
        [x - 1, y + 3],
      ]
      if (frame >= 0) {
        const [gx, gy] = glints[frame]
        p.px(gx, gy, W)
      }
    },
  },
  {
    id: 'module-reactor',
    layer: 'back',
    draw(p, dir, frame) {
      const glow = frame >= 0 ? frame % 3 : 0
      const tip = glow === 1 ? W : Y
      if (dir === 'w') {
        p.box(32, 15, 3, 11, M, { hi: L })
        p.px(33, 14, tip)
        p.box(27, 25, 10, 15, L, { hi: W, sh: M })
        p.disc(32, 31, 3, K)
        p.disc(32, 31, 2, glow === 2 ? Y : W)
        for (let y = 36; y < 39; y++) p.px(28 + ((y - 36) * 3) % 8, y, K)
        return
      }
      const cx = mid(dir)
      for (const x of [cx - 16, cx + 14]) {
        p.box(x, 16, 3, 12, M, { hi: L })
        p.px(x + 1, 15, tip)
        if (glow === 1) p.px(x + 1, 14, Y)
      }
      p.box(cx - 13, 25, 27, 14, L, { hi: W, sh: M })
      p.rect(cx - 12, 35, 25, 3, Y)
      for (let x = cx - 12; x <= cx + 11; x += 3) {
        p.px(x, 37, K)
        p.px(x + 1, 36, K)
        p.px(x + 2, 35, K)
      }
      p.disc(cx, 30, 4, K)
      p.disc(cx, 30, 3, glow === 2 ? Y : W)
      p.px(cx - 1, 29, W)
      p.px(cx + 1, 31, L)
    },
  },
  {
    id: 'module-eagle',
    layer: 'front',
    draw(p, dir, frame) {
      const flap = frame === 1 || frame === 2
      if (dir === 'w') {
        eagle(p, 27, 26, -1, flap, false)
        return
      }
      const x = leftHand(dir) ? 10 : 37
      eagle(p, x, 26, leftHand(dir) ? -1 : 1, flap, isBack(dir))
    },
  },
  {
    id: 'module-storm-cell',
    layer: 'back',
    draw(p, dir, frame) {
      const flash = frame >= 0 ? frame % 3 : 0
      if (dir === 'w') {
        p.box(28, 21, 8, 3, Y, { hi: W })
        p.box(27, 24, 10, 15, L, { hi: W, sh: M })
        lightning(p, 32, 26, 11, flash, true)
        p.box(28, 39, 8, 2, Y)
        if (flash === 1) {
          p.px(38, 27, W)
          p.px(39, 30, Y)
        }
        return
      }
      const cx = mid(dir)
      p.box(cx - 13, 26, 27, 9, L, { hi: W, sh: M })
      if (isBack(dir)) lightning(p, cx - 11, 30, 23, flash, false)
      p.box(cx - 17, 25, 5, 11, Y, { hi: W, sh: M })
      p.box(cx + 13, 25, 5, 11, Y, { hi: W, sh: M })
      p.hline(cx - 16, 30, 3, K)
      p.hline(cx + 14, 30, 3, K)
      if (flash === 1) {
        p.px(cx - 19, 27, W)
        p.px(cx - 20, 29, Y)
        p.px(cx + 19, 33, W)
        p.px(cx + 20, 31, Y)
      }
      if (flash === 2) {
        p.px(cx - 19, 33, Y)
        p.px(cx + 19, 27, Y)
      }
    },
  },
  {
    id: 'module-aurora-cape',
    layer: 'back',
    draw(p, dir, frame) {
      const t = frame >= 0 ? frame : 0
      const wave = frame >= 0 ? [0, 1, 0, -1, 0, 1][frame] : 0

      const aurora = (x, y) => {
        const drift = Math.round(Math.sin((y + t * 2) / 3) * 1.5)
        return [M, M, L, W, L, M, M, M][((Math.floor((x + drift) / 2) % 8) + 8) % 8]
      }
      if (dir === 'w') {
        shadedPoly(
          p,
          [
            [25, 26],
            [29, 26],
            [36 + wave, 34],
            [39 + wave, 42],
            [28, 42],
          ],
          aurora,
        )
        p.hline(29, 41, 9 + wave, Y)
        p.px(26, 27, Y)
        return
      }
      const cx = mid(dir)
      shadedPoly(
        p,
        [
          [cx - 10, 26],
          [cx + 10, 26],
          [cx + 14 + wave, 41],
          [cx - 14 - wave, 41],
        ],
        aurora,
      )
      p.hline(cx - 13 - wave, 40, 27 + wave * 2, Y)
      p.hline(cx - 9, 27, 19, Y)
      if (isBack(dir)) {
        p.px(cx, 27, W)
        p.vline(cx, 28, 2, K)
      }
    },
  },
  {
    id: 'module-mill-sails',
    layer: 'back',
    draw(p, dir, frame) {
      const angle = Math.PI / 4 + (frame >= 0 ? (frame * Math.PI) / 12 : 0)
      const side = dir === 'w'
      const hub = side ? [32, 18] : [mid(dir), 17]
      const squash = side ? 0.35 : 1
      if (isBack(dir) || side) {
        p.box(hub[0] - 1, hub[1] + 2, 3, side ? 10 : 9, M, { hi: L })
      }
      for (let i = 0; i < 4; i++) sail(p, hub, angle + (i * Math.PI) / 2, squash)
      p.disc(hub[0], hub[1], 2, Y)
      p.px(hub[0], hub[1], K)
    },
  },
]
