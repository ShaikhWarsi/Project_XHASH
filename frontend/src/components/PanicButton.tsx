import { useState } from 'react'

interface Props {
  onFlatten: () => Promise<void>
  disabled?: boolean
}

export default function PanicButton({ onFlatten, disabled }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePanic = async () => {
    setLoading(true)
    try {
      await onFlatten()
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
        background: 'rgba(239,68,68,0.1)',
        border: '2px solid #ef4444',
        borderRadius: 6, padding: 8, width: 220,
      }}>
        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>
          ⚠ FLATTEN ALL POSITIONS?
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 8 }}>
          This will immediately close ALL open positions at market price. This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            style={{
              flex: 1, padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePanic}
            disabled={loading}
            style={{
              flex: 1, padding: '4px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer',
              background: loading ? 'rgba(239,68,68,0.5)' : '#ef4444',
              border: 'none', color: '#fff', fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {loading ? 'Flattening...' : 'FLATTEN'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title="Flatten all positions"
      style={{
        padding: '6px 12px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer',
        background: disabled ? 'rgba(239,68,68,0.2)' : '#ef4444',
        border: 'none', color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
        fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1,
      }}
    >
      🛑 PANIC
    </button>
  )
}
