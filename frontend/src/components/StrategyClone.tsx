import { useState } from 'react'

interface Strategy {
  id: string
  name: string
  config: any
}

interface StrategyCloneProps {
  strategies: Strategy[]
  onClone: (id: string, newName: string) => void
}

const fieldStyles: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  width: '100%',
}

export default function StrategyClone({ strategies, onClone }: StrategyCloneProps) {
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const handleClone = (id: string) => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onClone(id, trimmed)
    setNewName('')
    setCloningId(null)
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: 4 }}>
      {strategies.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 10, padding: '8px 0', textAlign: 'center' }}>
          No strategies available
        </div>
      )}
      {strategies.map((s) => (
        <div
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>
            {s.name}
          </span>

          {cloningId === s.id ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, marginLeft: 12 }}>
              <input
                autoFocus
                placeholder="New strategy name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClone(s.id); if (e.key === 'Escape') { setCloningId(null); setNewName('') } }}
                style={fieldStyles}
              />
              <button
                onClick={() => handleClone(s.id)}
                style={{
                  background: 'var(--accent-cyan)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: 'nowrap',
                }}
              >
                Clone
              </button>
              <button
                onClick={() => { setCloningId(null); setNewName('') }}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setCloningId(s.id); setNewName(`${s.name} (copy)`) }}
              style={{
                background: 'transparent',
                color: 'var(--accent-cyan)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: 9,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Clone
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
