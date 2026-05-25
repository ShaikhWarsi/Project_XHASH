import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../store/connection'
import ConnectionIndicator from './ConnectionIndicator'

interface StatusInfo {
  api: boolean
  portfolio: number
  signals: number
  serverTime: string
}

export default function StatusBar() {
  const { theme, resolvedTheme, cycleTheme } = useTheme()
  const setAPI = useConnectionStore((s) => s.setAPI)
  const [status, setStatus] = useState<StatusInfo>({ api: false, portfolio: 0, signals: 0, serverTime: '' })
  const [time, setTime] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          setAPI('connected')
          const [port, sig] = await Promise.allSettled([
            fetch('/api/portfolio').then((r) => r.json()),
            fetch('/api/signals/latest').then((r) => r.json()),
          ])
          const posCount = port.status === 'fulfilled' && port.value?.positions
            ? Object.keys(port.value.positions).length : 0
          const sigCount = sig.status === 'fulfilled' && sig.value?.signals
            ? Object.values(sig.value.signals).reduce((a: number, b: unknown) => a + (Array.isArray(b) ? b.length : 0), 0) : 0
          setStatus({ api: true, portfolio: posCount, signals: sigCount, serverTime: time })
        } else {
          setAPI('disconnected')
          setStatus({ api: false, portfolio: 0, signals: 0, serverTime: '' })
        }
      } catch {
        setAPI('disconnected')
        setStatus({ api: false, portfolio: 0, signals: 0, serverTime: '' })
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [time, setAPI])

  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        height: 22,
        padding: '0 10px',
        letterSpacing: '0.02em',
      }}
    >
      <div className="flex items-center gap-2">
        <ConnectionIndicator />
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>POS: {status.portfolio}</span>
        <span style={{ color: 'var(--text-muted)' }}>SIG: {status.signals}</span>
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <span style={{ color: 'var(--text-muted)' }}>{time}</span>
      </div>
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--text-muted)' }}>? for help</span>
        <span style={{ color: 'var(--text-muted)' }}>|</span>
        <button
          onClick={cycleTheme}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
          title="Toggle Theme"
        >
          [{theme.toUpperCase()}{theme === 'auto' ? ` (${resolvedTheme})` : ''}]
        </button>
      </div>
    </div>
  )
}
