import { useEffect, useRef, useState } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'

interface Trade {
  time: string
  price: number
  size: number
  side: 'buy' | 'sell' | 'neutral'
}

interface TimeAndSalesProps {
  basePrice: number
  symbol?: string
  onClose: () => void
}

export default function TimeAndSales({ basePrice, symbol, onClose }: TimeAndSalesProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'neutral'>('all')
  const listRef = useRef<HTMLDivElement>(null)
  const pendingTradesRef = useRef<Trade[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wsUrl = symbol ? `/ws/trades/${symbol.toUpperCase()}` : ''
  const { lastData, connected: wsConnected } = useWebSocket<{ type: string; data: { price: number; size: number; time: string; side: string }[] }>(wsUrl, { maxRetries: 3, retryDelay: 5000 })

  useEffect(() => {
    if (lastData?.type === 'trades' && lastData?.data && Array.isArray(lastData.data)) {
      const newTrades: Trade[] = lastData.data.map(t => ({
        price: t.price,
        size: t.size,
        time: t.time || new Date().toLocaleTimeString(),
        side: (t.side === 'buy' || t.side === 'sell') ? t.side : 'neutral',
      }))
      pendingTradesRef.current = [...newTrades, ...pendingTradesRef.current].slice(0, 200)
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          setTrades(pendingTradesRef.current)
          pendingTradesRef.current = []
          flushTimerRef.current = null
        }, 200)
      }
    }
  }, [lastData])

  return (
    <div
      style={{
        width: '220px',
        minWidth: '220px',
        overflow: 'hidden',
        background: '#0a0f1a',
        borderLeft: '1px solid #1a2744',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: '1px solid #1a2744',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '1px',
          color: '#8892a6',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span>TIME &amp; SALES</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {!wsConnected && (
            <span style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', padding: '0 4px', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: '0.5px' }}>
              SIMULATED
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8892a6',
              cursor: 'pointer',
              fontSize: '10px',
              padding: 0,
              lineHeight: 1,
            }}
          >
            &#x2715;
          </button>
        </span>
      </div>
      <div style={{
        display: 'flex', gap: 2, padding: '2px 6px', borderBottom: '1px solid #1a2744', flexShrink: 0,
      }}>
        {(['all', 'buy', 'sell'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              flex: 1, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
              background: filter === f ? (f === 'buy' ? '#22c55e30' : f === 'sell' ? '#ef444430' : '#8892a630') : 'transparent',
              color: filter === f ? (f === 'buy' ? '#22c55e' : f === 'sell' ? '#ef4444' : '#e2e8f0') : '#8892a6',
              border: `1px solid ${filter === f ? (f === 'buy' ? '#22c55e' : f === 'sell' ? '#ef4444' : '#8892a6') : '#1a2744'}`,
              cursor: 'pointer', padding: '2px 4px', borderRadius: 2,
            }}
          >{f === 'all' ? 'ALL' : f === 'buy' ? 'BUY' : 'SELL'}</button>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          padding: '4px 8px',
          borderBottom: '1px solid #1a2744',
          fontSize: '8px',
          color: '#8892a6',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}
      >
        <span style={{ width: '55px', flexShrink: 0 }}>Time</span>
        <span style={{ width: '55px', flexShrink: 0, textAlign: 'right' }}>Price</span>
        <span style={{ width: '50px', flexShrink: 0, textAlign: 'right' }}>Size</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Side</span>
      </div>
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {trades.filter((t) => filter === 'all' || t.side === filter).map((trade, i) => {
          const sideColor = trade.side === 'buy' ? '#22c55e' : trade.side === 'sell' ? '#ef4444' : '#8892a6'
          const isNew = i < 3

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '2px 8px',
                fontSize: '10px',
                lineHeight: '16px',
                animation: isNew ? 'fadeInRow 0.4s ease-out' : undefined,
                opacity: 1,
              }}
            >
              <span style={{ width: '55px', flexShrink: 0, color: '#8892a6' }}>
                {trade.time}
              </span>
              <span
                style={{
                  width: '55px',
                  flexShrink: 0,
                  textAlign: 'right',
                  color: sideColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {trade.price.toFixed(2)}
              </span>
              <span style={{ width: '50px', flexShrink: 0, textAlign: 'right', color: '#e2e8f0' }}>
                {trade.size.toLocaleString()}
              </span>
              <span style={{ flex: 1, textAlign: 'right', color: '#8892a6', fontSize: '8px' }}>
                {trade.side === 'buy' ? 'B' : trade.side === 'sell' ? 'S' : '-'}
              </span>
            </div>
          )
        })}
        {trades.length === 0 && (
          <div
            style={{
              padding: '16px 8px',
              textAlign: 'center',
              color: '#8892a6',
              fontSize: '9px',
            }}
          >
            Waiting for trades...
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeInRow {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
