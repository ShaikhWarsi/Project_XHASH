import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/Spinner'
import Breadcrumbs from '../components/Breadcrumbs'
import { fetchMarketHolidays, type MarketHoliday } from '../api/marketHolidays'

export default function MarketHolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState<MarketHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (y: number) => {
    setLoading(true); setError('')
    try {
      const data = await fetchMarketHolidays(y)
      setHolidays(data.holidays || [])
    } catch (e: any) {
      setError(e.message || 'Failed to fetch')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(year) }, [year, load])

  const today = new Date()
  const upcoming = holidays.filter(h => new Date(h.date) >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = holidays.filter(h => new Date(h.date) < today).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <Breadcrumbs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Market Holidays</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {[2024, 2025, 2026].map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: '3px 10px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
              background: year === y ? 'var(--accent-blue)' : 'transparent',
              border: `1px solid ${year === y ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
              color: year === y ? '#fff' : 'var(--text-secondary)', borderRadius: 3,
            }}>{y}</button>
          ))}
        </div>
      </div>
      {loading && <Spinner label="Loading holidays..." />}
      {error && <div style={{ color: '#ef4444', marginBottom: 8 }}>{error}</div>}
      {!loading && holidays.length === 0 && !error && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>
          No holiday data for {year}
        </div>
      )}
      {!loading && holidays.length > 0 && (
        <Card title={`${year} — ${holidays.length} holidays`}>
          <div className="flex items-center border-b border-default py-0.5 font-mono-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-24">Date</span>
            <span className="w-16">Day</span>
            <span className="flex-1">Description</span>
            <span className="w-12 text-right">Upcoming?</span>
          </div>
          {upcoming.map((h, i) => <HolidayRow key={`up-${i}`} h={h} upcoming />)}
          {past.length > 0 && upcoming.length > 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '8px 0', fontSize: 9 }}>─ past ─</div>
          )}
          {past.map((h, i) => <HolidayRow key={`past-${i}`} h={h} upcoming={false} />)}
        </Card>
      )}
    </div>
  )
}

function HolidayRow({ h, upcoming }: { h: MarketHoliday; upcoming: boolean }) {
  return (
    <div className="flex items-center py-0.5 font-mono-data text-[10px]" style={{
      borderBottom: '1px solid rgba(128,128,128,0.08)',
      color: 'var(--text-primary)',
      opacity: upcoming ? 1 : 0.5,
    }}>
      <span className="w-24">{h.date}</span>
      <span className="w-16">{h.day}</span>
      <span className="flex-1">{h.description}</span>
      <span className="w-12 text-right">
        {upcoming ? <Badge label="Soon" variant="warning" /> : <span style={{ color: 'var(--text-muted)' }}>Past</span>}
      </span>
    </div>
  )
}
