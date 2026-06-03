import { useState } from 'react'
import Card from '../components/ui/Card'
import { analyzeFactor, computeFactorDecay, api } from '../api/client'
import type { FactorAnalysisResult, FactorDecayItem } from '../api/types'
import FactorAnalysisCharts from '../components/FactorAnalysisCharts'
import { useToastStore } from '../store/toast'

const inputStyle = 'bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm text-primary outline-none w-full'

const FONT_DATA = 'font-mono-data text-sm'

function FactorReturnsChart({ factorReturns }: { factorReturns?: Record<string, number> }) {
  if (!factorReturns) return <div className="text-[10px] text-muted">No factor return data</div>
  const entries = Object.entries(factorReturns)
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 0.01)
  return (
    <svg viewBox="0 0 300 160" className="w-full h-full">
      {entries.map(([name, val], i) => {
        const x = 30 + i * (240 / entries.length)
        const barW = Math.max(8, 240 / entries.length - 4)
        const h = (val / maxVal) * 100
        return (
          <g key={name}>
            <rect x={x} y={130 - (h > 0 ? h : 0)} width={barW} height={Math.abs(h)} fill={val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} rx={2} />
            <text x={x + barW / 2} y={148} textAnchor="middle" fill="var(--text-muted)" fontSize="6">{name.slice(0, 4)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function IcSeriesChart({ icSeries }: { icSeries?: Record<string, unknown>[] }) {
  if (!icSeries || icSeries.length === 0) return <div className="text-[10px] text-muted">No IC series data</div>
  const points = icSeries.map((item, i) => {
    const ic = (item.ic ?? item.value ?? item.mean_ic ?? 0) as number
    const period = (item.period ?? item.date ?? item.t ?? i) as number
    return { period, ic }
  })
  const w = 280, h = 130
  const maxAbs = Math.max(...points.map(p => Math.abs(p.ic)), 0.01)
  const scale = 50 / maxAbs
  const mapped = points.map((p, i) => ({ x: 10 + (i / (points.length - 1 || 1)) * (w - 20), y: 65 - p.ic * scale }))
  const polyline = mapped.map(p => `${p.x},${p.y}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <line x1={10} y1={65} x2={w - 10} y2={65} stroke="var(--border-color)" strokeWidth="0.5" />
      {mapped.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={points[i].ic >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
      ))}
      <polyline points={polyline} fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" />
    </svg>
  )
}

function DecayChart({ decay }: { decay: FactorDecayItem[] }) {
  if (!decay.length) return <div className="text-[10px] text-muted">No decay data</div>
  const maxVal = Math.max(...decay.map(d => Math.abs(d.mean_ic)), 0.01)
  return (
    <svg viewBox="0 0 300 160" className="w-full h-full">
      {decay.map((d, i) => {
        const x = 30 + i * (240 / decay.length)
        const barW = Math.max(8, 240 / decay.length - 4)
        const h = (d.mean_ic / maxVal) * 100
        return (
          <g key={i}>
            <rect x={x} y={130 - (h > 0 ? h : 0)} width={barW} height={Math.abs(h)} fill={d.mean_ic >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} rx={2} />
            <text x={x + barW / 2} y={148} textAnchor="middle" fill="var(--text-muted)" fontSize="7">{d.period}</text>
          </g>
        )
      })}
    </svg>
  )
}

function QuintileSpreadChart({ quantileReturns }: { quantileReturns?: Record<string, unknown>[] }) {
  if (!quantileReturns || quantileReturns.length === 0) return <div className="text-[10px] text-muted">No quantile data</div>
  const entries = quantileReturns.map((r, i) => {
    const vals = Object.values(r)
    return { label: `Q${i + 1}`, val: typeof vals[vals.length - 1] === 'number' ? vals[vals.length - 1] as number : 0 }
  })
  const maxVal = Math.max(...entries.map(e => Math.abs(e.val)), 0.01)
  return (
    <svg viewBox="0 0 300 160" className="w-full h-full">
      {entries.map((e, i) => {
        const x = 30 + i * (240 / entries.length)
        const barW = Math.max(8, 240 / entries.length - 4)
        const h = (e.val / maxVal) * 100
        return (
          <g key={i}>
            <rect x={x} y={130 - (h > 0 ? h : 0)} width={barW} height={Math.abs(h)} fill={e.val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} rx={2} />
            <text x={x + barW / 2} y={148} textAnchor="middle" fill="var(--text-muted)" fontSize="7">{e.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function FactorAnalysisPage() {
  const [symbolInput, setSymbolInput] = useState('AAPL,MSFT')
  const [priceInput, setPriceInput] = useState('')
  const [factorInput, setFactorInput] = useState('')
  const [timestamps, setTimestamps] = useState('')
  const [periods, setPeriods] = useState('1,5,21')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FactorAnalysisResult | null>(null)
  const [decay, setDecay] = useState<FactorDecayItem[]>([])

  const [factorA, setFactorA] = useState('')
  const [factorB, setFactorB] = useState('')
  const [targetReturns, setTargetReturns] = useState('')
  const [regResult, setRegResult] = useState<any>(null)
  const [regLoading, setRegLoading] = useState(false)

  const [factorIds, setFactorIds] = useState('')
  const [corrMatrix, setCorrMatrix] = useState<any>(null)
  const [corrLoading, setCorrLoading] = useState(false)

  const addToast = useToastStore((s) => s.addToast)

  const symbols = symbolInput.split(',').map(s => s.trim()).filter(Boolean)

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setDecay([])
    try {
      const prices = priceInput.split(',').map(Number).filter(n => !isNaN(n))
      const factorValues = factorInput.split(',').map(Number).filter(n => !isNaN(n))
      const ts = timestamps.split(',').map(s => s.trim()).filter(Boolean)
      if (prices.length === 0 || factorValues.length === 0) throw new Error('Fill in price and factor data')
      if (ts.length === 0) throw new Error('Enter timestamps')
      const res = await analyzeFactor(prices, factorValues, ts, symbols, periods)
      setResult(res)
      try {
        const d = await computeFactorDecay(prices, factorValues, ts, symbols)
        setDecay(d.decay)
      } catch { /* decay optional */ }
    } catch (e: unknown) {
      setError((e as Error).message || 'Analysis failed')
    }
    setLoading(false)
  }

  const runRegression = async () => {
    setRegLoading(true)
    setRegResult(null)
    try {
      const r = await api.post('/factor/regression', {
        factor_a: factorA.split(',').map(Number).filter(n => !isNaN(n)),
        factor_b: factorB.split(',').map(Number).filter(n => !isNaN(n)),
        target: targetReturns.split(',').map(Number).filter(n => !isNaN(n)),
      })
      setRegResult(r.data)
    } catch (e: any) {
      addToast(e.message || 'Regression failed', 'error')
    }
    setRegLoading(false)
  }

  const computeCorrelation = async () => {
    setCorrLoading(true)
    setCorrMatrix(null)
    try {
      const ids = factorIds.split(',').map(s => s.trim()).filter(Boolean)
      const r = await api.post('/factor/correlation', { factor_ids: ids })
      setCorrMatrix(r.data)
    } catch (e: any) {
      addToast(e.message || 'Correlation computation failed', 'error')
    }
    setCorrLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary">
        Factor Analysis
      </h1>
      <p className="text-sm text-muted">
        Evaluate alpha factors using Information Coefficient (IC), quantile returns, and decay analysis &mdash; powered by alphalens.
      </p>

      <Card title="Parameters">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-secondary mb-0.5">Symbols</label>
            <input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())} className={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-0.5">Periods</label>
            <input value={periods} onChange={(e) => setPeriods(e.target.value)} className={inputStyle} />
          </div>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-secondary mb-0.5">Timestamps (comma-separated ISO dates)</label>
          <input value={timestamps} onChange={(e) => setTimestamps(e.target.value)} className={inputStyle} placeholder="2024-01-01,2024-01-02,..." />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="block text-xs text-secondary mb-0.5">Prices (comma-separated, all symbols)</label>
            <textarea value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className={`${inputStyle} font-mono-data min-h-[60px]`} />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-0.5">Factor Values (comma-separated)</label>
            <textarea value={factorInput} onChange={(e) => setFactorInput(e.target.value)} className={`${inputStyle} font-mono-data min-h-[60px]`} />
          </div>
        </div>
        <button onClick={run} disabled={loading} className="mt-2 px-5 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none" style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Running...' : 'Analyze Factor'}
        </button>
      </Card>

      {result && (
        <div className="grid grid-cols-2 gap-3">
          <Card title="FACTOR RETURNS">
            <FactorReturnsChart factorReturns={(result as any).factor_returns} />
          </Card>
          <Card title="IC OVER TIME">
            <IcSeriesChart icSeries={(result as any).ic_series} />
          </Card>
          <Card title="IC DECAY">
            {decay.length > 0 ? <DecayChart decay={decay} /> : (
              <div className="text-[10px] text-muted">No decay data</div>
            )}
          </Card>
          <Card title="TOP/BOTTOM QUINTILE SPREAD">
            <QuintileSpreadChart quantileReturns={result.quantile_returns ?? undefined} />
          </Card>
        </div>
      )}

      <FactorAnalysisCharts result={result} decay={decay} />

      {error && (
        <div style={{ background: 'var(--accent-red)10', border: '1px solid var(--accent-red)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <Card title="IC Statistics">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted">Mean IC</div>
                <div className={FONT_DATA} style={{ color: result.mean_ic > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {result.mean_ic.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">IC Std Dev</div>
                <div className={FONT_DATA}>{result.ic_std.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-muted">IC IR</div>
                <div className={FONT_DATA} style={{ color: result.ic_ir > 0.5 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {result.ic_ir.toFixed(4)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Spread Return</div>
                <div className={FONT_DATA} style={{ color: (result.spread_return ?? 0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {result.spread_return?.toFixed(4) ?? 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          {decay.length > 0 && (
            <Card title="IC Decay">
              <div className="bg-[var(--bg-hover)] rounded-md p-4 overflow-auto">
                <table className="w-full font-mono-data text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="text-left px-2 py-1">Period (days)</th>
                      <th className="text-right px-2 py-1">Mean IC</th>
                      <th className="text-right px-2 py-1">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decay.map((d, i) => (
                      <tr key={i} className="border-t border-default">
                        <td className="px-2 py-1">{d.period}</td>
                        <td className="px-2 py-1 text-right" style={{ color: d.mean_ic > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {d.mean_ic.toFixed(4)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {d.mean_ic > 0.02 ? 'Strong' : d.mean_ic > 0 ? 'Weak' : d.mean_ic > -0.02 ? 'Noise' : 'Anti-signal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {result.quantile_returns && result.quantile_returns.length > 0 && (
            <Card title="Quantile Returns">
              <div className="bg-[var(--bg-hover)] rounded-md p-4 overflow-auto max-h-[300px]">
                <table className="w-full font-mono-data text-sm">
                  <thead>
                    <tr className="text-muted">
                      {Object.keys(result.quantile_returns[0]).map((k) => (
                        <th key={k} className="text-left px-2 py-1">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.quantile_returns.map((row, i) => (
                      <tr key={i} className="border-t border-default">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-2 py-1">
                            {typeof v === 'number' ? v.toFixed(4) : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <Card title="MULTI-FACTOR REGRESSION">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-muted mb-0.5">Factor A Values</label>
            <input value={factorA} onChange={(e) => setFactorA(e.target.value)} className={inputStyle} placeholder="comma-separated" />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-0.5">Factor B Values</label>
            <input value={factorB} onChange={(e) => setFactorB(e.target.value)} className={inputStyle} placeholder="comma-separated" />
          </div>
          <div>
            <label className="block text-[10px] text-muted mb-0.5">Target Returns</label>
            <input value={targetReturns} onChange={(e) => setTargetReturns(e.target.value)} className={inputStyle} placeholder="comma-separated" />
          </div>
        </div>
        <button onClick={runRegression} disabled={regLoading}
          className="mt-2 px-4 py-1.5 rounded-md text-[11px] font-medium bg-[var(--accent-blue)] text-white border-none"
          style={{ opacity: regLoading ? 0.6 : 1 }}>
          {regLoading ? 'Running...' : 'Run Regression'}
        </button>
        {regResult && (
          <div className="mt-2 bg-[var(--bg-hover)] rounded-md p-3 grid grid-cols-3 gap-3 font-mono-data text-[11px]">
            <div>
              <div className="text-[9px] text-muted">Coefficient A</div>
              <div className="text-primary font-bold">{(regResult.coefficient_a ?? regResult.coeff_a ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">Coefficient B</div>
              <div className="text-primary font-bold">{(regResult.coefficient_b ?? regResult.coeff_b ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">R²</div>
              <div className="text-primary font-bold">{(regResult.r_squared ?? regResult.r2 ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">P-value A</div>
              <div className="text-primary font-bold">{(regResult.p_value_a ?? regResult.p_a ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">P-value B</div>
              <div className="text-primary font-bold">{(regResult.p_value_b ?? regResult.p_b ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] text-muted">F-stat</div>
              <div className="text-primary font-bold">{(regResult.f_stat ?? regResult.f_statistic ?? 0).toFixed(4)}</div>
            </div>
          </div>
        )}
      </Card>

      <Card title="CORRELATION MATRIX">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-muted mb-0.5">Load Factors (comma-separated IDs)</label>
            <input value={factorIds} onChange={(e) => setFactorIds(e.target.value)} className={inputStyle} placeholder="momentum,value,size,volatility" />
          </div>
          <button onClick={computeCorrelation} disabled={corrLoading}
            className="px-4 py-1.5 rounded-md text-[11px] font-medium bg-[var(--accent-blue)] text-white border-none"
            style={{ opacity: corrLoading ? 0.6 : 1 }}>
            {corrLoading ? 'Computing...' : 'Compute'}
          </button>
        </div>
        {corrMatrix && (
          <div className="mt-2 overflow-auto">
            <table className="font-mono-data text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="px-1.5 py-1 text-muted"></th>
                  {(corrMatrix.factors ?? corrMatrix.factor_ids ?? Object.keys(corrMatrix.matrix ?? {})).map((f: string) => (
                    <th key={f} className="px-1.5 py-1 text-muted font-normal">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(corrMatrix.factors ?? corrMatrix.factor_ids ?? Object.keys(corrMatrix.matrix ?? {})).map((f: string, i: number) => (
                  <tr key={f}>
                    <td className="px-1.5 py-1 text-muted font-semibold">{f}</td>
                    {(corrMatrix.factors ?? corrMatrix.factor_ids ?? Object.keys(corrMatrix.matrix ?? {})).map((g: string, j: number) => {
                      const val = corrMatrix.matrix?.[f]?.[g] ?? corrMatrix.correlation?.[i]?.[j] ?? (i === j ? 1 : 0)
                      const bg = val === 0 ? 'var(--bg-card)' : val > 0 ? `rgba(34,197,94,${val.toFixed(2)})` : `rgba(239,68,68,${Math.abs(val).toFixed(2)})`
                      return (
                        <td key={g} className="px-1.5 py-1 text-center" style={{ background: bg, color: Math.abs(val) > 0.5 ? 'white' : 'var(--text-primary)' }}>
                          {val.toFixed(2)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
