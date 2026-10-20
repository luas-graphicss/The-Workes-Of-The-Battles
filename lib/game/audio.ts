export type Cue =
  | 'meteor'
  | 'impact'
  | 'heartbeat'
  | 'crack'
  | 'split'
  | 'step'
  | 'door'
  | 'select'
  | 'buy'
  | 'equip'
  | 'deny'
  | 'hit'
  | 'heavy'
  | 'shoot'
  | 'bolt'
  | 'guard'
  | 'parry'
  | 'dodge'
  | 'hurt'
  | 'ko'
  | 'bell'
  | 'alarm'
  | 'win'
  | 'lose'
  | 'coin'
  | 'warp'
  | 'charge'
  | 'swing'
  | 'card'
  | 'transform'
  | 'super'
  | 'ready'
  | 'fire'
  | 'water'
  | 'earth'
  | 'wind'
  | 'thunder'
  | 'ice'
  | 'light'
  | 'shadow'
export type Bed = 'silent' | 'night' | 'fire' | 'day'

export type Sound = {
  unlock(): void
  cue(name: Cue, duration?: number): void
  stopCue(name: Cue): void
  stopCues(): void
  bed(name: Bed): void
  toggleMuted(): boolean
  setMuted(muted: boolean): void
  setVolumes(levels: Volumes): void
  readonly muted: boolean
  destroy(): void
}

export type Volumes = { master: number; ambience: number; effects: number }

type Bus = 'ambience' | 'effects'

type Voice = { name: Cue; stop: (at: number) => void }

const MASTER_LEVEL = 0.9

export function createSound(): Sound {
  let context: AudioContext | null = null
  let master: GainNode
  let dry: GainNode
  let send: GainNode

  const synths = {
    white: (audio: AudioContext) => noise(audio, 3, false),
    brown: (audio: AudioContext) => noise(audio, 3, true),
    crackle: crackleBuffer,
    crickets: cricketBuffer,
    birds: birdBuffer,
  } as const
  const samples = new Map<keyof typeof synths, AudioBuffer>()
  let warmup: ReturnType<typeof setTimeout> | null = null
  const beds = new Map<Bed, GainNode>()
  const voices = new Set<Voice>()
  let muted = false
  let currentBed: Bed = 'silent'
  let volumes: Volumes = { master: 1, ambience: 1, effects: 1 }
  const buses = new Map<Bus, { dry: GainNode; send: GainNode }>()

  const masterLevel = () => (muted ? 0 : MASTER_LEVEL * volumes.master)

  function applyLevels() {
    if (!context) return
    const now = context.currentTime
    master.gain.setTargetAtTime(masterLevel(), now, 0.05)
    for (const [name, bus] of buses) {
      bus.dry.gain.setTargetAtTime(volumes[name], now, 0.05)
      bus.send.gain.setTargetAtTime(volumes[name], now, 0.05)
    }
  }

  function unlock() {
    if (!context) {
      const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      context = new AudioContextClass()
      build(context)
    }
    if (context.state === 'suspended') void context.resume()
  }

  function build(audio: AudioContext) {
    const compressor = audio.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.knee.value = 12
    compressor.ratio.value = 4
    compressor.connect(audio.destination)
    master = audio.createGain()
    master.gain.value = masterLevel()
    master.connect(compressor)
    dry = audio.createGain()
    dry.connect(master)
    const reverb = audio.createConvolver()
    const wet = audio.createGain()
    wet.gain.value = 0.55
    send = audio.createGain()
    send.connect(reverb)
    reverb.connect(wet)
    wet.connect(master)
    for (const name of ['ambience', 'effects'] as const) {
      const busDry = audio.createGain()
      const busSend = audio.createGain()
      busDry.gain.value = volumes[name]
      busSend.gain.value = volumes[name]
      busDry.connect(dry)
      busSend.connect(send)
      buses.set(name, { dry: busDry, send: busSend })
    }
    document.addEventListener('visibilitychange', onVisibility)

    const pending: (() => void)[] = [
      () => {
        reverb.buffer = impulse(audio, 2.8)
      },
      ...(Object.keys(synths) as (keyof typeof synths)[]).map((name) => () => sample(name)),
    ]
    const step = () => {
      warmup = null
      if (context !== audio) return
      pending.shift()?.()
      if (pending.length) warmup = setTimeout(step, 0)
    }
    warmup = setTimeout(step, 0)
  }

  function sample(name: keyof typeof synths) {
    let buffer = samples.get(name)
    if (!buffer) {
      buffer = synths[name](context as AudioContext)
      samples.set(name, buffer)
    }
    return buffer
  }

  function onVisibility() {
    if (!context) return
    if (document.hidden) void context.suspend()
    else void context.resume()
  }

  function output(node: AudioNode, reverbAmount: number, busName: Bus = 'effects') {
    const bus = buses.get(busName)
    node.connect(bus?.dry ?? dry)
    if (reverbAmount > 0 && context) {
      const amount = context.createGain()
      amount.gain.value = reverbAmount
      node.connect(amount)
      amount.connect(bus?.send ?? send)
    }
  }

  function track(name: Cue, nodes: (AudioScheduledSourceNode | null)[], level: GainNode) {
    const voice: Voice = {
      name,
      stop(at) {
        level.gain.cancelScheduledValues(at)
        level.gain.setTargetAtTime(0, at, 0.03)
        for (const node of nodes) node?.stop(at + 0.25)
        voices.delete(voice)
      },
    }
    voices.add(voice)
    return voice
  }

  function play(buffer: AudioBuffer, loop: boolean, rate = 1) {
    const node = (context as AudioContext).createBufferSource()
    node.buffer = buffer
    node.loop = loop
    node.playbackRate.value = rate
    return node
  }

  function filter(type: BiquadFilterType, frequency: number, q = 0.7) {
    const node = (context as AudioContext).createBiquadFilter()
    node.type = type
    node.frequency.value = frequency
    node.Q.value = q
    return node
  }

  function gain(value: number) {
    const node = (context as AudioContext).createGain()
    node.gain.value = value
    return node
  }

  function pan(value: number) {
    const audio = context as AudioContext
    if (typeof audio.createStereoPanner !== 'function') return gain(1)
    const node = audio.createStereoPanner()
    node.pan.value = value
    return node
  }

  function chain(...nodes: AudioNode[]) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
    return nodes[nodes.length - 1]
  }

  function burst(at: number, length: number, type: BiquadFilterType, frequency: number, level: number, panning = 0, reverbAmount = 0.2) {
    const source = play(sample('white'), false, 0.8 + Math.random() * 0.4)
    const envelope = gain(0)
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(level, at + 0.004)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
    output(chain(source, filter(type, frequency, 1.2), envelope, pan(panning)), reverbAmount)
    source.start(at, Math.random() * 2)
    source.stop(at + length + 0.05)
  }

  function ping(at: number, frequency: number, level: number, length: number, panning = 0, reverbAmount = 0.6, type: OscillatorType = 'sine') {
    const audio = context as AudioContext
    const oscillator = audio.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = frequency
    const envelope = gain(0)
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(level, at + 0.005)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
    output(chain(oscillator, envelope, pan(panning)), reverbAmount)
    oscillator.start(at)
    oscillator.stop(at + length + 0.05)
  }

  function thump(at: number, from: number, to: number, level: number, length: number) {
    const audio = context as AudioContext
    const oscillator = audio.createOscillator()
    oscillator.frequency.setValueAtTime(from, at)
    oscillator.frequency.exponentialRampToValueAtTime(to, at + length * 0.6)
    const envelope = gain(0)
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(level, at + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
    output(chain(oscillator, envelope), 0.3)
    oscillator.start(at)
    oscillator.stop(at + length + 0.05)
  }

  const recipes: Record<Cue, (at: number, duration: number) => void> = {
    meteor(at, duration) {
      const peak = at + duration
      const rumble = play(sample('brown'), true)
      const rumbleFilter = filter('lowpass', 60, 0.8)
      rumbleFilter.frequency.setValueAtTime(60, at)
      rumbleFilter.frequency.exponentialRampToValueAtTime(440, peak)
      const roar = play(sample('white'), true)
      const roarFilter = filter('bandpass', 240, 0.6)
      roarFilter.frequency.setValueAtTime(240, at)
      roarFilter.frequency.exponentialRampToValueAtTime(1100, peak)
      const panner = pan(0.75)
      if (panner instanceof StereoPannerNode) {
        panner.pan.setValueAtTime(0.75, at)
        panner.pan.linearRampToValueAtTime(-0.3, peak)
      }
      const sizzle = play(sample('crackle'), true)
      const level = gain(0)
      level.gain.setValueAtTime(0.0001, at)
      level.gain.exponentialRampToValueAtTime(1, peak)
      const rumbleLevel = gain(0.7)
      const roarLevel = gain(0.3)
      const sizzleLevel = gain(0.26)
      chain(rumble, rumbleFilter, rumbleLevel, level)
      chain(roar, roarFilter, roarLevel, panner, level)
      chain(sizzle, filter('highpass', 1600), sizzleLevel, level)
      output(level, 0.25)
      rumble.start(at)
      roar.start(at, 0.7)
      sizzle.start(at, 1.1)
      track('meteor', [rumble, roar, sizzle], level)
    },
    impact(at) {
      thump(at, 66, 26, 1, 3.2)
      const body = play(sample('brown'), false)
      const bodyFilter = filter('lowpass', 2800, 0.5)
      bodyFilter.frequency.setValueAtTime(2800, at)
      bodyFilter.frequency.exponentialRampToValueAtTime(90, at + 2.6)
      const bodyLevel = gain(0)
      bodyLevel.gain.setValueAtTime(1.1, at)
      bodyLevel.gain.exponentialRampToValueAtTime(0.0001, at + 3.2)
      output(chain(body, bodyFilter, bodyLevel), 0.5)
      body.start(at)
      body.stop(at + 3.3)
      burst(at, 0.14, 'highpass', 900, 0.8, 0, 0.4)
      const tail = play(sample('brown'), true)
      const tailLevel = gain(0)
      tailLevel.gain.setValueAtTime(0.36, at + 0.2)
      tailLevel.gain.linearRampToValueAtTime(0, at + 7)
      output(chain(tail, filter('lowpass', 160), tailLevel), 0.3)
      tail.start(at + 0.2)
      tail.stop(at + 7.1)
      for (let i = 0; i < 30; i++) {
        const when = at + 0.25 + Math.pow(Math.random(), 1.6) * 2.6
        burst(when, 0.03 + Math.random() * 0.05, 'bandpass', 700 + Math.random() * 2200, 0.05 + Math.random() * 0.1, Math.random() * 1.6 - 0.8, 0.35)
      }
    },
    heartbeat(at) {
      thump(at, 62, 36, 0.9, 0.5)
      burst(at, 0.05, 'lowpass', 320, 0.25, 0, 0.3)
      thump(at + 0.21, 58, 34, 0.62, 0.45)
    },
    crack(at, duration) {
      const peak = at + duration
      const level = gain(0)
      level.gain.setValueAtTime(0.0001, at)
      level.gain.exponentialRampToValueAtTime(1, peak)
      const riserFilter = filter('lowpass', 220, 6)
      riserFilter.frequency.setValueAtTime(220, at)
      riserFilter.frequency.exponentialRampToValueAtTime(2800, peak)
      const riserLevel = gain(0.09)
      chain(riserFilter, riserLevel, level)
      const oscillators = [110, 110.7].map((frequency) => {
        const oscillator = (context as AudioContext).createOscillator()
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(frequency, at)
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, peak)
        oscillator.connect(riserFilter)
        oscillator.start(at)
        return oscillator
      })
      const swell = play(sample('white'), true)
      const swellLevel = gain(0.22)
      chain(swell, filter('bandpass', 2400, 0.6), swellLevel, level)
      swell.start(at)
      output(level, 0.45)
      track('crack', [...oscillators, swell], level)
      for (let i = 0; i < 36; i++) {
        const when = at + duration * (1 - Math.pow(1 - i / 36, 1.8)) + Math.random() * 0.05
        const side = Math.random() * 1.4 - 0.7
        ping(when, 2000 + Math.random() * 3500, 0.05 + Math.random() * 0.04, 0.07, side, 0.5)
        burst(when, 0.02, 'highpass', 3500, 0.07, side, 0.4)
      }
    },
    split(at) {
      const crunch = play(sample('brown'), false)
      const crunchLevel = gain(0)
      crunchLevel.gain.setValueAtTime(1, at)
      crunchLevel.gain.exponentialRampToValueAtTime(0.0001, at + 1)
      output(chain(crunch, filter('lowpass', 1500), crunchLevel), 0.4)
      crunch.start(at)
      crunch.stop(at + 1.1)
      burst(at, 0.35, 'bandpass', 1800, 0.5, 0, 0.5)
      thump(at, 72, 28, 0.9, 1.6)
      const chord = [220, 329.63, 440, 493.88, 554.37, 659.25]
      for (const frequency of chord) {
        for (const [type, detune] of [
          ['sine', 0],
          ['triangle', 5],
        ] as const) {
          const oscillator = (context as AudioContext).createOscillator()
          oscillator.type = type
          oscillator.frequency.value = frequency
          oscillator.detune.value = detune
          const envelope = gain(0)
          envelope.gain.setValueAtTime(0, at)
          envelope.gain.linearRampToValueAtTime(0.045, at + 1)
          envelope.gain.setValueAtTime(0.045, at + 3)
          envelope.gain.linearRampToValueAtTime(0, at + 6)
          output(chain(oscillator, envelope), 0.8)
          oscillator.start(at)
          oscillator.stop(at + 6.1)
        }
      }
      const shimmer = [1318.5, 1479.98, 1760, 1975.53, 2217.46, 2637]
      for (let i = 0; i < 16; i++) {
        ping(at + 0.3 + Math.random() * 4.2, shimmer[Math.floor(Math.random() * shimmer.length)], 0.03, 1.4, Math.random() * 1.6 - 0.8, 0.9)
      }
    },
    step(at) {
      burst(at, 0.05, 'lowpass', 700 + Math.random() * 300, 0.12, (Math.random() - 0.5) * 0.3, 0.1)
    },
    door(at) {
      thump(at, 160, 70, 0.22, 0.5)
      burst(at + 0.05, 0.35, 'bandpass', 900, 0.08, 0, 0.5)
      burst(at + 0.42, 0.06, 'highpass', 2400, 0.1, 0.1, 0.4)
    },
    select(at) {
      ping(at, 1320, 0.05, 0.09, 0, 0.2, 'triangle')
      burst(at, 0.02, 'highpass', 3000, 0.05, 0, 0.1)
    },
    buy(at) {
      ping(at, 659.25, 0.08, 0.5, -0.2, 0.5, 'triangle')
      ping(at + 0.09, 830.61, 0.08, 0.5, 0.1, 0.5, 'triangle')
      ping(at + 0.18, 1046.5, 0.09, 0.9, 0.2, 0.6, 'triangle')
      ping(at + 0.18, 1318.5, 0.05, 0.9, 0.2, 0.6)
      burst(at, 0.04, 'highpass', 4200, 0.08, -0.3, 0.3)
      burst(at + 0.09, 0.04, 'highpass', 4600, 0.06, 0.3, 0.3)
    },
    equip(at) {
      thump(at, 220, 90, 0.2, 0.18)
      burst(at, 0.05, 'bandpass', 1800, 0.14, 0, 0.3)
      for (let i = 0; i < 3; i++) burst(at + 0.12 + i * 0.05, 0.02, 'highpass', 2600, 0.05, 0.2, 0.2)
    },
    deny(at) {
      ping(at, 180, 0.09, 0.14, 0, 0.2, 'square')
      ping(at + 0.16, 150, 0.09, 0.18, 0, 0.2, 'square')
    },
    hit(at) {
      thump(at, 190, 70, 0.3, 0.16)
      burst(at, 0.07, 'bandpass', 1400 + Math.random() * 600, 0.3, (Math.random() - 0.5) * 0.4, 0.25)
      ping(at, 2600 + Math.random() * 800, 0.05, 0.08, 0, 0.3, 'triangle')
    },
    heavy(at) {
      thump(at, 95, 28, 0.9, 0.7)
      burst(at, 0.22, 'lowpass', 420, 0.5, 0, 0.4)
      burst(at + 0.02, 0.1, 'highpass', 1800, 0.14, 0, 0.3)
      for (let i = 0; i < 5; i++) burst(at + 0.12 + i * 0.045, 0.03, 'bandpass', 2200 + Math.random() * 1500, 0.05, Math.random() - 0.5, 0.3)
    },
    shoot(at) {
      sweep(at, 1900, 260, 0.14, 0.18, 'sawtooth', 0.15)
      burst(at, 0.03, 'highpass', 3600, 0.08, 0, 0.1)
    },
    bolt(at) {
      sweep(at, 700, 180, 0.2, 0.14, 'square', 0.25)
      burst(at, 0.05, 'bandpass', 900, 0.08, 0, 0.2)
    },
    guard(at) {
      thump(at, 320, 140, 0.25, 0.14)
      burst(at, 0.05, 'bandpass', 2400, 0.14, 0, 0.3)
    },
    parry(at) {
      burst(at, 0.04, 'highpass', 3200, 0.16, 0, 0.5)
      ping(at, 2637, 0.1, 0.5, -0.1, 0.7, 'triangle')
      ping(at + 0.03, 3951, 0.07, 0.6, 0.1, 0.7)
      thump(at, 240, 120, 0.2, 0.12)
    },
    dodge(at) {
      const source = play(sample('white'), false, 1)
      const sweeper = filter('bandpass', 500, 1.4)
      sweeper.frequency.setValueAtTime(500, at)
      sweeper.frequency.exponentialRampToValueAtTime(2400, at + 0.22)
      const envelope = gain(0)
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(0.22, at + 0.06)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
      output(chain(source, sweeper, envelope), 0.2)
      source.start(at, Math.random())
      source.stop(at + 0.3)
    },
    hurt(at) {
      thump(at, 150, 48, 0.5, 0.3)
      burst(at, 0.09, 'lowpass', 600, 0.3, 0, 0.3)
      ping(at + 0.02, 196, 0.08, 0.22, 0, 0.2, 'square')
    },
    ko(at) {
      thump(at, 110, 26, 0.8, 0.9)
      burst(at, 0.3, 'bandpass', 800, 0.45, 0, 0.5)
      sweep(at + 0.05, 1600, 220, 0.5, 0.08, 'triangle', 0.4)
      for (let i = 0; i < 9; i++) burst(at + 0.2 + Math.pow(Math.random(), 1.4) * 0.9, 0.03, 'bandpass', 1500 + Math.random() * 2500, 0.06, Math.random() - 0.5, 0.35)
    },
    bell(at) {
      ping(at, 1318.5, 0.16, 1.8, 0, 0.9)
      ping(at, 2637, 0.09, 1.1, 0, 0.9)
      ping(at, 3520, 0.05, 0.7, 0, 0.9)
      burst(at, 0.03, 'highpass', 4000, 0.1, 0, 0.6)
    },
    alarm(at) {
      for (let i = 0; i < 4; i++) {
        ping(at + i * 0.3, i % 2 ? 554.37 : 440, 0.07, 0.26, i % 2 ? 0.4 : -0.4, 0.4, 'square')
      }
    },
    win(at) {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((frequency, index) => {
        ping(at + index * 0.13, frequency, 0.1, index === notes.length - 1 ? 1.4 : 0.35, (index - 1.5) * 0.2, 0.7, 'triangle')
        ping(at + index * 0.13, frequency * 2, 0.04, 0.3, 0, 0.7)
      })
      for (let i = 0; i < 10; i++) ping(at + 0.5 + Math.random() * 1.2, 1760 + Math.random() * 1800, 0.025, 0.9, Math.random() * 1.4 - 0.7, 0.9)
    },
    lose(at) {
      const notes = [392, 349.23, 311.13, 261.63]
      notes.forEach((frequency, index) => {
        ping(at + index * 0.32, frequency, 0.09, index === notes.length - 1 ? 1.8 : 0.5, 0, 0.6, 'triangle')
        ping(at + index * 0.32, frequency / 2, 0.06, 0.6, 0, 0.6, 'sine')
      })
      thump(at + 1.1, 70, 30, 0.5, 1.2)
    },
    coin(at) {
      ping(at, 1760, 0.06, 0.18, 0.1, 0.4, 'triangle')
      ping(at + 0.07, 2217.46, 0.06, 0.3, 0.2, 0.5, 'triangle')
    },
    warp(at) {
      sweep(at, 220, 2600, 0.32, 0.12, 'sine', 0.7)
      for (let i = 0; i < 5; i++) ping(at + 0.08 + i * 0.05, 2093 + i * 311, 0.03, 0.5, (i - 2) * 0.3, 0.9)
    },
    charge(at, duration) {
      sweep(at, 70, 210, duration, 0.1, 'sawtooth', 0.3)
    },
    swing(at) {
      burst(at, 0.1, 'bandpass', 1100, 0.1, 0, 0.1)
    },
    card(at) {
      const source = play(sample('white'), false, 1.2)
      const sweeper = filter('bandpass', 900, 2)
      sweeper.frequency.setValueAtTime(900, at)
      sweeper.frequency.exponentialRampToValueAtTime(5200, at + 0.14)
      const envelope = gain(0)
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(0.16, at + 0.03)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)
      output(chain(source, sweeper, envelope), 0.2)
      source.start(at, Math.random())
      source.stop(at + 0.2)
      ping(at + 0.05, 1567.98, 0.07, 0.35, -0.15, 0.6, 'triangle')
      ping(at + 0.11, 2093, 0.06, 0.5, 0.15, 0.7, 'triangle')
    },
    transform(at) {
      sweep(at, 110, 880, 0.42, 0.12, 'sawtooth', 0.4)
      sweep(at, 220, 1760, 0.42, 0.05, 'square', 0.4)
      const hit = at + 0.4
      thump(hit, 90, 30, 0.9, 0.9)
      burst(hit, 0.3, 'lowpass', 900, 0.4, 0, 0.5)
      for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5, 1318.5].entries()) {
        ping(hit, frequency, 0.07, 1.4, (index - 2) * 0.2, 0.9, 'triangle')
      }
      for (let i = 0; i < 8; i++) ping(hit + 0.1 + Math.random() * 0.8, 2093 + Math.random() * 2000, 0.025, 0.7, Math.random() * 1.4 - 0.7, 0.9)
    },
    super(at) {
      ping(at, 1760, 0.07, 0.18, -0.1, 0.4, 'square')
      ping(at + 0.06, 2637, 0.07, 0.35, 0.1, 0.5, 'triangle')
      burst(at, 0.04, 'highpass', 4400, 0.1, 0, 0.3)
    },
    ready(at) {
      ping(at, 880, 0.06, 0.3, -0.1, 0.6, 'triangle')
      ping(at + 0.1, 1318.5, 0.06, 0.4, 0, 0.7, 'triangle')
      ping(at + 0.2, 1760, 0.07, 0.8, 0.1, 0.8, 'sine')
    },
    fire(at) {
      burst(at, 0.28, 'lowpass', 900, 0.22, 0, 0.3)
      const sizzle = play(sample('crackle'), false, 1.4)
      const level = gain(0)
      level.gain.setValueAtTime(0.32, at)
      level.gain.exponentialRampToValueAtTime(0.0001, at + 0.4)
      output(chain(sizzle, filter('highpass', 1400), level), 0.3)
      sizzle.start(at, Math.random() * 2)
      sizzle.stop(at + 0.45)
    },
    water(at) {
      burst(at, 0.16, 'bandpass', 1300, 0.2, 0, 0.3)
      for (let i = 0; i < 5; i++) ping(at + 0.03 + Math.random() * 0.2, 800 + Math.random() * 900, 0.03, 0.06, Math.random() - 0.5, 0.3, 'sine')
    },
    earth(at) {
      thump(at, 85, 32, 0.45, 0.4)
      burst(at, 0.18, 'lowpass', 380, 0.3, 0, 0.3)
      for (let i = 0; i < 4; i++) burst(at + 0.06 + i * 0.05, 0.03, 'bandpass', 500 + Math.random() * 700, 0.08, Math.random() - 0.5, 0.2)
    },
    wind(at) {
      const source = play(sample('white'), false, 0.9)
      const sweeper = filter('bandpass', 500, 0.9)
      sweeper.frequency.setValueAtTime(500, at)
      sweeper.frequency.exponentialRampToValueAtTime(2600, at + 0.3)
      const envelope = gain(0)
      envelope.gain.setValueAtTime(0, at)
      envelope.gain.linearRampToValueAtTime(0.2, at + 0.08)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.38)
      output(chain(source, sweeper, envelope, pan((Math.random() - 0.5) * 0.6)), 0.3)
      source.start(at, Math.random())
      source.stop(at + 0.4)
    },
    thunder(at) {
      burst(at, 0.035, 'highpass', 3200, 0.3, 0, 0.4)
      sweep(at, 2600, 140, 0.16, 0.09, 'square', 0.3)
      burst(at + 0.04, 0.3, 'lowpass', 260, 0.2, 0, 0.5)
    },
    ice(at) {
      burst(at, 0.05, 'highpass', 5200, 0.16, 0, 0.4)
      for (let i = 0; i < 6; i++) ping(at + Math.random() * 0.14, 2600 + Math.random() * 1800, 0.035, 0.18, Math.random() - 0.5, 0.6, 'triangle')
    },
    light(at) {
      ping(at, 1318.5, 0.05, 0.6, -0.2, 0.9)
      ping(at + 0.03, 1760, 0.05, 0.6, 0, 0.9)
      ping(at + 0.06, 2637, 0.04, 0.7, 0.2, 0.9)
    },
    shadow(at) {
      sweep(at, 520, 80, 0.32, 0.12, 'sine', 0.6)
      burst(at, 0.3, 'lowpass', 420, 0.14, 0, 0.6)
    },
  }

  function sweep(at: number, from: number, to: number, length: number, level: number, type: OscillatorType, reverbAmount: number) {
    const audio = context as AudioContext
    const oscillator = audio.createOscillator()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(from, at)
    oscillator.frequency.exponentialRampToValueAtTime(to, at + length)
    const envelope = gain(0)
    envelope.gain.setValueAtTime(0, at)
    envelope.gain.linearRampToValueAtTime(level, at + 0.01)
    envelope.gain.setValueAtTime(level, at + length * 0.7)
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + length)
    output(chain(oscillator, filter('lowpass', 5000), envelope), reverbAmount)
    oscillator.start(at)
    oscillator.stop(at + length + 0.05)
  }

  function cue(name: Cue, duration = 1) {
    if (!context || context.state === 'closed') return
    recipes[name](context.currentTime + 0.01, duration)
  }

  function stopCue(name: Cue) {
    if (!context) return
    for (const voice of [...voices]) if (voice.name === name) voice.stop(context.currentTime)
  }

  function stopCues() {
    if (!context) return
    for (const voice of [...voices]) voice.stop(context.currentTime)
  }

  function ensureBed(name: Exclude<Bed, 'silent'>) {
    const existing = beds.get(name)
    if (existing) return existing
    const audio = context as AudioContext
    const level = gain(0)
    output(level, 0.25, 'ambience')
    const sources: AudioScheduledSourceNode[] = []
    const add = (node: AudioBufferSourceNode, ...rest: AudioNode[]) => {
      chain(node, ...rest, level)
      sources.push(node)
    }
    if (name === 'night') {
      const windFilter = filter('lowpass', 420, 0.4)
      const lfo = audio.createOscillator()
      lfo.frequency.value = 0.08
      const depth = gain(180)
      lfo.connect(depth)
      depth.connect(windFilter.frequency)
      sources.push(lfo)
      add(play(sample('brown'), true), windFilter, gain(0.14))
      add(play(sample('crickets'), true), gain(0.07), pan(-0.35))
      add(play(sample('crickets'), true, 1.07), gain(0.05), pan(0.4))
    } else if (name === 'fire') {
      add(play(sample('crackle'), true), filter('bandpass', 2200, 0.6), gain(0.24))
      add(play(sample('brown'), true, 0.9), filter('lowpass', 240), gain(0.16))
      add(play(sample('brown'), true, 1.1), filter('lowpass', 480, 0.4), gain(0.05))
    } else {
      add(play(sample('birds'), true), gain(0.16), pan(-0.4))
      add(play(sample('birds'), true, 0.93), gain(0.11), pan(0.45))
      add(play(sample('brown'), true), filter('lowpass', 620, 0.4), gain(0.06))
    }
    const start = audio.currentTime
    sources.forEach((source, index) =>
      source instanceof AudioBufferSourceNode ? source.start(start, index * 1.7) : source.start(start),
    )
    beds.set(name, level)
    return level
  }

  function bed(name: Bed) {
    currentBed = name
    if (!context) return
    if (name !== 'silent') ensureBed(name)
    const now = context.currentTime
    for (const [key, level] of beds) level.gain.setTargetAtTime(key === name ? 1 : 0, now, key === name ? 0.9 : 0.5)
  }

  return {
    unlock() {
      unlock()
      if (currentBed !== 'silent') bed(currentBed)
    },
    cue,
    stopCue,
    stopCues,
    bed,
    toggleMuted() {
      muted = !muted
      applyLevels()
      return muted
    },
    setMuted(next) {
      muted = next
      applyLevels()
    },
    setVolumes(next) {
      volumes = { ...next }
      applyLevels()
    },
    get muted() {
      return muted
    },
    destroy() {
      document.removeEventListener('visibilitychange', onVisibility)
      if (warmup) clearTimeout(warmup)
      warmup = null
      voices.clear()
      beds.clear()
      buses.clear()
      samples.clear()
      void context?.close()
      context = null
    },
  }
}

function noise(audio: AudioContext, seconds: number, brownian: boolean) {
  const length = Math.floor(audio.sampleRate * seconds)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const sample = Math.random() * 2 - 1
    if (brownian) {
      last = (last + 0.02 * sample) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = sample
    }
  }
  return buffer
}

function crackleBuffer(audio: AudioContext) {
  const length = Math.floor(audio.sampleRate * 3)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    if (Math.random() > 0.0012) continue
    const size = 40 + Math.floor(Math.random() * 360)
    const level = 0.2 + Math.random() * 0.8
    for (let j = 0; j < size && i + j < length; j++) data[i + j] += (Math.random() * 2 - 1) * level * Math.pow(1 - j / size, 3)
  }
  return buffer
}

function cricketBuffer(audio: AudioContext) {
  const rate = audio.sampleRate
  const length = Math.floor(rate * 4)
  const buffer = audio.createBuffer(1, length, rate)
  const data = buffer.getChannelData(0)
  for (let chirp = 0.1; chirp < 3.8; chirp += 0.55 + Math.random() * 0.25) {
    const pulses = 3 + Math.floor(Math.random() * 2)
    const frequency = 4400 + Math.random() * 400
    for (let p = 0; p < pulses; p++) {
      const start = Math.floor((chirp + p * 0.042) * rate)
      const size = Math.floor(0.018 * rate)
      for (let j = 0; j < size && start + j < length; j++) {
        const envelope = Math.sin((Math.PI * j) / size)
        data[start + j] += Math.sin((2 * Math.PI * frequency * j) / rate) * envelope * 0.5
      }
    }
  }
  return buffer
}

function birdBuffer(audio: AudioContext) {
  const rate = audio.sampleRate
  const length = Math.floor(rate * 7)
  const buffer = audio.createBuffer(1, length, rate)
  const data = buffer.getChannelData(0)
  for (let call = 0.3; call < 6.4; call += 1.2 + Math.random() * 1.1) {
    const notes = 2 + Math.floor(Math.random() * 5)
    const base = 2600 + Math.random() * 1200
    let time = call
    for (let n = 0; n < notes; n++) {
      const duration = 0.06 + Math.random() * 0.08
      const from = base * (0.9 + Math.random() * 0.3)
      const to = from * (0.7 + Math.random() * 0.7)
      const start = Math.floor(time * rate)
      const size = Math.floor(duration * rate)
      let phase = 0
      for (let j = 0; j < size && start + j < length; j++) {
        const t = j / size
        const frequency = from + (to - from) * t + Math.sin(j / 90) * 120
        phase += (2 * Math.PI * frequency) / rate
        data[start + j] += Math.sin(phase) * Math.sin(Math.PI * t) * 0.35
      }
      time += duration + 0.03 + Math.random() * 0.07
    }
  }
  return buffer
}

function impulse(audio: AudioContext, seconds: number) {
  const length = Math.floor(audio.sampleRate * seconds)
  const buffer = audio.createBuffer(2, length, audio.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2)
  }
  return buffer
}
