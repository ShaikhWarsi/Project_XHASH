import type { DrawingTool } from '../drawings/DrawingTool'
import type { DrawingStyle } from '../DrawingTypes'

interface DrawingPropertiesProps {
  drawing: DrawingTool | null
  onChange: (style: Partial<DrawingStyle>) => void
  onClose: () => void
}

export function DrawingProperties({ drawing, onChange, onClose }: DrawingPropertiesProps) {
  if (!drawing) return null

  const handleChange = (key: keyof DrawingStyle, value: any) => {
    onChange({ [key]: value })
  }

  return (
    <div style={{
      position: 'absolute', top: 30, right: 0, zIndex: 100,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: '4px', padding: '8px', width: '180px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'Inter, sans-serif', fontSize: '11px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-primary, #e8eaed)', fontWeight: 600 }}>Properties</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: '10px' }}>?</button>
      </div>

      <label style={{ color: 'var(--text-secondary, #5d6b7e)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>Color</label>
      <input type="color" value={drawing.style.color}
        onChange={(e) => handleChange('color', e.target.value)}
        style={{ width: '100%', height: '20px', border: 'none', borderRadius: '2px', cursor: 'pointer', marginBottom: '6px' }} />

      <label style={{ color: 'var(--text-secondary, #5d6b7e)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>Width: {drawing.style.width}</label>
      <input type="range" min={1} max={6} value={drawing.style.width}
        onChange={(e) => handleChange('width', Number(e.target.value))}
        style={{ width: '100%', marginBottom: '6px' }} />

      <label style={{ color: 'var(--text-secondary, #5d6b7e)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>Opacity</label>
      <input type="range" min={0.1} max={1} step={0.1} value={drawing.style.opacity}
        onChange={(e) => handleChange('opacity', Number(e.target.value))}
        style={{ width: '100%' }} />
    </div>
  )
}
