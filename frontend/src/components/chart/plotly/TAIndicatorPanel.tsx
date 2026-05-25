import { useState, useEffect } from 'react'

interface IndicatorDef {
  name: string
  params: Record<string, number | number[]>
  category: string
}

interface Props {
  onIndicatorsChange: (indicators: Record<string, Record<string, number | number[]>>) => void
  initialIndicators?: Record<string, Record<string, number | number[]>>
}

const DEFAULT_INDICATORS: Record<string, IndicatorDef> = {
  sma: { name: 'SMA', params: { length: [20, 50] }, category: 'overlap' },
  ema: { name: 'EMA', params: { length: [20] }, category: 'overlap' },
  wma: { name: 'WMA', params: { length: [20] }, category: 'overlap' },
  hma: { name: 'HMA', params: { length: [20] }, category: 'overlap' },
  rsi: { name: 'RSI', params: { length: 14 }, category: 'momentum' },
  macd: { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, category: 'momentum' },
  stoch: { name: 'Stochastic', params: { kPeriod: 14, dPeriod: 3 }, category: 'momentum' },
  cci: { name: 'CCI', params: { length: 20 }, category: 'momentum' },
  adx: { name: 'ADX', params: { length: 14 }, category: 'trend' },
  aroon: { name: 'Aroon', params: { length: 25 }, category: 'trend' },
  atr: { name: 'ATR', params: { length: 14 }, category: 'volatility' },
  bbands: { name: 'Bollinger Bands', params: { length: 20, std: 2 }, category: 'volatility' },
  donchian: { name: 'Donchian Channels', params: { length: 20 }, category: 'volatility' },
  kc: { name: 'Keltner Channels', params: { length: 20 }, category: 'volatility' },
  ad: { name: 'Accum/Dist', params: {}, category: 'volume' },
  adosc: { name: 'Chaikin A/D', params: {}, category: 'volume' },
  obv: { name: 'On-Balance Vol', params: {}, category: 'volume' },
  vwap: { name: 'VWAP', params: {}, category: 'overlap' },
  srlines: { name: 'S/R Lines', params: { window: 200 }, category: 'custom' },
}

const CATEGORIES = [
  { key: 'overlap', label: 'Moving Averages', color: '#3b82f6' },
  { key: 'momentum', label: 'Momentum', color: '#f59e0b' },
  { key: 'trend', label: 'Trend', color: '#10b981' },
  { key: 'volatility', label: 'Volatility', color: '#ec4899' },
  { key: 'volume', label: 'Volume', color: '#8b5cf6' },
  { key: 'custom', label: 'Custom', color: '#06b6d4' },
]

export default function TAIndicatorPanel({ onIndicatorsChange, initialIndicators }: Props) {
  const [selected, setSelected] = useState<Record<string, Record<string, number | number[]>>>(
    initialIndicators || {}
  )
  const [expandedCategory, setExpandedCategory] = useState<string | null>('overlap')

  useEffect(() => {
    onIndicatorsChange(selected)
  }, [selected, onIndicatorsChange])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = { ...DEFAULT_INDICATORS[key].params }
      }
      return next
    })
  }

  const updateParam = (key: string, param: string, value: number | number[]) => {
    setSelected((prev) => {
      if (!prev[key]) return prev
      return {
        ...prev,
        [key]: { ...prev[key], [param]: value },
      }
    })
  }

  const activeCount = Object.keys(selected).length

  return (
    <div style={{
      width: 240, height: '100%', overflow: 'auto',
      background: 'var(--bg-card, #0d1117)',
      borderRight: '1px solid var(--border-color, #1a2332)',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
    }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color, #1a2332)', fontWeight: 600, color: 'var(--text-primary)' }}>
        INDICATORS {activeCount > 0 && <span style={{ color: '#3b82f6' }}>({activeCount})</span>}
      </div>

      {CATEGORIES.map((cat) => {
        const catIndicators = Object.entries(DEFAULT_INDICATORS).filter(([, def]) => def.category === cat.key)
        if (catIndicators.length === 0) return null
        const isExpanded = expandedCategory === cat.key

        return (
          <div key={cat.key}>
            <div
              onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
              style={{
                padding: '4px 8px', cursor: 'pointer', userSelect: 'none',
                color: cat.color, fontWeight: 600, fontSize: 9,
                borderBottom: `1px solid var(--border-color, #1a2332)`,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {isExpanded ? '▼' : '▶'} {cat.label}
            </div>
            {isExpanded && catIndicators.map(([key, def]) => (
              <div key={key} style={{ padding: '2px 8px 2px 16px', borderBottom: '1px solid rgba(26,35,50,0.5)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: selected[key] ? '#e6edf3' : '#5d6b7e' }}>
                  <input
                    type="checkbox"
                    checked={!!selected[key]}
                    onChange={() => toggle(key)}
                    style={{ accentColor: cat.color }}
                  />
                  {def.name}
                </label>
                {selected[key] && Object.entries(def.params).map(([pname, pval]) => (
                  <div key={pname} style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 16, marginTop: 2 }}>
                    <span style={{ color: '#5d6b7e', fontSize: 8, width: 60 }}>{pname}</span>
                    {Array.isArray(pval) ? (
                      <input
                        type="text"
                        value={pval.join(', ')}
                        onChange={(e) => {
                          const vals = e.target.value.split(',').map(Number).filter((n) => !isNaN(n))
                          updateParam(key, pname, vals.length ? vals : pval)
                        }}
                        style={{
                          flex: 1, background: '#0a0e14', border: '1px solid #1a2332', color: '#e6edf3',
                          padding: '1px 4px', fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    ) : (
                      <input
                        type="number"
                        value={pval}
                        onChange={(e) => updateParam(key, pname, Number(e.target.value))}
                        style={{
                          width: 60, background: '#0a0e14', border: '1px solid #1a2332', color: '#e6edf3',
                          padding: '1px 4px', fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
