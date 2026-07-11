import { useRef, useEffect, useState, useMemo, memo } from 'react'
import { useTheme } from '../contexts/ThemeContext'

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

const EquityCurveChart = memo(function EquityCurveChart({ equity, trades, benchmark }: EquityCurveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    time: string
    value: number
    pl: number
  } | null>(null)
  const { resolvedTheme } = useTheme()

  const range = useMemo(() => {
    if (equity.length === 0) return { globalMin: 0, globalMax: 1 }
    const sorted = [...equity].sort((a, b) => a.time.localeCompare(b.time))
    let globalMin = sorted[0]?.value ?? 0
    let globalMax = globalMin
    for (const e of sorted) {
      if (e.value < globalMin) globalMin = e.value
      if (e.value > globalMax) globalMax = e.value
    }
    if (benchmark && benchmark.length > 0) {
      for (const b of benchmark) {
        if (b.value < globalMin) globalMin = b.value
        if (b.value > globalMax) globalMax = b.value
      }
    }
    return { globalMin, globalMax }
  }, [equity, benchmark])

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

    const styles = getComputedStyle(document.documentElement)
    const cssVar = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback

    ctx.clearRect(0, 0, w, h)

    if (equity.length === 0) {
      ctx.fillStyle = cssVar('--text-muted', '#8892a6')
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('No equity data', w / 2, h / 2)
      return
    }

    const { globalMin, globalMax } = range

    const r = globalMax - globalMin || 1
    const padding = r * 0.1
    const yMin = globalMin - padding
    const yMax = globalMax + padding
    const yRange = yMax - yMin || 1

    const sorted = [...equity].sort((a, b) => a.time.localeCompare(b.time))
    const times = sorted.map((e) => e.time)
    const tMax = times.length - 1
    const xPad = 50
    const yPad = 20
    const chartW = w - xPad * 2
    const chartH = h - yPad * 2

    const toX = (i: number) => xPad + (i / (tMax || 1)) * chartW
    const toY = (v: number) => yPad + chartH - ((v - yMin) / yRange) * chartH

    const gridColor = cssVar('--chart-grid', '#2a2d3e')
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

    ctx.fillStyle = cssVar('--chart-text', '#d1d4dc')
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
      ctx.fillStyle = cssVar('--chart-text', '#d1d4dc')
      ctx.fillText(formatTime(times[i]), toX(i), h - 4)
    }

    let peak = sorted[0].value
    ctx.fillStyle = cssVar('--accent-red', '#ef5350') + '1f'
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
      ctx.strokeStyle = cssVar('--accent-blue', '#3b82f6')
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

    ctx.strokeStyle = cssVar('--accent-green', '#22c55e')
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
      const tradeTime = trade.time.slice(0, 10)
      const tIdx = times.indexOf(tradeTime)
      if (tIdx === -1) continue
      const x = toX(tIdx)
      const y = toY(trade.price)

      ctx.beginPath()
      if (trade.type === 'buy') {
        ctx.fillStyle = cssVar('--accent-green', '#22c55e')
        ctx.moveTo(x, y - tradeSize)
        ctx.lineTo(x - tradeSize, y + tradeSize)
        ctx.lineTo(x + tradeSize, y + tradeSize)
      } else {
        ctx.fillStyle = cssVar('--accent-red', '#ef5350')
        ctx.moveTo(x, y + tradeSize)
        ctx.lineTo(x - tradeSize, y - tradeSize)
        ctx.lineTo(x + tradeSize, y - tradeSize)
      }
      ctx.closePath()
      ctx.fill()
    }
  }, [equity, trades, benchmark, resolvedTheme])

  const sortedEquity = useMemo(() => [...equity].sort((a, b) => a.time.localeCompare(b.time)), [equity])
  const sortedTimes = useMemo(() => sortedEquity.map((e) => e.time), [sortedEquity])
  const eqValues = useMemo(() => sortedEquity.map((e) => e.value), [sortedEquity])

  const chartStats = useMemo(() => {
    if (equity.length === 0) return { globalMin: 0, globalMax: 1, times: [] as string[], tMax: 0 }
    let globalMin = Math.min(...eqValues)
    let globalMax = Math.max(...eqValues)
    if (benchmark && benchmark.length > 0) {
      const bmValues = benchmark.map((b) => b.value)
      globalMin = Math.min(globalMin, ...bmValues)
      globalMax = Math.max(globalMax, ...bmValues)
    }
    return { globalMin, globalMax, times: sortedTimes, tMax: sortedTimes.length - 1 }
  }, [equity, benchmark, eqValues, sortedTimes])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (equity.length === 0) { setTooltip(null); return }
    const { times, tMax } = chartStats
    const xPad = 50
    const chartW = rect.width - xPad * 2

    const mx = e.clientX - rect.left
    const relX = mx - xPad
    if (relX < 0 || relX > chartW) { setTooltip(null); return }

    const tIdx = Math.round((relX / chartW) * tMax)
    if (tIdx < 0 || tIdx >= sortedEquity.length) { setTooltip(null); return }

    const pt = sortedEquity[tIdx]
    const firstVal = sortedEquity[0].value
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
})

export default EquityCurveChart
