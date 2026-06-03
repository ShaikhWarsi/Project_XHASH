import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createChart, CandlestickSeries, LineSeries, AreaSeries, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts'
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
  const onCrosshairMoveRef = useRef(onCrosshairMove)
  onCrosshairMoveRef.current = onCrosshairMove

  useEffect(() => {
    setWindowHeight(window.innerHeight)
    const handler = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (!isExpanded) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false)
      if (e.key === 'F11') { e.preventDefault(); setIsExpanded(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isExpanded])

  useEffect(() => {
    if (!chartRef.current) return
    const styles = getComputedStyle(document.documentElement)
    const bgColor = styles.getPropertyValue('--chart-bg').trim() || '#0a0e14'
    const textColor = styles.getPropertyValue('--chart-text').trim() || '#d1d4dc'
    const gridColor = styles.getPropertyValue('--chart-grid').trim() || '#2a2d3e'
    const borderColor = styles.getPropertyValue('--chart-border').trim() || '#2a2d3e'
    const candleUp = styles.getPropertyValue('--chart-candle-up').trim() || '#22c55e'
    const candleDown = styles.getPropertyValue('--chart-candle-down').trim() || '#ef4444'
    const lineColor = styles.getPropertyValue('--chart-line').trim() || '#3b82f6'
    const chart = createChart(chartRef.current, {
      height: isExpanded ? windowHeight - 100 : height,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderColor },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0, vertLine: { color: '#3b82f6', width: 1, labelBackgroundColor: '#3b82f6' }, horzLine: { color: '#3b82f6', width: 1, labelBackgroundColor: '#3b82f6' } },
    })
    chartApiRef.current = chart

    chart.subscribeCrosshairMove((params) => {
      if (params.time) setCrosshairTime(params.time as any)
      onCrosshairMoveRef.current?.(params)
    })

    if (type === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: candleUp,
        downColor: candleDown,
        borderUpColor: candleUp,
        borderDownColor: candleDown,
        wickUpColor: candleUp,
        wickDownColor: candleDown,
        ...options,
      } as any)
      seriesRef.current = series
    } else if (type === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: lineColor,
        lineWidth: 2,
        ...options,
      } as any)
      seriesRef.current = series
    } else if (type === 'area') {
      const series = chart.addSeries(AreaSeries, {
        lineColor,
        topColor: lineColor + '40',
        bottomColor: lineColor + '05',
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
  }, [type, height, isExpanded, windowHeight, options])

  const seenSetRef = useRef<Set<any>>(new Set())

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const seen = seenSetRef.current
      const deduped: any[] = []
      for (const item of data) {
        const key = item.time
        if (!seen.has(key)) {
          seen.add(key)
          deduped.push(item)
        }
      }
      if (deduped.length > 0) {
        seriesRef.current.setData(data)
        chartApiRef.current?.timeScale().fitContent()
      }
    }
  }, [data])

  useEffect(() => {
    if (!seriesRef.current) return
    const markers = annotations
      .filter((a) => a.time != null && !a.replyTo)
      .map((a) => ({
        time: typeof a.time === 'number' ? a.time : (new Date(a.time as string).getTime() / 1000) as any,
        position: 'aboveBar' as const,
        color: a.color,
        shape: 'circle' as const,
        text: a.text.slice(0, 30),
      }))
    ;(seriesRef.current as any).setMarkers(markers)
  }, [annotations])

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
    if (seriesRef.current) {
      ;(seriesRef.current as any).setMarkers(
        annotations.filter((a) => a.id !== id && !a.replyTo).map((a) => ({
          time: typeof a.time === 'number' ? a.time : (new Date(a.time as string).getTime() / 1000) as any,
          position: 'aboveBar' as const,
          color: a.color,
          shape: 'circle' as const,
          text: a.text.slice(0, 30),
        }))
      )
    }
  }, [annotations])

  return (
    <div className={`transition-all duration-300 ease-linear ${isExpanded ? 'fixed inset-0 z-[9999] p-4' : ''}`}
      style={{
        transition: 'all 300ms ease',
        position: isExpanded ? 'fixed' as any : undefined,
        ...(isExpanded ? { background: 'var(--bg-primary)', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, padding: 16 } : {}),
      }}>
      {isExpanded && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)', fontWeight: 600 }}>{title || 'Chart'}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setIsExpanded(false)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>
            Exit Fullscreen (Esc)
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-2" style={isExpanded ? { marginTop: 28 } : undefined}>
        {title && <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
        <div className="flex items-center gap-2">
          {toolbar}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            style={{ background: showAnnotations ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', padding: 4, color: showAnnotations ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
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
