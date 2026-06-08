import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function ShortInterestPage() {
  const [symbol, setSymbol] = useState('GME')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/alt-data/short-interest?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load short interest data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="SHORT INTEREST">
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

        {data && !data.error && (
          <div className="grid grid-cols-5 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">% FLOAT SHORT</div>
              <div className="text-lg font-bold" style={{ color: (data.shortPercentOfFloat || 0) > 20 ? 'var(--accent-red)' : (data.shortPercentOfFloat || 0) > 10 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                {data.shortPercentOfFloat || 0}%
              </div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SHARES SHORT</div>
              <div className="text-lg font-bold text-primary">{(data.sharesShort || 0).toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">DAYS TO COVER</div>
              <div className="text-lg font-bold text-accent-cyan">{data.daysToCover || 'N/A'}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">CHANGE (MOM)</div>
              <div className="text-lg font-bold" style={{ color: (data.changePct || 0) > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                {data.changePct > 0 ? '+' : ''}{data.changePct || 0}%
              </div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SENTIMENT</div>
              <Badge
                label={data.sentiment || 'unknown'}
                variant={data.sentiment === 'squeeze_risk' ? 'error' : data.sentiment === 'high_short' ? 'warning' : 'default'}
                size="sm"
              />
            </div>
          </div>
        )}

        {data?.priceHistory?.length > 0 && (
          <div className="mt-2">
            <div className="text-[9px] text-muted font-mono-data mb-1">RECENT PRICE HISTORY</div>
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Date</span><span>Close</span><span>Volume</span>
            </div>
            {data.priceHistory.slice(-10).map((p: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span>{p.date}</span>
                <span className="text-accent-cyan">${p.close.toFixed(2)}</span>
                <span className="text-muted">{p.volume.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Enter a symbol to view short interest data.</div>}
      </Card>
    </div>
  )
}
