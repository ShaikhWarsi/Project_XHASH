import { useState } from 'react'

interface LayoutListing {
  id: string
  name: string
  description: string
  author: string
  downloads: number
  rating: number
  preview?: string
  tags: string[]
}

const MOCK_LAYOUTS: LayoutListing[] = [
  { id: 'l1', name: 'Pro Trader', description: 'Multi-monitor layout with chart, order book, and portfolio side by side', author: 'xka_team', downloads: 1234, rating: 4.8, tags: ['multi-monitor', 'pro'] },
  { id: 'l2', name: 'Swing Trader', description: 'Daily chart focus with signal panel and watchlist', author: 'community', downloads: 892, rating: 4.5, tags: ['swing', 'daily'] },
  { id: 'l3', name: 'Scalper', description: 'Tight timeframes with Level 2 data and quick trade buttons', author: 'pro_user', downloads: 567, rating: 4.7, tags: ['scalping', 'fast'] },
  { id: 'l4', name: 'Portfolio Manager', description: 'Portfolio-centric view with risk metrics and P&L charts', author: 'xka_team', downloads: 345, rating: 4.3, tags: ['portfolio', 'risk'] },
  { id: 'l5', name: 'Algo Developer', description: 'Strategy editor, backtester, and optimization results side panel', author: 'dev_community', downloads: 234, rating: 4.6, tags: ['backtest', 'algo'] },
  { id: 'l6', name: 'Minimal', description: 'Clean, distraction-free trading view with essential tools', author: 'community', downloads: 789, rating: 4.2, tags: ['minimal', 'clean'] },
]

export default function LayoutMarketplace() {
  const [search, setSearch] = useState('')
  const [layouts] = useState(MOCK_LAYOUTS)
  const [installed, setInstalled] = useState<Set<string>>(new Set(['l1']))

  const filtered = layouts.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleInstall = (id: string) => {
    setInstalled(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={{ padding: 16, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Layout Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Browse and install community layouts</div>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search layouts..."
          style={{
            padding: '6px 10px', fontSize: 10, width: 200,
            background: 'var(--bg-input, #0a0e14)',
            border: '1px solid var(--border-color, #1a2332)',
            color: 'var(--text-primary)', borderRadius: 4,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(layout => {
          const isInstalled = installed.has(layout.id)
          return (
            <div key={layout.id} style={{
              background: 'var(--bg-card, #151c23)',
              border: '1px solid var(--border-color, #1a2332)',
              borderRadius: 8, padding: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 11 }}>{layout.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {layout.author}</div>
                </div>
                <button
                  onClick={() => toggleInstall(layout.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    background: isInstalled ? 'transparent' : 'var(--accent-blue, #3b82f6)',
                    border: isInstalled ? '1px solid var(--border-color)' : 'none',
                    color: isInstalled ? 'var(--text-muted)' : '#fff',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {isInstalled ? 'Installed' : 'Install'}
                </button>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 9, marginBottom: 8 }}>{layout.description}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {layout.tags.map(t => (
                  <span key={t} style={{
                    padding: '1px 5px', borderRadius: 3, fontSize: 8,
                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 8 }}>
                <span>★ {layout.rating}</span>
                <span>↓ {layout.downloads.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
