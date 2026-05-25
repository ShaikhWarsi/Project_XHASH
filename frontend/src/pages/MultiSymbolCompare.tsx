import { useState, useEffect, useCallback } from 'react'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/Spinner'
import { createChart, ColorType, LineSeries, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

function ComparisonChart({ series, showCandles }: { series: { symbol: string; data: { time: string; value: number }[]; candles?: { time: string; open: number; high: number; low: number; close: number; volume: number }[]; color: string }[]; showCandles: boolean }) {
  const chartRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!chartRef.current || series.length === 0) return
    const styles = getComputedStyle(document.documentElement)
    const chartBg = styles.getPropertyValue('--chart-bg').trim() || '#1e2235'
    const chartText = styles.getPropertyValue('--chart-text').trim() || '#9aa0a6'
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e'
    const chartBorder = styles.getPropertyValue('--chart-border').trim() || '#2a2d3e'
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
      const volSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' })
      chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
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

import { useRef } from 'react'

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

export default function MultiSymbolCompare() {
  const [symbols, setSymbols] = useState<string[]>(['AAPL', 'MSFT', 'GOOGL'])
  const [inputValue, setInputValue] = useState('')
  const [dataMap, setDataMap] = useState<Record<string, BarData[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [interval, setInterval] = useState('1d')
  const [range, setRange] = useState('6mo')
  const [normalize, setNormalize] = useState(true)
  const [showCandles, setShowCandles] = useState(false)

  const loadData = useCallback(async () => {
    if (symbols.length === 0) return
    setLoading(true)
    setError('')
    const results: Record<string, BarData[]> = {}
    for (const sym of symbols) {
      try {
        results[sym] = await fetchOHLCV(sym, interval, range)
      } catch {
        setError((prev) => `${prev}Failed to load ${sym}. `)
      }
    }
    setDataMap(results)
    setLoading(false)
  }, [symbols, interval, range])

  useEffect(() => { loadData() }, [loadData])

  const addSymbol = () => {
    const sym = inputValue.trim().toUpperCase()
    if (sym && !symbols.includes(sym)) {
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
          time: typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time),
          value: b.close / firstClose,
        })),
      candles: i === 0 ? bars.filter((b) => b.time).map((b) => ({
        time: typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0,
      })) : undefined,
    }
  })

  const metrics = symbols.map((sym) => {
    const bars = dataMap[sym] || []
    if (bars.length < 2) return { symbol: sym, return: 0, vol: 0, min: 0, max: 0 }
    const closes = bars.map((b) => b.close)
    const ret = (closes[closes.length - 1] / closes[0]) - 1
    const dailyReturns = closes.slice(1).map((c, i) => (c / closes[i]) - 1)
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length
    const vol = Math.sqrt(variance * 252)
    return { symbol: sym, return: ret, vol, min: Math.min(...closes), max: Math.max(...closes) }
  })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-lg font-bold text-primary">Multi-Symbol Comparison</h1>
        <p className="text-xs font-mono text-muted">Compare performance across tickers</p>
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
        </div>
        <select value={interval} onChange={(e) => setInterval(e.target.value)}
          className="bg-input border border-input text-primary font-mono-data text-[10px] px-1.5 py-1 outline-none rounded-sm">
          <option value="1d">Daily</option>
          <option value="1wk">Weekly</option>
          <option value="1mo">Monthly</option>
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

      <Card title="Metrics">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-1">
          {metrics.map((m) => (
            <div key={m.symbol} className="bg-card border border-default rounded-sm px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[symbols.indexOf(m.symbol) % COLORS.length] }} />
                <span className="font-mono-data text-[11px] font-semibold text-primary">{m.symbol}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <span className="text-[9px] font-mono-data text-muted">Return</span>
                <span className={`text-[10px] font-mono-data font-bold text-right ${m.return >= 0 ? 'text-up' : 'text-down'}`}>
                  {(m.return * 100).toFixed(2)}%
                </span>
                <span className="text-[9px] font-mono-data text-muted">Ann. Vol</span>
                <span className="text-[10px] font-mono-data font-bold text-right text-primary">
                  {(m.vol * 100).toFixed(2)}%
                </span>
                <span className="text-[9px] font-mono-data text-muted">Range</span>
                <span className="text-[10px] font-mono-data font-bold text-right text-primary">
                  ${m.min.toFixed(2)} - ${m.max.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
