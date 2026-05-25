import { useEffect, useState } from 'react'
import { fetchCompanyNews } from '../api/client'
import { useToastStore } from '../store/toast'

interface NewsItem {
  title: string
  source: string
  url: string
  priority: 'flash' | 'urgent' | 'normal'
  timestamp: string
}

const MOCK_NEWS: NewsItem[] = [
  { title: 'Fed holds rates steady at 5.50% as inflation moderates', source: 'Bloomberg', url: '', priority: 'flash', timestamp: new Date().toISOString() },
  { title: 'S&P 500 hits fresh all-time high above 5,500', source: 'Reuters', url: '', priority: 'urgent', timestamp: new Date().toISOString() },
  { title: 'Oil prices surge 3% on Middle East supply concerns', source: 'CNBC', url: '', priority: 'normal', timestamp: new Date().toISOString() },
]

const PRIORITY_COLORS: Record<string, string> = {
  flash: '#ef4444',
  urgent: '#ea580c',
  normal: '#3b82f6',
}

const PRIORITY_LABELS: Record<string, string> = {
  flash: 'FLASH',
  urgent: 'URGENT',
  normal: 'NEWS',
}

export default function BreakingNewsBanner() {
  const [visible] = useState(true)
  const [items, setItems] = useState(MOCK_NEWS)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchCompanyNews('AAPL').then((articles) => {
      if (articles?.length) {
        setItems(articles.slice(0, 5).map((a) => ({
          title: a.headline,
          source: a.source,
          url: a.url,
          priority: 'normal' as const,
          timestamp: new Date(a.datetime * 1000).toISOString(),
        })))
      }
    }).catch((err) => {
      console.warn('[BreakingNewsBanner] Failed to fetch company news:', err)
      useToastStore.getState().addToast('Failed to load news', 'error')
    })
  }, [])

  const activeItems = items.filter((_, i) => !dismissed.has(i))
  if (!visible || activeItems.length === 0) return null

  const top = activeItems[0]

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
