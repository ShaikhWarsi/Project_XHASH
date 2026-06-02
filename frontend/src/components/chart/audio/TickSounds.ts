export class TickSounds {
  private audioContext: AudioContext | null = null
  private enabled: boolean
  private volume: number

  constructor(enabled = true, volume = 0.3) {
    this.enabled = enabled
    this.volume = Math.max(0, Math.min(1, volume))
  }

  init(): void {
    if (this.audioContext) return
    try {
      this.audioContext = new AudioContext()
    } catch {
      console.warn('[TickSounds] Web Audio API not available')
    }
  }

  playTick(side: 'buy' | 'sell', volume?: number): void {
    if (!this.enabled || !this.audioContext) return
    const ctx = this.audioContext
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const freq = side === 'buy' ? 880 : 440
    const duration = 0.03
    const volScale = volume != null ? Math.max(0.1, Math.min(1, volume)) : 0.5
    const gainValue = this.volume * volScale * 0.3

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  }

  playAlert(): void {
    if (!this.enabled || !this.audioContext) return
    const ctx = this.audioContext
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const gainValue = this.volume * 0.4
    const firstDuration = 0.2
    const secondDuration = 0.2
    const gap = 0.05

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.value = 660
    gain1.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + firstDuration)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + firstDuration)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.value = 880
    gain2.gain.setValueAtTime(gainValue, ctx.currentTime + firstDuration + gap)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + firstDuration + gap + secondDuration)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + firstDuration + gap)
    osc2.stop(ctx.currentTime + firstDuration + gap + secondDuration)
  }

  playPatternDetected(): void {
    if (!this.enabled || !this.audioContext) return
    const ctx = this.audioContext
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const duration = 0.3
    const gainValue = this.volume * 0.35

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + duration)
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
