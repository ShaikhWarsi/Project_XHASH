interface LayoutBuilderProps {
  currentLayout: 'single' | '2x1' | '1x2' | '2x2'
  onLayoutChange: (layout: 'single' | '2x1' | '1x2' | '2x2') => void
  onClose: () => void
}

export function LayoutBuilder({ currentLayout, onLayoutChange, onClose }: LayoutBuilderProps) {
  const layouts: { id: 'single' | '2x1' | '1x2' | '2x2'; label: string; cols: number; rows: number }[] = [
    { id: 'single', label: 'Single', cols: 1, rows: 1 },
    { id: '2x1', label: '2 Vertical', cols: 2, rows: 1 },
    { id: '1x2', label: '2 Horizontal', cols: 1, rows: 2 },
    { id: '2x2', label: '4 Grid', cols: 2, rows: 2 },
  ]

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
        <span style={{ color: 'var(--text-primary, #e8eaed)', fontWeight: 600 }}>Layout</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: '10px' }}>?</button>
      </div>
      {layouts.map((l) => (
        <button
          key={l.id}
          onClick={() => { onLayoutChange(l.id); onClose() }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '4px 6px', marginBottom: '2px',
            background: currentLayout === l.id ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: currentLayout === l.id ? '#60a5fa' : 'var(--text-secondary, #5d6b7e)',
            border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '10px',
          }}
        >
          {l.label} ({l.cols}x{l.rows})
        </button>
      ))}
    </div>
  )
}
