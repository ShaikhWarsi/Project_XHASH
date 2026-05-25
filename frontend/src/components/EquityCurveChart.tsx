import { useRef, useEffect, useState } from 'react'

interface EquityPoint {
  time: string
  value: number
}

export interface TradeMarker {
  time: string
  type: 'buy' | 'sell'
  price: number
}

interface EquityCurveChartProps {
  equity: EquityPoint[]
  trades: TradeMarker[]
  benchmark?: EquityPoint[]
}

function formatTime(t: string): string {
  if (t.length >= 16) return t.slice(5, 16)
  if (t.length >= 10) return t.slice(5, 10)
  return t
}

export default function EquityCurveChart({ equity, trades, benchmark }: EquityCurveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    time: string
    value: number
    pl: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height

    ctx.clearRect(0, 0, w, h)

    if (equity.length === 0) {
      ctx.fillStyle = 'var(--text-muted)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('No equity data', w / 2, h / 2)
      return
    }

    const sorted = [...equity].sort((a, b) => a.time.localeCompare(b.time))
    const eqValues = sorted.map((e) => e.value)
    const minVal = Math.min(...eqValues)
    const maxVal = Math.max(...eqValues)
    let globalMin = minVal
    let globalMax = maxVal

    if (benchmark && benchmark.length > 0) {
      const bmValues = benchmark.map((b) => b.value)
      globalMin = Math.min(globalMin, ...bmValues)
      globalMax = Math.max(globalMax, ...bmValues)
    }

    const range = globalMax - globalMin || 1
    const padding = range * 0.1
    const yMin = globalMin - padding
    const yMax = globalMax + padding
    const yRange = yMax - yMin || 1

    const times = sorted.map((e) => e.time)
    const tMax = times.length - 1
    const xPad = 50
    const yPad = 20
    const chartW = w - xPad * 2
    const chartH = h - yPad * 2

    const toX = (i: number) => xPad + (i / (tMax || 1)) * chartW
    const toY = (v: number) => yPad + chartH - ((v - yMin) / yRange) * chartH

    const gridColor = 'var(--chart-grid)'
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = yPad + (chartH / 4) * i
      ctx.beginPath()
      ctx.moveTo(xPad, y)
      ctx.lineTo(w - xPad, y)
      ctx.stroke()
    }
    for (let i = 0; i <= 6; i++) {
      const x = xPad + (chartW / 6) * i
      ctx.beginPath()
      ctx.moveTo(x, yPad)
      ctx.lineTo(x, h - yPad)
      ctx.stroke()
    }

    ctx.fillStyle = 'var(--chart-text)'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const val = yMax - (yRange / 4) * i
      const y = yPad + (chartH / 4) * i
      ctx.fillText(val.toFixed(2), xPad - 6, y + 3)
    }
    ctx.textAlign = 'center'
    const labelStep = Math.max(1, Math.floor(times.length / 6))
    for (let i = 0; i < times.length; i += labelStep) {
      ctx.fillStyle = 'var(--chart-text)'
      ctx.fillText(formatTime(times[i]), toX(i), h - 4)
    }

    let peak = sorted[0].value
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)'
    ctx.beginPath()
    for (let i = 0; i < sorted.length; i++) {
      const v = sorted[i].value
      if (v > peak) {
        peak = v
      }
      const dd = (v - peak) / peak
      const ddY = toY(peak * (1 + dd))
      const x = toX(i)
      if (i === 0) {
        ctx.moveTo(x, toY(peak))
        ctx.lineTo(x, ddY)
      } else {
        ctx.lineTo(x, ddY)
      }
    }
    for (let i = sorted.length - 1; i >= 0; i--) {
      const x = toX(i)
      ctx.lineTo(x, toY(peak))
    }
    ctx.closePath()
    ctx.fill()

    if (benchmark && benchmark.length > 0) {
      const bmSorted = [...benchmark].sort((a, b) => a.time.localeCompare(b.time))
      ctx.strokeStyle = 'var(--accent-blue)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      for (let i = 0; i < bmSorted.length; i++) {
        const tIdx = times.indexOf(bmSorted[i].time)
        if (tIdx === -1) continue
        const x = toX(tIdx)
        const y = toY(bmSorted[i].value)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.strokeStyle = 'var(--accent-green)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < sorted.length; i++) {
      const x = toX(i)
      const y = toY(sorted[i].value)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    const tradeSize = 6
    for (const trade of trades) {
      const tIdx = times.indexOf(trade.time)
      if (tIdx === -1) continue
      const x = toX(tIdx)
      const y = toY(trade.price)

      ctx.beginPath()
      if (trade.type === 'buy') {
        ctx.fillStyle = 'var(--accent-green)'
        ctx.moveTo(x, y - tradeSize)
        ctx.lineTo(x - tradeSize, y + tradeSize)
        ctx.lineTo(x + tradeSize, y + tradeSize)
      } else {
        ctx.fillStyle = 'var(--accent-red)'
        ctx.moveTo(x, y + tradeSize)
        ctx.lineTo(x - tradeSize, y - tradeSize)
        ctx.lineTo(x + tradeSize, y - tradeSize)
      }
      ctx.closePath()
      ctx.fill()
    }
  }, [equity, trades, benchmark])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (equity.length === 0) { setTooltip(null); return }

    const sorted = [...equity].sort((a, b) => a.time.localeCompare(b.time))
    const eqValues = sorted.map((e) => e.value)
    let globalMin = Math.min(...eqValues)
    let globalMax = Math.max(...eqValues)
    if (benchmark && benchmark.length > 0) {
      const bmValues = benchmark.map((b) => b.value)
      globalMin = Math.min(globalMin, ...bmValues)
      globalMax = Math.max(globalMax, ...bmValues)
    }
    const times = sorted.map((e) => e.time)
    const tMax = times.length - 1
    const xPad = 50
    const chartW = rect.width - xPad * 2

    const mx = e.clientX - rect.left
    const relX = mx - xPad
    if (relX < 0 || relX > chartW) { setTooltip(null); return }

    const tIdx = Math.round((relX / chartW) * tMax)
    if (tIdx < 0 || tIdx >= sorted.length) { setTooltip(null); return }

    const pt = sorted[tIdx]
    const firstVal = sorted[0].value
    const pl = pt.value - firstVal

    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 10,
      time: pt.time,
      value: pt.value,
      pl,
    })
  }

  return (
    <div style={{ position: 'relative', fontFamily: "'JetBrains Mono', monospace" }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ width: '100%', height: 300, borderRadius: 'var(--radius-sm)', display: 'block' }}
      />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 10px',
            fontSize: 10,
            color: 'var(--text-primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 'var(--z-tooltip)',
            boxShadow: 'var(--shadow-md)',
            lineHeight: 1.6,
          }}
        >
          <div>Time: {tooltip.time}</div>
          <div>Equity: {tooltip.value.toFixed(2)}</div>
          <div style={{ color: tooltip.pl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            P&L: {tooltip.pl >= 0 ? '+' : ''}{tooltip.pl.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
