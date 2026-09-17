// Web Audio API Synth Effects (Zero external assets, instant mobile response)
class SoundManager {
  constructor() {
    this.ctx = null
    this.isMuted = false
    try {
      const saved = localStorage.getItem('club69_sound_muted') || localStorage.getItem('prince_sound_muted')
      this.isMuted = saved === 'true'
    } catch {
      this.isMuted = false
    }
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  setMuted(muted) {
    this.isMuted = muted
    try {
      localStorage.setItem('club69_sound_muted', String(muted))
    } catch {}
  }

  toggleMute() {
    this.setMuted(!this.isMuted)
    return this.isMuted
  }

  playTone(freq, type = 'sine', duration = 0.1, gainValue = 0.08) {
    if (this.isMuted) return
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      gain.gain.setValueAtTime(gainValue, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  playTick() {
    this.playTone(880, 'sine', 0.08, 0.06)
  }

  playLockTick() {
    this.playTone(440, 'triangle', 0.12, 0.09)
  }

  playBetPlaced() {
    if (this.isMuted) return
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const freqs = [523.25, 659.25, 783.99] // C5, E5, G5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.setValueAtTime(freq, now + idx * 0.06)
        gain.gain.setValueAtTime(0.06, now + idx * 0.06)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.1)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.06)
        osc.stop(now + idx * 0.06 + 0.1)
      })
    } catch {}
  }

  playWin() {
    if (this.isMuted) return
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime
      const notes = [587.33, 739.99, 880.0, 1174.66] // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)
        gain.gain.setValueAtTime(0.08, now + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.22)
      })
    } catch {}
  }
}

export const sound = new SoundManager()
