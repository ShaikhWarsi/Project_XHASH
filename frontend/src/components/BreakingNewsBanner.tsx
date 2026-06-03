import { useEffect, useState } from 'react'
import { fetchCompanyNews } from '../api/client'

interface NewsItem {
  title: string
  source: string
  url: string
  priority: 'flash' | 'urgent' | 'normal'
  timestamp: string
}

const PRIORITY_COLORS: Record<string, string> = {
  flash: 'var(--accent-red)',
  urgent: 'var(--accent-orange)',
  normal: 'var(--accent-blue)',
}

const PRIORITY_LABELS: Record<string, string> = {
  flash: 'FLASH',
  urgent: 'URGENT',
  normal: 'NEWS',
}

export default function BreakingNewsBanner() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    fetchCompanyNews('AAPL').then((articles) => {
      if (articles?.length) {
        setItems(articles.slice(0, 10).map((a) => ({
          title: a.headline,
          source: a.source,
          url: a.url,
          priority: 'normal' as const,
          timestamp: new Date(a.datetime * 1000).toISOString(),
        })))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (items.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % items.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [items.length])

  const activeItems = items.filter((_, i) => !dismissed.has(i))
  if (activeItems.length === 0) return null

  const top = activeItems[currentIdx % activeItems.length]

  return (
    <div
      className="animate-slide-down flex items-center gap-3 px-4 py-1.5 text-xs"
      style={{
        background: `${PRIORITY_COLORS[top.priority]}15`,
        borderBottom: `1px solid ${PRIORITY_COLORS[top.priority]}40`,
      }}
    >
      <span
        className="font-bold uppercase tracking-wider animate-flash-blink shrink-0"
        style={{ color: PRIORITY_COLORS[top.priority], fontSize: 'var(--font-size-xs)' }}
      >
        {PRIORITY_LABELS[top.priority]}
      </span>
      <span style={{ color: 'var(--text-primary)' }} className="truncate">
        {top.title}
      </span>
      <span style={{ color: 'var(--text-secondary)' }} className="shrink-0">
        — {top.source}
      </span>
      <button
        onClick={() => {
          const newDismissed = new Set(dismissed)
          newDismissed.add(items.indexOf(top))
          setDismissed(newDismissed)
        }}
        className="ml-auto shrink-0 hover:opacity-70"
        style={{ color: 'var(--text-muted)' }}
      >
        ✕
      </button>
    </div>
  )
}
