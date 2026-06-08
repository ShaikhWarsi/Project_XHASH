import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

export default function RealTimeGreeksPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alt-data/greeks?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="REAL-TIME GREEKS">
        <div className="flex items-center gap-2 mb-2">
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="bg-secondary border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary w-24" placeholder="Symbol" />
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {data?.underlyingPrice && (
          <div className="bg-secondary rounded p-2 mb-2">
            <div className="text-[9px] text-muted font-mono-data">UNDERLYING: {data.symbol} @ ${data.underlyingPrice}</div>
            <div className="text-[9px] text-muted font-mono-data">EXPIRATION: {data.expiration} | OPTIONS: {data.options?.length}</div>
          </div>
        )}

        {data?.expirations?.length > 0 && (
          <div className="text-[9px] text-muted font-mono-data mb-1">Available expirations: {data.expirations.slice(0, 5).join(', ')}{data.expirations.length > 5 ? '...' : ''}</div>
        )}

        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Strike</span><span>Type</span><span>Bid</span><span>Ask</span><span>IV</span><span>Delta</span><span>Gamma</span><span>Theta</span>
        </div>

        {data?.options?.map((opt: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span className="font-semibold text-accent-cyan">${opt.strike}</span>
            <span style={{ color: opt.type === 'call' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{opt.type}</span>
            <span className="text-muted">${opt.bid?.toFixed(2)}</span>
            <span className="text-muted">${opt.ask?.toFixed(2)}</span>
            <span>{(opt.impliedVol * 100).toFixed(1)}%</span>
            <span style={{ color: opt.delta > 0.5 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{opt.delta?.toFixed(3)}</span>
            <span className="text-muted">{opt.gamma?.toFixed(4)}</span>
            <span style={{ color: 'var(--accent-red)' }}>{opt.theta?.toFixed(3)}</span>
          </div>
        ))}

        {data?.note && <div className="text-[9px] text-muted mt-2 font-mono-data">{data.note}</div>}
        {!data?.options?.length && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Enter a symbol to view options greeks.</div>}
      </Card>
    </div>
  )
}
