import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useHeldTickers } from '../../hooks/useHeldTickers'

interface NewsItem {
  ticker: string
  headline: string
  source: string
  url: string
  time: number
  sentiment: -1 | 0 | 1
}

function timeAgo(unix: number): string {
  const sec = Math.floor((Date.now() / 1000 - unix))
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  return `${d}d`
}

const SENTIMENT_ICON = {
  [-1]: { icon: TrendingDown, color: 'var(--accent-red)' },
  [0]: { icon: Minus, color: 'var(--text-muted)' },
  [1]: { icon: TrendingUp, color: 'var(--accent-green)' },
} as const

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const tickers = useHeldTickers()

  const fetchNews = useCallback(async () => {
    if (tickers.length === 0) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/news/for-tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: tickers }),
      })
      if (res.ok) {
        const data = await res.json()
        setNews(data.news ?? [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [tickers])

  useEffect(() => {
    setLoading(true)
    fetchNews()
  }, [fetchNews])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Loading news...</span>
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-1">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>No news for held tickers</span>
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {tickers.length === 0 ? '(no positions)' : ''}
        </span>
      </div>
    )
  }

  const grouped: Record<string, NewsItem[]> = {}
  for (const item of news) {
    if (!grouped[item.ticker]) grouped[item.ticker] = []
    grouped[item.ticker].push(item)
  }

  return (
    <div className="flex flex-col gap-0.5 p-1">
      {Object.entries(grouped).map(([ticker, items]) => (
        <div key={ticker}>
          <button
            onClick={() => navigate(`/markets/chart?symbol=${ticker}`)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono cursor-pointer w-full text-left"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontWeight: 600,
            }}
          >
            {ticker}
            <ExternalLink size={10} />
          </button>
          {items.map((item, i) => {
            const SentIcon = SENTIMENT_ICON[item.sentiment].icon
            return (
              <a
                key={`${item.ticker}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 px-2 py-1 rounded-sm transition-colors"
                style={{
                  display: 'flex',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <SentIcon size={10} style={{ color: SENTIMENT_ICON[item.sentiment].color, marginTop: 2, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.headline}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{item.source}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(item.time)}</span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}
