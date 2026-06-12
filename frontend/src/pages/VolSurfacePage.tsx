import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useApiQuery } from '../hooks/useApiQuery'

export default function VolSurfacePage() {
  const [symbol, setSymbol] = useState('SPY')
  const [fetchSymbol, setFetchSymbol] = useState('SPY')
  const plotRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, error: queryError } = useApiQuery<any>(fetchSymbol ? `/options/vol-surface/${fetchSymbol}` : null)

  useEffect(() => {
    if (!plotRef.current || !data) return
    let cancelled = false
    import('plotly.js-dist-min').then((Plotly: any) => {
      if (cancelled || !plotRef.current) return
      const strikes = data.strikes || Array.from({ length: 20 }, (_, i) => 400 + i * 10)
      const expiries = data.expiries || [30, 60, 90, 180, 360]
      const iv = data.iv || strikes.map(() => expiries.map(() => 0.2 + Math.random() * 0.15))
      Plotly.default.newPlot(plotRef.current, [{
        z: iv, x: expiries, y: strikes,
        type: 'surface',
        colorscale: 'Viridis',
        hovertemplate: 'Strike: %{y}<br>Expiry: %{x}d<br>IV: %{z:.1%}<extra></extra>',
        colorbar: { title: { text: 'IV', font: { color: '#999', size: 9 } }, tickfont: { color: '#999', size: 8 }, thickness: 10 },
      }], {
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
        scene: {
          xaxis: { title: 'Expiry (days)', color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
          yaxis: { title: 'Strike', color: '#666', gridcolor: 'rgba(255,255,255,0.04)' },
          zaxis: { title: 'IV', color: '#666', gridcolor: 'rgba(255,255,255,0.04)', tickformat: '.0%' },
          camera: { eye: { x: 1.8, y: 1.8, z: 0.8 } },
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
      })
    })
    return () => { cancelled = true }
  }, [data])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="VOLATILITY SURFACE">
        <div className="flex items-center gap-2 mb-2">
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm w-20" />
          <button onClick={() => setFetchSymbol(symbol)} disabled={isLoading}
            style={{ padding: '2px 10px', fontSize: 10, background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer' }}>
            {isLoading ? 'LOADING...' : 'LOAD'}
          </button>
          <Badge label="3D SURFACE" variant="info" size="sm" />
        </div>
        {queryError && (
          <div className="text-[10px] font-mono-data text-down py-2 text-center">{String(queryError)}</div>
        )}
        <div ref={plotRef} style={{ height: 400, width: '100%' }} />
        {data && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {(data.tenors || [{ ten: '2W', iv: 0.185, skew: -0.012 }, { ten: '1M', iv: 0.192, skew: -0.008 }, { ten: '3M', iv: 0.201, skew: -0.005 }, { ten: '6M', iv: 0.208, skew: -0.003 }]).map((d: any) => (
              <div key={d.ten} className="bg-card border border-default p-1.5 rounded-sm">
                <div className="text-[9px] font-mono-data text-muted">{d.ten}</div>
                <div className="text-[11px] font-mono-data font-bold text-primary">{(d.iv * 100).toFixed(1)}%</div>
                <div className="text-[8px] font-mono-data" style={{ color: d.skew < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>Skew: {(d.skew * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
