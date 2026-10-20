export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

export function smoothstep(start: number, end: number, value: number) {
  const t = clamp01((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

export function progress(start: number, end: number, value: number) {
  return clamp01((value - start) / (end - start))
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInQuad(t: number) {
  return t * t
}

export function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export function easeOutBack(t: number, overshoot = 1.4) {
  const c3 = overshoot + 1
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2)
}

export function decay(start: number, time: number, rate: number) {
  return time < start ? 0 : Math.exp(-(time - start) * rate)
}
