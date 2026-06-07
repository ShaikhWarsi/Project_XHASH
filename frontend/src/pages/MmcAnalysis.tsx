import { useState, useRef, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'

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
  const [interval_, setInterval_] = useState('15m')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'chart' | 'mtf' | 'prob' | 'presets'>('chart')
  const chartRef = useRef<HTMLDivElement>(null)
  const probRef = useRef<HTMLDivElement>(null)
  const [ohlcvData, setOhlcvData] = useState<BarData[]>([])
  const [presets, setPresets] = useState<{ name: string; symbol: string; period: string; interval: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('mmc_presets') || '[]') } catch { return [] }
  })

  const generateChart = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    setData(null)
    setOhlcvData([])
    try {
      const params = new URLSearchParams({ symbol, period, interval: interval_ })
      const [res, bars] = await Promise.all([
        fetch(`/api/mmc/analyze?${params}`),
        fetchOHLCV(symbol, interval_, period),
      ])
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      setData(result as Record<string, unknown>)
      if (bars && bars.length > 0) setOhlcvData(bars)
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load MMC analysis')
    }
    setLoading(false)
  }

  const savePreset = () => {
    const name = prompt('Preset name:')
    if (!name) return
    const next = [...presets, { name, symbol, period, interval: interval_ }]
    setPresets(next)
    localStorage.setItem('mmc_presets', JSON.stringify(next))
  }

  const loadPreset = (p: { name: string; symbol: string; period: string; interval: string }) => {
    setSymbol(p.symbol); setPeriod(p.period); setInterval_(p.interval)
  }

  const deletePreset = (i: number) => {
    const next = presets.filter((_, idx) => idx !== i)
    setPresets(next)
    localStorage.setItem('mmc_presets', JSON.stringify(next))
  }

  useEffect(() => {
    if (tab !== 'chart' || !chartRef.current || ohlcvData.length === 0) return
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      const times = ohlcvData.map((d) => d.time)
      const open = ohlcvData.map((d) => d.open)
      const high = ohlcvData.map((d) => d.high)
      const low = ohlcvData.map((d) => d.low)
      const close = ohlcvData.map((d) => d.close)
      mod.newPlot(chartRef.current, [{
        x: times, open, high, low, close,
        type: 'candlestick',
        increasing: { line: { color: '#26a69a' }, fillcolor: '#26a69a' },
        decreasing: { line: { color: '#ef5350' }, fillcolor: '#ef5350' },
      }], {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', rangeslider: { visible: false } },
        yaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
      })
    })
    return () => { cancelled = true }
  }, [tab, ohlcvData, symbol])

  useEffect(() => {
    if (tab !== 'prob' || !probRef.current || !data) return
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      const mmcData = data as Record<string, unknown>
      const probData = mmcData.probability_heatmap as { prices: number[]; times: string[]; z: number[][] } | undefined
      if (!probData) {
        mod.newPlot(probRef.current, [], {})
        return
      }
      mod.newPlot(probRef.current, [{
        z: probData.z, x: probData.times, y: probData.prices,
        type: 'heatmap', colorscale: 'Viridis', hoverongaps: false,
      }], {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 10, b: 40 }, height: 300,
        xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
        yaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', autorange: 'reversed' },
        colorbar: { title: { text: '%', font: { color: '#999', size: 9 } }, tickfont: { color: '#999', size: 8 }, thickness: 8 },
      })
    })
    return () => { cancelled = true }
  }, [tab, data])

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

      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="MMC" variant="info" />
        {(['chart', 'mtf', 'prob', 'presets'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'chart' ? 'CHART' : t === 'mtf' ? 'MTF' : t === 'prob' ? 'PROB' : 'PRESETS'}
          </button>
        ))}
      </div>

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
            <select value={interval_} onChange={(e) => setInterval_(e.target.value)} style={inputStyle}>
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <button onClick={generateChart} disabled={loading}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 500, background: 'var(--accent-blue)', color: '#ffffff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
          <button onClick={savePreset}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}>
            Save Preset
          </button>
        </div>
      </Card>

      {tab === 'mtf' && (
        <Card title="MULTI-TIMEFRAME RIBBON">
          {ohlcvData.length > 0 ? (
            <div className="flex flex-col gap-1 font-mono-data text-[10px]">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => {
                const last = ohlcvData[ohlcvData.length - 1]
                const chg = last.close - last.open
                const chgPct = last.open !== 0 ? (chg / last.open) * 100 : 0
                return (
                  <div key={tf} className="flex items-center gap-2 py-1 border-b border-default">
                    <span className="text-muted w-8">{tf}</span>
                    <div className="flex-1 h-3 relative" style={{ background: 'var(--border-color)' }}>
                      <div className="h-full" style={{
                        width: `${Math.min(Math.abs(chgPct) * 10, 100)}%`,
                        background: chg >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        opacity: 0.7,
                      }} />
                    </div>
                    <span className="text-primary w-16 text-right">${last.close.toFixed(2)}</span>
                    <span className={chg >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                      {chg >= 0 ? '+' : ''}{chgPct.toFixed(2)}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-muted text-[10px] py-2">Load data to see multi-timeframe ribbon</div>
          )}
        </Card>
      )}

      {tab === 'prob' && (
        <Card title="PROBABILITY HEATMAP — PRICE × TIME">
          {data ? (
            <div ref={probRef} />
          ) : (
            <div className="text-muted text-[10px] py-2">Load analysis to see probability heatmap</div>
          )}
        </Card>
      )}

      {tab === 'presets' && (
        <Card title="SAVED PRESETS" actions={
          presets.length > 0 ? <span className="text-[10px] font-mono-data text-muted">{presets.length} presets</span> : undefined
        }>
          {presets.length > 0 ? (
            <div className="font-mono-data text-[10px]">
              {presets.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-default">
                  <div>
                    <span className="text-accent-cyan font-bold">{p.name}</span>
                    <span className="text-muted ml-2">{p.symbol} {p.period} {p.interval}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadPreset(p)} className="px-2 py-0.5 text-[9px] cursor-pointer border-none" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}>Load</button>
                    <button onClick={() => deletePreset(i)} className="px-2 py-0.5 text-[9px] cursor-pointer border-none" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">No presets saved. Configure parameters and click "Save Preset".</div>
          )}
        </Card>
      )}

      {error && (
        <div style={{ background: 'var(--accent-red)10', border: '1px solid var(--accent-red)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {tab === 'chart' && data && (
        <Card title="Analysis Results">
          {Object.keys(data).filter(k => k !== 'chart_html').length === 0 ? (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No analysis data returned from MMC engine.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data).filter(([k]) => k !== 'chart_html').map(([k, v]) => {
                const isNumber = typeof v === 'number'
                const numericVal = isNumber ? (v as number) : 0
                return (
                  <div key={k} style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'capitalize' }}>
                      {k.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: isNumber && numericVal > 0 ? 'var(--accent-green)' : isNumber && numericVal < 0 ? 'var(--accent-red)' : 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {renderValue(v)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {ohlcvData.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>OHLCV Chart — {symbol}:</span>
              </div>
              <div ref={chartRef} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 500, background: 'var(--bg-card)' }} />
            </div>
          )}
        </Card>
      )}

      {!data && !loading && !error && tab === 'chart' && (
        <Card title="How to Use">
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p>Enter a symbol and select a period/interval, then click <strong>Generate Chart</strong>.</p>
            <p className="mt-2">The MMC engine analyzes market microstructure patterns across multiple timeframes.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
