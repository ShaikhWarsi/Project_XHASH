import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'

export default function CryptoDominancePage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alt-data/crypto-dominance')
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (!data?.coins?.length || !chartRef.current) return
    import('plotly.js-dist-min').then(Plotly => {
      if (!chartRef.current) return
      const coins = data.coins.filter((c: any) => c.dominanceEstimate > 0)
      Plotly.newPlot(chartRef.current, [{
        type: 'pie',
        labels: coins.map((c: any) => c.symbol),
        values: coins.map((c: any) => c.dominanceEstimate),
        textinfo: 'label+percent',
        textposition: 'outside',
        hole: 0.5,
        sort: false,
      }], {
        height: 300,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#8b949e', family: 'JetBrains Mono, monospace', size: 9 },
        margin: { t: 20, b: 20, l: 20, r: 20 },
        showlegend: false,
      }, { responsive: true, displayModeBar: false })
    })
  }, [data])

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Crypto Dominance</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Total MCap: ${((data?.totalMarketCap || 0) / 1e9).toFixed(1)}B</div>
        </div>
        <button onClick={fetchData} style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, cursor: 'pointer', background: 'var(--accent-cyan)', color: '#000', border: 'none' }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div ref={chartRef} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }} />
        <div style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 8 }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>TOP MOVERS (24h)</div>
          {data?.coins?.slice(0, 5).map((c: any) => (
            <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.symbol}</span>
              <span style={{ color: c.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {c.change24h >= 0 ? '+' : ''}{c.change24h?.toFixed(2)}%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>${c.price?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflow: 'auto', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Name', 'Symbol', 'Price', 'Dominance', '24h Change', 'Volume'].map(h => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border-color, #1a2332)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.coins?.map((d: any, i: number) => (
              <tr key={d.symbol} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--accent-blue)' }}>{d.symbol}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)' }}>${d.price?.toLocaleString()}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600 }}>{d.dominanceEstimate?.toFixed(1)}%</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: d.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {d.change24h >= 0 ? '+' : ''}{d.change24h?.toFixed(2)}%
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)' }}>${(d.volume24h / 1e9).toFixed(1)}B</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
