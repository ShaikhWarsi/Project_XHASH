import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { scanSymbols, getScreenerPresets, scanWithPreset } from '../api/client'
import Spinner from '../components/Spinner'

interface ScanResult {
  symbol: string
  close: number | null
  change_pct: number
  volume: number
  volume_ratio: number
  rsi: number | null
  sma_50: number | null
  sma_200: number | null
  golden_cross: boolean
  macd_bullish_cross: boolean
  bb_upper: number | null
  bb_lower: number | null
  bb_width: number | null
  match?: boolean
  reason?: string
}

export default function MarketScreener() {
  const [symbolInput, setSymbolInput] = useState('AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA')
  const [presets, setPresets] = useState<Record<string, { name: string; description: string; filters: Record<string, any> }>>({})
  const [results, setResults] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<string>('change_pct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    getScreenerPresets().then(setPresets).catch(() => {})
  }, [])

  const doScan = useCallback(async (overrides?: Record<string, any>) => {
    setLoading(true)
    setError('')
    try {
      const symbols = symbolInput.split(',').map(s => s.trim()).filter(Boolean)
      const f = overrides ?? filters
      const res = await scanSymbols(symbols, Object.keys(f).length > 0 ? f : undefined)
      setResults(res.results)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }, [symbolInput, filters])

  const handlePreset = async (name: string) => {
    setActivePreset(name)
    setLoading(true)
    setError('')
    try {
      const symbols = symbolInput.split(',').map(s => s.trim()).filter(Boolean)
      const res = await scanWithPreset(name, symbols.join(','))
      setResults(res.results)
      setFilters(presets[name]?.filters || {})
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Scan failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setActivePreset(null)
    doScan()
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...results].sort((a, b) => {
    const av = (a as any)[sortKey] ?? 0
    const bv = (b as any)[sortKey] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  const colorForChange = (pct: number) => {
    if (pct > 0) return '#22c55e'
    if (pct < 0) return '#ef4444'
    return 'var(--text-secondary)'
  }

  return (
    <div style={{ padding: '16px 24px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', maxWidth: 1400 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Market Screener</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={symbolInput}
          onChange={e => setSymbolInput(e.target.value)}
          placeholder="AAPL,MSFT,GOOGL,AMZN"
          style={{
            flex: 1, minWidth: 300, padding: '6px 10px', fontSize: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        <button type="submit" style={{
          padding: '6px 16px', fontSize: 12, fontWeight: 500,
          background: 'var(--accent-cyan, #3b82f6)', color: '#fff',
          border: 'none', borderRadius: 4, cursor: 'pointer',
        }}>
          Scan
        </button>
        <button type="button" onClick={() => setShowFilters(v => !v)} style={{
          padding: '6px 12px', fontSize: 11, fontWeight: 500,
          background: showFilters ? 'var(--accent-cyan, #3b82f6)' : 'var(--bg-card)',
          color: showFilters ? '#fff' : 'var(--text-secondary)',
          border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer',
        }}>
          Filters
        </button>
      </form>

      {showFilters && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4 }}>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            RSI min:
            <input type="number" value={filters.rsi_min ?? ''} onChange={e => setFilters(f => ({ ...f, rsi_min: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 50, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            RSI max:
            <input type="number" value={filters.rsi_max ?? ''} onChange={e => setFilters(f => ({ ...f, rsi_max: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 50, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Vol min:
            <input type="number" value={filters.volume_min ?? ''} onChange={e => setFilters(f => ({ ...f, volume_min: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 80, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Vol ratio &ge;:
            <input type="number" step="0.1" value={filters.volume_ratio_min ?? ''} onChange={e => setFilters(f => ({ ...f, volume_ratio_min: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 50, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Price &ge;:
            <input type="number" step="0.1" value={filters.price_min ?? ''} onChange={e => setFilters(f => ({ ...f, price_min: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 60, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Change &ge;%:
            <input type="number" step="0.5" value={filters.change_pct_min ?? ''} onChange={e => setFilters(f => ({ ...f, change_pct_min: e.target.value ? Number(e.target.value) : undefined }))} style={{ width: 50, padding: '2px 4px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 2 }} />
          </label>
          <button type="button" onClick={() => doScan()} style={{ padding: '4px 12px', fontSize: 11, background: 'var(--accent-cyan, #3b82f6)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Apply
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(presets).map(([key, p]) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            title={p.description}
            style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 500,
              background: activePreset === key ? 'var(--accent-green, #22c55e)' : 'var(--bg-card)',
              color: activePreset === key ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {loading && <Spinner label="Scanning markets..." />}

      {sorted.length > 0 && !loading && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            {results.filter(r => r.match !== false).length} / {results.length} matches
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  {['Symbol', 'Price', 'Change%', 'Volume', 'Vol Ratio', 'RSI', 'SMA50', 'SMA200', 'GC', 'MACD', 'BB%', 'Status'].map(col => (
                    <th
                      key={col}
                      onClick={() => {
                        const keyMap: Record<string, string> = {
                          Symbol: 'symbol', Price: 'close', 'Change%': 'change_pct', Volume: 'volume',
                          'Vol Ratio': 'volume_ratio', RSI: 'rsi', SMA50: 'sma_50', SMA200: 'sma_200',
                          GC: 'golden_cross', MACD: 'macd_bullish_cross', 'BB%': 'bb_width', Status: 'match',
                        }
                        handleSort(keyMap[col] || col)
                      }}
                      style={{
                        padding: '6px 8px', textAlign: 'right', fontWeight: 500,
                        color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}
                    >
                      {col} {sortKey === col.toLowerCase() ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr
                    key={r.symbol}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: r.match === false ? 'rgba(239,68,68,0.05)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--accent-cyan, #3b82f6)', fontWeight: 500 }}>
                      {r.symbol}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.close?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: colorForChange(r.change_pct) }}>
                      {r.change_pct > 0 ? '+' : ''}{r.change_pct?.toFixed(2)}%
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                      {r.volume > 1e6 ? `${(r.volume / 1e6).toFixed(1)}M` : r.volume > 1e3 ? `${(r.volume / 1e3).toFixed(1)}K` : r.volume}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: r.volume_ratio > 1.5 ? '#22c55e' : 'var(--text-secondary)' }}>
                      {r.volume_ratio?.toFixed(2)}x
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: r.rsi == null ? 'var(--text-muted)' : r.rsi < 30 ? '#ef4444' : r.rsi > 70 ? '#22c55e' : 'var(--text-secondary)' }}>
                      {r.rsi?.toFixed(1) ?? '-'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.sma_50?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.sma_200?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: r.golden_cross ? '#22c55e' : 'var(--text-muted)' }}>
                      {r.golden_cross ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: r.macd_bullish_cross ? '#22c55e' : 'var(--text-muted)' }}>
                      {r.macd_bullish_cross ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right' }}>{r.bb_width?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', fontSize: 10 }}>
                      {r.match === false ? (
                        <span style={{ color: '#ef4444' }}>✗</span>
                      ) : r.match === true ? (
                        <span style={{ color: '#22c55e' }}>✓</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            Click column headers to sort
          </div>
        </>
      )}

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          Enter symbols and click Scan to start screening
        </div>
      )}
    </div>
  )
}
