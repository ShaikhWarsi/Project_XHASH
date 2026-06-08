import { useState, useEffect } from 'react'

interface IndicatorListing {
  id: string
  name: string
  description: string
  author: string
  category: string
  downloads: number
  rating: number
  tags: string[]
  installed: boolean
}

const CATEGORIES = ['all', 'custom', 'pattern', 'volume', 'drawing', 'overlap']

export default function IndicatorMarketplace() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [indicators, setIndicators] = useState<IndicatorListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/marketplace/indicators')
      .then(r => r.json())
      .then(d => { setIndicators(d.indicators || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = indicators.filter(l => {
    if (category !== 'all' && l.category !== category) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.tags.some(t => t.includes(q))
    }
    return true
  })

  const toggleInstall = async (id: string) => {
    const ind = indicators.find(i => i.id === id)
    if (!ind) return
    const endpoint = ind.installed ? 'uninstall' : 'install'
    try {
      await fetch(`/api/marketplace/indicators/${id}/${endpoint}`, { method: 'POST' })
      setIndicators(prev => prev.map(i => i.id === id ? { ...i, installed: !i.installed, downloads: i.installed ? i.downloads : i.downloads + 1 } : i))
    } catch (e) { /* ignore */ }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Indicator Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Community indicators and custom scripts</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '4px 8px', fontSize: 9, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3 }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search indicators..."
            style={{ padding: '4px 8px', fontSize: 9, width: 180, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3 }} />
        </div>
      </div>
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Loading indicators...</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {filtered.map(ind => (
          <div key={ind.id} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{ind.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {ind.author}</div>
              </div>
              <button onClick={() => toggleInstall(ind.id)}
                style={{ padding: '3px 8px', borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: 'pointer', background: ind.installed ? 'transparent' : 'var(--accent-blue, #3b82f6)', border: ind.installed ? '1px solid var(--border-color)' : 'none', color: ind.installed ? 'var(--text-muted)' : '#fff' }}>
                {ind.installed ? 'Installed' : 'Install'}
              </button>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 6 }}>{ind.description}</div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
              {ind.tags.map(t => <span key={t} style={{ padding: '1px 4px', borderRadius: 2, fontSize: 7, background: 'rgba(139,92,246,0.1)', color: '#a855f7' }}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: 7 }}>
              <span>★ {ind.rating}</span><span>↓ {ind.downloads.toLocaleString()}</span><span style={{ textTransform: 'capitalize' }}>{ind.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
