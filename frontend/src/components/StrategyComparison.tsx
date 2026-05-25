import { useState } from 'react'
import Badge from './ui/Badge'
import Card from './ui/Card'
import type { BacktestResult } from '../api/types'
import { useBacktestStore } from '../store/backtest'

const TEXT_DATA = "text-data"
const TEXT_SM = "font-mono-data text-[10px]"
const TEXT_LABEL = "text-[9px] font-mono-data tracking-wider"

interface ComparisonEntry {
  label: string
  key: keyof BacktestResult
  format: (v: any) => string
  higher: 'up' | 'down' | 'neutral'
}

const COMPARISON_METRICS: ComparisonEntry[] = [
  { label: 'Total Return', key: 'total_return', format: (v) => `${(v * 100).toFixed(2)}%`, higher: 'up' },
  { label: 'Sharpe', key: 'sharpe_ratio', format: (v) => v.toFixed(2), higher: 'up' },
  { label: 'Sortino', key: 'sortino_ratio', format: (v) => v.toFixed(2), higher: 'up' },
  { label: 'Max DD', key: 'max_drawdown', format: (v) => `${(v * 100).toFixed(1)}%`, higher: 'down' },
  { label: 'Win Rate', key: 'win_rate', format: (v) => `${(v * 100).toFixed(0)}%`, higher: 'up' },
  { label: 'Profit Factor', key: 'profit_factor', format: (v) => v.toFixed(2), higher: 'up' },
  { label: 'Trades', key: 'total_trades', format: (v) => String(v), higher: 'neutral' },
  { label: 'Ann Return', key: 'annualized_return', format: (v) => `${(v * 100).toFixed(2)}%`, higher: 'up' },
  { label: 'Calmar', key: 'calmar_ratio', format: (v) => v?.toFixed(2) ?? '—', higher: 'up' },
  { label: 'Ann Vol', key: 'annualized_vol', format: (v) => `${(v * 100).toFixed(1)}%`, higher: 'down' },
]

function determineWinner(metric: ComparisonEntry, a: number, b: number): 0 | 1 | 2 {
  if (metric.higher === 'up') return a > b ? 1 : b > a ? 2 : 0
  if (metric.higher === 'down') return a < b ? 1 : b < a ? 2 : 0
  return 0
}

interface ParamDiff {
  param: string
  baseline: string
  compare: string
}

export default function StrategyComparison() {
  const { result } = useBacktestStore()
  const [comparisonResults, setComparisonResults] = useState<BacktestResult[]>([])
  const [customLabel, setCustomLabel] = useState('Strategy A')
  const [viewTab, setViewTab] = useState<'metrics' | 'params'>('metrics')

  const addCurrent = () => {
    if (!result) return
    setComparisonResults((prev) => [...prev, result])
  }

  const clearAll = () => setComparisonResults([])

  const remove = (idx: number) => {
    setComparisonResults((prev) => prev.filter((_, i) => i !== idx))
  }

  const all = result ? [result, ...comparisonResults] : comparisonResults

  const paramDiffs: ParamDiff[] = all.length >= 2
    ? Object.keys(all[0]?.config || {}).map((key) => ({
        param: key,
        baseline: String((all[0] as any)?.config?.[key] ?? ''),
        compare: String((all[1] as any)?.config?.[key] ?? ''),
      }))
    : []

  return (
    <Card title="STRATEGY COMPARISON">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <Badge label={viewTab === 'metrics' ? 'METRICS' : 'PARAMS'} variant="info" />
          <button onClick={() => setViewTab(viewTab === 'metrics' ? 'params' : 'metrics')}
            className="px-2 py-0.5 text-[10px] font-mono font-semibold cursor-pointer rounded-sm bg-hover border border-default text-secondary">
            {viewTab === 'metrics' ? 'VIEW PARAMS' : 'VIEW METRICS'}
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={addCurrent}
            disabled={!result}
            className="px-3 py-0.5 text-[10px] font-mono cursor-pointer rounded-sm font-semibold border-none"
            style={{
              background: result ? 'var(--accent-blue)' : 'var(--bg-hover)',
              color: result ? '#fff' : 'var(--text-muted)',
              opacity: result ? 1 : 0.5,
            }}
          >
            + ADD CURRENT
          </button>
          {comparisonResults.length > 0 && (
            <button
              onClick={clearAll}
              className="px-2.5 py-0.5 text-[10px] font-mono cursor-pointer rounded-sm bg-transparent border border-default text-muted"
            >
              CLEAR ALL
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-muted">Label:</span>
          <input
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            className="w-24 px-1 py-0.5 text-[10px] font-mono outline-none rounded-sm bg-input border border-input text-primary"
          />
        </div>
      </div>

      {all.length === 0 ? (
        <div className="py-6 text-center text-[11px] font-mono text-muted">
          Run a backtest, then click "+ Add Current" to compare strategies
        </div>
      ) : viewTab === 'metrics' ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-data">
            <thead>
              <tr className="border-b-2 border-default">
                <th className="px-2.5 py-1.5 text-left text-muted text-[9px] font-mono-data tracking-wider">Metric</th>
                {all.map((_, i) => (
                  <th key={i} className="px-2.5 py-1.5 text-right text-accent-cyan text-[9px] font-mono-data tracking-wider">
                    {i === 0 ? customLabel : `Run ${i}`}
                    {i > 0 && (
                      <button onClick={() => remove(i - 1)} className="ml-1.5 text-[9px] cursor-pointer bg-transparent border-none text-down p-0">
                        ✕
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_METRICS.map((metric) => {
                const values = all.map((r) => {
                  const v = r[metric.key]
                  return typeof v === 'number' ? v : 0
                })
                return (
                  <tr key={metric.key} className="border-b border-default">
                    <td className="px-2.5 py-1 text-secondary text-[9px] font-mono-data tracking-wider">
                      {metric.label}
                    </td>
                    {values.map((v, i) => {
                      const winner = i > 0 ? determineWinner(metric, values[0], v) : 0
                      return (
                        <td key={i} className="px-2.5 py-1 text-right"
                          style={{
                            fontWeight: winner === 2 ? 700 : 400,
                            color: winner === 2 ? 'var(--accent-green)' : i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: i === 0 ? 'rgba(59,130,246,0.05)' : 'transparent',
                          }}>
                          {metric.format(v)}
                          {winner === 2 && <span className="ml-1 text-up">✓</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-data">
            <thead>
              <tr className="border-b-2 border-default">
                <th className="px-2.5 py-1.5 text-left text-muted text-[9px] font-mono-data tracking-wider">Parameter</th>
                <th className="px-2.5 py-1.5 text-right text-accent-cyan text-[9px] font-mono-data tracking-wider">{customLabel}</th>
                <th className="px-2.5 py-1.5 text-right text-accent-cyan text-[9px] font-mono-data tracking-wider">Run 1</th>
                <th className="px-2.5 py-1.5 text-center text-muted text-[9px] font-mono-data tracking-wider">Diff</th>
              </tr>
            </thead>
            <tbody>
              {paramDiffs.map((d) => (
                <tr key={d.param} className="border-b border-default">
                  <td className="px-2.5 py-1 text-secondary text-[9px] font-mono-data tracking-wider">{d.param}</td>
                  <td className="px-2.5 py-1 text-right text-primary">{d.baseline}</td>
                  <td className="px-2.5 py-1 text-right text-primary">{d.compare}</td>
                  <td className="px-2.5 py-1 text-center" style={{ color: d.baseline !== d.compare ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                    {d.baseline !== d.compare ? '≠' : '='}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {all.length > 0 && (
        <div className="mt-2 text-[10px] font-mono text-muted">
          ✓ marks better values. First column (highlighted) is your baseline.
        </div>
      )}
    </Card>
  )
}
