import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { compareLeaderboard } from '../api/llm'
import { Trophy, Sparkles } from 'lucide-react'

export default function AILeaderboard() {
  const [aiTradesInput, setAiTradesInput] = useState('')
  const [humanTradesInput, setHumanTradesInput] = useState('')
  const [period, setPeriod] = useState('month')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCompare = useCallback(async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const ai = aiTradesInput.trim() ? JSON.parse(aiTradesInput) : []
      const human = humanTradesInput.trim() ? JSON.parse(humanTradesInput) : []
      const res = await compareLeaderboard(ai, human, period)
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [aiTradesInput, humanTradesInput, period])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Trophy size={20} /> AI vs Human Leaderboard</h1>
      <p className="text-sm text-muted">Compare AI agent trading performance against your own trades.</p>

      <Card title="Trade Data">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted">AI Trades (JSON)</label>
            <textarea value={aiTradesInput} onChange={(e) => setAiTradesInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[100px]" placeholder='[{&quot;symbol&quot;:&quot;AAPL&quot;,&quot;pnl&quot;:500,&quot;side&quot;:&quot;buy&quot;}]' />
          </div>
          <div>
            <label className="block text-[10px] text-muted">Human Trades (JSON)</label>
            <textarea value={humanTradesInput} onChange={(e) => setHumanTradesInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[100px]" placeholder='[{&quot;symbol&quot;:&quot;TSLA&quot;,&quot;pnl&quot;:-200,&quot;side&quot;:&quot;sell&quot;}]' />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="quarter">Quarter</option>
          </select>
          <button onClick={handleCompare} disabled={loading}
            className="flex items-center gap-1 px-4 py-1.5 rounded text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
            <Sparkles size={14} /> {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result?.comparison && (
        <>
          <Card title="Winner">
            <div className="flex items-center gap-3">
              <Trophy size={24} style={{ color: result.leader === 'ai' ? 'var(--accent-blue)' : result.leader === 'human' ? 'var(--accent-green)' : 'var(--accent-yellow)' }} />
              <span className="text-lg font-bold" style={{ color: result.leader === 'ai' ? 'var(--accent-blue)' : result.leader === 'human' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                {result.leader === 'ai' ? 'AI Wins' : result.leader === 'human' ? 'Human Wins' : 'Tie'}
              </span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {['AI', 'Human'].map((label) => {
              const prefix = label === 'AI' ? 'ai' : 'human'
              const c = result.comparison
              return (
                <Card key={label} title={label}>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted">Trades</span><span className="font-mono font-bold">{c[`total_trades_${prefix}`] ?? '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Win Rate</span><span className="font-mono font-bold" style={{ color: (c[`win_rate_${prefix}`] ?? 0) > 0.5 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{(c[`win_rate_${prefix}`] * 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted">Avg PnL</span><span className="font-mono font-bold" style={{ color: (c[`avg_pnl_${prefix}`] ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>${(c[`avg_pnl_${prefix}`] ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Total PnL</span><span className="font-mono font-bold" style={{ color: (c[`total_pnl_${prefix}`] ?? 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>${(c[`total_pnl_${prefix}`] ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Sharpe</span><span className="font-mono font-bold">{(c[`sharpe_ratio_${prefix}`] ?? 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Max DD</span><span className="font-mono font-bold" style={{ color: (c[`max_drawdown_${prefix}`] ?? 0) > 0.1 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{(c[`max_drawdown_${prefix}`] * 100).toFixed(1)}%</span></div>
                  </div>
                </Card>
              )
            })}
          </div>

          {result.insights?.length > 0 && (
            <Card title="Insights">
              <ul className="space-y-1">{result.insights.map((i: string, idx: number) => <li key={idx} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-blue shrink-0">{idx + 1}.</span>{i}</li>)}</ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
