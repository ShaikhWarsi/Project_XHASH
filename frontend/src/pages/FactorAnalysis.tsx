import { useState } from 'react'
import Card from '../components/ui/Card'
import { analyzeFactor, computeFactorDecay } from '../api/client'
import type { FactorAnalysisResult, FactorDecayItem } from '../api/types'

const inputStyle = 'bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm text-primary outline-none w-full'

const FONT_DATA = 'font-mono-data text-sm'

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
    </div>
  )
}
