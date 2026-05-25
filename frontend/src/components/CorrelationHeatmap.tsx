import { useState, useMemo } from 'react'

interface CorrelationData {
  symbols: string[]
  matrix: number[][]
}

interface CorrelationHeatmapProps {
  data: CorrelationData
  cellSize?: number
}

function correlationColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value))
  if (clamped > 0) {
    const intensity = Math.round(clamped * 200)
    const r = Math.max(0, 200 - intensity)
    const g = Math.min(255, 50 + intensity * 2)
    const b = Math.max(0, 200 - intensity)
    return `rgb(${r}, ${Math.min(255, g)}, ${b})`
  } else {
    const intensity = Math.round(Math.abs(clamped) * 200)
    const r = Math.min(255, 50 + intensity * 2)
    const g = Math.max(0, 200 - intensity)
    const b = Math.max(0, 200 - intensity)
    return `rgb(${r}, ${g}, ${b})`
  }
}

export default function CorrelationHeatmap({ data, cellSize = 44 }: CorrelationHeatmapProps) {
  const { symbols, matrix } = data
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const legendSteps = useMemo(() => {
    const steps: number[] = []
    for (let i = -10; i <= 10; i++) {
      steps.push(i / 10)
    }
    return steps
  }, [])

  const gridSize = symbols.length * cellSize
  const labelWidth = 50
  const labelHeight = 16

  const handleMouseEnter = (row: number, col: number, e: React.MouseEvent) => {
    const val = matrix[row]?.[col]
    if (val === undefined) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      text: `${symbols[row]} / ${symbols[col]}: ${val.toFixed(3)}`,
    })
  }

  const handleMouseLeave = () => setTooltip(null)

  return (
    <div style={{ position: 'relative', fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ paddingLeft: labelWidth + 4, marginBottom: 4 }}>
        <svg width={gridSize} height={labelHeight}>
          {symbols.map((sym, i) => (
            <text
              key={sym}
              x={i * cellSize + cellSize / 2}
              y={labelHeight - 2}
              textAnchor="end"
              transform={`rotate(-45 ${i * cellSize + cellSize / 2} ${labelHeight - 2})`}
              fill="var(--text-secondary)"
              fontSize={8}
              fontFamily="'JetBrains Mono', monospace"
            >
              {sym}
            </text>
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: labelWidth, flexShrink: 0, paddingRight: 4 }}>
          {symbols.map((sym) => (
            <div
              key={sym}
              style={{
                height: cellSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontSize: 8,
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {sym}
            </div>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${symbols.length}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${symbols.length}, ${cellSize}px)`,
              gap: 1,
            }}
          >
            {matrix.map((row, i) =>
              row.map((val, j) => (
                <div
                  key={`${i}-${j}`}
                  onMouseEnter={(e) => handleMouseEnter(i, j, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    background: correlationColor(val),
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 7,
                    color: Math.abs(val) > 0.5 ? '#fff' : 'var(--text-primary)',
                    cursor: 'default',
                    fontWeight: 500,
                  }}
                >
                  {val.toFixed(2)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 8, marginLeft: labelWidth + 4 }}>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>-1</span>
        <div style={{ display: 'flex', flex: 1, height: 10, borderRadius: 2, overflow: 'hidden' }}>
          {legendSteps.map((v) => (
            <div
              key={v}
              style={{
                flex: 1,
                background: correlationColor(v),
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>0</span>
        <div style={{ display: 'flex', flex: 1, height: 10, borderRadius: 2, overflow: 'hidden' }}>
          {legendSteps.map((v) => (
            <div
              key={v}
              style={{
                flex: 1,
                background: correlationColor(v),
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>+1</span>
      </div>
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
