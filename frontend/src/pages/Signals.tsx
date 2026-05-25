import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignalStore } from '../store/signals'
import Card from '../components/ui/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import type { QuantSignal } from '../api/types'
import { useToastStore } from '../store/toast'
import { useUrlState } from '../hooks/useUrlState'

const FONT_DATA = 'font-mono-data text-[11px]'
const FONT_SM = 'font-mono-data text-[10px]'
const FONT_LABEL = 'font-mono-data text-[9px] tracking-wider'

export default function Signals() {
  const { signals, load } = useSignalStore()
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const [search, setSearch] = useUrlState('q', '')
  const [sortBy, setSortBy] = useState<'composite' | 'symbol'>('composite')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [typeFilter, setTypeFilter] = useUrlState('type', 'all')

  useEffect(() => {
    load().catch((err) => addToast(`Failed to load signals: ${err?.message || 'Unknown error'}`, 'error'))
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  const signalTypes = useMemo(() => {
    if (!signals) return []
    const types = new Set<string>()
    Object.values(signals.signals).forEach((sigs) => sigs.forEach((s) => types.add(s.type)))
    return ['all', ...Array.from(types).sort()]
  }, [signals])

  const filteredSymbols = useMemo(() => {
    if (!signals) return []
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

  return (
    <div className="flex flex-col gap-1.5">
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
        <button onClick={() => toggleSort('composite')}
          className="border border-default font-mono-data text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: sortBy === 'composite' ? 'var(--accent-cyan)' : 'var(--bg-card)', color: sortBy === 'composite' ? '#000' : 'var(--text-secondary)' }}>
          SCORE {sortBy === 'composite' ? (direction === 'desc' ? 'â†“' : 'â†‘') : ''}
        </button>
        <button onClick={() => toggleSort('symbol')}
          className="border border-default font-mono-data text-[10px] px-2 py-0.5 cursor-pointer" style={{ background: sortBy === 'symbol' ? 'var(--accent-cyan)' : 'var(--bg-card)', color: sortBy === 'symbol' ? '#000' : 'var(--text-secondary)' }}>
          SYMBOL {sortBy === 'symbol' ? (direction === 'desc' ? 'â†“' : 'â†‘') : ''}
        </button>
        {signals.timestamp && (
          <span className={`${FONT_SM} text-muted ml-auto`}>
            {new Date(signals.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

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
              {Object.entries(signals.composite_scores).map(([symbol, score]) => (
                <div key={symbol} className="flex items-center gap-2">
                  <span className={`${FONT_DATA} font-semibold text-accent-cyan w-[60px]`}>{symbol}</span>
                  <div className="flex-1 h-2.5 bg-[var(--border-color)] relative">
                    <div className="h-full" style={{ width: `${Math.abs(score) * 100}%`, background: score >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', transition: 'width 0.3s' }} />
                  </div>
                  <span className={`${FONT_DATA} w-[50px] text-right`} style={{ color: score >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {score >= 0 ? '+' : ''}{(score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No scores" compact />
          )}
        </Card>
      </div>

      {/* SIGNAL DETAILS */}
      <Card title={`SIGNALS (${filteredSymbols.length} SYMBOLS)`}>
        {filteredSymbols.length > 0 ? (
          <div>
            {filteredSymbols.map(([symbol, sigs]) => (
              <div key={symbol} className="mb-1.5 border-b border-default pb-1">
                <div className="flex items-center gap-2 cursor-pointer mb-0.5" onClick={() => navigate(`/chart?symbol=${symbol}`)}>
                  <span className={`${FONT_DATA} font-bold text-accent-cyan`}>{symbol}</span>
                  <span className={`${FONT_SM} px-1.5`} style={{ background: (signals.composite_scores[symbol] ?? 0) > 0.2 ? 'rgba(34,197,94,0.15)' : (signals.composite_scores[symbol] ?? 0) < -0.2 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)', color: (signals.composite_scores[symbol] ?? 0) > 0.2 ? 'var(--accent-green)' : (signals.composite_scores[symbol] ?? 0) < -0.2 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                    {(signals.composite_scores[symbol] ?? 0) > 0.2 ? 'BULLISH' : (signals.composite_scores[symbol] ?? 0) < -0.2 ? 'BEARISH' : 'NEUTRAL'}
                  </span>
                  <span className={`${FONT_SM} text-muted ml-auto`}>[CHART]</span>
                </div>
                <div className="py-0.5 font-mono-data text-[9px] tracking-wider text-muted border-b border-default" style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0 }}>
                  <span>Type</span><span className="text-center">Dir</span><span className="text-right">Strength</span><span className="text-right">Conf</span><span className="text-right">Price</span>
                </div>
                {sigs.slice(0, 8).map((sig, i) => (
                  <div key={i} className="py-0 font-mono-data text-[11px] text-primary border-b border-default" style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 0 }}>
                    <span className="text-secondary">{sig.type}</span>
                    <span className="text-center" style={{ color: sig.direction > 0 ? 'var(--accent-green)' : sig.direction < 0 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                      {sig.direction > 0 ? 'â–²' : sig.direction < 0 ? 'â–¼' : 'â—†'}
                    </span>
                    <span className="text-right">{(sig.strength * 100).toFixed(0)}%</span>
                    <span className="text-right">{(sig.confidence * 100).toFixed(0)}%</span>
                    <span className="text-right">${sig.price?.toFixed(2) ?? 'â€”'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No signals matching filter" compact />
        )}
      </Card>
    </div>
  )
}
