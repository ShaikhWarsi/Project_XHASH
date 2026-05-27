import { useState, useEffect } from 'react'
import { Search, Plus, X, FlaskConical, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface Hypothesis {
  id: string
  title: string
  description: string
  status: 'draft' | 'active' | 'testing' | 'validated' | 'rejected'
  createdAt: string
  updatedAt: string
  tags: string[]
  results?: {
    sharpe: number
    maxDrawdown: number
    totalReturn: number
  }
}

const STORAGE_KEY = 'te_hypotheses'

function loadHypotheses(): Hypothesis[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveHypotheses(h: Hypothesis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h))
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'var(--text-muted)',
  active: 'var(--accent-blue)',
  testing: 'var(--accent-purple)',
  validated: 'var(--accent-green)',
  rejected: 'var(--accent-red)',
}

export default function ResearchHub() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>(loadHypotheses)
  const [selected, setSelected] = useState<Hypothesis | null>(null)
  const [filter, setFilter] = useState<Hypothesis['status'] | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { saveHypotheses(hypotheses) }, [hypotheses])

  const filtered = hypotheses.filter((h) => {
    if (filter !== 'all' && h.status !== filter) return false
    if (search && !h.title.toLowerCase().includes(search.toLowerCase()) && !h.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const createHypothesis = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const h: Hypothesis = {
      id: crypto.randomUUID(),
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      tags: (fd.get('tags') as string || '').split(',').map((t) => t.trim()).filter(Boolean),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setHypotheses((prev) => [h, ...prev])
    setShowForm(false);
    (e.target as HTMLFormElement).reset()
  }

  return (
    <div className="flex flex-col gap-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={13} style={{ color: 'var(--accent-purple)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>RESEARCH HUB</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>({hypotheses.length})</span>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{
            background: 'var(--accent-cyan)', border: 'none', color: '#000',
            padding: '2px 8px', fontSize: 9, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 3, borderRadius: 2,
          }}
        >
          <Plus size={10} /> NEW
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex-1 relative">
          <Search size={10} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hypotheses..."
            style={{
              width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', padding: '4px 6px 4px 22px', fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace", outline: 'none', borderRadius: 2,
            }}
          />
        </div>
        {(['all', 'draft', 'active', 'testing', 'validated', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              padding: '2px 6px', fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: filter === s ? 'var(--bg-hover)' : 'transparent',
              color: filter === s ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${filter === s ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
              cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap',
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={createHypothesis}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            padding: 8, display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 2,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--accent-cyan)' }}>NEW HYPOTHESIS</span>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: 10 }}>
              <X size={10} />
            </button>
          </div>
          <input name="title" placeholder="Hypothesis title" required
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 6px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
          <textarea name="description" placeholder="Describe your hypothesis..." required rows={2}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 6px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", resize: 'vertical' }} />
          <input name="tags" placeholder="Tags (comma-separated)"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 6px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
          <button type="submit"
            style={{
              background: 'var(--accent-green)', border: 'none', color: '#000',
              padding: '4px 12px', fontSize: 9, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'JetBrains Mono', monospace", alignSelf: 'flex-start', borderRadius: 2,
            }}>
            CREATE
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 10 }}>
            No hypotheses found
          </div>
        )}
        {filtered.map((h) => (
          <div key={h.id} onClick={() => setSelected(h)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              padding: 8, cursor: 'pointer', borderRadius: 2,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
            <div className="flex items-center justify-between">
              <span style={{
                fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: STATUS_COLORS[h.status], padding: '1px 4px',
                border: `1px solid ${STATUS_COLORS[h.status]}33`,
                background: `${STATUS_COLORS[h.status]}11`,
                borderRadius: 2,
              }}>
                {h.status}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleDateString()}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-primary)' }}>{h.title}</span>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {h.description}
            </span>
            {h.results && (
              <div className="flex items-center gap-2" style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                <span style={{ color: h.results.sharpe > 1 ? 'var(--accent-green)' : 'var(--accent-red)' }}>S: {h.results.sharpe.toFixed(2)}</span>
                <span>DD: {h.results.maxDrawdown.toFixed(1)}%</span>
                <span style={{ color: h.results.totalReturn > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  R: {h.results.totalReturn > 0 ? '+' : ''}{h.results.totalReturn.toFixed(1)}%
                </span>
              </div>
            )}
            {h.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {h.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 8, color: 'var(--accent-cyan)', padding: '0 4px', background: 'var(--bg-hover)', borderRadius: 2 }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              padding: 16, maxWidth: 480, width: '90%', borderRadius: 2,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[selected.status],
                border: `1px solid ${STATUS_COLORS[selected.status]}33`, background: `${STATUS_COLORS[selected.status]}11`,
                padding: '1px 4px', borderRadius: 2 }}>
                {selected.status}
              </span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{selected.title}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{selected.description}</div>
            <div className="flex gap-3 mb-2" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              <span>Created: {new Date(selected.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(selected.updatedAt).toLocaleDateString()}</span>
            </div>
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selected.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 8, color: 'var(--accent-cyan)', padding: '0 4px', background: 'var(--bg-hover)', borderRadius: 2 }}>{tag}</span>
                ))}
              </div>
            )}
            {selected.results && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 4 }}>BACKTEST RESULTS</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Sharpe', value: selected.results.sharpe.toFixed(4), color: selected.results.sharpe > 1 ? 'var(--accent-green)' : 'var(--accent-red)' },
                    { label: 'Max DD', value: `${selected.results.maxDrawdown.toFixed(2)}%`, color: 'var(--accent-red)' },
                    { label: 'Return', value: `${selected.results.totalReturn > 0 ? '+' : ''}${selected.results.totalReturn.toFixed(2)}%`, color: selected.results.totalReturn > 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                  ].map((m) => (
                    <div key={m.label} style={{ background: 'var(--bg-hover)', padding: '4px 6px', borderRadius: 2 }}>
                      <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{m.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
