import { useState } from 'react'
import Card from '../components/ui/Card'
import { optimizePortfolio, computeEfficientFrontier, computeHrp } from '../api/client'
import type { PortfolioOptResult, EfficientFrontierPoint } from '../api/types'

const inputStyle = 'bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm text-primary outline-none w-full'

const FONT_DATA = 'font-mono-data text-sm'

export default function PortfolioOptimization() {
  const [symbolInput, setSymbolInput] = useState('AAPL,MSFT,GOOGL')
  const [priceInput, setPriceInput] = useState('')
  const [model, setModel] = useState('mean-risk')
  const [riskMeasure, setRiskMeasure] = useState('CVaR')
  const [result, setResult] = useState<PortfolioOptResult | null>(null)
  const [frontier, setFrontier] = useState<EfficientFrontierPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const symbols = symbolInput.split(',').map(s => s.trim()).filter(Boolean)

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setFrontier([])
    try {
      const prices = priceInput.split(',').map(Number).filter(n => !isNaN(n))
      if (prices.length === 0) { throw new Error('Enter price data (comma-separated)') }
      if (prices.length % symbols.length !== 0) { throw new Error('Price count must be divisible by symbol count') }
      const opt = await optimizePortfolio(prices, symbols, model, riskMeasure)
      setResult(opt)
      try {
        const ef = await computeEfficientFrontier(prices, symbols)
        setFrontier(ef.frontier)
      } catch { /* frontier optional */ }
    } catch (e: unknown) {
      setError((e as Error).message || 'Optimization failed')
    }
    setLoading(false)
  }

  const runHrp = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const prices = priceInput.split(',').map(Number).filter(n => !isNaN(n))
      const hrp = await computeHrp(prices, symbols)
      setResult({ weights: hrp.weights, stats: { expected_return: 0, expected_risk: 0, sharpe_ratio: 0, n_assets: symbols.length }, model: 'hrp', risk_measure: '' })
    } catch (e: unknown) {
      setError((e as Error).message || 'HRP failed')
    }
    setLoading(false)
  }

  const totalWeight = result ? Object.values(result.weights).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary">
        Portfolio Optimization
      </h1>
      <p className="text-sm text-muted">
        Modern portfolio optimization with CVaR, HRP, Black-Litterman &mdash; powered by skfolio.
      </p>

      <Card title="Parameters">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-secondary mb-0.5">Symbols (comma-separated)</label>
            <input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())} className={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-0.5">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className={inputStyle}>
              <option value="mean-risk">Mean-Risk</option>
              <option value="hrp">Hierarchical Risk Parity</option>
            </select>
          </div>
          {model === 'mean-risk' && (
            <div>
              <label className="block text-xs text-secondary mb-0.5">Risk Measure</label>
              <select value={riskMeasure} onChange={(e) => setRiskMeasure(e.target.value)} className={inputStyle}>
                <option value="CVaR">CVaR</option>
                <option value="Variance">Variance</option>
                <option value="StandardDeviation">Std Dev</option>
                <option value="MaxDrawdown">Max Drawdown</option>
              </select>
            </div>
          )}
        </div>
        <div className="mt-2">
          <label className="block text-xs text-secondary mb-0.5">Prices (comma-separated, one series per symbol)</label>
          <textarea
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className={`${inputStyle} font-mono-data min-h-[60px]`}
            placeholder="100,101,102,103, ... (all symbols concatenated)"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={run} disabled={loading} className="px-5 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none" style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Running...' : 'Optimize'}
          </button>
          <button onClick={runHrp} disabled={loading} className="px-5 py-2 rounded-md text-sm font-medium bg-[var(--accent-green)] text-white border-none" style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            HRP
          </button>
        </div>
      </Card>

      {error && (
        <div style={{ background: 'var(--accent-red)10', border: '1px solid var(--accent-red)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          <Card title="Portfolio Statistics">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted">Expected Return</div>
                <div className={FONT_DATA} style={{ color: result.stats.expected_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {result.stats.expected_return.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Expected Risk</div>
                <div className={FONT_DATA}>{result.stats.expected_risk.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted">Sharpe Ratio</div>
                <div className={FONT_DATA} style={{ color: result.stats.sharpe_ratio >= 1 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                  {result.stats.sharpe_ratio.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Model</div>
                <div className={FONT_DATA}>{result.model}</div>
              </div>
            </div>
          </Card>

          <Card title="Optimal Weights">
            <div className="space-y-2">
              {Object.entries(result.weights).map(([sym, w]) => (
                <div key={sym}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-secondary">{sym}</span>
                    <span className={FONT_DATA}>{(w * 100).toFixed(1)}%</span>
                  </div>
                  <div className="bg-[var(--bg-hover)] rounded-sm h-2 overflow-hidden">
                    <div className="h-full rounded-sm" style={{
                      width: `${(w / totalWeight) * 100}%`,
                      background: w > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {frontier.length > 0 && (
        <Card title="Efficient Frontier">
          <div className="text-xs text-muted mb-2">
            {frontier.length} portfolio points on the efficient frontier
          </div>
          <div className="bg-[var(--bg-hover)] rounded-md p-4 overflow-auto max-h-[300px]">
            <table className="w-full font-mono-data text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="text-left px-2 py-1">#</th>
                  <th className="text-right px-2 py-1">Return</th>
                  <th className="text-right px-2 py-1">Risk</th>
                  <th className="text-right px-2 py-1">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {frontier.map((pt, i) => (
                  <tr key={i} className="border-t border-default">
                    <td className="px-2 py-1 text-secondary">{i + 1}</td>
                    <td className="px-2 py-1 text-right" style={{ color: pt.return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {(pt.return * 100).toFixed(2)}%
                    </td>
                    <td className="px-2 py-1 text-right">{(pt.risk * 100).toFixed(2)}%</td>
                    <td className="px-2 py-1 text-right">
                      {pt.risk > 0 ? (pt.return / pt.risk).toFixed(3) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
