import type { IndicatorPreset } from '../drawings/indicators/IndicatorManager'

interface IndicatorParamsProps {
  preset: IndicatorPreset
  params: Record<string, number>
  onChange: (params: Record<string, number>) => void
  onConfirm: () => void
  onCancel: () => void
}

export function IndicatorParams({ preset, params, onChange, onConfirm, onCancel }: IndicatorParamsProps) {
  const paramKeys = Object.keys(preset.defaultParams)

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '8px', width: '200px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <div style={{ color: 'var(--text-primary, #e8eaed)', fontWeight: 600, marginBottom: '6px' }}>{preset.name}</div>
      {paramKeys.map((key) => (
        <div key={key} style={{ marginBottom: '4px' }}>
          <label style={{ color: 'var(--text-secondary, #5d6b7e)', display: 'block', marginBottom: '2px', fontSize: '10px' }}>{key}</label>
          <input
            type="number"
            value={params[key] ?? preset.defaultParams[key]}
            onChange={(e) => onChange({ ...params, [key]: Number(e.target.value) })}
            style={{
              width: '100%', padding: '3px 6px', background: '#1a2332',
              border: '1px solid #2a3a4e', borderRadius: '2px',
              color: '#e8eaed', fontSize: '11px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        <button onClick={onConfirm}
          style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '2px', padding: '3px', cursor: 'pointer', fontSize: '10px' }}>
          Add
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, background: '#1a2332', color: '#5d6b7e', border: '1px solid #2a3a4e', borderRadius: '2px', padding: '3px', cursor: 'pointer', fontSize: '10px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
