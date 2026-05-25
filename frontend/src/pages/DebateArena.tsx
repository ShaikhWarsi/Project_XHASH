import { useState } from 'react'
import { api } from '../api/client'

export default function DebateArena() {
  const [symbol, setSymbol] = useState('AAPL')
  const [rounds, setRounds] = useState(3)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runDebate = async (multi: boolean) => {
    setLoading(true)
    setResult(null)
    try {
      const endpoint = multi ? '/debate/multi-round' : '/debate/run'
      const params: any = { symbol, bull_agents: 'momentum,technicals,sentiment', bear_agents: 'value,risk,fundamentals' }
      if (multi) params.rounds = rounds
      const r = await api.post(endpoint, null, { params })
      setResult(r.data)
    } catch (e: any) {
      setResult({ error: e.message })
    }
    setLoading(false)
  }

  const stanceColor = (s: string) => {
    if (s === 'bullish' || s === 'bull') return '#22c55e'
    if (s === 'bearish' || s === 'bear') return '#ef4444'
    return '#f59e0b'
  }

  return (
    <div style={{ background: 'var(--bg-app)' }} className="flex flex-col h-full font-mono-data text-[11px] text-primary">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <span className="font-bold text-[13px]">DEBATE ARENA</span>
        <span className="text-muted">|</span>
        <span className="text-[9px] text-muted">Bull vs Bear — Multi-Agent Adversarial Reasoning</span>
      </div>

      <div className="p-2 flex gap-2 items-center border-b border-default">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        <span className="text-[9px] text-muted ml-2">ROUNDS:</span>
        <input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} min={1} max={10}
          className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px] w-[50px]" />
        <button onClick={() => runDebate(false)} disabled={loading}
          className="text-white cursor-pointer px-3.5 py-1 text-[10px] disabled:opacity-60" style={{ background: '#3b82f6' }}>
          {loading ? 'DEBATING...' : 'DEBATE'}
        </button>
        <button onClick={() => runDebate(true)} disabled={loading}
          className="text-white cursor-pointer px-3.5 py-1 text-[10px] disabled:opacity-60" style={{ background: '#8b5cf6' }}>
          {loading ? 'DEBATING...' : `${rounds}-ROUND`}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {result?.error && <div className="text-down text-[10px]">Error: {result.error}</div>}

        {result?.consensus && (
          <div className="mb-3">
            <div className="flex gap-2 mb-2">
              <div className="bg-card px-3.5 py-2.5 rounded min-w-[200px] border" style={{ borderColor: stanceColor(result.consensus) }}>
                <div className="text-[9px] text-muted">CONSENSUS</div>
                <div className="text-lg font-bold" style={{ color: stanceColor(result.consensus) }}>{result.consensus.toUpperCase()}</div>
                <div className="text-[10px] text-muted mt-0.5">Confidence: {(result.consensus_confidence * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-card border border-default px-3.5 py-2.5 rounded flex-1">
                <div className="text-[9px] text-muted">SUMMARY</div>
                <div className="text-[10px] text-primary">{result.summary}</div>
              </div>
            </div>

            {result.rounds && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-muted mb-1">ROUNDS</div>
                <div className="flex gap-1">
                  {result.rounds.map((r: any, i: number) => (
                    <div key={i} className="flex-1 bg-card px-2 py-1.5 rounded text-center border" style={{ borderColor: stanceColor(r.consensus) }}>
                      <div className="text-[9px] text-muted">R{r.round}</div>
                      <div className="text-[10px] font-semibold" style={{ color: stanceColor(r.consensus) }}>{r.consensus}</div>
                      <div className="text-[8px] text-muted">{(r.confidence * 100).toFixed(0)}%</div>
                      <div className="text-[8px] text-up">{r.bull_count}↑</div>
                      <div className="text-[8px] text-down">{r.bear_count}↓</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-[10px] font-semibold text-up mb-1">BULL ARGUMENTS</div>
                {(result.bull_arguments || result.final_bull_arguments || []).map((a: any, i: number) => (
                  <div key={i} className="bg-card px-2 py-1.5 rounded mb-1" style={{ border: '1px solid rgba(34,197,94,0.3)' }}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] font-semibold text-up">{a.agent.toUpperCase()}</span>
                      <span className="text-[9px] text-muted">{(a.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[9px] text-primary">{a.thesis}</div>
                    {a.evidence && <div className="text-[8px] text-muted mt-0.5">📊 {a.evidence.join(' | ')}</div>}
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-semibold text-down mb-1">BEAR ARGUMENTS</div>
                {(result.bear_arguments || result.final_bear_arguments || []).map((a: any, i: number) => (
                  <div key={i} className="bg-card px-2 py-1.5 rounded mb-1" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] font-semibold text-down">{a.agent.toUpperCase()}</span>
                      <span className="text-[9px] text-muted">{(a.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-[9px] text-primary">{a.thesis}</div>
                    {a.evidence && <div className="text-[8px] text-muted mt-0.5">📊 {a.evidence.join(' | ')}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="flex items-center justify-center h-full text-muted text-[10px]">
            Enter a symbol and run a debate between bull and bear agents
          </div>
        )}
      </div>
    </div>
  )
}
