import { useEffect, useState, useMemo, useRef } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ExportButton from '../components/ui/ExportButton'
import ErrorBoundary from '../components/ErrorBoundary'
import DataTable from '../components/ui/DataTable'
import { fetchPortfolioHistory } from '../api/client'
import { fmtCurrency, fmtNumber } from '../utils/format'
import { useWebSocket } from '../hooks/useWebSocket'
import ChartContainer from '../components/ChartContainer'
import { useToastStore } from '../store/toast'
import { useUrlState } from '../hooks/useUrlState'

function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {[1,2,3,4].map((i) => (
          <div key={i} className="bg-card border border-default p-1.5">
            <Skeleton width={80} height={12} />
            <Skeleton width={100} height={20} className="mt-1" />
          </div>
        ))}
      </div>
      <Card title="POSITIONS">
        <Skeleton count={5} height={16} />
      </Card>
      <Card title="RISK METRICS">
        <div className="grid grid-cols-5 gap-2">
          {[1,2,3,4,5].map((i) => (
            <div key={i}><Skeleton width={60} height={12} /><Skeleton width={80} height={16} className="mt-1" /></div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function Portfolio() {
  const { portfolio, metrics, load, updatePortfolio } = usePortfolioStore()
  const [equityHistory, setEquityHistory] = useState<{ time: string; value: number }[]>([])
  const [viewMode, setViewMode] = useUrlState('view', 'table')
  const [loading, setLoading] = useState(true)
  const { lastData: wsPortfolio, connected: wsConnected } = useWebSocket<{ type: string; data: { portfolio: any; metrics: any } }>('/ws/portfolio', { maxRetries: 999 })

  useEffect(() => {
    if (wsPortfolio?.type === 'portfolio' && wsPortfolio?.data) {
      if (wsPortfolio.data.portfolio) updatePortfolio(wsPortfolio.data.portfolio)
    }
  }, [wsPortfolio, updatePortfolio])

  useEffect(() => {
    load()
    fetchPortfolioHistory().then((hist) => {
      setEquityHistory(
        hist
          .filter((h) => /^\d{4}-\d{2}-\d{2}/.test(h.timestamp))
          .map((h) => ({ time: h.timestamp.split(/[T ]/)[0], value: h.total_value }))
      )
    }).catch((err) => { useToastStore.getState().addToast(`Failed to load portfolio history: ${(err as Error).message}`, 'error') })
    .finally(() => setLoading(false))
  }, [])

  const positions = portfolio?.positions ? Object.entries(portfolio.positions) : []

  const positionRows = useMemo(() =>
    positions.map(([symbol, pos]) => {
      const dailyPnl = pos.daily_pnl ?? 0
      return {
        id: symbol,
        symbol, side: pos.side, quantity: pos.quantity,
        entry_price: pos.entry_price?.toFixed(2) ?? '0.00',
        current_price: pos.current_price?.toFixed(2) ?? '0.00',
        market_value: fmtNumber(pos.market_value ?? 0, 0),
        unrealized_pnl: pos.unrealized_pnl?.toFixed(2) ?? '0.00',
        pnlDirection: (pos.unrealized_pnl ?? 0) >= 0 ? 'up' : 'down',
        daily_pnl: dailyPnl.toFixed(2),
        dailyDirection: dailyPnl >= 0 ? 'up' : 'down',
      }
    }),
    [positions]
  )

  const posColumns = useMemo(() => [
    { key: 'symbol', label: 'Symbol', width: '72px', render: (r: any) => <span className="text-accent-cyan font-semibold">{r.symbol}</span>, sortable: true, sortValue: (r: any) => r.symbol },
    { key: 'side', label: 'Side', width: '56px', render: (r: any) => <span className={r.side === 'LONG' ? 'text-up' : 'text-down'}>{r.side}</span>, sortable: true, sortValue: (r: any) => r.side, align: 'right' as const },
    { key: 'quantity', label: 'Qty', width: '72px', render: (r: any) => r.quantity, sortable: true, sortValue: (r: any) => Number(r.quantity), align: 'right' as const },
    { key: 'entry_price', label: 'Entry', width: '80px', render: (r: any) => `$${r.entry_price}`, sortable: true, sortValue: (r: any) => Number(r.entry_price), align: 'right' as const },
    { key: 'current_price', label: 'Current', width: '80px', render: (r: any) => `$${r.current_price}`, sortable: true, sortValue: (r: any) => Number(r.current_price), align: 'right' as const },
    { key: 'market_value', label: 'Mkt Val', width: '80px', render: (r: any) => `$${r.market_value}`, sortable: true, sortValue: (r: any) => Number(r.market_value.replace(/,/g, '')), align: 'right' as const },
    { key: 'unrealized_pnl', label: 'P&L', width: '88px', render: (r: any) => <span className={r.pnlDirection === 'up' ? 'text-up' : 'text-down'}>{Number(r.unrealized_pnl) >= 0 ? '+' : ''}${r.unrealized_pnl}</span>, sortable: true, sortValue: (r: any) => Number(r.unrealized_pnl), align: 'right' as const },
    { key: 'daily_pnl', label: 'Since Yest', width: '96px', render: (r: any) => <span className={r.dailyDirection === 'up' ? 'text-up' : 'text-down'}>{Number(r.daily_pnl) >= 0 ? '+' : ''}${r.daily_pnl}</span>, sortable: true, sortValue: (r: any) => Number(r.daily_pnl), align: 'right' as const },
  ], [])

  if (loading) return <PortfolioSkeleton />

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        <KpiCard label="Total Value" value={portfolio?.total_value != null ? fmtCurrency(portfolio.total_value) : '—'} trend="neutral" />
        <KpiCard label="Cash" value={portfolio?.cash != null ? fmtCurrency(portfolio.cash) : '—'} trend="neutral" />
        <KpiCard label="Realized P&L" value={`$${portfolio?.realized_gains?.toFixed(0) ?? '—'}`} trend={(portfolio?.realized_gains ?? 0) >= 0 ? 'up' : 'down'} />
        <KpiCard label="Margin Used" value={portfolio?.margin_used != null ? fmtCurrency(portfolio.margin_used) : '—'} trend="neutral" />
      </div>

      <div className="flex gap-1 items-center">
        <button onClick={() => setViewMode('table')}
          className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${
            viewMode === 'table' ? 'bg-accent-cyan text-black' : 'bg-card text-secondary'
          }`}>
          TABLE
        </button>
        <button onClick={() => setViewMode('chart')}
          className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${
            viewMode === 'chart' ? 'bg-accent-cyan text-black' : 'bg-card text-secondary'
          }`}>
          CHART
        </button>
        <div className="flex-1" />
        <button onClick={() => {
          const style = document.createElement('style')
          style.id = 'print-export-style'
          style.textContent = `@media print { body * { visibility: hidden; } .portfolio-print-area, .portfolio-print-area * { visibility: visible; } .portfolio-print-area { position: absolute; left: 0; top: 0; width: 100%; } }`
          document.head.appendChild(style)
          window.print()
          setTimeout(() => document.getElementById('print-export-style')?.remove(), 1000)
        }} className="font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm bg-card text-secondary">
          EXPORT PDF
        </button>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-mono-data tracking-wider text-muted">WS:</span>
        <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-up' : 'bg-down'}`} />
        <span className={`text-[9px] font-mono-data ${wsConnected ? 'text-up' : 'text-down'}`}>
          {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      <Card title={`Positions (${positions.length})`}>
        {positions.length > 0 ? (
          <DataTable columns={posColumns} data={positionRows} searchable={true} exportable={true} exportFilename="positions" compact />
        ) : (
          <EmptyState title="No open positions" description="Open a trade to see positions here" compact />
        )}
      </Card>

      {equityHistory.length > 0 && (
        <ErrorBoundary>
          <Card title="Equity Curve">
            <div className="h-[200px]">
              <ChartContainer type="line" data={equityHistory.map(d => ({ time: d.time, value: d.value }))} />
            </div>
          </Card>
        </ErrorBoundary>
      )}

      {portfolio && (
        <ErrorBoundary>
          <Card title="Realized vs Unrealized P&L">
            <div className="flex items-end gap-4" style={{ height: 100, padding: '8px 0' }}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="font-mono-data text-[9px] text-up">${(portfolio.realized_gains ?? 0).toFixed(0)}</span>
                <div style={{
                  width: '100%', maxWidth: 80, height: Math.max(20, Math.abs((portfolio.realized_gains ?? 0) / 10)),
                  background: (portfolio.realized_gains ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                  opacity: 0.8,
                }} />
                <span className="font-mono-data text-[8px] text-muted">Realized</span>
              </div>
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="font-mono-data text-[9px] text-down">${(Math.abs(portfolio.positions ? Object.values(portfolio.positions).reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0) : 0)).toFixed(0)}</span>
                <div style={{
                  width: '100%', maxWidth: 80, height: Math.max(20, Math.abs(Object.values(portfolio.positions || {}).reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0)) / 10),
                  background: (Object.values(portfolio.positions || {}).reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0)) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  opacity: 0.6,
                }} />
                <span className="font-mono-data text-[8px] text-muted">Unrealized</span>
              </div>
            </div>
          </Card>
        </ErrorBoundary>
      )}

      <Card title="Risk Metrics">
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'SHARPE', value: metrics?.sharpe_ratio?.toFixed(2) ?? '—' },
            { label: 'SORTINO', value: metrics?.sortino_ratio?.toFixed(2) ?? '—' },
            { label: 'MAX DD', value: metrics ? `${(metrics.max_drawdown * 100).toFixed(1)}%` : '—', down: true },
            { label: 'WIN RATE', value: metrics ? `${(metrics.win_rate * 100).toFixed(0)}%` : '—' },
            { label: 'VaR 95%', value: metrics ? `${(metrics.var_95 * 100).toFixed(1)}%` : '—', down: true },
          ].map(item => (
            <div key={item.label}>
              <div className="font-mono-data text-[9px] tracking-wider text-muted">{item.label}</div>
              <div className={`font-mono-data text-[11px] font-semibold ${item.down ? 'text-down' : 'text-primary'}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
