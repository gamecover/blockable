import { Howl, Howler } from 'howler'

class SoundManagerClass {
  constructor() {
    this.enabled = false
    this.sounds = new Map()
    this.musicVolume = 0.45
    this.sfxVolume = 0.45
    this.currentMusicKey = null
    this.musicStopTimers = new Map()
  }
  unlock() { this.enabled = true; Howler.volume(1) }
  register(key, source, options = {}) {
    if (this.sounds.has(key)) return
    const { group = 'sfx', ...howlOptions } = options
    const sound = new Howl({ src: [source], ...howlOptions, volume: group === 'music' ? this.musicVolume : this.sfxVolume })
    this.sounds.set(key, { sound, group })
  }
  play(key) { if (this.enabled) this.sounds.get(key)?.sound.play() }
  registerMusic(key, source) {
    this.register(key, source, { group: 'music', loop: true, preload: true })
  }
  playMusic(key, { fadeMs = 1400 } = {}) {
    if (!this.enabled || !this.sounds.has(key)) return
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
