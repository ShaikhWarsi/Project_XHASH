import { useState, useEffect, useCallback } from 'react'
import { useToastStore } from '../store/toast'
import { Save, FolderOpen, Trash2, X } from 'lucide-react'

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

export default function WorkspaceManager({ currentConfig, onLoadConfig, onClose }: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/workspace/`)
      const data = await res.json()
      setWorkspaces(data.workspaces ?? [])
    } catch (e: any) {
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

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 4,
      padding: 8,
      fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: 280,
      maxHeight: 320,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 6, borderBottom: '1px solid var(--border-color)',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#8b95a5' }}>
          <FolderOpen size={10} style={{ marginRight: 4 }} />WORKSPACES
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowSave(!showSave)}
            style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6',
              color: '#3b82f6', cursor: 'pointer', padding: '1px 6px',
              fontSize: 9, borderRadius: 2,
            }}>
            <Save size={9} style={{ marginRight: 2 }} />Save
          </button>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: 9 }}>
            <X size={10} />
          </button>
        </div>
      </div>

      {showSave && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 6, padding: 4, background: 'var(--bg-primary)', borderRadius: 2 }}>
          <input type="text" value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Workspace name..."
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={{
              flex: 1, background: 'transparent', border: '1px solid var(--border-color)',
              borderRadius: 2, padding: '2px 4px', fontSize: 9,
              color: 'var(--text-primary)', outline: 'none',
              fontFamily: 'JetBrains Mono, monospace',
            }} />
          <button onClick={handleSave}
            style={{
              background: '#3b82f6', border: 'none', color: '#fff',
              cursor: 'pointer', padding: '2px 8px', fontSize: 9, borderRadius: 2,
            }}>
            Save
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 12, color: '#5d6b7e', fontSize: 9 }}>Loading...</div>
        ) : workspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 12, color: '#5d6b7e', fontSize: 9 }}>No saved workspaces</div>
        ) : (
          workspaces.map((ws) => (
            <div key={ws.id} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 6px', borderRadius: 2,
              borderBottom: '1px solid rgba(26,35,50,0.5)',
              cursor: 'pointer',
            }}
              onClick={() => handleLoad(ws.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.03))')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </span>
              <span style={{ color: '#5d6b7e', fontSize: 8 }}>{ws.symbol}</span>
              <span style={{ color: '#5d6b7e', fontSize: 8 }}>{ws.interval}</span>
              <span style={{ color: '#5d6b7e', fontSize: 8 }}>
                {ws.drawing_count > 0 && `${ws.drawing_count}d `}
                {ws.indicator_count > 0 && `${ws.indicator_count}i`}
              </span>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(ws.id, ws.name) }}
                style={{ background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', padding: 0, fontSize: 9 }}>
                <Trash2 size={9} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
