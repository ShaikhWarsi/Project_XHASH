import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export default function FundingRatePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alt-data/funding-rates')
      const json = await res.json()
      setData(json)
    } catch (e) { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="FUNDING RATES (PERPS)">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          {data?.note && <span className="text-[9px] text-muted">{data.note}</span>}
        </div>

        {data?.exchanges?.map((ex: any) => (
          <div key={ex.exchange} className="mb-3">
            <div className="text-[10px] text-accent-cyan font-mono-data font-bold mb-1 uppercase">{ex.exchange}</div>
            <div className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Symbol</span><span>Rate</span><span>Annualized</span><span>Mark Price</span><span>Trend</span>
            </div>
            {ex.fundingRates?.map((fr: any) => (
              <div key={fr.symbol} className="grid grid-cols-[1fr_0.8fr_0.8fr_1fr_0.5fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span className="font-semibold text-accent-cyan">{fr.symbol}</span>
                <span style={{ color: fr.fundingRate < 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {fr.fundingRate >= 0 ? '+' : ''}{fr.fundingRate}%
                </span>
                <span style={{ color: fr.annualized > 50 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                  {fr.annualized}%
                </span>
                <span className="text-muted">${fr.markPrice?.toLocaleString()}</span>
                <Badge label={fr.fundingRate >= 0 ? 'long' : 'short'} variant={fr.fundingRate >= 0 ? 'success' : 'error'} size="sm" />
              </div>
            ))}
          </div>
        ))}

        {!data?.exchanges?.length && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Loading funding rate data from exchanges...</div>}
      </Card>
    </div>
  )
}
