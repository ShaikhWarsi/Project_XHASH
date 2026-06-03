import { useEffect, useRef, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import type { RiskMetrics } from '../api/types'

function generateEquityCurve(length = 252): { date: string; equity: number; highWaterMark: number; dd: number }[] {
  let eq = 100000
  const peak = 100000
  const data: { date: string; equity: number; highWaterMark: number; dd: number }[] = []
  const d = new Date('2024-01-02')
  let hwm = peak
  for (let i = 0; i < length; i++) {
    const ret = (Math.random() - 0.48) * 0.03
    eq = eq * (1 + ret)
    if (eq > hwm) hwm = eq
    const dd = (eq - hwm) / hwm
    data.push({
      date: d.toISOString().slice(0, 10),
      equity: Math.round(eq * 100) / 100,
      highWaterMark: Math.round(hwm * 100) / 100,
      dd: Math.round(dd * 10000) / 10000,
    })
    d.setDate(d.getDate() + 1)
  }
  return data
}

function trades(n = 100): { pnl: number; bars: number; mae: number; mfe: number }[] {
  return Array.from({ length: n }, () => ({
    pnl: (Math.random() - 0.5) * 2000,
    bars: Math.floor(Math.random() * 120 + 1),
    mae: -Math.random() * 1000,
    mfe: Math.random() * 1000,
  }))
}

function monthlyReturns(): { year: number; month: number; ret: number }[] {
  const data: { year: number; month: number; ret: number }[] = []
  for (let y = 2020; y <= 2025; y++)
    for (let m = 1; m <= 12; m++)
      data.push({ year: y, month: m, ret: (Math.random() - 0.48) * 0.1 })
  return data
}

export default function RiskAnalyticsCharts({ metrics }: { metrics?: RiskMetrics | null }) {
  const plotlyRef = useRef<any>(null)
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
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      plotlyRef.current = mod

      const eq = generateEquityCurve()
      const eqDates = eq.map((r) => r.date)
      const eqVals = eq.map((r) => r.equity)
      const ddVals = eq.map((r) => r.dd * 100)

      if (ddRef.current) {
        mod.newPlot(ddRef.current, [
          { x: eqDates, y: eqVals, type: 'scatter', mode: 'lines', name: 'Equity', yaxis: 'y', line: { color: '#3b82f6', width: 1.5 } },
          {
            x: eqDates, y: ddVals, type: 'scatter', mode: 'lines', name: 'Drawdown %',
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
        const vals = []
        for (let i = 0; i < eq.length; i++) {
          const slice = eq.slice(Math.max(0, i - w), i).map((r) => r.equity)
          if (slice.length < 10) { vals.push(null); continue }
          const rets = slice.slice(1).map((v, j) => (v - slice[j]) / slice[j])
          const mean = rets.reduce((a, b) => a + b, 0) / rets.length
          const var_ = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length
          vals.push(var_ > 0 ? (mean / Math.sqrt(var_)) * Math.sqrt(252) : 0)
        }
        return { x: eqDates, y: vals, name: `${w}d` }
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

      const spyRets = Array.from({ length: eq.length }, () => (Math.random() - 0.5) * 0.025)
      const portRets = eq.slice(1).map((v, i) => (v.equity - eq[i].equity) / eq[i].equity)
      const n = Math.min(spyRets.length, portRets.length)
      const betaDates = eqDates.slice(0, n)
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
      const volDates = eqDates.slice(0, n)
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

      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const mRet = monthlyReturns()
      const years = [...new Set(mRet.map((r) => r.year))].sort()
      if (heatRef.current) {
        const z = years.map((y) => months.slice(1).map((_, mi) => {
          const r = mRet.find((d) => d.year === y && d.month === mi + 1)
          return r ? +(r.ret * 100).toFixed(2) : 0
        }))
        mod.newPlot(heatRef.current, [{
          z, x: months.slice(1), y: years.map(String),
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

      const t = trades()
      const pnlVals = t.map((r) => r.pnl)
      if (pnlHistRef.current) {
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

      const barVals = t.map((r) => r.bars)
      if (holdHistRef.current) {
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
        mod.newPlot(maeRef.current, [
          { x: t.map((r) => r.mae), y: t.map((r) => r.pnl), type: 'scatter', mode: 'markers', name: 'MAE', marker: { color: '#ef4444', size: 3, opacity: 0.6 } },
          { x: t.map((r) => r.mfe), y: t.map((r) => r.pnl), type: 'scatter', mode: 'markers', name: 'MFE', marker: { color: '#22c55e', size: 3, opacity: 0.6 } },
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
  }, [])

  const eqCurve = generateEquityCurve()
  const maxDD = Math.min(...eqCurve.map((r) => r.dd))

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
            <div className="flex gap-2 mt-1 font-mono-data text-[10px] text-muted">
              <span>Max DD: <span className="text-accent-red">{(maxDD * 100).toFixed(1)}%</span></span>
              <span>Current: <span className={`${eqCurve[eqCurve.length - 1].dd < -0.05 ? 'text-accent-red' : 'text-accent-green'}`}>{(eqCurve[eqCurve.length - 1].dd * 100).toFixed(1)}%</span></span>
              <span>Recovery: <span className="text-accent-yellow">{eqCurve.filter((r) => r.dd < 0).length}d underwater</span></span>
            </div>
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
                  <span>No risk data loaded. Upload a portfolio to view per-position risk contributions.</span>
                )}
              </div>
            </Card>

            <Card title="STRESS TEST">
              <div className="font-mono-data text-[10px] text-muted py-2">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Scenario</th><th className="text-right">Impact</th><th className="text-right">Recovery</th></tr></thead>
                  <tbody>
                    {[
                      { name: '2008 GFC', shock: -48, recovery: '14mo' },
                      { name: '2020 COVID', shock: -34, recovery: '5mo' },
                      { name: 'Flash Crash', shock: -9, recovery: '1d' },
                      { name: '2022 Rate Hike', shock: -25, recovery: '11mo' },
                      { name: 'Dot-Com Bust', shock: -49, recovery: '31mo' },
                    ].map((s) => (
                      <tr key={s.name}>
                        <td className="text-left">{s.name}</td>
                        <td className="text-right text-accent-red">-{s.shock}%</td>
                        <td className="text-right">{s.recovery}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="FACTOR CROWDING">
              <div className="font-mono-data text-[10px] text-muted py-2">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Factor</th><th className="text-right">Crowding</th><th className="text-right">Z-Score</th></tr></thead>
                  <tbody>
                    {[
                      { f: 'Momentum (UMD)', c: 'HIGH', z: 2.8 },
                      { f: 'Value (HML)', c: 'MODERATE', z: 1.2 },
                      { f: 'Size (SMB)', c: 'LOW', z: -0.5 },
                      { f: 'Quality (RMW)', c: 'HIGH', z: 2.1 },
                      { f: 'Low Vol (BAB)', c: 'MODERATE', z: 1.6 },
                    ].map((s) => (
                      <tr key={s.f}>
                        <td className="text-left">{s.f}</td>
                        <td className={`text-right ${s.c === 'HIGH' ? 'text-accent-red' : s.c === 'MODERATE' ? 'text-accent-yellow' : 'text-accent-green'}`}>{s.c}</td>
                        <td className="text-right text-primary">{s.z > 0 ? '+' : ''}{s.z.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-muted">Z-score &gt; 2.0 suggests crowded trade with unwind risk</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Card title="POSITION CONCENTRATION">
              <div className="font-mono-data text-[10px]">
                {metrics ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>HHI</span><span className="text-primary">{metrics.portfolioHeatmap ? (metrics.portfolioHeatmap.reduce((s, h) => s + (h.exposure / metrics.grossExposure) ** 2, 0) * 10000).toFixed(0) : '—'}</span></div>
                    <div className="flex justify-between"><span>Top-1</span><span className="text-accent-yellow">{metrics.portfolioHeatmap?.[0]?.sector ?? '—'} ({metrics.portfolioHeatmap?.[0] ? ((metrics.portfolioHeatmap[0].exposure / metrics.grossExposure) * 100).toFixed(0) : 0}%)</span></div>
                    <div className="flex justify-between"><span>Top-5</span><span className="text-primary">{metrics.portfolioHeatmap ? metrics.portfolioHeatmap.slice(0, 5).reduce((s, h) => s + h.exposure, 0).toLocaleString() : '—'}</span></div>
                    <div className="mt-1 w-full h-1.5 bg-border rounded-full overflow-hidden">
                      {metrics.portfolioHeatmap?.map((h, i) => (
                        <div key={i} className="h-full inline-block" style={{ width: `${(h.exposure / metrics.grossExposure) * 100}%`, background: i === 0 ? 'var(--accent-yellow)' : i < 3 ? 'var(--accent-blue)' : 'var(--border-color)' }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-0.5"><span>Gross</span><span className="text-primary">${metrics.grossExposure.toLocaleString()}</span></div>
                  </div>
                ) : <span className="text-muted">No position data</span>}
              </div>
            </Card>

            <Card title="LIQUIDITY VaR">
              <div className="font-mono-data text-[10px]">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between"><span>VaR 95%</span><span className="text-accent-red">{(metrics?.var95 ?? 0.02) * 100 > 0 ? ((metrics?.var95 ?? 0.02) * 100).toFixed(1) : '2.0'}%</span></div>
                  <div className="flex justify-between"><span>Liq. Adj. VaR</span><span className="text-accent-red">{((metrics?.var95 ?? 0.02) * 1.5 * 100).toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span>Spread Cost</span><span className="text-accent-yellow">{(metrics ? metrics.grossExposure * 0.0005 : 500).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Impact Cost</span><span className="text-accent-yellow">{(metrics ? metrics.grossExposure * 0.001 : 1000).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Total LVaR</span><span className="text-accent-red">{((metrics?.var95 ?? 0.02) * 1.5 * 100 + 0.15).toFixed(1)}%</span></div>
                </div>
                <div className="mt-1 text-[9px] text-muted">LVaR = VaR + ½ spread + impact cost</div>
              </div>
            </Card>

            <Card title="BETA-ADJUSTED EXPOSURE">
              <div className="font-mono-data text-[10px]">
                {metrics ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span>Beta</span><span className="text-primary">{metrics.beta.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Gross</span><span className="text-primary">${metrics.grossExposure.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Beta-Adj</span><span className="text-accent-yellow">${(metrics.grossExposure * Math.abs(metrics.beta)).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>SPY Equiv</span><span className="text-primary">{metrics.beta !== 0 ? `${(metrics.netExposure * metrics.beta / 474).toFixed(1)}k shrs` : 'N/A'}</span></div>
                    <div className="mt-1 p-1" style={{ background: 'var(--border-color)' }}>
                      <div className="text-[9px] text-muted">Beta-adjusted exposure = gross &times; |beta|</div>
                      <div className="text-[9px] text-muted">Hedging: {"("}{(metrics.beta < 0 ? 'long' : 'short')}{" "}{(metrics.netExposure * Math.abs(metrics.beta) / 474).toFixed(1)}{")"}k SPY shares</div>
                    </div>
                  </div>
                ) : <span className="text-muted">No beta data</span>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <Card title="P&L CALENDAR">
              <div className="font-mono-data text-[10px] text-muted py-4 text-center">
                <div className="grid grid-cols-7 gap-0.5 text-[9px]">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="text-center text-muted">{d}</div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const r = (Math.random() - 0.5) * 2000
                    const bg = r > 500 ? 'rgba(34,197,94,0.2)' : r < -500 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.03)'
                    const c = r > 500 ? 'var(--accent-green)' : r < -500 ? 'var(--accent-red)' : 'var(--text-muted)'
                    return (
                      <div key={i} className="text-right px-0.5 rounded" style={{ background: bg, color: c }}>
                        {r > 0 ? '+' : ''}{r.toFixed(0)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <Card title="P&L BY STRATEGY">
              <div className="font-mono-data text-[10px] py-2">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Strategy</th><th className="text-right">P&L</th><th className="text-right">%</th></tr></thead>
                  <tbody>
                    {[
                      { n: 'Momentum', p: 42500, pct: 38 },
                      { n: 'Mean Reversion', p: 18300, pct: 16 },
                      { n: 'Breakout', p: -4200, pct: -4 },
                      { n: 'Event Driven', p: 27900, pct: 25 },
                      { n: 'Carry', p: 15100, pct: 14 },
                      { n: 'Pairs', p: 12100, pct: 11 },
                    ].map((s) => (
                      <tr key={s.n}>
                        <td className="text-left text-primary">{s.n}</td>
                        <td className={`text-right ${s.p >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{s.p >= 0 ? '+' : ''}${s.p.toLocaleString()}</td>
                        <td className="text-right text-muted">{s.pct >= 0 ? '+' : ''}{s.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="P&L BY SECTOR">
              <div className="font-mono-data text-[10px] py-2">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Sector</th><th className="text-right">P&L</th><th className="text-right">Exp.</th><th className="text-right">Return</th></tr></thead>
                  <tbody>
                    {[
                      { n: 'Technology', p: 31500, e: 450000, r: 7.0 },
                      { n: 'Energy', p: -5200, e: 180000, r: -2.9 },
                      { n: 'Healthcare', p: 12700, e: 220000, r: 5.8 },
                      { n: 'Financials', p: 21400, e: 350000, r: 6.1 },
                      { n: 'Consumer', p: 8900, e: 150000, r: 5.9 },
                      { n: 'Industrials', p: -3100, e: 120000, r: -2.6 },
                    ].map((s) => (
                      <tr key={s.n}>
                        <td className="text-left text-primary">{s.n}</td>
                        <td className={`text-right ${s.p >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{s.p >= 0 ? '+' : ''}${s.p.toLocaleString()}</td>
                        <td className="text-right text-muted">${s.e.toLocaleString()}</td>
                        <td className={`text-right ${s.r >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{s.r >= 0 ? '+' : ''}{s.r.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <div className="flex gap-2 mt-1 font-mono-data text-[9px] text-muted">
              <span style={{ background: 'rgba(34,197,94,0.12)', padding: '0 4px' }}>Low Vol</span>
              <span style={{ background: 'rgba(234,179,8,0.08)', padding: '0 4px' }}>Normal</span>
              <span style={{ background: 'rgba(239,68,68,0.12)', padding: '0 4px' }}>High Vol</span>
            </div>
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
          <Card title="P&L DISTRIBUTION">
            <div ref={pnlHistRef} />
          </Card>
          <Card title="HOLDING PERIOD">
            <div ref={holdHistRef} />
          </Card>
          <Card title="MAE / MFE vs P&L">
            <div ref={maeRef} />
          </Card>
        </div>
      )}
    </div>
  )
}
