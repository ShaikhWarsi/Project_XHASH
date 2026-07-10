import { useEffect, useState, useCallback, useRef } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useSignalStore } from '../store/signals'
import { connectDashboardSSE, fetchPortfolioHistory, fetchOHLCV, fetchTrades } from '../api/client'
import { useConnectionStore } from '../store/connection'
import type { DashboardSnapshot, Trade } from '../api/types'
import type { TradeMarker } from '../components/EquityCurveChart'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import ErrorBoundary from '../components/ErrorBoundary'
import { fmtCurrency } from '../utils/format'
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
import { useLivePrices } from '../contexts/LivePricesContext'
import { useToastStore } from '../store/toast'
import { RegimeSwitch } from '../components/widgets/RegimeSwitch'
import LastActionLog from '../components/LastActionLog'

const SNAPSHOT_CACHE_KEY = 'dashboard_snapshot_cache'

function loadCachedSnapshot(): DashboardSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached._cachedAt > 300_000) { localStorage.removeItem(SNAPSHOT_CACHE_KEY); return null }
    return cached
  } catch { return null }
}

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
  const cachedSnapshot = loadCachedSnapshot()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(cachedSnapshot)
  const [isStale, setIsStale] = useState(false)
  const [equityHistory, setEquityHistory] = useState<{ time: string; value: number }[]>([])
  const [loading, setLoading] = useState(!cachedSnapshot)
  const [benchmarkHistory, setBenchmarkHistory] = useState<{ time: string; value: number }[]>([])
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const { on, emit } = useEventBus()
  const { playSuccess, playError, playAlert, playNotification } = useAudio()
  const addToast = useToastStore((s) => s.addToast)

  const loadPortfolioRef = useRef(loadPortfolio)
  loadPortfolioRef.current = loadPortfolio
  const loadSignalsRef = useRef(loadSignals)
  loadSignalsRef.current = loadSignals
  const onRef = useRef(on)
  onRef.current = on
  const emitRef = useRef(emit)
  emitRef.current = emit
  const addToastRef = useRef(addToast)
  addToastRef.current = addToast
  const setSSERef = useRef(setSSE)
  setSSERef.current = setSSE
  const playSuccessRef = useRef(playSuccess)
  playSuccessRef.current = playSuccess
  const playErrorRef = useRef(playError)
  playErrorRef.current = playError
  const playAlertRef = useRef(playAlert)
  playAlertRef.current = playAlert
  const playNotificationRef = useRef(playNotification)
  playNotificationRef.current = playNotification

  useEffect(() => {
    let cancelled = false
    const unsubRefresh = onRef.current(EVENTS.REFRESH_REQUESTED, () => {
      loadPortfolioRef.current()
      loadSignalsRef.current()
    })

    const unsubBacktest = onRef.current(EVENTS.BACKTEST_COMPLETE, () => {
      addToastRef.current('Backtest results ready', 'success')
      playSuccessRef.current()
    })

    const unsubOrder = onRef.current(EVENTS.ORDER_PLACED, () => {
      loadPortfolioRef.current()
      playNotificationRef.current()
    })

    const unsubSignal = onRef.current(EVENTS.SIGNAL_SELECTED, () => {
      playAlertRef.current()
    })

    Promise.all([
      loadPortfolioRef.current(),
      loadSignalsRef.current(),
      fetchPortfolioHistory().then((hist) => {
        if (cancelled) return
        setEquityHistory(
          hist
            .filter((h) => /^\d{4}-\d{2}-\d{2}/.test(h.timestamp))
            .map((h) => ({ time: h.timestamp.split(/[T ]/)[0], value: h.total_value }))
        )
      }).catch((err) => { if (cancelled) return; console.warn('Dashboard: portfolio history failed', err); addToastRef.current('Failed to load portfolio history', 'error') }),
      fetchTrades().then((trades: Trade[]) => {
        if (cancelled) return
        setRecentTrades(trades)
        setTradeMarkers(
          trades.map((t) => {
            const isoDate = t.timestamp.split(/[T ]/)[0]
            return {
              time: isoDate,
              type: t.side === 'buy' ? 'buy' : 'sell',
              price: t.price,
            }
          })
        )
      }).catch((err) => { if (cancelled) return; console.warn('Dashboard: trades fetch failed', err); addToastRef.current('Failed to load trades', 'error') }),
    ]).finally(() => { if (!cancelled) setLoading(false) })

    const es = connectDashboardSSE(
      (snap) => {
        setSnapshot(snap)
        setLoading(false)
        setSSERef.current('connected')
        try { localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify({ ...snap, _cachedAt: Date.now() })) } catch {}
      },
      (stale) => {
        setIsStale(stale)
        setSSERef.current(stale ? 'error' : 'connected')
      },
    )

    return () => {
      cancelled = true
      es.close()
      unsubRefresh()
      unsubBacktest()
      unsubOrder()
      unsubSignal()
    }
  }, [])

  useEffect(() => {
    if (!showBenchmark || benchmarkHistory.length > 0) return
    const abort = new AbortController()
    fetchOHLCV('SPY', '1d', '6mo')
      .then((bars) => {
        if (abort.signal.aborted) return
        const firstClose = bars[0]?.close || 1
        setBenchmarkHistory(
          bars
            .filter((b) => b.time)
            .map((b) => ({
              time: typeof (b as any).time === 'string' ? (b as any).time.split('T')[0] : String((b as any).time),
              value: b.close / firstClose,
            }))
        )
      })
      .catch((err) => { if (abort.signal.aborted) return; console.warn('Dashboard: benchmark fetch failed', err); addToast('Failed to load benchmark', 'error') })
    return () => abort.abort()
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

  const [newsFeed, setNewsFeed] = useState<{ t: string; h: string; s: string; src: string }[]>([])
  const { getPrice } = useLivePrices()

  if (loading) return <DashboardSkeleton />

  const watchlist = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'IWM']
  const heatStripData = watchlist.map((s) => {
    const live = getPrice(s.toUpperCase())
    return {
      symbol: s,
      change: live?.changePercent ?? 0,
      price: live?.price ?? 0,
    }
  })

  const morningPnL = portfolio?.cash ? (portfolio.total_value - (portfolio?.cash || 0)) * 0.02 : 0
  const biggestMover = Object.keys(posMap).length > 0
    ? Object.entries(posMap).sort((a, b) => Math.abs(b[1].unrealized_pnl || 0) - Math.abs(a[1].unrealized_pnl || 0))[0]
    : null

  return (
    <div className="flex flex-col gap-1.5">
      {/* HEAT STRIP */}
      <div className="flex bg-card border border-default overflow-hidden h-[22px]">
        {heatStripData.map((h) => (
          <div key={h.symbol} className="flex-1 flex items-center justify-center font-mono-data text-[9px] border-r border-default truncate px-1"
            style={{
              background: h.change >= 2 ? 'rgba(34,197,94,0.15)' : h.change <= -2 ? 'rgba(239,68,68,0.15)' : 'none',
              color: h.change > 0 ? 'var(--accent-green)' : h.change < 0 ? 'var(--accent-red)' : 'var(--text-muted)',
            }}>
            <span className="truncate">{h.symbol} {h.change >= 0 ? '+' : ''}{h.change.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      <RegimeSwitch />

      {/* DAILY BRIEFING */}
      <Card title="DAILY BRIEFING">
        <div className="grid grid-cols-5 gap-2 font-mono-data text-[10px]">
          <div className="truncate"><span className="text-muted">Day P&L</span><div className={`font-bold truncate ${morningPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{morningPnL >= 0 ? '+' : ''}${morningPnL.toFixed(0)}</div></div>
          <div className="truncate"><span className="text-muted">Biggest Mover</span><div className="font-bold text-primary truncate">{biggestMover ? `${biggestMover[0]} ${(biggestMover[1].unrealized_pnl ?? 0) >= 0 ? '+' : ''}$${(biggestMover[1].unrealized_pnl ?? 0).toFixed(0)}` : '—'}</div></div>
          <div className="truncate"><span className="text-muted">Top Signal</span><div className="font-bold text-accent-cyan truncate">{signals?.signals && Object.values(signals.signals).flat().length > 0 ? Object.values(signals.signals).flat()[0]?.type || '—' : '—'}</div></div>
          <div className="truncate"><span className="text-muted">Regime</span><div className="font-bold text-accent-yellow truncate">{signals?.regime?.primary ?? '—'}</div></div>
          <div className="truncate"><span className="text-muted">Margin</span><div className="font-bold text-primary truncate">{totalValue > 0 ? `${((totalValue - cash) / totalValue * 100).toFixed(0)}%` : '—'}</div></div>
        </div>
      </Card>

      {/* HEAT STRIP + NEWS FOR POSITIONS */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="col-span-3">
          {/* TOP STATUS BAR */}
          <div className="flex items-center justify-between bg-card border border-default px-2 py-1 shadow-widget">
            <div className="flex items-center gap-4">
              <DataRow label="NAV" value={fmtCurrency(totalValue)} />
              <span className="border-default opacity-50">|</span>
              <DataRow label="CASH" value={fmtCurrency(cash)} />
              <span className="border-default opacity-50">|</span>
              <DataRow label="P&L" value={`${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(0)}`} up={unrealizedPnl > 0} down={unrealizedPnl < 0} />
              <span className="border-default opacity-50">|</span>
              <DataRow label="POS" value={String(posCount)} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {DASHBOARD_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t.id)}
                    className={`font-mono-data text-[8px] px-1.5 py-0.5 cursor-pointer uppercase tracking-wider transition-colors ${
                      activeTemplate === t.id
                        ? 'bg-accent-cyan text-black border border-accent-cyan'
                        : 'bg-transparent text-muted border border-default'
                    }`}
                    title={t.description}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAddWidget(true)}
                  className="font-mono-data text-[8px] px-2 py-0.5 cursor-pointer uppercase tracking-wider text-accent-cyan border border-default"
              >
                + WIDGET
              </button>
              {isStale && <Badge label="STALE" variant="warning" />}
              {snapshot && <span className="font-mono-data text-[10px] text-muted">{new Date(snapshot.timestamp).toLocaleTimeString()}</span>}
            </div>
          </div>
        </div>
        <Card title="NEWS FOR POSITIONS">
          <div className="font-mono-data text-[9px]">
            {newsFeed.length > 0 ? newsFeed.filter((n) => Object.keys(posMap).includes(n.s) || Object.keys(posMap).length === 0).map((n, i) => (
              <div key={i} className="flex items-start gap-1 py-0.5 border-b border-default last:border-b-0">
                <span className="text-muted shrink-0 w-8">{n.t}</span>
                <span className="text-primary flex-1 truncate min-w-0">{n.h}</span>
                <span className="text-accent-cyan shrink-0 truncate max-w-[60px]">{n.s}</span>
              </div>
            )) : <span className="text-muted">No news available</span>}
          </div>
        </Card>
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
                  <span className="truncate">Symbol</span>
                  <span className="text-right truncate">Qty</span>
                  <span className="text-right truncate">Price</span>
                  <span className="text-right truncate">P&L</span>
                      </div>
                      {Object.entries(posMap).slice(0, 12).map(([symbol, pos]) => {
                        const pnl = pos.unrealized_pnl ?? 0
                        return (
                          <div key={symbol} className="grid grid-cols-[2fr_1fr_1.5fr_1.5fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                            <span className="text-accent-cyan font-semibold truncate">{symbol}</span>
                            <span className="text-right truncate">{pos.quantity}</span>
                            <span className="text-right truncate">${(pos.market_value / pos.quantity).toFixed(2)}</span>
                            <span className={`text-right truncate ${pnl >= 0 ? 'text-up' : 'text-down'}`}>
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
                        <span className="truncate">Symbol</span>
                        <span className="truncate">Type</span>
                        <span className="text-center truncate">Dir</span>
                        <span className="text-right truncate">Conf</span>
                      </div>
                      {Object.entries(signals.signals).slice(0, 12).map(([symbol, sigs]) =>
                        sigs.slice(0, 2).map((sig, i) => (
                          <div key={`${symbol}-${i}`} className="grid grid-cols-[1.5fr_2fr_0.8fr_1fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                            <span className="text-accent-cyan font-semibold truncate">{symbol}</span>
                            <span className="text-secondary truncate">{sig.type}</span>
                            <span className={`text-center ${sig.direction > 0 ? 'text-up' : sig.direction < 0 ? 'text-down' : 'text-muted'}`}>
                              {sig.direction > 0 ? '\u2191' : sig.direction < 0 ? '\u2193' : '—'}
                            </span>
                            <span className="text-right text-secondary">{((sig.confidence ?? 0) * 100).toFixed(0)}%</span>
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
                        className={`text-[9px] font-mono px-2 py-0.5 cursor-pointer border transition-colors ${
                          showBenchmark ? 'text-accent-blue' : 'text-muted'
                        } border-default`}
                        style={{
                          background: showBenchmark ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none',
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
                        <div key={i} className="flex items-center justify-between font-mono-data text-[11px] text-primary py-px gap-2">
                          <span className="text-accent-cyan font-semibold truncate min-w-0">{o.symbol}</span>
                          <span className={`shrink-0 truncate ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
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
                  <div key={k} className={`font-mono-data text-[11px] truncate ${isNum && (v as number) > 0 ? 'text-up' : isNum && (v as number) < 0 ? 'text-down' : 'text-primary'}`}>
                    <div className="text-[9px] font-mono-data tracking-wider text-muted truncate">{k.replace(/_/g, ' ')}</div>
                    <div className="truncate">{isNum ? ((v as number) * 100).toFixed(2) + '%' : String(v).slice(0, 25)}</div>
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
          {
            id: 'order-alerts',
            label: 'Order Alerts Inbox',
            content: (
              <Card title="Order Alerts" actions={<Badge label={[snapshot?.open_orders?.length ?? 0, recentTrades.length].filter(Boolean).join(' | ') || '0'} variant="info" size="sm" />}>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                  {snapshot?.open_orders && snapshot.open_orders.length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono-data tracking-wider text-muted mb-0.5 uppercase flex items-center gap-1">
                        <span className="text-accent-yellow">{'\u25CF'}</span> Open Orders
                      </div>
                      {snapshot.open_orders.slice(0, 5).map((o: any, i: number) => (
                        <div key={i} className="flex items-center justify-between font-mono-data text-[10px] text-primary py-px gap-2">
                          <span className="text-accent-cyan font-semibold truncate min-w-0">{o.symbol}</span>
                          <span className={`shrink-0 truncate ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                            {o.side?.toUpperCase()} {o.quantity} @ ${o.price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {recentTrades.length > 0 && (
                    <div>
                      <div className="text-[9px] font-mono-data tracking-wider text-muted mb-0.5 uppercase flex items-center gap-1 mt-1">
                        <span className="text-up">{'\u25CF'}</span> Recent Fills
                      </div>
                      {recentTrades.slice(0, 5).map((t, i) => (
                        <div key={i} className="flex items-center justify-between font-mono-data text-[10px] text-primary py-px gap-2">
                          <span className="text-accent-cyan font-semibold truncate min-w-0">{t.symbol}</span>
                          <span className={`shrink-0 truncate ${t.side === 'buy' ? 'text-up' : 'text-down'}`}>
                            {t.side?.toUpperCase()} {t.quantity} @ ${t.price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!snapshot?.open_orders || snapshot.open_orders.length === 0) && recentTrades.length === 0 && (
                    <div className="py-4 text-center font-mono-data text-[10px] text-muted">No orders or fills yet</div>
                  )}
                </div>
              </Card>
            ),
            defaultSize: { w: 1, h: 160 },
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
          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all border border-default shadow-card ${
            showActivity ? 'bg-accent-blue text-white' : 'bg-card text-secondary'
          }`}
          title="Activity Feed"
        >
          <span className="text-sm">⚡</span>
        </button>
        {showActivity && (
          <div
            className="absolute bottom-full right-0 mb-2 w-[360px] max-h-[400px] overflow-y-auto bg-card border border-default shadow-lg radius-md"
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
        <div className="mt-2">
          <LastActionLog maxHeight={120} />
        </div>
      </div>
    </div>
  )
}
