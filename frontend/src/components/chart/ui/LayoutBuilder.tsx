import { useState } from 'react'

type LayoutMode = 'single' | '2x1' | '1x2' | '2x2'

interface LayoutBuilderProps {
  currentLayout: LayoutMode
  onLayoutChange: (layout: LayoutMode) => void
  onClose: () => void
  cellSymbols?: string[]
  onCellSymbolChange?: (index: number, symbol: string) => void
  mainSymbol?: string
}

const GRID_OPTIONS: { id: LayoutMode; label: string; cols: number; rows: number; cells: number }[] = [
  { id: 'single', label: 'Single', cols: 1, rows: 1, cells: 1 },
  { id: '2x1', label: '2 Vertical', cols: 2, rows: 1, cells: 2 },
  { id: '1x2', label: '2 Horizontal', cols: 1, rows: 2, cells: 2 },
  { id: '2x2', label: '4 Grid', cols: 2, rows: 2, cells: 4 },
]

export function LayoutBuilder({ currentLayout, onLayoutChange, onClose, cellSymbols, onCellSymbolChange, mainSymbol }: LayoutBuilderProps) {
  const [editingCell, setEditingCell] = useState<number | null>(null)

  const currentOption = GRID_OPTIONS.find((o) => o.id === currentLayout) ?? GRID_OPTIONS[0]

  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '8px', width: '200px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-primary, #e8eaed)', fontWeight: 600 }}>Layout</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: '10px' }}>✕</button>
      </div>

      {GRID_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onLayoutChange(opt.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px', marginBottom: '2px',
            background: currentLayout === opt.id ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: currentLayout === opt.id ? '#60a5fa' : 'var(--text-secondary, #5d6b7e)',
            border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px',
          }}
        >
          {opt.label} ({opt.cols}x{opt.rows})
        </button>
      ))}

      <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color, #1a2332)', paddingTop: '6px' }}>
        <div style={{ color: 'var(--text-muted, #5d6b7e)', fontSize: '9px', marginBottom: '4px', fontWeight: 600 }}>
          CELL SYMBOLS
        </div>
        {Array.from({ length: currentOption.cells }, (_, i) => {
          const sym = cellSymbols?.[i] || mainSymbol || ''
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-muted, #5d6b7e)', fontSize: '9px', width: '14px', flexShrink: 0 }}>
                {i + 1}
              </span>
              {editingCell === i ? (
                <input
                  autoFocus
                  value={sym}
                  onChange={(e) => onCellSymbolChange?.(i, e.target.value.toUpperCase())}
                  onBlur={() => setEditingCell(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                  style={{
                    flex: 1, background: 'var(--bg-primary, #0a0e14)',
                    border: '1px solid var(--border-color, #1a2332)',
                    borderRadius: '2px', padding: '1px 4px',
                    color: 'var(--text-primary, #e8eaed)',
                    fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
                    outline: 'none', width: '100px',
                  }}
                />
              ) : (
                <span
                  onClick={() => setEditingCell(i)}
                  style={{
                    flex: 1, color: sym ? 'var(--accent-blue, #3b82f6)' : 'var(--text-muted, #5d6b7e)',
                    fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
                    cursor: 'pointer', padding: '1px 4px',
                  }}
                >
                  {sym || 'default'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
