import { useState } from 'react'
import Card from '../components/ui/Card'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-hover)',
  border: '1px solid var(--input-border)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 12px',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)',
  outline: 'none',
}

export default function MmcAnalysis() {
  const [symbol, setSymbol] = useState('BTC-USD')
  const [period, setPeriod] = useState('1mo')
  const [interval, setInterval_] = useState('15m')
  const [chartUrl, setChartUrl] = useState('')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showData, setShowData] = useState(false)

  const chartSrc = chartUrl

  const generateChart = async () => {
    setLoading(true)
    setError('')
    setChartUrl('')
    setData(null)
    try {
      const params = new URLSearchParams({ symbol, period, interval })
      setChartUrl(`/api/mmc/chart?${params}`)
      const res = await fetch(`/api/mmc/analyze?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      setData(result as Record<string, unknown>)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load MMC analysis')
      setChartUrl('')
    }
    setLoading(false)
  }

  const renderValue = (v: unknown): string => {
    if (typeof v === 'number') return v.toFixed(4)
    if (typeof v === 'object' && v !== null) {
      const arr = Array.isArray(v) ? v : Object.values(v as Record<string, unknown>)
      return `${arr.length} items`
    }
    return String(v)
  }

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
        MMC Analysis
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Master Strategy Chart — multi-timeframe market microstructure analysis with probability layers.
      </p>

      <Card title="Parameters">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} style={{ ...inputStyle, width: 120 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle}>
              {['1w', '2w', '1mo', '3mo', '6mo', '1y'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Interval</label>
            <select value={interval} onChange={(e) => setInterval_(e.target.value)} style={inputStyle}>
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generateChart}
            disabled={loading}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              background: 'var(--accent-blue)',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Generating...' : 'Generate Chart'}
          </button>
        </div>
      </Card>

      {error && (
        <div style={{
          background: 'var(--accent-red)10',
          border: '1px solid var(--accent-red)30',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: 'var(--text-sm)',
          color: 'var(--accent-red)',
        }}>
          {error}
        </div>
      )}

      {chartSrc && (
        <>
          <div style={{
            width: '100%',
            height: '80vh',
            border: '1px solid var(--input-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <iframe
              src={chartSrc}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="MMC Chart"
            />
          </div>

          {data && (
            <div>
              <button
                onClick={() => setShowData(!showData)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  background: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--input-border)',
                  cursor: 'pointer',
                }}
              >
                {showData ? 'Hide' : 'Show'} Analysis Data
              </button>

              {showData && (
                <Card title="Analysis Results">
                  {Object.keys(data).filter(k => k !== 'chart_html').length === 0 ? (
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No analysis data returned.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(data).filter(([k]) => k !== 'chart_html').map(([k, v]) => {
                        const isNumber = typeof v === 'number'
                        const numericVal = isNumber ? (v as number) : 0
                        return (
                          <div
                            key={k}
                            style={{
                              background: 'var(--bg-hover)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-3)',
                            }}
                          >
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'capitalize' }}>
                              {k.replace(/_/g, ' ')}
                            </div>
                            <div style={{
                              fontSize: 'var(--text-sm)',
                              fontWeight: 500,
                              color: isNumber && numericVal > 0 ? 'var(--accent-green)' : isNumber && numericVal < 0 ? 'var(--accent-red)' : 'var(--text-primary)',
                              wordBreak: 'break-word',
                            }}>
                              {renderValue(v)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {!chartSrc && !loading && !error && (
        <Card title="How to Use">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p>Enter a symbol and select a period/interval, then click <strong>Generate Chart</strong>.</p>
            <p className="mt-2">The MMC (Master Strategy Chart) engine analyzes:</p>
            <ul className="mt-2 space-y-1" style={{ paddingLeft: 20 }}>
              <li>• Market microstructure patterns</li>
              <li>• Multi-timeframe probability layers</li>
              <li>• Order blocks, FVGs, and BOS/CHoCH</li>
              <li>• EQH/EQL liquidity levels</li>
              <li>• ZigZag swings and harmonic patterns</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}
