import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

export default function FootprintChartPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alt-data/order-flow?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="FOOTPRINT / VOLUME CLUSTER">
        <div className="flex items-center gap-2 mb-2">
          {['SPY', 'QQQ', 'AAPL', 'TSLA'].map(s => (
            <button key={s} onClick={() => setSymbol(s)} className={`px-2 py-1 rounded text-[10px] font-mono-data ${symbol === s ? 'bg-accent-cyan text-black' : 'bg-secondary text-muted'}`}>{s}</button>
          ))}
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30 ml-auto">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {data?.summary && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">BID VOLUME</div>
              <div className="text-lg font-bold text-green-400">{data.summary.totalBidVolume?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">ASK VOLUME</div>
              <div className="text-lg font-bold text-red-400">{data.summary.totalAskVolume?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">DELTA (B-A)</div>
              <div className="text-lg font-bold" style={{ color: (data.summary.totalBidVolume - data.summary.totalAskVolume) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {((data.summary.totalBidVolume - data.summary.totalAskVolume) / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">IMBALANCE</div>
              <div className="text-lg font-bold text-accent-cyan">{data.summary.bidAskRatio?.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="text-[9px] text-muted font-mono-data mb-1">VOLUME PROFILE (Price Clusters)</div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Price</span><span>Bid Vol</span><span>Ask Vol</span><span>Delta</span>
        </div>

        {data?.volumeProfile?.slice(0, 20).map((v: any, i: number) => {
          const delta = v.bidVolume - v.askVolume
          const total = v.bidVolume + v.askVolume
          const bidPct = total > 0 ? (v.bidVolume / total * 100) : 50
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
              <span className="font-semibold text-accent-cyan">${v.price}</span>
              <span className="text-green-400">{v.bidVolume?.toLocaleString()}</span>
              <span className="text-red-400">{v.askVolume?.toLocaleString()}</span>
              <span style={{ color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {delta >= 0 ? '+' : ''}{(delta / 1000).toFixed(1)}K
              </span>
            </div>
          )
        })}

        {!data?.volumeProfile?.length && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Select a symbol to view footprint data.</div>}
      </Card>
    </div>
  )
}
