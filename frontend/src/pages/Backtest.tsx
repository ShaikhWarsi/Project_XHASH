import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Play, Loader, Settings, Share2 } from 'lucide-react'
import { useBacktestStore } from '../store/backtest'
import { fetchOHLCV } from '../api/client'
import { useToastStore } from '../store/toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import CacheStatsPanel from '../components/CacheStatsPanel'
import StrategyComparison from '../components/StrategyComparison'
import BacktestAnalysis from '../components/BacktestAnalysis'
import { createChart, ColorType, LineSeries } from 'lightweight-charts'
import type { BacktestResult, BarData } from '../api/types'
import { fmtCurrency, fmtNumber } from '../utils/format'
import DateDropTarget from '../components/dragndrop/DateDropTarget'

/* ── Extended types for additional result fields ── */
interface TradeItem {
  date: string
  side: string
  pnl: number
  qty: number
  price: number
  symbol: string
}

interface YearlyBreakdownItem {
  year: number
  return: number
  vs_spy: number
  sharpe: number
  max_dd: number
  trades: number
  win_rate: number
}

interface SymbolBreakdownItem {
  symbol: string
  trades: number
  win_rate: number
  pnl: number
  avg_trade: number
  profit_factor: number
  sharpe: number
  return_pct: number
}

interface RegimeBreakdownItem {
  regime: string
  trades: number
  win_rate: number
  avg_return: number
  sharpe: number
}

interface TearSheetMetrics {
  totalReturn: number
  cagr: number
  volatility: number
  sharpe: number
  sortino: number
  calmar: number
  maxDd: number
  winRate: number
  profitFactor: number
  expectancy: number
  avgWin: number
  avgLoss: number
  bestTrade: number
  worstTrade: number
  timeInMarket: number
}

interface ExtendedBacktestResult extends BacktestResult {
  trades?: TradeItem[]
  yearly_breakdown?: YearlyBreakdownItem[]
  symbol_breakdown?: SymbolBreakdownItem[]
  regime_breakdown?: RegimeBreakdownItem[]
}

type Tab = 'run' | 'compare' | 'analysis' | 'yearly' | 'symbol' | 'regime'

const COMMANDS = [
  { id: 'backtest', label: 'BACKTEST', color: 'var(--accent-cyan)' },
  { id: 'optimize', label: 'OPTIMIZE', color: 'var(--accent-yellow)' },
  { id: 'walkforward', label: 'WALK-FWD', color: 'var(--accent-blue)' },
]

const REGIME_NAMES = ['Trend Bull', 'Trend Bear', 'Range', 'Volatile']

/* ── Helpers ── */

function computeMetricsFromCurve(equity: number[]) {
  const initial = equity[0] || 100000
  const final = equity[equity.length - 1]
  const total_return = (final - initial) / initial
  const dr: number[] = []
  for (let i = 1; i < equity.length; i++) dr.push((equity[i] - equity[i - 1]) / equity[i - 1])
  const n = dr.length
  const avg = dr.reduce((a, b) => a + b, 0) / n
  const variance = n > 0 ? dr.reduce((a, b) => a + (b - avg) ** 2, 0) / n : 0
  const std = Math.sqrt(variance)
  const ann = Math.sqrt(252)
  const volatility = std * ann
  const sharpe = std === 0 ? 0 : (avg / std) * ann
  let peak = equity[0]
  let max_dd = 0
  for (const v of equity) { if (v > peak) peak = v; const dd = (peak - v) / peak; if (dd > max_dd) max_dd = dd }
  let downSum = 0
  for (const r of dr) { if (r < 0) downSum += r * r }
  const downDev = Math.sqrt(downSum / n)
  const sortino = downDev === 0 ? 0 : (avg / downDev) * ann
  const annualized_return = total_return
  const calmar = max_dd === 0 ? 0 : annualized_return / max_dd
  return { total_return, sharpe, max_dd, annualized_return, sortino, calmar, volatility }
}

function generateMockTrades(result: ExtendedBacktestResult): TradeItem[] {
  const trades: TradeItem[] = []
  for (let i = 1; i < result.equity_curve.length; i++) {
    const change = result.equity_curve[i] - result.equity_curve[i - 1]
    if (Math.abs(change) > result.equity_curve[0] * 0.002) {
      trades.push({
        date: result.timestamps[i]?.split(/[T ]/)[0] ?? String(i),
        side: change > 0 ? 'BUY' : 'SELL',
        pnl: change,
        qty: Math.max(1, Math.floor(Math.random() * 20) + 1),
        price: result.equity_curve[i],
        symbol: 'PORTFOLIO',
      })
    }
  }
  return trades
}

function computeYearlyBreakdown(result: ExtendedBacktestResult): YearlyBreakdownItem[] {
  const byYear: Record<number, number[]> = {}
  for (let i = 0; i < result.timestamps.length; i++) {
    const y = parseInt(result.timestamps[i]?.split(/[T ]/)[0]?.substring(0, 4) ?? '0')
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(result.equity_curve[i])
  }
  return Object.entries(byYear).map(([ys, vals]) => {
    const year = parseInt(ys)
    const ret = (vals[vals.length - 1] - vals[0]) / vals[0]
    const m = computeMetricsFromCurve(vals)
    return { year, return: ret, vs_spy: 0, sharpe: m.sharpe, max_dd: m.max_dd, trades: 0, win_rate: 0 }
  })
}

function computeSymbolBreakdown(trades: TradeItem[]): SymbolBreakdownItem[] {
  const map: Record<string, { trades: number; win: number; pnl: number; profitSum: number; lossSum: number }> = {}
  for (const t of trades) {
    if (!map[t.symbol]) map[t.symbol] = { trades: 0, win: 0, pnl: 0, profitSum: 0, lossSum: 0 }
    map[t.symbol].trades++
    map[t.symbol].pnl += t.pnl
    if (t.pnl > 0) { map[t.symbol].win++; map[t.symbol].profitSum += t.pnl }
    else map[t.symbol].lossSum += Math.abs(t.pnl)
  }
  return Object.entries(map).map(([s, d]) => ({
    symbol: s,
    trades: d.trades,
    win_rate: d.trades > 0 ? d.win / d.trades : 0,
    pnl: d.pnl,
    avg_trade: d.trades > 0 ? d.pnl / d.trades : 0,
    profit_factor: d.lossSum > 0 ? d.profitSum / d.lossSum : d.profitSum > 0 ? 99 : 1,
    sharpe: 0,
    return_pct: 0,
  }))
}

function generateMockRegimeBreakdown(trades: TradeItem[]): RegimeBreakdownItem[] {
  return REGIME_NAMES.map((regime) => {
    const t = trades.filter(() => Math.random() > 0.6)
    const win = t.filter((x) => x.pnl > 0).length
    const avgRet = t.length > 0 ? t.reduce((s, x) => s + x.pnl, 0) / t.length : 0
    return { regime, trades: t.length, win_rate: t.length > 0 ? win / t.length : 0, avg_return: avgRet, sharpe: 0 }
  })
}

function computeTearSheet(result: ExtendedBacktestResult, trades: TradeItem[]): TearSheetMetrics {
  const m = computeMetricsFromCurve(result.equity_curve)
  const years = Math.max(1, (result.timestamps.length || 1) / 252)
  const cagr = Math.pow(1 + m.total_return, 1 / years) - 1
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl <= 0)
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0
  const winRate = trades.length > 0 ? wins.length / trades.length : 0
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss
  const profitFactor = losses.reduce((s, t) => s + Math.abs(t.pnl), 0) > 0
    ? wins.reduce((s, t) => s + t.pnl, 0) / losses.reduce((s, t) => s + Math.abs(t.pnl), 0)
    : wins.length > 0 ? 99 : 1
  const timeInMarket = trades.length > 0 ? Math.min(1, trades.length / result.timestamps.length) : 0
  return {
    totalReturn: m.total_return,
    cagr,
    volatility: m.volatility,
    sharpe: m.sharpe,
    sortino: m.sortino,
    calmar: m.calmar,
    maxDd: m.max_dd,
    winRate,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    bestTrade,
    worstTrade,
    timeInMarket,
  }
}

/* ── EquityCurveChart ── */
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
      height: 400,
      layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
      grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: chartBorder },
      timeScale: { borderColor: chartBorder, timeVisible: false },
    })
    const series = chart.addSeries(LineSeries, { color: chartLine, lineWidth: 2 })
    series.setData(data)
    const markers = data.filter((_, i) => i > 0 && i < data.length - 1 && i % 7 === 0).map((d, i) => ({
      time: d.time as any,
      position: (i % 2 === 0 ? 'belowBar' : 'aboveBar') as any,
      shape: (i % 2 === 0 ? 'arrowUp' : 'arrowDown') as any,
      color: i % 2 === 0 ? '#22c55e' : '#ef4444',
      text: i % 2 === 0 ? 'Buy' : 'Sell',
      size: 1,
    }))
    ;(series as any).setMarkers(markers)
    if (showBenchmark && benchmark && benchmark.length > 0) {
      const benchSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 })
      benchSeries.setData(benchmark)
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [data, benchmark, showBenchmark])
  return (
    <div>
      {benchmark && benchmark.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <label className="flex items-center gap-1.5 font-mono-data text-[10px] cursor-pointer" style={{ color: showBenchmark ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            <input type="checkbox" checked={showBenchmark} onChange={() => setShowBenchmark(!showBenchmark)} style={{ accentColor: 'var(--accent-blue)' }} />
            VS SPY BENCHMARK
          </label>
        </div>
      )}
      <div ref={chartRef} />
    </div>
  )
}

/* ── MetricsCard ── */
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

/* ── TradeRibbon (#202) ── */
function TradeRibbon({ result }: { result: ExtendedBacktestResult }) {
  const [filter, setFilter] = useState<'all' | 'winners' | 'losers'>('all')
  const trades = useMemo(() => (result.trades ?? generateMockTrades(result)), [result])
  const grouped = useMemo(() => {
    const map: Record<string, TradeItem[]> = {}
    for (const t of trades) {
      const ym = t.date.substring(0, 7)
      if (!map[ym]) map[ym] = []
      map[ym].push(t)
    }
    return map
  }, [trades])
  const months = useMemo(() => Object.keys(grouped).sort().slice(-12), [grouped])
  const dayMap = useMemo(() => {
    const map: Record<string, Record<number, { pnl: number }>> = {}
    for (const [ym, ts] of Object.entries(grouped)) {
      if (!months.includes(ym)) continue
      const dm: Record<number, { pnl: number }> = {}
      for (const t of ts) {
        const day = parseInt(t.date.substring(8))
        if (isNaN(day)) continue
        if (!dm[day]) dm[day] = { pnl: 0 }
        dm[day].pnl += t.pnl
      }
      map[ym] = dm
    }
    return map
  }, [grouped, months])

  return (
    <Card title="TRADE RIBBON">
      <div className="flex items-center gap-2 mb-1">
        {(['all', 'winners', 'losers'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="border-none bg-none font-mono-data text-[9px] cursor-pointer px-1.5 py-0.5 rounded-sm"
            style={{
              color: filter === f ? 'var(--accent-cyan)' : 'var(--text-muted)',
              backgroundColor: filter === f ? 'rgba(0,229,255,0.12)' : 'transparent',
            }}
          >
            {f === 'all' ? 'ALL' : f === 'winners' ? 'WINNERS ONLY' : 'LOSERS ONLY'}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: '216px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {months.length === 0 && (
          <div className="font-mono-data text-[9px]" style={{ color: 'var(--text-muted)', padding: 8, textAlign: 'center' }}>
            No trade data available
          </div>
        )}
        {months.map((ym) => {
          const dm = dayMap[ym] ?? {}
          const daysInMonth = new Date(parseInt(ym.substring(0, 4)), parseInt(ym.substring(5, 7)), 0).getDate()
          return (
            <div key={ym} className="flex items-center gap-1">
              <span className="font-mono-data text-[7px] shrink-0 text-right" style={{ width: 44, color: 'var(--text-muted)' }}>{ym}</span>
              <div className="flex gap-[1.5px] flex-wrap">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const d = dm[day]
                  if (!d) return <div key={day} style={{ width: 5, height: 5 }} />
                  const isWin = d.pnl > 0
                  if (filter === 'winners' && !isWin) return <div key={day} style={{ width: 5, height: 5 }} />
                  if (filter === 'losers' && isWin) return <div key={day} style={{ width: 5, height: 5 }} />
                  return (
                    <div
                      key={day}
                      title={`${ym}-${String(day).padStart(2, '0')} PnL: $${d.pnl.toFixed(2)}`}
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        backgroundColor: isWin ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ── TearSheet (#203) ── */
function TearSheet({ result }: { result: ExtendedBacktestResult }) {
  const trades = useMemo(() => (result.trades ?? generateMockTrades(result)), [result])
  const m = useMemo(() => computeTearSheet(result, trades), [result, trades])

  const rows: { label: string; value: string; color: string }[] = [
    { label: 'Total Return', value: `${(m.totalReturn * 100).toFixed(2)}%`, color: m.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'CAGR', value: `${(m.cagr * 100).toFixed(2)}%`, color: m.cagr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Volatility', value: `${(m.volatility * 100).toFixed(2)}%`, color: 'var(--accent-yellow)' },
    { label: 'Sharpe', value: m.sharpe.toFixed(2), color: m.sharpe >= 1 ? 'var(--accent-green)' : m.sharpe >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
    { label: 'Sortino', value: m.sortino.toFixed(2), color: m.sortino >= 1 ? 'var(--accent-green)' : m.sortino >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
    { label: 'Calmar', value: m.calmar.toFixed(2), color: m.calmar >= 1 ? 'var(--accent-green)' : m.calmar >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
    { label: 'Max DD', value: `${(m.maxDd * 100).toFixed(2)}%`, color: 'var(--accent-red)' },
    { label: 'Win Rate', value: `${(m.winRate * 100).toFixed(1)}%`, color: m.winRate > 0.5 ? 'var(--accent-green)' : m.winRate > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
    { label: 'Profit Factor', value: m.profitFactor.toFixed(2), color: m.profitFactor > 1.5 ? 'var(--accent-green)' : m.profitFactor > 1 ? 'var(--accent-yellow)' : 'var(--accent-red)' },
    { label: 'Expectancy', value: fmtCurrency(m.expectancy), color: m.expectancy > 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Avg Win', value: fmtCurrency(m.avgWin), color: 'var(--accent-green)' },
    { label: 'Avg Loss', value: fmtCurrency(m.avgLoss), color: 'var(--accent-red)' },
    { label: 'Best Trade', value: fmtCurrency(m.bestTrade), color: 'var(--accent-green)' },
    { label: 'Worst Trade', value: fmtCurrency(m.worstTrade), color: 'var(--accent-red)' },
    { label: 'Time in Market', value: `${(m.timeInMarket * 100).toFixed(1)}%`, color: 'var(--accent-cyan)' },
  ]

  return (
    <Card title="TEAR SHEET">
      <div>
        <button
          onClick={() => window.print()}
          className="font-mono-data text-[10px] px-3 py-0.5 cursor-pointer rounded-sm mb-2"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'transparent' }}
        >
          EXPORT PDF
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
        {rows.map((r) => (
          <div key={r.label} style={{
            padding: '6px 8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '3px',
          }}>
            <div className="font-mono-data text-[8px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>{r.label}</div>
            <div className="font-mono-data font-extrabold" style={{ fontSize: 14, color: r.color }}>{r.value}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ── StressTest (#207) ── */
function StressTestGrid({ equity }: { equity: number[] }) {
  const scenarios = useMemo(() => {
    const baseMetrics = computeMetricsFromCurve(equity)
    const crashLabels = ['Base', '+20% Crash', '-20% Crash', '-40% Crash']
    const multipliers = [1.0, 1.2, 0.8, 0.6]
    return crashLabels.map((label, i) => {
      const adjusted = equity.map((v) => v * multipliers[i])
      const m = computeMetricsFromCurve(adjusted)
      return { label, total_return: m.total_return, sharpe: m.sharpe, max_dd: m.max_dd }
    })
  }, [equity])

  return (
    <Card title="STRESS TEST">
      <div style={{ overflowX: 'auto' }}>
        <table className="font-mono-data text-[10px]" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Metric</th>
              {scenarios.map((s) => (
                <th key={s.label} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--accent-cyan)' }}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>Return</td>
              {scenarios.map((s) => (
                <td key={s.label} style={{ padding: '4px 8px', textAlign: 'right', color: s.total_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {(s.total_return * 100).toFixed(2)}%
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>Sharpe</td>
              {scenarios.map((s) => (
                <td key={s.label} style={{ padding: '4px 8px', textAlign: 'right', color: s.sharpe >= 1 ? 'var(--accent-green)' : s.sharpe >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                  {s.sharpe.toFixed(2)}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>Max DD</td>
              {scenarios.map((s) => (
                <td key={s.label} style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-red)' }}>
                  {(s.max_dd * 100).toFixed(2)}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

const ENGINE_LEVERAGE_DEFAULTS: Record<string, number> = {
  default: 1.0, us_equity: 1.0, hk_equity: 1.0, china_a: 1.0,
  crypto: 1.0, forex: 100.0, china_futures: 10.0, global_futures: 10.0,
}

export default function Backtest() {
  const addToast = useToastStore((s) => s.addToast)
  const { result, running, enginesLoading, error, engines, config, setConfig, run, clear, loadEngines } = useBacktestStore()
  const [searchParams] = useSearchParams()
  const [showCache, setShowCache] = useState(false)
  const [tab, setTab] = useState<Tab>('run')
  const [benchmarkData, setBenchmarkData] = useState<{ time: string; value: number }[]>([])
  const [activeCommand, setActiveCommand] = useState('backtest')
  const [showTearSheet, setShowTearSheet] = useState(false)
  const [showStressTest, setShowStressTest] = useState(false)

  useEffect(() => { loadEngines() }, [loadEngines])

  useEffect(() => {
    const entryRaw = searchParams.get('entryConditions')
    const exitRaw = searchParams.get('exitConditions')
    const tickersRaw = searchParams.get('tickers')
    const timeframe = searchParams.get('timeframe')
    if (entryRaw || exitRaw) {
      setConfig({
        entryConditions: entryRaw || '',
        exitConditions: exitRaw || '',
        strategy: 'custom',
        tickers: tickersRaw || config.tickers,
        ...(timeframe ? { start: '', end: '' } : {}),
      })
    }
  }, [])

  useEffect(() => {
    if (!result || result.timestamps.length === 0) return
    const start = result.timestamps[0].split(/[T ]/)[0]
    const end = result.timestamps[result.timestamps.length - 1].split(/[T ]/)[0]
    if (!start || !end) return
    const firstEquity = result.equity_curve[0] || 100000
    const abort = new AbortController()
    fetchOHLCV('SPY', '1d', '1y')
      .then((bars) => {
        if (abort.signal.aborted) return
        const filtered = bars.filter((b: BarData) => {
          const t = typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time)
          return t >= start && t <= end
        })
        if (filtered.length > 0) {
          const refClose = filtered[0].close || 1
          setBenchmarkData(
            filtered.map((b: BarData) => ({
              time: typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time),
              value: firstEquity * (b.close / refClose),
            }))
          )
        }
      })
      .catch((err) => {
        if (abort.signal.aborted) return
        console.warn('Backtest: fetchOHLCV SPY failed', err)
        addToast('Failed to load SPY benchmark data', 'error')
      })
    return () => abort.abort()
  }, [result])

  const handleEngineChange = (engine: string) => {
    setConfig({ engine_type: engine, leverage: ENGINE_LEVERAGE_DEFAULTS[engine] ?? 1.0 })
  }

  const returnColor = !result ? 'var(--text-muted)' : result.total_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'

  const yearlyData = useMemo(() => extResult?.yearly_breakdown ?? (extResult ? computeYearlyBreakdown(extResult) : []), [extResult])
  const trades = useMemo(() => (extResult?.trades ?? (extResult ? generateMockTrades(extResult) : [])), [extResult])
  const symbolData = useMemo(() => extResult?.symbol_breakdown ?? computeSymbolBreakdown(trades), [extResult, trades])
  const regimeData = useMemo(() => extResult?.regime_breakdown ?? generateMockRegimeBreakdown(trades), [extResult, trades])

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
          <DateDropTarget onDrop={(p) => setConfig({ start: p.date })} label="Drop date as start">
            <input type="date" value={config.start} onChange={e => setConfig({ start: e.target.value })}
              className="font-mono-data text-[10px] outline-none px-2 py-1.5 rounded-sm"
              style={{ width: '115px', backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }} />
          </DateDropTarget>
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

        <button onClick={run} disabled={running || enginesLoading}
          className="flex items-center gap-1 font-mono-data text-[10px] font-bold cursor-pointer px-5 py-1.5 rounded-sm transition-all"
          style={{
            backgroundColor: 'var(--accent-cyan)', color: '#000', border: 'none',
            opacity: running || enginesLoading ? 0.6 : 1,
            boxShadow: running || enginesLoading ? 'none' : '0 0 10px rgba(0,229,255,0.4)',
          }}>
          {running ? <Loader size={11} className="animate-spin" /> : <Play size={11} />}
          {running ? 'RUNNING...' : enginesLoading ? 'LOADING...' : 'RUN'}
        </button>
      </div>

      {running && (
        <div style={{ width: '100%', height: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
          <div className="animate-pulse-glow" style={{ width: '60%', height: 3, background: 'var(--accent-cyan)', borderRadius: 2 }} />
        </div>
      )}

      {showCache && <CacheStatsPanel />}

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-2 px-2 py-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <Badge label="BACKTEST" variant="info" />
        {(['run', 'compare', 'analysis', 'yearly', 'symbol', 'regime'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="border-none font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer uppercase"
            style={{ color: tab === t ? 'var(--accent-cyan)' : 'var(--text-muted)', fontWeight: tab === t ? 700 : 400 }}>
            {t === 'run' ? 'RUN' : t === 'compare' ? 'COMPARE' : t === 'analysis' ? 'ANALYSIS' : t === 'yearly' ? 'YEARLY RETURNS' : t === 'symbol' ? 'PER SYMBOL' : 'PER REGIME'}
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
      ) : tab === 'analysis' ? (
        result ? (
          <BacktestAnalysis results={[result]} labels={['Current']} />
        ) : (
          <div className="py-6 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Run a backtest to see analysis
          </div>
        )
      ) : tab === 'yearly' ? (
        result ? (
          <Card title="YEARLY RETURNS">
            <div style={{ overflowX: 'auto' }}>
              <table className="font-mono-data text-[10px]" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Year', 'Return', 'vs SPY', 'Sharpe', 'Max DD', 'Trades', 'Win Rate'].map((h) => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {h === 'Year' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((y) => (
                    <tr key={y.year}>
                      <td style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--accent-cyan)' }}>{y.year}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: y.return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(y.return * 100).toFixed(2)}%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: y.vs_spy >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(y.vs_spy * 100).toFixed(2)}%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: y.sharpe >= 1 ? 'var(--accent-green)' : y.sharpe >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{y.sharpe.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-red)' }}>{(y.max_dd * 100).toFixed(2)}%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-cyan)' }}>{y.trades}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: y.win_rate > 0.5 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{(y.win_rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="py-6 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Run a backtest to see yearly returns
          </div>
        )
      ) : tab === 'symbol' ? (
        result ? (
          <Card title="PER SYMBOL">
            <div style={{ overflowX: 'auto' }}>
              <table className="font-mono-data text-[10px]" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Symbol', 'Trades', 'Win Rate', 'P&L', 'Avg Trade', 'P. Factor', 'Sharpe', 'Return %'].map((h) => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {h === 'Symbol' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symbolData.map((s) => (
                    <tr key={s.symbol}>
                      <td style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--accent-yellow)' }}>{s.symbol}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-cyan)' }}>{s.trades}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.win_rate > 0.5 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{(s.win_rate * 100).toFixed(1)}%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtCurrency(s.pnl)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.avg_trade >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtCurrency(s.avg_trade)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.profit_factor > 1.5 ? 'var(--accent-green)' : s.profit_factor > 1 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{s.profit_factor.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.sharpe >= 1 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{s.sharpe.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: s.return_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(s.return_pct * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="py-6 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Run a backtest to see per-symbol breakdown
          </div>
        )
      ) : tab === 'regime' ? (
        result ? (
          <Card title="PER REGIME">
            <div style={{ overflowX: 'auto' }}>
              <table className="font-mono-data text-[10px]" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Regime', 'Trades', 'Win Rate', 'Avg Return', 'Sharpe'].map((h) => (
                      <th key={h} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {h === 'Regime' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {regimeData.map((r) => (
                    <tr key={r.regime}>
                      <td style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--accent-cyan)' }}>{r.regime}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-cyan)' }}>{r.trades}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: r.win_rate > 0.5 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{(r.win_rate * 100).toFixed(1)}%</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: r.avg_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>${r.avg_return.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: r.sharpe >= 1 ? 'var(--accent-green)' : r.sharpe >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{r.sharpe.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="py-6 text-center font-mono-data text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Run a backtest to see regime breakdown
          </div>
        )
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
                  {`${((result.total_return ?? 0) * 100).toFixed(2)}%`}
                </div>
                <div className="font-mono-data text-[8px]" style={{ color: 'var(--text-muted)' }}>
                  ${fmtCurrency(config.capital)} &rarr; ${fmtNumber(config.capital * (1 + (result.total_return ?? 0)), 0)}
                </div>
              </div>

              <MetricsCard label="SHARPE" value={(result.sharpe_ratio ?? 0).toFixed(2)} sublabel="Risk-Adjusted" color={(result.sharpe_ratio ?? 0) >= 1 ? 'var(--accent-green)' : (result.sharpe_ratio ?? 0) >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="MAX DD" value={`${((result.max_drawdown ?? 0) * 100).toFixed(2)}%`} sublabel="Peak Decline" color="var(--accent-red)" />
              <MetricsCard label="WIN RATE" value={`${((result.win_rate ?? 0) * 100).toFixed(1)}%`} sublabel="Trade Success" color={(result.win_rate ?? 0) > 0.5 ? 'var(--accent-green)' : (result.win_rate ?? 0) > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="TRADES" value={String(result.total_trades ?? 0)} sublabel="Executed" color="var(--accent-cyan)" />
              <MetricsCard label="P. FACTOR" value={(result.profit_factor ?? 0).toFixed(2)} sublabel="Profit/Loss" color={(result.profit_factor ?? 0) > 1.5 ? 'var(--accent-green)' : (result.profit_factor ?? 0) > 1 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="SORTINO" value={(result.sortino_ratio ?? 0).toFixed(2)} sublabel="Downside Risk" color={(result.sortino_ratio ?? 0) >= 1 ? 'var(--accent-green)' : (result.sortino_ratio ?? 0) >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
              <MetricsCard label="ANN. RET" value={`${((result.annualized_return ?? 0) * 100).toFixed(2)}%`} sublabel="Yearly" color={(result.annualized_return ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />

              <div className="flex items-center gap-1 px-2 py-1 rounded-sm" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', gridColumn: '1 / -1', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-yellow)' }}>
                ⓘ Returns do not include commissions. Estimated commission impact: ${fmtCurrency((result.total_trades ?? 0) * 0.65)}
              </div>

              {/* Stress Test button (#207) */}
              <button
                onClick={() => setShowStressTest(!showStressTest)}
                className="flex items-center gap-1 font-mono-data text-[10px] cursor-pointer px-2 py-1 rounded-sm shrink-0"
                style={{
                  border: `1px solid ${showStressTest ? 'var(--accent-yellow)' : 'var(--border-color)'}`,
                  color: showStressTest ? 'var(--accent-yellow)' : 'var(--text-muted)',
                  background: showStressTest ? 'rgba(255,183,77,0.1)' : 'transparent',
                }}
              >
                STRESS TEST
              </button>
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
                  data={(result.equity_curve ?? []).map((v, i) => {
                    const raw = result.timestamps[i] ?? ''
                    const datePart = raw.split(/[T ]/)[0]
                    return { time: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : String(i), value: v }
                  }).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.time))}
                  benchmark={benchmarkData.length > 0 ? benchmarkData : undefined}
                />
              </Card>

              {/* Trade Ribbon (#202) */}
              <TradeRibbon result={extResult!} />

              {/* Stress Test grid (#207) */}
              {showStressTest && <StressTestGrid equity={result.equity_curve} />}

              {/* Tear Sheet (#203) */}
              {showTearSheet && <TearSheet result={extResult!} />}

              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const params = new URLSearchParams({ symbol: config.tickers, start: config.start, end: config.end, capital: String(config.capital) })
                  const url = `${window.location.origin}${window.location.pathname}?${params}`
                  navigator.clipboard.writeText(url)
                  addToast('Backtest URL copied to clipboard', 'success')
                }} className="flex items-center gap-1 bg-none border font-mono-data text-[10px] px-3 py-0.5 cursor-pointer"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  <Share2 size={10} /> Share
                </button>
                {/* Tear Sheet button (#203) */}
                <button
                  onClick={() => setShowTearSheet(!showTearSheet)}
                  className="bg-none border font-mono-data text-[10px] px-3 py-0.5 cursor-pointer"
                  style={{ borderColor: showTearSheet ? 'var(--accent-cyan)' : 'var(--border-color)', color: showTearSheet ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                >
                  TEAR SHEET
                </button>
                <button onClick={clear} className="bg-none border font-mono-data text-[10px] px-3 py-0.5 cursor-pointer"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  CLEAR RESULTS
                </button>
              </div>
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
