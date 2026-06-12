import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import KpiCard from '../components/ui/KpiCard'
import { useToastStore } from '../store/toast'

export default function ScenarioAnalysis() {
  const addToast = useToastStore((s) => s.addToast)
  const [symbol, setSymbol] = useState('AAPL')
  const [result, setResult] = useState<any>(null)
  const [scenarios, setScenarios] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/scenario/scenarios').then(r => setScenarios(r.data.scenarios)).catch((err) => {
      addToast(`Failed to load scenarios: ${err instanceof Error ? err.message : 'Unknown'}`, 'error')
    })
  }, [])

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post(`/scenario/run?symbol=${symbol}`)
      setResult(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">SCENARIO ANALYSIS</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <input className="bg-card border border-default px-2 py-1 w-24 text-[11px]" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="SYMBOL" />
        <button onClick={run} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">
          {loading ? 'RUNNING...' : 'RUN'}
        </button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Running scenarios..." /></div>}
      {result && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="mb-2">
            <div className="text-[10px] font-semibold text-muted mb-1">BASE CASE</div>
            <div className="grid grid-cols-3 gap-2">
              <KpiCard label="RETURN" value={`${(result.base.total_return * 100).toFixed(2)}%`} />
              <KpiCard label="SHARPE" value={result.base.sharpe_ratio?.toFixed(3) || '0'} />
              <KpiCard label="MAX DD" value={`${(result.base.max_drawdown * 100).toFixed(2)}%`} />
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">SCENARIOS</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(result.scenarios || {}).map(([name, s]: [string, any]) => (
                <div key={name} className="bg-card border border-default p-2 rounded">
                  <div className="text-[10px] font-bold uppercase mb-1">{name.replace('_', ' ')}</div>
                  <div className="text-[10px] text-muted">Return: <span className="text-primary">{(s.total_return * 100).toFixed(2)}%</span></div>
                  <div className="text-[10px] text-muted">Impact: <span className="text-accent-blue">{result.impact?.[name] ? `${(result.impact[name] * 100).toFixed(2)}%` : '-'}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
