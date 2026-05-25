import { useEffect, useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ExportButton from '../components/ui/ExportButton'
import ErrorBoundary from '../components/ErrorBoundary'
import { fetchPortfolioHistory } from '../api/client'
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
  const { lastData: wsPortfolio } = useWebSocket<{ type: string; data: { portfolio: any; metrics: any } }>('/api/ws/portfolio', { maxRetries: 999 })

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

  if (loading) return <PortfolioSkeleton />

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        <KpiCard label="Total Value" value={`$${portfolio?.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '—'}`} trend="neutral" />
        <KpiCard label="Cash" value={`$${portfolio?.cash?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '—'}`} trend="neutral" />
        <KpiCard label="Realized P&L" value={`$${portfolio?.realized_gains?.toFixed(0) ?? '—'}`} trend={(portfolio?.realized_gains ?? 0) >= 0 ? 'up' : 'down'} />
        <KpiCard label="Margin Used" value={`$${portfolio?.margin_used?.toLocaleString() ?? '—'}`} trend="neutral" />
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
      </div>

      <Card title={`Positions (${positions.length})`} actions={
        <ExportButton
          data={positions.map(([symbol, pos]) => ({
            symbol, side: pos.side, quantity: pos.quantity, entry_price: pos.entry_price, current_price: pos.current_price, market_value: pos.market_value, unrealized_pnl: pos.unrealized_pnl,
          })) as unknown as Record<string, unknown>[]}
          filename="positions"
        />
      }>
        {positions.length > 0 ? (
          <div>
            <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1.5fr_1.5fr] py-1 border-b border-default font-mono-data text-[9px] tracking-wider text-muted">
              <span>Symbol</span><span className="text-right">Side</span><span className="text-right">Qty</span><span className="text-right">Entry</span><span className="text-right">Current</span><span className="text-right">Mkt Val</span><span className="text-right">P&L</span>
            </div>
            {positions.map(([symbol, pos]) => {
              const pnl = pos.unrealized_pnl ?? 0
              return (
                <div key={symbol} className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1.5fr_1.5fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                  <span className="text-accent-cyan font-semibold">{symbol}</span>
                  <span className={`text-right ${pos.side === 'LONG' ? 'text-up' : 'text-down'}`}>{pos.side}</span>
                  <span className="text-right">{pos.quantity}</span>
                  <span className="text-right">${pos.entry_price.toFixed(2)}</span>
                  <span className="text-right">${pos.current_price.toFixed(2)}</span>
                  <span className="text-right">${pos.market_value.toLocaleString()}</span>
                  <span className={`text-right font-semibold ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
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
