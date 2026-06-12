import { useEffect, useCallback, useMemo, useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ExportButton from '../components/ui/ExportButton'
import Skeleton from '../components/Skeleton'
import VirtualList from '../components/VirtualList'
import ExecutionAnalytics from '../components/ExecutionAnalytics'
import { useUrlState } from '../hooks/useUrlState'
import { fmtDateTime } from '../utils/format'
import { useToastStore } from '../store/toast'

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }
const ROW_HEIGHT = 22

function TradeRow({ trade }: { trade: { id: number; symbol: string; side: string; quantity: number; price: number | null; commission: number | null; timestamp: string; pnl: number | null } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr 0.7fr', gap: 0, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, borderBottom: '1px solid var(--border-color)', ...FONT_DATA, color: 'var(--text-primary)', padding: '0 8px' }}>
      <span style={{ color: 'var(--text-muted)', ...FONT_SM }}>{fmtDateTime(trade.timestamp)}</span>
      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{trade.symbol}</span>
      <span style={{ textAlign: 'center', color: ['BUY', 'COVER'].includes(trade.side) ? 'var(--accent-green)' : 'var(--accent-red)' }}>{trade.side}</span>
      <span style={{ textAlign: 'right' }}>{trade.quantity}</span>
       <span style={{ textAlign: 'right' }}>${trade.price != null ? trade.price.toFixed(2) : '—'}</span>
       <span style={{ textAlign: 'right', color: 'var(--text-muted)' }}>${trade.commission != null ? trade.commission.toFixed(2) : '—'}</span>
      <span style={{ textAlign: 'right', fontWeight: 600, color: trade.pnl != null ? (trade.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-muted)' }}>
        {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
      </span>
    </div>
  )
}

const FONT_INPUT = { ...FONT_SM, background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: 140 }

export default function Trades() {
  const { trades, loading, error, load } = usePortfolioStore()
  const addToast = useToastStore((s) => s.addToast)
  const [search, setSearch] = useUrlState('search', '')
  const [tradeTab, setTradeTab] = useState<'list' | 'execution'>('list')

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width={200} height={16} />
        <Skeleton count={8} height={22} variant="rect" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#ef4444' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Error loading trades</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, whiteSpace: 'pre-wrap' }}>{error}</div>
        <button onClick={() => load()} style={{
          marginTop: 12, padding: '6px 14px', fontSize: 10, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          background: 'var(--bg-hover)', color: 'var(--text-primary)',
          border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer',
        }}>Retry</button>
      </div>
    )
  }

  const filteredTrades = useMemo(() => {
    if (!search) return trades
    const q = search.toUpperCase()
    return trades.filter((t) => t.symbol?.toUpperCase().includes(q))
  }, [trades, search])

  const renderTrade = useCallback((trade: { id: number; symbol: string; side: string; quantity: number; price: number; commission: number; timestamp: string; pnl: number | null }) => (
    <TradeRow key={trade.id} trade={trade} />
  ), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '2px 6px' }}>
        <Badge label="TRADES" variant="info" />
        {(['list', 'execution'] as const).map((t) => (
          <button key={t} onClick={() => setTradeTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{
              background: tradeTab === t ? 'rgba(59,130,246,0.15)' : 'none',
              border: 'none',
              color: tradeTab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}>
            {t === 'list' ? 'TRADE LIST' : 'EXECUTION ANALYTICS'}
          </button>
        ))}
      </div>
      {tradeTab === 'execution' ? (
        <ExecutionAnalytics />
      ) : (
      <Card title={`TRADES (${filteredTrades.length})`} actions={<ExportButton data={filteredTrades as unknown as Record<string, unknown>[]} filename="trades" />}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', background: 'var(--bg-card)', padding: '2px 6px' }}>
            <span style={{ ...FONT_LABEL, color: 'var(--text-muted)', marginRight: 4 }}>&gt;</span>
            <input type="text" placeholder="SEARCH SYMBOL..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...FONT_INPUT }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr 0.7fr', gap: 0, padding: '4px 8px', borderBottom: '1px solid var(--border-color)', ...FONT_LABEL, color: 'var(--text-muted)' }}>
          <span>Time</span><span>Symbol</span><span style={{ textAlign: 'center' }}>Side</span><span style={{ textAlign: 'right' }}>Qty</span><span style={{ textAlign: 'right' }}>Price</span><span style={{ textAlign: 'right' }}>Comm</span><span style={{ textAlign: 'right' }}>P&L</span>
        </div>
        {filteredTrades.length > 0 ? (
          <VirtualList
            items={filteredTrades}
            itemHeight={ROW_HEIGHT}
            renderItem={renderTrade}
            maxHeight={480}
            keyExtractor={(t) => t.id}
          />
        ) : (
          <EmptyState title="No trades recorded" description="No trades executed yet — place a paper trading order" compact
            sampleAction={{ label: 'Open Paper Trading', onClick: () => window.open('/trading/paper-trading', '_self') }} />
        )}
      </Card>
      )}
    </div>
  )
}
