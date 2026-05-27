import { useEffect, useRef } from 'react'
import { createChart, AreaSeries, LineSeries, LineType, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { BarData } from '../../api/types'

interface DepthLevel {
  price: number
  cumVol: number
}

interface DepthChartProps {
  symbol: string
  data: BarData[]
  onClose?: () => void
}

function generateDepthData(data: BarData[]): { bids: DepthLevel[]; asks: DepthLevel[]; midPrice: number } | null {
  if (data.length === 0) return null
  const last = data[data.length - 1]
  const mid = last.close
  const halfSpread = (mid * 0.001) / 2
  const step = halfSpread / 20
  const baseVol = Math.max(last.volume || 1000000, 1000)

  const levels = 20
  const bids: DepthLevel[] = []
  const asks: DepthLevel[] = []

  let cumBid = 0
  for (let i = levels - 1; i >= 0; i--) {
    const price = mid - halfSpread + step * i
    const vol = baseVol * Math.exp(-(levels - 1 - i) * 0.25)
    cumBid += vol
    bids.push({ price, cumVol: cumBid })
  }

  let cumAsk = 0
  for (let i = 0; i < levels; i++) {
    const price = mid + halfSpread + step * i
    const vol = baseVol * Math.exp(-i * 0.25)
    cumAsk += vol
    asks.push({ price, cumVol: cumAsk })
  }

  return { bids, asks, midPrice: mid }
}

export default function DepthChart({ symbol, data, onClose }: DepthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 200,
      layout: {
        background: { color: 'transparent' },
        textColor: '#787c84',
      },
      grid: {
        vertLines: { color: 'rgba(42,45,62,0.5)' },
        horzLines: { color: 'rgba(42,45,62,0.5)' },
      },
      rightPriceScale: {
        borderColor: '#2a2d3e',
      },
      timeScale: {
        borderColor: '#2a2d3e',
        visible: true,
      },
      crosshair: {
        vertLine: { labelBackgroundColor: '#3b82f6' },
        horzLine: { labelBackgroundColor: '#3b82f6' },
      },
    })

    chartRef.current = chart

    const bidSeries = chart.addSeries(AreaSeries, {
      lineColor: '#22c55e',
      topColor: 'rgba(34,197,94,0.25)',
      bottomColor: 'rgba(34,197,94,0.02)',
      lineWidth: 2,
      lineType: LineType.WithSteps,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const askSeries = chart.addSeries(AreaSeries, {
      lineColor: '#ef4444',
      topColor: 'rgba(239,68,68,0.25)',
      bottomColor: 'rgba(239,68,68,0.02)',
      lineWidth: 2,
      lineType: LineType.WithSteps,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const midLine = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })

    const depth = generateDepthData(data)
    if (depth) {
      const { bids, asks } = depth
      const totalLevels = bids.length + asks.length
      const maxVol = Math.max(bids[bids.length - 1].cumVol, asks[asks.length - 1].cumVol)

      const priceMap = [...bids, ...asks].map((l) => l.price)

      chart.timeScale().applyOptions({
        tickMarkFormatter: (time: number) => {
          const idx = Math.round(time)
          if (idx >= 0 && idx < priceMap.length) {
            return priceMap[idx].toFixed(2)
          }
          return ''
        },
      })

      const bidData: { time: number; value: number }[] = []
      for (let i = 0; i < bids.length; i++) {
        bidData.push({ time: i, value: bids[i].cumVol })
      }
      for (let i = bids.length; i < totalLevels; i++) {
        bidData.push({ time: i, value: bids[bids.length - 1].cumVol })
      }

      const askData: { time: number; value: number }[] = []
      for (let i = 0; i < bids.length; i++) {
        askData.push({ time: i, value: 0 })
      }
      for (let i = 0; i < asks.length; i++) {
        askData.push({ time: bids.length + i, value: asks[i].cumVol })
      }

      const midIdx = bids.length - 1
      const midPriceData: { time: number; value: number }[] = [
        { time: midIdx, value: 0 },
        { time: midIdx, value: maxVol * 1.1 },
      ]

      bidSeries.setData(bidData)
      askSeries.setData(askData)
      midLine.setData(midPriceData)
      chart.timeScale().fitContent()
    }

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [data])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, 200)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: '1px solid var(--border-color)',
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>Depth &mdash; {symbol}</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 10,
              padding: 0,
              lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        )}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 200 }} />
    </div>
  )
}
