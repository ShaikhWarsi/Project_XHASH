interface ChartSettingsProps {
  onClose: () => void
  chartStyle?: 'candle' | 'line' | 'area'
  onChartStyleChange?: (style: 'candle' | 'line' | 'area') => void
}

export function ChartSettings({ onClose, chartStyle = 'candle', onChartStyleChange }: ChartSettingsProps) {
  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '8px', width: '160px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-primary, #e8eaed)', fontWeight: 600 }}>Chart Settings</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: '10px' }}>?</button>
      </div>

      <label style={{ color: 'var(--text-secondary, #5d6b7e)', display: 'block', fontSize: '10px', marginBottom: '4px' }}>Chart Style</label>
      {(['candle', 'line', 'area'] as const).map((s) => (
        <button
          key={s}
          onClick={() => onChartStyleChange?.(s)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', marginBottom: '2px',
            background: chartStyle === s ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: chartStyle === s ? '#60a5fa' : 'var(--text-secondary, #5d6b7e)',
            border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px',
            textTransform: 'capitalize',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
