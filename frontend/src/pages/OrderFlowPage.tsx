import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

export default function OrderFlowPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alt-data/order-flow?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [symbol])

  const symbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'BTC-USD', 'ETH-USD']

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Order Flow / Volume Profile</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Real-time order flow from yfinance 1min data</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {symbols.map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={{
              padding: '3px 10px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
              background: symbol === s ? 'var(--accent-blue)' : 'transparent',
              border: `1px solid ${symbol === s ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
              color: symbol === s ? '#fff' : 'var(--text-secondary)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {data?.summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
          {[
            { label: 'Bid Volume', value: data.summary.totalBidVolume?.toLocaleString(), color: '#22c55e' },
            { label: 'Ask Volume', value: data.summary.totalAskVolume?.toLocaleString(), color: '#ef4444' },
            { label: 'B/A Ratio', value: data.summary.bidAskRatio?.toFixed(2), color: 'var(--accent-blue)' },
            { label: 'VWAP', value: `$${data.summary.vwap?.toFixed(2)}`, color: 'var(--accent-cyan)' },
            { label: 'Total Volume', value: data.summary.totalVolume?.toLocaleString(), color: 'var(--text-primary)' },
          ].map(d => (
            <div key={d.label}>
              <div style={{ color: 'var(--text-muted)', fontSize: 7 }}>{d.label}</div>
              <div style={{ color: d.color, fontSize: 11, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      )}

      {data?.volumeProfile?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>VOLUME PROFILE (Top Levels)</div>
            {data.volumeProfile.slice(0, 10).map((v: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                <span style={{ color: 'var(--text-primary)' }}>${v.price}</span>
                <span style={{ color: '#22c55e' }}>{v.bidVolume?.toLocaleString()}</span>
                <span style={{ color: '#ef4444' }}>{v.askVolume?.toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}>{v.trades} trades</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6 }}>RECENT TRADES</div>
            {data.recentTrades?.slice(-15).reverse().map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                <span style={{ color: 'var(--text-primary)' }}>${t.price}</span>
                <span style={{ color: t.side === 'buy' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{t.volume?.toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}>{t.side}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Select a symbol to view order flow.</div>}
    </div>
  )
}
