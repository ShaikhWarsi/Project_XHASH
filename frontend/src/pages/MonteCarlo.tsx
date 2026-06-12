import { useState } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import KpiCard from '../components/ui/KpiCard'

export default function MonteCarlo() {
  const [symbol, setSymbol] = useState('AAPL')
  const [sims, setSims] = useState(1000)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post(`/monte-carlo/run?symbol=${symbol}&n_simulations=${sims}`)
      setResult(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">MONTE CARLO SIMULATION</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <input className="bg-card border border-default px-2 py-1 w-24 text-[11px]" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="SYMBOL" />
        <select className="bg-card border border-default px-2 py-1 text-[11px]" value={sims} onChange={e => setSims(Number(e.target.value))}>
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1,000</option>
          <option value={5000}>5,000</option>
          <option value={10000}>10,000</option>
        </select>
        <button onClick={run} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">
          {loading ? 'RUNNING...' : 'RUN'}
        </button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Running simulations..." /></div>}
      {result && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <KpiCard label="MEAN RETURN" value={`${(result.mean_return * 100).toFixed(2)}%`} />
            <KpiCard label="MEAN SHARPE" value={result.mean_sharpe.toFixed(3)} />
            <KpiCard label="MAX DD" value={`${(result.mean_max_dd * 100).toFixed(2)}%`} />
            <KpiCard label="% POSITIVE" value={`${(result.pct_positive * 100).toFixed(1)}%`} />
            <KpiCard label="VaR 95%" value={`${(result.var_95 * 100).toFixed(2)}%`} />
          </div>
          <div className="text-muted text-[10px]">
            Based on {result.n_simulations.toLocaleString()} simulations of {symbol} returns
          </div>
        </div>
      )}
    </div>
  )
}
