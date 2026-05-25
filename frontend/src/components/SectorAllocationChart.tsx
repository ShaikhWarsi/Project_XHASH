import { useState, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'

interface SectorData {
  name: string
  exposure: number
  color?: string
  children?: { name: string; exposure: number }[]
}

interface SectorAllocationChartProps {
  sectors: SectorData[]
  size?: number
  innerRadius?: number
  onSectorClick?: (name: string) => void
}

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7',
  '#06b6d4', '#ea580c', '#ec4899', '#14b8a6', '#8b5cf6',
]

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const startRad = ((startAngle - 90) * Math.PI) / 180
  const endRad = ((endAngle - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

export default function SectorAllocationChart({
  sectors,
  size = 200,
  innerRadius = 60,
  onSectorClick,
}: SectorAllocationChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [drillDown, setDrillDown] = useState<SectorData | null>(null)

  const displayData = drillDown?.children?.length ? drillDown.children : sectors
  const total = useMemo(() => displayData.reduce((s, s2) => s + Math.abs(s2.exposure), 0), [displayData])

  const arcs = useMemo(() => {
    let currentAngle = 0
    return displayData.map((s, i) => {
      const angle = (Math.abs(s.exposure) / (total || 1)) * 360
      const arc = {
        name: s.name,
        exposure: s.exposure,
        color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage: (Math.abs(s.exposure) / (total || 1)) * 100,
      }
      currentAngle += angle
      return arc
    })
  }, [displayData, total])

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {drillDown && (
          <button
            onClick={() => setDrillDown(null)}
            className="absolute -top-2 -left-2 flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm z-10"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            <ArrowLeft className="w-2.5 h-2.5" />
            Back
          </button>
        )}
        <svg width={size} height={size} className="block">
          {arcs.map((arc, i) => {
            const d = describeArc(cx, cy, outerR, arc.startAngle, arc.endAngle)
            return (
              <g key={arc.name}>
                <path
                  d={d}
                  fill={arc.color}
                  opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.3}
                  className="transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => {
                    if (!drillDown && sectors[i]?.children?.length) {
                      setDrillDown(sectors[i])
                    }
                    onSectorClick?.(arc.name)
                  }}
                />
              </g>
            )
          })}
          <circle cx={cx} cy={cy} r={innerRadius} fill="var(--bg-card)" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
          >
            {hoveredIndex !== null ? arcs[hoveredIndex].percentage.toFixed(1) : drillDown ? drillDown.name : 'Total'}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={8}
            fontFamily="'JetBrains Mono', monospace"
          >
            {hoveredIndex !== null ? '%' : drillDown ? 'sub-sectors' : '100%'}
          </text>
        </svg>
        {hoveredIndex !== null && (
          <div
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-mono whitespace-nowrap z-10 rounded-sm"
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            {arcs[hoveredIndex].name}: {arcs[hoveredIndex].percentage.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 justify-center" style={{ maxWidth: size + 40 }}>
        {arcs.map((arc) => (
          <div
            key={arc.name}
            className="flex items-center gap-0.5 text-[9px] font-mono"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-sm shrink-0"
              style={{ background: arc.color }}
            />
            <span>{arc.name}</span>
            <span className="text-muted">{arc.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
