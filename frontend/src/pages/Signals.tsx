import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignalStore } from '../store/signals'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { useToastStore } from '../store/toast'
import type { QuantSignal } from '../api/types'
import { useUrlState } from '../hooks/useUrlState'

interface StreamSignal {
  symbol: string; type: string; direction: number; confidence: number; timestamp: string; engine?: string
}
interface StreamEvent {
  signals: StreamSignal[] | Record<string, StreamSignal[]>
  composite_score: number; composite_scores?: Record<string, number>
  regime: string | { primary: string; confidence: number } | null; timestamp: string
}
function flattenSignals(signals: StreamSignal[] | Record<string, StreamSignal[]> | undefined): StreamSignal[] {
  if (!signals) return []
  if (Array.isArray(signals)) return signals
  const flat: StreamSignal[] = []
  for (const sigs of Object.values(signals)) if (Array.isArray(sigs)) flat.push(...sigs)
  return flat
}
function getCompositeScore(evt: StreamEvent): number {
  if (typeof evt.composite_score === 'number' && !Number.isNaN(evt.composite_score)) return evt.composite_score
  if (evt.composite_scores && typeof evt.composite_scores === 'object') {
    const vals = Object.values(evt.composite_scores).filter(v => typeof v === 'number')
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  return 0
}
function getRegimeLabel(regime: StreamEvent['regime']): string {
  if (!regime) return 'N/A'
  if (typeof regime === 'string') return regime
  if (typeof regime === 'object' && regime.primary) return regime.primary
  return 'N/A'
}

const FONT_DATA = 'font-mono-data text-[11px]'
const FONT_SM = 'font-mono-data text-[10px]'
const FONT_LABEL = 'font-mono-data text-[9px] tracking-wider'

export default function Signals() {
  const { signals, loading, error, load, update } = useSignalStore()
  const navigate = useNavigate()
  const [search, setSearch] = useUrlState('q', '')
  const [sortBy, setSortBy] = useState<'composite' | 'symbol'>('composite')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [typeFilter, setTypeFilter] = useUrlState('type', 'all')
  const [pinned, setPinned] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('signals_pinned') || '[]') } catch { return [] } })
  const [regimeFilter, setRegimeFilter] = useState<string>('all')
  const [tab, setTab] = useState<'list' | 'heatmap' | 'stream'>('list')
  const heatmapRef = useRef<HTMLDivElement>(null)
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [streamConnected, setStreamConnected] = useState(false)
  const [streamFilter, setStreamFilter] = useState('')

  useEffect(() => {
    load()
    const base = import.meta.env.VITE_API_BASE ?? '/api'
    const es = new EventSource(`${base}/signals/stream`)
    es.onopen = () => setStreamConnected(true)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.signals && Object.keys(data.signals).length > 0) update(data)
        setStreamEvents(prev => [data as StreamEvent, ...prev].slice(0, 200))
      } catch { /* silent */ }
    }
    es.onerror = () => { setStreamConnected(false) }
    return () => { es.close() }
  }, [])

  const signalTypes = useMemo(() => {
    if (!signals?.signals) return ['all']
    const types = new Set<string>()
    Object.values(signals.signals).forEach((sigs) => sigs.forEach((s) => types.add(s.type)))
    return ['all', ...Array.from(types).sort()]
  }, [signals])

  const filteredSymbols = useMemo(() => {
    if (!signals?.signals) return []
    let entries = Object.entries(signals.signals)
    if (search) {
      const q = search.toUpperCase()
      entries = entries.filter(([s]) => s.includes(q))
    }
    if (typeFilter !== 'all') {
      entries = entries.map(([s, sigs]) => [s, sigs.filter((sig) => sig.type === typeFilter)] as [string, QuantSignal[]])
        .filter(([, sigs]) => sigs.length > 0)
    }
    return [...entries].sort((a, b) => {
      if (sortBy === 'symbol') {
        return direction === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0])
      }
      const aScore = signals.composite_scores[a[0]] ?? 0
      const bScore = signals.composite_scores[b[0]] ?? 0
      return direction === 'desc' ? Math.abs(bScore) - Math.abs(aScore) : Math.abs(aScore) - Math.abs(bScore)
    })
  }, [signals, search, sortBy, direction, typeFilter])

  const togglePin = (symbol: string) => {
    const next = pinned.includes(symbol) ? pinned.filter((s) => s !== symbol) : [...pinned, symbol]
    setPinned(next)
    localStorage.setItem('signals_pinned', JSON.stringify(next))
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setDirection('desc') }
  }

  if (!signals) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <Card title="REGIME"><Skeleton count={3} height={12} /></Card>
          <Card title="COMPOSITE SCORES"><Skeleton count={4} height={14} /></Card>
        </div>
        <Card title="SIGNALS"><Skeleton count={8} height={16} /></Card>
      </div>
    )
  }

  const regimeOptions = ['all', ...new Set(signals?.signals ? Object.values(signals.signals).flat().map((s) => typeof s.metadata?.regime === 'string' ? s.metadata.regime : signals.regime?.primary || 'unknown') : [])]
  const hasPinned = pinned.length > 0
  const sortedSymbols = hasPinned
    ? [...filteredSymbols.sort((a, b) => (pinned.includes(b[0]) ? 1 : 0) - (pinned.includes(a[0]) ? 1 : 0))]
    : filteredSymbols

  useEffect(() => {
    if (tab !== 'heatmap' || !heatmapRef.current || !signals?.signals) return
    let cancelled = false
    import('plotly.js-dist-min').then((mod: any) => {
      if (cancelled) return
      const symbols = Object.keys(signals.signals!).slice(0, 30)
      const types = [...new Set(symbols.flatMap((s) => (signals.signals![s] || []).map((sig) => sig.type)))]
      const z = symbols.map((s) => types.map((t) => {
        const sigs = signals.signals![s] || []
        const match = sigs.find((sig) => sig.type === t)
        return match ? match.confidence * (match.direction || 1) : 0
      }))
      mod.newPlot(heatmapRef.current, [{
        z, x: types, y: symbols,
        type: 'heatmap', colorscale: ['#ef4444', '#fef2f2', '#dcfce7', '#22c55e'],
        zmid: 0, hoverongaps: false,
      }], {
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 60, r: 10, t: 10, b: 60 }, height: 400,
        xaxis: { color: '#666', tickangle: -45, gridcolor: 'rgba(255,255,255,0.04)' },
        yaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', autorange: 'reversed' },
        colorbar: { title: { text: 'Conf', font: { color: '#999', size: 9 } }, tickfont: { color: '#999', size: 8 }, thickness: 8 },
      })
    })
    return () => { cancelled = true }
  }, [tab, signals])

  return (
    <div className="flex flex-col gap-1.5">
      {/* TAB BAR */}
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="SIGNALS" variant="info" />
        {(['list', 'heatmap', 'stream'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'list' ? 'LIST' : t === 'heatmap' ? 'HEATMAP' : 'STREAM'}
          </button>
        ))}
      </div>

      {tab === 'heatmap' ? (
        <Card title="SIGNAL TYPES × SYMBOLS HEATMAP">
          <div ref={heatmapRef} />
        </Card>
      ) : tab === 'stream' ? (
        <div className="flex flex-col gap-1.5" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-default bg-card px-1.5 py-0.5">
              <input type="text" placeholder="FILTER SYMBOL..." value={streamFilter} onChange={e => setStreamFilter(e.target.value.toUpperCase())}
                className="bg-none border-none text-primary font-mono-data text-[10px] outline-none w-[140px]" />
            </div>
            <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-up' : 'bg-down'}`} />
            <span className="text-[9px] font-mono-data text-muted">{streamConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
            <Badge label={`${streamEvents.length} events`} variant="info" size="sm" />
          </div>
          <div className="flex-1 overflow-auto">
            {streamEvents.length === 0 && (
              <div className="flex items-center justify-center h-32 text-[10px] font-mono-data text-muted">Waiting for signals...</div>
            )}
            {streamEvents.filter(e => !streamFilter || flattenSignals(e.signals).some(s => s.symbol.includes(streamFilter))).slice(0, 100).map((evt, i) => {
              const evtFlat = flattenSignals(evt.signals)
              const evtScore = getCompositeScore(evt)
              return (
                <div key={`${evt.timestamp}-${i}`} className="bg-card border border-default rounded-sm px-2.5 py-1.5 mb-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono-data text-muted">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    <span className={`text-[10px] font-mono-data font-bold ${evtScore >= 0 ? 'text-up' : 'text-down'}`}>
                      Score: {(evtScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {evtFlat.map((s, j) => (
                      <Badge key={`${s.symbol}-${j}`}
                        label={`${s.symbol} ${s.type} ${s.direction > 0 ? '\u2191' : s.direction < 0 ? '\u2193' : '\u2192'} ${(s.confidence * 100).toFixed(0)}%`}
                        variant={s.direction > 0 ? 'success' : s.direction < 0 ? 'error' : 'warning'} size="sm" />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
      <>
      {/* FILTER BAR */}
      <div className="flex gap-1.5 items-center">
        <div className="flex items-center border border-default bg-card px-1.5 py-0.5">
          <span className={`${FONT_LABEL} text-muted mr-1`}>&gt;</span>
          <input type="text" placeholder="FILTER SYMBOL..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-none border-none text-primary font-mono-data text-[10px] outline-none w-[140px]" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none">
          {signalTypes.map((t) => (<option key={t} value={t}>{t === 'all' ? 'ALL TYPES' : t.toUpperCase()}</option>))}
        </select>
        <select value={regimeFilter} onChange={(e) => setRegimeFilter(e.target.value)}
          className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none">
          {regimeOptions.map((r) => (<option key={r} value={r}>{r === 'all' ? 'ALL REGIMES' : r.toUpperCase()}</option>))}
        </select>
        <button onClick={() => toggleSort('composite')}
          className="border border-default font-mono-data text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: sortBy === 'composite' ? 'var(--accent-cyan)' : 'var(--bg-card)', color: sortBy === 'composite' ? '#000' : 'var(--text-secondary)' }}>
          SCORE {sortBy === 'composite' ? (direction === 'desc' ? '\u2193' : '\u2191') : ''}
        </button>
        <button onClick={() => toggleSort('symbol')}
          className="border border-default font-mono-data text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: sortBy === 'symbol' ? 'var(--accent-cyan)' : 'var(--bg-card)', color: sortBy === 'symbol' ? '#000' : 'var(--text-secondary)' }}>
          SYMBOL {sortBy === 'symbol' ? (direction === 'desc' ? '\u2193' : '\u2191') : ''}
        </button>
        {signals.timestamp && (
          <span className={`${FONT_SM} text-muted ml-auto`}>
            {new Date(signals.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="text-[10px] font-mono-data text-down px-2 py-1 rounded-sm" style={{ background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      {/* REGIME + COMPOSITE ROW */}
      <div className="grid grid-cols-2 gap-1.5">
        <Card title="REGIME">
          {signals.regime ? (
            <div className="grid grid-cols-3 gap-2">
              <div><div className={`${FONT_LABEL} text-muted`}>PRIMARY</div><div className={`${FONT_DATA} font-semibold text-primary`}>{signals.regime.primary}</div></div>
              <div><div className={`${FONT_LABEL} text-muted`}>CONFIDENCE</div><div className={`${FONT_DATA} text-primary`}>{(signals.regime.confidence * 100).toFixed(0)}%</div></div>
              <div><div className={`${FONT_LABEL} text-muted`}>VOL</div><div className={FONT_DATA} style={{ color: signals.regime.vol_regime === 'high' ? 'var(--accent-red)' : 'var(--accent-green)' }}>{signals.regime.vol_regime.toUpperCase()}</div></div>
            </div>
          ) : (
            <EmptyState title="No regime data" compact />
          )}
        </Card>

        <Card title="COMPOSITE SCORES">
          {Object.keys(signals.composite_scores).length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {Object.entries(signals.composite_scores).map(([symbol, score]) => {
                const scoreVal = score ?? 0
                const absPct = Math.min(Math.abs(scoreVal) * 100, 100)
                const isPos = scoreVal >= 0
                return (
                  <div key={symbol} className="flex items-center gap-2">
                    <span className={`${FONT_DATA} font-semibold text-accent-cyan w-[60px]`}>{symbol}</span>
                    <div className="flex-1 h-2.5 bg-[var(--border-color)] relative">
                      <div className="h-full" style={{ width: `${absPct}%`, background: isPos ? 'var(--accent-green)' : 'var(--accent-red)', transition: 'width 0.3s' }} />
                    </div>
                    <span className={`${FONT_DATA} w-[50px] text-right`} style={{ color: isPos ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {isPos ? '+' : ''}{(scoreVal * 100).toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No scores" compact />
          )}
        </Card>
      </div>

      {/* SIGNAL DETAILS */}
      <Card title={`SIGNALS (${sortedSymbols.length} SYMBOLS)`}>
        {sortedSymbols.length > 0 ? (
          <div>
            {sortedSymbols.map(([symbol, sigs]) => {
              const compScore = signals.composite_scores[symbol] ?? 0
              const isPinned = pinned.includes(symbol)
              const sparkVals = sigs.length >= 3
                ? sigs.slice(0, 20).map((s) => s.strength ?? compScore)
                : Array.from({ length: 20 }, (_, i) => compScore * (1 - i * 0.03))
              const sparkMin = Math.min(...sparkVals), sparkMax = Math.max(...sparkVals), sparkRange = sparkMax - sparkMin || 1
              const sigRegime = typeof sigs[0]?.metadata?.regime === 'string' ? sigs[0].metadata.regime : signals.regime?.primary || 'unknown'
              if (regimeFilter !== 'all' && sigRegime !== regimeFilter) return null
              return (
              <div key={symbol} className="mb-1.5 border-b border-default pb-1">
                <div className="flex items-center gap-2 cursor-pointer mb-0.5" onClick={() => navigate(`/markets/chart?symbol=${symbol}`)}>
                  <button onClick={(e) => { e.stopPropagation(); togglePin(symbol) }}
                    className="bg-none border-none cursor-pointer font-mono-data text-[10px] px-1"
                    style={{ color: isPinned ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                    {isPinned ? '\u2605' : '\u2606'}
                  </button>
                  {/* Sparkline */}
                  <svg width="48" height="16" className="shrink-0">
                    <polyline
                      fill="none"
                      stroke={compScore >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                      strokeWidth="1.5"
                      points={sparkVals.map((v, i) => `${i * 48 / sparkVals.length},${12 - (v - sparkMin) / sparkRange * 10}`).join(' ')}
                    />
                  </svg>
                  <span className={`${FONT_DATA} font-bold text-accent-cyan`}>{symbol}</span>
                  <span className={`${FONT_SM} px-1.5`} style={{ background: compScore > 0.2 ? 'rgba(34,197,94,0.15)' : compScore < -0.2 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)', color: compScore > 0.2 ? 'var(--accent-green)' : compScore < -0.2 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                    {compScore > 0.2 ? 'BULLISH' : compScore < -0.2 ? 'BEARISH' : 'NEUTRAL'}
                  </span>
                  <span className={`${FONT_SM} text-muted ml-auto`}>[CHART]</span>
                </div>
                <div className="py-0.5 font-mono-data text-[9px] tracking-wider text-muted border-b border-default" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.5fr 0.6fr 0.6fr 0.6fr 0.8fr', gap: 0 }}>
                  <span>Type</span><span className="text-center">Dir</span><span className="text-right">Str</span><span className="text-right">Conf</span><span className="text-right">Price</span><span className="text-right">Regime</span>
                </div>
                {sigs.slice(0, 8).map((sig, i) => (
                  <div key={i} className="py-0 font-mono-data text-[11px] text-primary border-b border-default" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.5fr 0.6fr 0.6fr 0.6fr 0.8fr', gap: 0 }}>
                    <span className="text-secondary">{sig.type}</span>
                    <span className="text-center" style={{ color: sig.direction > 0 ? 'var(--accent-green)' : sig.direction < 0 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                      {sig.direction > 0 ? '\u25B2' : sig.direction < 0 ? '\u25BC' : '\u25C6'}
                    </span>
                    <span className="text-right">{((sig.strength ?? 0) * 100).toFixed(0)}%</span>
                    <span className="text-right">{((sig.confidence ?? 0) * 100).toFixed(0)}%</span>
                    <span className="text-right">${sig.price?.toFixed(2) ?? '\u2014'}</span>
                    <span className="text-right text-muted">{typeof sig.metadata?.regime === 'string' ? sig.metadata.regime : signals.regime?.primary || '—'}</span>
                  </div>
                ))}
              </div>
              )
            })}
          </div>
        ) : (
          <EmptyState title="No signals matching filter" compact />
        )}
      </Card>
      </>
      )}
    </div>
  )
}
