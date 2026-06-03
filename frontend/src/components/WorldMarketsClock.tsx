import { useState, useEffect } from 'react'

interface MarketSession {
  exchange: string
  city: string
  timezone: string
  flag: string
  open: string
  close: string
  status: 'open' | 'pre' | 'post' | 'closed'
  nextEvent: string
}

const MARKET_SESSIONS: MarketSession[] = [
  { exchange: 'NYSE', city: 'New York', timezone: 'America/New_York', flag: '🇺🇸', open: '09:30', close: '16:00', status: 'closed', nextEvent: '' },
  { exchange: 'NASDAQ', city: 'New York', timezone: 'America/New_York', flag: '🇺🇸', open: '09:30', close: '16:00', status: 'closed', nextEvent: '' },
  { exchange: 'LSE', city: 'London', timezone: 'Europe/London', flag: '🇬🇧', open: '08:00', close: '16:30', status: 'closed', nextEvent: '' },
  { exchange: 'TSE', city: 'Tokyo', timezone: 'Asia/Tokyo', flag: '🇯🇵', open: '09:00', close: '15:00', status: 'closed', nextEvent: '' },
  { exchange: 'SSE', city: 'Shanghai', timezone: 'Asia/Shanghai', flag: '🇨🇳', open: '09:30', close: '15:00', status: 'closed', nextEvent: '' },
  { exchange: 'HKEX', city: 'Hong Kong', timezone: 'Asia/Hong_Kong', flag: '🇭🇰', open: '09:30', close: '16:00', status: 'closed', nextEvent: '' },
  { exchange: 'EURONEXT', city: 'Paris', timezone: 'Europe/Paris', flag: '🇪🇺', open: '09:00', close: '17:30', status: 'closed', nextEvent: '' },
  { exchange: 'XETRA', city: 'Frankfurt', timezone: 'Europe/Berlin', flag: '🇩🇪', open: '09:00', close: '17:30', status: 'closed', nextEvent: '' },
  { exchange: 'ASX', city: 'Sydney', timezone: 'Australia/Sydney', flag: '🇦🇺', open: '10:00', close: '16:00', status: 'closed', nextEvent: '' },
  { exchange: 'TSX', city: 'Toronto', timezone: 'America/Toronto', flag: '🇨🇦', open: '09:30', close: '16:00', status: 'closed', nextEvent: '' },
  { exchange: 'NSE', city: 'Mumbai', timezone: 'Asia/Kolkata', flag: '🇮🇳', open: '09:15', close: '15:30', status: 'closed', nextEvent: '' },
  { exchange: 'B3', city: 'Sao Paulo', timezone: 'America/Sao_Paulo', flag: '🇧🇷', open: '10:00', close: '17:00', status: 'closed', nextEvent: '' },
]

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getStatus(session: MarketSession, nowMin: number): MarketSession['status'] {
  const open = parseTime(session.open)
  const close = parseTime(session.close)
  if (nowMin >= open && nowMin < close) return 'open'
  if (nowMin >= open - 60 && nowMin < open) return 'pre'
  if (nowMin >= close && nowMin < close + 60) return 'post'
  return 'closed'
}

export default function WorldMarketsClock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const nowMin = time.getUTCHours() * 60 + time.getUTCMinutes()
  const sessionsWithStatus = MARKET_SESSIONS.map(s => ({
    ...s,
    status: getStatus(s, nowMin),
    nextEvent: s.status === 'open' ? `Closes ${s.close} UTC` : `Opens ${s.open} UTC`,
  }))

  const statusColors = { open: '#22c55e', pre: '#f59e0b', post: '#3b82f6', closed: '#5d6b7e' }
  const openCount = sessionsWithStatus.filter(s => s.status === 'open').length

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>World Markets Clock</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>{openCount} markets open · {time.toUTCString()}</div>
        </div>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
        {sessionsWithStatus.map(s => (
          <div key={s.exchange} style={{
            padding: 8, borderRadius: 6,
            background: s.status === 'open' ? 'rgba(34,197,94,0.08)' : 'var(--bg-card, #151c23)',
            border: `1px solid ${s.status === 'open' ? 'rgba(34,197,94,0.3)' : 'var(--border-color, #1a2332)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 14 }}>{s.flag}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>{s.exchange}</span>
              </div>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColors[s.status],
                boxShadow: s.status === 'open' ? `0 0 6px ${statusColors[s.status]}` : 'none',
              }} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 8, marginBottom: 2 }}>{s.city}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{s.open}–{s.close}</span>
              <span style={{
                color: statusColors[s.status], fontWeight: 600, textTransform: 'uppercase' as const,
              }}>
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
