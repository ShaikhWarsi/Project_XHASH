import { useEffect, useRef, useState } from 'react'
import { Play, Loader, Settings } from 'lucide-react'
import { useBacktestStore } from '../store/backtest'
import { fetchOHLCV } from '../api/client'
import { useToastStore } from '../store/toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import CacheStatsPanel from '../components/CacheStatsPanel'
import StrategyComparison from '../components/StrategyComparison'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'

const COMMANDS = [
  { id: 'backtest', label: 'BACKTEST', color: 'var(--accent-cyan)' },
  { id: 'optimize', label: 'OPTIMIZE', color: 'var(--accent-yellow)' },
  { id: 'walkforward', label: 'WALK-FWD', color: 'var(--accent-blue)' },
]

function EquityCurveChart({
  data, benchmark,
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
      height: 220,
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
            className="text-[9px] font-mono-data px-2 py-0.5 cursor-pointer rounded-sm border transition-colors"
            style={{
              background: showBenchmark ? 'rgba(59,130,246,0.15)' : 'none',
              borderColor: 'var(--border-color)',
              color: showBenchmark ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}
          >
            {showBenchmark ? 'HIDE SPY' : 'VS SPY'}
          </button>
        </div>
      )}
    </div>
  )
}

function MetricsCard({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  return (
    <div
      className="flex flex-col justify-center gap-1 shrink-0"
      style={{
        minWidth: '90px',
        flex: '1 1 0',
        padding: '8px 10px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '3px',
      }}
    >
      <div className="flex items-center gap-1">
        <span className="font-mono-data text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="font-mono-data font-extrabold leading-tight" style={{ fontSize: '16px', color }}>
        {value}
      </div>
      <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-muted)' }}>{sublabel}</div>
    </div>
  )
}

const ENGINE_LEVERAGE_DEFAULTS: Record<string, number> = {
  default: 1.0, us_equity: 1.0, hk_equity: 1.0, china_a: 1.0,
  crypto: 1.0, forex: 100.0, china_futures: 10.0, global_futures: 10.0,
}

export default function Backtest() {
  const addToast = useToastStore((s) => s.addToast)
  const { result, running, error, engines, config, setConfig, run, clear, loadEngines } = useBacktestStore()
  const [showCache, setShowCache] = useState(false)
  const [tab, setTab] = useState<'run' | 'compare'>('run')
  const [benchmarkData, setBenchmarkData] = useState<{ time: string; value: number }[]>([])
  const [activeCommand, setActiveCommand] = useState('backtest')
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
      .catch((err) => {
        console.warn('Backtest: fetchOHLCV SPY failed', err)
        addToast('Failed to load SPY benchmark data', 'error')
      })
  }, [result])

  const handleEngineChange = (engine: string) => {
    setConfig({ engine_type: engine, leverage: ENGINE_LEVERAGE_DEFAULTS[engine] ?? 1.0 })
  }

  const returnColor = !result ? 'var(--text-muted)' : result.total_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <div className="flex flex-col gap-1.5">
      {/* ── Command Bar ── */}
      <div
        className="flex items-center shrink-0 gap-2 px-3"
        style={{
          height: '52px',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '2px solid var(--accent-cyan)',
        }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-1.5 h-5 rounded-sm" style={{ backgroundColor: 'var(--accent-cyan)' }} />
          <span className="font-mono-data text-xs font-extrabold tracking-wider" style={{ color: 'var(--accent-cyan)' }}>BT</span>
        </div>

        <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        <div className="flex gap-1 shrink-0">
          {COMMANDS.map((cmd) => {
            const isActive = activeCommand === cmd.id
            return (
              <button
                key={cmd.id}
                onClick={() => setActiveCommand(cmd.id)}
                className="flex flex-col items-center justify-center uppercase font-bold font-mono-data cursor-pointer transition-colors rounded-sm"
                style={{
                  width: '60px', height: '40px',
                  backgroundColor: isActive ? `${cmd.color}20` : 'transparent',
                  color: isActive ? cmd.color : 'var(--text-muted)',
                  border: `1px solid ${isActive ? cmd.color : 'var(--border-color)'}`,
                  fontSize: '7px', letterSpacing: '0.3px',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = cmd.color; e.currentTarget.style.color = cmd.color } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
              >
                <span style={{ fontSize: '11px', lineHeight: 1.2 }}>{cmd.id === 'backtest' ? '\u25B6' : cmd.id === 'optimize' ? '\u2699' : '\u21BA'}</span>
                <span style={{ lineHeight: 1.2 }}>{cmd.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 shrink-0">
          <input value={config.tickers} onChange={e => setConfig({ tickers: e.target.value })} placeholder="SPY"
            className="font-mono-data text-[10px] font-bold outline-none px-2 py-1.5 rounded-sm"
            style={{ width: '90px', backgroundColor: 'var(--bg-card)', color: 'var(--accent-yellow)', border: '1px solid var(--border-color)' }} />
          <input type="date" value={config.start} onChange={e => setConfig({ start: e.target.value })}
            className="font-mono-data text-[10px] outline-none px-2 py-1.5 rounded-sm"
            style={{ width: '115px', backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
          <span className="font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <input type="date" value={config.end} onChange={e => setConfig({ end: e.target.value })}
            className="font-mono-data text-[10px] outline-none px-2 py-1.5 rounded-sm"
            style={{ width: '115px', backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
          <div className="flex items-center">
            <span className="font-mono-data text-[10px] font-bold mr-1" style={{ color: 'var(--accent-green)' }}>$</span>
            <input type="number" value={config.capital} onChange={e => setConfig({ capital: Number(e.target.value) })}
              className="font-mono-data text-[10px] font-bold outline-none px-2 py-1.5 rounded-sm"
              style={{ width: '80px', backgroundColor: 'var(--bg-card)', color: 'var(--accent-green)', border: '1px solid var(--border-color)' }} />
          </div>
        </div>

        <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

        <button onClick={() => setShowCache(!showCache)}
          className="font-mono-data text-[10px] cursor-pointer px-2 py-1.5 rounded-sm transition-colors"
          style={{
            background: showCache ? 'rgba(0,229,255,0.15)' : 'transparent',
            border: `1px solid ${showCache ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
            color: showCache ? 'var(--accent-cyan)' : 'var(--text-muted)',
          }}>
          <Settings size={11} className="inline mr-1" />
          ADV
        </button>

        <button onClick={run} disabled={running}
          className="flex items-center gap-1 font-mono-data text-[10px] font-bold cursor-pointer px-5 py-1.5 rounded-sm transition-all"
          style={{
            backgroundColor: 'var(--accent-cyan)', color: '#000', border: 'none',
            opacity: running ? 0.6 : 1,
            boxShadow: running ? 'none' : '0 0 10px rgba(0,229,255,0.4)',
          }}>
          {running ? <Loader size={11} className="animate-spin" /> : <Play size={11} />}
          {running ? 'RUNNING...' : 'RUN'}
        </button>
      </div>

      {showCache && <CacheStatsPanel />}

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-2 px-2 py-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <Badge label="BACKTEST" variant="info" />
        {(['run', 'compare'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="border-none font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer uppercase"
            style={{ color: tab === t ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: tab === t ? 700 : 400 }}>
            {t === 'run' ? 'RUN' : 'COMPARE'}
          </button>
        ))}
        <div className="flex-1" />
        <select value={config.strategy} onChange={e => setConfig({ strategy: e.target.value })}
          className="bg-card border border-default text-primary font-mono-data text-[10px] px-2 py-0.5 outline-none">
          <option value="hybrid">Hybrid</option><option value="quant">Quant</option><option value="ai">AI</option>
          <option value="sma_cross">SMA Cross</option><option value="momentum">Momentum</option><option value="mean_reversion">Mean Rev</option>
        </select>
        <select value={config.engine_type} onChange={e => handleEngineChange(e.target.value)}
          className="bg-card border border-default text-primary font-mono-data text-[10px] px-2 py-0.5 outline-none">
          {engines.length === 0 && <option value="default">Default</option>}
          {engines.map((e) => (<option key={e.id} value={e.id}>{e.label}</option>))}
        </select>
        <label className="flex items-center gap-1 font-mono-data text-[10px] text-muted">
          LEV
          <input type="number" min={0.5} max={10} step={0.5} value={config.leverage} onChange={e => setConfig({ leverage: Number(e.target.value) })}
            className="bg-card border border-default text-primary font-mono-data text-[10px] w-12 px-1 py-0.5 outline-none" />
        </label>
      </div>

      {tab === 'compare' ? (
        <StrategyComparison />
      ) : (
        <>
          {/* ── VBMetricsCards style ── */}
          {result && (
            <div className="flex gap-1.5 overflow-x-auto shrink-0 pb-0.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div
                className="flex flex-col justify-center gap-1 shrink-0"
                style={{
                  minWidth: '130px', padding: '10px 12px',
                  backgroundColor: 'var(--bg-card)', borderRadius: '3px',
                  borderLeft: `3px solid ${returnColor}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-data text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>RETURN</span>
                  {result && (
                    <span className="font-mono-data text-[8px] font-bold px-1 py-px rounded-sm" style={{ backgroundColor: 'rgba(0,214,111,0.2)', color: 'var(--accent-green)' }}>
                      DONE
                    </span>
                  )}
                </div>
                <div className="font-mono-data font-extrabold leading-tight" style={{ fontSize: '18px', color: returnColor }}>
                  {`${(result.total_return * 100).toFixed(2)}%`}
                </div>
                <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  ${config.capital.toLocaleString()} &rarr; ${(config.capital * (1 + result.total_return)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>

              <MetricsCard label="SHARPE" value={result.sharpe_ratio.toFixed(2)} sublabel="Risk-Adjusted" color={result.sharpe_ratio >= 1 ? 'var(--accent-green)' : result.sharpe_ratio >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="MAX DD" value={`${(result.max_drawdown * 100).toFixed(2)}%`} sublabel="Peak Decline" color="var(--accent-red)" />
              <MetricsCard label="WIN RATE" value={`${(result.win_rate * 100).toFixed(1)}%`} sublabel="Trade Success" color={result.win_rate > 0.5 ? 'var(--accent-green)' : result.win_rate > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="TRADES" value={String(result.total_trades)} sublabel="Executed" color="var(--accent-cyan)" />
              <MetricsCard label="P. FACTOR" value={result.profit_factor.toFixed(2)} sublabel="Profit/Loss" color={result.profit_factor > 1.5 ? 'var(--accent-green)' : result.profit_factor > 1 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="SORTINO" value={result.sortino_ratio.toFixed(2)} sublabel="Downside Risk" color={result.sortino_ratio >= 1 ? 'var(--accent-green)' : result.sortino_ratio >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="ANN. RET" value={`${(result.annualized_return * 100).toFixed(2)}%`} sublabel="Yearly" color={result.annualized_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
            </div>
          )}

          {error && (
            <div className="border font-mono-data text-[10px] px-2 py-1" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)' }}>
              {error}
            </div>
          )}

          {result && (
            <>
              <Card title="EQUITY CURVE">
                <EquityCurveChart
                  data={result.equity_curve.map((v, i) => {
                    const raw = result.timestamps[i] ?? ''
                    const datePart = raw.split(/[T ]/)[0]
                    return { time: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : String(i), value: v }
                  }).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.time))}
                  benchmark={benchmarkData.length > 0 ? benchmarkData : undefined}
                />
              </Card>

              <button onClick={clear} className="bg-none border font-mono-data text-[10px] px-3 py-0.5 cursor-pointer self-start"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                CLEAR RESULTS
              </button>
            </>
          )}

          {!result && !running && !error && (
            <div className="py-6 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Configure and run a backtest to see results
            </div>
          )}
        </>
      )}
    </div>
  )
}
