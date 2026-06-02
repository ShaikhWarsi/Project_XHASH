import { type JSX } from 'react'

export interface LayoutPreset {
  name: string
  grid: 'single' | '2x1' | '1x2' | '2x2' | '3+1' | 'focus' | 'scanner'
  ratios?: number[]
}

interface LayoutPresetsProps {
  active: string
  onSelect: (preset: LayoutPreset) => void
  presets?: LayoutPreset[]
}

const DEFAULT_PRESETS: LayoutPreset[] = [
  { name: 'Single', grid: 'single' },
  { name: '2 Grid', grid: '2x1' },
  { name: 'Stack', grid: '1x2' },
  { name: '4 Grid', grid: '2x2' },
  { name: '3+1', grid: '3+1' },
  { name: 'Focus', grid: 'focus', ratios: [3, 1] },
  { name: 'Scanner', grid: 'scanner' },
]

function GridIcon({ grid }: { grid: LayoutPreset['grid'] }): JSX.Element {
  const cell = (key: string, style: React.CSSProperties) => (
    <div key={key} style={{ background: 'var(--accent-cyan)', opacity: 0.6, borderRadius: 1, ...style }} />
  )

  const container: React.CSSProperties = {
    display: 'grid',
    gap: 1,
    width: 14,
    height: 10,
    flexShrink: 0,
  }

  switch (grid) {
    case 'single':
      return <div style={container}>{cell('a', { gridColumn: '1/-1', gridRow: '1/-1' })}</div>
    case '2x1':
      return <div style={{ ...container, gridTemplateColumns: '1fr 1fr' }}>{cell('a', {})}{cell('b', {})}</div>
    case '1x2':
      return <div style={{ ...container, gridTemplateRows: '1fr 1fr' }}>{cell('a', {})}{cell('b', {})}</div>
    case '2x2':
      return (
        <div style={{ ...container, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
          {cell('a', {})}{cell('b', {})}{cell('c', {})}{cell('d', {})}
        </div>
      )
    case '3+1':
      return (
        <div style={{ ...container, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
          {cell('a', { gridRow: '1/3' })}
          {cell('b', {})}
          {cell('c', {})}
          {cell('d', {})}
        </div>
      )
    case 'focus':
      return (
        <div style={{ ...container, gridTemplateRows: '3fr 1fr' }}>
          {cell('a', {})}
          {cell('b', {})}
        </div>
      )
    case 'scanner':
      return (
        <div style={{ ...container, gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
          {cell('a', {})}
          {cell('b', {})}
          {cell('c', {})}
          {cell('d', {})}
          {cell('e', { gridColumn: '1/3' })}
        </div>
      )
  }
}

export function LayoutPresets({ active, onSelect, presets = DEFAULT_PRESETS }: LayoutPresetsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 24,
        padding: '0 4px',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {presets.map((p) => {
        const isActive = active === p.grid
        return (
          <button
            key={p.grid}
            onClick={() => onSelect(p)}
            className="flex items-center gap-1 shrink-0 font-mono-data"
            style={{
              height: 20,
              padding: '0 6px',
              background: isActive ? 'var(--accent-cyan)' : 'transparent',
              color: isActive ? '#000' : 'var(--text-muted)',
              border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: isActive ? 700 : 400,
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }
            }}
          >
            <GridIcon grid={p.grid} />
            {p.name}
          </button>
        )
      })}
    </div>
  )
}
