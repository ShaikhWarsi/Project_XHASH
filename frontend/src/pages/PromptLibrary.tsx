import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { listPrompts, createPrompt, updatePrompt, deletePrompt, clonePrompt } from '../api/llm'
import { BookTemplate, Plus, Copy, Trash2, Edit3, Search } from 'lucide-react'

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', prompt_text: '', category: 'general', tags: '', is_public: false })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try { const r = await listPrompts(); setPrompts(r.prompts) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const data = { ...form, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) }
      if (editId) await updatePrompt(editId, data)
      else await createPrompt(data)
      setShowCreate(false); setEditId(null); setForm({ name: '', description: '', prompt_text: '', category: 'general', tags: '', is_public: false })
      await fetch()
    } catch {}
    setSaving(false)
  }, [form, editId, fetch])

  const handleDelete = async (id: string) => { await deletePrompt(id); await fetch() }
  const handleClone = async (id: string) => { await clonePrompt(id); await fetch() }
  const handleEdit = (p: any) => { setForm({ name: p.name, description: p.description, prompt_text: p.prompt_text, category: p.category, tags: (p.tags || []).join(', '), is_public: p.is_public }); setEditId(p.id); setShowCreate(true) }

  const filtered = prompts.filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()) : true)

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2"><BookTemplate size={20} /> Prompt Library</h1>
        <button onClick={() => { setShowCreate(true); setEditId(null); setForm({ name: '', description: '', prompt_text: '', category: 'general', tags: '', is_public: false }) }}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">
          <Plus size={14} /> New Prompt
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts..." className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded pl-8 pr-3 py-1.5 text-sm text-primary outline-none" />
      </div>

      {showCreate && (
        <Card title={editId ? 'Edit Prompt' : 'Create Prompt'}>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-muted">Name</label>
                <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-muted">Category</label>
                <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
                  <option value="general">General</option><option value="analysis">Analysis</option><option value="trading">Trading</option><option value="risk">Risk</option><option value="research">Research</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted">Description</label>
              <input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-muted">Prompt Text</label>
              <textarea value={form.prompt_text} onChange={(e) => setForm(p => ({ ...p, prompt_text: e.target.value }))} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm font-mono text-primary outline-none min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-muted">Tags (comma-sep)</label>
                <input value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_public} onChange={(e) => setForm(p => ({ ...p, is_public: e.target.checked }))} />
                  <span className="text-xs text-muted">Public</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.name || !form.prompt_text}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => { setShowCreate(false); setEditId(null) }}
                className="px-3 py-1.5 rounded text-sm font-medium bg-card border border-default text-muted cursor-pointer">Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-xs text-muted">Loading prompts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-muted">{prompts.length === 0 ? 'No prompts yet. Create your first one!' : 'No prompts match your search.'}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p: any) => (
            <Card key={p.id} title={p.name}>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <Badge label={p.category} variant="info" />
                {p.is_public && <Badge label="public" variant="success" />}
                {(p.tags || []).map((t: string) => <Badge key={t} label={t} variant="default" />)}
              </div>
              {p.description && <div className="text-[10px] text-muted mb-1">{p.description}</div>}
              <pre className="text-[9px] font-mono text-primary bg-[var(--bg-hover)] rounded p-1.5 max-h-[80px] overflow-hidden">{p.prompt_text.slice(0, 200)}{p.prompt_text.length > 200 ? '...' : ''}</pre>
              <div className="flex items-center gap-1 mt-1.5">
                <button onClick={() => handleEdit(p)} className="text-muted hover:text-primary bg-transparent border-none cursor-pointer p-0.5"><Edit3 size={12} /></button>
                <button onClick={() => handleClone(p.id)} className="text-muted hover:text-primary bg-transparent border-none cursor-pointer p-0.5"><Copy size={12} /></button>
                <button onClick={() => handleDelete(p.id)} className="text-muted hover:text-accent-red bg-transparent border-none cursor-pointer p-0.5"><Trash2 size={12} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
