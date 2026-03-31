import { Howl, Howler } from 'howler'

interface SoundConfig {
  src: string
  loop?: boolean
  volume?: number
  rate?: number
  pool?: number
}

type SoundKey = 'shoot' | 'hit' | 'reload' | 'ui-click' | 'ambient'

const SAMPLE_RATE = 22050

const clamp = (value: number, min = -1, max = 1) =>
  Math.max(min, Math.min(max, value))

const createWavDataUri = (
  durationMs: number,
  generator: (time: number, index: number, total: number) => number
) => {
  const totalSamples = Math.max(1, Math.floor((SAMPLE_RATE * durationMs) / 1000))
  const pcm = new Int16Array(totalSamples)

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index / SAMPLE_RATE
    pcm[index] = clamp(generator(time, index, totalSamples)) * 32767
  }

  const byteLength = 44 + pcm.length * 2
  const buffer = new ArrayBuffer(byteLength)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + pcm.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, pcm.length * 2, true)

  let offset = 44
  for (const sample of pcm) {
    view.setInt16(offset, sample, true)
    offset += 2
  }

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return `data:audio/wav;base64,${btoa(binary)}`
}

const easeOut = (value: number) => 1 - (1 - value) * (1 - value)

const createShootSound = () =>
  createWavDataUri(180, (time) => {
    const progress = Math.min(time / 0.18, 1)
    const envelope = (1 - progress) ** 2
    const tone =
      Math.sin(2 * Math.PI * (260 - progress * 90) * time) * 0.65 +
      Math.sin(2 * Math.PI * (520 - progress * 220) * time) * 0.25
    const snap = (Math.random() * 2 - 1) * 0.15 * envelope
    return (tone + snap) * envelope
  })

const createHitSound = () =>
  createWavDataUri(120, (time) => {
    const progress = Math.min(time / 0.12, 1)
    const envelope = (1 - progress) ** 1.5
    return (
      Math.sin(2 * Math.PI * (840 - progress * 220) * time) * 0.45 * envelope +
      Math.sin(2 * Math.PI * 1320 * time) * 0.15 * envelope
    )
  })

const createUIClickSound = () =>
  createWavDataUri(80, (time) => {
    const progress = Math.min(time / 0.08, 1)
    const envelope = 1 - easeOut(progress)
    return Math.sin(2 * Math.PI * (980 - progress * 260) * time) * 0.35 * envelope
  })

const createReloadSound = () =>
  createWavDataUri(260, (time) => {
    const progress = Math.min(time / 0.26, 1)
    const envelope = (1 - progress) ** 1.2
    const clack = Math.sin(2 * Math.PI * (240 + progress * 120) * time) * 0.28
    const metallic = Math.sin(2 * Math.PI * 1180 * time) * 0.08 * envelope
    return (clack + metallic) * envelope
  })

const createAmbientSound = () =>
  createWavDataUri(2200, (time) => {
    const drift = Math.sin(2 * Math.PI * 0.12 * time) * 3
    const pad =
      Math.sin(2 * Math.PI * (52 + drift) * time) * 0.22 +
      Math.sin(2 * Math.PI * (104 + drift * 1.4) * time) * 0.1 +
      Math.sin(2 * Math.PI * 0.5 * time) * 0.02
    return pad
  })

class AudioManager {
  private sounds = new Map<SoundKey, Howl>()
  private baseVolumes = new Map<SoundKey, number>()
  private initialized = false
  private unlocked = false
  private masterVolume = 1
  private muted = false

  private register(key: SoundKey, config: SoundConfig): void {
    const baseVolume = config.volume ?? 1
    this.baseVolumes.set(key, baseVolume)

    const sound = new Howl({
      src: [config.src],
      loop: config.loop ?? false,
      volume: this.getEffectiveVolume(baseVolume),
      rate: config.rate ?? 1,
      pool: config.pool ?? 5,
      preload: true,
      html5: false,
    })

    this.sounds.set(key, sound)
  }

  private getEffectiveVolume(baseVolume: number) {
    return this.muted ? 0 : baseVolume * this.masterVolume
  }

  initialize(): void {
    if (this.initialized) {
      return
    }

    this.register('shoot', {
      src: createShootSound(),
      volume: 0.7,
      pool: 12,
    })
    this.register('hit', {
      src: createHitSound(),
      volume: 0.55,
      pool: 10,
    })
    this.register('reload', {
      src: createReloadSound(),
      volume: 0.55,
      pool: 6,
    })
    this.register('ui-click', {
      src: createUIClickSound(),
      volume: 0.45,
      pool: 8,
    })
    this.register('ambient', {
      src: createAmbientSound(),
      volume: 0.22,
      loop: true,
      pool: 1,
    })

    this.initialized = true
  }

  unlock(): void {
    if (this.unlocked) {
      return
    }

    this.initialize()
    Howler.autoUnlock = true
    this.unlocked = true
  }

  play(key: SoundKey, volumeMultiplier = 1): void {
    const sound = this.sounds.get(key)
    const baseVolume = this.baseVolumes.get(key)

    if (!sound || baseVolume === undefined) {
      return
    }

    const soundId = sound.play()
    sound.volume(this.getEffectiveVolume(baseVolume * volumeMultiplier), soundId)
  }

  playAmbient(): void {
    const ambient = this.sounds.get('ambient')
    if (!ambient || ambient.playing()) {
      return
    }

    ambient.play()
  }

  stopAmbient(): void {
    this.sounds.get('ambient')?.stop()
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(volume, 1))

    this.sounds.forEach((sound, key) => {
      const baseVolume = this.baseVolumes.get(key) ?? 1
      sound.volume(this.getEffectiveVolume(baseVolume))
    })
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this.setMasterVolume(this.masterVolume)
  }
}

export const audioManager = new AudioManager()

export const initializeSounds = () => {
  audioManager.initialize()
}

export const unlockAudio = () => {
  audioManager.unlock()
}

export const playUIClick = () => {
  audioManager.play('ui-click')
}
