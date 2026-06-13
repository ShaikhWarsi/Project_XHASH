import { useEffect, useState, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { usePortfolioStore } from '../store/portfolio'
import { fetchQuotes } from '../api/client'
import { AlertTriangle } from 'lucide-react'

function getMarketSession(): { label: string; color: string } {
  const now = new Date()
  const h = now.getUTCHours()
  const m = now.getUTCMinutes()
  const totalMin = h * 60 + m
  if (totalMin >= 13 * 60 + 30 && totalMin < 14 * 60 + 30) return { label: 'PRE', color: 'var(--accent-yellow)' }
  if (totalMin >= 14 * 60 + 30 && totalMin < 21 * 60) return { label: 'REG', color: 'var(--accent-green)' }
  if (totalMin >= 21 * 60 && totalMin < 22 * 60) return { label: 'POST', color: 'var(--accent-blue)' }
  return { label: 'CLOSED', color: 'var(--text-muted)' }
}

export default function StatusLine() {
  const session = getMarketSession()
  const { connected: wsConnected } = useWebSocket('/ws/prices', { maxRetries: 999 })
  const portfolio = usePortfolioStore((s) => s.portfolio)
  const [latency, setLatency] = useState<number | null>(null)
  const [time, setTime] = useState('')
  const [tickerText, setTickerText] = useState('')
  const [offline, setOffline] = useState(false)
  const [hasNews, setHasNews] = useState(false)

  useEffect(() => {
    const start = Date.now()
    fetch('/api/health').then((r) => r.json()).then(() => {
      setLatency(Date.now() - start)
      setOffline(false)
    }).catch(() => { setLatency(null); setOffline(true) })
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!wsConnected) return
    fetchQuotes(['SPY', 'QQQ', 'BTC-USD']).then((quotes) => {
      const parts: string[] = []
      for (const s of ['SPY', 'QQQ', 'BTC-USD']) {
        const q = quotes[s]
        if (q?.c != null) {
          const arrow = q.dp >= 0 ? '▲' : '▼'
          parts.push(`${s} ${q.c.toFixed(2)} ${arrow}${Math.abs(q.dp || 0).toFixed(2)}%`)
        }
      }
      setTickerText(parts.join('  │  '))
    }).catch((err) => console.warn('[StatusLine] failed:', err))
  }, [wsConnected])

  const equity = portfolio?.total_value ? `$${portfolio.total_value.toLocaleString()}` : '—'

  return (
    <div className="flex items-center h-[22px] px-2 bg-card border-b border-default select-none text-[10px] font-mono-data gap-2">
      <span className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`} style={{ boxShadow: wsConnected ? '0 0 4px var(--accent-green)' : '0 0 4px var(--accent-red)' }} />
        {wsConnected ? 'LIVE' : 'OFF'}
      </span>

      <span className="text-muted">|</span>

      <span style={{ color: session.color, fontWeight: 600 }} className="text-[9px] tracking-wider">{session.label}</span>

      {tickerText && (
        <>
          <span className="text-muted">|</span>
          <span className="truncate max-w-[400px]">{tickerText}</span>
        </>
      )}

      {offline && (
        <>
          <span className="text-muted">|</span>
          <span className="flex items-center gap-1 text-[var(--accent-orange)]">
            <AlertTriangle className="w-2.5 h-2.5" />
            OFFLINE
          </span>
        </>
      )}

      <span className="flex-1" />

      <span className="text-muted">{equity}</span>

      {latency !== null && (
        <>
          <span className="text-muted">|</span>
          <span className="text-muted">LAT {latency}ms</span>
        </>
      )}

      <span className="text-muted">|</span>
      <span className="text-muted">{time} UT</span>

      {hasNews && (
        <span className="text-[var(--accent-yellow)] font-bold text-[8px]">● NEWS</span>
      )}
    </div>
  )
}
