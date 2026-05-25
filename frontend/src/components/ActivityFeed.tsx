import { useEffect, useState, useMemo, useRef } from 'react'
import { connectDashboardSSE } from '../api/client'
import type { DashboardSnapshot } from '../api/types'

interface Activity {
  id: string
  type: 'trade' | 'signal' | 'order' | 'alert' | 'system'
  message: string
  timestamp: string
  severity?: 'info' | 'warning' | 'error'
  symbol?: string
  direction?: 'up' | 'down' | 'neutral'
}

const TYPE_ICONS: Record<string, string> = {
  trade: '⇄',
  signal: '⚡',
  order: '◆',
  alert: '⚠',
  system: '●',
}

const TYPE_COLORS: Record<string, string> = {
  trade: 'var(--accent-cyan)',
  signal: 'var(--accent-purple)',
  order: 'var(--accent-blue)',
  alert: 'var(--accent-yellow)',
  system: 'var(--text-muted)',
}

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  return `${Math.floor(diff / 86400000)}d`
}

export default function ActivityFeed({ maxItems = 100 }: { maxItems?: number }) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (paused) return
    const es = connectDashboardSSE(
      (snapshot: DashboardSnapshot) => {
        const newActivities: Activity[] = []
        const now = snapshot.timestamp || new Date().toISOString()

        if (snapshot.open_orders?.length) {
          snapshot.open_orders.slice(0, 3).forEach((o: any, i: number) => {
            newActivities.push({
              id: `order-${now}-${i}`,
              type: 'order',
              message: `${o.side?.toUpperCase()} ${o.quantity} ${o.symbol} @ ${o.price?.toFixed(2)}`,
              timestamp: now,
              severity: 'info',
              symbol: o.symbol,
              direction: o.side === 'buy' ? 'up' : 'down',
            })
          })
        }

        if (snapshot.attribution) {
          const entries = Object.entries(snapshot.attribution)
            .filter(([, v]) => typeof v === 'number')
            .sort(([, a], [, b]) => Math.abs(b as number) - Math.abs(a as number))
            .slice(0, 2)
          entries.forEach(([k, v], i) => {
            const num = v as number
            newActivities.push({
              id: `attr-${now}-${i}`,
              type: 'system',
              message: `${k.replace(/_/g, ' ')} ${num >= 0 ? '+' : ''}${(num * 100).toFixed(2)}%`,
              timestamp: now,
              severity: num >= 0 ? 'info' : 'warning',
              direction: num >= 0 ? 'up' : 'down',
            })
          })
        }

        newActivities.push({
          id: `snap-${now}`,
          type: 'system',
          message: 'Market snapshot updated',
          timestamp: now,
          severity: 'info',
        })

        setActivities((prev) => {
          const combined = [...newActivities, ...prev]
          return combined.slice(0, maxItems)
        })
      },
    )
    return () => es.close()
  }, [maxItems, paused])

  const filtered = useMemo(() => {
    if (filter === 'all') return activities
    return activities.filter((a) => a.type === filter)
  }, [activities, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: activities.length }
    for (const t of ['trade', 'signal', 'order', 'alert', 'system']) {
      c[t] = activities.filter((a) => a.type === t).length
    }
    return c
  }, [activities])

  return (
    <div className="flex flex-col font-mono-data">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-default overflow-x-auto">
        {(['all', 'trade', 'signal', 'order', 'alert', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider cursor-pointer rounded-sm whitespace-nowrap transition-colors"
            style={{
              background: filter === t ? 'var(--bg-hover)' : 'transparent',
              color: filter === t ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${filter === t ? 'var(--border-color)' : 'transparent'}`,
            }}
          >
            {t === 'all' ? 'ALL' : t}
            <span className="ml-1" style={{ color: TYPE_COLORS[t] || 'var(--text-muted)' }}>{counts[t]}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setPaused(!paused)}
          className="px-1.5 py-0.5 text-[9px] cursor-pointer rounded-sm"
          style={{ color: paused ? 'var(--accent-yellow)' : 'var(--text-muted)' }}
        >
          {paused ? 'PAUSED' : 'LIVE'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-6 text-center text-[10px] text-muted">
          No {filter !== 'all' ? filter : ''} activity
        </div>
      ) : (
        <div
          ref={containerRef}
          className="overflow-y-auto"
          style={{ maxHeight: 340 }}
          onScroll={(e) => {
            const el = e.currentTarget
            setAutoScroll(el.scrollTop === 0)
          }}
        >
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 px-2 py-1 border-b border-default text-[11px] transition-colors hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="w-3.5 text-center text-[10px]" style={{ color: TYPE_COLORS[a.type] }}>
                {TYPE_ICONS[a.type]}
              </span>
              {a.symbol && (
                <span className="text-accent-cyan font-semibold text-[10px] shrink-0">{a.symbol}</span>
              )}
              <span className="flex-1 truncate">{a.message}</span>
              <span className="text-[9px] text-muted shrink-0">{formatTimeAgo(a.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
