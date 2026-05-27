import { useState, useRef, useEffect, useCallback } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData } from 'lightweight-charts'
import { Layers, Eye, EyeOff, Trash2, GripVertical, Search } from 'lucide-react'
import { fetchQuotes } from '../api/client'

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

const FONT = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'BTC-USD', 'ETH-USD']
const DEFAULT_SYMBOL = 'SPY'

function generateDemoData(bars = 150): CandleWithVolume[] {
  const data: CandleWithVolume[] = []
  let t = Math.floor(Date.now() / 1000) - bars * 86400
  let close = 450 + Math.random() * 50
  for (let i = 0; i < bars; i++) {
    t += 86400
    const change = (Math.random() - 0.48) * close * 0.025
    const open = close
    close = open + change
    const high = Math.max(open, close) + Math.random() * Math.abs(change) * 1.5
    const low = Math.min(open, close) - Math.random() * Math.abs(change) * 1.5
    data.push({ time: t as any, open, high, low, close, volume: Math.floor(Math.random() * 50000000 + 5000000) })
  }
  return data
}

const CANDLE_DATA = generateDemoData()

export default function AdvancedCharts() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map())
  const [layers, setLayers] = useState<ChartLayer[]>([
    { id: 'price', name: 'Price', type: 'candlestick', visible: true, color: 'var(--accent-cyan)' },
    { id: 'volume', name: 'Volume', type: 'histogram', visible: true, color: 'var(--accent-blue)' },
    { id: 'sma20', name: 'SMA(20)', type: 'line', visible: true, color: 'var(--accent-green)' },
    { id: 'sma50', name: 'SMA(50)', type: 'line', visible: true, color: 'var(--accent-yellow)' },
  ])
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)
  const [showSymbolPicker, setShowSymbolPicker] = useState(false)

  const initChart = useCallback(() => {
    if (!containerRef.current || chartRef.current) return
    const h = containerRef.current.clientHeight || 500
    const containerW = containerRef.current.clientWidth
    const chart = createChart(containerRef.current, {
      width: containerW,
      height: h,
      layout: {
        background: { color: '#0a0e14' },
        textColor: '#5d6b7e',
      },
      grid: { vertLines: { color: 'var(--chart-grid)' }, horzLines: { color: 'var(--chart-grid)' } },
      crosshair: { vertLine: { color: 'var(--accent-blue)', width: 1, labelBackgroundColor: 'var(--accent-blue)' }, horzLine: { color: 'var(--accent-blue)', width: 1, labelBackgroundColor: 'var(--accent-blue)' } },
      timeScale: { borderColor: 'var(--chart-border)', timeVisible: true },
      rightPriceScale: { borderColor: 'var(--chart-border)' },
    })
    chartRef.current = chart

    const priceSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    })
    priceSeries.setData(CANDLE_DATA)
    seriesRef.current.set('price', priceSeries)

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    volSeries.setData(CANDLE_DATA.map((d) => ({
      time: d.time,
      value: d.close > d.open ? d.volume : -d.volume,
      color: d.close > d.open ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)',
    })))
    seriesRef.current.set('volume', volSeries)

    const sma20Data: LineData[] = CANDLE_DATA.map((d, i) => {
      const vals = CANDLE_DATA.slice(Math.max(0, i - 19), i + 1).map((x) => x.close)
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      return { time: d.time, value: avg }
    })
    const sma20 = chart.addSeries(LineSeries, { color: 'var(--accent-green)', lineWidth: 2 })
    sma20.setData(sma20Data.filter((d) => !isNaN(d.value)))
    seriesRef.current.set('sma20', sma20)

    const sma50Data: LineData[] = CANDLE_DATA.map((d, i) => {
      const vals = CANDLE_DATA.slice(Math.max(0, i - 49), i + 1).map((x) => x.close)
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      return { time: d.time, value: avg }
    })
    const sma50 = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2 })
    sma50.setData(sma50Data.filter((d) => !isNaN(d.value)))
    seriesRef.current.set('sma50', sma50)

    chart.timeScale().fitContent()
  }, [])

  useEffect(() => {
    initChart()
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const h = containerRef.current.clientHeight || 500
        chartRef.current.resize(containerRef.current.clientWidth, h)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current.clear()
    }
  }, [initChart])

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

  const addLayer = (type: LayerType) => {
    const colors = ['var(--accent-purple)', 'var(--accent-red)', 'var(--accent-cyan)', 'var(--accent-orange)', 'var(--accent-blue)']
    const color = colors[layers.length % colors.length]
    const names = { candlestick: 'Candle', line: 'Line', histogram: 'Histogram', indicator: 'Indicator' }
    setLayers((prev) => [
      ...prev,
      { id: `layer-${Date.now()}`, name: `${names[type]} ${prev.length + 1}`, type, visible: true, color },
    ])
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 6, fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 4, borderRight: '1px solid var(--border-color)', paddingRight: 6 }}>
        <div className="flex items-center gap-1 mb-1">
          <Layers size={12} style={{ color: 'var(--accent-green)' }} />
          <span style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: 10, textTransform: 'uppercase' }}>LAYERS</span>
        </div>

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
        <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['candlestick', 'line', 'histogram'] as LayerType[]).map((type) => (
            <button key={type} onClick={() => addLayer(type)}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: 9, padding: '2px 6px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", borderRadius: 2 }}>
              + {type}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
        <div style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          Multi-layer chart compositing — toggle layers on/off, add indicators
        </div>
      </div>
    </div>
  )
}
