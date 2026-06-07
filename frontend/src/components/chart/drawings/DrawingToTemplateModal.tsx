import { useState, useCallback } from 'react'
import { X, Save } from 'lucide-react'

const STORAGE_KEY = 'drawing_templates'

interface DrawingTemplate {
  id: string
  name: string
  type: string
  style: Record<string, unknown>
  points: { x: number; y: number }[]
  createdAt: string
}

interface DrawingToTemplateModalProps {
  type: string
  style: Record<string, unknown>
  points: { x: number; y: number }[]
  onClose: () => void
  onSaved?: () => void
}

export function DrawingToTemplateModal({ type, style, points, onClose, onSaved }: DrawingToTemplateModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Enter a template name'); return }
    const templates: DrawingTemplate[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    templates.push({
      id: Date.now().toString(36),
      name: trimmed,
      type,
      style: style as Record<string, unknown>,
      points,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
    onSaved?.()
    onClose()
  }, [name, type, style, points, onClose, onSaved])

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 100, width: 240,
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 6, padding: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 600 }}>SAVE DRAWING AS TEMPLATE</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={12} />
        </button>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => { setName(e.target.value); setError('') }}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="Template name"
        style={{
          width: '100%', padding: '4px 6px', marginBottom: 6,
          background: 'var(--input-bg)', border: `1px solid ${error ? 'var(--accent-red)' : 'var(--input-border)'}`,
          borderRadius: 3, color: 'var(--text-primary)', fontSize: 10,
          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
      {error && <div style={{ color: 'var(--accent-red)', fontSize: 8, marginBottom: 4 }}>{error}</div>}
      <button onClick={handleSave}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 4,
          background: 'var(--accent-blue)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: 9,
        }}>
        <Save size={10} /> Save Template
      </button>
    </div>
  )
}

export function loadDrawingTemplates(): DrawingTemplate[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
