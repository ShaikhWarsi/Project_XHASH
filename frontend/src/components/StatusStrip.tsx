import { useEffect, useState, useRef } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { usePortfolioStore } from '../store/portfolio'
import { fetchQuotes } from '../api/client'

function getMarketSession(): { label: string; color: string } {
  const now = new Date()
  const h = now.getUTCHours()
  const m = now.getUTCMinutes()
  const totalMin = h * 60 + m
  // Approximate NYSE sessions in UTC: pre 13:30-14:30, reg 14:30-21:00, post 21:00-22:00
  if (totalMin >= 13 * 60 + 30 && totalMin < 14 * 60 + 30) return { label: 'PRE', color: 'var(--accent-yellow)' }
  if (totalMin >= 14 * 60 + 30 && totalMin < 21 * 60) return { label: 'REG', color: 'var(--accent-green)' }
  if (totalMin >= 21 * 60 && totalMin < 22 * 60) return { label: 'POST', color: 'var(--accent-blue)' }
  return { label: 'CLOSED', color: 'var(--text-muted)' }
}

export default function StatusStrip() {
  const session = getMarketSession()
  const { connected: wsConnected } = useWebSocket('/ws/prices', { maxRetries: 999 })
  const portfolio = usePortfolioStore((s) => s.portfolio)
  const [lastTick, setLastTick] = useState('')
  const [latency, setLatency] = useState<number | null>(null)
  const [staleMs, setStaleMs] = useState(0)
  const lastTickRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastTickRef.current > 0) {
        setStaleMs(Date.now() - lastTickRef.current)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!wsConnected) return
    fetchQuotes(['SPY']).then((quotes) => {
      if (quotes?.SPY?.c) {
        lastTickRef.current = Date.now()
        setLastTick(`$${quotes.SPY.c.toFixed(2)}`)
      }
    }).catch(() => {})
  }, [wsConnected])

  useEffect(() => {
    const start = Date.now()
    fetch('/api/health').then((r) => r.json()).then(() => {
      setLatency(Date.now() - start)
    }).catch(() => setLatency(null))
  }, [])

  const items = [
    { label: 'WS', value: wsConnected ? 'CONN' : 'OFF', color: wsConnected ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'TICK', value: lastTick || '—' },
    { label: 'P99', value: latency !== null ? `${latency}ms` : '—' },
    { label: 'SESSION', value: session.label, color: session.color },
    { label: 'STALE', value: staleMs > 0 ? `${staleMs}ms` : '—' },
    { label: 'EQUITY', value: portfolio?.total_value ? `$${portfolio.total_value.toLocaleString()}` : '—' },
  ]

  return (
    <div className="flex items-center gap-0 px-1.5 py-[1px] bg-card border-b border-default select-none" style={{ minHeight: 18 }}>
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-1 px-1.5 border-r border-default last:border-r-0">
          <span className="text-[7px] font-mono-data tracking-wider text-muted">{item.label}</span>
          <span className="text-[8px] font-mono-data font-semibold" style={{ color: item.color || 'var(--text-primary)' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
