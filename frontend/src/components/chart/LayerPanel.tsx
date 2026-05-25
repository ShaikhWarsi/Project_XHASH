import { Eye, EyeOff, ChevronUp, ChevronDown, Layers } from 'lucide-react'

export interface ChartLayer {
  id: string
  name: string
  type: 'candle' | 'volume' | 'indicator' | 'drawing' | 'annotation'
  visible: boolean
  opacity: number
  order: number
  refType: string
}

interface LayerPanelProps {
  layers: ChartLayer[]
  onVisibilityToggle: (id: string) => void
  onOpacityChange: (id: string, opacity: number) => void
  onReorder: (id: string, direction: 'up' | 'down') => void
  onClose?: () => void
}

const LAYER_ICONS: Record<string, string> = {
  candle: '?', volume: '_', indicator: '~', drawing: '?', annotation: '??',
}

const LAYER_LABELS: Record<string, string> = {
  trendline: 'Trend Line', ray: 'Ray', extended_line: 'Extended Line',
  horizontal_line: 'Horizontal Line', vertical_line: 'Vertical Line',
  fib_retracement: 'Fib Retracement', fib_extension: 'Fib Extension',
  fib_timezone: 'Fib Time Zone', rectangle: 'Rectangle', ellipse: 'Ellipse',
  triangle: 'Triangle', parallelogram: 'Parallelogram', channel: 'Channel',
  text_label: 'Text', arrow: 'Arrow', brush: 'Brush', gann_fan: 'Gann Fan',
  long_marker: 'Long', short_marker: 'Short',
}

export default function LayerPanel({ layers, onVisibilityToggle, onOpacityChange, onReorder, onClose }: LayerPanelProps) {
  if (layers.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card, #0d1117)',
        border: '1px solid var(--border-color, #1a2332)',
        borderRadius: 4, padding: 8,
        fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
        color: '#5d6b7e', minWidth: 180,
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: '#8b95a5', marginBottom: 4 }}>LAYERS</div>
        <div style={{ textAlign: 'center', padding: 12, color: '#333' }}>No layers</div>
      </div>
    )
  }

  const sorted = [...layers].sort((a, b) => a.order - b.order)

  return (
    <div style={{
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 4, padding: 4,
      fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
      maxHeight: 280, overflowY: 'auto', minWidth: 200,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '2px 4px', borderBottom: '1px solid #1a2332', marginBottom: 2,
        color: '#8b95a5', fontSize: 9, fontWeight: 600,
      }}>
        <span><Layers size={10} style={{ marginRight: 4 }} />LAYERS ({layers.length})</span>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: 9 }}>?</button>}
      </div>

      {sorted.map((layer) => (
        <div key={layer.id} style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '2px 4px', borderRadius: 2,
          borderBottom: '1px solid rgba(26,35,50,0.5)',
          opacity: layer.visible ? 1 : 0.4,
        }}>
          <button onClick={() => onVisibilityToggle(layer.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: layer.visible ? '#3b82f6' : '#333', padding: 0, fontSize: 10 }}>
            {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
          </button>

          <span style={{ color: '#5d6b7e', width: 12, textAlign: 'center', fontSize: 11 }}>
            {LAYER_ICONS[layer.type] || '?'}
          </span>

          <span style={{ flex: 1, color: 'var(--text-primary, #e8eaed)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {layer.type === 'drawing' ? (LAYER_LABELS[layer.refType] || layer.name) : layer.name}
          </span>

          <input type="range" min={0} max={1} step={0.05} value={layer.opacity}
            onChange={(e) => onOpacityChange(layer.id, Number(e.target.value))}
            style={{ width: 40, height: 2, accentColor: '#3b82f6', cursor: 'pointer' }} />

          <span style={{ fontSize: 8, color: '#5d6b7e', width: 22, textAlign: 'right' }}>
            {Math.round(layer.opacity * 100)}%
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <button onClick={() => onReorder(layer.id, 'up')} disabled={layer.order === 0}
              style={{ background: 'none', border: 'none', cursor: layer.order === 0 ? 'default' : 'pointer', padding: 0, color: layer.order === 0 ? '#1a2332' : '#5d6b7e', lineHeight: 1 }}>
              <ChevronUp size={8} />
            </button>
            <button onClick={() => onReorder(layer.id, 'down')} disabled={layer.order === layers.length - 1}
              style={{ background: 'none', border: 'none', cursor: layer.order === layers.length - 1 ? 'default' : 'pointer', padding: 0, color: layer.order === layers.length - 1 ? '#1a2332' : '#5d6b7e', lineHeight: 1 }}>
              <ChevronDown size={8} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
