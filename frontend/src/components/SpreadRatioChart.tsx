import { useState, useRef, useEffect } from 'react'
import * as Plotly from 'plotly.js-dist-min'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'BTC-USD', 'ETH-USD']

export default function SpreadRatioChart() {
  const [symA, setSymA] = useState('SPY')
  const [symB, setSymB] = useState('QQQ')
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const abort = new AbortController()
    ;(async () => {
      const [barsA, barsB] = await Promise.all([
        fetchOHLCV(symA, '1d', '6mo'),
        fetchOHLCV(symB, '1d', '6mo'),
      ])
      if (abort.signal.aborted || !chartRef.current || !barsA || !barsB) return

      const a = barsA as BarData[]
      const b = barsB as BarData[]
      const len = Math.min(a.length, b.length)

      const dates = a.slice(0, len).map((d) => d.time)
      const pricesA = a.slice(0, len).map((d) => d.close)
      const pricesB = b.slice(0, len).map((d) => d.close)
      const ratio = pricesA.map((pa, i) => pa / pricesB[i]) as number[]
      const spread = pricesA.map((pa, i) => pa - pricesB[i]) as number[]

      ;(Plotly as any).newPlot(chartRef.current, [
        {
          x: dates, y: ratio, type: 'scatter', mode: 'lines',
          name: `${symA}/${symB} Ratio`,
          line: { color: '#3b82f6', width: 1.5 },
          yaxis: 'y',
        },
        {
          x: dates, y: spread, type: 'scatter', mode: 'lines',
          name: `${symA} - ${symB} Spread`,
          line: { color: '#a855f7', width: 1.5 },
          yaxis: 'y2',
        },
      ], {
        paper_bgcolor: '#0d1117',
        plot_bgcolor: '#0d1117',
        font: { color: '#5d6b7e', family: "'JetBrains Mono', monospace", size: 9 },
        margin: { l: 40, r: 40, t: 20, b: 30 },
        legend: { font: { size: 9 } },
        yaxis: {
          title: 'Ratio', color: '#3b82f6', gridcolor: 'rgba(255,255,255,0.04)',
          zeroline: false,
        },
        yaxis2: {
          title: 'Spread', color: '#a855f7', overlaying: 'y', side: 'right',
          gridcolor: 'rgba(255,255,255,0.04)', zeroline: false,
        },
        xaxis: { gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
      })
    })()

    return () => abort.abort()
  }, [symA, symB])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select value={symA} onChange={(e) => setSymA(e.target.value)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            color: 'var(--accent-cyan)', fontSize: 10, padding: '2px 4px',
            fontFamily: "'JetBrains Mono', monospace", borderRadius: 2,
          }}>
          {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/</span>
        <select value={symB} onChange={(e) => setSymB(e.target.value)}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            color: 'var(--accent-purple)', fontSize: 10, padding: '2px 4px',
            fontFamily: "'JetBrains Mono', monospace", borderRadius: 2,
          }}>
          {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 280 }} />
    </div>
  )
}
