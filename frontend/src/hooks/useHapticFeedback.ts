import { useCallback, useRef } from 'react'

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

const HAPTIC_PATTERNS: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [15, 50, 15],
  warning: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
  selection: [5],
}

export interface HapticFeedbackConfig {
  enabled: boolean
  intensity?: number
}

export function useHapticFeedback(config: HapticFeedbackConfig = { enabled: true }) {
  const supportedRef = useRef<boolean | null>(null)

  const isSupported = useCallback((): boolean => {
    if (supportedRef.current !== null) return supportedRef.current
    supportedRef.current = 'vibrate' in navigator
    return supportedRef.current
  }, [])

  const vibrate = useCallback((type: HapticType = 'light') => {
    if (!config.enabled) return
    if (!isSupported()) return

    const pattern = HAPTIC_PATTERNS[type]
    const intensity = config.intensity ?? 1
    const adjustedPattern = pattern.map(p => Math.round(p * intensity))
    navigator.vibrate(adjustedPattern.length === 1 ? adjustedPattern[0] : adjustedPattern)
  }, [config.enabled, config.intensity, isSupported])

  const haptics = {
    light: useCallback(() => vibrate('light'), [vibrate]),
    medium: useCallback(() => vibrate('medium'), [vibrate]),
    heavy: useCallback(() => vibrate('heavy'), [vibrate]),
    success: useCallback(() => vibrate('success'), [vibrate]),
    warning: useCallback(() => vibrate('warning'), [vibrate]),
    error: useCallback(() => vibrate('error'), [vibrate]),
    selection: useCallback(() => vibrate('selection'), [vibrate]),
  }

  return {
    ...haptics,
    vibrate,
    isSupported: isSupported(),
    enabled: config.enabled,
  }
}
