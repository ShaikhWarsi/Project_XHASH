import { useState, useRef, useEffect, useCallback } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData } from 'lightweight-charts'
import { Layers, Eye, EyeOff, Trash2, GripVertical, Activity, TrendingUp } from 'lucide-react'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'
import { AlternativeChartEngine, type AlternativeChartType } from '../components/chart/alternatives/AlternativeChartEngine'
import { DARK_THEME } from '../components/chart/ChartTheme'
import MultiTimeframeRibbon from '../components/MultiTimeframeRibbon'
import SpreadRatioChart from '../components/SpreadRatioChart'

interface CandleWithVolume extends CandlestickData {
  volume: number
}

type LayerType = 'candlestick' | 'line' | 'histogram' | 'indicator'

interface ChartLayer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  color: string
  series?: ISeriesApi<any>
}

type SidebarTab = 'layers' | 'ribbon' | 'spread'

const CHART_STYLES: { key: AlternativeChartType | 'candlestick'; label: string }[] = [
  { key: 'candlestick', label: 'CANDLE' },
  { key: 'heikin_ashi', label: 'HA' },
  { key: 'renko', label: 'RENKO' },
  { key: 'kagi', label: 'KAGI' },
  { key: 'range', label: 'RANGE' },
  { key: 'pnf', label: 'P&F' },
  { key: 'three_line_break', label: '3LB' },
]

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'BTC-USD', 'ETH-USD']
const DEFAULT_SYMBOL = 'SPY'

function barsToCandles(bars: BarData[]): CandleWithVolume[] {
  return bars.map((b) => ({
    time: b.time as any,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume ?? 0,
  }))
}

function HAtoCandleData(ha: { time: unknown; open: number; high: number; low: number; close: number }[]): CandleWithVolume[] {
  return ha.map((b) => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close, volume: 0 }))
}

export default function AdvancedCharts() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const engineRef = useRef(new AlternativeChartEngine())
  const [layers, setLayers] = useState<ChartLayer[]>([
    { id: 'price', name: 'Price', type: 'candlestick', visible: true, color: 'var(--accent-cyan)' },
    { id: 'volume', name: 'Volume', type: 'histogram', visible: true, color: 'var(--accent-blue)' },
    { id: 'sma20', name: 'SMA(20)', type: 'line', visible: true, color: 'var(--accent-green)' },
    { id: 'sma50', name: 'SMA(50)', type: 'line', visible: true, color: 'var(--accent-yellow)' },
  ])
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)
  const [showSymbolPicker, setShowSymbolPicker] = useState(false)
  const [candleData, setCandleData] = useState<CandleWithVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [chartType, setChartType] = useState<AlternativeChartType | 'candlestick'>('candlestick')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('layers')

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setFetchError('')
    fetchOHLCV(symbol, '1d', '6mo')
      .then((bars) => {
        if (!abort.signal.aborted) {
          if (bars && bars.length > 0) {
            setCandleData(barsToCandles(bars))
          } else {
            setFetchError('No data returned for ' + symbol)
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!abort.signal.aborted) { setFetchError('Failed to load data: ' + ((err as Error).message || 'Unknown error')); setLoading(false) }
      })
    return () => abort.abort()
  }, [symbol])

  const initChart = useCallback(() => {
    if (!containerRef.current || chartRef.current || candleData.length === 0) return
    const h = containerRef.current.clientHeight || 500
    const containerW = containerRef.current.clientWidth
    const styles = getComputedStyle(document.documentElement)
    const chartGrid = styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e'
    const accentBlue = styles.getPropertyValue('--accent-blue').trim() || '#3b82f6'
    const chartBorder = styles.getPropertyValue('--chart-border').trim() || '#2a2d3e'
    const accentGreen = styles.getPropertyValue('--accent-green').trim() || '#22c55e'
    const chart = createChart(containerRef.current, {
      width: containerW,
      height: h,
      layout: {
        background: { color: '#0a0e14' },
        textColor: '#5d6b7e',
      },
      grid: { vertLines: { color: chartGrid }, horzLines: { color: chartGrid } },
      crosshair: { vertLine: { color: accentBlue, width: 1, labelBackgroundColor: accentBlue }, horzLine: { color: accentBlue, width: 1, labelBackgroundColor: accentBlue } },
      timeScale: { borderColor: chartBorder, timeVisible: true },
      rightPriceScale: { borderColor: chartBorder },
    })
    chartRef.current = chart

    const isHA = chartType === 'heikin_ashi'
    const data = isHA ? HAtoCandleData(engineRef.current.convertToHeikinAshi(candleData)) : candleData

    const priceSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })
    priceSeries.setData(data)
    seriesRef.current.set('price', priceSeries)

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    volSeries.setData(data.map((d) => ({
      time: d.time,
      value: d.close > d.open ? d.volume : -d.volume,
      color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    })))
    seriesRef.current.set('volume', volSeries)

    const sma20Data: LineData[] = candleData.map((d, i) => {
      const vals = candleData.slice(Math.max(0, i - 19), i + 1).map((x) => x.close)
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      return { time: d.time, value: avg }
    })
    const sma20 = chart.addSeries(LineSeries, { color: accentGreen, lineWidth: 2 })
    sma20.setData(sma20Data.filter((d) => !isNaN(d.value)))
    seriesRef.current.set('sma20', sma20)

    const sma50Data: LineData[] = candleData.map((d, i) => {
      const vals = candleData.slice(Math.max(0, i - 49), i + 1).map((x) => x.close)
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      return { time: d.time, value: avg }
    })
    const sma50 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2 })
    sma50.setData(sma50Data.filter((d) => !isNaN(d.value)))
    seriesRef.current.set('sma50', sma50)

    chart.timeScale().fitContent()
  }, [candleData, chartType])

  const renderAlternative = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || candleData.length === 0) return
    const parent = canvas.parentElement
    if (!parent) return
    canvas.width = parent.clientWidth
    canvas.height = parent.clientHeight || 500
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const engine = engineRef.current
    const layout = { width: canvas.width, height: canvas.height, padding: { top: 20, bottom: 20, left: 50, right: 20 } }
    const plotW = canvas.width - layout.padding.left - layout.padding.right
    const plotH = canvas.height - layout.padding.top - layout.padding.bottom

    const closePrices = candleData.map(d => d.close)
    const minP = Math.min(...closePrices)
    const maxP = Math.max(...closePrices)
    const pad = (maxP - minP) * 0.05 || 1
    const prMin = minP - pad
    const prMax = maxP + pad

    const mapper = {
      timeToX: (t: unknown) => {
        const idx = candleData.findIndex(d => String(d.time) === String(t))
        return idx >= 0 ? layout.padding.left + (idx / Math.max(candleData.length - 1, 1)) * plotW : null
      },
      priceToY: (price: number) => layout.padding.top + (1 - (price - prMin) / (prMax - prMin)) * plotH,
    }

    ctx.fillStyle = '#0a0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (chartType === 'renko') {
      const bricks = engine.convertToRenko(candleData, 0.5)
      engine.renderRenko(ctx, bricks, layout, mapper, DARK_THEME)
    } else if (chartType === 'kagi') {
      const lines = engine.convertToKagi(candleData, 1)
      engine.renderKagi(ctx, lines, layout, mapper, DARK_THEME)
    } else if (chartType === 'range') {
      const bars = engine.convertToRange(candleData, 0.25)
      engine.renderRangeBars(ctx, bars, layout, mapper, DARK_THEME)
    } else if (chartType === 'heikin_ashi') {
      const ha = engine.convertToHeikinAshi(candleData)
      engine.renderHeikinAshi(ctx, ha, layout, mapper, { up: '#26a69a', down: '#ef5350' })
    } else if (chartType === 'pnf') {
      const cols = engine.convertToPointFigure(candleData, 0.5, 3)
      engine.renderPnF(ctx, cols, layout, mapper, { up: '#26a69a', down: '#ef5350' })
    } else if (chartType === 'three_line_break') {
      const lines = engine.convertToThreeLineBreak(candleData, 3)
      engine.renderThreeLineBreak(ctx, lines, layout, mapper, { up: '#26a69a', down: '#ef5350' })
    }
  }, [candleData, chartType])

  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) return
    if (chartType === 'candlestick' || chartType === 'heikin_ashi') {
      if (!chartRef.current) {
        initChart()
      }
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.display = 'none'
      }
      if (containerRef.current.querySelector('.tv-lightweight-charts')) {
        const el = containerRef.current.querySelector('.tv-lightweight-charts') as HTMLElement
        el.style.display = 'block'
      }
    } else {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current.clear()
      }
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.display = 'block'
        renderAlternative()
      }
    }
  }, [chartType, candleData, initChart, renderAlternative])

  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return
    if (chartType === 'heikin_ashi') {
      const ha = HAtoCandleData(engineRef.current.convertToHeikinAshi(candleData))
      const s = seriesRef.current.get('price')
      if (s) s.setData(ha)
      const v = seriesRef.current.get('volume')
      if (v) v.setData(ha.map((d) => ({ time: d.time, value: d.close > d.open ? 0 : 0, color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)' })))
    } else if (chartType === 'candlestick') {
      const s = seriesRef.current.get('price')
      if (s) s.setData(candleData)
      const v = seriesRef.current.get('volume')
      if (v) v.setData(candleData.map((d) => ({ time: d.time, value: d.close > d.open ? d.volume : -d.volume, color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)' })))
    }
  }, [chartType, candleData])

  useEffect(() => {
    for (const layer of layers) {
      const series = seriesRef.current.get(layer.id)
      if (series) {
        series.applyOptions({ visible: layer.visible })
      }
    }
  }, [layers])

  const toggleLayer = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
  }

  const removeLayer = (id: string) => {
    const series = seriesRef.current.get(id)
    if (series && chartRef.current) {
      chartRef.current.removeSeries(series)
      seriesRef.current.delete(id)
    }
    setLayers((prev) => prev.filter((l) => l.id !== id))
  }

  const createSeriesForLayer = useCallback((layer: ChartLayer, chart: IChartApi, data: CandleWithVolume[]) => {
    if (seriesRef.current.has(layer.id)) return
    if (data.length === 0) return
    const d = data[data.length - 1]
    let series: ISeriesApi<any> | undefined
    if (layer.type === 'candlestick') {
      series = chart.addSeries(CandlestickSeries, { upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' })
      series.setData(data)
    } else if (layer.type === 'histogram') {
      series = chart.addSeries(HistogramSeries, { color: layer.color, priceFormat: { type: 'volume' }, priceScaleId: `vol-${layer.id}` })
      series.setData(data.map((d) => ({ time: d.time, value: d.close > d.open ? d.volume : -d.volume, color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)' })))
    } else {
      series = chart.addSeries(LineSeries, { color: layer.color, lineWidth: 2 })
      const lineData: LineData[] = data.map((d) => ({ time: d.time, value: d.close }))
      series.setData(lineData)
    }
    if (series) seriesRef.current.set(layer.id, series)
  }, [])

  useEffect(() => {
    if (!chartRef.current || candleData.length === 0) return
    for (const layer of layers) {
      if (!seriesRef.current.has(layer.id)) {
        createSeriesForLayer(layer, chartRef.current, candleData)
      }
    }
  }, [layers, candleData, createSeriesForLayer])

  const addLayer = (type: LayerType) => {
    const colors = ['var(--accent-purple)', 'var(--accent-red)', 'var(--accent-cyan)', 'var(--accent-orange)', 'var(--accent-blue)']
    const color = colors[layers.length % colors.length]
    const names = { candlestick: 'Candle', line: 'Line', histogram: 'Histogram', indicator: 'Indicator' }
    const newLayer: ChartLayer = {
      id: `layer-${Date.now()}`, name: `${names[type]} ${layers.length + 1}`, type, visible: true, color,
    }
    if (chartRef.current && candleData.length > 0) {
      createSeriesForLayer(newLayer, chartRef.current, candleData)
    }
    setLayers((prev) => [...prev, newLayer])
  }

  const TABS: { key: SidebarTab; icon: typeof Layers; label: string }[] = [
    { key: 'layers', icon: Layers, label: 'LAYERS' },
    { key: 'ribbon', icon: Activity, label: 'RIBBON' },
    { key: 'spread', icon: TrendingUp, label: 'SPREAD' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', gap: 6, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 4, borderRight: '1px solid var(--border-color)', paddingRight: 6 }}>
        <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setSidebarTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                padding: '4px 2px', fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                background: sidebarTab === key ? 'var(--bg-hover)' : 'transparent',
                border: 'none', borderBottom: sidebarTab === key ? '2px solid var(--accent-green)' : '2px solid transparent',
                color: sidebarTab === key ? 'var(--accent-green)' : 'var(--text-muted)', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
              <Icon size={10} /> {label}
            </button>
          ))}
        </div>

        {sidebarTab === 'layers' && (
          <>
            <div className="relative">
              <button onClick={() => setShowSymbolPicker(!showSymbolPicker)}
                style={{
                  width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: 'var(--accent-cyan)', padding: '3px 6px', fontSize: 10, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", textAlign: 'left', borderRadius: 2,
                }}>
                {symbol}
              </button>
              {showSymbolPicker && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-color)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                  {SYMBOLS.map((s) => (
                    <button key={s} onClick={() => { setSymbol(s); setShowSymbolPicker(false) }}
                      style={{
                        width: '100%', padding: '3px 6px', background: symbol === s ? 'var(--bg-hover)' : 'none',
                        border: 'none', color: 'var(--text-primary)', fontSize: 10, cursor: 'pointer',
                        fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {CHART_STYLES.map(({ key, label }) => (
                <button key={key} onClick={() => setChartType(key)}
                  style={{
                    padding: '2px 5px', fontSize: 8, fontWeight: 600,
                    background: chartType === key ? 'var(--accent-blue)' : 'var(--bg-card)',
                    border: '1px solid var(--border-color)', borderRadius: 2,
                    color: chartType === key ? '#fff' : 'var(--text-primary)', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {layers.map((layer) => (
                <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 2, fontSize: 10 }}>
                  <GripVertical size={10} style={{ color: 'var(--text-muted)', cursor: 'grab' }} />
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: layer.color }} />
                  <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 10 }}>{layer.name}</span>
                  <span style={{ fontSize: 8, color: 'var(--text-muted)', marginRight: 4 }}>{layer.type}</span>
                  <button onClick={() => toggleLayer(layer.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: layer.visible ? 'var(--accent-green)' : 'var(--text-muted)', padding: 2 }}>
                    {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                  </button>
                  <button onClick={() => removeLayer(layer.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: 2 }}>
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(['candlestick', 'line', 'histogram'] as LayerType[]).map((type) => (
                  <button key={type} onClick={() => addLayer(type)}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 9, padding: '2px 6px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", borderRadius: 2 }}>
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {sidebarTab === 'ribbon' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Multi-Timeframe Ribbon</span>
            <MultiTimeframeRibbon symbol={symbol} />
          </div>
        )}

        {sidebarTab === 'spread' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spread / Ratio</span>
            <SpreadRatioChart />
          </div>
        )}
      </div>

      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>
        <div style={{ padding: '4px 8px', fontSize: 9, color: fetchError ? 'var(--accent-red)' : 'var(--text-muted)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          {fetchError || (candleData.length === 0 ? (loading ? 'Loading...' : 'No data available') : `${chartType.toUpperCase()} chart — ${symbol}`)}
        </div>
      </div>
    </div>
  )
}
