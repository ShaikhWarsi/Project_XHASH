import React from 'react'

interface CompareSymbolProps {
  onCompare: (symbol: string) => void
  onClose: () => void
}

export function CompareSymbol({ onCompare, onClose }: CompareSymbolProps) {
  const [input, setInput] = React.useState('')

  const handleSubmit = () => {
    if (input.trim()) {
      onCompare(input.trim().toUpperCase())
      setInput('')
    }
  }

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '6px', width: '180px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <div style={{ color: 'var(--text-primary, #e8eaed)', marginBottom: '4px' }}>Compare Symbol</div>
      <input
        autoFocus
        placeholder="AAPL"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        style={{
          width: '100%', padding: '4px 6px', background: '#1a2332',
          border: '1px solid #2a3a4e', borderRadius: '2px',
          color: '#e8eaed', fontSize: '11px', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button onClick={handleSubmit}
          style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '2px', padding: '2px', cursor: 'pointer', fontSize: '10px' }}>
          Add
        </button>
        <button onClick={onClose}
          style={{ flex: 1, background: '#1a2332', color: '#5d6b7e', border: '1px solid #2a3a4e', borderRadius: '2px', padding: '2px', cursor: 'pointer', fontSize: '10px' }}>
          Close
        </button>
      </div>
    </div>
  )
}
