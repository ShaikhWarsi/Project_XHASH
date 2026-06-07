import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { generateRiskReport } from '../api/llm'
import { FileWarning, Sparkles, Mail } from 'lucide-react'

export default function AIRiskReport() {
  const [period, setPeriod] = useState('weekly')
  const [email, setEmail] = useState('')
  const [regime, setRegime] = useState('neutral')
  const [portfolioInput, setPortfolioInput] = useState('')
  const [tradesInput, setTradesInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = useCallback(async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const pd = portfolioInput.trim() ? JSON.parse(portfolioInput) : { total_value: 100000, cash: 25000, exposure: 75000, var: 0.02, cvar: 0.035, sharpe: 1.2, sortino: 1.5, max_dd: 0.08, beta: 0.95, sector_exposure: {}, top_positions: [] }
      const trades = tradesInput.trim() ? JSON.parse(tradesInput) : []
      const res = await generateRiskReport(email || null, period, pd, trades, regime)
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [period, email, regime, portfolioInput, tradesInput])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><FileWarning size={20} /> AI Risk Reports</h1>
      <p className="text-sm text-muted">Generate comprehensive weekly or monthly AI-powered risk reports with portfolio analysis and recommendations.</p>

      <Card title="Report Configuration">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-muted">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-muted">Market Regime</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="bull">Bull</option><option value="bear">Bear</option><option value="range">Range</option><option value="high_vol">High Vol</option><option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-[10px] text-muted">Email (optional — for auto-delivery)</label>
          <div className="flex items-center gap-1">
            <Mail size={14} className="text-muted" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" placeholder="analyst@firm.com" />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-[10px] text-muted">Portfolio Data (JSON, optional)</label>
          <textarea value={portfolioInput} onChange={(e) => setPortfolioInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[60px]" placeholder='{&quot;total_value&quot;: 250000, &quot;cash&quot;: 50000}' />
        </div>
        <div className="mt-2">
          <label className="block text-[10px] text-muted">Trades (JSON array, optional)</label>
          <textarea value={tradesInput} onChange={(e) => setTradesInput(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-[11px] font-mono text-primary outline-none min-h-[60px]" />
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="mt-2 flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Generating...' : 'Generate Risk Report'}
        </button>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Badge label={`Generated: ${new Date(result.generated_at).toLocaleString()}`} variant="info" />
            {result.emailed_to && <Badge label={`Emailed to ${result.emailed_to}`} variant="success" />}
          </div>
          {result.report_html && (
            <Card title="Risk Report">
              <div className="border border-default rounded overflow-hidden">
                <iframe srcDoc={result.report_html} className="w-full border-none" style={{ height: '600px' }} title="Risk Report" />
              </div>
            </Card>
          )}
          {result.report_text && (
            <Card title="Plain Text Report">
              <pre className="text-xs font-mono text-primary whitespace-pre-wrap max-h-[400px] overflow-auto">{result.report_text}</pre>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
