import { useState } from 'react'

interface Level {
  price: number
  bidSize: number
  askSize: number
  bidCum: number
  askCum: number
  bidCount: number
  askCount: number
}

const BASE_PRICE = 5000.00
const STEP = 2.50
const LEVELS = 20

const generateDepth = (basePrice: number): Level[] => {
  const levels: Level[] = []
  const bidBase = Math.round(800 + Math.random() * 400)
  const askBase = Math.round(800 + Math.random() * 400)

  for (let i = -LEVELS; i <= LEVELS; i++) {
    const price = basePrice + i * STEP
    const distFromMid = Math.abs(i)
    const decay = Math.exp(-distFromMid * 0.15)
    const noise = 0.5 + Math.random()

    const bidSize = i <= 0 ? Math.round(bidBase * decay * noise * (1 + Math.random() * 0.3)) : 0
    const askSize = i >= 0 ? Math.round(askBase * decay * noise * (1 + Math.random() * 0.3)) : 0
    const bidCount = Math.max(1, Math.round(bidSize / (50 + Math.random() * 100)))
    const askCount = Math.max(1, Math.round(askSize / (50 + Math.random() * 100)))

    levels.push({
      price, bidSize, askSize, bidCum: 0, askCum: 0, bidCount, askCount,
    })
  }
  return levels
}

const MAX_ORDER_SIZE = 600

export default function OrderFlowPage() {
  const [symbol, setSymbol] = useState('ES')
  const [levels] = useState(() => {
    const prices: Record<string, number> = { ES: 5300.00, NQ: 18500.00, CL: 78.93, GC: 2341.50, EURUSD: 1.0845 }
    return Object.fromEntries(
      Object.entries(prices).map(([sym, price]) => [sym, generateDepth(price)])
    )
  })

  const currentLevels = levels[symbol] || levels['ES']
  const maxBidAsk = Math.max(
    ...currentLevels.map(l => Math.max(l.bidSize, l.askSize)),
    1
  )

  let cumBid = 0, cumAsk = 0
  const withCum = currentLevels.map(l => {
    if (l.bidSize > 0) cumBid += l.bidSize
    if (l.askSize > 0) cumAsk += l.askSize
    return { ...l, bidCum: cumBid, askCum: cumAsk }
  })

  const totalBid = withCum[withCum.length - 1]?.bidCum || 0
  const totalAsk = withCum[withCum.length - 1]?.askCum || 0
  const imbalance = totalBid - totalAsk
  const midPrice = withCum.find(l => l.bidSize > 0 && l.askSize > 0)?.price || BASE_PRICE

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Order Flow / DOM</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Depth of book with cumulative bid/ask</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['ES', 'NQ', 'CL', 'GC', 'EURUSD'].map(s => (
            <button key={s} onClick={() => setSymbol(s)} style={{
              padding: '3px 10px', borderRadius: 3, fontSize: 9, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
              background: symbol === s ? 'var(--accent-blue)' : 'transparent',
              border: `1px solid ${symbol === s ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
              color: symbol === s ? '#fff' : 'var(--text-secondary)', fontWeight: symbol === s ? 600 : 400,
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 10, padding: '6px 10px', background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6 }}>
        {[
          { label: 'Bid Volume', value: totalBid.toLocaleString(), color: '#22c55e' },
          { label: 'Ask Volume', value: totalAsk.toLocaleString(), color: '#ef4444' },
          { label: 'Imbalance', value: (imbalance > 0 ? '+' : '') + imbalance.toLocaleString(), color: imbalance > 0 ? '#22c55e' : '#ef4444' },
          { label: 'Mid Price', value: midPrice.toFixed(2), color: 'var(--accent-blue)' },
          { label: 'Spread', value: (STEP * 2).toFixed(2), color: 'var(--text-secondary)' },
        ].map(d => (
          <div key={d.label}>
            <div style={{ color: 'var(--text-muted)', fontSize: 7 }}>{d.label}</div>
            <div style={{ color: d.color, fontSize: 11, fontWeight: 700 }}>{d.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color, #1a2332)' }}>
          <div style={{ flex: 1, padding: '3px 6px', fontSize: 7, color: 'var(--text-muted)', textAlign: 'right' }}>BID SIZE</div>
          <div style={{ width: 70, padding: '3px 6px', fontSize: 7, color: 'var(--text-muted)', textAlign: 'center' }}>PRICE</div>
          <div style={{ flex: 1, padding: '3px 6px', fontSize: 7, color: 'var(--text-muted)', textAlign: 'left' }}>ASK SIZE</div>
        </div>

        {withCum.map((l, i) => {
          const isMid = l.bidSize > 0 && l.askSize > 0
          const bidWidth = (l.bidSize / maxBidAsk) * 100
          const askWidth = (l.askSize / maxBidAsk) * 100

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', height: 22,
              borderBottom: '1px solid rgba(26,35,50,0.15)',
              background: isMid ? 'rgba(59,130,246,0.05)' : 'transparent',
            }}>
              <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0,
                  width: `${Math.min(bidWidth, 95)}%`,
                  background: `rgba(34,197,94,${0.1 + (l.bidSize / maxBidAsk) * 0.4})`,
                  borderRadius: '0 2px 2px 0',
                  transition: 'width 0.2s',
                }} />
                {l.bidSize > 0 && (
                  <span style={{ position: 'relative', zIndex: 1, fontSize: 8, color: '#22c55e', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                    {l.bidSize.toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{
                width: 70, textAlign: 'center', fontSize: 9, fontWeight: isMid ? 700 : 400,
                color: isMid ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontFamily: 'JetBrains Mono, monospace', borderLeft: '1px solid rgba(26,35,50,0.2)', borderRight: '1px solid rgba(26,35,50,0.2)',
                padding: '2px 0',
              }}>
                {l.price.toFixed(symbol === 'EURUSD' ? 4 : 2)}
              </div>

              <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min(askWidth, 95)}%`,
                  background: `rgba(239,68,68,${0.1 + (l.askSize / maxBidAsk) * 0.4})`,
                  borderRadius: '2px 0 0 2px',
                  transition: 'width 0.2s',
                }} />
                {l.askSize > 0 && (
                  <span style={{ position: 'relative', zIndex: 1, fontSize: 8, color: '#ef4444', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                    {l.askSize.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
