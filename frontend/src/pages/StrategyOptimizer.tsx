import { useState } from 'react'
import { api } from '../api/client'

type Tab = 'tune' | 'optimize' | 'regime'

export default function StrategyOptimizer() {
  const [tab, setTab] = useState<Tab>('tune')
  const [symbol, setSymbol] = useState('AAPL')
  const [method, setMethod] = useState('grid')
  const [maxVariants, setMaxVariants] = useState(50)
  const [maxRounds, setMaxRounds] = useState(3)
  const [candidatesPerRound, setCandidatesPerRound] = useState(5)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [paramSpec, setParamSpec] = useState<Record<string, { min: number; max: number; step: number }>>({
    fast_ma: { min: 10, max: 100, step: 5 },
    slow_ma: { min: 30, max: 200, step: 10 },
  })
  const [paramSpecStr, setParamSpecStr] = useState(() => JSON.stringify(paramSpec, null, 2))

  const addParam = () => {
    const name = prompt('Parameter name (e.g., rsi_period):')
    if (!name) return
    const next = { ...paramSpec, [name]: { min: 10, max: 50, step: 5 } }
    setParamSpec(next)
    setParamSpecStr(JSON.stringify(next, null, 2))
  }
  const removeParam = (name: string) => {
    const next = { ...paramSpec }
    delete next[name]
    setParamSpec(next)
    setParamSpecStr(JSON.stringify(next, null, 2))
  }

  const runTune = async () => {
    setLoading(true)
    setResult(null)
    try {
      const r = await api.post('/experiments/structured-tune', {
        symbol, method, max_variants: maxVariants,
        parameter_space: paramSpec,
      })
      setResult(r.data)
    } catch (e: any) {
      setResult({ status: 'error', error: e.message })
    }
    setLoading(false)
  }

  const runOptimize = async () => {
    setLoading(true)
    setResult(null)
    try {
      const r = await api.post('/experiments/ai-optimize', {
        symbol, method, max_variants: maxVariants,
        parameter_space: paramSpec,
        max_rounds: maxRounds,
        candidates_per_round: candidatesPerRound,
      })
      setResult(r.data)
    } catch (e: any) {
      setResult({ status: 'error', error: e.message })
    }
    setLoading(false)
  }

  const detectRegime = async () => {
    setLoading(true)
    setResult(null)
    try {
      const r = await api.post('/experiments/regime?symbol=' + symbol)
      setResult(r.data)
    } catch (e: any) {
      setResult({ status: 'error', error: e.message })
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary" style={{ background: 'var(--bg-app)' }}>
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <span className="font-bold text-sm">STRATEGY OPTIMIZER</span>
        <span className="text-muted">|</span>
        <button onClick={() => setTab('tune')} className={`px-2 py-0.5 border-none cursor-pointer ${tab === 'tune' ? 'text-accent-blue' : 'text-muted'}`} style={{ background: tab === 'tune' ? 'rgba(59,130,246,0.15)' : 'none' }}>STRUCTURED TUNE</button>
        <button onClick={() => setTab('optimize')} className={`px-2 py-0.5 border-none cursor-pointer ${tab === 'optimize' ? 'text-accent-blue' : 'text-muted'}`} style={{ background: tab === 'optimize' ? 'rgba(59,130,246,0.15)' : 'none' }}>AI OPTIMIZE</button>
        <button onClick={() => setTab('regime')} className={`px-2 py-0.5 border-none cursor-pointer ${tab === 'regime' ? 'text-accent-blue' : 'text-muted'}`} style={{ background: tab === 'regime' ? 'rgba(59,130,246,0.15)' : 'none' }}>REGIME</button>
      </div>

      <div className="p-3 flex gap-2 items-center border-b border-default">
        <span className="text-[9px] text-muted">SYMBOL:</span>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-card border border-default text-primary px-2 py-1 text-[11px] font-mono-data w-[100px]" />
        {tab === 'tune' && (
          <>
            <span className="text-[9px] text-muted ml-2">METHOD:</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px]">
              <option value="grid">Grid</option>
              <option value="random">Random</option>
              <option value="de">Differential Evolution</option>
              <option value="tpe">TPE</option>
            </select>
            <span className="text-[9px] text-muted ml-2">VARIANTS:</span>
            <input type="number" value={maxVariants} onChange={(e) => setMaxVariants(Number(e.target.value))}
              className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px] w-[60px]" />
            <button onClick={runTune} disabled={loading} className="border-none text-white cursor-pointer px-3.5 py-1 text-[10px] ml-2 bg-blue-500" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'RUNNING...' : 'TUNE'}
            </button>
          </>
        )}
        {tab === 'optimize' && (
          <>
            <span className="text-[9px] text-muted ml-2">ROUNDS:</span>
            <input type="number" value={maxRounds} onChange={(e) => setMaxRounds(Number(e.target.value))}
              className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px] w-[50px]" />
            <span className="text-[9px] text-muted ml-2">PER ROUND:</span>
            <input type="number" value={candidatesPerRound} onChange={(e) => setCandidatesPerRound(Number(e.target.value))}
              className="bg-card border border-default text-primary px-1.5 py-0.5 text-[10px] w-[50px]" />
            <button onClick={runOptimize} disabled={loading} className="border-none text-white cursor-pointer px-3.5 py-1 text-[10px] ml-2 bg-blue-500" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'RUNNING...' : 'AI OPTIMIZE'}
            </button>
          </>
        )}
        {tab === 'regime' && (
          <button onClick={detectRegime} disabled={loading} className="border-none text-white cursor-pointer px-3.5 py-1 text-[10px] bg-blue-500" style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'DETECTING...' : 'DETECT REGIME'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        {(tab === 'tune' || tab === 'optimize') && (
          <div className="mb-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[9px] text-muted">Parameters:</span>
              <button onClick={addParam} className="border border-default bg-card text-primary px-1.5 py-0.5 text-[9px] cursor-pointer rounded-sm">+ Add</button>
            </div>
            <div className="flex flex-wrap gap-1 mb-1">
              {Object.entries(paramSpec).map(([name, spec]) => (
                <div key={name} className="bg-card border border-default px-2 py-0.5 rounded flex items-center gap-1 text-[10px]">
                  <span className="text-accent-cyan">{name}</span>
                  <span className="text-muted">[{spec.min}–{spec.max} / step {spec.step}]</span>
                  <button onClick={() => removeParam(name)} className="border-none text-down cursor-pointer text-[9px] ml-0.5">&times;</button>
                </div>
              ))}
            </div>
            <details>
              <summary className="text-[9px] text-muted cursor-pointer select-none">JSON Editor</summary>
              <textarea value={paramSpecStr} onChange={(e) => {
                setParamSpecStr(e.target.value)
                try { setParamSpec(JSON.parse(e.target.value)) } catch {}
              }}
                className="w-full bg-card border border-default text-primary px-2 py-1 text-[10px] font-mono mt-1"
                rows={4} />
            </details>
          </div>
        )}
        {result?.status === 'error' && <div className="text-down text-[10px]">Error: {result.error}</div>}

        {result?.regime && tab === 'regime' && (
          <div>
            <div className="flex gap-2 mb-3">
              <div className="bg-card border border-default px-3.5 py-2.5 rounded">
                <div className="text-[9px] text-muted">REGIME</div>
                <div className="text-base font-bold text-accent-blue">{result.label}</div>
              </div>
              <div className="bg-card border border-default px-3.5 py-2.5 rounded">
                <div className="text-[9px] text-muted">CONFIDENCE</div>
                <div className="text-base font-bold">{(result.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-muted mb-1">STRATEGY FAMILIES</div>
            <div className="flex gap-1 flex-wrap">
              {result.strategy_families?.map((f: string) => (
                <span key={f} className="bg-blue-500/10 text-accent-blue px-2 py-0.5 rounded text-[9px]">{f}</span>
              ))}
            </div>
          </div>
        )}

        {(tab === 'tune' || tab === 'optimize') && result?.ranking && (
          <div>
            {result.regime && (
              <div className="flex gap-2 mb-3">
                <div className="bg-card border border-default px-2.5 py-1.5 rounded">
                  <div className="text-[9px] text-muted">REGIME</div>
                  <div className="text-xs font-semibold text-accent-blue">{result.regime.label}</div>
                </div>
                {result.best && (
                  <div className="bg-card border border-default px-2.5 py-1.5 rounded">
                    <div className="text-[9px] text-muted">BEST SCORE</div>
                    <div className="text-base font-bold text-up">{result.best.score.overall?.toFixed(1)}</div>
                  </div>
                )}
                <div className="bg-card border border-default px-2.5 py-1.5 rounded">
                  <div className="text-[9px] text-muted">TESTED</div>
                  <div className="text-xs font-semibold">{result.n_candidates_tested || result.n_variants_tested}</div>
                </div>
                <div className="bg-card border border-default px-2.5 py-1.5 rounded">
                  <div className="text-[9px] text-muted">WALL TIME</div>
                  <div className="text-xs font-semibold">{result.wall_seconds}s</div>
                </div>
              </div>
            )}

            <div className="text-[10px] font-semibold text-muted mb-1">RANKING</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-muted text-[9px] text-left border-b border-default">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Score</th>
                  <th className="px-2 py-1">Grade</th>
                  <th className="px-2 py-1">Total Return</th>
                  <th className="px-2 py-1">Sharpe</th>
                  <th className="px-2 py-1">Win Rate</th>
                  <th className="px-2 py-1">Max DD</th>
                  <th className="px-2 py-1">Trades</th>
                  <th className="px-2 py-1">Params</th>
                </tr>
              </thead>
              <tbody>
                {result.ranking.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-[rgba(26,35,50,0.3)]" style={{ background: i === 0 ? 'rgba(34,197,94,0.05)' : 'none' }}>
                    <td className="px-2 py-0.5 font-semibold">{i + 1}</td>
                    <td className="px-2 py-0.5 font-semibold" style={{ color: r.score.overall >= 80 ? 'var(--accent-green)' : r.score.overall >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{r.score.overall?.toFixed(1)}</td>
                    <td className="px-2 py-0.5">{r.score.letter}</td>
                    <td className="px-2 py-0.5" style={{ color: r.metrics.total_return > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{r.metrics.total_return?.toFixed(1)}%</td>
                    <td className="px-2 py-0.5">{r.metrics.sharpe_ratio?.toFixed(2)}</td>
                    <td className="px-2 py-0.5">{r.metrics.win_rate?.toFixed(0)}%</td>
                    <td className="px-2 py-0.5 text-down">{r.metrics.max_drawdown?.toFixed(1)}%</td>
                    <td className="px-2 py-0.5">{r.metrics.total_trades}</td>
                    <td className="px-2 py-0.5 text-[9px] text-muted max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {JSON.stringify(r.params)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!result && !loading && (
          <div className="flex items-center justify-center h-full text-muted text-[10px]">
            {tab === 'tune' ? 'Configure parameters and run a structured tune' : tab === 'optimize' ? 'Run multi-round AI optimization' : 'Detect market regime for a symbol'}
          </div>
        )}
      </div>
    </div>
  )
}
