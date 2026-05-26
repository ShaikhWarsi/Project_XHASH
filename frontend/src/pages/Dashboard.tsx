import { useEffect, useState, useCallback } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useSignalStore } from '../store/signals'
import { connectDashboardSSE, fetchPortfolioHistory, fetchOHLCV, fetchTrades } from '../api/client'
import { useConnectionStore } from '../store/connection'
import type { DashboardSnapshot, Trade } from '../api/types'
import type { TradeMarker } from '../components/EquityCurveChart'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import ErrorBoundary from '../components/ErrorBoundary'
import EquityCurveChart from '../components/EquityCurveChart'
import Skeleton from '../components/Skeleton'
import Badge from '../components/ui/Badge'
import ActivityFeed from '../components/ActivityFeed'
import SectorAllocationChart from '../components/SectorAllocationChart'
import StarButton from '../components/StarButton'
import DraggableGrid from '../components/DraggableGrid'
import MarketTickerBarEnhanced from '../components/widgets/MarketTickerBarEnhanced'
import AddWidgetModal from '../components/widgets/AddWidgetModal'
import { DASHBOARD_TEMPLATES, applyTemplate, loadLayout, saveLayout } from '../components/widgets/DashboardTemplate'
import HeatMapWidget from '../components/widgets/HeatMapWidget'
import TopMoversWidget from '../components/widgets/TopMoversWidget'
import RiskMetricsWidget from '../components/widgets/RiskMetricsWidget'
import ScreenerWidget from '../components/widgets/ScreenerWidget'
import { useEventBus, EVENTS } from '../contexts/EventBusContext'
import { useAudio } from '../contexts/AudioAlertContext'
import { useToastStore } from '../store/toast'

function DataRow({ label, value, up, down }: { label: string; value: string; up?: boolean; down?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[9px] font-mono-data tracking-wider text-muted">{label}</span>
      <span className={`font-mono-data font-semibold ${up ? 'text-up' : down ? 'text-down' : 'text-primary'}`}>{value}</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {[1,2,3,4].map((i) => (
          <div key={i} className="bg-card border border-default rounded-lg p-3">
            <Skeleton width={80} height={12} />
            <Skeleton width={120} height={24} className="mt-1" />
            <Skeleton width={60} height={10} className="mt-1" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-card border border-default rounded-lg">
          <div className="px-3 py-2 border-b border-default">
            <Skeleton width={100} height={12} />
          </div>
          <div className="p-3"><Skeleton height={120} /></div>
        </div>
        <div className="bg-card border border-default rounded-lg">
          <div className="px-3 py-2 border-b border-default">
            <Skeleton width={80} height={12} />
          </div>
          <div className="p-3"><Skeleton height={120} /></div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { portfolio, metrics, load: loadPortfolio } = usePortfolioStore()
  const { signals, load: loadSignals } = useSignalStore()
  const setSSE = useConnectionStore((s) => s.setSSE)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [equityHistory, setEquityHistory] = useState<{ time: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [benchmarkHistory, setBenchmarkHistory] = useState<{ time: string; value: number }[]>([])
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[]>([])
  const { on, emit } = useEventBus()
  const { playSuccess, playError, playAlert, playNotification } = useAudio()
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    const unsubRefresh = on(EVENTS.REFRESH_REQUESTED, () => {
      loadPortfolio()
      loadSignals()
    })

    const unsubBacktest = on(EVENTS.BACKTEST_COMPLETE, () => {
      addToast('Backtest results ready', 'success')
      playSuccess()
    })

    const unsubOrder = on(EVENTS.ORDER_PLACED, () => {
      loadPortfolio()
      playNotification()
    })

    const unsubSignal = on(EVENTS.SIGNAL_SELECTED, () => {
      playAlert()
    })

    Promise.all([
      loadPortfolio(),
      loadSignals(),
      fetchPortfolioHistory().then((hist) => {
        setEquityHistory(
          hist
            .filter((h) => /^\d{4}-\d{2}-\d{2}/.test(h.timestamp))
            .map((h) => ({ time: h.timestamp.split(/[T ]/)[0], value: h.total_value }))
        )
      }).catch((err) => { console.warn('Dashboard: portfolio history failed', err); addToast('Failed to load portfolio history', 'error') }),
      fetchTrades().then((trades: Trade[]) => {
        setTradeMarkers(
          trades.map((t) => ({
            time: t.timestamp.split(/[T ]/)[0],
            type: t.side === 'buy' ? 'buy' : 'sell',
            price: t.price,
          }))
        )
      }).catch((err) => { console.warn('Dashboard: trades fetch failed', err); addToast('Failed to load trades', 'error') }),
    ]).finally(() => setLoading(false))

    const es = connectDashboardSSE(
      (snap) => {
        setSnapshot(snap)
        setLoading(false)
        setSSE('connected')
        emit(EVENTS.REFRESH_REQUESTED, snap)
      },
      (stale) => {
        setIsStale(stale)
        setSSE(stale ? 'error' : 'connected')
      },
    )

    return () => {
      es.close()
      unsubRefresh()
      unsubBacktest()
      unsubOrder()
    }
  }, [loadPortfolio, loadSignals, on, emit, addToast, setSSE])

  useEffect(() => {
    if (!showBenchmark || benchmarkHistory.length > 0) return
    fetchOHLCV('SPY', '1d', '6mo')
      .then((bars) => {
        const firstClose = bars[0]?.close || 1
        setBenchmarkHistory(
          bars
            .filter((b) => b.time)
            .map((b) => ({
              time: typeof b.time === 'string' ? b.time.split('T')[0] : String(b.time),
              value: b.close / firstClose,
            }))
        )
      })
      .catch((err) => { console.warn('Dashboard: benchmark fetch failed', err); addToast('Failed to load benchmark', 'error') })
  }, [showBenchmark, benchmarkHistory.length])

  const effective = snapshot?.portfolio ?? portfolio
  const totalValue = effective?.total_value ?? 0
  const cash = effective?.cash ?? 0
  const posMap = effective?.positions ?? {}
  const posCount = Object.keys(posMap).length

  const sectorData = Object.entries(posMap).reduce<Record<string, number>>((acc, [_, pos]) => {
    const sector = (pos as any).sector || 'Other'
    acc[sector] = (acc[sector] || 0) + Math.abs(pos.market_value || 0)
    return acc
  }, {})
  const totalSectorValue = Object.values(sectorData).reduce((s, v) => s + v, 0)
  const sectorShares = Object.entries(sectorData).map(([name, value]) => ({
    name,
    exposure: totalSectorValue > 0 ? value / totalSectorValue : 0,
  }))
  const m = snapshot?.metrics ?? metrics
  const unrealizedPnl = totalValue - cash

  const widgetIds = ['kpis', 'positions-signals', 'equity-curve', 'risk-status', 'sector-allocation', 'attribution', 'heatmap', 'top-movers', 'risk-metrics', 'screener']
  const [activeWidgets, setActiveWidgets] = useState<string[]>(() => loadLayout('default') || widgetIds)
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState('default')

  const handleAddWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) => {
      if (prev.includes(widgetId)) return prev
      const next = [...prev, widgetId]
      saveLayout(next)
      return next
    })
  }, [])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setActiveWidgets((prev) => {
      const next = prev.filter((id) => id !== widgetId)
      saveLayout(next)
      return next
    })
  }, [])

  const handleApplyTemplate = useCallback((templateId: string) => {
    setActiveTemplate(templateId)
    setActiveWidgets(applyTemplate(templateId))
  }, [])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-1.5">
      {/* MARKET TICKER */}
      <MarketTickerBarEnhanced />

      {/* TOP STATUS BAR */}
      <div className="flex items-center justify-between bg-card border border-default px-3 py-1.5">
        <div className="flex items-center gap-4">
          <DataRow label="NAV" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <span className="text-border">|</span>
          <DataRow label="CASH" value={`$${cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <span className="text-border">|</span>
          <DataRow label="P&L" value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(0)}`} up={unrealizedPnl > 0} down={unrealizedPnl < 0} />
          <span className="text-border">|</span>
          <DataRow label="POS" value={String(posCount)} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {DASHBOARD_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleApplyTemplate(t.id)}
                className="font-mono-data text-[8px] px-1.5 py-0.5 cursor-pointer rounded-sm uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: activeTemplate === t.id ? 'var(--accent-cyan)' : 'transparent',
                  border: `1px solid ${activeTemplate === t.id ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                  color: activeTemplate === t.id ? '#000' : 'var(--text-muted)',
                }}
                title={t.description}
              >
                {t.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddWidget(true)}
            className="font-mono-data text-[8px] px-2 py-0.5 cursor-pointer rounded-sm uppercase tracking-wider"
            style={{
              border: '1px solid var(--border-color)',
              color: 'var(--accent-cyan)',
            }}
          >
            + WIDGET
          </button>
          {isStale && <Badge label="STALE" variant="warning" />}
          {snapshot && <span className="font-mono-data text-[10px] text-muted">{new Date(snapshot.timestamp).toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* DRAGGABLE WIDGETS */}
      <DraggableGrid
        storageKey="dashboard_widget_order"
        showControls
        items={[
          {
            id: 'kpis',
            label: 'KPI Cards',
            content: (
              <div className="grid grid-cols-4 gap-1.5">
                <KpiCard
                  label="Total Return"
                  value={m ? `${(m.total_return * 100).toFixed(1)}%` : '—'}
                  trend={m ? (m.total_return > 0 ? 'up' : 'down') : 'neutral'}
                  subtitle={`Sharpe ${m?.sharpe_ratio?.toFixed(2) ?? '—'}`}
                />
                <KpiCard
                  label="Win Rate"
                  value={m ? `${(m.win_rate * 100).toFixed(0)}%` : '—'}
                  trend={m ? (m.win_rate > 0.5 ? 'up' : 'down') : 'neutral'}
                  subtitle={`${m?.total_trades ?? 0} trades`}
                />
                <KpiCard
                  label="Max Drawdown"
                  value={m ? `${(m.max_drawdown * 100).toFixed(1)}%` : '—'}
                  trend="down"
                  subtitle={m?.max_drawdown_duration ? `${m.max_drawdown_duration}d` : '—'}
                />
                <KpiCard
                  label="Sortino"
                  value={m?.sortino_ratio?.toFixed(2) ?? '—'}
                  trend={m ? (m.sortino_ratio > 1 ? 'up' : 'neutral') : 'neutral'}
                  subtitle={`VaR ${m ? `${(m.var_95 * 100).toFixed(1)}%` : '—'}`}
                />
              </div>
            ),
            defaultSize: { w: 1, h: 60 },
          },
          {
            id: 'positions-signals',
            label: 'Positions & Signals',
            content: (
              <div className="grid grid-cols-2 gap-1.5">
                <Card title={`Positions (${posCount})`}>
                  {posCount > 0 ? (
                    <div>
                      <div className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
                        <span>Symbol</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">P&L</span>
                      </div>
                      {Object.entries(posMap).slice(0, 12).map(([symbol, pos]) => {
                        const pnl = pos.unrealized_pnl ?? 0
                        return (
                          <div key={symbol} className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                            <span className="text-accent-cyan font-semibold">{symbol}</span>
                            <span className="text-right">{pos.quantity}</span>
                            <span className="text-right">${(pos.market_value / pos.quantity).toFixed(2)}</span>
                            <span className={`text-right ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
                              {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center font-mono-data text-[10px] text-muted">No open positions</div>
                  )}
                </Card>

                <Card title="Signals">
                  {signals?.signals && Object.values(signals.signals).some((s) => s.length > 0) ? (
                    <div>
                      <div className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr] py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
                        <span>Symbol</span>
                        <span>Type</span>
                        <span className="text-center">Dir</span>
                        <span className="text-right">Conf</span>
                      </div>
                      {Object.entries(signals.signals).slice(0, 12).map(([symbol, sigs]) =>
                        sigs.slice(0, 2).map((sig, i) => (
                          <div key={`${symbol}-${i}`} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                            <span className="text-accent-cyan font-semibold">{symbol}</span>
                            <span className="text-secondary">{sig.type}</span>
                            <span className={`text-center ${sig.direction > 0 ? 'text-up' : sig.direction < 0 ? 'text-down' : 'text-muted'}`}>
                              {sig.direction > 0 ? '\u2191' : sig.direction < 0 ? '\u2193' : '—'}
                            </span>
                            <span className="text-right text-secondary">{(sig.confidence * 100).toFixed(0)}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center font-mono-data text-[10px] text-muted">No active signals</div>
                  )}
                </Card>
              </div>
            ),
            defaultSize: { w: 1, h: 200 },
          },
          {
            id: 'equity-curve',
            label: 'Equity Curve',
            content: (
              <Card
                title="Equity Curve"
                actions={
                  equityHistory.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-[10px] text-muted">
                        {showBenchmark ? 'Portfolio vs SPY' : 'Portfolio'}
                      </span>
                      <button
                        onClick={() => setShowBenchmark(!showBenchmark)}
                        className="text-[9px] font-mono px-2 py-0.5 cursor-pointer rounded-sm border transition-colors"
                        style={{
                          background: showBenchmark ? 'rgba(59,130,246,0.15)' : 'none',
                          borderColor: 'var(--border-color)',
                          color: showBenchmark ? 'var(--accent-blue)' : 'var(--text-muted)',
                        }}
                      >
                        {showBenchmark ? 'HIDE SPY' : 'VS SPY'}
                      </button>
                    </div>
                  ) : undefined
                }
              >
                <ErrorBoundary>
                  <EquityCurveChart
                    equity={equityHistory}
                    trades={tradeMarkers}
                    benchmark={showBenchmark ? benchmarkHistory : undefined}
                  />
                </ErrorBoundary>
              </Card>
            ),
            defaultSize: { w: 1, h: 340 },
          },
          {
            id: 'risk-status',
            label: 'Risk & Status',
            content: (
              <div className="grid grid-cols-2 gap-1.5">
                <Card title="Risk Metrics">
                  <div className="grid grid-cols-4 gap-x-2 gap-y-1">
                    <DataRow label="SHARPE" value={m?.sharpe_ratio?.toFixed(2) ?? '—'} up={m ? m.sharpe_ratio > 1 : false} down={m ? m.sharpe_ratio < 0 : false} />
                    <DataRow label="SORTINO" value={m?.sortino_ratio?.toFixed(2) ?? '—'} up={m ? m.sortino_ratio > 1 : false} down={m ? m.sortino_ratio < 0 : false} />
                    <DataRow label="VaR 95%" value={m ? `${(m.var_95 * 100).toFixed(1)}%` : '—'} down />
                    <DataRow label="CVaR 95%" value={m ? `${(m.cvar_95 * 100).toFixed(1)}%` : '—'} down />
                    <DataRow label="MAX DD" value={m ? `${(m.max_drawdown * 100).toFixed(1)}%` : '—'} down />
                    <DataRow label="WIN RATE" value={m ? `${(m.win_rate * 100).toFixed(0)}%` : '—'} up={m ? m.win_rate > 0.5 : false} down={m ? m.win_rate < 0.3 : false} />
                    <DataRow label="ANN RET" value={m ? `${(m.annualized_return * 100).toFixed(1)}%` : '—'} up={m ? m.annualized_return > 0 : false} down={m ? m.annualized_return < 0 : false} />
                    <DataRow label="PROFIT FACTOR" value={m?.profit_factor?.toFixed(2) ?? '—'} up={m ? m.profit_factor > 1.5 : false} />
                  </div>
                </Card>

                <Card title="System Status">
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                    <DataRow label="TRADES" value={String(m?.total_trades ?? 0)} />
                    <DataRow label="CALMAR" value={m?.calmar_ratio?.toFixed(2) ?? '—'} />
                    <DataRow label="REGIME" value={signals?.regime?.primary ?? '—'} />
                    <DataRow label="ANN VOL" value={m ? `${(m.annualized_vol * 100).toFixed(1)}%` : '—'} />
                    <DataRow label="DD DUR" value={m?.max_drawdown_duration ? `${m.max_drawdown_duration}d` : '—'} />
                    <span />
                  </div>
                  {snapshot?.open_orders && snapshot.open_orders.length > 0 && (
                    <div className="mt-2 border-t border-default pt-2">
                      <div className="text-[9px] font-mono-data tracking-wider text-muted mb-1">
                        <Badge label={`${snapshot.open_orders.length} OPEN ORDERS`} variant="warning" size="sm" />
                      </div>
                      {snapshot.open_orders.slice(0, 4).map((o: any, i: number) => (
                        <div key={i} className="flex items-center justify-between font-mono-data text-[11px] text-primary py-px">
                          <span className="text-accent-cyan font-semibold">{o.symbol}</span>
                          <span style={{ color: o.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {o.side?.toUpperCase()} {o.quantity} @ ${o.price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            ),
            defaultSize: { w: 1, h: 200 },
          },
          {
            id: 'sector-allocation',
            label: 'Sector Allocation',
            content: sectorShares.length > 0 ? (
              <Card
                title="Sector Allocation"
                actions={<StarButton pageId="dashboard-sector" />}
              >
                <SectorAllocationChart sectors={sectorShares} onSectorClick={(name) => addToast(`Showing ${name} holdings`, 'info')} />
              </Card>
            ) : null,
            defaultSize: { w: 1, h: 160 },
          },
          {
            id: 'attribution',
            label: 'Attribution',
            content: snapshot?.attribution && Object.keys(snapshot.attribution).length > 0 ? (
              <Card title="Attribution">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1">
                  {Object.entries(snapshot.attribution).map(([k, v]) => {
                    const isNum = typeof v === 'number'
                    return (
                      <div key={k} className={`font-mono-data text-[11px] ${isNum && (v as number) > 0 ? 'text-up' : isNum && (v as number) < 0 ? 'text-down' : 'text-primary'}`}>
                        <div className="text-[9px] font-mono-data tracking-wider text-muted">{k.replace(/_/g, ' ')}</div>
                        <div>{isNum ? ((v as number) * 100).toFixed(2) + '%' : String(v).slice(0, 25)}</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ) : null,
            defaultSize: { w: 1, h: 120 },
          },
          {
            id: 'heatmap',
            label: 'Sector Heatmap',
            content: <HeatMapWidget id="heatmap" onRemove={() => handleRemoveWidget('heatmap')} />,
            defaultSize: { w: 1, h: 260 },
          },
          {
            id: 'top-movers',
            label: 'Top Movers',
            content: <TopMoversWidget id="top-movers" onRemove={() => handleRemoveWidget('top-movers')} />,
            defaultSize: { w: 1, h: 280 },
          },
          {
            id: 'risk-metrics',
            label: 'Risk Metrics',
            content: <RiskMetricsWidget id="risk-metrics" onRemove={() => handleRemoveWidget('risk-metrics')} />,
            defaultSize: { w: 1, h: 300 },
          },
          {
            id: 'screener',
            label: 'Stock Screener',
            content: <ScreenerWidget id="screener" onRemove={() => handleRemoveWidget('screener')} />,
            defaultSize: { w: 1, h: 300 },
          },
        ].filter((item) => item.content !== null && activeWidgets.includes(item.id))}
      />

      <AddWidgetModal
        isOpen={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        onAdd={handleAddWidget}
        activeWidgets={activeWidgets}
      />

      {/* ACTIVITY FEED */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all border"
          style={{
            background: showActivity ? 'var(--accent-blue)' : 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            color: showActivity ? '#fff' : 'var(--text-secondary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          title="Activity Feed"
        >
          <span className="text-sm">⚡</span>
        </button>
        {showActivity && (
          <div
            className="absolute bottom-full right-0 mb-2 w-[360px] max-h-[400px] overflow-y-auto bg-card border border-default shadow-lg"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-default">
              <span className="text-[9px] font-mono-data tracking-wider text-muted uppercase">
                Activity Feed
              </span>
              <button
                onClick={() => setShowActivity(false)}
                className="bg-none border-none text-muted cursor-pointer text-[10px]"
              >
                ✕
              </button>
            </div>
            <ActivityFeed />
          </div>
        )}
      </div>
    </div>
  )
}
