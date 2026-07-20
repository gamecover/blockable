import { Howl, Howler } from 'howler'

class SoundManagerClass {
  constructor() { this.enabled = false; this.sounds = new Map() }
  unlock() { this.enabled = true; Howler.volume(0.45) }
  register(key, source, options = {}) {
    if (!this.sounds.has(key)) this.sounds.set(key, new Howl({ src: [source], ...options }))
  }
  play(key) { if (this.enabled) this.sounds.get(key)?.play() }
  setMuted(muted) { Howler.mute(muted) }
  dispose() { this.sounds.forEach((sound) => sound.unload()); this.sounds.clear() }
}

export const SoundManager = new SoundManagerClass()
