import { useState, useCallback, useEffect } from 'react'
import { Save, FolderOpen, Trash2, X, Check } from 'lucide-react'

const STORAGE_KEY = 'chart_templates'

interface Template {
  id: string
  name: string
  config: any
  createdAt: string
}

interface ChartTemplatesProps {
  currentConfig: any
  onLoadConfig: (config: any) => void
}

function loadTemplates(): Template[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export default function ChartTemplates({ currentConfig, onLoadConfig }: ChartTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { saveTemplates(templates) }, [templates])

  const handleSave = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed || !currentConfig) return
    const t: Template = {
      id: Date.now().toString(36),
      name: trimmed,
      config: currentConfig,
      createdAt: new Date().toISOString(),
    }
    setTemplates((prev) => [t, ...prev])
    setName('')
    setSaving(false)
  }, [name, currentConfig])

  const handleDelete = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setConfirmDelete(null)
  }, [])

  return (
    <div className="font-mono-data">
      <div className="mb-2">
        {!saving ? (
          <button
            onClick={() => setSaving(true)}
            className="flex items-center justify-center gap-1.5 w-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-none rounded-sm bg-accent-cyan text-black"
          >
            <Save className="w-3 h-3" />
            Save Current
          </button>
        ) : (
          <div className="flex gap-1.5 items-center">
            <input
              autoFocus
              placeholder="Template name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
              className="flex-1 px-2.5 py-1.5 text-[11px] font-mono-data rounded-sm outline-none bg-input border border-default text-primary"
            />
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold cursor-pointer border-none rounded-sm whitespace-nowrap text-black"
              style={{ background: 'var(--accent-green)' }}
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => { setSaving(false); setName('') }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer rounded-sm bg-transparent text-muted border border-default"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {templates.length === 0 && (
          <div className="text-muted text-[10px] py-2 text-center">No saved templates</div>
        )}
        {templates.map((t) => (
          <div
            key={t.id}
            className={`flex items-center justify-between px-2 py-1.5 rounded-sm gap-1.5 group transition-colors ${
              confirmDelete === t.id ? 'bg-hover' : ''
            }`}
            onMouseEnter={(e) => { if (confirmDelete !== t.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { if (confirmDelete !== t.id) e.currentTarget.style.background = 'transparent' }}
          >
            {confirmDelete === t.id ? (
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-[10px] text-down">Delete?</span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-2 py-0.5 text-[9px] font-bold cursor-pointer border-none rounded-sm text-white"
                  style={{ background: 'var(--accent-red)' }}
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-2 py-0.5 text-[9px] cursor-pointer rounded-sm bg-transparent text-muted border border-default"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <span className="text-primary text-[11px] flex-1 truncate">{t.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onLoadConfig(t.config)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold cursor-pointer rounded-sm bg-transparent text-accent-cyan border border-accent-cyan"
                  >
                    <FolderOpen className="w-2.5 h-2.5" />
                    Load
                  </button>
                  <button
                    onClick={() => setConfirmDelete(t.id)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold cursor-pointer rounded-sm bg-transparent text-down border border-down"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
