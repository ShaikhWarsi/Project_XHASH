import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { strategyHealthCheck } from '../api/llm'
import { HeartPulse, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

export default function StrategyHealthCheck() {
  const [strategyName, setStrategyName] = useState('')
  const [strategyCode, setStrategyCode] = useState('')
  const [regime, setRegime] = useState('neutral')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheck = useCallback(async () => {
    if (!strategyCode.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await strategyHealthCheck(strategyName || 'Unnamed Strategy', strategyCode, [], regime)
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [strategyName, strategyCode, regime])

  const healthColor = (score: number) => score >= 80 ? 'var(--accent-green)' : score >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><HeartPulse size={20} /> Strategy Health Check</h1>
      <p className="text-sm text-muted">AI-powered review of your strategy's health, drift detection, and performance decay.</p>

      <Card title="Strategy Details">
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] text-muted">Strategy Name</label>
            <input value={strategyName} onChange={(e) => setStrategyName(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-muted">Current Market Regime</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="bull">Bull</option>
              <option value="bear">Bear</option>
              <option value="range">Range</option>
              <option value="high_vol">High Volatility</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-muted">Strategy Code</label>
            <textarea value={strategyCode} onChange={(e) => setStrategyCode(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none font-mono min-h-[120px]" placeholder="Paste your strategy code here..." />
          </div>
          <button onClick={handleCheck} disabled={loading || !strategyCode.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
            {loading ? 'Analyzing...' : 'Check Health'}
          </button>
        </div>
      </Card>

      {error && <div className="bg-[rgba(239,68,68,0.1)] border border-down rounded px-3 py-2 text-xs text-down">{error}</div>}

      {result && (
        <>
          <Card title="Health Score">
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold font-mono" style={{ color: healthColor(result.health_score) }}>{result.health_score}/100</div>
              <div className="flex-1 h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${result.health_score}%`, background: healthColor(result.health_score) }} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {result.drift_detected != null && (
              <Card title="Drift Detection">
                <div className="flex items-center gap-2">
                  {result.drift_detected ? <><AlertTriangle size={16} className="text-accent-yellow" /><span className="text-accent-yellow font-bold">Drift Detected</span></> : <><TrendingUp size={16} className="text-accent-green" /><span className="text-accent-green font-bold">No Drift</span></>}
                </div>
                {result.drift_details && <div className="text-xs text-muted mt-1">{result.drift_details}</div>}
              </Card>
            )}
            {result.win_rate_trend && (
              <Card title="Win Rate Trend">
                <div className="text-sm font-mono" style={{ color: result.win_rate_trend.includes('declining') || result.win_rate_trend.includes('dropping') ? 'var(--accent-red)' : 'var(--accent-green)' }}>{result.win_rate_trend}</div>
              </Card>
            )}
            {result.sharpe_trend && (
              <Card title="Sharpe Trend">
                <div className="text-sm font-mono" style={{ color: result.sharpe_trend.includes('declining') || result.sharpe_trend.includes('dropping') ? 'var(--accent-red)' : 'var(--accent-green)' }}>{result.sharpe_trend}</div>
              </Card>
            )}
            {result.max_dd_status && (
              <Card title="Max Drawdown">
                <div className="text-sm font-mono" style={{ color: result.max_dd_status.includes('exceed') || result.max_dd_status.includes('breach') ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{result.max_dd_status}</div>
              </Card>
            )}
          </div>

          {result.recommendations && result.recommendations.length > 0 && (
            <Card title="Recommendations">
              <ul className="space-y-1">
                {result.recommendations.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-primary"><span className="text-accent-blue shrink-0">{i + 1}.</span><span>{r}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
