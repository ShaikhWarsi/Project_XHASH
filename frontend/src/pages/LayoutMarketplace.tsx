import { useState, useEffect } from 'react'

interface LayoutListing {
  id: string
  name: string
  description: string
  author: string
  downloads: number
  rating: number
  tags: string[]
  installed: boolean
}

export default function LayoutMarketplace() {
  const [search, setSearch] = useState('')
  const [layouts, setLayouts] = useState<LayoutListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/marketplace/layouts')
      .then(r => r.json())
      .then(d => { setLayouts(d.layouts || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = layouts.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.tags.some(t => t.includes(q))
    }
    return true
  })

  const toggleInstall = async (id: string) => {
    const l = layouts.find(x => x.id === id)
    if (!l) return
    const endpoint = l.installed ? 'uninstall' : 'install'
    try {
      await fetch(`/api/marketplace/layouts/${id}/${endpoint}`, { method: 'POST' })
      setLayouts(prev => prev.map(x => x.id === id ? { ...x, installed: !x.installed, downloads: x.installed ? x.downloads : x.downloads + 1 } : x))
    } catch (e) { /* ignore */ }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Layout Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Dashboard layouts and workspace templates</div>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search layouts..."
          style={{ padding: '4px 8px', fontSize: 9, width: 200, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3 }} />
      </div>
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Loading layouts...</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {filtered.map(l => (
          <div key={l.id} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{l.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {l.author}</div>
              </div>
              <button onClick={() => toggleInstall(l.id)}
                style={{ padding: '3px 8px', borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: 'pointer', background: l.installed ? 'transparent' : 'var(--accent-blue, #3b82f6)', border: l.installed ? '1px solid var(--border-color)' : 'none', color: l.installed ? 'var(--text-muted)' : '#fff' }}>
                {l.installed ? 'Installed' : 'Install'}
              </button>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 6 }}>{l.description}</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
              {l.tags.map(t => <span key={t} style={{ padding: '1px 4px', borderRadius: 2, fontSize: 7, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: 7 }}>
              <span>★ {l.rating}</span><span>↓ {l.downloads.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
