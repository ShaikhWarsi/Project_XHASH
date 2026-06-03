import { useState } from 'react'

interface IndicatorListing {
  id: string
  name: string
  description: string
  author: string
  category: string
  downloads: number
  rating: number
  tags: string[]
}

const MOCK_INDICATORS: IndicatorListing[] = [
  { id: 'i1', name: 'Smart Money Concepts', description: 'Advanced smart money concepts including FVG, order blocks, and liquidity zones', author: 'ict_community', category: 'custom', downloads: 2341, rating: 4.9, tags: ['smart-money', 'fvg', 'order-block'] },
  { id: 'i2', name: 'Market Structure', description: 'Automatically labels HH/HL/LH/LL market structure levels', author: 'xka_team', category: 'pattern', downloads: 1892, rating: 4.7, tags: ['structure', 'trend'] },
  { id: 'i3', name: 'Order Flow Imbalance', description: 'Visualizes delta and cumulative delta for order flow analysis', author: 'pro_trader', category: 'volume', downloads: 1456, rating: 4.8, tags: ['orderflow', 'delta'] },
  { id: 'i4', name: 'Auto Fibonacci', description: 'Automatic Fibonacci retracement and extension levels from swing points', author: 'algotools', category: 'drawing', downloads: 1023, rating: 4.5, tags: ['fib', 'auto'] },
  { id: 'i5', name: 'Divergence Finder', description: 'Detects RSI, MACD, and stochastic divergences automatically', author: 'xka_team', category: 'custom', downloads: 987, rating: 4.6, tags: ['divergence', 'rsi', 'macd'] },
  { id: 'i6', name: 'Volume Profile', description: 'Visible range and fixed range volume profile with HVNs and LVNs', author: 'community', category: 'volume', downloads: 876, rating: 4.4, tags: ['volume-profile', 'vah', 'val'] },
  { id: 'i7', name: 'Multi-Timeframe MA', description: 'Moving averages from higher timeframes overlaid on current chart', author: 'dev_community', category: 'overlap', downloads: 654, rating: 4.3, tags: ['ma', 'mtf'] },
  { id: 'i8', name: 'GEX (Gamma Exposure)', description: 'Options gamma exposure levels and support/resistance', author: 'options_lab', category: 'custom', downloads: 543, rating: 4.7, tags: ['options', 'gamma'] },
]

const CATEGORIES = ['all', 'custom', 'pattern', 'volume', 'drawing', 'overlap']

export default function IndicatorMarketplace() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [indicators] = useState(MOCK_INDICATORS)
  const [installed, setInstalled] = useState<Set<string>>(new Set(['i2', 'i5']))

  const filtered = indicators.filter(l => {
    if (category !== 'all' && l.category !== category) return false
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.includes(q))
    }
    return true
  })

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Indicator Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Community indicators and custom scripts</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              padding: '4px 8px', fontSize: 9,
              background: 'var(--bg-input, #0a0e14)',
              border: '1px solid var(--border-color, #1a2332)',
              color: 'var(--text-primary)', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search indicators..."
            style={{
              padding: '4px 8px', fontSize: 9, width: 180,
              background: 'var(--bg-input, #0a0e14)',
              border: '1px solid var(--border-color, #1a2332)',
              color: 'var(--text-primary)', borderRadius: 3,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {filtered.map(ind => {
          const isInstalled = installed.has(ind.id)
          return (
            <div key={ind.id} style={{
              background: 'var(--bg-card, #151c23)',
              border: '1px solid var(--border-color, #1a2332)',
              borderRadius: 6, padding: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{ind.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {ind.author}</div>
                </div>
                <button
                  onClick={() => toggleInstall(ind.id)}
                  style={{
                    padding: '3px 8px', borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: 'pointer',
                    background: isInstalled ? 'transparent' : 'var(--accent-blue, #3b82f6)',
                    border: isInstalled ? '1px solid var(--border-color)' : 'none',
                    color: isInstalled ? 'var(--text-muted)' : '#fff',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {isInstalled ? 'Installed' : 'Install'}
                </button>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 6 }}>{ind.description}</div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                {ind.tags.map(t => (
                  <span key={t} style={{
                    padding: '1px 4px', borderRadius: 2, fontSize: 7,
                    background: 'rgba(139,92,246,0.1)', color: '#a855f7',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: 7 }}>
                <span>★ {ind.rating}</span>
                <span>↓ {ind.downloads.toLocaleString()}</span>
                <span style={{ textTransform: 'capitalize' }}>{ind.category}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
