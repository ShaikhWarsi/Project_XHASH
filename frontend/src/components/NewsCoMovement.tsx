import { useState, useCallback } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { coMovementGet } from '../api/llm'
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function NewsCoMovement() {
  const [headline, setHeadline] = useState('')
  const [tickersInput, setTickersInput] = useState('AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA')
  const [priceChangesInput, setPriceChangesInput] = useState('')
  const [result, setResult] = useState<{ co_movements: any[]; source: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = useCallback(async () => {
    if (!headline.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const tickers = tickersInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
      const pc: Record<string, number> = {}
      if (priceChangesInput.trim()) {
        priceChangesInput.split(',').forEach(pair => {
          const [t, v] = pair.split(':').map(s => s.trim())
          if (t && v) pc[t.toUpperCase()] = parseFloat(v) || 0
        })
      }
      tickers.forEach(t => { if (!(t in pc)) pc[t] = 0 })
      const res = await coMovementGet(headline, tickers, pc)
      setResult(res)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [headline, tickersInput, priceChangesInput])

  return (
    <Card title="NEWS CO-MOVEMENT">
      <div className="text-xs text-muted mb-2">
        Analyze which tickers are moving in response to a news headline.
      </div>
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-muted mb-0.5">Headline</label>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)}
            className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-2 py-1.5 text-sm text-primary outline-none"
            placeholder="e.g. Fed holds rates steady, signals two cuts in 2024" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted mb-0.5">Tickers (comma-separated)</label>
            <input value={tickersInput} onChange={(e) => setTickersInput(e.target.value.toUpperCase())}
              className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-2 py-1.5 text-sm text-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-0.5">Price Changes (TICKER:%,...)</label>
            <input value={priceChangesInput} onChange={(e) => setPriceChangesInput(e.target.value)}
              className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-2 py-1.5 text-sm text-primary outline-none"
              placeholder="AAPL:2.3,MSFT:-0.5" />
          </div>
        </div>
        <button onClick={handleAnalyze} disabled={loading || !headline.trim()}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Newspaper size={14} /> {loading ? 'Analyzing...' : 'Analyze Co-Movement'}
        </button>
      </div>

      {error && <div className="text-accent-red text-xs mt-2">{error}</div>}

      {result && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-muted">Source: {result.source}</span>
            {result.source === 'llm' && <Badge label="AI" variant="info" />}
          </div>
          {result.co_movements.length === 0 ? (
            <div className="text-xs text-muted">No significant co-movements detected.</div>
          ) : (
            <div className="space-y-1.5">
              {result.co_movements.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--bg-hover)] border border-default rounded px-2 py-1.5">
                  <span className="font-mono font-bold text-xs text-primary w-16">{m.ticker}</span>
                  {m.co_move_direction === 'up' ? <TrendingUp size={14} className="text-accent-green" /> : m.co_move_direction === 'down' ? <TrendingDown size={14} className="text-accent-red" /> : <Minus size={14} className="text-muted" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${m.confidence * 100}%`, background: m.confidence > 0.7 ? 'var(--accent-green)' : m.confidence > 0.3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }} />
                      <span className="text-[9px] text-muted">{Math.round(m.confidence * 100)}%</span>
                    </div>
                    <div className="text-[9px] text-muted">{m.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
