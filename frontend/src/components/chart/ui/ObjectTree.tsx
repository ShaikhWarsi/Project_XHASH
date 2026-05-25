import type { DrawingTool } from '../drawings/DrawingTool'

interface ObjectTreeProps {
  drawings: DrawingTool[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onDelete: (id: string) => void
  onVisibilityToggle: (id: string) => void
}

const TOOL_LABELS: Record<string, string> = {
  trendline: 'Trend Line', ray: 'Ray', extended_line: 'Extended Line',
  horizontal_line: 'Horizontal Line', vertical_line: 'Vertical Line',
  fib_retracement: 'Fib Retracement', fib_extension: 'Fib Extension', fib_timezone: 'Fib Time Zone',
  rectangle: 'Rectangle', ellipse: 'Ellipse', triangle: 'Triangle', parallelogram: 'Parallelogram',
  channel: 'Channel', text_label: 'Text', arrow: 'Arrow', brush: 'Brush', gann_fan: 'Gann Fan',
}

export function ObjectTree({ drawings, selectedId, onSelect, onDelete, onVisibilityToggle }: ObjectTreeProps) {
  return (
    <div style={{
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '4px',
      fontSize: '11px', fontFamily: 'Inter, sans-serif',
      maxHeight: '200px', overflowY: 'auto',
    }}>
      <div style={{ color: 'var(--text-secondary, #5d6b7e)', fontSize: '10px', padding: '2px 4px', borderBottom: '1px solid #1a2332', marginBottom: '4px' }}>
        Object Tree ({drawings.length})
      </div>
      {drawings.length === 0 && (
        <div style={{ color: '#333', padding: '8px', textAlign: 'center', fontSize: '10px' }}>No drawings</div>
      )}
      {drawings.map((d) => (
        <div
          key={d.id}
          onClick={() => onSelect(d.id === selectedId ? null : d.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '2px 4px', cursor: 'pointer',
            background: d.id === selectedId ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: d.id === selectedId ? '#60a5fa' : 'var(--text-primary, #e8eaed)',
            borderRadius: '2px',
          }}
        >
          <span onClick={(e) => { e.stopPropagation(); onVisibilityToggle(d.id) }}
            style={{ cursor: 'pointer', color: d.visible ? '#3b82f6' : '#333', fontSize: '10px' }}>
            {d.visible ? '??' : '?'}
          </span>
          <span style={{ flex: 1 }}>{TOOL_LABELS[d.type] || d.type}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(d.id) }}
            style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: '9px', padding: 0 }}>
            ?
          </button>
        </div>
      ))}
    </div>
  )
}
