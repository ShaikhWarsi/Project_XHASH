import { useState } from 'react'

interface Props {
  enabled?: boolean
  intensity?: number
  onEnabledChange?: (enabled: boolean) => void
  onIntensityChange?: (intensity: number) => void
}

export default function HapticSettings({
  enabled: initialEnabled = true,
  intensity: initialIntensity = 1,
  onEnabledChange,
  onIntensityChange,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [intensity, setIntensity] = useState(initialIntensity)

  const testVibration = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  const handleEnabledToggle = () => {
    const next = !enabled
    setEnabled(next)
    onEnabledChange?.(next)
  }

  const handleIntensity = (val: number) => {
    setIntensity(val)
    onIntensityChange?.(val)
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      padding: 12,
    }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8, fontSize: 11 }}>
        Haptic Feedback
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleEnabledToggle}
            style={{ accentColor: 'var(--accent-blue, #3b82f6)' }}
          />
          Enable haptic feedback
        </label>

        {enabled && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Intensity</span>
              <span style={{ color: 'var(--text-secondary)' }}>{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={intensity}
              onChange={e => handleIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-blue, #3b82f6)' }}
            />
          </div>
        )}

        {enabled && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Test Patterns</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['light', 'medium', 'heavy', 'success', 'warning', 'error'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => testVibration(
                    type === 'light' ? 10 :
                    type === 'medium' ? 20 :
                    type === 'heavy' ? 40 :
                    type === 'success' ? [15, 50, 15] :
                    type === 'warning' ? [30, 50, 30] :
                    [50, 30, 50, 30, 50]
                  )}
                  style={{
                    padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
                    background: 'transparent', border: '1px solid var(--border-color, #1a2332)',
                    color: 'var(--text-secondary)', textTransform: 'capitalize',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
