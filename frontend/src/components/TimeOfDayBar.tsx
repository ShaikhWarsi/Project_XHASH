import { useState, useEffect } from 'react'

interface SessionInfo {
  label: string
  status: 'pre' | 'open' | 'close' | 'after' | 'closed'
  countdown: string
  color: string
}

function computeSession(): SessionInfo {
  const now = new Date()
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const h = ny.getHours()
  const m = ny.getMinutes()
  const totalMinutes = h * 60 + m

  const preOpen = 4 * 60
  const open = 9 * 60 + 30
  const close = 16 * 60
  const afterClose = 20 * 60

  const fmt = (mins: number) => {
    const d = Math.abs(mins - totalMinutes)
    const hh = Math.floor(d / 60)
    const mm = d % 60
    return `${hh}h ${mm}m`
  }

  if (ny.getDay() === 0 || ny.getDay() === 6) {
    return { label: 'CLOSED', status: 'closed', countdown: '', color: 'var(--accent-red)' }
  }
  if (totalMinutes < preOpen) {
    return { label: 'CLOSED', status: 'closed', countdown: `Opens in ${fmt(preOpen)}`, color: 'var(--accent-red)' }
  }
  if (totalMinutes >= preOpen && totalMinutes < open) {
    return { label: 'PRE-MARKET', status: 'pre', countdown: `Opens in ${fmt(open)}`, color: 'var(--accent-yellow)' }
  }
  if (totalMinutes >= open && totalMinutes < close) {
    return { label: 'OPEN', status: 'open', countdown: `Closes in ${fmt(close)}`, color: 'var(--accent-green)' }
  }
  if (totalMinutes >= close && totalMinutes < afterClose) {
    return { label: 'AFTER-HOURS', status: 'after', countdown: `Closes in ${fmt(afterClose)}`, color: 'var(--accent-orange)' }
  }
  return { label: 'CLOSED', status: 'closed', countdown: `Opens in ${fmt(24 * 60 + preOpen)}`, color: 'var(--accent-red)' }
}

export default function TimeOfDayBar() {
  const [session, setSession] = useState<SessionInfo>(computeSession)

  useEffect(() => {
    const tick = setInterval(() => setSession(computeSession()), 10_000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 select-none" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: session.color }} />
      <span className="font-mono-data text-[9px] font-bold tracking-wider" style={{ color: session.color }}>{session.label}</span>
      {session.countdown && (
        <span className="font-mono-data text-[8px] text-muted ml-0.5">{session.countdown}</span>
      )}
    </div>
  )
}
