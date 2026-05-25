import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLivePrices } from '../contexts/LivePricesContext'
import { useWebSocket } from '../hooks/useWebSocket'
import VirtualList from './VirtualList'

interface OrderBookLevel {
  price: number
  size: number
  total: number
}

interface OrderBookData {
  bids: [number, number][]
  asks: [number, number][]
  symbol: string
}

interface OrderBookProps {
  symbol?: string
  levels?: number
}

const ROW_HEIGHT = 20
const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

function generateDepth(price: number, count: number): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const bids: OrderBookLevel[] = []
  const asks: OrderBookLevel[] = []
  let bidTotal = 0
  let askTotal = 0
  for (let i = 0; i < count; i++) {
    const bSize = Math.random() * 3000 + 200
    const aSize = Math.random() * 3000 + 200
    bidTotal += bSize
    askTotal += aSize
    bids.push({ price: parseFloat((price - (i + 1) * 0.01 * (1 + Math.random() * 0.5)).toFixed(2)), size: parseFloat(bSize.toFixed(1)), total: parseFloat(bidTotal.toFixed(1)) })
    asks.push({ price: parseFloat((price + (i + 1) * 0.01 * (1 + Math.random() * 0.5)).toFixed(2)), size: parseFloat(aSize.toFixed(1)), total: parseFloat(askTotal.toFixed(1)) })
  }
  return { bids, asks }
}

export default function OrderBook({ symbol = '', levels = 12 }: OrderBookProps) {
  const { getPrice, connected: lpConnected } = useLivePrices()
  const livePrice = symbol ? getPrice(symbol.toUpperCase()) : null
  const centerPrice = livePrice?.price ?? 100

  const [wsBids, setWsBids] = useState<OrderBookLevel[] | null>(null)
  const [wsAsks, setWsAsks] = useState<OrderBookLevel[] | null>(null)
  const [wsSymbol, setWsSymbol] = useState('')

  const wsUrl = symbol ? `/api/ws/orderbook/${symbol.toUpperCase()}` : ''
  const { connected: wsConnected, lastData } = useWebSocket<{ type: string; data: OrderBookData }>(wsUrl, { maxRetries: 3, retryDelay: 5000 })

  useEffect(() => {
    if (lastData?.type === 'orderbook' && lastData?.data && lastData.data.symbol === symbol.toUpperCase()) {
      const { bids, asks } = lastData.data
      let bidTotal = 0; let askTotal = 0
      setWsBids(bids.map(([p, s]) => { bidTotal += s; return { price: p, size: s, total: bidTotal } }))
      setWsAsks(asks.map(([p, s]) => { askTotal += s; return { price: p, size: s, total: askTotal } }))
      setWsSymbol(symbol.toUpperCase())
    }
  }, [lastData, symbol])

  const usingWsData = wsConnected && wsBids && wsAsks && wsSymbol === symbol.toUpperCase()

  const { bids, asks, spread } = useMemo(() => {
    if (usingWsData) {
      const s = wsAsks[0]?.price - wsBids[0]?.price || 0
      return { bids: wsBids.slice(0, levels), asks: wsAsks.slice(0, levels), spread: s }
    }
    const { bids: b, asks: a } = generateDepth(centerPrice, levels)
    const s = a[0]?.price - b[0]?.price || 0
    return { bids: b, asks: a, spread: s }
  }, [usingWsData, wsBids, wsAsks, centerPrice, levels])

  const maxTotal = useMemo(() => {
    const all = [...bids, ...asks]
    return all.length > 0 ? Math.max(...all.map((l) => l.total)) : 1
  }, [bids, asks])

  const renderAsk = useCallback((level: OrderBookLevel) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', position: 'relative', ...FONT_DATA }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(239,68,68,0.12)', width: `${(level.total / maxTotal) * 100}%` }} />
      <span style={{ color: 'var(--accent-red)', position: 'relative', zIndex: 1 }}>{level.price.toFixed(2)}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.size.toFixed(1)}</span>
      <span style={{ color: 'var(--text-secondary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.total.toFixed(1)}</span>
    </div>
  ), [maxTotal])

  const renderBid = useCallback((level: OrderBookLevel) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', position: 'relative', ...FONT_DATA }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(34,197,94,0.12)', width: `${(level.total / maxTotal) * 100}%` }} />
      <span style={{ color: 'var(--accent-green)', position: 'relative', zIndex: 1 }}>{level.price.toFixed(2)}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.size.toFixed(1)}</span>
      <span style={{ color: 'var(--text-secondary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.total.toFixed(1)}</span>
    </div>
  ), [maxTotal])

  const statusColor = wsConnected ? 'var(--accent-green)' : lpConnected ? 'var(--accent-yellow)' : 'var(--accent-red)'
  const statusLabel = wsConnected ? 'LIVE' : lpConnected ? 'SIM' : 'OFF'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>
          ORDER BOOK {symbol && `— ${symbol}`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...FONT_SM }}>
          <span style={{ width: 6, height: 6, background: statusColor }} />
          <span style={{ color: 'var(--text-muted)' }}>{statusLabel}</span>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '2px 8px', ...FONT_LABEL, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        <span>Price</span><span style={{ textAlign: 'right' }}>Size</span><span style={{ textAlign: 'right' }}>Total</span>
      </div>

      <VirtualList items={asks} itemHeight={ROW_HEIGHT} renderItem={renderAsk} maxHeight={levels * ROW_HEIGHT} keyExtractor={(_, i) => `ask-${i}`} />

      {spread > 0 && (
        <div style={{ padding: '2px 8px', background: 'var(--border-color)', textAlign: 'center', ...FONT_SM, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          SPREAD: ${spread.toFixed(2)}
        </div>
      )}

      <VirtualList items={bids} itemHeight={ROW_HEIGHT} renderItem={renderBid} maxHeight={levels * ROW_HEIGHT} keyExtractor={(_, i) => `bid-${i}`} />
    </div>
  )
}
