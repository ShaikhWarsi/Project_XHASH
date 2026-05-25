import { useCallback, useRef } from 'react'

export type AlertSound = 'buy' | 'sell' | 'alert' | 'notification'

const SOUND_FREQUENCIES: Record<AlertSound, { frequency: number; duration: number; type: OscillatorType }> = {
  buy: { frequency: 880, duration: 0.15, type: 'sine' },
  sell: { frequency: 220, duration: 0.15, type: 'sine' },
  alert: { frequency: 660, duration: 0.3, type: 'square' },
  notification: { frequency: 440, duration: 0.1, type: 'sine' },
}

export function useAudioAlert() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return ctxRef.current
  }, [])

  const play = useCallback((sound: AlertSound) => {
    try {
      const ctx = getCtx()
      const config = SOUND_FREQUENCIES[sound]
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = config.type
      osc.frequency.setValueAtTime(config.frequency, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + config.duration)
    } catch (err) { console.warn('[useAudioAlert] Audio not available:', err) }
  }, [getCtx])

  const playSuccess = useCallback(() => play('buy'), [play])
  const playError = useCallback(() => play('sell'), [play])
  const playAlert = useCallback(() => play('alert'), [play])
  const playNotification = useCallback(() => play('notification'), [play])

  return { play, playSuccess, playError, playAlert, playNotification }
}
