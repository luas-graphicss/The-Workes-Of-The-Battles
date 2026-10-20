export type Profiler = {
  readonly enabled: boolean
  begin(context: CanvasRenderingContext2D): void
  mark(context: CanvasRenderingContext2D, stage: string): void
  report(): string
}

const ENABLED = typeof window !== 'undefined' && /(^|[#&])stages(&|$)/.test(window.location.hash)

const noop: Profiler = { enabled: false, begin() {}, mark() {}, report: () => '' }

export function createProfiler(): Profiler {
  if (!ENABLED) return noop
  const totals = new Map<string, number>()
  const order: string[] = []
  let frames = 0
  let last = 0

  function flush(context: CanvasRenderingContext2D) {
    context.getImageData(0, 0, 1, 1)
    return performance.now()
  }

  return {
    enabled: true,
    begin(context) {
      frames++
      last = flush(context)

      const now = flush(context)
      add('nop', now - last)
      last = now
    },
    mark(context, stage) {
      const now = flush(context)
      add(stage, now - last)
      last = now
    },
    report() {
      if (!frames) return ''
      const parts = order.map((stage) => `${stage}=${((totals.get(stage) ?? 0) / frames).toFixed(2)}`)
      totals.clear()
      order.length = 0
      frames = 0
      return parts.join(' ')
    },
  }

  function add(stage: string, ms: number) {
    if (!totals.has(stage)) order.push(stage)
    totals.set(stage, (totals.get(stage) ?? 0) + ms)
  }
}
