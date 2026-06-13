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

const EMPTY_DEPTH: OrderBookLevel[] = []

export default function OrderBook({ symbol = '', levels = 12 }: OrderBookProps) {
  const { getPrice, connected: lpConnected } = useLivePrices()
  const livePrice = symbol ? getPrice(symbol.toUpperCase()) : null

  const [wsBids, setWsBids] = useState<OrderBookLevel[] | null>(null)
  const [wsAsks, setWsAsks] = useState<OrderBookLevel[] | null>(null)
  const [wsSymbol, setWsSymbol] = useState('')
  const [flashKey, setFlashKey] = useState(0)

  const wsUrl = symbol ? `/ws/orderbook/${symbol.toUpperCase()}` : ''
  const { connected: wsConnected, lastData } = useWebSocket<{ type: string; data: OrderBookData }>(wsUrl, { maxRetries: 3, retryDelay: 5000 })

  useEffect(() => {
    if (lastData?.type === 'orderbook' && lastData?.data && lastData.data.symbol === symbol.toUpperCase()) {
      const { bids, asks } = lastData.data
      let bidTotal = 0; let askTotal = 0
      setWsBids(bids.map(([p, s]) => { bidTotal += s; return { price: p, size: s, total: bidTotal } }))
      setWsAsks(asks.map(([p, s]) => { askTotal += s; return { price: p, size: s, total: askTotal } }))
      setWsSymbol(symbol.toUpperCase())
      setFlashKey((k) => k + 1)
    }
  }, [lastData, symbol])

  const usingWsData = wsConnected && wsBids && wsAsks && wsSymbol === symbol.toUpperCase()

  const { bids, asks, spread } = useMemo(() => {
    if (usingWsData) {
      const s = wsAsks[0]?.price - wsBids[0]?.price || 0
      return { bids: wsBids.slice(0, levels), asks: wsAsks.slice(0, levels), spread: s }
    }
    return { bids: EMPTY_DEPTH, asks: EMPTY_DEPTH, spread: 0 }
  }, [usingWsData, wsBids, wsAsks, levels])

  const maxTotal = useMemo(() => {
    const all = [...bids, ...asks]
    return all.length > 0 ? Math.max(...all.map((l) => l.total)) : 1
  }, [bids, asks])

  const renderAsk = useCallback((level: OrderBookLevel) => {
    const heatPct = (level.total / maxTotal) * 100
    const heatIntensity = Math.min(heatPct / 60, 1)
    return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', position: 'relative', ...FONT_DATA }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: `color-mix(in srgb, var(--accent-red) ${15 + heatIntensity * 35}%, transparent)`, width: `${heatPct}%`, transition: 'width 0.3s ease' }} />
      <div style={{ position: 'absolute', right: `${100 - heatPct}%`, top: 0, bottom: 0, width: `${Math.min(heatPct * 0.3, 20)}%`, background: `color-mix(in srgb, var(--accent-red) ${heatIntensity * 20}%, transparent)`, filter: 'blur(4px)' }} />
      <span style={{ color: 'var(--accent-red)', position: 'relative', zIndex: 1, fontWeight: heatIntensity > 0.7 ? 700 : 400 }}>{level.price.toFixed(2)}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.size.toFixed(1)}</span>
      <span style={{ color: 'var(--text-secondary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.total.toFixed(1)}</span>
    </div>
  )}, [maxTotal])

  const renderBid = useCallback((level: OrderBookLevel) => {
    const heatPct = (level.total / maxTotal) * 100
    const heatIntensity = Math.min(heatPct / 60, 1)
    return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', position: 'relative', ...FONT_DATA }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: `color-mix(in srgb, var(--accent-green) ${15 + heatIntensity * 35}%, transparent)`, width: `${heatPct}%`, transition: 'width 0.3s ease' }} />
      <div style={{ position: 'absolute', right: `${100 - heatPct}%`, top: 0, bottom: 0, width: `${Math.min(heatPct * 0.3, 20)}%`, background: `color-mix(in srgb, var(--accent-green) ${heatIntensity * 20}%, transparent)`, filter: 'blur(4px)' }} />
      <span style={{ color: 'var(--accent-green)', position: 'relative', zIndex: 1, fontWeight: heatIntensity > 0.7 ? 700 : 400 }}>{level.price.toFixed(2)}</span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.size.toFixed(1)}</span>
      <span style={{ color: 'var(--text-secondary)', textAlign: 'right', position: 'relative', zIndex: 1 }}>{level.total.toFixed(1)}</span>
    </div>
  )}, [maxTotal])

  const statusColor = wsConnected ? 'var(--accent-green)' : lpConnected ? 'var(--accent-yellow)' : 'var(--accent-red)'
  const statusLabel = wsConnected ? 'LIVE' : lpConnected ? 'SIM' : 'OFF'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      {!usingWsData && bids.length === 0 && (
        <div style={{ padding: '8px 8px', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          No L2 depth available — waiting for real-time feed
        </div>
      )}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>
          ORDER BOOK {symbol && `— ${symbol}`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...FONT_SM }}>
          {!wsConnected && (
            <span style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--accent-yellow)', padding: '0 4px', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: '0.5px' }}>
              DEMO
            </span>
          )}
          <span style={{ width: 6, height: 6, background: statusColor }} />
          <span style={{ color: 'var(--text-muted)' }}>{statusLabel}</span>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '2px 8px', ...FONT_LABEL, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        <span>Price</span><span style={{ textAlign: 'right' }}>Size</span><span style={{ textAlign: 'right' }}>Total</span>
      </div>

      <VirtualList items={asks} itemHeight={ROW_HEIGHT} renderItem={renderAsk} maxHeight={levels * ROW_HEIGHT} keyExtractor={(_, i) => `ask-${i}`} />

      {spread > 0 && (
        <div key={flashKey} className={flashKey > 0 ? 'animate-flash-green' : ''} style={{ padding: '2px 8px', background: 'var(--border-color)', textAlign: 'center', ...FONT_SM, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          SPREAD: ${spread.toFixed(2)}
        </div>
      )}

      <VirtualList items={bids} itemHeight={ROW_HEIGHT} renderItem={renderBid} maxHeight={levels * ROW_HEIGHT} keyExtractor={(_, i) => `bid-${i}`} />
    </div>
  )
}
