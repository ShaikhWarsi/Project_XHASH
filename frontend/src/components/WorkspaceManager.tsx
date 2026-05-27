import { useState, useEffect, useCallback } from 'react'
import { useToastStore } from '../store/toast'
import { Save, FolderOpen, X, Search } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

interface WorkspaceSummary {
  id: string
  name: string
  symbol: string
  interval: string
  updated_at: string
  drawing_count: number
  indicator_count: number
}

interface WorkspaceManagerProps {
  currentConfig: any
  onLoadConfig: (config: any) => void
  onClose: () => void
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function WorkspaceManager({ currentConfig, onLoadConfig, onClose }: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const [search, setSearch] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/workspace/`)
      const data = await res.json()
      setWorkspaces(data.workspaces ?? [])
    } catch {
      addToast('Failed to load workspaces', 'error')
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => {
    loadList()
  }, [loadList])

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) {
      addToast('Enter a workspace name', 'error')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/workspace/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentConfig, name: saveName.trim() }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      addToast(`Saved "${data.name}"`, 'success')
      setShowSave(false)
      setSaveName('')
      loadList()
    } catch (e: any) {
      addToast(e?.message ?? 'Failed to save workspace', 'error')
    }
  }, [saveName, currentConfig, addToast, loadList])

  const handleLoad = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/workspace/${id}`)
      if (!res.ok) throw new Error('Load failed')
      const data = await res.json()
      onLoadConfig(data)
      addToast(`Loaded "${data.name}"`, 'success')
      onClose()
    } catch (e: any) {
      addToast(e?.message ?? 'Failed to load workspace', 'error')
    }
  }, [onLoadConfig, addToast, onClose])

  const handleDelete = useCallback(async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/workspace/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      addToast(`Deleted "${name}"`, 'success')
      loadList()
    } catch (e: any) {
      addToast(e?.message ?? 'Failed to delete workspace', 'error')
    }
  }, [addToast, loadList])

  const filtered = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '80vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)', borderRadius: 4,
          display: 'flex', flexDirection: 'column',
          fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
              WORKSPACES
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => { setShowSave(true); setSaveName('') }}
              style={{
                background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
                border: '1px solid var(--accent-blue)',
                color: 'var(--accent-blue)', cursor: 'pointer',
                padding: '2px 8px', fontSize: 9, borderRadius: 2,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Save size={9} />Save Current
            </button>
            <button onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px',
              }}>
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Save inline */}
        {showSave && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-sidebar)',
          }}>
            <input
              type="text" value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter workspace name..."
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              style={{
                flex: 1, background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 2,
                padding: '3px 6px', fontSize: 10,
                color: 'var(--text-primary)', outline: 'none',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <button onClick={handleSave}
              style={{
                background: 'var(--accent-blue)', border: 'none', color: '#fff',
                cursor: 'pointer', padding: '3px 10px', fontSize: 9, borderRadius: 2,
              }}>
              Save
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderBottom: '1px solid var(--border-color)',
        }}>
          <Search size={10} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter workspaces..."
            style={{
              flex: 1, background: 'transparent', border: 'none',
              fontSize: 10, color: 'var(--text-primary)', outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 10 }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: 32, gap: 12,
            }}>
              <FolderOpen size={24} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {search ? 'No workspaces match your filter' : 'No saved workspaces'}
              </div>
              {!search && (
                <button
                  onClick={() => { setShowSave(true); setSaveName('') }}
                  style={{
                    background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
                    border: '1px solid var(--accent-blue)',
                    color: 'var(--accent-blue)', cursor: 'pointer',
                    padding: '4px 12px', fontSize: 9, borderRadius: 2,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Save size={9} />Save Current Layout
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8,
            }}>
              {filtered.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => handleLoad(ws.id)}
                  className="workspace-card"
                  style={{
                    position: 'relative', border: '1px solid var(--border-color)',
                    borderRadius: 4, background: 'var(--bg-primary)',
                    cursor: 'pointer', overflow: 'hidden',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)'
                    const overlay = e.currentTarget.querySelector('.workspace-hover-overlay') as HTMLElement
                    if (overlay) overlay.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                    const overlay = e.currentTarget.querySelector('.workspace-hover-overlay') as HTMLElement
                    if (overlay) overlay.style.opacity = '0'
                  }}
                >
                  {/* Gradient accent bar */}
                  <div style={{ height: 3, background: 'var(--accent-cyan)' }} />

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ws.id, ws.name) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.5)', border: 'none',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      padding: 2, borderRadius: 2, lineHeight: 1, zIndex: 2,
                    }}
                  >
                    <X size={8} />
                  </button>

                  {/* Content */}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: 'var(--text-primary)',
                      marginBottom: 6, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ws.name}
                    </div>

                    <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                        background: 'color-mix(in srgb, var(--accent-blue) 10%, transparent)',
                        color: 'var(--accent-blue)', padding: '1px 4px', borderRadius: 2,
                      }}>
                        {ws.symbol}
                      </span>
                      <span style={{
                        fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                        background: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                        color: 'var(--accent-purple)', padding: '1px 4px', borderRadius: 2,
                      }}>
                        {ws.interval}
                      </span>
                    </div>

                    <div style={{ fontSize: 8, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {relativeTime(ws.updated_at)}
                    </div>

                    <div style={{ display: 'flex', gap: 8, fontSize: 8, color: 'var(--text-secondary)' }}>
                      {ws.drawing_count > 0 && <span>{ws.drawing_count} drawing{ws.drawing_count !== 1 ? 's' : ''}</span>}
                      {ws.indicator_count > 0 && <span>{ws.indicator_count} indicator{ws.indicator_count !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div
                    className="workspace-hover-overlay"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.15s', zIndex: 1,
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLoad(ws.id) }}
                      style={{
                        background: 'var(--accent-blue)', border: 'none', color: '#fff',
                        cursor: 'pointer', padding: '4px 12px', fontSize: 9,
                        borderRadius: 2, fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
