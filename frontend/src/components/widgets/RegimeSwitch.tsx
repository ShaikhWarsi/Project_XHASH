import { useState, useEffect } from 'react'
import { useToastStore } from '../../store/toast'

interface RegimeData {
  regime: string
  actionable: string
  strategies: { name: string; description: string }[]
}

export function RegimeSwitch() {
  const [data, setData] = useState<RegimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    let cancelled = false
    fetch('/api/market/regime')
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setData(json) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading || !data) return null

  const regimeColor: Record<string, string> = {
    trending: 'var(--accent-green)',
    mean_reverting: 'var(--accent-blue)',
    volatile: 'var(--accent-red)',
    sideways: 'var(--accent-yellow)',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px',
      background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)',
      borderBottom: '1px solid var(--border-color)',
      fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
    }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>REGIME</span>
      <span style={{
        fontWeight: 600, textTransform: 'uppercase',
        color: regimeColor[data.regime] || 'var(--text-primary)',
      }}>
        {(data.regime || 'unknown').replace(/_/g, ' ')}
      </span>
      {data.strategies && data.strategies.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {data.strategies.slice(0, 3).map((s) => (
            <button key={s.name} onClick={() => addToast(`Loading ${s.name} strategy...`, 'info')}
              style={{
                background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', borderRadius: 3, padding: '2px 6px',
                cursor: 'pointer', fontSize: 9,
              }}>
              {s.description || s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
