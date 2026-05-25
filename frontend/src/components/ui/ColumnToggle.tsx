import { useState } from 'react'
import { Columns3 } from 'lucide-react'

interface ColumnDef {
  key: string
  label: string
}

interface ColumnToggleProps {
  columns: ColumnDef[]
  visible: string[]
  onChange: (visible: string[]) => void
}

export default function ColumnToggle({ columns, visible, onChange }: ColumnToggleProps) {
  const [open, setOpen] = useState(false)

  const toggle = (key: string) => {
    if (visible.includes(key)) {
      if (visible.length <= 1) return
      onChange(visible.filter((k) => k !== key))
    } else {
      onChange([...visible, key])
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title="Toggle columns"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          padding: '2px 8px',
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <Columns3 size={10} />
        COLUMNS
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 39 }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              zIndex: 40,
              minWidth: 160,
              padding: 4,
            }}
          >
            {columns.map((col) => (
              <label
                key={col.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: visible.includes(col.key) ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <input
                  type="checkbox"
                  checked={visible.includes(col.key)}
                  onChange={() => toggle(col.key)}
                  style={{ accentColor: 'var(--accent-cyan)' }}
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
