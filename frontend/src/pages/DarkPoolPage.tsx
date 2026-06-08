import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

interface DarkPoolData {
  date: string
  totalVolume: number
  darkPoolVolume: number
  litVolume: number
  darkPoolPct: number
  close: number
}

export default function DarkPoolPage() {
  const [symbol, setSymbol] = useState('SPY')
  const [data, setData] = useState<{ symbol: string; averageDarkPoolPct: number; recentData: DarkPoolData[]; note: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/alt-data/dark-pool?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load dark pool data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="DARK POOL / BLOCK TRADES">
        <div className="flex items-center gap-2 mb-2">
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="bg-secondary border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary w-24"
            placeholder="Symbol"
          />
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">
            Load
          </button>
          {loading && <span className="text-[10px] text-muted animate-pulse">Loading...</span>}
          {error && <span className="text-[10px] text-red-400">{error}</span>}
        </div>

        {data?.note && <div className="text-[9px] text-muted mb-1 font-mono-data">{data.note}</div>}

        {data && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">AVG DARK POOL %</div>
              <div className="text-lg font-bold text-accent-cyan">{data.averageDarkPoolPct}%</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">DATA POINTS</div>
              <div className="text-lg font-bold text-primary">{data.recentData?.length || 0}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SOURCE</div>
              <div className="text-[10px] text-muted">yfinance (est.)</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Date</span><span>Symbol</span><span>Dark Pool Vol</span><span>Lit Vol</span><span>DP %</span>
        </div>

        {data?.recentData?.map(d => (
          <div key={d.date} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span>{d.date}</span>
            <span className="font-semibold text-accent-cyan">{data.symbol}</span>
            <span>{d.darkPoolVolume.toLocaleString()}</span>
            <span>{d.litVolume.toLocaleString()}</span>
            <span style={{ color: d.darkPoolPct > 50 ? 'var(--accent-red)' : d.darkPoolPct > 40 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
              {d.darkPoolPct}%
            </span>
          </div>
        ))}

        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Select a symbol to load dark pool data.</div>}
      </Card>
    </div>
  )
}
