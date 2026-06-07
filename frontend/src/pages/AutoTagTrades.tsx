import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { autoTagTrades } from '../api/llm'
import { Tags, Sparkles } from 'lucide-react'

export default function AutoTagTrades() {
  const [tradesInput, setTradesInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTag = useCallback(async () => {
    if (!tradesInput.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const trades = JSON.parse(tradesInput)
      const res = await autoTagTrades(Array.isArray(trades) ? trades : [trades])
      setResult(res)
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [tradesInput])

  const categoryColors: Record<string, string> = {
    trend_following: '#3b82f6', mean_reversion: '#8b5cf6', breakout: '#22c55e',
    scalping: '#eab308', momentum: '#f97316', reversal: '#ef4444',
    news_reaction: '#06b6d4', earnings_play: '#ec4899', hedge: '#6366f1',
    rebalance: '#14b8a6', other: '#6b7280',
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Tags size={20} /> Auto-Tag Trades</h1>
      <p className="text-sm text-muted">AI labels every trade with a reason category and explanation.</p>

      <Card title="Trade Data">
        <textarea value={tradesInput} onChange={(e) => setTradesInput(e.target.value)}
          className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-3 py-2 text-[11px] font-mono text-primary outline-none min-h-[150px]"
          placeholder='[{&quot;symbol&quot;: &quot;AAPL&quot;, &quot;side&quot;: &quot;buy&quot;, &quot;qty&quot;: 100, &quot;price&quot;: 178.5, &quot;pnl&quot;: 250, &quot;timestamp&quot;: &quot;2024-01-15&quot;}]' />
        <button onClick={handleTag} disabled={loading || !tradesInput.trim()}
          className="mt-2 flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Tagging...' : 'Auto-Tag Trades'}
        </button>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result?.tagged_trades && (
        <Card title={`Tagged Trades (${result.tagged_trades.length})`}>
          <div className="space-y-2">
            {result.tagged_trades.map((t: any, i: number) => (
              <div key={i} className="bg-[var(--bg-hover)] border border-default rounded p-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono font-bold text-xs">{t.symbol}</span>
                  <span className="text-[10px] text-muted">{t.side?.toUpperCase()} {t.qty} @ ${t.price}</span>
                  {t.pnl != null && <span className="text-[10px] font-mono" style={{ color: t.pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>${t.pnl.toFixed(2)}</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge label={t.category} variant="info" />
                  {t.tag && <Badge label={t.tag} variant="default" />}
                </div>
                {t.reasoning && <div className="text-[10px] text-muted mt-1">{t.reasoning}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
