import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'
import { useApiQuery } from '../hooks/useApiQuery'

interface BondYield {
  tenor: string
  yield_: number
  change: number
  country: string
}

export default function BondYieldsPage() {
  const [historyYears, setHistoryYears] = useState(5)
  const chartRef = useRef<HTMLDivElement>(null)

  const { data: bonds, isLoading, error: queryError } = useApiQuery<BondYield[]>('/market/bond-yields', { history_years: historyYears })

  useEffect(() => {
    if (!chartRef.current || !bonds || bonds.length === 0) return
    let cancelled = false
    import('plotly.js-dist-min').then((Plotly: any) => {
      if (cancelled || !chartRef.current) return
      const usBonds = bonds.filter((b) => b.country === 'US')
      const trace: any = {
        x: usBonds.map((b) => b.tenor),
        y: usBonds.map((b) => b.yield_),
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#3b82f6', width: 2, shape: 'spline' },
        marker: { size: 8 },
        hovertemplate: '%{x}: %{y:.2f}%<extra></extra>',
      }
      Plotly.default.newPlot(chartRef.current, [trace], {
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
        margin: { l: 40, r: 20, t: 10, b: 40 },
        xaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', title: 'Tenor' },
        yaxis: { color: '#666', gridcolor: 'rgba(255,255,255,0.04)', title: 'Yield (%)', tickformat: '.2f' },
      })
    })
    return () => { cancelled = true }
  }, [bonds])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="BOND YIELDS" actions={
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono-data text-muted">History:</span>
          <input type="range" min={1} max={10} value={historyYears} onChange={(e) => setHistoryYears(Number(e.target.value))}
            style={{ width: 80, accentColor: 'var(--accent-blue)' }} />
          <span className="text-[9px] font-mono-data text-primary">{historyYears}y</span>
        </div>
      }>
        {isLoading ? (
          <div className="text-[10px] font-mono-data text-muted py-4 text-center">Loading bond yields...</div>
        ) : queryError ? (
          <div className="text-[10px] font-mono-data text-down py-4 text-center">{String(queryError)}</div>
        ) : !bonds || bonds.length === 0 ? (
          <div className="text-[10px] font-mono-data text-muted">No bond yield data available.</div>
        ) : (
          <>
            <div ref={chartRef} style={{ height: 200, width: '100%', marginBottom: 12 }} />
            <div className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Tenor</span><span>Yield</span><span>Change</span><span>Country</span>
            </div>
            {(bonds || []).map((b: BondYield) => (
              <div key={b.tenor + b.country} className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span className="font-semibold">{b.tenor}</span>
                <span>{b.yield_.toFixed(2)}%</span>
                <span style={{ color: b.change > 0 ? 'var(--accent-red)' : b.change < 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {b.change > 0 ? '+' : ''}{(b.change * 100).toFixed(1)}bp
                </span>
                <span className="text-muted">{b.country}</span>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  )
}
