import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../store/connection'
import { usePortfolioStore } from '../store/portfolio'
import { Sun, Moon, Monitor } from 'lucide-react'

interface StatusInfo {
  api: boolean
  portfolio: number
  signals: number
  portfolioValue: string
}

function AnimatedDot({ connected }: { connected: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: connected ? 'var(--accent-green)' : 'var(--accent-red)',
        boxShadow: connected ? '0 0 6px var(--accent-green)' : '0 0 6px var(--accent-red)',
        animation: connected ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
        marginRight: 4,
      }}
    />
  )
}

const themeIcons: Record<string, typeof Sun> = {
  classic: Sun, matrix: Moon, amber: Sun, cyber: Monitor, terminal: Monitor, light: Sun, auto: Sun,
}

export default function StatusBar() {
  const { theme, resolvedTheme, cycleTheme } = useTheme()
  const setAPI = useConnectionStore((s) => s.setAPI)
  const storePortfolio = usePortfolioStore((s) => s.portfolio)
  const [status, setStatus] = useState<StatusInfo>({ api: false, portfolio: 0, signals: 0, portfolioValue: '' })
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (storePortfolio) {
      const posCount = storePortfolio.positions ? Object.keys(storePortfolio.positions).length : 0
      const pv = storePortfolio.total_value
        ? `$${storePortfolio.total_value.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
        : ''
      setStatus((prev) => ({ ...prev, portfolio: posCount, portfolioValue: pv }))
    }
  }, [storePortfolio])

  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      try {
        const res = await fetch('/api/health')
        const elapsed = Math.round(performance.now() - t0)
        setLatency(elapsed)
        if (res.ok) {
          setAPI('connected')
          const sig = await fetch('/api/signals/latest').then((r) => r.json()).catch(() => null)
          const sigCount = sig && sig.signals
            ? Object.values(sig.signals).reduce((a: number, b: unknown) => a + (Array.isArray(b) ? b.length : 0), 0) : 0
          setStatus((prev) => ({ ...prev, api: true, signals: sigCount }))
        } else {
          setAPI('disconnected')
          setStatus({ api: false, portfolio: 0, signals: 0, portfolioValue: '' })
        }
      } catch {
        setAPI('disconnected')
        setStatus({ api: false, portfolio: 0, signals: 0, portfolioValue: '' })
        setLatency(null)
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [setAPI])

  const ThemeIcon = themeIcons[theme] || Sun

  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace",
        height: 30,
        padding: '0 12px',
        letterSpacing: '0.02em',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          <AnimatedDot connected={status.api} />
          <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {status.api ? 'LIVE' : 'DOWN'}
          </span>
        </div>
        {latency != null && (
          <span style={{ color: latency < 100 ? 'var(--accent-green)' : latency < 300 ? 'var(--accent-yellow)' : 'var(--accent-red)', fontSize: 8 }}>
            {latency}ms
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>|</span>
        {status.portfolioValue && (
          <>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{status.portfolioValue}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>|</span>
          </>
        )}
        <span style={{ color: 'var(--text-muted)' }}>POS: <span style={{ color: 'var(--text-primary)' }}>{status.portfolio}</span></span>
        <span style={{ color: 'var(--text-muted)' }}>SIG: <span style={{ color: 'var(--text-primary)' }}>{status.signals}</span></span>
        <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>|</span>
        <span style={{ color: 'var(--text-secondary)' }}>{time}</span>
      </div>
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--text-muted)', fontSize: 8, letterSpacing: '0.03em' }}>? for help</span>
        <button
          onClick={cycleTheme}
          className="flex items-center gap-1"
          style={{
            color: 'var(--text-muted)',
            background: 'none', border: 'none', padding: '2px 6px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            cursor: 'pointer', borderRadius: 3,
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          title={`Theme: ${theme}${theme === 'auto' ? ` (${resolvedTheme})` : ''}`}
        >
          <ThemeIcon size={10} />
          <span>{theme.toUpperCase()}{theme === 'auto' ? ` (${resolvedTheme.toUpperCase()})` : ''}</span>
        </button>
      </div>
    </div>
  )
}
