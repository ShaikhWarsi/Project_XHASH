import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function LiveTapePage() {
  const [symbol, setSymbol] = useState('SPY')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alt-data/live-tape?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="LIVE TAPE / TIME & SALES">
        <div className="flex items-center gap-2 mb-2">
          {['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'].map(s => (
            <button key={s} onClick={() => setSymbol(s)} className={`px-2 py-1 rounded text-[10px] font-mono-data ${symbol === s ? 'bg-accent-cyan text-black' : 'bg-secondary text-muted'}`}>{s}</button>
          ))}
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30 ml-auto">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {data?.note && <div className="text-[9px] text-muted mb-1 font-mono-data">{data.note}</div>}

        {data?.summary && (
          <div className="grid grid-cols-5 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL TRADES</div>
              <div className="text-lg font-bold text-primary">{data.summary.totalTrades}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL VOLUME</div>
              <div className="text-lg font-bold text-accent-cyan">{data.summary.totalVolume?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">BUY VOL</div>
              <div className="text-lg font-bold text-green-400">{data.summary.buyVolume?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SELL VOL</div>
              <div className="text-lg font-bold text-red-400">{data.summary.sellVolume?.toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">AVG SIZE</div>
              <div className="text-lg font-bold text-primary">{data.summary.avgTradeSize}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Time</span><span>Price</span><span>Volume</span><span>Value</span><span>Side</span>
        </div>

        {data?.trades?.slice(-50).reverse().map((t: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="text-muted">{t.time}</span>
            <span className="text-accent-cyan">${t.price}</span>
            <span style={{ color: t.side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{t.volume?.toLocaleString()}</span>
            <span className="text-muted">${t.value?.toLocaleString()}</span>
            <Badge label={t.side} variant={t.side === 'buy' ? 'success' : 'error'} size="sm" />
          </div>
        ))}

        {!data?.trades?.length && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Loading live tape data...</div>}
      </Card>
    </div>
  )
}
