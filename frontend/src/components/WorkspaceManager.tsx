import { useState } from 'react'
import { Save, FolderOpen, Trash2, Check, X } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'

export default function WorkspaceManager() {
  const { workspaces, currentWorkspace, saveWorkspace, loadWorkspace, deleteWorkspace, listWorkspaces } = useWorkspace()
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)
  const wsList = listWorkspaces()

  const handleSave = () => {
    if (!newName.trim()) return
    saveWorkspace(newName.trim())
    setNewName('')
    setShowNew(false)
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
      }}
      className="overflow-hidden"
    >
      <div
        style={{
          padding: 'var(--card-padding)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Workspace Manager
        </h3>
      </div>
      <div style={{ padding: 'var(--card-padding)' }} className="space-y-2">
        <div className="space-y-1">
          {wsList.length === 0 && (
            <div
              style={{
                textAlign: 'center', padding: 16,
                color: 'var(--text-muted)', fontSize: '12px',
              }}
            >
              No saved workspaces
            </div>
          )}
          {wsList.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between p-2 rounded-lg transition-colors"
              style={{
                background: name === currentWorkspace ? 'var(--accent-blue)10' : 'var(--bg-hover)',
                border: `1px solid ${name === currentWorkspace ? 'var(--accent-blue)30' : 'transparent'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen
                  className="w-4 h-4"
                  style={{
                    color: name === currentWorkspace ? 'var(--accent-blue)' : 'var(--text-muted)',
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: name === currentWorkspace ? 600 : 400,
                    color: 'var(--text-primary)',
                  }}
                >
                  {name}
                  {name === currentWorkspace && (
                    <span
                      style={{
                        color: 'var(--accent-blue)',
                        marginLeft: 6, fontSize: '10px',
                      }}
                    >
                      (active)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => loadWorkspace(name)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--accent-blue)', cursor: 'pointer', padding: 4,
                  }}
                  title="Load workspace"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteWorkspace(name)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--accent-red)', cursor: 'pointer', padding: 4,
                  }}
                  title="Delete workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showNew ? (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Workspace name..."
              style={{
                flex: 1,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <button
              onClick={handleSave}
              style={{
                background: 'var(--accent-green)',
                color: '#fff', border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px', cursor: 'pointer',
              }}
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNew(false)}
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px', cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 justify-center w-full"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-primary)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px', fontSize: '12px', cursor: 'pointer',
            }}
          >
            <Save className="w-4 h-4" />
            Save Current Workspace
          </button>
        )}

        {currentWorkspace && workspaces[currentWorkspace] && (
          <div
            style={{
              fontSize: '10px', color: 'var(--text-muted)',
              textAlign: 'center', paddingTop: 8,
              borderTop: '1px solid var(--border-color)',
            }}
          >
            Last saved: {new Date(workspaces[currentWorkspace].savedAt).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}
