import { useState } from 'react'
import { portfolioWhatIf } from '../api/client'
import type { WhatIfResult } from '../api/types'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

interface TickerWeight {
  symbol: string
  current: number
  target: number
}

export default function PortfolioWhatIf() {
  const [rows, setRows] = useState<TickerWeight[]>([
    { symbol: 'AAPL', current: 30, target: 25 },
    { symbol: 'MSFT', current: 30, target: 35 },
    { symbol: 'GOOGL', current: 40, target: 40 },
  ])
  const [result, setResult] = useState<WhatIfResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rebalanceCost, setRebalanceCost] = useState(0.001)

  const addRow = () => {
    setRows((prev) => [...prev, { symbol: '', current: 0, target: 0 }])
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateRow = (idx: number, field: keyof TickerWeight, value: string | number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const normalizeWeights = (weights: Record<string, number>) => {
    const total = Object.values(weights).reduce((s, v) => s + v, 0)
    if (total === 0) return weights
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(weights)) {
      out[k] = Math.round((v / total) * 10000) / 10000
    }
    return out
  }

  const runWhatIf = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const currentWeights: Record<string, number> = {}
      const targetWeights: Record<string, number> = {}
      for (const row of rows) {
        if (row.symbol.trim()) {
          currentWeights[row.symbol.trim()] = row.current
          targetWeights[row.symbol.trim()] = row.target
        }
      }
      const res = await portfolioWhatIf(
        normalizeWeights(currentWeights),
        normalizeWeights(targetWeights),
        rebalanceCost,
      )
      setResult(res)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-lg font-bold text-primary">Portfolio What-If</h1>
        <p className="text-xs font-mono text-muted">Simulate rebalancing costs and turnover</p>
      </div>

      <Card title="Current vs Target Weights (%)" padding="compact">
        <div className="space-y-1">
          <div className="grid grid-cols-[2fr_1fr_1fr_40px] gap-1 text-[9px] font-mono-data tracking-wider text-muted px-1">
            <span>Symbol</span>
            <span className="text-right">Current %</span>
            <span className="text-right">Target %</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_40px] gap-1 items-center">
              <input
                value={row.symbol}
                onChange={(e) => updateRow(i, 'symbol', e.target.value.toUpperCase())}
                placeholder="TICKER"
                className="bg-input border border-input text-primary font-mono-data text-[11px] px-1.5 py-0.5 outline-none rounded-sm w-full"
              />
              <input
                type="number"
                value={row.current}
                onChange={(e) => updateRow(i, 'current', Number(e.target.value))}
                className="bg-input border border-input text-primary font-mono-data text-[11px] px-1.5 py-0.5 outline-none rounded-sm w-full text-right"
              />
              <input
                type="number"
                value={row.target}
                onChange={(e) => updateRow(i, 'target', Number(e.target.value))}
                className="bg-input border border-input text-primary font-mono-data text-[11px] px-1.5 py-0.5 outline-none rounded-sm w-full text-right"
              />
              <button
                onClick={() => removeRow(i)}
                className="text-down text-[11px] cursor-pointer bg-transparent border-none"
              >
                ✕
              </button>
            </div>
          ))}
          <button onClick={addRow} className="text-[10px] font-mono-data text-accent-cyan cursor-pointer bg-transparent border-none">
            + Add Ticker
          </button>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono-data text-muted">Rebalance Cost:</span>
          <input
            type="number"
            value={rebalanceCost}
            onChange={(e) => setRebalanceCost(Number(e.target.value))}
            step={0.0001}
            min={0}
            className="bg-input border border-input text-primary font-mono-data text-[11px] px-1.5 py-0.5 outline-none rounded-sm w-20"
          />
        </div>
        <button
          onClick={runWhatIf}
          disabled={loading}
          className="bg-accent-cyan text-black font-mono-data text-[11px] font-semibold px-3 py-1 rounded-sm cursor-pointer disabled:opacity-50 border-none"
        >
          {loading ? 'Calculating...' : 'Run What-If'}
        </button>
      </div>

      {error && (
        <div className="text-[10px] font-mono-data text-down px-2 py-1 rounded-sm" style={{ background: 'rgba(239,68,68,0.1)' }}>
          {error}
        </div>
      )}

      {result && (
        <Card title="Results">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Turnover', value: `${(result.turnover * 100).toFixed(2)}%` },
              { label: 'Cost', value: `$${(result.cost * 100000).toFixed(2)}` },
              { label: 'Tax Impact', value: `$${(result.tax_impact * 100000).toFixed(2)}` },
              { label: 'Total Cost', value: `$${(result.total_cost * 100000).toFixed(2)}`, highlight: true },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-default rounded-sm px-2.5 py-1.5">
                <div className="text-[9px] font-mono-data tracking-wider text-muted">{m.label}</div>
                <div className={`font-mono-data text-[13px] font-bold ${m.highlight ? 'text-accent-cyan' : 'text-primary'}`}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
