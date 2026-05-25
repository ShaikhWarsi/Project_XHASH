import { useEffect, useRef, useState } from 'react'
import { useBacktestStore } from '../store/backtest'
import { fetchOHLCV } from '../api/client'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import CacheStatsPanel from '../components/CacheStatsPanel'
import StrategyComparison from '../components/StrategyComparison'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'

function EquityCurve({
  data,
  benchmark,
}: {
  data: { time: string; value: number }[]
  benchmark?: { time: string; value: number }[]
}) {
  const chartRef = useRef<HTMLDivElement>(null)
  const [showBenchmark, setShowBenchmark] = useState(false)
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    const styles = getComputedStyle(document.documentElement)
    const chartBg = styles.getPropertyValue('--chart-bg').trim() || '#1e2235'
    const chartText = styles.getPropertyValue('--chart-text').trim() || '#9aa0a6'
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e'
    const chartBorder = styles.getPropertyValue('--chart-border').trim() || '#2a2d3e'
    const chartLine = styles.getPropertyValue('--chart-line').trim() || '#22c55e'
    const chart = createChart(chartRef.current, {
      height: 200,
      layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
      grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: chartBorder },
      timeScale: { borderColor: chartBorder, timeVisible: false },
    })
    const series = chart.addSeries(LineSeries, { color: chartLine, lineWidth: 2 })
    series.setData(data)
    if (showBenchmark && benchmark && benchmark.length > 0) {
      const benchSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1.5 })
      benchSeries.setData(benchmark)
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [data, benchmark, showBenchmark])
  return (
    <div>
      <div ref={chartRef} />
      {benchmark && benchmark.length > 0 && (
        <div className="flex justify-end mt-1">
          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`text-[9px] font-mono-data px-2 py-0.5 cursor-pointer rounded-sm border transition-colors ${
              showBenchmark ? 'bg-accent-subtle border-accent text-accent-blue' : 'border-default text-muted'
            }`}
          >
            {showBenchmark ? 'HIDE SPY' : 'VS SPY'}
          </button>
        </div>
      )}
    </div>
  )
}

const ENGINE_LEVERAGE_DEFAULTS: Record<string, number> = {
  default: 1.0, us_equity: 1.0, hk_equity: 1.0, china_a: 1.0,
  crypto: 1.0, forex: 100.0, china_futures: 10.0, global_futures: 10.0,
}

export default function Backtest() {
  const { result, running, error, engines, config, setConfig, run, clear, loadEngines } = useBacktestStore()
  const [showCache, setShowCache] = useState(false)
  const [tab, setTab] = useState<'run' | 'compare'>('run')
  const [benchmarkData, setBenchmarkData] = useState<{ time: string; value: number }[]>([])
  useEffect(() => { loadEngines() }, [loadEngines])

  useEffect(() => {
    if (!result || result.timestamps.length === 0) return
    const start = result.timestamps[0].split(/[T ]/)[0]
    const end = result.timestamps[result.timestamps.length - 1].split(/[T ]/)[0]
    if (!start || !end) return
    const firstEquity = result.equity_curve[0] || 100000
    fetchOHLCV('SPY', '1d', '1y')
      .then((bars) => {
        const filtered = bars.filter((b) => {
          const t = typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time)
          return t >= start && t <= end
        })
        if (filtered.length > 0) {
          const refClose = filtered[0].close || 1
          setBenchmarkData(
            filtered.map((b) => ({
              time: typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time),
              value: firstEquity * (b.close / refClose),
            }))
          )
        }
      })
      .catch(() => {})
  }, [result])

  const handleEngineChange = (engine: string) => {
    setConfig({ engine_type: engine, leverage: ENGINE_LEVERAGE_DEFAULTS[engine] ?? 1.0 })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1">
        <Badge label="BACKTEST" variant="info" />
        {(['run', 'compare'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-none font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer uppercase ${
              tab === t ? 'bg-accent-subtle text-accent-blue' : 'text-muted'
            }`}
          >
            {t === 'run' ? 'RUN' : 'COMPARE'}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowCache(!showCache)}
          className={`border border-default font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer rounded-sm ${
            showCache ? 'bg-accent-subtle text-accent-blue' : 'text-muted'
          }`}
        >
          {showCache ? 'HIDE CACHE' : 'CACHE STATS'}
        </button>
      </div>
      {showCache && <CacheStatsPanel />}

      {tab === 'compare' ? (
        <StrategyComparison />
      ) : (
      <>
      <div className="flex justify-end gap-1">
        <button
          onClick={() => setShowCache(!showCache)}
          className={`border border-default font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer rounded-sm ${
            showCache ? 'bg-accent-subtle text-accent-blue' : 'text-muted'
          }`}
        >
          {showCache ? 'HIDE CACHE' : 'CACHE STATS'}
        </button>
      </div>
      <Card title="CONFIG">
        <div className="grid grid-cols-[repeat(4,1fr)_repeat(2,0.7fr)] gap-1">
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">TICKERS</div><input type="text" value={config.tickers} onChange={(e) => setConfig({ tickers: e.target.value })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">STRATEGY</div>
            <select value={config.strategy} onChange={(e) => setConfig({ strategy: e.target.value })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full">
              <option value="hybrid">Hybrid</option><option value="quant">Quant</option><option value="ai">AI</option>
              <option value="sma_cross">SMA Cross</option><option value="momentum">Momentum</option><option value="mean_reversion">Mean Rev</option>
            </select>
          </div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">START</div><input type="date" value={config.start} onChange={(e) => setConfig({ start: e.target.value })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">END</div><input type="date" value={config.end} onChange={(e) => setConfig({ end: e.target.value })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">CAPITAL</div><input type="number" value={config.capital} onChange={(e) => setConfig({ capital: Number(e.target.value) })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">ENGINE</div>
            <select value={config.engine_type} onChange={(e) => handleEngineChange(e.target.value)} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full">
              {engines.length === 0 && <option value="default">Default</option>}
              {engines.map((e) => (<option key={e.id} value={e.id}>{e.label}</option>))}
            </select>
          </div>
          <div><div className="text-[9px] font-mono-data tracking-wider text-muted">LEVERAGE</div><input type="number" min={0.5} max={10} step={0.5} value={config.leverage} onChange={(e) => setConfig({ leverage: Number(e.target.value) })} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
          <div className="flex items-end">
            <button onClick={run} disabled={running}
              className="w-full bg-accent-cyan text-black border-none font-mono-data text-[11px] font-semibold py-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {running ? 'RUNNING...' : 'RUN'}
            </button>
          </div>
        </div>
      </Card>

      {error && <div className="border border-down font-mono-data text-[10px] text-down px-2 py-1" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</div>}

      {result && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'TOTAL RETURN', value: `${(result.total_return * 100).toFixed(2)}%`, col: 'text-up' },
              { label: 'SHARPE', value: result.sharpe_ratio.toFixed(2), col: 'text-primary' },
              { label: 'MAX DD', value: `${(result.max_drawdown * 100).toFixed(1)}%`, col: 'text-down' },
              { label: 'WIN RATE', value: `${(result.win_rate * 100).toFixed(0)}%`, col: 'text-primary' },
            ].map(m => (
              <div key={m.label} className="bg-card border border-default px-2.5 py-1.5">
                <div className="text-[9px] font-mono-data tracking-wider text-muted">{m.label}</div>
                <div className={`font-mono-data text-[11px] font-bold ${m.col}`}>{m.value}</div>
              </div>
            ))}
          </div>

          <Card title="EQUITY CURVE">
            <EquityCurve
              data={result.equity_curve.map((v, i) => {
                const raw = result.timestamps[i] ?? ''
                const datePart = raw.split(/[T ]/)[0]
                return { time: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : String(i), value: v }
              }).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.time))}
              benchmark={benchmarkData.length > 0 ? benchmarkData : undefined}
            />
          </Card>

          <Card title="SUMMARY">
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'ANN. RETURN', value: `${(result.annualized_return * 100).toFixed(2)}%` },
                { label: 'SORTINO', value: result.sortino_ratio.toFixed(2) },
                { label: 'PROFIT FACTOR', value: result.profit_factor.toFixed(2) },
                { label: 'TOTAL TRADES', value: result.total_trades },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">{m.label}</div>
                  <div className="font-mono-data text-[11px] font-semibold text-primary">{m.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <button onClick={clear} className="bg-none border border-default text-muted font-mono-data text-[10px] px-3 py-0.5 cursor-pointer self-start">
            CLEAR RESULTS
          </button>
        </>
      )}

      {!result && !running && !error && (
        <div className="py-6 text-center font-mono-data text-[10px] text-muted">
          Configure and run a backtest to see results
        </div>
      )}
      </>
      )}
    </div>
  )
}
