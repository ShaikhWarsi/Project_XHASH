import { useState } from 'react'
import { api } from '../api/client'

type Tab = 'workflow' | 'hyperopt' | 'mtf'

export default function WorkflowLab() {
  const [tab, setTab] = useState<Tab>('workflow')
  const [symbol, setSymbol] = useState('AAPL')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runWorkflow = async () => {
    setLoading(true); setResult(null)
    try { const r = await api.post('/workflows/run', null, { params: { symbol } }); setResult(r.data) }
    catch (e: any) { setResult({ error: e.message }) }
    setLoading(false)
  }

  const runHyperopt = async () => {
    setLoading(true); setResult(null)
    try {
      const r = await api.post('/hyperopt/optimize', { symbol, n_trials: 30 })
      setResult(r.data)
    } catch (e: any) { setResult({ error: e.message }) }
    setLoading(false)
  }

  const runMtf = async () => {
    setLoading(true); setResult(null)
    try {
      const r = await api.post('/hyperopt/full-optimize', { symbol, n_trials: 30 })
      setResult(r.data)
    } catch (e: any) { setResult({ error: e.message }) }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-app">
      <div className="flex items-center gap-2 py-1 px-3 border-b border-default">
        <span className="font-bold text-sm">WORKFLOW LAB</span>
        <span className="text-muted">|</span>
        <button onClick={() => setTab('workflow')}
          className="border-0 cursor-pointer px-2 py-0.5 text-[10px]"
          style={{ background: tab === 'workflow' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'workflow' ? '#3b82f6' : '#5d6b7e' }}>
          LangGraph Workflow
        </button>
        <button onClick={() => setTab('hyperopt')}
          className="border-0 cursor-pointer px-2 py-0.5 text-[10px]"
          style={{ background: tab === 'hyperopt' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'hyperopt' ? '#3b82f6' : '#5d6b7e' }}>
          Hyperopt
        </button>
        <button onClick={() => setTab('mtf')}
          className="border-0 cursor-pointer px-2 py-0.5 text-[10px]"
          style={{ background: tab === 'mtf' ? 'rgba(59,130,246,0.15)' : 'none', color: tab === 'mtf' ? '#3b82f6' : '#5d6b7e' }}>
          Multi-TF Optimize
        </button>
      </div>

      <div className="p-2 flex gap-2 items-center border-b border-default">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        {tab === 'workflow' && (
          <button onClick={runWorkflow} disabled={loading}
            className="bg-violet-500 border-0 text-white cursor-pointer py-1 px-[14px] text-[10px] ml-2 disabled:opacity-60">
            {loading ? 'RUNNING...' : 'RUN WORKFLOW'}
          </button>
        )}
        {tab === 'hyperopt' && (
          <button onClick={runHyperopt} disabled={loading}
            className="bg-amber-500 border-0 text-black cursor-pointer py-1 px-[14px] text-[10px] ml-2 disabled:opacity-60">
            {loading ? 'OPTIMIZING...' : 'HYPEROPT (30 TRIALS)'}
          </button>
        )}
        {tab === 'mtf' && (
          <button onClick={runMtf} disabled={loading}
            className="bg-green-500 border-0 text-black cursor-pointer py-1 px-[14px] text-[10px] ml-2 disabled:opacity-60">
            {loading ? 'OPTIMIZING...' : 'MULTI-TF OPTIMIZE'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {result?.error && <div className="text-red-500 text-[10px]">Error: {result.error}</div>}

        {tab === 'workflow' && result?.steps && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="bg-card py-[10px] px-[14px] rounded"
                style={{ border: `1px solid ${result.consensus === 'bullish' ? '#22c55e' : result.consensus === 'bearish' ? '#ef4444' : '#f59e0b'}` }}>
                <div className="text-[9px] text-muted">CONSENSUS</div>
                <div className="text-lg font-bold"
                  style={{ color: result.consensus === 'bullish' ? '#22c55e' : result.consensus === 'bearish' ? '#ef4444' : '#f59e0b' }}>
                  {result.consensus?.toUpperCase()}
                </div>
                <div className="text-[10px] text-muted">{(result.consensus_confidence * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-card border border-default py-[10px] px-[14px] rounded">
                <div className="text-[9px] text-muted">STATUS</div>
                <div className="text-sm font-bold"
                  style={{ color: result.status === 'completed' ? '#22c55e' : '#f59e0b' }}>
                  {result.status}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-muted mb-1">AGENT STEPS</div>
            {Object.entries(result.steps).map(([name, s]: [string, any]) => (
              <div key={name} className="bg-card border border-default py-1.5 px-2 rounded mb-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-[10px] text-blue-500">{name}</span>
                  <span className="text-[9px] text-muted">{(s.confidence * 100).toFixed(0)}%</span>
                </div>
                {s.reflection && <div className="text-[9px] text-primary mt-0.5">{s.reflection}</div>}
                {s.output && <div className="text-[8px] text-muted mt-0.5">{JSON.stringify(s.output)}</div>}
              </div>
            ))}
          </div>
        )}

        {tab === 'hyperopt' && result?.best_params && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="bg-card border border-green-500 py-[10px] px-[14px] rounded">
                <div className="text-[9px] text-muted">BEST SHARPE</div>
                <div className="text-lg font-bold text-green-500">{result.best_sharpe}</div>
              </div>
              <div className="bg-card border border-default py-[10px] px-[14px] rounded">
                <div className="text-[9px] text-muted">TRIALS</div>
                <div className="text-lg font-bold">{result.n_trials}</div>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-muted mb-1">BEST PARAMS</div>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                {Object.entries(result.best_params).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                    <td className="py-[3px] px-1.5 text-muted">{k}</td>
                    <td className="py-[3px] px-1.5 font-semibold">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'mtf' && result?.timeframe_results && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="bg-card border border-green-500 py-[10px] px-[14px] rounded">
                <div className="text-[9px] text-muted">COMPOSITE</div>
                <div className="text-lg font-bold"
                  style={{ color: result.best_composite > 0 ? '#22c55e' : '#ef4444' }}>
                  {result.best_composite}
                </div>
              </div>
              <div className="bg-card border border-default py-[10px] px-[14px] rounded">
                <div className="text-[9px] text-muted">TRIALS</div>
                <div className="text-lg font-bold">{result.n_trials}</div>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-muted mb-1">TIMEFRAME RESULTS</div>
            <div className="flex gap-2 mb-2">
              {Object.entries(result.timeframe_results).map(([tf, data]: [string, any]) => (
                <div key={tf} className="flex-1 bg-card border border-default py-1.5 px-2 rounded">
                  <div className="text-[9px] text-muted">{tf}</div>
                  <div className="text-xs font-bold"
                    style={{ color: data.sharpe > 0 ? '#22c55e' : '#ef4444' }}>
                    {data.sharpe || 'N/A'}
                  </div>
                  <div className="text-[8px] text-muted">return: {data.return || 0}%</div>
                  <div className="text-[8px] text-muted">trades: {data.trades || 0}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] font-semibold text-muted mb-1">BEST PARAMS</div>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                {Object.entries(result.best_params).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                    <td className="py-[3px] px-1.5 text-muted">{k}</td>
                    <td className="py-[3px] px-1.5 font-semibold">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!result && !loading && (
          <div className="flex items-center justify-center h-full text-muted text-[10px]">
            {tab === 'workflow' ? 'Run a LangGraph agent workflow (bull → bear → risk debater → reflector)' :
             tab === 'hyperopt' ? 'Optimize SMA crossover params with Optuna (30 trials)' :
             'Multi-timeframe Bayesian optimization across 1d, 1wk, 1mo'}
          </div>
        )}
      </div>
    </div>
  )
}
