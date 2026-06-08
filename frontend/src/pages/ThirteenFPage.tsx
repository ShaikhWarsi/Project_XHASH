import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'

interface Institution {
  holder: string
  shares: number
  pctOut: number
  value: number
  dateReported: string
  type: string
}

export default function ThirteenFPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/alt-data/13f?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load 13F data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="13F INSTITUTIONAL HOLDINGS">
        <div className="flex items-center gap-2 mb-2">
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="bg-secondary border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary w-24" placeholder="Symbol" />
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">Load</button>
          {loading && <span className="text-[10px] text-muted animate-pulse">Loading...</span>}
          {error && <span className="text-[10px] text-red-400">{error}</span>}
        </div>
        {data?.summary && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">INSTITUTIONS</div>
              <div className="text-lg font-bold text-primary">{data.summary.totalInstitutions}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL SHARES</div>
              <div className="text-lg font-bold text-accent-cyan">{(data.summary.totalSharesHeld || 0).toLocaleString()}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL VALUE</div>
              <div className="text-lg font-bold text-green-400">${((data.summary.totalValueHeld || 0) / 1e9).toFixed(1)}B</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOP HOLDER</div>
              <div className="text-[10px] text-accent-cyan font-semibold truncate">{data.summary.topHolder || 'N/A'}</div>
            </div>
          </div>
        )}
        {data?.institutions?.length > 0 && (
          <>
            <div className="text-[9px] text-muted font-mono-data mt-2 mb-1">INSTITUTIONAL HOLDERS</div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Holder</span><span>Shares</span><span>% Out</span><span>Value</span><span>Date</span>
            </div>
            {data.institutions.map((inst: Institution, i: number) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span className="font-semibold text-accent-cyan truncate">{inst.holder}</span>
                <span>{inst.shares.toLocaleString()}</span>
                <span>{inst.pctOut}%</span>
                <span>${(inst.value / 1e9).toFixed(1)}B</span>
                <span className="text-muted">{inst.dateReported}</span>
              </div>
            ))}
          </>
        )}
        {data?.mutualFunds?.length > 0 && (
          <>
            <div className="text-[9px] text-muted font-mono-data mt-2 mb-1">MUTUAL FUND HOLDERS</div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Fund</span><span>Shares</span><span>% Out</span><span>Value</span><span>Date</span>
            </div>
            {data.mutualFunds.map((fund: Institution, i: number) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span className="font-semibold text-accent-cyan truncate">{fund.holder}</span>
                <span>{fund.shares.toLocaleString()}</span>
                <span>{fund.pctOut}%</span>
                <span>${(fund.value / 1e9).toFixed(1)}B</span>
                <span className="text-muted">{fund.dateReported}</span>
              </div>
            ))}
          </>
        )}
        {!data && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Enter a symbol to view 13F holdings.</div>}
      </Card>
    </div>
  )
}
