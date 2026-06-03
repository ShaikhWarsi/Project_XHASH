import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import { useApiQuery } from '../hooks/useApiQuery'

interface MarketStatus {
  region: string
  exchange: string
  session: 'PRE' | 'REG' | 'POST' | 'CLOSED'
  local_time: string
  status: 'open' | 'closed' | 'pre' | 'post'
}

const sessionColor = (s: string) =>
  s === 'REG' ? 'var(--accent-green)' : s === 'PRE' || s === 'POST' ? 'var(--accent-yellow)' : 'var(--text-muted)'

export default function WorldMarketsPage() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 10000)
    return () => clearInterval(interval)
  }, [])

  const { data, isLoading } = useApiQuery<any>('/market/global-market/overview')
  const markets: MarketStatus[] = data?.markets ?? []

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="WORLD MARKETS CLOCK" actions={
        <span className="text-[9px] font-mono-data text-muted">{time.toLocaleTimeString()}</span>
      }>
        {isLoading ? (
          <div className="text-[10px] font-mono-data text-muted py-4 text-center">Loading market status...</div>
        ) : markets.length === 0 ? (
          <div className="text-[10px] font-mono-data text-muted">No market data available.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
              <span>Region</span><span>Exchange</span><span>Session</span><span>Local Time</span>
            </div>
            {markets.map((m) => (
              <div key={m.region} className="grid grid-cols-[1fr_1fr_1fr_1.2fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
                <span className="font-semibold">{m.region}</span>
                <span className="text-muted">{m.exchange}</span>
                <span className="font-semibold" style={{ color: sessionColor(m.session) }}>{m.session}</span>
                <span className="text-muted">{m.local_time}</span>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  )
}
