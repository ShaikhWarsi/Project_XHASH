import { useState, useCallback, useEffect } from 'react'
import { Save, FolderOpen, Trash2, X, Check } from 'lucide-react'
import { saveDrawingTemplate, loadDrawingTemplate, deleteDrawingTemplate, listDrawingTemplates } from './DrawingTemplates'
import type { DrawingData } from '../DrawingTypes'

interface DrawingTemplatePanelProps {
  currentDrawings: DrawingData[]
  onApplyTemplate: (drawings: DrawingData[]) => void
  onClose?: () => void
}

export default function DrawingTemplatePanel({ currentDrawings, onApplyTemplate, onClose }: DrawingTemplatePanelProps) {
  const [templates, setTemplates] = useState(listDrawingTemplates())
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const refresh = useCallback(() => {
    setTemplates(listDrawingTemplates())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    const ok = saveDrawingTemplate(trimmed, currentDrawings, desc.trim())
    if (ok) {
      setMessage(`Saved "${trimmed}"`)
      setName('')
      setDesc('')
      setSaving(false)
      refresh()
    } else {
      setMessage(`Template "${trimmed}" already exists`)
    }
    setTimeout(() => setMessage(''), 2000)
  }, [name, desc, currentDrawings, refresh])

  const handleLoad = useCallback((n: string) => {
    const drawings = loadDrawingTemplate(n)
    if (drawings) {
      onApplyTemplate(drawings)
      setMessage(`Loaded "${n}"`)
      onClose?.()
    }
    setTimeout(() => setMessage(''), 2000)
  }, [onApplyTemplate, onClose])

  const handleDelete = useCallback((n: string) => {
    deleteDrawingTemplate(n)
    setConfirmDelete(null)
    refresh()
  }, [refresh])

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 4, padding: 8, width: 240, maxHeight: 300, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 9 }}>DRAWING TEMPLATES</span>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}>✕</button>
        )}
      </div>

      {message && (
        <div style={{ padding: '2px 4px', marginBottom: 4, background: 'rgba(59,130,246,0.1)', borderRadius: 2, color: 'var(--accent-blue)', fontSize: 8, textAlign: 'center' }}>
          {message}
        </div>
      )}

      {!saving ? (
        <button
          onClick={() => setSaving(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            width: '100%', padding: '4px 0', fontSize: 9, fontWeight: 700,
            cursor: 'pointer', border: 'none', borderRadius: 3,
            background: 'var(--accent-cyan)', color: '#000', marginBottom: 6,
          }}
        >
          <Save size={10} /> Save Current Drawings
        </button>
      ) : (
        <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Template name..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 2, padding: '2px 4px', color: 'var(--text-primary)',
              fontSize: 9, fontFamily: 'inherit', outline: 'none', width: '100%',
            }}
          />
          <input value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              borderRadius: 2, padding: '2px 4px', color: 'var(--text-primary)',
              fontSize: 8, fontFamily: 'inherit', outline: 'none', width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={handleSave}
              style={{ flex: 1, padding: '2px 0', fontSize: 8, fontWeight: 700, cursor: 'pointer', border: 'none', borderRadius: 2, background: 'var(--accent-green)', color: '#000' }}>
              <Check size={9} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Save
            </button>
            <button onClick={() => { setSaving(false); setName(''); setDesc('') }}
              style={{ padding: '2px 6px', fontSize: 8, cursor: 'pointer', borderRadius: 2, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
              <X size={9} />
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 8, padding: 8 }}>No saved drawing templates</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {templates.map((t) => (
            <div key={t.name} style={{
              display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', borderRadius: 2,
            }}>
              {confirmDelete === t.name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <span style={{ color: 'var(--accent-red)', fontSize: 8 }}>Delete?</span>
                  <button onClick={() => handleDelete(t.name)} style={{ padding: '1px 4px', fontSize: 7, cursor: 'pointer', border: 'none', borderRadius: 2, background: 'var(--accent-red)', color: '#fff' }}>Yes</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ padding: '1px 4px', fontSize: 7, cursor: 'pointer', borderRadius: 2, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>No</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: 9, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                    {t.description && <div style={{ color: 'var(--text-muted)', fontSize: 7 }}>{t.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 1, opacity: 0.5, transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
                  >
                    <button onClick={() => handleLoad(t.name)} title="Apply template"
                      style={{ padding: '1px 4px', fontSize: 7, cursor: 'pointer', borderRadius: 2, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)' }}>
                      <FolderOpen size={7} />
                    </button>
                    <button onClick={() => setConfirmDelete(t.name)} title="Delete"
                      style={{ padding: '1px 4px', fontSize: 7, cursor: 'pointer', borderRadius: 2, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--accent-red)' }}>
                      <Trash2 size={7} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 7, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
        {`${templates.length} template${templates.length !== 1 ? 's' : ''} saved`}
      </div>
    </div>
  )
}
