import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

export default function LiquidationMapPage() {
  const [symbol, setSymbol] = useState('BTC')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alt-data/liquidation-map?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="LIQUIDATION MAP">
        <div className="flex items-center gap-2 mb-2">
          {['BTC', 'ETH', 'SOL'].map(s => (
            <button key={s} onClick={() => setSymbol(s)} className={`px-2 py-1 rounded text-[10px] font-mono-data ${symbol === s ? 'bg-accent-cyan text-black' : 'bg-secondary text-muted'}`}>{s}</button>
          ))}
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30 ml-auto">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {data?.summary && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">CURRENT PRICE</div>
              <div className="text-lg font-bold text-accent-cyan">${data.currentPrice?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">LONG EXPOSURE</div>
              <div className="text-lg font-bold text-green-400">${(data.summary.totalLongExposure / 1e6).toFixed(1)}M</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SHORT EXPOSURE</div>
              <div className="text-lg font-bold text-red-400">${(data.summary.totalShortExposure / 1e6).toFixed(1)}M</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">L/S RATIO</div>
              <div className="text-lg font-bold text-primary">{data.summary.longShortRatio?.toFixed(2)}</div>
            </div>
          </div>
        )}

        {data?.note && <div className="text-[9px] text-muted mb-1 font-mono-data">{data.note}</div>}

        {data?.longLiquidations?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] text-green-400 font-mono-data mb-1">LONG LIQUIDATION LEVELS</div>
              {data.longLiquidations.slice(0, 15).map((l: any, i: number) => (
                <div key={i} className="flex justify-between py-0.5 border-b border-default text-[10px] font-mono-data">
                  <span className="text-primary">${l.price?.toLocaleString()}</span>
                  <span className="text-muted">{l.leverage}</span>
                  <span className="text-red-400">${(l.estimatedLiquidations / 1e6).toFixed(1)}M</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] text-red-400 font-mono-data mb-1">SHORT LIQUIDATION LEVELS</div>
              {data.shortLiquidations.slice(0, 15).map((l: any, i: number) => (
                <div key={i} className="flex justify-between py-0.5 border-b border-default text-[10px] font-mono-data">
                  <span className="text-primary">${l.price?.toLocaleString()}</span>
                  <span className="text-muted">{l.leverage}</span>
                  <span className="text-green-400">${(l.estimatedLiquidations / 1e6).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Select a symbol to view liquidation map.</div>}
      </Card>
    </div>
  )
}
