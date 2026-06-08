import { useState, useEffect } from 'react'

interface StrategyListing {
  id: string
  name: string
  description: string
  author: string
  type: string
  assetClasses: string[]
  avgReturn: number
  sharpe: number
  downloads: number
  rating: number
  tags: string[]
  installed: boolean
}

export default function StrategyMarketplace() {
  const [search, setSearch] = useState('')
  const [strategies, setStrategies] = useState<StrategyListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/marketplace/strategies')
      .then(r => r.json())
      .then(d => { setStrategies(d.strategies || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = strategies.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q))
    }
    return true
  })

  const toggleInstall = async (id: string) => {
    const s = strategies.find(x => x.id === id)
    if (!s) return
    const endpoint = s.installed ? 'uninstall' : 'install'
    try {
      await fetch(`/api/marketplace/strategies/${id}/${endpoint}`, { method: 'POST' })
      setStrategies(prev => prev.map(x => x.id === id ? { ...x, installed: !x.installed, downloads: x.installed ? x.downloads : x.downloads + 1 } : x))
    } catch (e) { /* ignore */ }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Strategy Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Community strategies and trading algorithms</div>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search strategies..."
          style={{ padding: '4px 8px', fontSize: 9, width: 200, background: 'var(--bg-input, #0a0e14)', border: '1px solid var(--border-color, #1a2332)', color: 'var(--text-primary)', borderRadius: 3 }} />
      </div>
      {loading && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Loading strategies...</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {filtered.map(s => (
          <div key={s.id} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{s.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {s.author} | {s.type.toUpperCase()} | {s.assetClasses.join(', ')}</div>
              </div>
              <button onClick={() => toggleInstall(s.id)}
                style={{ padding: '3px 8px', borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: 'pointer', background: s.installed ? 'transparent' : 'var(--accent-blue, #3b82f6)', border: s.installed ? '1px solid var(--border-color)' : 'none', color: s.installed ? 'var(--text-muted)' : '#fff' }}>
                {s.installed ? 'Installed' : 'Install'}
              </button>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 6 }}>{s.description}</div>
            <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 7, marginBottom: 6 }}>
              <span>Avg Return: <span style={{ color: 'var(--accent-green)' }}>{s.avgReturn}%</span></span>
              <span>Sharpe: <span style={{ color: 'var(--accent-cyan)' }}>{s.sharpe}</span></span>
              <span>★ {s.rating}</span>
              <span>↓ {s.downloads.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {s.tags.map(t => <span key={t} style={{ padding: '1px 4px', borderRadius: 2, fontSize: 7, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
