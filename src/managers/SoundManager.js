import { Howl, Howler } from 'howler'

class SoundManagerClass {
  constructor() {
    this.enabled = false
    this.sounds = new Map()
    this.musicVolume = 0.45
    this.sfxVolume = 0.45
    this.currentMusicKey = null
    this.musicStopTimers = new Map()
    this.musicLoadQueue = Promise.resolve()
  }
  unlock() { this.enabled = true; Howler.volume(1) }
  register(key, source, options = {}) {
    if (this.sounds.has(key)) return
    const { group = 'sfx', ...howlOptions } = options
    const sound = new Howl({ src: [source], ...howlOptions, volume: group === 'music' ? this.musicVolume : this.sfxVolume })
    this.sounds.set(key, {
      sound,
      group,
      source,
      howlOptions,
      loadPromise: null,
      primePromise: null,
      primed: false,
      failed: false,
    })
  }
  play(key) { if (this.enabled) this.sounds.get(key)?.sound.play() }
  registerMusic(key, source) {
    this.register(key, source, { group: 'music', loop: true, preload: false })
  }
  createMusicHowl(entry, html5 = false) {
    entry.sound.unload()
    entry.primed = false
    entry.sound = new Howl({
      src: [entry.source],
      ...entry.howlOptions,
      html5,
      preload: false,
      volume: this.musicVolume,
    })
  }
  loadMusicAttempt(entry, { html5 = false, recreate = false } = {}) {
    if (recreate) this.createMusicHowl(entry, html5)
    const sound = entry.sound
    if (sound.state() === 'loaded') return Promise.resolve()
    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        sound.off('loaderror', handleError)
        resolve()
      }
      const handleError = (_soundId, error) => {
        sound.off('load', handleLoad)
        reject(new Error(String(error ?? '알 수 없는 오디오 로드 오류')))
      }
      sound.once('load', handleLoad)
      sound.once('loaderror', handleError)
      sound.load()
    })
  }
  prepareMusic(key) {
    const entry = this.sounds.get(key)
    if (!entry || entry.group !== 'music') {
      return Promise.reject(new Error(`등록되지 않은 BGM입니다: ${key}`))
    }
    if (entry.sound.state() === 'loaded') return Promise.resolve({ mode: 'webaudio' })
    if (entry.loadPromise) return entry.loadPromise

    const loadTask = async () => {
      const errors = []
      const attempts = [
        { html5: false, recreate: entry.failed },
        { html5: false, recreate: true },
        { html5: true, recreate: true },
      ]
      for (const attempt of attempts) {
        try {
          await this.loadMusicAttempt(entry, attempt)
          entry.failed = false
          return { mode: attempt.html5 ? 'html5' : 'webaudio' }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error))
        }
      }
      entry.failed = true
      throw new Error(`BGM 로딩 실패 (${key}): ${errors.join(' / ')}`)
    }
    entry.loadPromise = this.musicLoadQueue
      .catch(() => {})
      .then(loadTask)
      .finally(() => {
        entry.loadPromise = null
      })
    this.musicLoadQueue = entry.loadPromise.catch(() => {})
    return entry.loadPromise
  }
  isMusicReady(key) {
    const entry = this.sounds.get(key)
    return Boolean(entry?.group === 'music' && entry.sound.state() === 'loaded' && entry.primed)
  }
  primeMusic(key, { warmupMs = 180 } = {}) {
    const entry = this.sounds.get(key)
    if (!entry || entry.group !== 'music') {
      return Promise.reject(new Error(`등록되지 않은 BGM입니다: ${key}`))
    }
    if (entry.primed || this.currentMusicKey === key) return Promise.resolve()
    if (entry.primePromise) return entry.primePromise

    entry.primePromise = this.prepareMusic(key)
      .then(() => new Promise((resolve, reject) => {
        const sound = entry.sound
        let soundId
        let warmupTimer
        const timeout = window.setTimeout(() => {
          cleanup()
          if (soundId !== undefined) sound.stop(soundId)
          reject(new Error(`BGM 첫 재생 준비 시간 초과: ${key}`))
        }, 3000)
        const cleanup = () => {
          window.clearTimeout(timeout)
          if (warmupTimer !== undefined) window.clearTimeout(warmupTimer)
          sound.off('play', handlePlay, soundId)
          sound.off('playerror', handleError, soundId)
        }
        const handlePlay = () => {
          sound.volume(0, soundId)
          warmupTimer = window.setTimeout(() => {
            cleanup()
            sound.stop(soundId)
            entry.primed = true
            resolve()
          }, warmupMs)
        }
        const handleError = (_id, error) => {
          cleanup()
          reject(new Error(`BGM 첫 재생 준비 실패 (${key}): ${String(error ?? '알 수 없는 오류')}`))
        }

        soundId = sound.play()
        sound.volume(0, soundId)
        sound.once('play', handlePlay, soundId)
        sound.once('playerror', handleError, soundId)
      }))
      .finally(() => {
        entry.primePromise = null
      })
    return entry.primePromise
  }
  playMusic(key, { fadeMs = 1400 } = {}) {
    if (!this.enabled || !this.sounds.has(key)) return
    const requested = this.sounds.get(key).sound
    if (requested.state() !== 'loaded') {
      this.prepareMusic(key)
        .then(() => this.playMusic(key, { fadeMs }))
        .catch((error) => console.error(error))
      return
    }
    if (this.currentMusicKey === key) {
      const current = this.sounds.get(key).sound
      if (!current.playing()) current.play()
      return
    }

    const previousKey = this.currentMusicKey
    this.currentMusicKey = key
    if (previousKey) this.fadeOutAndStop(previousKey, fadeMs)

    const next = this.sounds.get(key).sound
    this.cancelScheduledStop(key)
    next.stop()
    next.volume(0)
    next.play()
    next.fade(0, this.musicVolume, fadeMs)
  }
  stopMusic({ fadeMs = 1400 } = {}) {
    const currentKey = this.currentMusicKey
    this.currentMusicKey = null
    if (currentKey) this.fadeOutAndStop(currentKey, fadeMs)
  }
  fadeOutAndStop(key, fadeMs) {
    const entry = this.sounds.get(key)
    if (!entry) return
    this.cancelScheduledStop(key)
    const fromVolume = entry.sound.volume()
    entry.sound.fade(fromVolume, 0, fadeMs)
    const timer = window.setTimeout(() => {
      entry.sound.stop()
      entry.sound.volume(this.musicVolume)
      this.musicStopTimers.delete(key)
    }, fadeMs)
    this.musicStopTimers.set(key, timer)
  }
  cancelScheduledStop(key) {
    const timer = this.musicStopTimers.get(key)
    if (timer === undefined) return
    window.clearTimeout(timer)
    this.musicStopTimers.delete(key)
  }
  getMusicVolume() { return this.musicVolume }
  getSfxVolume() { return this.sfxVolume }
  setMusicVolume(volume) {
    this.musicVolume = volume
    this.sounds.forEach(({ sound, group }, key) => {
      if (group === 'music' && key === this.currentMusicKey) sound.volume(volume)
    })
  }
  setSfxVolume(volume) {
    this.sfxVolume = volume
    this.sounds.forEach(({ sound, group }) => { if (group === 'sfx') sound.volume(volume) })
  }
  setMuted(muted) { Howler.mute(muted) }
  dispose() {
    this.musicStopTimers.forEach((timer) => window.clearTimeout(timer))
    this.musicStopTimers.clear()
    this.currentMusicKey = null
    this.sounds.forEach(({ sound }) => sound.unload())
    this.sounds.clear()
  }
}

export const SoundManager = new SoundManagerClass()
