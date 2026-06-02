import { useEffect, useRef, useCallback, useState } from 'react'
import type { Time } from 'lightweight-charts'
import { ChartEngine } from './ChartEngine'
import type { SignalPoint } from './overlays/SignalTimelineRenderer'

interface SignalBar {
  time: Time
  buyStrength: number
  sellStrength: number
  netStrength: number
}

interface SignalTimelineIntegratedProps {
  signals: SignalPoint[]
  chartEngine: ChartEngine | null
  visible: boolean
  height?: number
  onSignalClick?: (signal: SignalPoint) => void
}

interface TooltipState {
  x: number
  y: number
  signal: SignalPoint
}

function computeSignalBars(signals: SignalPoint[], chartEngine: ChartEngine): SignalBar[] {
  const map = new Map<number, { buy: number; sell: number }>()

  for (const sig of signals) {
    const t = Number(sig.time)
    const entry = map.get(t) || { buy: 0, sell: 0 }
    if (sig.type === 'buy' || sig.type === 'strong_buy') {
      entry.buy += sig.strength
    } else if (sig.type === 'sell' || sig.type === 'strong_sell') {
      entry.sell += sig.strength
    }
    map.set(t, entry)
  }

  const bars: SignalBar[] = []
  const mainSeries = chartEngine.mainSeriesData
  if (!mainSeries) return bars

  const data = mainSeries.data()
  if (!Array.isArray(data)) {
    for (const [timeStr, s] of map) {
      bars.push({
        time: timeStr as unknown as Time,
        buyStrength: s.buy,
        sellStrength: s.sell,
        netStrength: s.buy - s.sell,
      })
    }
    return bars
  }

  for (const bar of data) {
    const t = Number(bar.time)
    const s = map.get(t) || { buy: 0, sell: 0 }
    bars.push({
      time: bar.time as Time,
      buyStrength: s.buy,
      sellStrength: s.sell,
      netStrength: s.buy - s.sell,
    })
  }

  return bars
}

function getVisibleSignals(
  signals: SignalPoint[],
  chartEngine: ChartEngine,
): SignalPoint[] {
  try {
    const range = chartEngine.chart.timeScale().getVisibleRange()
    if (!range || !range.from || !range.to) return signals

    const from = Number(range.from)
    const to = Number(range.to)

    return signals.filter((s) => {
      const t = Number(s.time)
      return t >= from && t <= to
    })
  } catch {
    return signals
  }
}

export default function SignalTimelineIntegrated({
  signals,
  chartEngine,
  visible,
  height = 48,
  onSignalClick,
}: SignalTimelineIntegratedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const handleCanvasClick = useCallback(
    (e: MouseEvent) => {
      if (!chartEngine || !onSignalClick) return
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const visibleSignals = getVisibleSignals(signals, chartEngine)

      for (const sig of visibleSignals) {
        const x = chartEngine.mapper.timeToX(sig.time)
        if (x == null) continue

        const dx = Math.abs(x - mx)
        if (dx < 6 && my >= 0 && my <= height) {
          onSignalClick(sig)
          setTooltip({ x: mx, y: my, signal: sig })
          return
        }
      }

      setTooltip(null)
    },
    [chartEngine, signals, onSignalClick, height],
  )

  useEffect(() => {
    if (!visible || !chartEngine || !canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    const dpr = window.devicePixelRatio || 1

    let rafId = 0

    const draw = () => {
      rafId = 0
      const w = container.getBoundingClientRect().width
      if (w <= 0) return

      canvas.width = w * dpr
      canvas.height = height * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const midY = (height * dpr) / 2
      const barMaxH = midY - 2 * dpr

      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1 * dpr
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(canvas.width, midY)
      ctx.stroke()

      const visibleSignals = getVisibleSignals(signals, chartEngine)
      const bars = computeSignalBars(visibleSignals, chartEngine)

      if (bars.length === 0) return

      let maxStrength = 0
      for (const bar of bars) {
        maxStrength = Math.max(maxStrength, Math.abs(bar.netStrength), bar.buyStrength, bar.sellStrength)
      }
      if (maxStrength < 0.001) maxStrength = 1

      const timeScale = chartEngine.chart.timeScale()

      for (const bar of bars) {
        const x = timeScale.timeToCoordinate(bar.time as any)
        if (x == null) continue
        const cx = x * dpr

        const barW = 3 * dpr

        const isStrongBuy = bar.buyStrength > 0 && bar.buyStrength >= maxStrength * 0.7
        const isStrongSell = bar.sellStrength > 0 && bar.sellStrength >= maxStrength * 0.7

        if (bar.buyStrength > 0) {
          const bh = Math.min((bar.buyStrength / maxStrength) * barMaxH, barMaxH - dpr)
          ctx.fillStyle = isStrongBuy ? 'rgba(38,166,154,0.9)' : 'rgba(38,166,154,0.45)'

          if (isStrongBuy) {
            ctx.shadowColor = 'rgba(38,166,154,0.6)'
            ctx.shadowBlur = 6 * dpr
          }

          ctx.fillRect(cx - barW / 2, midY - bh, barW, bh)

          ctx.shadowBlur = 0
          ctx.shadowColor = 'transparent'
        }

        if (bar.sellStrength > 0) {
          const bh = Math.min((bar.sellStrength / maxStrength) * barMaxH, barMaxH - dpr)
          ctx.fillStyle = isStrongSell ? 'rgba(239,83,80,0.9)' : 'rgba(239,83,80,0.45)'

          if (isStrongSell) {
            ctx.shadowColor = 'rgba(239,83,80,0.6)'
            ctx.shadowBlur = 6 * dpr
          }

          ctx.fillRect(cx - barW / 2, midY, barW, bh)

          ctx.shadowBlur = 0
          ctx.shadowColor = 'transparent'
        }
      }

      let cum = 0
      const cumulative = bars.map((b) => {
        cum += b.netStrength
        return cum
      })

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

      if (linePoints.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(linePoints[0].x, midY)
        for (const p of linePoints) ctx.lineTo(p.x, p.y)
        ctx.lineTo(linePoints[linePoints.length - 1].x, midY)
        ctx.closePath()
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(linePoints[0].x, linePoints[0].y)
        for (let i = 1; i < linePoints.length; i++) ctx.lineTo(linePoints[i].x, linePoints[i].y)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 1 * dpr
        ctx.stroke()
      }

      ctx.font = `${9 * dpr}px JetBrains Mono, monospace`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'

      let buyTotal = 0
      let sellTotal = 0
      for (const sig of visibleSignals) {
        if (sig.type === 'buy' || sig.type === 'strong_buy') buyTotal++
        else if (sig.type === 'sell' || sig.type === 'strong_sell') sellTotal++
      }

      const labelText = `AI: ${buyTotal} ▲ ${sellTotal} ▼`
      ctx.fillText(labelText, 4 * dpr, canvas.height - (14 * dpr))
    }

    const scheduleDraw = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(scheduleDraw)
    ro.observe(container)

    const timeScale = chartEngine.chart.timeScale()
    timeScale.subscribeVisibleTimeRangeChange(scheduleDraw)

    scheduleDraw()

    const canvasEl = canvasRef.current
    canvasEl.addEventListener('click', handleCanvasClick)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      ro.disconnect()
      timeScale.unsubscribeVisibleTimeRangeChange(scheduleDraw)
      canvasEl.removeEventListener('click', handleCanvasClick)
    }
  }, [signals, chartEngine, visible, height, handleCanvasClick])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: visible ? `${height}px` : '0px',
        position: 'relative',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transition: 'height 0.2s ease, opacity 0.2s ease',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />
      {tooltip && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            left: `${tooltip.x + 8}px`,
            top: `${tooltip.y - 20}px`,
            background: '#1a1e2e',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            color: '#e8eaed',
            pointerEvents: 'none',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#5d6b7e' }}>{String(tooltip.signal.time)}</span>
          {' '}
          <span
            style={{
              color:
                tooltip.signal.type === 'buy' || tooltip.signal.type === 'strong_buy'
                  ? '#26a69a'
                  : tooltip.signal.type === 'sell' || tooltip.signal.type === 'strong_sell'
                    ? '#ef5350'
                    : '#5d6b7e',
            }}
          >
            {tooltip.signal.type === 'strong_buy'
              ? 'STRONG BUY'
              : tooltip.signal.type === 'strong_sell'
                ? 'STRONG SELL'
                : tooltip.signal.type.toUpperCase()}
          </span>
          {' '}
          {tooltip.signal.source && (
            <span style={{ color: '#3b82f6' }}>{tooltip.signal.source}</span>
          )}
          {' '}
          <span style={{ color: '#ffd54f' }}>{Math.round(tooltip.signal.strength * 100)}%</span>
        </div>
      )}
    </div>
  )
}
