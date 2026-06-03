import { useEffect, useState, useCallback } from 'react'
import { useLivePrices } from '../contexts/LivePricesContext'
import { useWebSocket } from '../hooks/useWebSocket'
import VirtualList from './VirtualList'

interface TradePrint {
  price: number
  size: number
  time: string
  side: 'buy' | 'sell' | 'neutral'
}

interface TimeAndSalesProps {
  symbol?: string
}

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }
const ROW_HEIGHT = 20

function TradeRow({ trade }: { trade: TradePrint }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, padding: '0 8px', ...FONT_DATA }}>
      <span style={{ color: trade.side === 'buy' ? 'var(--accent-green)' : trade.side === 'sell' ? 'var(--accent-red)' : 'var(--text-secondary)', fontWeight: 500 }}>
        {trade.price.toFixed(2)}
      </span>
      <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{trade.size.toFixed(0)}</span>
      <span style={{ color: 'var(--text-secondary)', textAlign: 'right', ...FONT_SM }}>{trade.time}</span>
    </div>
  )
}

export default function TimeAndSales({ symbol = '' }: TimeAndSalesProps) {
  const [trades, setTrades] = useState<TradePrint[]>([])
  const { connected: lpConnected } = useLivePrices()

  const wsUrl = symbol ? `/ws/trades/${symbol.toUpperCase()}` : ''
  const { connected: wsConnected, lastData } = useWebSocket<{ type: string; data: { price: number; size: number; time: string; side: string }[] }>(wsUrl, { maxRetries: 3, retryDelay: 5000 })

  useEffect(() => {
    if (lastData?.type === 'trades' && lastData?.data && Array.isArray(lastData.data)) {
      const newTrades: TradePrint[] = lastData.data.map(t => ({
        price: t.price, size: t.size, time: t.time || new Date().toLocaleTimeString(),
        side: (t.side === 'buy' || t.side === 'sell') ? t.side : 'neutral',
      }))
      setTrades(prev => [...newTrades, ...prev].slice(0, 200))
    }
  }, [lastData])

  const renderTrade = useCallback((trade: TradePrint) => <TradeRow trade={trade} />, [])

  const statusColor = wsConnected ? 'var(--accent-green)' : lpConnected ? 'var(--accent-yellow)' : 'var(--accent-red)'
  const statusLabel = wsConnected ? 'LIVE' : lpConnected ? 'SIM' : 'OFF'

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...FONT_DATA, fontWeight: 600, color: 'var(--text-primary)' }}>
          TIME & SALES {symbol && `— ${symbol}`}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...FONT_SM }}>
          <span style={{ width: 6, height: 6, background: statusColor }} />
          <span style={{ color: 'var(--text-muted)' }}>{statusLabel}</span>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, padding: '2px 8px', ...FONT_LABEL, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
        <span>Price</span><span style={{ textAlign: 'right' }}>Size</span><span style={{ textAlign: 'right' }}>Time</span>
      </div>
      {trades.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', ...FONT_SM, color: 'var(--text-muted)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Waiting for trades...
        </div>
      ) : (
        <VirtualList items={trades} itemHeight={ROW_HEIGHT} renderItem={renderTrade} maxHeight={240} keyExtractor={(_, i) => `trade-${i}`} />
      )}
    </div>
  )
}
