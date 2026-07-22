import { Howl, Howler } from 'howler'

class SoundManagerClass {
  constructor() {
    this.enabled = false
    this.sounds = new Map()
    this.musicVolume = 0.45
    this.sfxVolume = 0.45
  }
  unlock() { this.enabled = true; Howler.volume(1) }
  register(key, source, options = {}) {
    if (this.sounds.has(key)) return
    const { group = 'sfx', ...howlOptions } = options
    const sound = new Howl({ src: [source], ...howlOptions, volume: group === 'music' ? this.musicVolume : this.sfxVolume })
    this.sounds.set(key, { sound, group })
  }
  play(key) { if (this.enabled) this.sounds.get(key)?.sound.play() }
  getMusicVolume() { return this.musicVolume }
  getSfxVolume() { return this.sfxVolume }
  setMusicVolume(volume) {
    this.musicVolume = volume
    this.sounds.forEach(({ sound, group }) => { if (group === 'music') sound.volume(volume) })
  }
  setSfxVolume(volume) {
    this.sfxVolume = volume
    this.sounds.forEach(({ sound, group }) => { if (group === 'sfx') sound.volume(volume) })
  }
  setMuted(muted) { Howler.mute(muted) }
  dispose() { this.sounds.forEach(({ sound }) => sound.unload()); this.sounds.clear() }
}

export const SoundManager = new SoundManagerClass()
