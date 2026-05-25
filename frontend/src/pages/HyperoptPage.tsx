import { useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { runHyperoptOptimize, runHyperoptFull, fetchHyperoptSpace } from '../api/hyperopt'
import type { HyperoptResult, FullOptimizeResult } from '../api/hyperopt'
import { useToastStore } from '../store/toast'

type Tab = 'standard' | 'full'

export default function HyperoptPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<Tab>('standard')
  const [symbol, setSymbol] = useState('AAPL')
  const [nTrials, setNTrials] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HyperoptResult | FullOptimizeResult | null>(null)

  const runStandard = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await runHyperoptOptimize(symbol, nTrials)
      setResult(res)
    } catch (err) {
      addToast('Hyperopt optimization failed', 'error')
    }
    setLoading(false)
  }

  const runFull = async () => {
    setLoading(true)
    setResult(null)
    try {
      const space = await fetchHyperoptSpace()
      const res = await runHyperoptFull(symbol, nTrials, space.search_space)
      setResult(res)
    } catch (err) {
      addToast('Full hyperopt failed', 'error')
    }
    setLoading(false)
  }

  const isFull = (r: unknown): r is FullOptimizeResult =>
    r !== null && typeof r === 'object' && 'best_composite' in r

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-card border border-default px-2 py-1">
        <div className="flex items-center gap-2">
          <Badge label="HYPEROPT" variant="info" />
          {(['standard', 'full'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(null) }}
              className="border-none font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
              style={{
                background: tab === t ? 'rgba(59,130,246,0.15)' : 'none',
                color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}
            >
              {t === 'standard' ? 'STANDARD' : 'MULTI-TIMEFRAME'}
            </button>
          ))}
        </div>
      </div>

      <Card title="CONFIG" padding="compact">
        <div className="grid grid-cols-3 gap-1">
          <div>
            <div className="text-[9px] font-mono-data tracking-wider text-muted">SYMBOL</div>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="bg-[var(--input-bg)] border border-[var(--input-border)] text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" />
          </div>
          <div>
            <div className="text-[9px] font-mono-data tracking-wider text-muted">TRIALS</div>
            <input type="number" min={10} max={500} value={nTrials} onChange={(e) => setNTrials(Number(e.target.value))} className="bg-[var(--input-bg)] border border-[var(--input-border)] text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" />
          </div>
          <div className="flex items-end">
            <button
              onClick={tab === 'standard' ? runStandard : runFull}
              disabled={loading}
              className="w-full bg-[var(--accent-blue)] text-white border-none py-1 font-mono-data text-[10px] font-semibold"
              style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'RUNNING...' : 'OPTIMIZE'}
            </button>
          </div>
        </div>
      </Card>

      {result && (
        <Card title="RESULTS">
          {isFull(result) ? (
            <div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">BEST COMPOSITE</div>
                  <div className="font-mono-data text-[11px] font-bold text-up">
                    {result.best_composite.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">TRIALS</div>
                  <div className="font-mono-data text-[11px] font-semibold text-primary">
                    {result.n_trials}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">SYMBOL</div>
                  <div className="font-mono-data text-[11px] font-semibold text-accent-cyan">
                    {result.symbol}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[9px] font-mono-data tracking-wider text-muted mb-1">BEST PARAMS</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(result.best_params).map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-[var(--bg-hover)] px-2 py-0.5 font-mono-data text-[10px] text-secondary"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    >
                      {k}: <span className="text-accent-cyan">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">BEST SHARPE</div>
                  <div className="font-mono-data text-[11px] font-bold text-up">
                    {result.best_sharpe.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">TRIALS</div>
                  <div className="font-mono-data text-[11px] font-semibold text-primary">
                    {result.n_trials}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono-data tracking-wider text-muted">SYMBOL</div>
                  <div className="font-mono-data text-[11px] font-semibold text-accent-cyan">
                    {result.symbol}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[9px] font-mono-data tracking-wider text-muted mb-1">BEST PARAMS</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(result.best_params).map(([k, v]) => (
                    <div
                      key={k}
                      className="bg-[var(--bg-hover)] px-2 py-0.5 font-mono-data text-[10px] text-secondary"
                      style={{ borderRadius: 'var(--radius-sm)' }}
                    >
                      {k}: <span className="text-accent-cyan">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {!result && !loading && (
        <div className="p-6 text-center font-mono-data text-[10px] text-muted">
          Configure and run hyperparameter optimization
        </div>
      )}
    </div>
  )
}
