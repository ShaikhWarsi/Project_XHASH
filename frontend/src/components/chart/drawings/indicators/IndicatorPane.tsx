import { useRef, useEffect } from 'react'
import { createChart, LineSeries, type IChartApi, type ISeriesApi, CrosshairMode } from 'lightweight-charts'
import type { IndicatorConfig } from '../../DrawingTypes'

interface IndicatorPaneProps {
  indicator: IndicatorConfig
  data: any[]
  onRemove?: (id: string) => void
  onParamsChange?: (id: string, params: Record<string, number>) => void
  height?: number
}

export function IndicatorPane({ indicator, data, onRemove, height = 120 }: IndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<any> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#5d6b7e',
      },
      grid: {
        vertLines: { color: '#1a2332' },
        horzLines: { color: '#1a2332' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
        horzLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
      },
      timeScale: { visible: false },
      rightPriceScale: { borderColor: '#1a2332' },
      handleScroll: false,
      handleScale: false,
    })

    chartRef.current = chart
    seriesRef.current = chart.addSeries(LineSeries, {
      color: indicator.style?.color || '#f59e0b',
      lineWidth: 1,
      priceFormat: { type: 'price' },
    })

    return () => {
      chart.remove()
    }
  }, [height])

  useEffect(() => {
    if (!seriesRef.current || !data?.length) return
    seriesRef.current.setData(data as any)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return (
    <div style={{
      position: 'relative',
      borderTop: '1px solid #1a2332',
      background: 'var(--bg-card, #0a0e14)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '1px 6px', fontSize: '9px',
        color: 'var(--text-secondary, #5d6b7e)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <span style={{ color: indicator.style?.color || '#f59e0b' }}>{indicator.name}</span>
        {onRemove && (
          <button onClick={() => onRemove(indicator.id)}
            style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: '9px', padding: 0 }}>
            ?
          </button>
        )}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: height - 18 }} />
    </div>
  )
}
