import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import Card from '../components/ui/Card'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchOHLCV } from '../api/historify'
import { ArrowLeft, BarChart3 } from 'lucide-react'

const TIMEFRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1d' },
]

export default function HistorifyCharts() {
  const addToast = useToastStore((s) => s.addToast)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const params = new URLSearchParams(window.location.search)
  const [symbol, setSymbol] = useState(params.get('symbol') || 'RELIANCE')
  const [exchange, setExchange] = useState(params.get('exchange') || 'NSE')
  const [timeframe, setTimeframe] = useState(params.get('timeframe') || '1d')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!symbol) return
    setLoading(true)
    try {
      const res: any = await fetchOHLCV(symbol, exchange, timeframe)
      setData(res.data || [])
    } catch (err: any) {
      addToast(`Failed to load chart data: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [symbol, exchange, timeframe])

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const container = containerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 480,
      layout: {
        background: { color: 'transparent' },
        textColor: '#a0a0a0',
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: '#1a2a3a' },
        horzLines: { color: '#1a2a3a' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#4a7a9a', width: 1, style: 2, labelBackgroundColor: '#2a4a6a' },
        horzLine: { color: '#4a7a9a', width: 1, style: 2, labelBackgroundColor: '#2a4a6a' },
      },
      timeScale: {
        borderColor: '#2a3a4a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a3a4a',
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.point) {
        const dataVal = param.seriesData.get(candleSeries) as any
        const volVal = param.seriesData.get(volumeSeries) as any
        if (dataVal) {
          const tooltip = document.getElementById('chart-tooltip')
          if (tooltip) {
            tooltip.style.display = 'block'
            tooltip.style.left = `${param.point.x + 10}px`
            tooltip.style.top = `${param.point.y - 40}px`
            tooltip.innerHTML = `
              <div style="font-size:9px;font-family:'JetBrains Mono',monospace">
                O: ${dataVal.open.toFixed(2)} H: ${dataVal.high.toFixed(2)}<br/>
                L: ${dataVal.low.toFixed(2)} C: ${dataVal.close.toFixed(2)}<br/>
                V: ${volVal ? volVal.value.toFixed(0) : '-'}
              </div>
            `
          }
        }
      } else {
        const tooltip = document.getElementById('chart-tooltip')
        if (tooltip) tooltip.style.display = 'none'
      }
    })

    const candles = data.map((d) => ({
      time: (new Date(d.timestamp).getTime() / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    const volumes = data.map((d) => ({
      time: (new Date(d.timestamp).getTime() / 1000) as any,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)',
    }))

    candleSeries.setData(candles)
    volumeSeries.setData(volumes)

    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [data])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <a href="/openalgo/historify" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            <Button variant="ghost" size="sm"><ArrowLeft size={12} /> Back</Button>
          </a>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
            <BarChart3 size={12} className="inline mr-1" /> {symbol} / {exchange}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select options={TIMEFRAMES} value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
        </div>
      </div>

      <Card padding="none">
        <div style={{ position: 'relative' }}>
          {loading ? (
            <Skeleton height={480} variant="rect" />
          ) : data.length > 0 ? (
            <>
              <div ref={containerRef} style={{ width: '100%', height: 480 }} />
              <div
                id="chart-tooltip"
                style={{
                  display: 'none',
                  position: 'absolute',
                  pointerEvents: 'none',
                  background: 'rgba(15,25,35,0.9)',
                  border: '1px solid #2a3a4a',
                  borderRadius: 4,
                  padding: '6px 10px',
                  zIndex: 100,
                }}
              />
            </>
          ) : (
            <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
              No data available
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
