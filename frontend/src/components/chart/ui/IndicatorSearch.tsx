import React from 'react'
import { PRESET_INDICATORS } from '../drawings/indicators/IndicatorManager'
import type { IndicatorParams } from '../drawings/indicators/IndicatorManager'

interface IndicatorSearchProps {
  onSelect: (preset: IndicatorParams) => void
  onClose: () => void
  inline?: boolean
  onAddImmediate?: (preset: IndicatorParams) => void
  searchQuery?: string
}

export function IndicatorSearch({ onSelect, onClose, inline, onAddImmediate, searchQuery }: IndicatorSearchProps) {
  const [internalQuery, setInternalQuery] = React.useState('')
  const query = searchQuery !== undefined ? searchQuery : internalQuery
  const setQuery = searchQuery !== undefined ? () => {} : setInternalQuery
  const filtered = query
    ? PRESET_INDICATORS.filter((p) => String(p.name).toLowerCase().includes(query.toLowerCase()) || String(p.description || '').toLowerCase().includes(query.toLowerCase()))
    : PRESET_INDICATORS

  if (inline) {
    return (
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, width: '100%',
      }}>
        <input
          autoFocus
          placeholder="Search indicators..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); (e as any).stopPropagation?.() }}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          style={{
            width: '100%', background: 'transparent', border: 'none', padding: '6px 8px',
            color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', fontSize: 10,
            boxSizing: 'border-box',
          }}
        />
        {query && (
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.slice(0, 12).map((p) => (
              <div key={String(p.id)}
                onClick={() => onAddImmediate ? onAddImmediate(p) : onSelect(p)}
                style={{
                  padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: '1px solid var(--border-color)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: (p as any).color }} />
                <span style={{ flex: 1, color: 'var(--text-primary)' }}>{p.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{p.category || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
            key={String(p.id)}
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
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: (p as any).color, display: 'inline-block' }} />
              <span>{p.name}</span>
            </div>
            <div style={{ color: 'var(--text-secondary, #5d6b7e)', fontSize: '9px', marginTop: '1px' }}>{p.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
