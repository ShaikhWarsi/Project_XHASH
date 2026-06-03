import { useEffect, useState } from 'react'

export type CueType = 'regime_bullish' | 'regime_bearish' | 'regime_volatile' | 'regime_calm' | 'fill' | 'alert'

interface Cue {
  type: CueType
  timestamp: number
}

interface CueConfig {
  type: CueType
  label: string
  icon: string
  color: string
  duration: number
}

const CUE_CONFIGS: Record<CueType, CueConfig> = {
  regime_bullish: { type: 'regime_bullish', label: 'Bullish Regime', icon: '📈', color: '#22c55e', duration: 2000 },
  regime_bearish: { type: 'regime_bearish', label: 'Bearish Regime', icon: '📉', color: '#ef4444', duration: 2000 },
  regime_volatile: { type: 'regime_volatile', label: 'High Volatility', icon: '⚡', color: '#f59e0b', duration: 2000 },
  regime_calm: { type: 'regime_calm', label: 'Low Volatility', icon: '🌊', color: '#3b82f6', duration: 2000 },
  fill: { type: 'fill', label: 'Order Filled', icon: '✅', color: '#22c55e', duration: 1500 },
  alert: { type: 'alert', label: 'Alert Triggered', icon: '🔔', color: '#ef4444', duration: 2000 },
}

interface Props {
  onCue?: (cue: CueType) => void
  maxVisible?: number
}

export function useVisualCue() {
  const [cues, setCues] = useState<Cue[]>([])

  const trigger = (type: CueType) => {
    const cue: Cue = { type, timestamp: Date.now() }
    setCues(prev => [...prev, cue])
    setTimeout(() => {
      setCues(prev => prev.filter(c => c.timestamp !== cue.timestamp))
    }, CUE_CONFIGS[type].duration)
  }

  return { cues, trigger }
}

export default function VisualAudioCues({ maxVisible = 3 }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: 8, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>AUDIO CUES</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {(Object.values(CUE_CONFIGS) as CueConfig[]).map(cfg => (
          <div
            key={cfg.type}
            title={cfg.label}
            style={{
              width: 24, height: 24, borderRadius: 4,
              background: `${cfg.color}20`,
              border: `1px solid ${cfg.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            {cfg.icon}
          </div>
        ))}
      </div>
    </div>
  )
}
