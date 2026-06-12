import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'

export default function Renaissance() {
  const [symbol, setSymbol] = useState('AAPL')
  const [result, setResult] = useState<any>(null)
  const [runs, setRuns] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await api.post(`/renaissance/analyze?symbol=${symbol}`)
      setResult(r.data)
      const r2 = await api.get('/renaissance/runs')
      setRuns(r2.data.runs || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message)
    }
    setLoading(false)
  }

  const loadAgents = async () => {
    try {
      const r = await api.get('/renaissance/agents')
      setAgents(r.data.agents || [])
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load agents')
    }
  }

  const loadRuns = async () => {
    try {
      const r = await api.get('/renaissance/runs')
      setRuns(r.data.runs || [])
    } catch (err: any) {
      console.error('[Renaissance] Failed to load runs:', err)
    }
  }

  useEffect(() => { loadAgents(); loadRuns() }, [])

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">RENAISSANCE — AGENT ORCHESTRATOR</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default flex-wrap">
        <input className="bg-card border border-default px-2 py-1 w-24 text-[11px]" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="SYMBOL" />
        <button onClick={analyze} disabled={loading} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">
          {loading ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </div>
      {error && <div className="px-3 py-2 text-down text-[10px]">{error}</div>}
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Renaissance agents deliberating..." /></div>}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {agents.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">AGENT TEAMS</div>
            <div className="grid grid-cols-3 gap-2">
              {['research', 'risk', 'trading'].map(team => (
                <div key={team} className="bg-card border border-default p-2 rounded">
                  <div className="text-[10px] font-bold uppercase mb-1">{team}</div>
                  {agents.filter((a: any) => a.team === team).map((a: any) => (
                    <div key={a.id} className="text-[10px] text-muted py-0.5">
                      <span className="text-accent-blue">{a.id}</span> — {a.role}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {result && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">LATEST ANALYSIS — {result.symbol}</div>
            <div className="bg-card border border-default p-2 rounded">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.result?.deliberation || {}).map(([ticker, d]: [string, any]) => (
                  <div key={ticker} className="border-b border-default pb-1">
                    <div className="text-accent-blue font-bold">{ticker}</div>
                    <div className="text-[10px]">Consensus: <span className="text-primary">{d.consensus}</span></div>
                    <div className="text-[10px]">Confidence: <span className="text-primary">{(d.confidence * 100).toFixed(1)}%</span></div>
                    <div className="text-[10px]">Bulls: {d.bullish_count} / Bears: {d.bearish_count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {runs.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">HISTORICAL RUNS ({runs.length})</div>
            <div className="space-y-1">
              {runs.slice().reverse().map((run: any) => (
                <div key={run.run_id} className="bg-card border border-default p-2 rounded text-[10px]">
                  <span className="text-accent-blue">{run.run_id}</span>
                  <span className="text-muted ml-2">{run.symbol}</span>
                  <span className="text-muted ml-2">{new Date(run.timestamp * 1000).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
