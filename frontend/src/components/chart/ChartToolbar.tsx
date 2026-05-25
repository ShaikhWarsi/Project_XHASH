import type { ToolType } from './DrawingTypes'

interface ChartToolbarProps {
  activeTool: ToolType | null
  onToolSelect: (tool: ToolType | null) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  symbol: string
  onSymbolChange?: (symbol: string) => void
  interval: string
  onIntervalChange?: (interval: string) => void
  onIndicatorAdd?: () => void
}

const TOOLS: { type: ToolType | null; label: string; icon: string }[] = [
  { type: null, label: 'Cursor', icon: '?' },
  { type: 'crosshair', label: 'Crosshair', icon: '?' },
  { type: null, label: '|', icon: '' },
  { type: 'trendline', label: 'Trend Line', icon: '?' },
  { type: 'ray', label: 'Ray', icon: '?' },
  { type: 'extended_line', label: 'Extended', icon: '-' },
  { type: 'horizontal_line', label: 'Horizontal', icon: '?' },
  { type: 'vertical_line', label: 'Vertical', icon: '?' },
  { type: null, label: '|', icon: '' },
  { type: 'fib_retracement', label: 'Fib Retrace', icon: 'F' },
  { type: 'fib_extension', label: 'Fib Ext', icon: 'F+' },
  { type: 'fib_timezone', label: 'Fib Time', icon: 'FT' },
  { type: null, label: '|', icon: '' },
  { type: 'rectangle', label: 'Rectangle', icon: '?' },
  { type: 'ellipse', label: 'Ellipse', icon: '?' },
  { type: 'triangle', label: 'Triangle', icon: '?' },
  { type: 'parallelogram', label: 'Parallelogram', icon: '?' },
  { type: 'channel', label: 'Channel', icon: '?' },
  { type: null, label: '|', icon: '' },
  { type: 'text_label', label: 'Text', icon: 'T' },
  { type: 'arrow', label: 'Arrow', icon: '?' },
  { type: 'brush', label: 'Brush', icon: '?' },
  { type: 'gann_fan', label: 'Gann Fan', icon: '?' },
  { type: null, label: '|', icon: '' },
  { type: 'long_marker', label: 'Long Entry', icon: '?' },
  { type: 'short_marker', label: 'Short Entry', icon: '?' },
]

export function ChartToolbar({
  activeTool, onToolSelect, onUndo, onRedo, canUndo, canRedo,
  symbol, interval, onIndicatorAdd,
}: ChartToolbarProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '2px 4px', background: 'var(--bg-card, #0d1117)',
      borderBottom: '1px solid var(--border-color, #1a2332)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
      overflowX: 'auto', whiteSpace: 'nowrap',
      minHeight: '28px',
    }}>
      <span style={{ color: 'var(--text-secondary, #5d6b7e)', fontSize: '10px', marginRight: '4px' }}>{symbol}</span>
      <span style={{ color: 'var(--accent-cyan, #3b82f6)', fontSize: '10px', marginRight: '8px' }}>{interval}</span>

      <div style={{ width: '1px', height: '14px', background: '#1a2332', margin: '0 4px' }} />

      {TOOLS.map((tool, i) => {
        if (tool.label === '|') {
          return <div key={i} style={{ width: '1px', height: '14px', background: '#1a2332', margin: '0 2px' }} />
        }
        const isActive = activeTool === tool.type
        return (
          <button
            key={tool.label}
            onClick={() => onToolSelect(tool.type)}
            title={tool.label}
            style={{
              background: isActive ? 'var(--accent-cyan, #3b82f6)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary, #5d6b7e)',
              border: 'none', borderRadius: '2px',
              padding: '2px 5px', cursor: 'pointer',
              fontSize: '11px', lineHeight: '1',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {tool.icon || tool.label[0]}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <button onClick={onIndicatorAdd} title="Add Indicator"
        style={{ background: 'transparent', color: '#5d6b7e', border: '1px solid #1a2332', borderRadius: '2px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px' }}>
        Indicators
      </button>

      <button onClick={onUndo} disabled={!canUndo} title="Undo"
        style={{ background: 'transparent', color: canUndo ? '#5d6b7e' : '#333', border: 'none', borderRadius: '2px', padding: '2px 5px', cursor: canUndo ? 'pointer' : 'default', fontSize: '11px' }}>
        ?
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo"
        style={{ background: 'transparent', color: canRedo ? '#5d6b7e' : '#333', border: 'none', borderRadius: '2px', padding: '2px 5px', cursor: canRedo ? 'pointer' : 'default', fontSize: '11px' }}>
        ?
      </button>
    </div>
  )
}
