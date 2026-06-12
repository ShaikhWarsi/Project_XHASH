import { useState } from 'react'
import { useTradingAgentsStore } from '../../store/tradingagents'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

export default function ScraperConsole() {
  const scrapeBundle = useTradingAgentsStore((s) => s.scrapeBundle)
  const status = useTradingAgentsStore((s) => s.status)
  const error = useTradingAgentsStore((s) => s.error)
  const ticker = useTradingAgentsStore((s) => s.ticker)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (status === 'scraping') {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-cyan)' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          Scraping data for {ticker || 'ticker'}...
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          Fetching from StockTwits, Reddit, Yahoo News
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#ef4444', fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
        Scrape failed: {error}
      </div>
    )
  }

  if (!scrapeBundle) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
        No data scraped yet. Enter a ticker and click "Scrape" or "Analyze".
      </div>
    )
  }

  const sourceIcons: Record<string, string> = {
    stocktwits: '💬', reddit: '🧵', yahoo_news: '📰', yahoo_global: '🌍',
  }

  const toggle = (source: string) => setExpanded((s) => ({ ...s, [source]: !s[source] }))

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {scrapeBundle.ticker} — {scrapeBundle.sources.length} source(s)
      </div>
      {scrapeBundle.sources.map((src, i) => {
        const isExpanded = expanded[src.source]
        const icon = sourceIcons[src.source] || '📊'
        return (
          <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
            <div
              onClick={() => toggle(src.source)}
              style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-hover)', fontSize: 12, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>{icon}</span>
              <span style={{ textTransform: 'capitalize' }}>{src.source.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({src.items.length} items)</span>
            </div>
            {isExpanded && (
              <div style={{ padding: 12, maxHeight: 400, overflowY: 'auto', fontSize: 12 }}>
                {src.items.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No items</div>}
                {src.items.map((item, j) => (
                  <div key={j} style={{
                    padding: '6px 8px', borderBottom: '1px solid var(--border-color)',
                    marginBottom: 4, fontSize: 11, lineHeight: 1.5,
                  }}>
                    {Object.entries(item).slice(0, 4).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{k}:</span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '...' : String(v ?? '')}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
