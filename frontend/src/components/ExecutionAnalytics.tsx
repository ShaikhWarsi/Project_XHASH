import Card from './ui/Card'
import Badge from './ui/Badge'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    Plotly: any
  }
}

export default function ExecutionAnalytics() {
  const plotlyRef = useRef<any>(null)
  const slippageRef = useRef<HTMLDivElement>(null)
  const vpinRef = useRef<HTMLDivElement>(null)
  const vwapRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'fills' | 'slippage' | 'quality' | 'vpin'>('fills')

  useEffect(() => {
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      plotlyRef.current = mod

      if (slippageRef.current) {
        const brokers = ['Alpaca', 'IB', 'Coinbase', 'Binance', 'Kraken']
        const avgSlip = brokers.map(() => +(Math.random() * 0.05 + 0.01).toFixed(4))
        mod.newPlot(slippageRef.current, [{
          x: brokers, y: avgSlip, type: 'bar',
          marker: { color: avgSlip.map((s: number) => s > 0.04 ? '#ef4444' : s > 0.025 ? '#eab308' : '#22c55e') },
        }], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 180,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
          yaxis: { title: 'Avg Slippage %', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
        })
      }

      const hours = Array.from({ length: 13 }, (_, i) => `${9 + i}:00`)
      const vpinData = hours.map(() => Math.random() * 0.8 + 0.2)
      if (vpinRef.current) {
        mod.newPlot(vpinRef.current, [
          { x: hours, y: vpinData, type: 'scatter', mode: 'lines+markers', name: 'VPIN', line: { color: '#8b5cf6', width: 1.5 }, marker: { size: 4, color: '#8b5cf6' } },
          { x: hours, y: hours.map(() => 0.5), type: 'scatter', mode: 'lines', name: 'Threshold', line: { color: '#ef4444', width: 1, dash: 'dash' } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 180,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
          yaxis: { title: 'VPIN', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }

      const dates = Array.from({ length: 60 }, (_, i) => {
        const d = new Date('2024-10-01')
        d.setDate(d.getDate() + i)
        return d.toISOString().slice(0, 10)
      })
      const execPrice = dates.map(() => 100 + Math.random() * 10)
      const vwapLine = dates.map(() => 100 + Math.random() * 10)
      if (vwapRef.current) {
        mod.newPlot(vwapRef.current, [
          { x: dates, y: execPrice, type: 'scatter', mode: 'lines', name: 'Exec Price', line: { color: '#3b82f6', width: 1 } },
          { x: dates, y: vwapLine, type: 'scatter', mode: 'lines', name: 'VWAP', line: { color: '#f97316', width: 1, dash: 'dash' } },
          { x: dates, y: dates.map(() => 100), type: 'scatter', mode: 'lines', name: 'TWAP', line: { color: '#22c55e', width: 1, dash: 'dot' } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 180,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
          yaxis: { title: 'Price', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="EXECUTION" variant="info" />
        {(['fills', 'slippage', 'quality', 'vpin'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'fills' ? 'FILL RATIO' : t === 'slippage' ? 'SLIPPAGE' : t === 'quality' ? 'QUALITY' : 'VPIN'}
          </button>
        ))}
      </div>

      {tab === 'fills' && (
        <div className="grid grid-cols-2 gap-1.5">
          <Card title="AGGRESSIVE vs PASSIVE FILL RATIO">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Aggressive</th><th className="text-right">Passive</th><th className="text-right">Ratio</th></tr></thead>
                <tbody>
                  {[
                    { s: 'AAPL', agg: 342, pass: 158 },
                    { s: 'MSFT', agg: 215, pass: 285 },
                    { s: 'TSLA', agg: 523, pass: 77 },
                    { s: 'NVDA', agg: 187, pass: 213 },
                    { s: 'SPY', agg: 89, pass: 411 },
                  ].map((r) => (
                    <tr key={r.s}>
                      <td className="text-left text-primary">{r.s}</td>
                      <td className="text-right text-accent-red">{r.agg}</td>
                      <td className="text-right text-accent-green">{r.pass}</td>
                      <td className="text-right text-muted">{(r.agg / r.pass).toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 text-[9px] text-muted">Aggressive: market orders / maker-taker. Passive: limit orders / taker-maker.</div>
            </div>
          </Card>
          <Card title="FILL QUALITY">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Metric</th><th className="text-right">Value</th><th className="text-right">Grade</th></tr></thead>
                <tbody>
                  {[
                    { m: 'Fill Rate', v: '94.2%', g: 'A' },
                    { m: 'Avg Fill Time', v: '12ms', g: 'A' },
                    { m: 'Partial Fills', v: '3.1%', g: 'B' },
                    { m: 'Slippage (bps)', v: '1.8', g: 'A' },
                    { m: 'Cancelled', v: '2.4%', g: 'A' },
                  ].map((r) => (
                    <tr key={r.m}>
                      <td className="text-left text-primary">{r.m}</td>
                      <td className="text-right">{r.v}</td>
                      <td className={`text-right ${r.g === 'A' ? 'text-accent-green' : 'text-accent-yellow'}`}>{r.g}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'slippage' && (
        <Card title="SLIPPAGE BY BROKER / VENUE">
          <div ref={slippageRef} />
        </Card>
      )}

      {tab === 'quality' && (
        <Card title="EXECUTION QUALITY vs VWAP / TWAP">
          <div ref={vwapRef} />
        </Card>
      )}

      {tab === 'vpin' && (
        <Card title="ORDER FLOW TOXICITY (VPIN)">
          <div ref={vpinRef} />
          <div className="flex gap-2 mt-1 font-mono-data text-[9px] text-muted">
            <span style={{ background: 'rgba(34,197,94,0.1)', padding: '0 4px' }}>Low Toxicity (&lt;0.3)</span>
            <span style={{ background: 'rgba(234,179,8,0.1)', padding: '0 4px' }}>Moderate (0.3-0.5)</span>
            <span style={{ background: 'rgba(239,68,68,0.1)', padding: '0 4px' }}>High Toxicity (&gt;0.5)</span>
          </div>
        </Card>
      )}
    </div>
  )
}
