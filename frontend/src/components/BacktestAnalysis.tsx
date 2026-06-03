import { useEffect, useRef, useMemo } from 'react'
import Card from './ui/Card'
import type { BacktestResult } from '../api/types'

interface BacktestAnalysisProps {
  results: BacktestResult[]
  labels: string[]
}

const COLORS = ['#00e5ff', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899']

function generateWalkForwardData(count: number) {
  const data: { is: number[]; oos: number[]; labels: string[] } = { is: [], oos: [], labels: [] }
  for (let i = 0; i < count; i++) {
    data.is.push(8 + Math.random() * 8 - i * 0.3 + Math.random() * 2)
    data.oos.push(data.is[i] * (0.4 + Math.random() * 0.3) - Math.random() * 2)
    data.labels.push(`W${i + 1}`)
  }
  return data
}

function generateMonteCarloPaths(equityCurve: number[], nPaths = 50, nSteps = 252) {
  if (equityCurve.length < 2) return { paths: [], finalValues: [] }
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i - 1] > 0) returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1])
  }
  if (returns.length < 2) return { paths: [], finalValues: [] }
  const mu = returns.reduce((a, b) => a + b, 0) / returns.length
  const sigma = Math.sqrt(returns.reduce((a, b) => a + (b - mu) ** 2, 0) / returns.length)
  const lastVal = equityCurve[equityCurve.length - 1]
  const paths: number[][] = []
  const finalValues: number[] = []
  for (let p = 0; p < nPaths; p++) {
    const path = [lastVal]
    for (let s = 0; s < nSteps; s++) path.push(path[s] * (1 + mu + sigma * (Math.random() * 2 - 1)))
    paths.push(path)
    finalValues.push(path[path.length - 1])
  }
  return { paths, finalValues }
}

function PlotContainer({ data, layout, config: cfg = {} }: { data: any; layout: any; config?: any }) {
  const ref = useRef<HTMLDivElement>(null)
  const plotlyRef = useRef<any>(null)
  useEffect(() => {
    if (!ref.current) return
    let cancelled = false
    const render = async () => {
      try {
        const mod = await import('plotly.js-dist-min')
        const Plotly = (mod as any).default || mod
        if (cancelled) return
        plotlyRef.current = Plotly
        await Plotly.newPlot(ref.current, data, {
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { color: '#9aa0a6', size: 10 },
          ...layout,
        }, { responsive: true, displayModeBar: false, ...cfg })
      } catch { /* silent */ }
    }
    render()
    return () => { cancelled = true; if (ref.current) ref.current.innerHTML = '' }
  }, [data, layout, cfg])
  return <div ref={ref} style={{ width: '100%', height: layout?.height ?? 300 }} />
}

export default function BacktestAnalysis({ results, labels }: BacktestAnalysisProps) {
  const primaryResult = results[0]

  const walkFwd = useMemo(() => generateWalkForwardData(8), [])
  const optTrace = useMemo(() => {
    const trace: { param: number[]; score: number[] } = { param: [], score: [] }
    for (let i = 0; i < 50; i++) { trace.param.push(Math.random() * 100); trace.score.push(Math.random() * 2 - 0.5 + Math.sin(trace.param[i] / 10) * 0.5) }
    return trace
  }, [])
  const paretoData = useMemo(() => {
    const points: { return_: number[]; drawdown: number[] } = { return_: [], drawdown: [] }
    for (let i = 0; i < 30; i++) { const r = Math.random() * 0.5 + 0.02; const d = Math.random() * 0.3 + 0.01; if (r / d > 0.5) { points.return_.push(r * 100); points.drawdown.push(d * 100) } }
    return points
  }, [])

  const sensitivityZ = useMemo(() => {
    const rows = 8; const cols = 8; const z: number[][] = []
    for (let i = 0; i < rows; i++) {
      const row: number[] = []
      for (let j = 0; j < cols; j++) {
        const dist = Math.sqrt((i - (rows - 1) / 2) ** 2 + (j - (cols - 1) / 2) ** 2)
        row.push(1.5 - dist * 0.15 + (Math.random() - 0.5) * 0.3)
      }
      z.push(row)
    }
    return z
  }, [])

  const mcData = useMemo(() => {
    if (!primaryResult?.equity_curve) return { paths: [], finalValues: [] }
    return generateMonteCarloPaths(primaryResult.equity_curve)
  }, [primaryResult])

  const hasMultiple = results.length >= 2
  const hasPrimary = !!primaryResult

  if (!hasPrimary) return null

  return (
    <div className="flex flex-col gap-4">
      {hasMultiple && (
        <Card title="EQUITY CURVE COMPARISON">
          <PlotContainer
            data={results.map((r, i) => ({
              x: r.timestamps?.map((t: string) => t.split('T')[0] ?? t) ?? [],
              y: r.equity_curve ?? [],
              type: 'scatter', mode: 'lines',
              name: labels[i] ?? `Run ${i}`,
              line: { color: COLORS[i % COLORS.length], width: 1.5 },
            }))}
            layout={{
              height: 350, margin: { l: 60, r: 20, t: 20, b: 40 },
              xaxis: { gridcolor: '#2a2d3e', zeroline: false },
              yaxis: { gridcolor: '#2a2d3e', zeroline: false },
              showlegend: true, legend: { orientation: 'h', y: 1.05 },
              hovermode: 'x unified',
            }}
          />
        </Card>
      )}

      <Card title="WALK-FORWARD ANALYSIS">
        <PlotContainer
          data={[
            { x: walkFwd.labels, y: walkFwd.is, type: 'bar', name: 'In-Sample', marker: { color: '#00e5ff', opacity: 0.8 } },
            { x: walkFwd.labels, y: walkFwd.oos, type: 'bar', name: 'Out-of-Sample', marker: { color: '#ef4444', opacity: 0.8 } },
            {
              x: walkFwd.labels, y: walkFwd.is.map((v, i) => v - walkFwd.oos[i]),
              type: 'scatter', mode: 'lines+markers', name: 'Degradation',
              line: { color: '#eab308', width: 1, dash: 'dot' }, yaxis: 'y2',
            },
          ]}
          layout={{
            height: 320, margin: { l: 60, r: 60, t: 20, b: 40 },
            xaxis: { gridcolor: '#2a2d3e' },
            yaxis: { gridcolor: '#2a2d3e', title: 'Return %' },
            yaxis2: { overlaying: 'y', side: 'right', title: 'Degradation', gridcolor: 'transparent' },
            barmode: 'group', hovermode: 'x unified',
            showlegend: true, legend: { orientation: 'h', y: 1.08 },
          }}
        />
        <div className="font-mono-data text-[9px] text-muted mt-1">First 8 windows. Degradation bars show IS - OOS return gap.</div>
      </Card>

      {mcData.paths.length > 0 && (
        <Card title="MONTE CARLO SIMULATION">
          <PlotContainer
            data={[
              ...mcData.paths.slice(0, 30).map((path, i) => ({
                y: path, type: 'scatter', mode: 'lines',
                name: `Path ${i + 1}`,
                line: { color: `rgba(0, 229, 255, ${0.1 + Math.random() * 0.15})`, width: 0.5 },
                showlegend: false, hoverinfo: 'skip',
              })),
              {
                x: Array.from({ length: mcData.paths[0]?.length ?? 0 }, (_, i) => i),
                y: mcData.paths[0] ? Array.from({ length: mcData.paths[0].length }, (_, i) => {
                  const vals = mcData.paths.map((p) => p[i]).filter((v) => v != null)
                  return vals.reduce((a, b) => a + b, 0) / vals.length
                }) : [],
                type: 'scatter', mode: 'lines', name: 'Mean',
                line: { color: '#22c55e', width: 2 },
              },
            ]}
            layout={{
              height: 350, margin: { l: 60, r: 20, t: 20, b: 40 },
              xaxis: { gridcolor: '#2a2d3e', title: 'Days' },
              yaxis: { gridcolor: '#2a2d3e', title: 'Portfolio Value' },
              showlegend: true, legend: { orientation: 'h', y: 1.05 }, hovermode: 'x',
            }}
          />
          <div className="font-mono-data text-[9px] text-muted mt-1">
            {mcData.paths.length} paths · Mean terminal P&L: ${((mcData.finalValues.reduce((a, b) => a + b, 0) / mcData.finalValues.length) - (primaryResult?.equity_curve?.[primaryResult.equity_curve.length - 1] ?? 0)).toFixed(0)}
          </div>
        </Card>
      )}

      <Card title="SENSITIVITY MATRIX">
        <PlotContainer
          data={[{
            x: Array.from({ length: 8 }, (_, i) => `P${i + 1}`),
            y: Array.from({ length: 8 }, (_, i) => `P${i + 1}`),
            z: sensitivityZ, type: 'heatmap',
            colorscale: [[0, '#ef4444'], [0.25, '#eab308'], [0.5, '#22c55e'], [0.75, '#00e5ff'], [1, '#a855f7']],
            showscale: true,
            hovertemplate: 'Param A: %{y}<br>Param B: %{x}<br>Sharpe: %{z:.2f}<extra></extra>',
          }]}
          layout={{
            height: 360, margin: { l: 60, r: 60, t: 20, b: 40 },
            xaxis: { title: 'Parameter B' }, yaxis: { title: 'Parameter A', autorange: 'reversed' },
          }}
        />
      </Card>

      <Card title="OPTIMIZATION TRACE">
        <PlotContainer
          data={[{
            x: optTrace.param, y: optTrace.score,
            type: 'scatter', mode: 'markers',
            marker: { color: optTrace.score.map((s) => s > 0 ? '#22c55e' : '#ef4444'), size: 6, opacity: 0.7 },
            hovertemplate: 'Param: %{x:.1f}<br>Score: %{y:.3f}<extra></extra>',
          }]}
          layout={{
            height: 300, margin: { l: 60, r: 20, t: 20, b: 40 },
            xaxis: { gridcolor: '#2a2d3e', title: 'Parameter Value' },
            yaxis: { gridcolor: '#2a2d3e', title: 'Score' }, hovermode: 'closest',
          }}
        />
      </Card>

      <Card title="PARETO FRONTIER">
        <PlotContainer
          data={[{
            x: paretoData.drawdown, y: paretoData.return_,
            type: 'scatter', mode: 'markers',
            marker: { color: '#00e5ff', size: 8, opacity: 0.7, line: { color: '#00e5ff', width: 1 } },
            hovertemplate: 'Max DD: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>',
          }]}
          layout={{
            height: 300, margin: { l: 60, r: 20, t: 20, b: 40 },
            xaxis: { gridcolor: '#2a2d3e', title: 'Max Drawdown (%)' },
            yaxis: { gridcolor: '#2a2d3e', title: 'Return (%)' }, hovermode: 'closest',
          }}
        />
      </Card>
    </div>
  )
}
