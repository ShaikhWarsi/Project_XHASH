import { useState } from 'react'

interface StrategyListing {
  id: string
  name: string
  description: string
  author: string
  type: 'long' | 'short' | 'both'
  assetClasses: string[]
  avgReturn: number
  sharpe: number
  downloads: number
  rating: number
  tags: string[]
}

const MOCK_STRATEGIES: StrategyListing[] = [
  { id: 's1', name: 'Mean Reversion Pro', description: 'Statistical arbitrage using z-score mean reversion with dynamic bands', author: 'quant_lab', type: 'both', assetClasses: ['stocks', 'etfs'], avgReturn: 18.5, sharpe: 1.8, downloads: 3456, rating: 4.8, tags: ['mean-reversion', 'statistical'] },
  { id: 's2', name: 'Trend Following', description: 'Multi-timeframe trend following with ADX and EMA filters', author: 'xka_team', type: 'long', assetClasses: ['futures', 'crypto'], avgReturn: 24.2, sharpe: 1.5, downloads: 2891, rating: 4.7, tags: ['trend', 'adx', 'ema'] },
  { id: 's3', name: 'Momentum Burst', description: 'Captures breakout momentum with volatility-adjusted position sizing', author: 'algo_pro', type: 'both', assetClasses: ['stocks', 'crypto'], avgReturn: 32.1, sharpe: 1.3, downloads: 2145, rating: 4.5, tags: ['momentum', 'breakout'] },
  { id: 's4', name: 'Volatility Arbitrage', description: 'Trades VIX term structure and volatility premium decay', author: 'options_team', type: 'short', assetClasses: ['options', 'futures'], avgReturn: 15.8, sharpe: 2.1, downloads: 1678, rating: 4.9, tags: ['volatility', 'vix', 'arb'] },
  { id: 's5', name: 'Grid Bot Classic', description: 'Automated grid trading with dynamic range adjustment', author: 'crypto_dev', type: 'both', assetClasses: ['crypto'], avgReturn: 12.5, sharpe: 0.9, downloads: 1234, rating: 4.2, tags: ['grid', 'crypto', 'automated'] },
  { id: 's6', name: 'Pair Trading', description: 'Cointegration-based pairs trading with hedge ratio optimization', author: 'quant_lab', type: 'both', assetClasses: ['stocks', 'etfs'], avgReturn: 21.3, sharpe: 2.3, downloads: 987, rating: 4.6, tags: ['pairs', 'cointegration', 'hedge'] },
  { id: 's7', name: 'Swing Momentum', description: '2-5 day swing trades using RSI divergence and volume confirmation', author: 'community', type: 'long', assetClasses: ['stocks', 'etfs', 'crypto'], avgReturn: 28.7, sharpe: 1.6, downloads: 876, rating: 4.4, tags: ['swing', 'rsi', 'divergence'] },
  { id: 's8', name: 'Option Wheel', description: 'Cash-secured puts + covered call wheel strategy with IV targeting', author: 'options_lab', type: 'long', assetClasses: ['options', 'stocks'], avgReturn: 16.4, sharpe: 1.9, downloads: 765, rating: 4.7, tags: ['options', 'wheel', 'income'] },
]

export default function StrategyMarketplace() {
  const [search, setSearch] = useState('')
  const [strategies] = useState(MOCK_STRATEGIES)
  const [installed, setInstalled] = useState<Set<string>>(new Set(['s2']))

  const filtered = strategies.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      return l.name.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.tags.some(t => t.includes(q)) ||
        l.assetClasses.some(a => a.includes(q))
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
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Strategy Marketplace</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Community strategies and algo trading bots</div>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search strategies..."
          style={{
            padding: '4px 8px', fontSize: 9, width: 200,
            background: 'var(--bg-input, #0a0e14)',
            border: '1px solid var(--border-color, #1a2332)',
            color: 'var(--text-primary)', borderRadius: 3,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {filtered.map(strat => {
          const isInstalled = installed.has(strat.id)
          return (
            <div key={strat.id} style={{
              background: 'var(--bg-card, #151c23)',
              border: '1px solid var(--border-color, #1a2332)',
              borderRadius: 6, padding: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{strat.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>by {strat.author} · {strat.type}</div>
                </div>
                <button
                  onClick={() => toggleInstall(strat.id)}
                  style={{
                    padding: '3px 8px', borderRadius: 3, fontSize: 8, fontWeight: 600, cursor: 'pointer',
                    background: isInstalled ? 'transparent' : 'var(--accent-green, #22c55e)',
                    border: isInstalled ? '1px solid var(--border-color)' : 'none',
                    color: isInstalled ? 'var(--text-muted)' : '#fff',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {isInstalled ? 'Installed' : 'Install'}
                </button>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 8, marginBottom: 6 }}>{strat.description}</div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                {strat.tags.map(t => (
                  <span key={t} style={{
                    padding: '1px 4px', borderRadius: 2, fontSize: 7,
                    background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                {strat.assetClasses.map(a => (
                  <span key={a} style={{
                    padding: '1px 4px', borderRadius: 2, fontSize: 7,
                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                  }}>
                    {a}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', fontSize: 7, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span>★ {strat.rating}</span>
                  <span>↓ {strat.downloads.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: '#22c55e' }}>+{strat.avgReturn}%</span>
                  <span style={{ marginLeft: 4 }}>SR {strat.sharpe}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
