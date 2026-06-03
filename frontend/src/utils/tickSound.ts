let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export function playTickSound(intensity = 0.3): void {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05)

    gain.gain.setValueAtTime(intensity * 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  } catch {
    // Audio not available
  }
}

let isSoundEnabled = true

export function setSoundEnabled(enabled: boolean): void {
  isSoundEnabled = enabled
}

export function getSoundEnabled(): boolean {
  return isSoundEnabled
}
