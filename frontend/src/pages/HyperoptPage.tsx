import { useState, useMemo, useCallback, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import ProgressBar from '../components/ProgressBar'
import { runHyperoptOptimize, runHyperoptFull, fetchHyperoptSpace } from '../api/hyperopt'
import type { HyperoptResult, FullOptimizeResult } from '../api/hyperopt'
import { useToastStore } from '../store/toast'
import { fetchExperiments, createExperiment, runExperiment, structuredTune, aiOptimize } from '../api/experiments'
import type { Experiment } from '../api/experiments'
import { fmtDateTime } from '../utils/format'

/* ── Extended types ── */
interface Trial {
  params: Record<string, number>
  score: number
  iteration: number
}

interface ExtendedHyperoptResult extends HyperoptResult {
  trials?: Trial[]
}

interface ExtendedFullOptimizeResult extends FullOptimizeResult {
  trials?: Trial[]
}

type Tab = 'standard' | 'full' | 'experiments'

/* ── Helpers ── */

function interpColor(t: number): string {
  const r = t < 0.5 ? 255 : Math.round(255 - (t - 0.5) * 2 * 255)
  const g = t < 0.5 ? Math.round(t * 2 * 255) : 255
  const b = 50
  return `rgb(${r},${g},${b})`
}

/* ── Parallel-coordinate plot (#208) ── */
function ParallelCoords({ trials, paramNames }: { trials: Trial[]; paramNames: string[] }) {
  const W = 580, H = 380, PAD = 45
  const topN = useMemo(() => {
    const sorted = [...trials].sort((a, b) => b.score - a.score).slice(0, 10)
    return new Set(sorted)
  }, [trials])

  const ranges = useMemo(() => paramNames.map((name) => {
    const vals = trials.map((t) => t.params[name] ?? 0)
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }), [trials, paramNames])

  const scoreMin = useMemo(() => Math.min(...trials.map((t) => t.score)), [trials])
  const scoreMax = useMemo(() => Math.max(...trials.map((t) => t.score)), [trials])

  const allAxes = [...paramNames, 'Score']
  const axisRanges = [...ranges, { min: scoreMin, max: scoreMax }]
  const xStep = allAxes.length > 1 ? (W - 2 * PAD) / (allAxes.length - 1) : W - 2 * PAD

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {trials.map((trial, ti) => {
        const isTop = topN.has(trial)
        const pts = allAxes.map((name, ai) => {
          const x = PAD + ai * xStep
          let val: number
          if (name === 'Score') val = trial.score
          else val = trial.params[name] ?? 0
          const r = axisRanges[ai]
          const y = H - PAD - ((val - r.min) / (Math.max(r.max - r.min, 0.0001))) * (H - 2 * PAD)
          return `${x},${y}`
        }).join(' ')
        return <polyline key={ti} points={pts} stroke={isTop ? '#22c55e' : 'rgba(255,255,255,0.06)'} strokeWidth={isTop ? 1.8 : 0.4} fill="none" />
      })}
      {allAxes.map((name, ai) => {
        const x = PAD + ai * xStep
        const r = axisRanges[ai]
        return (
          <g key={name}>
            <line x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="var(--border-color)" strokeWidth={0.5} />
            <text x={x} y={H - 8} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace">{name}</text>
            <text x={x} y={PAD - 6} textAnchor="middle" fill="var(--text-muted)" fontSize={7} fontFamily="'JetBrains Mono', monospace">{r.max.toFixed(2)}</text>
            <text x={x} y={H - PAD + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={7} fontFamily="'JetBrains Mono', monospace">{r.min.toFixed(2)}</text>
          </g>
        )
      })}
      <text x={W - PAD} y={PAD - 18} textAnchor="end" fill="#22c55e" fontSize={8} fontFamily="'JetBrains Mono', monospace">Top 10</text>
    </svg>
  )
}

/* ── Slice plot (#209) ── */
function SlicePlot({ trials, paramName }: { trials: Trial[]; paramName: string }) {
  const W = 180, H = 140, PAD = 30
  const vals = trials.map((t) => t.params[paramName] ?? 0)
  const scores = trials.map((t) => t.score)
  const vMin = Math.min(...vals), vMax = Math.max(...vals)
  const sMin = Math.min(...scores), sMax = Math.max(...scores)
  const vRange = Math.max(vMax - vMin, 0.0001)
  const sRange = Math.max(sMax - sMin, 0.0001)

  // trend line - moving average
  const sorted = [...trials].sort((a, b) => (a.params[paramName] ?? 0) - (b.params[paramName] ?? 0))
  const window = Math.max(3, Math.floor(sorted.length / 5))
  const trend: { x: number; y: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    const half = Math.floor(window / 2)
    const start = Math.max(0, i - half)
    const end = Math.min(sorted.length, i + half + 1)
    const slice = sorted.slice(start, end)
    const avgX = slice.reduce((s, t) => s + (t.params[paramName] ?? 0), 0) / slice.length
    const avgY = slice.reduce((s, t) => s + t.score, 0) / slice.length
    trend.push({ x: avgX, y: avgY })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={W} height={H}>
        {trials.map((t, i) => {
          const x = PAD + ((t.params[paramName] ?? 0) - vMin) / vRange * (W - 2 * PAD)
          const y = H - PAD - ((t.score - sMin) / sRange) * (H - 2 * PAD)
          return <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(255,255,255,0.3)" />
        })}
        {trend.length > 1 && trend.slice(1).map((p, i) => {
          const prev = trend[i]
          const x1 = PAD + (prev.x - vMin) / vRange * (W - 2 * PAD)
          const y1 = H - PAD - ((prev.y - sMin) / sRange) * (H - 2 * PAD)
          const x2 = PAD + (p.x - vMin) / vRange * (W - 2 * PAD)
          const y2 = H - PAD - ((p.y - sMin) / sRange) * (H - 2 * PAD)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent-cyan)" strokeWidth={1} />
        })}
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="var(--text-muted)" fontSize={7} fontFamily="'JetBrains Mono', monospace">{paramName}</text>
        <text x={2} y={H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={7} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90, 8, ${H / 2})`}>Score</text>
      </svg>
    </div>
  )
}

/* ── Contour plot (#210) ── */
function ContourPlot({ trials, paramNames }: { trials: Trial[]; paramNames: string[] }) {
  const W = 400, H = 340, PAD = 50
  const GRID = 30

  const p0 = paramNames[0], p1 = paramNames[1]
  const v0 = trials.map((t) => t.params[p0] ?? 0)
  const v1 = trials.map((t) => t.params[p1] ?? 0)
  const scores = trials.map((t) => t.score)
  const min0 = Math.min(...v0), max0 = Math.max(...v0)
  const min1 = Math.min(...v1), max1 = Math.max(...v1)
  const minS = Math.min(...scores), maxS = Math.max(...scores)
  const r0 = Math.max(max0 - min0, 0.0001), r1 = Math.max(max1 - min1, 0.0001), rs = Math.max(maxS - minS, 0.0001)

  const cellW = (W - 2 * PAD) / GRID
  const cellH = (H - 2 * PAD) / GRID

  const cells: { x: number; y: number; avg: number; count: number }[] = []
  for (let gi = 0; gi < GRID; gi++) {
    for (let gj = 0; gj < GRID; gj++) {
      const c0 = min0 + (gi / GRID) * r0
      const c1 = min1 + (gj / GRID) * r1
      const half = r0 / GRID / 2
      const nearby = trials.filter((t) => {
        const d0 = Math.abs((t.params[p0] ?? 0) - c0) / r0
        const d1 = Math.abs((t.params[p1] ?? 0) - c1) / r1
        return d0 < 0.1 && d1 < 0.1
      })
      const avg = nearby.length > 0 ? nearby.reduce((s, t) => s + t.score, 0) / nearby.length : 0
      cells.push({ x: gi, y: gj, avg, count: nearby.length })
    }
  }

  const maxAvg = Math.max(...cells.map((c) => c.avg), 0.0001)

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {cells.map((c) => {
        const t = maxAvg > 0 ? c.avg / maxAvg : 0
        const fill = c.count > 0 ? interpColor(t) : 'transparent'
        return <rect key={`${c.x}-${c.y}`} x={PAD + c.x * cellW} y={PAD + c.y * cellH} width={cellW} height={cellH} fill={fill} opacity={c.count > 0 ? 0.7 : 0} />
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace">{p0}</text>
      <text x={8} y={H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90, 8, ${H / 2})`}>{p1}</text>
      <text x={W / 2} y={PAD - 10} textAnchor="middle" fill="var(--accent-cyan)" fontSize={9} fontFamily="'JetBrains Mono', monospace">Score Heatmap</text>
    </svg>
  )
}

/* ── EDF plot (#211) ── */
function EDFPlot({ trials }: { trials: Trial[] }) {
  const W = 400, H = 200, PAD = 40
  const sorted = useMemo(() => [...trials].sort((a, b) => a.score - b.score), [trials])
  const scores = sorted.map((t) => t.score)
  const sMin = scores[0] ?? 0, sMax = scores[scores.length - 1] ?? 1
  const sRange = Math.max(sMax - sMin, 0.0001)

  const stepData: { x: number; y: number }[] = scores.map((s, i) => {
    const x = PAD + ((s - sMin) / sRange) * (W - 2 * PAD)
    const y = H - PAD - (i / Math.max(scores.length - 1, 1)) * (H - 2 * PAD)
    return { x, y }
  })

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {stepData.map((p, i) => {
        if (i === 0) return null
        const prev = stepData[i - 1]
        return (
          <g key={i}>
            <line x1={prev.x} y1={prev.y} x2={p.x} y2={prev.y} stroke="var(--accent-cyan)" strokeWidth={1.5} />
            <line x1={p.x} y1={prev.y} x2={p.x} y2={p.y} stroke="var(--accent-cyan)" strokeWidth={1.5} />
          </g>
        )
      })}
      {stepData.length > 0 && (
        <line x1={stepData[stepData.length - 1].x} y1={stepData[stepData.length - 1].y} x2={W - PAD} y2={H - PAD} stroke="var(--accent-cyan)" strokeWidth={1.5} strokeDasharray="2,2" />
      )}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace">Score</text>
      <text x={8} y={H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90, 8, ${H / 2})`}>Cumulative %</text>
      <text x={W / 2} y={PAD - 8} textAnchor="middle" fill="var(--accent-cyan)" fontSize={9} fontFamily="'JetBrains Mono', monospace">EDF</text>
    </svg>
  )
}

/* ── Loss curve chart ── */
function LossCurveChart({ trials }: { trials: Trial[] }) {
  const W = 600, H = 240, PAD = 50
  const sorted = useMemo(() => [...trials].sort((a, b) => (a.iteration ?? 0) - (b.iteration ?? 0)), [trials])
  const bestSoFar = useMemo(() => {
    let best = -Infinity
    return sorted.map((t) => { best = Math.max(best, t.score); return best })
  }, [sorted])
  const scores = sorted.map((t) => t.score)
  const maxScore = Math.max(...scores, 0.0001)
  const minScore = Math.min(...scores, 0)
  const range = Math.max(maxScore - minScore, 0.0001)
  const xStep = sorted.length > 1 ? (W - 2 * PAD) / (sorted.length - 1) : W - 2 * PAD

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {sorted.map((t, i) => {
        const x = PAD + i * xStep
        const rawY = H - PAD - ((t.score - minScore) / range) * (H - 2 * PAD)
        return <circle key={i} cx={x} cy={rawY} r={1.5} fill="rgba(255,255,255,0.25)" />
      })}
      {bestSoFar.length > 1 && bestSoFar.slice(1).map((b, i) => {
        const prev = bestSoFar[i]
        const x1 = PAD + i * xStep
        const y1 = H - PAD - ((prev - minScore) / range) * (H - 2 * PAD)
        const x2 = PAD + (i + 1) * xStep
        const y2 = H - PAD - ((b - minScore) / range) * (H - 2 * PAD)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent-green)" strokeWidth={1.5} />
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace">Iteration</text>
      <text x={8} y={H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="'JetBrains Mono', monospace" transform={`rotate(-90, 8, ${H / 2})`}>Score</text>
      <text x={W / 2} y={PAD - 8} textAnchor="middle" fill="var(--accent-green)" fontSize={9} fontFamily="'JetBrains Mono', monospace">Loss Curve (dots = trials, line = best so far)</text>
    </svg>
  )
}

/* ── Parameter importance chart ── */
function ParamImportance({ trials, paramNames }: { trials: Trial[]; paramNames: string[] }) {
  const importances = useMemo(() => {
    const totalR2 = trials.reduce((s, t) => s + t.score, 0) / Math.max(trials.length, 1)
    const totalVar = trials.reduce((s, t) => s + (t.score - totalR2) ** 2, 0)
    return paramNames.map((name) => {
      const vals = trials.map((t) => t.params[name] ?? 0)
      const meanV = vals.reduce((s, v) => s + v, 0) / vals.length
      const num = trials.reduce((s, t, i) => s + ((t.params[name] ?? 0) - meanV) * (t.score - totalR2), 0)
      const den = vals.reduce((s, v) => s + (v - meanV) ** 2, 0)
      const slope = den > 0 ? num / den : 0
      const r2 = totalVar > 0 ? (num ** 2 / den) / totalVar : 0
      return { name, importance: Math.abs(r2), r2, slope }
    }).sort((a, b) => b.importance - a.importance)
  }, [trials, paramNames])

  const W = 400, H = 30 * importances.length + 40, BAR_H = 20, GAP = 4
  const maxImp = Math.max(...importances.map((i) => i.importance), 0.0001)

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto' }}>
      {importances.map((imp, i) => {
        const y = 20 + i * (BAR_H + GAP)
        const barW = (imp.importance / maxImp) * (W - 100)
        return (
          <g key={imp.name}>
            <text x={4} y={y + BAR_H / 2 + 3} fill="var(--text-muted)" fontSize={9} fontFamily="'JetBrains Mono', monospace">{imp.name}</text>
            <rect x={80} y={y} width={Math.max(barW, 2)} height={BAR_H} fill={imp.r2 > 0 ? 'var(--accent-green)' : 'var(--accent-red)'} rx={2} />
            <text x={85 + barW} y={y + BAR_H / 2 + 3} fill="var(--text-secondary)" fontSize={8} fontFamily="'JetBrains Mono', monospace">{(imp.importance * 100).toFixed(0)}%</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Main component ── */
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

  /* ── Experiments tab ── */
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [expLoading, setExpLoading] = useState(true)
  const [expRunningId, setExpRunningId] = useState<string | null>(null)
  const [newExpName, setNewExpName] = useState('')
  const [newExpConfig, setNewExpConfig] = useState('{\n  "strategy": "momentum",\n  "tickers": ["SPY"],\n  "lookback": 20\n}')
  const [tuneConfig, setTuneConfig] = useState('{\n  "strategy": "mean_reversion",\n  "params": {\n    "lookback": {"min": 5, "max": 50, "type": "int"},\n    "threshold": {"min": 0.5, "max": 3.0, "type": "float"}\n  },\n  "metric": "sharpe_ratio"\n}')
  const [aiConfig, setAiConfig] = useState('{\n  "objective": "maximize_sharpe",\n  "constraints": {\n    "max_drawdown": 0.2,\n    "min_trades": 10\n  },\n  "search_space": {\n    "lookback": {"low": 5, "high": 100},\n    "entry_threshold": {"low": 0.5, "high": 2.0}\n  }\n}')
  const [expTab, setExpTab] = useState<'experiments' | 'tune' | 'ai_optimize'>('experiments')
  const loadExperiments = useCallback(async () => {
    setExpLoading(true)
    try { const res = await fetchExperiments(); setExperiments(res.experiments || []) }
    catch (err: any) { addToast(err?.message || 'Failed to load experiments', 'error') }
    setExpLoading(false)
  }, [addToast])
  useEffect(() => { if (tab === 'experiments') loadExperiments() }, [tab, loadExperiments])
  const handleCreate = useCallback(async () => {
    if (!newExpName.trim()) return
    try {
      let config: any
      try { config = JSON.parse(newExpConfig) } catch { config = {} }
      const exp = await createExperiment({ name: newExpName.trim(), config })
      setExperiments(prev => [exp, ...prev])
      setNewExpName('')
      addToast('Experiment created', 'success')
    } catch (err: any) { addToast(err?.message || 'Create failed', 'error') }
  }, [newExpName, newExpConfig, addToast])
  const handleRunExp = useCallback(async (id: string) => {
    setExpRunningId(id)
    try {
      await runExperiment(id)
      addToast('Experiment started', 'info')
      setTimeout(loadExperiments, 2000)
    } catch (err: any) { addToast(err?.message || 'Run failed', 'error') }
    setExpRunningId(null)
  }, [addToast, loadExperiments])
  const handleStructuredTune = useCallback(async () => {
    try {
      const config = JSON.parse(tuneConfig)
      const exp = await structuredTune(config)
      setExperiments(prev => [exp, ...prev])
      addToast('Structured tune started', 'info')
    } catch (err: any) { addToast(err?.message || 'Tune failed', 'error') }
  }, [tuneConfig, addToast])
  const handleAiOptimize = useCallback(async () => {
    try {
      const config = JSON.parse(aiConfig)
      const exp = await aiOptimize(config)
      setExperiments(prev => [exp, ...prev])
      addToast('AI optimization started', 'info')
    } catch (err: any) { addToast(err?.message || 'AI optimize failed', 'error') }
  }, [aiConfig, addToast])

  const isFull = (r: unknown): r is FullOptimizeResult =>
    r !== null && typeof r === 'object' && 'best_composite' in r

  const extResult = result as ExtendedHyperoptResult | ExtendedFullOptimizeResult | null
  const bestParams = result?.best_params ?? {}
  const paramNames = useMemo(() => Object.keys(bestParams), [bestParams])
  const bestScore = useMemo(() => {
    if (!result) return 0
    return isFull(result) ? (result as FullOptimizeResult).best_composite : (result as HyperoptResult).best_sharpe
  }, [result])

  const trials = useMemo(() => {
    if (!result) return []
    if (extResult?.trials && extResult.trials.length > 0) return extResult.trials
    return []
  }, [result, extResult])

  const topTrials = useMemo(() => [...trials].sort((a, b) => b.score - a.score).slice(0, 10), [trials])
  const baselineScore = useMemo(() => {
    if (trials.length === 0) return 1
    const median = [...trials].sort((a, b) => a.score - b.score)[Math.floor(trials.length / 2)]?.score ?? 1
    return median
  }, [trials])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="bg-card border border-default px-2 py-1">
        <div className="flex items-center gap-2">
          <Badge label="HYPEROPT" variant="info" />
          {(['standard', 'full', 'experiments'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(null) }}
              className="border-none font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
              style={{
                background: tab === t ? 'rgba(59,130,246,0.15)' : 'none',
                color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}
            >
              {t === 'standard' ? 'STANDARD' : t === 'full' ? 'MULTI-TIMEFRAME' : 'EXPERIMENTS'}
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

      {loading && (
        <div className="px-4 py-2">
          <ProgressBar value={nTrials} max={nTrials * 2} label="Hyperparameter optimization" height={3} />
        </div>
      )}

      {result && (
        <>
          {/* Best params summary (existing) */}
          <Card title="BEST PARAMS">
            <div className="grid grid-cols-3 gap-1 mb-2">
              <div>
                <div className="text-[9px] font-mono-data tracking-wider text-muted">
                  {isFull(result) ? 'BEST COMPOSITE' : 'BEST SHARPE'}
                </div>
                <div className="font-mono-data text-[11px] font-bold text-up">
                  {bestScore.toFixed(4)}
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
            {isFull(result) && (
              <div className="mb-2">
                <div className="text-[9px] font-mono-data tracking-wider text-muted">TIMEFRAMES</div>
                <div className="font-mono-data text-[10px] text-secondary">
                  {Object.keys((result as FullOptimizeResult).timeframe_results ?? {}).join(', ')}
                </div>
              </div>
            )}
            <div>
              <div className="text-[9px] font-mono-data tracking-wider text-muted mb-1">PARAMETERS</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(bestParams).map(([k, v]) => (
                  <div key={k} className="bg-[var(--bg-hover)] px-2 py-0.5 font-mono-data text-[10px] text-secondary" style={{ borderRadius: 'var(--radius-sm)' }}>
                    {k}: <span className="text-accent-cyan">{String(typeof v === 'number' ? v.toFixed(4) : v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 px-2 py-1 rounded-sm" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-yellow)' }}>
              ⓘ Best score is from in-sample optimization. Performance on unseen data may differ. No hold-out validation was applied.
            </div>
          </Card>

          {/* Loss curve (#213) */}
          {trials.length > 1 && (
            <Card title="LOSS CURVE">
              <LossCurveChart trials={trials} />
            </Card>
          )}

          {/* Parameter importance (#214) */}
          {paramNames.length > 1 && trials.length > 1 && (
            <Card title="PARAMETER IMPORTANCE">
              <ParamImportance trials={trials} paramNames={paramNames} />
            </Card>
          )}

          {/* Parallel-coordinate plot (#208) */}
          {paramNames.length > 0 && trials.length > 1 && (
            <Card title="PARALLEL COORDINATE PLOT">
              <ParallelCoords trials={trials} paramNames={paramNames} />
            </Card>
          )}

          {/* Slice plots (#209) */}
          {paramNames.length > 0 && trials.length > 1 && (
            <Card title="SLICE PLOTS">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {paramNames.map((name) => (
                  <SlicePlot key={name} trials={trials} paramName={name} />
                ))}
              </div>
            </Card>
          )}

          {/* Contour plot (#210) when exactly 2 params */}
          {paramNames.length === 2 && trials.length > 1 && (
            <Card title="CONTOUR PLOT">
              <ContourPlot trials={trials} paramNames={paramNames} />
            </Card>
          )}

          {/* EDF plot (#211) */}
          {trials.length > 1 && (
            <Card title="EDF PLOT">
              <EDFPlot trials={trials} />
            </Card>
          )}

          {/* Top-N parameter sets (#212) */}
          <Card title="TOP 10 PARAMETER SETS">
            <div style={{ overflowX: 'auto' }}>
              <table className="font-mono-data text-[10px]" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Rank</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Params</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Score</th>
                    <th style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>% Impr.</th>
                    <th style={{ padding: '4px 8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topTrials.map((t, i) => {
                    const impr = baselineScore > 0 ? ((t.score - baselineScore) / baselineScore) * 100 : 0
                    return (
                      <tr key={i}>
                        <td style={{ padding: '4px 8px', color: i < 3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>#{i + 1}</td>
                        <td style={{ padding: '4px 8px' }}>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(t.params).map(([k, v]) => (
                              <span key={k} className="font-mono-data text-[8px] px-1 py-px rounded-sm" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                                {k}: {v.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--accent-green)', fontWeight: 600 }}>
                          {t.score.toFixed(4)}
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', color: impr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {impr >= 0 ? '+' : ''}{impr.toFixed(1)}%
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              const text = JSON.stringify(t.params, null, 2)
                              navigator.clipboard.writeText(text)
                              addToast('Params copied to clipboard', 'success')
                            }}
                            className="font-mono-data text-[9px] cursor-pointer px-2 py-0.5 rounded-sm"
                            style={{ border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', background: 'transparent' }}
                          >
                            Use This
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'experiments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="flex items-center gap-2 mb-1">
            {(['experiments', 'tune', 'ai_optimize'] as const).map((t) => (
              <button key={t} onClick={() => setExpTab(t)}
                className="px-3 py-1 text-[10px] font-mono font-semibold cursor-pointer rounded-sm"
                style={{ background: expTab === t ? 'var(--accent-cyan)' : 'var(--bg-hover)', color: expTab === t ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                {t === 'experiments' ? 'Experiments' : t === 'tune' ? 'Structured Tune' : 'AI Optimize'}
              </button>
            ))}
          </div>
          {expTab === 'experiments' && (
            <>
              <Card title="NEW EXPERIMENT">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input value={newExpName} onChange={e => setNewExpName(e.target.value)} placeholder="Experiment name"
                    className="px-2 py-1 text-[10px] font-mono outline-none rounded-sm"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)' }} />
                  <textarea value={newExpConfig} onChange={e => setNewExpConfig(e.target.value)}
                    className="font-mono text-[10px] p-2 outline-none rounded-sm"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', minHeight: 100, resize: 'vertical' }} />
                  <button onClick={handleCreate} disabled={!newExpName.trim()}
                    className="self-start px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
                    style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', opacity: newExpName.trim() ? 1 : 0.5 }}>
                    CREATE
                  </button>
                </div>
              </Card>
              <Card title={`EXPERIMENTS (${experiments.length})`}>
                {expLoading ? (
                  <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                ) : experiments.length === 0 ? (
                  <div className="py-6 text-center text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>No experiments yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {experiments.map(exp => (
                      <div key={exp.id} className="flex items-center gap-3 px-2 py-1.5 rounded-sm" style={{ border: '1px solid var(--border-color)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-primary)' }}>{exp.name}</span>
                            <Badge label={exp.status} variant={exp.status === 'completed' ? 'success' : exp.status === 'failed' ? 'error' : exp.status === 'running' ? 'warning' : 'info'} size="sm" />
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)' }}>
                            {fmtDateTime(exp.created_at)} · {exp.id.slice(0, 8)}
                          </div>
                        </div>
                        <button onClick={() => handleRunExp(exp.id)} disabled={expRunningId === exp.id || exp.status === 'running'}
                          className="px-2.5 py-0.5 text-[9px] font-mono font-semibold cursor-pointer rounded-sm"
                          style={{ background: 'var(--accent-cyan)', color: '#000', border: 'none', opacity: expRunningId === exp.id ? 0.6 : 1 }}>
                          {expRunningId === exp.id ? '...' : 'RUN'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
          {expTab === 'tune' && (
            <Card title="STRUCTURED TUNE">
              <div className="text-[9px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                Define parameter search space for hyperparameter optimization
              </div>
              <textarea value={tuneConfig} onChange={e => setTuneConfig(e.target.value)}
                className="w-full font-mono text-[10px] p-2 outline-none rounded-sm mb-2"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', minHeight: 150, resize: 'vertical' }} />
              <button onClick={handleStructuredTune}
                className="px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
                style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>START TUNE</button>
            </Card>
          )}
          {expTab === 'ai_optimize' && (
            <Card title="AI OPTIMIZE">
              <div className="text-[9px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
                AI-driven strategy optimization with objective function and constraints
              </div>
              <textarea value={aiConfig} onChange={e => setAiConfig(e.target.value)}
                className="w-full font-mono text-[10px] p-2 outline-none rounded-sm mb-2"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--input-text)', minHeight: 150, resize: 'vertical' }} />
              <button onClick={handleAiOptimize}
                className="px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
                style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>START OPTIMIZATION</button>
            </Card>
          )}
        </div>
      )}
      {!result && !loading && tab !== 'experiments' && (
        <div className="p-6 text-center font-mono-data text-[10px] text-muted">
          Configure and run hyperparameter optimization
        </div>
      )}
    </div>
  )
}
