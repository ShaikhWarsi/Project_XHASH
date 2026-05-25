import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts'
import { Maximize2, Minimize2, MessageSquare } from 'lucide-react'
import ChartAnnotations, { type ChartAnnotation } from './ChartAnnotations'

interface ChartContainerProps {
  options?: Record<string, any>
  type?: 'candlestick' | 'line' | 'area'
  data: any[]
  height?: number
  title?: string
  toolbar?: ReactNode
  onCrosshairMove?: (params: any) => void
}

export default function ChartContainer({
  options,
  type = 'candlestick',
  data = [],
  height = 300,
  title,
  toolbar,
  onCrosshairMove,
}: ChartContainerProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartApiRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<any> | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [windowHeight, setWindowHeight] = useState(0)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([])
  const [crosshairTime, setCrosshairTime] = useState<string | number | null>(null)

  useEffect(() => {
    setWindowHeight(window.innerHeight)
    const handler = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    const styles = getComputedStyle(document.documentElement)
    const chart = createChart(chartRef.current, {
      height: isExpanded ? windowHeight - 100 : height,
      layout: {
        background: { type: ColorType.Solid, color: styles.getPropertyValue('--chart-bg').trim() || '#1e2235' },
        textColor: styles.getPropertyValue('--chart-text').trim() || '#9aa0a6',
      },
      grid: {
        vertLines: { color: styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e' },
        horzLines: { color: styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e' },
      },
      rightPriceScale: { borderColor: styles.getPropertyValue('--chart-border').trim() || '#2a2d3e' },
      timeScale: { borderColor: styles.getPropertyValue('--chart-border').trim() || '#2a2d3e', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      handleScroll: { vertTouchDrag: false },
    })
    chartApiRef.current = chart

    chart.subscribeCrosshairMove((params) => {
      if (params.time) setCrosshairTime(params.time as any)
      if (onCrosshairMove) onCrosshairMove(params)
    })

    if (type === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: styles.getPropertyValue('--chart-candle-up').trim() || '#22c55e',
        downColor: styles.getPropertyValue('--chart-candle-down').trim() || '#ef4444',
        borderUpColor: styles.getPropertyValue('--chart-candle-up').trim() || '#22c55e',
        borderDownColor: styles.getPropertyValue('--chart-candle-down').trim() || '#ef4444',
        wickUpColor: styles.getPropertyValue('--chart-candle-up').trim() || '#22c55e',
        wickDownColor: styles.getPropertyValue('--chart-candle-down').trim() || '#ef4444',
        ...options,
      } as any)
      seriesRef.current = series
    } else if (type === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: styles.getPropertyValue('--chart-line').trim() || '#22c55e',
        lineWidth: 2,
        ...options,
      } as any)
      seriesRef.current = series
    }

    chart.timeScale().fitContent()
    return () => {
      chart.remove()
      chartApiRef.current = null
      seriesRef.current = null
    }
  }, [type, height, isExpanded, windowHeight, options, onCrosshairMove])

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const seen = new Set()
      const deduped: any[] = []
      for (let i = data.length - 1; i >= 0; i--) {
        const key = data[i].time
        if (!seen.has(key)) {
          seen.add(key)
          deduped.unshift(data[i])
        }
      }
      seriesRef.current.setData(deduped)
      chartApiRef.current?.timeScale().fitContent()
    }
  }, [data])

  const handleAddAnnotation = useCallback((a: Omit<ChartAnnotation, 'id' | 'createdAt'>) => {
    const annotation: ChartAnnotation = {
      ...a,
      id: `ann-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    setAnnotations((prev) => [...prev, annotation])
  }, [])

  const handleRemoveAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[9999] bg-[#0f1118] p-4' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        {title && <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
        <div className="flex items-center gap-2">
          {toolbar}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            style={{ background: showAnnotations ? 'rgba(59,130,246,0.15)' : 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', padding: 4, color: showAnnotations ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
            title="Annotations"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {annotations.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent-blue)', color: '#fff', fontSize: 8, borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {annotations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(v => !v)}
            style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', padding: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={chartRef} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
        {showAnnotations && (
          <ChartAnnotations
            annotations={annotations}
            onAdd={handleAddAnnotation}
            onRemove={handleRemoveAnnotation}
            currentTime={crosshairTime ?? undefined}
          />
        )}
      </div>
    </div>
  )
}

export function getSeries(chart: IChartApi | null) {
  if (!chart) return null
  return chart
}
