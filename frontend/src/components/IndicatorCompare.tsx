import { useRef, useEffect, useState } from 'react'

interface IndicatorData {
  id: string
  name: string
  data: { time: string; value: number }[]
}

interface IndicatorCompareProps {
  indicators: IndicatorData[]
}

const PALETTE = ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#ea580c', '#ec4899']

function formatTime(t: string): string {
  if (t.length >= 16) return t.slice(5, 16)
  if (t.length >= 10) return t.slice(5, 10)
  return t
}

export default function IndicatorCompare({ indicators }: IndicatorCompareProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    indicators.forEach((ind) => { map[ind.id] = true })
    return map
  })
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const toggle = (id: string) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const clearAll = () => {
    const map: Record<string, boolean> = {}
    indicators.forEach((ind) => { map[ind.id] = false })
    setVisible(map)
  }

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

    const visibleIndicators = indicators.filter((ind) => visible[ind.id])
    if (visibleIndicators.length === 0) {
      ctx.fillStyle = 'var(--text-muted)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('No indicators visible', w / 2, h / 2)
      return
    }

    const allData = visibleIndicators.flatMap((ind) => ind.data)
    if (allData.length === 0) return

    const allValues = allData.map((d) => d.value)
    const minVal = Math.min(...allValues)
    const maxVal = Math.max(...allValues)
    const range = maxVal - minVal || 1
    const padding = range * 0.1
    const yMin = minVal - padding
    const yMax = maxVal + padding
    const yRange = yMax - yMin || 1

    const timeSet = new Set<string>()
    visibleIndicators.forEach((ind) => ind.data.forEach((d) => timeSet.add(d.time)))
    const times = Array.from(timeSet).sort()
    const tMax = times.length - 1

    const xPad = 40
    const yPad = 20
    const chartW = w - xPad * 2
    const chartH = h - yPad * 2

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

    let colorIdx = 0
    const colorMap: Record<string, string> = {}

    for (const ind of visibleIndicators) {
      const color = PALETTE[colorIdx % PALETTE.length]
      colorMap[ind.id] = color
      colorIdx++

      if (ind.data.length === 0) continue

      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()

      const sorted = [...ind.data].sort((a, b) => a.time.localeCompare(b.time))

      for (let i = 0; i < sorted.length; i++) {
        const tIdx = times.indexOf(sorted[i].time)
        const x = xPad + (tIdx / (tMax || 1)) * chartW
        const y = yPad + chartH - ((sorted[i].value - yMin) / yRange) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
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
      const x = xPad + (i / (tMax || 1)) * chartW
      ctx.fillStyle = 'var(--chart-text)'
      ctx.fillText(formatTime(times[i]), x, h - 4)
    }

    setTooltip(null)
  }, [indicators, visible])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left

    const visibleIndicators = indicators.filter((ind) => visible[ind.id])
    if (visibleIndicators.length === 0) return

    const allData = visibleIndicators.flatMap((ind) => ind.data)
    if (allData.length === 0) return

    const timeSet = new Set<string>()
    visibleIndicators.forEach((ind) => ind.data.forEach((d) => timeSet.add(d.time)))
    const times = Array.from(timeSet).sort()
    const tMax = times.length - 1

    const xPad = 40
    const chartW = rect.width - xPad * 2

    const relX = mx - xPad
    if (relX < 0 || relX > chartW) { setTooltip(null); return }

    const tIdx = Math.round((relX / chartW) * tMax)
    if (tIdx < 0 || tIdx >= times.length) { setTooltip(null); return }

    const timeStr = times[tIdx]
    let text = `Time: ${timeStr}`
    for (const ind of visibleIndicators) {
      const pt = ind.data.find((d) => d.time === timeStr)
      if (pt !== undefined) {
        text += ` | ${ind.name}: ${pt.value.toFixed(4)}`
      }
    }

    setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, text })
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {indicators.map((ind, i) => (
          <label
            key={ind.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              fontSize: 10,
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${visible[ind.id] ? PALETTE[i % PALETTE.length] : 'var(--border-color)'}`,
              background: visible[ind.id] ? `${PALETTE[i % PALETTE.length]}15` : 'transparent',
            }}
          >
            <input type="checkbox" checked={!!visible[ind.id]} onChange={() => toggle(ind.id)} style={{ accentColor: PALETTE[i % PALETTE.length] }} />
            <span style={{ color: visible[ind.id] ? PALETTE[i % PALETTE.length] : 'var(--text-muted)' }}>{ind.name}</span>
          </label>
        ))}
        <button
          onClick={clearAll}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            marginLeft: 4,
          }}
        >
          Clear All
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          style={{ width: '100%', height: 200, borderRadius: 'var(--radius-sm)' }}
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
              padding: '4px 8px',
              fontSize: 10,
              color: 'var(--text-primary)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 'var(--z-tooltip)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  )
}
