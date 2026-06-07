import { useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import KpiCard from '../components/ui/KpiCard'

export default function WalkForward() {
  const [symbol, setSymbol] = useState('AAPL')
  const [trainPct, setTrainPct] = useState(0.6)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post(`/walkforward/run?symbol=${symbol}&train_pct=${trainPct}`)
      setResult(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">WALK-FORWARD ANALYSIS</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <input className="bg-card border border-default px-2 py-1 w-24 text-[11px]" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="SYMBOL" />
        <select className="bg-card border border-default px-2 py-1 text-[11px]" value={trainPct} onChange={e => setTrainPct(Number(e.target.value))}>
          <option value={0.5}>50% train</option>
          <option value={0.6}>60% train</option>
          <option value={0.7}>70% train</option>
          <option value={0.8}>80% train</option>
        </select>
        <button onClick={run} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">
          {loading ? 'RUNNING...' : 'RUN'}
        </button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Running walk-forward..." /></div>}
      {result && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <KpiCard title="WINDOWS" value={result.windows} />
            <KpiCard title="AVG SHARPE" value={result.avg_sharpe.toFixed(3)} />
            <KpiCard title="AVG RETURN" value={`${(result.avg_return * 100).toFixed(2)}%`} />
            <KpiCard title="STABILITY" value={`${(result.stability * 100).toFixed(1)}%`} />
          </div>
          <div className="text-muted text-[10px]">
            Walk-forward over {result.windows} windows for {result.symbol}
          </div>
        </div>
      )}
    </div>
  )
}
