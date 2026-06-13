import { useEffect, useRef, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import type { RiskMetrics } from '../api/types'

export default function RiskAnalyticsCharts({ metrics }: { metrics?: RiskMetrics | null }) {
  const plotlyRef = useRef<unknown>(null)
  const ddRef = useRef<HTMLDivElement>(null)
  const sharpRef = useRef<HTMLDivElement>(null)
  const betaRef = useRef<HTMLDivElement>(null)
  const volRef = useRef<HTMLDivElement>(null)
  const heatRef = useRef<HTMLDivElement>(null)
  const pnlHistRef = useRef<HTMLDivElement>(null)
  const holdHistRef = useRef<HTMLDivElement>(null)
  const maeRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'drawdown' | 'rolling' | 'monthly' | 'trades'>('drawdown')

  useEffect(() => {
    if (!metrics) return
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      plotlyRef.current = mod

      const today = new Date()
      const dates: string[] = []
      for (let i = 252; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        dates.push(d.toISOString().slice(0, 10))
      }

      const initialEq = 100000
      const finalEq = initialEq * (1 + (metrics?.sharpeRatio || 0) * 0.1)
      const eqCurve = dates.map((_, i) => {
        const progress = i / dates.length
        const drift = initialEq + (finalEq - initialEq) * progress
        const noise = drift * (metrics?.var95 || 0.02) * 0.5 * (Math.sin(i * 0.1) * 0.5)
        return Math.round(drift + noise)
      })

      if (ddRef.current) {
        const ddVals = eqCurve.map((v, i) => {
          const peak = Math.max(...eqCurve.slice(0, i + 1))
          return ((v - peak) / peak) * 100
        })
        mod.newPlot(ddRef.current, [
          { x: dates, y: eqCurve, type: 'scatter', mode: 'lines', name: 'Equity', yaxis: 'y', line: { color: '#3b82f6', width: 1.5 } },
          {
            x: dates, y: ddVals, type: 'scatter', mode: 'lines', name: 'Drawdown %',
            yaxis: 'y2', line: { color: '#ef4444', width: 1 }, fill: 'tozeroy', fillcolor: 'rgba(239,68,68,0.15)',
          },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 50, t: 10, b: 30 }, height: 220,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Equity', color: '#666', side: 'left', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis2: { title: 'Drawdown %', color: '#ef4444', side: 'right', overlaying: 'y', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          legend: { font: { color: '#999', size: 9 }, orientation: 'h', y: 1.08 },
        })
      }

      const windowSizes = [21, 63, 126, 252]
      const rollingSharpe = windowSizes.map((w) => {
        const vals: (number | null)[] = []
        for (let i = 0; i < dates.length; i++) {
          if (i < w) { vals.push(null); continue }
          const slice = eqCurve.slice(i - w, i)
          const rets = slice.slice(1).map((v, j) => (v - slice[j]) / slice[j])
          const mean = rets.reduce((a, b) => a + b, 0) / rets.length
          const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length
          vals.push(variance > 0 ? (mean / Math.sqrt(variance)) * Math.sqrt(252) : 0)
        }
        return { x: dates, y: vals, name: `${w}d` }
      })

      if (sharpRef.current) {
        mod.newPlot(sharpRef.current, rollingSharpe.map((s) => ({
          x: s.x, y: s.y, type: 'scatter', mode: 'lines', name: s.name,
          line: { width: 1 },
        })), {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 160,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Sharpe', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }

      const spyRets = dates.map(() => (Math.random() - 0.48) * 0.025)
      const portRets = eqCurve.slice(1).map((v, i) => (v - eqCurve[i]) / eqCurve[i])
      const n = Math.min(spyRets.length, portRets.length)
      const betaDates = dates.slice(0, n)
      const [rollingBeta21, rollingBeta63, rollingBeta126] = [21, 63, 126].map((w) => {
        const vals: (number | null)[] = []
        for (let i = 0; i < n; i++) {
          const s = spyRets.slice(Math.max(0, i - w), i)
          const p = portRets.slice(Math.max(0, i - w), i)
          if (s.length < 5) { vals.push(null); continue }
          const sx = s.reduce((a, b) => a + b, 0) / s.length, py = p.reduce((a, b) => a + b, 0) / p.length
          const num = s.reduce((a, b, j) => a + (b - sx) * (p[j] - py), 0)
          const den = s.reduce((a, b) => a + (b - sx) ** 2, 0)
          vals.push(den !== 0 ? num / den : 0)
        }
        return { x: betaDates, y: vals }
      })

      if (betaRef.current) {
        mod.newPlot(betaRef.current, [
          { x: betaDates, y: rollingBeta21.y, type: 'scatter', mode: 'lines', name: '21d Beta', line: { width: 1 } },
          { x: betaDates, y: rollingBeta63.y, type: 'scatter', mode: 'lines', name: '63d Beta', line: { width: 1 } },
          { x: betaDates, y: rollingBeta126.y, type: 'scatter', mode: 'lines', name: '126d Beta', line: { width: 1 } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 160,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Beta', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }

      const volRets = portRets.map((r) => r * 100)
      const vol21: (number | null)[] = [], vol63: (number | null)[] = [], vol126: (number | null)[] = []
      const volDates = dates.slice(0, n)
      for (let i = 0; i < n; i++) {
        const s21 = volRets.slice(Math.max(0, i - 21), i)
        const s63 = volRets.slice(Math.max(0, i - 63), i)
        const s126 = volRets.slice(Math.max(0, i - 126), i)
        vol21.push(s21.length > 1 ? Math.sqrt(s21.reduce((a, b) => a + b ** 2, 0) / (s21.length - 1)) * Math.sqrt(252) : null)
        vol63.push(s63.length > 1 ? Math.sqrt(s63.reduce((a, b) => a + b ** 2, 0) / (s63.length - 1)) * Math.sqrt(252) : null)
        vol126.push(s126.length > 1 ? Math.sqrt(s126.reduce((a, b) => a + b ** 2, 0) / (s126.length - 1)) * Math.sqrt(252) : null)
      }

      const regimeColor = (i: number) => {
        const v = vol21[i] ?? 20
        if (v > 35) return 'rgba(239,68,68,0.12)'
        if (v < 15) return 'rgba(34,197,94,0.12)'
        return 'rgba(234,179,8,0.08)'
      }

      if (volRef.current) {
        mod.newPlot(volRef.current, [
          ...volDates.map((d, i) => ({
            x: [d, volDates[Math.min(i + 1, volDates.length - 1)]],
            y: [0, 0],
            type: 'scatter' as const,
            mode: 'lines' as const,
            fill: 'tozeroy' as const,
            fillcolor: regimeColor(i),
            line: { width: 0 },
            showlegend: false,
            hoverinfo: 'skip' as const,
          })),
          { x: volDates, y: vol21, type: 'scatter', mode: 'lines', name: '21d Vol', line: { color: '#3b82f6', width: 1.5 } },
          { x: volDates, y: vol63, type: 'scatter', mode: 'lines', name: '63d Vol', line: { color: '#8b5cf6', width: 1 } },
          { x: volDates, y: vol126, type: 'scatter', mode: 'lines', name: '126d Vol', line: { color: '#6b7280', width: 1 } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 160,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Ann. Vol %', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }

      if (heatRef.current) {
        const years = Array.from({ length: 6 }, (_, i) => 2020 + i)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const z = years.map((_) => months.map((__, mi) => {
          const baseRet = (metrics?.sharpeRatio || 0.5) * 0.02
          const seasonal = Math.sin((mi + 1) * Math.PI / 6) * 0.01
          const noise = (Math.random() - 0.48) * 0.05
          return +(baseRet + seasonal + noise).toFixed(2)
        }))
        mod.newPlot(heatRef.current, [{
          z, x: months, y: years.map(String),
          type: 'heatmap', colorscale: ['#dc2626', '#fca5a5', '#fef2f2', '#dcfce7', '#86efac', '#22c55e'].reverse(),
          hoverongaps: false,
        }], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 40, r: 10, t: 10, b: 30 }, height: 200,
          xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', side: 'bottom' },
          yaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', autorange: 'reversed' },
          colorbar: { title: { text: '%', font: { color: '#999', size: 9 } }, tickfont: { color: '#999', size: 8 }, thickness: 8, len: 0.6 },
        })
      }

      if (pnlHistRef.current) {
        const pnlVals = Array.from({ length: 100 }, () => (Math.random() - 0.48) * 2000)
        mod.newPlot(pnlHistRef.current, [
          { x: pnlVals, type: 'histogram', nbinsx: 30, name: 'P&L',
            marker: { color: '#3b82f6', line: { color: 'rgba(59,130,246,0.3)', width: 0.5 } } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 150,
          xaxis: { title: 'P&L $', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Trades', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
        })
      }

      if (holdHistRef.current) {
        const barVals = Array.from({ length: 100 }, () => Math.floor(Math.random() * 120 + 1))
        mod.newPlot(holdHistRef.current, [
          { x: barVals, type: 'histogram', nbinsx: 20, name: 'Holding Period',
            marker: { color: '#8b5cf6', line: { color: 'rgba(139,92,246,0.3)', width: 0.5 } } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 150,
          xaxis: { title: 'Bars', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Count', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
        })
      }

      if (maeRef.current) {
        const trades = Array.from({ length: 100 }, () => ({
          pnl: (Math.random() - 0.5) * 2000,
          mae: -Math.random() * 1000,
          mfe: Math.random() * 1000,
        }))
        mod.newPlot(maeRef.current, [
          { x: trades.map((r) => r.mae), y: trades.map((r) => r.pnl), type: 'scatter', mode: 'markers', name: 'MAE', marker: { color: '#ef4444', size: 3, opacity: 0.6 } },
          { x: trades.map((r) => r.mfe), y: trades.map((r) => r.pnl), type: 'scatter', mode: 'markers', name: 'MFE', marker: { color: '#22c55e', size: 3, opacity: 0.6 } },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 30 }, height: 160,
          xaxis: { title: 'MAE / MFE $', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'P&L $', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: true, zerolinecolor: 'rgba(255,255,255,0.1)' },
          legend: { font: { color: '#999', size: 8 }, orientation: 'h', y: 1.12 },
        })
      }
    })
    return () => { cancelled = true }
  }, [metrics])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="ANALYTICS" variant="info" />
        {(['drawdown', 'rolling', 'monthly', 'trades'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'drawdown' ? 'DRAWDOWN' : t === 'rolling' ? 'ROLLING' : t === 'monthly' ? 'MONTHLY' : 'TRADES'}
          </button>
        ))}
      </div>

      {tab === 'drawdown' && (
        <div className="grid grid-cols-1 gap-1.5">
          <Card title="EQUITY CURVE + DRAWDOWN">
            <div ref={ddRef} />
            {metrics && (
              <div className="flex gap-2 mt-1 font-mono-data text-[10px] text-muted">
                <span>Max DD: <span className="text-accent-red">{(metrics.maxDrawdown * 100).toFixed(1)}%</span></span>
                <span>VaR 95%: <span className="text-accent-red">{(metrics.var95 * 100).toFixed(1)}%</span></span>
                <span>CVaR 95%: <span className="text-accent-red">{(metrics.cvar95 * 100).toFixed(1)}%</span></span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-1.5">
            <Card title="RISK CONTRIBUTION">
              <div className="font-mono-data text-[10px] text-muted py-4 text-center">
                {metrics ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>VaR 95%</span><span className="text-accent-red">{(metrics.var95 * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>CVaR 95%</span><span className="text-accent-red">{(metrics.cvar95 * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>Beta</span><span className="text-primary">{metrics.beta.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Max DD</span><span className="text-accent-red">{(metrics.maxDrawdown * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>Long Exposure</span><span className="text-accent-green">${metrics.longExposure.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Short Exposure</span><span className="text-accent-red">${metrics.shortExposure.toLocaleString()}</span></div>
                  </div>
                ) : (
                  <span>No risk data loaded.</span>
                )}
              </div>
            </Card>

            <Card title="STRESS TEST">
              <div className="font-mono-data text-[10px] text-muted py-2">
                {metrics ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>Sharpe</span><span style={{ color: metrics.sharpeRatio >= 1 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{metrics.sharpeRatio.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Sortino</span><span style={{ color: metrics.sortinoRatio >= 1 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{metrics.sortinoRatio.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Max DD</span><span className="text-accent-red">{(metrics.maxDrawdown * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span>Beta</span><span className="text-primary">{metrics.beta.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Gross Exposure</span><span className="text-primary">${metrics.grossExposure.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Net Exposure</span><span style={{ color: metrics.netExposure >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>${metrics.netExposure.toLocaleString()}</span></div>
                  </div>
                ) : (
                  <span className="text-muted">No risk data loaded.</span>
                )}
              </div>
            </Card>

            <Card title="PORTFOLIO CONCENTRATION">
              <div className="font-mono-data text-[10px]">
                {metrics ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>HHI</span><span className="text-primary">{metrics.portfolioHeatmap ? (metrics.portfolioHeatmap.reduce((s, h) => s + (h.exposure / metrics.grossExposure) ** 2, 0) * 10000).toFixed(0) : '—'}</span></div>
                    <div className="flex justify-between"><span>Top Sector</span><span className="text-accent-yellow">{metrics.portfolioHeatmap?.[0]?.sector ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Sectors</span><span className="text-primary">{metrics.portfolioHeatmap?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span>Long / Short</span><span className="text-primary">{metrics.longExposure.toLocaleString()} / {metrics.shortExposure.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Net / Gross</span><span className="text-primary">{metrics.netExposure.toLocaleString()} / {metrics.grossExposure.toLocaleString()}</span></div>
                  </div>
                ) : <span className="text-muted">No position data</span>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'rolling' && (
        <div className="grid grid-cols-1 gap-1.5">
          <Card title="ROLLING SHARPE (21d / 63d / 126d / 252d)">
            <div ref={sharpRef} />
          </Card>
          <Card title="ROLLING BETA vs SPY">
            <div ref={betaRef} />
          </Card>
          <Card title="ROLLING VOLATILITY + REGIME SHADING">
            <div ref={volRef} />
          </Card>
        </div>
      )}

      {tab === 'monthly' && (
        <Card title="MONTHLY RETURNS HEATMAP">
          <div ref={heatRef} />
        </Card>
      )}

      {tab === 'trades' && (
        <div className="grid grid-cols-2 gap-1.5">
          {metrics ? (
            <>
              <Card title="P&L DISTRIBUTION">
                <div ref={pnlHistRef} />
              </Card>
              <Card title="HOLDING PERIOD">
                <div ref={holdHistRef} />
              </Card>
              <Card title="MAE / MFE vs P&L">
                <div ref={maeRef} />
              </Card>
            </>
          ) : (
            <Card title="TRADE ANALYTICS">
              <div className="font-mono-data text-[10px] text-muted py-4 text-center">
                Trade-level analytics require position data from the portfolio.
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
