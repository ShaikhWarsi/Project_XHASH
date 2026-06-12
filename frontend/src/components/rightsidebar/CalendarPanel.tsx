import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, DollarSign, TrendingUp, ExternalLink } from 'lucide-react'
import { useHeldTickers } from '../../hooks/useHeldTickers'

interface MacroEvent {
  time: string
  label: string
  impact: 'high' | 'medium' | 'low'
}

interface Earning {
  ticker: string
  time: string
  estEps: number | null
}

interface Dividend {
  ticker: string
  amount: number
  exDate: string
}

interface CalendarData {
  macro: MacroEvent[]
  earnings: Earning[]
  dividends: Dividend[]
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'var(--accent-red)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-green)',
}

export default function CalendarPanel() {
  const [cal, setCal] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const tickers = useHeldTickers()

  const fetchCalendar = useCallback(async () => {
    if (tickers.length === 0) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/calendar/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: tickers }),
      })
      if (res.ok) {
        const data = await res.json()
        setCal(data)
      }
    } catch (e) { console.warn('[Calendar] fetch failed:', e) } finally {
      setLoading(false)
    }
  }, [tickers])

  useEffect(() => {
    setLoading(true)
    fetchCalendar()
  }, [fetchCalendar])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Loading calendar...</span>
      </div>
    )
  }

  if (!cal || (cal.macro.length === 0 && cal.earnings.length === 0 && cal.dividends.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1">
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>No events today</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {cal.macro.length > 0 && (
        <section>
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp size={11} style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>MACRO EVENTS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {cal.macro.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 px-1.5 py-1 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
                <span className="text-[9px] font-mono shrink-0" style={{ color: 'var(--text-secondary)' }}>{ev.time}</span>
                <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{ev.label}</span>
                <span
                  className="text-[8px] font-mono uppercase px-1 rounded-sm shrink-0"
                  style={{
                    background: `${IMPACT_COLORS[ev.impact]}20`,
                    color: IMPACT_COLORS[ev.impact],
                  }}
                >
                  {ev.impact}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cal.earnings.length > 0 && (
        <section>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign size={11} style={{ color: 'var(--accent-green)' }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-green)' }}>EARNINGS TODAY</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {cal.earnings.map((e, i) => (
              <button
                key={i}
                onClick={() => navigate(`/markets/chart?symbol=${e.ticker}`)}
                className="flex items-center gap-2 px-1.5 py-1 rounded-sm cursor-pointer w-full text-left transition-colors"
                style={{ background: 'var(--bg-primary)', border: 'none' }}
                onMouseEnter={(el) => (el.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(el) => (el.currentTarget.style.background = 'var(--bg-primary)')}
              >
                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-blue)' }}>
                  {e.ticker}
                </span>
                <ExternalLink size={9} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>{e.time}</span>
                <span className="text-[9px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {e.estEps != null ? `Est: $${e.estEps.toFixed(2)}` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {cal.dividends.length > 0 && (
        <section>
          <div className="flex items-center gap-1 mb-1">
            <Calendar size={11} style={{ color: 'var(--accent-yellow)' }} />
            <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-yellow)' }}>DIVIDENDS</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {cal.dividends.map((d, i) => (
              <button
                key={i}
                onClick={() => navigate(`/markets/chart?symbol=${d.ticker}`)}
                className="flex items-center gap-2 px-1.5 py-1 rounded-sm cursor-pointer w-full text-left transition-colors"
                style={{ background: 'var(--bg-primary)', border: 'none' }}
                onMouseEnter={(el) => (el.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(el) => (el.currentTarget.style.background = 'var(--bg-primary)')}
              >
                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-blue)' }}>
                  {d.ticker}
                </span>
                <ExternalLink size={9} style={{ color: 'var(--text-muted)' }} />
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>${d.amount.toFixed(2)}</span>
                <span className="text-[8px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>Ex: {d.exDate}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
