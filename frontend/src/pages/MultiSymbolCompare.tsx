import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'
import Card from '../components/ui/Card'

import Spinner from '../components/Spinner'
import { createChart, ColorType, LineSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

const MAX_SYMBOLS = 8

function ComparisonChart({ series, showCandles }: { series: { symbol: string; data: { time: string; value: number }[]; candles?: { time: string; open: number; high: number; low: number; close: number; volume: number }[]; color: string }[]; showCandles: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!chartRef.current || !series || series.length === 0) return
    const styles = getComputedStyle(document.documentElement)
    const chartBg = styles.getPropertyValue('--chart-bg').trim() || '#1e2235'
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e'
    const chartBorder = styles.getPropertyValue('--chart-border').trim() || '#2a2d3e'
    const chartText = styles.getPropertyValue('--chart-text').trim() || '#d1d4dc'
    const chart = createChart(chartRef.current, {
      height: 300,
      layout: { background: { type: ColorType.Solid, color: chartBg }, textColor: chartText },
      grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
      rightPriceScale: { borderColor: chartBorder },
      timeScale: { borderColor: chartBorder },
    })
    if (showCandles && series[0]?.candles) {
      const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#26a69a', downColor: '#ef5350' })
      candleSeries.setData(series[0].candles as any)
      const volData = series[0].candles.map((c) => ({ time: c.time, value: c.close > c.open ? c.volume : -c.volume, color: c.close > c.open ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)' }))
      const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      volSeries.setData(volData)
    } else {
      series.forEach((s) => {
        chart.addSeries(LineSeries, { color: s.color, lineWidth: 2 }).setData(s.data)
      })
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [series, showCandles])
  return <div ref={chartRef} />
}

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

export default function MultiSymbolCompare() {
  const [symbols, setSymbols] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY'])
  const [inputValue, setInputValue] = useState('')
  const [dataMap, setDataMap] = useState<Record<string, BarData[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interval, setIntervalState] = useState('1d')
  const [range, setRange] = useState('6mo')
  const [normalize, setNormalize] = useState(true)
  const [showCandles, setShowCandles] = useState(false)

  const loadData = useCallback(async () => {
    if (symbols.length === 0) return
    setLoading(true)
    setError('')
    const entries = await Promise.allSettled(
      symbols.map(async (sym) => ({ sym, data: await fetchOHLCV(sym, interval, range) }))
    )
    const results: Record<string, BarData[]> = {}
    for (const entry of entries) {
      if (entry.status === 'fulfilled') {
        results[entry.value.sym] = entry.value.data
      } else {
        setError((prev) => `${prev}Failed to load. `)
      }
    }
    setDataMap(results)
    setLoading(false)
  }, [symbols, interval, range])

  useEffect(() => { loadData() }, [loadData])

  const addSymbol = () => {
    const sym = inputValue.trim().toUpperCase()
    if (sym && !symbols.includes(sym)) {
      if (symbols.length >= MAX_SYMBOLS) return
      setSymbols((prev) => [...prev, sym])
      setInputValue('')
    }
  }

  const removeSymbol = (sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym))
  }

  const chartSeries = symbols.map((sym, i) => {
    const bars = dataMap[sym] || []
    if (bars.length === 0) return { symbol: sym, data: [], color: COLORS[i % COLORS.length] }
    const firstClose = normalize ? (bars[0]?.close || 1) : 1
    return {
      symbol: sym,
      color: COLORS[i % COLORS.length],
      data: bars
        .filter((b) => b.time)
        .map((b) => ({
          time: b.time as any,
          value: b.close / firstClose,
        })),
      candles: i === 0 ? bars.filter((b) => b.time).map((b) => ({
        time: b.time as any,
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0,
      })) : undefined,
    }
  })

  const metrics = symbols.map((sym) => {
    const bars = dataMap[sym] || []
    if (bars.length < 2) return { symbol: sym, return: 0, vol: 0, min: 0, max: 0, sharpe: 0 }
    const closes = bars.map((b) => b.close)
    const ret = (closes[closes.length - 1] / closes[0]) - 1
    const dailyReturns = closes.slice(1).map((c, i) => (c / closes[i]) - 1)
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length
    const vol = Math.sqrt(variance * 252)
    const sharpe = vol > 0 ? mean / Math.sqrt(variance) * Math.sqrt(252) : 0
    return { symbol: sym, return: ret, vol, min: Math.min(...closes), max: Math.max(...closes), sharpe }
  })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-lg font-bold text-primary">Multi-Symbol Comparison</h1>
        <p className="text-xs font-mono text-muted">Compare performance across tickers (max {MAX_SYMBOLS})</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 flex-1">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
            placeholder="Add symbol..."
            className="bg-input border border-input text-primary font-mono-data text-[11px] px-2 py-1 outline-none rounded-sm w-32"
          />
          <button onClick={addSymbol} className="bg-accent-cyan text-black font-mono-data text-[10px] px-2 py-1 rounded-sm cursor-pointer border-none">
            Add
          </button>
          <span className="font-mono-data text-[9px] text-muted self-center">{symbols.length}/{MAX_SYMBOLS}</span>
        </div>
        <select value={interval} onChange={(e) => setIntervalState(e.target.value)}
          className="bg-input border border-input text-primary font-mono-data text-[10px] px-1.5 py-1 outline-none rounded-sm">
          <option value="1d">Daily</option>
          <option value="7d">Weekly</option>
          <option value="30d">Monthly</option>
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)}
          className="bg-input border border-input text-primary font-mono-data text-[10px] px-1.5 py-1 outline-none rounded-sm">
          <option value="1mo">1 Month</option>
          <option value="3mo">3 Months</option>
          <option value="6mo">6 Months</option>
          <option value="1y">1 Year</option>
        </select>
        <label className="flex items-center gap-1 text-[10px] font-mono-data text-muted cursor-pointer">
          <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="accent-accent-cyan" />
          Normalize
        </label>
        <label className="flex items-center gap-1 text-[10px] font-mono-data text-muted cursor-pointer">
          <input type="checkbox" checked={showCandles} onChange={(e) => setShowCandles(e.target.checked)} className="accent-accent-cyan" />
          Candles
        </label>
        <button onClick={loadData} disabled={loading}
          className="bg-accent-cyan text-black font-mono-data text-[10px] px-2 py-1 rounded-sm cursor-pointer disabled:opacity-50 border-none">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="text-[10px] font-mono-data text-down px-2 py-1 rounded-sm" style={{ background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {symbols.map((sym, i) => (
          <div key={sym} className="flex items-center gap-1 bg-card border border-default rounded-sm px-2 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="font-mono-data text-[11px] text-primary">{sym}</span>
            <button onClick={() => removeSymbol(sym)} className="text-muted text-[10px] cursor-pointer bg-transparent border-none ml-1">✕</button>
          </div>
        ))}
      </div>

      <Card title="Normalized Performance">
        {loading ? (
          <div className="flex items-center justify-center py-4"><Spinner label="Loading data..." /></div>
        ) : chartSeries.some((s) => s.data.length > 0) ? (
          <ComparisonChart series={chartSeries.filter((s) => s.data.length > 0)} showCandles={showCandles} />
        ) : (
          <div className="text-[11px] font-mono-data text-muted text-center py-4">No data available</div>
        )}
      </Card>

      <Card title="Metrics Comparison">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono-data text-[10px]">
            <thead>
              <tr className="text-muted" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left py-1.5 pr-3 font-semibold">Symbol</th>
                <th className="text-right py-1.5 pr-3 font-semibold">Return</th>
                <th className="text-right py-1.5 pr-3 font-semibold">Ann. Vol</th>
                <th className="text-right py-1.5 pr-3 font-semibold">Sharpe</th>
                <th className="text-right py-1.5 pr-3 font-semibold">Low</th>
                <th className="text-right py-1.5 font-semibold">High</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.symbol} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="py-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="font-semibold text-primary">{m.symbol}</span>
                    </div>
                  </td>
                  <td className={`py-1 pr-3 text-right font-bold ${m.return >= 0 ? 'text-up' : 'text-down'}`}>{(m.return * 100).toFixed(2)}%</td>
                  <td className="py-1 pr-3 text-right text-primary">{(m.vol * 100).toFixed(2)}%</td>
                  <td className="py-1 pr-3 text-right font-bold" style={{ color: m.sharpe > 1 ? 'var(--accent-green)' : m.sharpe > 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                    {m.sharpe.toFixed(2)}
                  </td>
                  <td className="py-1 pr-3 text-right text-muted">${m.min.toFixed(2)}</td>
                  <td className="py-1 text-right text-muted">${m.max.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
