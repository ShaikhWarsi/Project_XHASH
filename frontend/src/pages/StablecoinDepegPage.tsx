import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function StablecoinDepegPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/alt-data/stablecoin-depeg')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load stablecoin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="STABLECOIN DEPEG MONITOR">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">Refresh</button>
          {loading && <span className="text-[10px] text-muted animate-pulse">Loading...</span>}
          {error && <span className="text-[10px] text-red-400">{error}</span>}
          {data?.timestamp && <span className="text-[9px] text-muted ml-auto">Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>}
        </div>
        {data?.note && <div className="text-[9px] text-muted mb-1 font-mono-data">{data.note}</div>}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Coin</span><span>Price</span><span>Deviation</span><span>Volume (24h)</span><span>Status</span>
        </div>
        {data?.stablecoins?.map((d: any) => (
          <div key={d.symbol} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan">{d.symbol}</span>
            <span>${d.price?.toFixed(6)}</span>
            <span style={{ color: d.severity === 'critical' ? 'var(--accent-red)' : d.severity === 'warning' ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
              {d.depegPct > 0 ? `${d.depegPct}%` : 'Pegged'}
            </span>
            <span className="text-muted">${(d.volume24h / 1e9).toFixed(1)}B</span>
            <Badge label={d.severity} variant={d.severity === 'critical' ? 'error' : d.severity === 'warning' ? 'warning' : 'success'} size="sm" />
          </div>
        ))}
        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Loading stablecoin data...</div>}
      </Card>
    </div>
  )
}
