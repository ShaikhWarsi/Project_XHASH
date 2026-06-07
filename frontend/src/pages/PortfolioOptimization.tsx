import { useState, useEffect, useRef, useMemo } from 'react'
import Card from '../components/ui/Card'
import { optimizePortfolio, computeEfficientFrontier, computeHrp } from '../api/client'
import type { PortfolioOptResult, EfficientFrontierPoint } from '../api/types'

const inputStyle = 'bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-1.5 text-sm text-primary outline-none w-full'

const FONT_DATA = 'font-mono-data text-sm'

function FrontierChart({ frontier, result }: { frontier: EfficientFrontierPoint[]; result: PortfolioOptResult }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || frontier.length === 0) return
    let cancelled = false
    const render = async () => {
      try {
        const mod = await import('plotly.js-dist-min')
        const Plotly = (mod as any).default || mod
        if (cancelled) return
        await Plotly.newPlot(ref.current, [
          {
            x: frontier.map((p) => p.risk * 100),
            y: frontier.map((p) => p.return * 100),
            type: 'scatter', mode: 'lines+markers',
            name: 'Efficient Frontier',
            line: { color: '#3b82f6', width: 2 },
            marker: { color: '#3b82f6', size: 4, opacity: 0.7 },
            hovertemplate: 'Risk: %{x:.2f}%<br>Return: %{y:.2f}%<extra></extra>',
          },
          {
            x: [result.stats.expected_risk],
            y: [result.stats.expected_return],
            type: 'scatter', mode: 'markers',
            name: 'Optimal Portfolio',
            marker: { color: '#22c55e', size: 14, symbol: 'star', line: { color: 'white', width: 1 } },
            hovertemplate: 'Risk: %{x:.2f}%<br>Return: %{y:.2f}%<br>Sharpe: ' + result.stats.sharpe_ratio.toFixed(2) + '<extra></extra>',
          },
        ], {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 50, r: 20, t: 10, b: 40 }, height: 320,
          xaxis: { title: 'Risk (%)', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          yaxis: { title: 'Return (%)', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          legend: { font: { color: '#999', size: 9 }, orientation: 'h', y: 1.08 },
          hovermode: 'closest',
        })
      } catch { /* */ }
    }
    render()
    return () => { cancelled = true; if (ref.current) ref.current.innerHTML = '' }
  }, [frontier, result])

  return <div ref={ref} />
}

function DendrogramChart({ result, prices, symbols }: { result: PortfolioOptResult; prices: number[]; symbols: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const cols = useMemo(() => {
    const n = symbols.length
    if (n <= 1) return symbols
    const rows = Math.floor(prices.length / n) * n
    const returns: number[][] = []
    for (let i = n; i < rows; i += n) {
      const row: number[] = []
      for (let j = 0; j < n; j++) {
        const prev = prices[i - n + j]
        const cur = prices[i + j]
        row.push(prev > 0 ? (cur - prev) / prev : 0)
      }
      returns.push(row)
    }
    const corr: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) { corr[i][j] = 1; continue }
        const ri = returns.map((r) => r[i]), rj = returns.map((r) => r[j])
        const mi = ri.reduce((a, b) => a + b, 0) / ri.length
        const mj = rj.reduce((a, b) => a + b, 0) / rj.length
        const num = ri.reduce((a, b, k) => a + (b - mi) * (rj[k] - mj), 0)
        const di = Math.sqrt(ri.reduce((a, b, k) => a + (b - mi) ** 2, 0))
        const dj = Math.sqrt(rj.reduce((a, b, k) => a + (b - mj) ** 2, 0))
        corr[i][j] = di * dj > 0 ? num / (di * dj) : 0
      }
    }
    return corr
  }, [prices, symbols])

  const linkage = useMemo(() => {
    const n = symbols.length
    if (n <= 1) return []
    const dist: number[][] = cols.map((row, i) => row.map((v, j) => 1 - Math.abs(v)))
    const clusters: { id: number; left: number | null; right: number | null; size: number }[] = []
    const active = new Set(symbols.map((_, i) => i))
    let nextId = n

    while (active.size > 1) {
      let minDist = Infinity, minA = -1, minB = -1
      const arr = Array.from(active)
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const d = dist[arr[i]]?.[arr[j]] ?? Infinity
          if (d < minDist) { minDist = d; minA = arr[i]; minB = arr[j] }
        }
      }
      if (minA === -1) break
      const newCluster = { id: nextId++, left: minA, right: minB, size: 1 }
      clusters.push(newCluster)
      const newIdx = newCluster.id
      active.delete(minA); active.delete(minB)
      const combined: number[] = []
      for (let i = 0; i < n + clusters.length; i++) {
        if (!active.has(i) && i !== newIdx && !clusters.some((c) => c.id === i)) { combined.push(Infinity); continue }
        const dA = dist[minA]?.[i] ?? Infinity
        const dB = dist[minB]?.[i] ?? Infinity
        combined.push(Math.min(dA, dB))
      }
      dist.push(combined)
      active.add(newIdx)
    }
    return clusters
  }, [cols, symbols])

  useEffect(() => {
    if (!ref.current || linkage.length === 0) return
    let cancelled = false
    const render = async () => {
      try {
        const mod = await import('plotly.js-dist-min')
        const Plotly = (mod as any).default || mod
        if (cancelled) return

        const n = symbols.length
        const leafOrder = symbols.map((_, i) => i)
        const lines: { x: number[]; y: number[] }[] = []

        const merged = new Set<number>()
        for (const c of linkage) {
          const l = c.left ?? 0, r = c.right ?? 0
          merged.add(c.id)
          const ly = leafOrder.indexOf(l), ry = leafOrder.indexOf(r)
          const mid = (ly + ry) / 2
          const h = (merged.size) * 5
          const x0 = 0, x1 = h, x2 = h, x3 = 0
          lines.push({ x: [x0, x1, x2, x3], y: [ly, ly, ry, ry] })
        }

        await Plotly.newPlot(ref.current, lines.map((l) => ({
          x: l.x, y: l.y, type: 'scatter' as const, mode: 'lines' as const,
          line: { color: '#3b82f6', width: 1.5 }, showlegend: false,
          hovertemplate: '%{y}<extra></extra>',
        })), {
          paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          margin: { l: 40, r: 20, t: 10, b: 40 }, height: Math.max(160, n * 24),
          xaxis: { showgrid: false, zeroline: false, showticklabels: false },
          yaxis: { tickvals: symbols.map((_, i) => i), ticktext: symbols, color: '#999', gridcolor: 'rgba(255,255,255,0.04)', zeroline: false },
          hovermode: 'closest',
        })
      } catch { /* */ }
    }
    render()
    return () => { cancelled = true; if (ref.current) ref.current.innerHTML = '' }
  }, [linkage, symbols])

  if (symbols.length <= 1) return null
  return (
    <Card title="HRP DENDROGRAM">
      <div ref={ref} />
      <div className="font-mono-data text-[9px] text-muted mt-1">
        Hierarchical clustering from return correlations
      </div>
    </Card>
  )
}

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
    setFrontier([])
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

          {result.model !== 'hrp' && frontier.length > 0 && (
            <Card title="Efficient Frontier">
              <FrontierChart frontier={frontier} result={result} />
            </Card>
          )}

          {result.model === 'hrp' && (
            <DendrogramChart result={result} prices={priceInput.split(',').map(Number).filter(n => !isNaN(n))} symbols={symbols} />
          )}

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

      {!result && frontier.length > 0 && (
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
