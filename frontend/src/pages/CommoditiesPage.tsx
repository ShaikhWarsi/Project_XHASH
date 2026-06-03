import { useState } from 'react'

interface Commodity {
  symbol: string
  name: string
  category: string
  price: number
  change: number
  changePct: number
  high: number
  low: number
  volume: number
  openInterest: number
}

const COMMODITIES: Commodity[] = [
  { symbol: 'XAUUSD', name: 'Gold', category: 'Precious', price: 2341.50, change: 12.30, changePct: 0.53, high: 2348.20, low: 2329.10, volume: 245123, openInterest: 512345 },
  { symbol: 'XAGUSD', name: 'Silver', category: 'Precious', price: 29.84, change: -0.32, changePct: -1.06, high: 30.21, low: 29.72, volume: 89234, openInterest: 234567 },
  { symbol: 'CL', name: 'Crude Oil', category: 'Energy', price: 78.93, change: 1.45, changePct: 1.87, high: 79.42, low: 77.38, volume: 567890, openInterest: 1892345 },
  { symbol: 'BZ', name: 'Brent Crude', category: 'Energy', price: 83.12, change: 1.28, changePct: 1.56, high: 83.67, low: 81.84, volume: 345678, openInterest: 1456789 },
  { symbol: 'HG', name: 'Copper', category: 'Industrial', price: 4.52, change: 0.08, changePct: 1.80, high: 4.56, low: 4.44, volume: 123456, openInterest: 345678 },
  { symbol: 'NG', name: 'Nat Gas', category: 'Energy', price: 2.14, change: -0.05, changePct: -2.28, high: 2.21, low: 2.11, volume: 456789, openInterest: 567890 },
  { symbol: 'ZW', name: 'Wheat', category: 'Agriculture', price: 5.68, change: 0.12, changePct: 2.16, high: 5.72, low: 5.55, volume: 67890, openInterest: 234567 },
  { symbol: 'ZC', name: 'Corn', category: 'Agriculture', price: 4.35, change: -0.03, changePct: -0.69, high: 4.39, low: 4.32, volume: 78901, openInterest: 345678 },
]

const CATEGORIES = ['All', 'Precious', 'Energy', 'Industrial', 'Agriculture']

const SPARKLINE_DATA: Record<string, number[]> = {
  'XAUUSD': [2301,2315,2328,2335,2341,2338,2345,2341],
  'XAGUSD': [30.2,30.1,29.8,29.6,29.9,30.0,29.7,29.8],
  'CL': [77.5,77.8,78.2,78.6,78.9,79.1,78.7,78.9],
  'BZ': [81.8,82.1,82.6,83.0,83.3,83.5,83.0,83.1],
  'HG': [4.44,4.46,4.48,4.51,4.53,4.55,4.51,4.52],
  'NG': [2.19,2.18,2.16,2.14,2.12,2.13,2.15,2.14],
  'ZW': [5.55,5.58,5.62,5.65,5.68,5.71,5.66,5.68],
  'ZC': [4.38,4.37,4.36,4.34,4.33,4.34,4.35,4.35],
}

export default function CommoditiesPage() {
  const [category, setCategory] = useState('All')
  const [contract, setContract] = useState<'continuous' | 'front-month'>('continuous')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = COMMODITIES.filter(c => category === 'All' || c.category === category)
  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as any)[sortKey]
    const bVal = (b as any)[sortKey]
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <span style={{ color: 'var(--text-muted)', fontSize: 7 }}> ↕</span>
    return <span style={{ color: 'var(--accent-blue)', fontSize: 7 }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
  }

  const renderSparkline = (data: number[]) => {
    const w = 60, h = 24
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
    const color = data[data.length - 1] >= data[0] ? 'var(--accent-green)' : 'var(--accent-red)'
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
      </svg>
    )
  }

  const thStyle = { padding: '3px 6px', fontSize: 8, color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'right' as const, userSelect: 'none' as const, fontWeight: 600, borderBottom: '1px solid var(--border-color, #1a2332)' }
  const tdStyle = { padding: '3px 6px', fontSize: 9, color: 'var(--text-primary)', textAlign: 'right' as const, fontFamily: 'JetBrains Mono, monospace' }

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Commodities</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Real-time commodity prices & futures</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
                background: category === c ? 'var(--accent-blue)' : 'transparent',
                border: `1px solid ${category === c ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
                color: category === c ? '#fff' : 'var(--text-secondary)',
              }}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setContract('continuous')} style={{
              padding: '2px 6px', borderRadius: 3, fontSize: 8, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
              background: contract === 'continuous' ? 'var(--accent-green)' : 'transparent',
              border: `1px solid ${contract === 'continuous' ? 'var(--accent-green)' : 'var(--border-color, #1a2332)'}`,
              color: contract === 'continuous' ? '#000' : 'var(--text-secondary)',
            }}>Continuous</button>
            <button onClick={() => setContract('front-month')} style={{
              padding: '2px 6px', borderRadius: 3, fontSize: 8, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
              background: contract === 'front-month' ? 'var(--accent-yellow)' : 'transparent',
              border: `1px solid ${contract === 'front-month' ? 'var(--accent-yellow)' : 'var(--border-color, #1a2332)'}`,
              color: contract === 'front-month' ? '#000' : 'var(--text-secondary)',
            }}>Front Month</button>
          </div>
        </div>
      </div>

      <div style={{ overflow: 'auto', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => toggleSort('name')}>Name<SortIcon col="name" /></th>
              <th style={{ ...thStyle, textAlign: 'left' }} onClick={() => toggleSort('symbol')}>Symbol<SortIcon col="symbol" /></th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Treasury</th>
              <th style={thStyle} onClick={() => toggleSort('price')}>Price<SortIcon col="price" /></th>
              <th style={thStyle} onClick={() => toggleSort('change')}>Change<SortIcon col="change" /></th>
              <th style={thStyle} onClick={() => toggleSort('changePct')}>%<SortIcon col="changePct" /></th>
              <th style={thStyle} onClick={() => toggleSort('high')}>High<SortIcon col="high" /></th>
              <th style={thStyle} onClick={() => toggleSort('low')}>Low<SortIcon col="low" /></th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.symbol} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--accent-blue)' }}>{c.symbol}</td>
                <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--text-muted)' }}>{c.category}</td>
                <td style={tdStyle}>{c.price.toFixed(c.symbol === 'XAGUSD' ? 2 : 2)}</td>
                <td style={{ ...tdStyle, color: c.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.change >= 0 ? '+' : ''}{c.change.toFixed(2)}</td>
                <td style={{ ...tdStyle, color: c.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%</td>
                <td style={tdStyle}>{c.high.toFixed(2)}</td>
                <td style={tdStyle}>{c.low.toFixed(2)}</td>
                <td style={{ ...tdStyle, display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
                  {renderSparkline(SPARKLINE_DATA[c.symbol] || [])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
        {sorted.map(c => (
          <div key={c.symbol + 'card'} style={{
            background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)',
            borderRadius: 6, padding: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{c.symbol}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{c.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>${c.price.toFixed(2)}</span>
              <span style={{ color: c.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 9, fontWeight: 600 }}>
                {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
              </span>
            </div>
            <div style={{ marginTop: 4 }}>{renderSparkline(SPARKLINE_DATA[c.symbol] || [])}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
