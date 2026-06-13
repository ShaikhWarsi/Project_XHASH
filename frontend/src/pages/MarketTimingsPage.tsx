import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/Spinner'
import Breadcrumbs from '../components/Breadcrumbs'
import { fetchMarketTimings, type MarketTimingsResponse } from '../api/marketTimings'

export default function MarketTimingsPage() {
  const [data, setData] = useState<MarketTimingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchMarketTimings()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <Breadcrumbs />
      <h1 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Market Timings</h1>
      {loading && <Spinner label="Loading timings..." />}
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}
      {data && (
        <>
          <Card title={`Status — ${data.date} (${data.day})`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Market</span>
              <Badge label={data.market_status.toUpperCase()} variant={data.market_status === 'open' ? 'success' : 'error'} />
              {data.is_weekend && <span style={{ color: '#f59e0b' }}>Weekend</span>}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>Refresh page to recheck</div>
          </Card>

          <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 8 }}>
            {Object.entries(data.timings).map(([exchange, timing]) => (
              <Card key={exchange} title={exchange}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{timing.description}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Open</span>
                  <span style={{ color: 'var(--text-primary)' }}>{timing.open}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Close</span>
                  <span style={{ color: 'var(--text-primary)' }}>{timing.close}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <Badge label={timing.status} variant={timing.status === 'open' ? 'success' : 'error'} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
