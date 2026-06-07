import { useState, useCallback, useMemo } from 'react'
import { Sparkles, X } from 'lucide-react'

interface CandleData {
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface InspectorProps {
  candle: CandleData | null
  symbol: string
  onClose: () => void
}

function formatTime(t: string | number): string {
  const d = typeof t === 'string' ? new Date(t) : new Date(t * 1000)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AIChartInspector({ candle, symbol, onClose }: InspectorProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stats = useMemo(() => {
    if (!candle) return null
    const range = candle.high - candle.low
    const body = Math.abs(candle.close - candle.open)
    const upperWick = candle.high - Math.max(candle.open, candle.close)
    const lowerWick = Math.min(candle.open, candle.close) - candle.low
    const changePct = candle.open > 0 ? ((candle.close - candle.open) / candle.open) * 100 : 0
    const isUp = candle.close >= candle.open
    return { range, body, upperWick, lowerWick, changePct, isUp }
  }, [candle])

  const inspect = useCallback(async () => {
    if (!candle) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await fetch('/api/ai/inspect-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          candle: {
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setAnalysis(json.content || json.analysis || json.explanation || JSON.stringify(json))
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to analyze')
    }
    setLoading(false)
  }, [candle, symbol])

  if (!candle || !stats) return null

  return (
    <div style={{
      position: 'absolute', top: 4, right: 4, zIndex: 50,
      width: 280, maxHeight: 400,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 6, padding: 8,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={10} style={{ color: 'var(--accent-yellow)' }} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 9 }}>INSPECTOR</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
          <X size={10} />
        </button>
      </div>

      <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4 }}>{symbol} &middot; {formatTime(candle.time)}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px', marginBottom: 6 }}>
        <div><span style={{ color: 'var(--text-muted)' }}>O</span> <span style={{ color: 'var(--text-primary)' }}>{candle.open.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>H</span> <span style={{ color: stats.isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>{candle.high.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>L</span> <span style={{ color: stats.isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>{candle.low.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>C</span> <span style={{ fontWeight: 600, color: stats.isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>{candle.close.toFixed(2)}</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px', marginBottom: 6, padding: '4px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div><span style={{ color: 'var(--text-muted)' }}>Range</span> <span style={{ color: 'var(--text-primary)' }}>{stats.range.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Body</span> <span style={{ color: 'var(--text-primary)' }}>{stats.body.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Upper Wick</span> <span style={{ color: 'var(--text-muted)' }}>{stats.upperWick.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Lower Wick</span> <span style={{ color: 'var(--text-muted)' }}>{stats.lowerWick.toFixed(2)}</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Change</span> <span style={{ color: stats.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(2)}%</span></div>
        <div><span style={{ color: 'var(--text-muted)' }}>Volume</span> <span style={{ color: 'var(--text-primary)' }}>{(candle.volume || 0).toLocaleString()}</span></div>
      </div>

      <button onClick={inspect} disabled={loading}
        style={{
          width: '100%', padding: '4px 8px', borderRadius: 4,
          background: loading ? 'var(--bg-hover)' : 'var(--accent-blue)',
          color: loading ? 'var(--text-muted)' : '#fff',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 9, fontWeight: 500, marginBottom: 6,
        }}>
        {loading ? 'Analyzing...' : 'AI Analysis'}
      </button>

      {error && (
        <div style={{ color: 'var(--accent-red)', fontSize: 9, marginBottom: 4 }}>{error}</div>
      )}

      {analysis && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 9, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {analysis}
        </div>
      )}
    </div>
  )
}
