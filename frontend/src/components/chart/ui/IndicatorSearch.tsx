import React from 'react'
import { PRESET_INDICATORS } from '../drawings/indicators/IndicatorManager'
import type { IndicatorPreset } from '../drawings/indicators/IndicatorManager'

interface IndicatorSearchProps {
  onSelect: (preset: IndicatorPreset) => void
  onClose: () => void
}

export function IndicatorSearch({ onSelect }: IndicatorSearchProps) {
  const [query, setQuery] = React.useState('')
  const filtered = query
    ? PRESET_INDICATORS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()))
    : PRESET_INDICATORS

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', width: '220px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <input
        autoFocus
        placeholder="Search indicators..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%', padding: '6px 8px', background: '#1a2332',
          border: 'none', borderBottom: '1px solid #1a2332',
          color: '#e8eaed', fontSize: '11px', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              padding: '4px 8px', cursor: 'pointer',
              borderBottom: '1px solid #1a2332',
              color: 'var(--text-primary, #e8eaed)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              <span>{p.name}</span>
            </div>
            <div style={{ color: 'var(--text-secondary, #5d6b7e)', fontSize: '9px', marginTop: '1px' }}>{p.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
