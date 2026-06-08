import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

export default function CommoditiesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('All')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alt-data/commodities')
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const categories = ['All', 'Precious', 'Energy', 'Industrial', 'Agriculture']
  const filtered = data?.commodities?.filter((c: any) => category === 'All' || c.category === category) || []

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Commodities</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Real-time commodity prices from yfinance</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
              background: category === c ? 'var(--accent-blue)' : 'transparent',
              border: `1px solid ${category === c ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
              color: category === c ? '#fff' : 'var(--text-secondary)',
            }}>{c}</button>
          ))}
          <button onClick={fetchData} style={{ padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer', background: 'var(--accent-cyan)', color: '#000', border: 'none', marginLeft: 4 }}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={{ overflow: 'auto', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Symbol', 'Price', 'Change', '%', 'High', 'Low', 'Volume'].map(h => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid var(--border-color, #1a2332)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any, i: number) => (
              <tr key={c.symbol} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600, textAlign: 'left' }}>{c.name}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--accent-blue)', textAlign: 'right' }}>{c.symbol}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', textAlign: 'right' }}>${c.price?.toFixed(2)}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: c.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', textAlign: 'right' }}>
                  {c.change >= 0 ? '+' : ''}{c.change?.toFixed(2)}
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: c.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', textAlign: 'right' }}>
                  {c.changePct >= 0 ? '+' : ''}{c.changePct?.toFixed(2)}%
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', textAlign: 'right' }}>${c.high?.toFixed(2)}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', textAlign: 'right' }}>${c.low?.toFixed(2)}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)', textAlign: 'right' }}>{c.volume?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
