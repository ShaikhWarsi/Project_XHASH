import { useEffect, useRef } from 'react'
import type { BarData } from '../../api/types'
import type { SignalMarker } from './ChartEngine'
import type { IChartApi } from 'lightweight-charts'

interface SignalBar {
  time: number
  buyStrength: number
  sellStrength: number
  netStrength: number
}

interface SignalTimelineProps {
  signals: SignalMarker[]
  data: BarData[]
  chart: IChartApi | null
  height?: number
  symbol: string
  visible: boolean
}

function computeSignalBars(signals: SignalMarker[], data: BarData[]): SignalBar[] {
  const signalMap = new Map<number, { buy: number; sell: number }>()
  for (const sig of signals) {
    const time = Number(sig.time)
    const entry = signalMap.get(time) || { buy: 0, sell: 0 }
    if (sig.type === 'buy') entry.buy += sig.strength || 0.5
    else entry.sell += sig.strength || 0.5
    signalMap.set(time, entry)
  }
  return data.map((bar) => {
    const s = signalMap.get(bar.time) || { buy: 0, sell: 0 }
    return {
      time: bar.time,
      buyStrength: s.buy,
      sellStrength: s.sell,
      netStrength: s.buy - s.sell,
    }
  })
}

function drawOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bars: SignalBar[],
  cumulative: number[],
  chart: IChartApi,
) {
  const dpr = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, width * dpr, height * dpr)
  if (width <= 0 || height <= 0 || bars.length === 0 || bars.length !== cumulative.length) return

  const timeScale = chart.timeScale()
  const midY = height * dpr * 0.5
  const barWidth = 3 * dpr

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(width * dpr, midY)
  ctx.stroke()

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]
    const x = timeScale.timeToCoordinate(bar.time as any)
    if (x == null) continue
    const cx = x * dpr

    if (bar.buyStrength > 0) {
      const bh = Math.min(bar.buyStrength * midY, midY - 1)
      ctx.fillStyle = 'rgba(38,166,154,0.5)'
      ctx.fillRect(cx - barWidth / 2, midY - bh, barWidth, bh)
    }
    if (bar.sellStrength > 0) {
      const bh = Math.min(bar.sellStrength * midY, midY - 1)
      ctx.fillStyle = 'rgba(239,83,80,0.5)'
      ctx.fillRect(cx - barWidth / 2, midY, barWidth, bh)
    }
  }

  let maxCum = 0
  for (let i = 0; i < cumulative.length; i++) {
    maxCum = Math.max(maxCum, Math.abs(cumulative[i]))
  }
  if (maxCum < 0.001) maxCum = 1

  const linePoints: { x: number; y: number }[] = []
  for (let i = 0; i < bars.length; i++) {
    const x = timeScale.timeToCoordinate(bars[i].time as any)
    if (x == null) continue
    const normalizedY = midY - (cumulative[i] / maxCum) * midY * 0.8
    linePoints.push({ x: x * dpr, y: normalizedY })
  }

  if (linePoints.length < 2) return

  ctx.beginPath()
  ctx.moveTo(linePoints[0].x, midY)
  for (const p of linePoints) ctx.lineTo(p.x, p.y)
  ctx.lineTo(linePoints[linePoints.length - 1].x, midY)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(linePoints[0].x, linePoints[0].y)
  for (let i = 1; i < linePoints.length; i++) ctx.lineTo(linePoints[i].x, linePoints[i].y)
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1 * dpr
  ctx.stroke()
}

export default function SignalTimeline({
  signals,
  data,
  chart,
  height = 48,
  symbol: _symbol,
  visible,
}: SignalTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!visible || !chart || !canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const dpr = window.devicePixelRatio || 1

    const draw = () => {
      const w = container.getBoundingClientRect().width
      if (w <= 0) return
      canvas.width = w * dpr
      canvas.height = height * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const bars = computeSignalBars(signals, data)
      let cum = 0
      const cumulative = bars.map((b) => { cum += b.netStrength; return cum })
      drawOnCanvas(ctx, w, height, bars, cumulative, chart)
    }

    const ro = new ResizeObserver(draw)
    ro.observe(container)

    const timeScale = chart.timeScale()
    timeScale.subscribeVisibleTimeRangeChange(draw)

    draw()

    return () => {
      ro.disconnect()
      timeScale.unsubscribeVisibleTimeRangeChange(draw)
    }
  }, [signals, data, chart, height, visible])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: `${height}px`,
        }}
      />
    </div>
  )
}
