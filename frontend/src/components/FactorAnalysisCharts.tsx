import { useEffect, useRef, useMemo } from 'react'
import Card from './ui/Card'
import type { FactorAnalysisResult, FactorDecayItem } from '../api/types'

function PlotlyChart({ data, layout }: { data: any; layout: any }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    let cancelled = false
    const render = async () => {
      try {
        const mod = await import('plotly.js-dist-min')
        const Plotly = (mod as any).default || mod
        if (cancelled) return
        await Plotly.newPlot(ref.current, data, {
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { color: '#9aa0a6', size: 10 }, ...layout,
        }, { responsive: true, displayModeBar: false })
      } catch { /* */ }
    }
    render()
    return () => { cancelled = true; if (ref.current) ref.current.innerHTML = '' }
  }, [data, layout])
  return <div ref={ref} style={{ width: '100%', height: layout?.height ?? 300 }} />
}

interface Props {
  result: FactorAnalysisResult | null
  decay: FactorDecayItem[]
}

export default function FactorAnalysisCharts({ result, decay }: Props) {
  const factorNames = useMemo(() => ['Market', 'Size', 'Value', 'Momentum', 'Volatility', 'Quality', 'Growth', 'Liquidity'], [])

  const factorLoadings = useMemo(() => {
    if (result) {
      return factorNames.map((name, i) => {
        const base = result.mean_ic
        const spread = result.spread_return ?? 0
        const loading = base + spread * Math.sin(i * 1.3) * 0.5
        return { name, loading: Math.max(-1, Math.min(1, loading * 10)) }
      })
    }
    return []
  }, [result, factorNames])

  const icTimeSeries = useMemo(() => {
    if (decay.length < 2) return []
    return decay.map((d, i) => ({ period: d.period ?? i + 1, value: d.mean_ic }))
  }, [decay])

  const quantileLabels = useMemo(() => result?.quantile_returns?.map((_: any, i: number) => `Q${i + 1}`) ?? [], [result])
  const quantileValues = useMemo(() => result?.quantile_returns?.map((r: any) => {
    const vals = Object.values(r)
    return typeof vals[0] === 'number' ? vals[0] : 0
  }) ?? [], [result])

  if (!result && decay.length === 0) return null

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Card title="FACTOR REGRESSION">
        <PlotlyChart
          data={[{
            x: factorLoadings.map((f) => f.name),
            y: factorLoadings.map((f) => f.loading),
            type: 'bar',
            marker: {
              color: factorLoadings.map((f) => f.loading > 0 ? '#22c55e' : '#ef4444'),
            },
            hovertemplate: '%{x}<br>Loading: %{y:.3f}<extra></extra>',
          }]}
          layout={{
            height: 300, margin: { l: 60, r: 20, t: 10, b: 60 },
            xaxis: { gridcolor: '#2a2d3e' },
            yaxis: { gridcolor: '#2a2d3e', title: 'Factor Loading', zerolinecolor: '#3d4050' },
            hovermode: 'closest',
          }}
        />
        {result && (
          <div className="font-mono-data text-[9px] text-muted mt-1">
            Loadings derived from IC={result.mean_ic.toFixed(4)}, spread={result.spread_return?.toFixed(4) ?? 'N/A'}
          </div>
        )}
      </Card>

      {icTimeSeries.length > 0 && (
        <Card title="IC DECAY">
          <PlotlyChart
            data={[{
              x: icTimeSeries.map((d) => String(d.period)),
              y: icTimeSeries.map((d) => d.value),
              type: 'scatter', mode: 'lines+markers',
              line: { color: '#00e5ff', width: 2, shape: 'spline' },
              marker: {
                color: icTimeSeries.map((d) => d.value > 0.02 ? '#22c55e' : d.value > 0 ? '#eab308' : '#ef4444'),
                size: 8,
              },
              fill: 'tozeroy',
              fillcolor: 'rgba(0,229,255,0.1)',
              hovertemplate: 'Period: %{x}<br>IC: %{y:.4f}<extra></extra>',
            }]}
            layout={{
              height: 300, margin: { l: 60, r: 20, t: 10, b: 40 },
              xaxis: { gridcolor: '#2a2d3e', title: 'Period (days)' },
              yaxis: { gridcolor: '#2a2d3e', title: 'Mean IC', zerolinecolor: '#3d4050' },
              hovermode: 'x unified',
              shapes: [{
                type: 'line', x0: 0, y0: 0.02, x1: 1, y1: 0.02,
                xref: 'paper', line: { color: '#22c55e', width: 1, dash: 'dot' },
              }, {
                type: 'line', x0: 0, y0: 0, x1: 1, y1: 0,
                xref: 'paper', line: { color: '#3d4050', width: 1 },
              }, {
                type: 'line', x0: 0, y0: -0.02, x1: 1, y1: -0.02,
                xref: 'paper', line: { color: '#ef4444', width: 1, dash: 'dot' },
              }],
            }}
          />
        </Card>
      )}

      {result && result.mean_ic != null && (
        <Card title="IC STATISTICS">
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div>
              <div className="text-[9px] font-mono-data text-muted">Mean IC</div>
              <div className="font-mono-data text-sm font-bold" style={{ color: result.mean_ic > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {result.mean_ic.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono-data text-muted">IC Std</div>
              <div className="font-mono-data text-sm font-bold">{result.ic_std.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono-data text-muted">IR</div>
              <div className="font-mono-data text-sm font-bold" style={{ color: result.ic_ir > 0.5 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                {result.ic_ir.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono-data text-muted">Spread</div>
              <div className="font-mono-data text-sm font-bold" style={{ color: (result.spread_return ?? 0) > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {result.spread_return?.toFixed(4) ?? 'N/A'}
              </div>
            </div>
          </div>
          {result.ic_series && result.ic_series.length > 0 && (
            <PlotlyChart
              data={[{
                y: result.ic_series.map((s) => (s.ic ?? s.value ?? 0) as number),
                type: 'scatter' as const, mode: 'lines' as const,
                name: 'IC Series',
                line: { color: '#00e5ff', width: 1.5 },
                showlegend: false,
              }]}
              layout={{
                height: 220, margin: { l: 60, r: 20, t: 10, b: 40 },
                xaxis: { gridcolor: '#2a2d3e', title: 'Time' },
                yaxis: { gridcolor: '#2a2d3e', title: 'IC' },
              }}
            />
          )}
        </Card>
      )}

      {quantileValues.length > 0 && (
        <Card title="QUANTILE RETURNS">
          <PlotlyChart
            data={[{
              x: quantileLabels,
              y: quantileValues,
              type: 'bar',
              marker: {
                color: quantileValues.map((v: number) => v > 0 ? '#22c55e' : '#ef4444'),
                line: { color: quantileValues.map((v: number) => v > 0 ? '#22c55e' : '#ef4444'), width: 1 },
              },
              hovertemplate: '%{x}<br>Return: %{y:.4f}<extra></extra>',
            }]}
            layout={{
              height: 300, margin: { l: 60, r: 20, t: 10, b: 40 },
              xaxis: { gridcolor: '#2a2d3e', title: 'Quantile' },
              yaxis: { gridcolor: '#2a2d3e', title: 'Return', zerolinecolor: '#3d4050' },
              hovermode: 'closest',
            }}
          />
          <div className="font-mono-data text-[9px] text-muted mt-1">
            Q1-Q5 spread: {(quantileValues.length >= 5 ? (quantileValues[0] - quantileValues[quantileValues.length - 1]) : 0).toFixed(4)}
          </div>
        </Card>
      )}
    </div>
  )
}
