import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

interface EtfData {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  avgVolume: number
  volumeRatio: number
  estimatedFlow: number
  aum: number | null
  flowDirection: string
}

export default function EtfFlowPage() {
  const [data, setData] = useState<{ etfs: EtfData[]; timestamp: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/alt-data/etf-flow')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load ETF flow data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const totalFlow = data?.etfs?.reduce((sum, e) => sum + (e.estimatedFlow || 0), 0) || 0

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="ETF FLOW ANALYSIS">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">
            Refresh
          </button>
          {loading && <span className="text-[10px] text-muted animate-pulse">Loading...</span>}
          {error && <span className="text-[10px] text-red-400">{error}</span>}
          {data?.timestamp && <span className="text-[9px] text-muted ml-auto">Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>}
        </div>

        {data && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL NET FLOW</div>
              <div className="text-lg font-bold" style={{ color: totalFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {totalFlow >= 0 ? '+' : ''}{(totalFlow / 1e6).toFixed(1)}M
              </div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">INFLOWS</div>
              <div className="text-lg font-bold text-green-400">
                {data.etfs?.filter(e => e.flowDirection === 'inflow').length || 0}
              </div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">OUTFLOWS</div>
              <div className="text-lg font-bold text-red-400">
                {data.etfs?.filter(e => e.flowDirection === 'outflow').length || 0}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>ETF</span><span>Price</span><span>Change</span><span>Vol Ratio</span><span>Est. Flow</span><span>Direction</span>
        </div>

        {data?.etfs?.map(e => (
          <div key={e.symbol} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan">{e.symbol}</span>
            <span>${e.price.toFixed(2)}</span>
            <span style={{ color: e.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {e.changePct >= 0 ? '+' : ''}{e.changePct.toFixed(2)}%
            </span>
            <span style={{ color: e.volumeRatio > 1.5 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>
              {e.volumeRatio}x
            </span>
            <span style={{ color: e.estimatedFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {e.estimatedFlow >= 0 ? '+' : ''}{(e.estimatedFlow / 1e6).toFixed(1)}M
            </span>
            <Badge label={e.flowDirection} variant={e.flowDirection === 'inflow' ? 'success' : 'error'} size="sm" />
          </div>
        ))}

        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Loading ETF flow data...</div>}
      </Card>
    </div>
  )
}
