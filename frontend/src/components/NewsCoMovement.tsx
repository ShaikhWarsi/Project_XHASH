import { useState } from 'react'
import Card from './ui/Card'
import { coMovementGet } from '../api/llm'

export default function NewsCoMovement() {
  const [headline, setHeadline] = useState('')
  const [tickersText, setTickersText] = useState('')
  const [results, setResults] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!headline.trim()) return
    const tickers = tickersText.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length === 0) return

    setLoading(true)
    setError(null)
    setResults(null)

    const priceChanges: Record<string, number> = {}
    for (const t of tickers) {
      priceChanges[t] = Math.round((Math.random() * 6 - 3) * 100) / 100
    }

    try {
      const res = await coMovementGet(headline, tickers, priceChanges)
      setResults(res.co_movements)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <Card title="News Co-Movement" className="font-mono-data">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Apple reports record Q4 earnings..."
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Tickers (comma-separated)</label>
          <input
            value={tickersText}
            onChange={(e) => setTickersText(e.target.value)}
            placeholder="e.g. AAPL, MSFT, GOOGL, NVDA"
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none"
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !headline.trim() || !tickersText.trim()}
          className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full"
          style={{
            background: 'var(--accent-blue)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Co-Movement'}
        </button>

        {error && <div className="text-down text-[10px]">{error}</div>}

        {results && results.length > 0 && (
          <div>
            <div className="text-[9px] text-muted mb-1 font-semibold tracking-wider uppercase">Correlated Movers</div>
            <div className="space-y-1">
              {results.map((r: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-2 py-1 rounded-sm"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-primary">{r.ticker}</span>
                    <span
                      className="text-[9px] font-mono-data px-1 rounded-sm"
                      style={{
                        background: r.co_move_direction === 'up' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                        color: r.co_move_direction === 'up' ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}
                    >
                      {r.co_move_direction === 'up' ? '↑' : '↓'} {r.co_move_direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted">
                      {(r.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {results.length > 0 && (
              <div className="mt-1.5 text-[9px] text-muted italic leading-tight">
                {results[0]?.reasoning}
              </div>
            )}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="text-[10px] text-muted text-center py-2">No significant co-movement detected</div>
        )}
      </div>
    </Card>
  )
}
