import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import KpiCard from '../components/ui/KpiCard'

export default function Reflection() {
  const [report, setReport] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [worst, setWorst] = useState<any[]>([])
  const [best, setBest] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [r, s, w, b] = await Promise.all([
        api.get('/reflection/report'),
        api.get('/reflection/stats'),
        api.get('/reflection/worst-trades'),
        api.get('/reflection/best-trades'),
      ])
      setReport(r.data)
      setStats(s.data)
      setWorst(w.data.trades || [])
      setBest(b.data.trades || [])
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  const recordDecision = async () => {
    const signal = prompt('Signal (BUY/SELL/HOLD):', 'BUY')
    if (!signal) return
    const confidence = prompt('Confidence (0-1):', '0.7')
    if (!confidence) return
    try {
      await api.post(`/reflection/record?signal=${signal}&confidence=${confidence}`)
      load()
    } catch {}
  }

  useEffect(() => { load() }, [])

  const assessmentColor = (a: string) => {
    const m: Record<string, string> = { strong: 'var(--accent-green)', acceptable: 'var(--accent-blue)', needs_improvement: 'var(--accent-yellow)', poor: 'var(--accent-red)' }
    return m[a] || 'var(--text-muted)'
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">REFLECTION SERVICE</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <button onClick={recordDecision} className="bg-card border border-default px-3 py-1 text-[11px] rounded cursor-pointer">RECORD DECISION</button>
        <button onClick={load} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">REFRESH</button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Loading reflection data..." /></div>}
      {stats && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <KpiCard title="TOTAL DECISIONS" value={stats.total_decisions} />
            <KpiCard title="WIN RATE" value={`${((stats.win_rate || 0) * 100).toFixed(1)}%`} />
            <KpiCard title="TOTAL P&L" value={`${((stats.total_pnl_pct || 0) * 100).toFixed(2)}%`} />
            <KpiCard title="SHARPE" value={stats.sharpe_approx?.toFixed(2) || '0'} />
          </div>
          {report?.assessment && (
            <div className="bg-card border border-default p-3 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-muted">ASSESSMENT:</span>
                <span className="text-[11px] font-bold" style={{ color: assessmentColor(report.assessment) }}>{report.assessment.toUpperCase()}</span>
              </div>
              <div className="text-[10px] text-muted">{report.recommendation}</div>
              {report.llm_insights && <div className="text-[10px] text-primary mt-1 italic">{report.llm_insights}</div>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">WORST TRADES</div>
              {worst.map((t, i) => (
                <div key={i} className="bg-card border border-default p-1.5 rounded mb-1 text-[10px] flex justify-between">
                  <span className="text-muted">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '-'}</span>
                  <span className="text-down">{((t.pnl_pct || 0) * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted mb-1">BEST TRADES</div>
              {best.map((t, i) => (
                <div key={i} className="bg-card border border-default p-1.5 rounded mb-1 text-[10px] flex justify-between">
                  <span className="text-muted">{t.timestamp ? new Date(t.timestamp).toLocaleDateString() : '-'}</span>
                  <span className="text-up">+{((t.pnl_pct || 0) * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
