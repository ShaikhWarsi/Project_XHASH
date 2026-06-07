import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { tradeCoach } from '../api/llm'
import { GraduationCap, Sparkles } from 'lucide-react'

const gradeColors: Record<string, string> = { A: 'var(--accent-green)', B: 'var(--accent-blue)', C: 'var(--accent-yellow)', D: 'var(--accent-red)', F: 'var(--accent-red)' }

export default function TradeCoach() {
  const [tradeInput, setTradeInput] = useState('')
  const [recentInput, setRecentInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCoach = useCallback(async () => {
    if (!tradeInput.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const trade = JSON.parse(tradeInput)
      const recent = recentInput.trim() ? JSON.parse(recentInput) : []
      const res = await tradeCoach(trade, recent)
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [tradeInput, recentInput])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><GraduationCap size={20} /> AI Trade Coach</h1>
      <p className="text-sm text-muted">Post-trade AI review with grading, analysis, and lessons from similar historical trades.</p>

      <Card title="Trade Details">
        <div>
          <label className="block text-[10px] text-muted">Trade (JSON)</label>
          <textarea value={tradeInput} onChange={(e) => setTradeInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[100px]"
            placeholder='{&quot;symbol&quot;:&quot;AAPL&quot;,&quot;side&quot;:&quot;buy&quot;,&quot;entry_price&quot;:178.5,&quot;exit_price&quot;:182.3,&quot;pnl&quot;:380,&quot;pnl_pct&quot;:2.13,&quot;holding_period&quot;:5,&quot;entry_reason&quot;:&quot;sma_cross&quot;,&quot;exit_reason&quot;:&quot;target_reached&quot;,&quot;market_regime&quot;:&quot;bull&quot;}' />
        </div>
        <div className="mt-2">
          <label className="block text-[10px] text-muted">Recent Trades (JSON array, optional)</label>
          <textarea value={recentInput} onChange={(e) => setRecentInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[60px]" placeholder='[{&quot;symbol&quot;:&quot;MSFT&quot;,&quot;pnl_pct&quot;:1.5}]' />
        </div>
        <button onClick={handleCoach} disabled={loading || !tradeInput.trim()}
          className="mt-2 flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Coaching...' : 'Review Trade'}
        </button>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {result.grade && <Card title="Grade"><div className="text-4xl font-bold font-mono" style={{ color: gradeColors[result.grade] || 'var(--text-primary)' }}>{result.grade}</div></Card>}
            {result.score != null && <Card title="Score"><div className="text-2xl font-mono font-bold">{result.score}/100</div></Card>}
            {result.review && <Card title="Review"><div className="text-xs text-muted line-clamp-3">{result.review}</div></Card>}
          </div>

          {result.strengths?.length > 0 && <Card title="Strengths"><ul className="space-y-1">{result.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-green">●</span>{s}</li>)}</ul></Card>}
          {result.weaknesses?.length > 0 && <Card title="Areas to Improve"><ul className="space-y-1">{result.weaknesses.map((w: string, i: number) => <li key={i} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-red">●</span>{w}</li>)}</ul></Card>}
          {result.lessons?.length > 0 && <Card title="Lessons"><ul className="space-y-1">{result.lessons.map((l: string, i: number) => <li key={i} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-blue">●</span>{l}</li>)}</ul></Card>}

          {result.similar_trades?.length > 0 && (
            <Card title="Similar Historical Trades">
              <div className="space-y-1.5">
                {result.similar_trades.map((st: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-[var(--bg-hover)] border border-default rounded px-2 py-1">
                    <div><span className="font-mono font-bold text-xs">{st.symbol}</span><span className="text-[10px] text-muted ml-1">{st.date}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono" style={{ color: st.pnl_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{st.pnl_pct >= 0 ? '+' : ''}{st.pnl_pct}%</span>
                      {st.lesson && <span className="text-[9px] text-muted max-w-[200px] truncate">{st.lesson}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
