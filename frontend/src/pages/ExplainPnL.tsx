import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import { explainPnL } from '../api/llm'
import { FileText, Sparkles } from 'lucide-react'

export default function ExplainPnL() {
  const [period, setPeriod] = useState('week')
  const [tradesInput, setTradesInput] = useState('')
  const [regime, setRegime] = useState('neutral')
  const [topPerf, setTopPerf] = useState('')
  const [worstPerf, setWorstPerf] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExplain = useCallback(async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const trades = tradesInput.trim() ? JSON.parse(tradesInput) : []
      const res = await explainPnL(period, trades, [], regime,
        topPerf.split(',').map(s => s.trim()).filter(Boolean),
        worstPerf.split(',').map(s => s.trim()).filter(Boolean))
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [period, tradesInput, regime, topPerf, worstPerf])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><FileText size={20} /> Explain My P&L</h1>
      <p className="text-sm text-muted">Get a natural-language narrative explaining your portfolio's performance.</p>

      <Card title="Period & Context">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-muted">Market Regime</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="bull">Bull</option><option value="bear">Bear</option><option value="range">Range</option><option value="high_vol">High Vol</option><option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[10px] text-muted">Top Performers (comma-sep)</label>
            <input value={topPerf} onChange={(e) => setTopPerf(e.target.value.toUpperCase())} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" placeholder="AAPL,MSFT" />
          </div>
          <div>
            <label className="block text-[10px] text-muted">Worst Performers (comma-sep)</label>
            <input value={worstPerf} onChange={(e) => setWorstPerf(e.target.value.toUpperCase())} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" placeholder="TSLA,NVDA" />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-[10px] text-muted">Trades (JSON, optional)</label>
          <textarea value={tradesInput} onChange={(e) => setTradesInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[60px]" placeholder='[{&quot;symbol&quot;:&quot;AAPL&quot;,&quot;pnl&quot;:500}]' />
        </div>
        <button onClick={handleExplain} disabled={loading}
          className="mt-2 flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Generating...' : 'Explain P&L'}
        </button>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result && (
        <>
          {result.narrative && <Card title="Narrative"><div className="text-sm text-primary leading-relaxed whitespace-pre-wrap">{result.narrative}</div></Card>}
          <div className="grid grid-cols-2 gap-3">
            {result.key_drivers?.length > 0 && <Card title="Key Drivers"><ul className="space-y-1">{result.key_drivers.map((d: string, i: number) => <li key={i} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-green">●</span>{d}</li>)}</ul></Card>}
            {result.risk_factors?.length > 0 && <Card title="Risk Factors"><ul className="space-y-1">{result.risk_factors.map((r: string, i: number) => <li key={i} className="text-xs text-primary flex items-start gap-1"><span className="text-accent-red">●</span>{r}</li>)}</ul></Card>}
          </div>
          {result.forward_outlook && <Card title="Forward Outlook"><div className="text-sm text-primary">{result.forward_outlook}</div></Card>}
        </>
      )}
    </div>
  )
}
