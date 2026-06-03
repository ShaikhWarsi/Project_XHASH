import { useState, useEffect } from 'react'

interface CalendarEvent {
  id: string
  date: string
  time: string
  event: string
  country: string
  category: string
  importance: 'high' | 'medium' | 'low'
  previous: string
  forecast: string
  actual: string
  impact: 'positive' | 'negative' | 'neutral' | null
}

const MOCK_EVENTS: CalendarEvent[] = [
  { id: '1', date: '2026-06-03', time: '08:30', event: 'FOMC Interest Rate Decision', country: 'US', category: 'Central Bank', importance: 'high', previous: '4.50%', forecast: '4.50%', actual: '', impact: null },
  { id: '2', date: '2026-06-03', time: '14:00', event: 'ECB Monetary Policy Statement', country: 'EU', category: 'Central Bank', importance: 'high', previous: '3.25%', forecast: '3.00%', actual: '', impact: null },
  { id: '3', date: '2026-06-04', time: '08:30', event: 'Initial Jobless Claims', country: 'US', category: 'Employment', importance: 'medium', previous: '218K', forecast: '220K', actual: '', impact: null },
  { id: '4', date: '2026-06-05', time: '08:30', event: 'Non-Farm Payrolls (NFP)', country: 'US', category: 'Employment', importance: 'high', previous: '242K', forecast: '235K', actual: '', impact: null },
  { id: '5', date: '2026-06-05', time: '08:30', event: 'Unemployment Rate', country: 'US', category: 'Employment', importance: 'high', previous: '3.9%', forecast: '3.9%', actual: '', impact: null },
  { id: '6', date: '2026-06-06', time: '10:00', event: 'ISM Services PMI', country: 'US', category: 'GDP', importance: 'medium', previous: '51.4', forecast: '51.8', actual: '', impact: null },
  { id: '7', date: '2026-06-07', time: '07:00', event: 'BOJ Interest Rate Decision', country: 'JP', category: 'Central Bank', importance: 'high', previous: '0.25%', forecast: '0.25%', actual: '', impact: null },
  { id: '8', date: '2026-06-10', time: '08:30', event: 'CPI Month-over-Month', country: 'US', category: 'Inflation', importance: 'high', previous: '0.3%', forecast: '0.2%', actual: '', impact: null },
  { id: '9', date: '2026-06-10', time: '08:30', event: 'CPI Year-over-Year', country: 'US', category: 'Inflation', importance: 'high', previous: '3.4%', forecast: '3.3%', actual: '', impact: null },
  { id: '10', date: '2026-06-12', time: '08:30', event: 'Producer Price Index (PPI)', country: 'US', category: 'Inflation', importance: 'medium', previous: '0.5%', forecast: '0.3%', actual: '', impact: null },
  { id: '11', date: '2026-06-13', time: '10:00', event: 'Michigan Consumer Sentiment', country: 'US', category: 'GDP', importance: 'medium', previous: '76.4', forecast: '77.0', actual: '', impact: null },
  { id: '12', date: '2026-06-17', time: '08:30', event: 'Retail Sales Month-over-Month', country: 'US', category: 'GDP', importance: 'medium', previous: '0.2%', forecast: '0.4%', actual: '', impact: null },
  { id: '13', date: '2026-06-19', time: '08:30', event: 'Building Permits', country: 'US', category: 'GDP', importance: 'low', previous: '1.52M', forecast: '1.50M', actual: '', impact: null },
  { id: '14', date: '2026-06-20', time: '08:30', event: 'Philadelphia Fed Index', country: 'US', category: 'GDP', importance: 'low', previous: '12.5', forecast: '11.8', actual: '', impact: null },
  { id: '15', date: '2026-06-21', time: '10:00', event: 'Existing Home Sales', country: 'US', category: 'GDP', importance: 'medium', previous: '4.12M', forecast: '4.15M', actual: '', impact: null },
]

const CATEGORIES = ['All', 'Central Bank', 'Employment', 'Inflation', 'GDP']

export default function EventCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch('/api/calendar/economic')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data)
        else if (data.events) setEvents(data.events)
        else setEvents(MOCK_EVENTS)
      })
      .catch(() => setEvents(MOCK_EVENTS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = events.filter(e => category === 'All' || e.category === category)
  const grouped = filtered.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>Macro Calendar</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>FOMC, ECB, BOJ, CPI, NFP, GDP — Economic events</div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '2px 8px', borderRadius: 3, fontSize: 8, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
              background: category === c ? 'var(--accent-blue)' : 'transparent',
              border: `1px solid ${category === c ? 'var(--accent-blue)' : 'var(--border-color, #1a2332)'}`,
              color: category === c ? '#fff' : 'var(--text-secondary)',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 10 }}>Loading calendar...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 10 }}>No upcoming events for this filter.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date} style={{ background: 'var(--bg-card, #151c23)', border: '1px solid var(--border-color, #1a2332)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color, #1a2332)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{dayEvents.length} events</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Time', 'Event', 'Country', 'Category', 'Imp.', 'Previous', 'Forecast', 'Actual'].map(h => (
                      <th key={h} style={{ padding: '3px 8px', fontSize: 7, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid rgba(26,35,50,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayEvents.map(e => {
                    const impColor = e.importance === 'high' ? '#ef4444' : e.importance === 'medium' ? '#f59e0b' : '#5d6b7e'
                    return (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(26,35,50,0.15)' }}>
                        <td style={{ padding: '3px 8px', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{e.time}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9, color: 'var(--text-primary)', fontWeight: 600 }}>{e.event}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9 }}>{e.country}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9, color: 'var(--text-muted)' }}>{e.category}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: impColor, display: 'inline-block' }} />
                        </td>
                        <td style={{ padding: '3px 8px', fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>{e.previous}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9, color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace' }}>{e.forecast}</td>
                        <td style={{ padding: '3px 8px', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: e.impact === 'positive' ? '#22c55e' : e.impact === 'negative' ? '#ef4444' : 'var(--text-muted)' }}>
                          {e.actual || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
