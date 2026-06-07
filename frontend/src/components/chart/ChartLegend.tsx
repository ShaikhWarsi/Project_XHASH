import { useState } from 'react'
import { Eye, EyeOff, Minus, Plus } from 'lucide-react'

interface LegendSeries {
  id: string
  name: string
  color: string
  visible: boolean
  type: 'line' | 'histogram' | 'candlestick'
}

interface ChartLegendProps {
  series: LegendSeries[]
  onToggle: (id: string) => void
  onSolo: (id: string) => void
  onHideAll: () => void
  onShowAll: () => void
}

export function ChartLegend({ series, onToggle, onSolo, onHideAll, onShowAll }: ChartLegendProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '2px 6px', background: 'var(--bg-card)',
      borderTop: '1px solid var(--border-color)',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
      overflowX: 'auto', whiteSpace: 'nowrap',
      minHeight: 18,
    }}>
      {series.map((s) => (
        <div key={s.id}
          onClick={() => onToggle(s.id)}
          onDoubleClick={() => onSolo(s.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 5px', borderRadius: 3, cursor: 'pointer',
            background: !s.visible ? 'var(--bg-hover)' : 'transparent',
            opacity: s.visible ? 1 : 0.45,
            transition: 'opacity 0.12s',
          }}
          title={`${s.visible ? 'Hide' : 'Show'} ${s.name} (double-click to solo)`}
        >
          <span style={{
            width: 8, height: 2, borderRadius: 1,
            background: s.visible ? s.color : 'var(--text-muted)',
            display: 'inline-block',
          }} />
          <span style={{ color: s.visible ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {s.name}
          </span>
          {!s.visible && <EyeOff size={8} style={{ color: 'var(--text-muted)' }} />}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {series.length > 0 && (
        <div style={{ display: 'flex', gap: 1, marginLeft: 4 }}>
          <button onClick={(e) => { e.stopPropagation(); onHideAll() }}
            title="Hide All"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px 3px', fontSize: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Minus size={8} /> ALL
          </button>
          <button onClick={(e) => { e.stopPropagation(); onShowAll() }}
            title="Show All"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '1px 3px', fontSize: 8, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Plus size={8} /> ALL
          </button>
        </div>
      )}
    </div>
  )
}
