import { useState, useEffect, useRef } from 'react'

interface DomData {
  symbol: string
  name: string
  dominance: number
  change24h: number
  marketCap: number
  color: string
}

const DOM_DATA: DomData[] = [
  { symbol: 'BTC', name: 'Bitcoin', dominance: 52.4, change24h: 0.8, marketCap: 1_320_000_000_000, color: '#f7931a' },
  { symbol: 'ETH', name: 'Ethereum', dominance: 16.8, change24h: -0.3, marketCap: 423_000_000_000, color: '#627eea' },
  { symbol: 'USDT', name: 'Tether', dominance: 5.2, change24h: 0.0, marketCap: 112_000_000_000, color: '#26a17b' },
  { symbol: 'BNB', name: 'BNB', dominance: 3.1, change24h: 0.5, marketCap: 89_000_000_000, color: '#f0b90b' },
  { symbol: 'SOL', name: 'Solana', dominance: 2.8, change24h: 1.2, marketCap: 67_000_000_000, color: '#9b59b6' },
  { symbol: 'XRP', name: 'XRP', dominance: 2.1, change24h: -0.7, marketCap: 54_000_000_000, color: '#23292f' },
  { symbol: 'ADA', name: 'Cardano', dominance: 1.2, change24h: -1.1, marketCap: 28_000_000_000, color: '#0033ad' },
  { symbol: 'DOGE', name: 'Dogecoin', dominance: 1.0, change24h: 2.3, marketCap: 22_000_000_000, color: '#c2a633' },
  { symbol: 'DOT', name: 'Polkadot', dominance: 0.7, change24h: -0.4, marketCap: 15_000_000_000, color: '#e6007a' },
  { symbol: 'AVAX', name: 'Avalanche', dominance: 0.6, change24h: 1.5, marketCap: 14_000_000_000, color: '#e84142' },
  { symbol: 'Others', name: 'Others', dominance: 14.1, change24h: 0.0, marketCap: 312_000_000_000, color: '#5d6b7e' },
]

const ALTS = DOM_DATA.filter(d => d.symbol !== 'BTC' && d.symbol !== 'ETH' && d.symbol !== 'USDT')

export default function CryptoDominancePage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded || !chartRef.current) return
    setLoaded(true)
    import('plotly.js-dist-min').then(Plotly => {
      if (!chartRef.current) return

      const donutData = [{
        type: 'pie' as const,
        labels: DOM_DATA.map(d => d.symbol),
        values: DOM_DATA.map(d => d.dominance),
        marker: { colors: DOM_DATA.map(d => d.color) },
        textinfo: 'label+percent',
        textposition: 'outside',
        hole: 0.5,
        sort: false,
      }]

      const layout1 = {
        title: { text: 'Market Dominance', font: { color: '#e6edf3', size: 12 } },
        height: 300,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#8b949e', family: 'JetBrains Mono, monospace' },
        margin: { t: 40, b: 40, l: 40, r: 120 },
        showlegend: true,
        legend: { font: { color: '#8b949e', size: 9 }, orientation: 'v' },
      }
      Plotly.newPlot(chartRef.current, donutData, layout1, { responsive: true, displayModeBar: false })

      const rows = 3, cols = Math.ceil(ALTS.length / rows)
      const heatData = ALTS.map((a, i) => ({
        type: 'bar' as const,
        x: [a.symbol],
        y: [a.dominance],
        marker: { color: a.change24h >= 0 ? '#22c55e' : '#ef4444' },
        name: a.name,
        showlegend: false,
        width: 0.6,
      }))

      const layout2 = {
        title: { text: 'Altcoin Dominance', font: { color: '#e6edf3', size: 12 } },
        height: 200,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#8b949e', family: 'JetBrains Mono, monospace' },
        margin: { t: 30, b: 30, l: 30, r: 30 },
        barmode: 'group',
        xaxis: { color: '#5d6b7e', gridcolor: 'rgba(255,255,255,0.05)' },
        yaxis: { color: '#5d6b7e', gridcolor: 'rgba(255,255,255,0.05)', title: '%' },
      }
      Plotly.newPlot('alt-heatmap', heatData, layout2, { responsive: true, displayModeBar: false })
    })
  }, [loaded])

  const totalMCap = DOM_DATA.reduce((s, d) => s + d.marketCap, 0)

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Crypto Dominance</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Total MCap: ${(totalMCap / 1e9).toFixed(1)}B</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f7931a' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 8 }}>BTC.D {DOM_DATA[0].dominance}%</span>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#627eea' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 8 }}>ETH.D {DOM_DATA[1].dominance}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div ref={chartRef} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }} />
        <div id="alt-heatmap" style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }} />
      </div>

      <div style={{ overflow: 'auto', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Name', 'Symbol', 'Dominance', '24h Change', 'Market Cap'].map(h => (
                <th key={h} style={{ padding: '4px 8px', fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--border-color, #1a2332)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOM_DATA.map((d, i) => (
              <tr key={d.symbol} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-muted)' }}>{i + 1}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  {d.name}
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--accent-blue)' }}>{d.symbol}</td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {d.dominance}%
                  <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                    <div style={{ width: `${d.dominance}%`, height: '100%', background: d.color, borderRadius: 2 }} />
                  </div>
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: d.change24h >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {d.change24h >= 0 ? '+' : ''}{d.change24h}%
                </td>
                <td style={{ padding: '4px 8px', fontSize: 9, color: 'var(--text-primary)' }}>${(d.marketCap / 1e9).toFixed(1)}B</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
