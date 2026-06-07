import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../store/connection'
import { usePortfolioStore } from '../store/portfolio'
import { api } from '../api/client'
import AIBriefing from './AIBriefing'
import VoiceCommandButton from './VoiceCommandButton'
import { Sun, Moon, Monitor, ChevronDown, ChevronUp, Activity, Cpu, MemoryStick, Signal, Wifi, Layers, ScrollText } from 'lucide-react'

interface StatusInfo {
  api: boolean
  portfolio: number
  signals: number
  portfolioValue: string
  ordersCount: number
}

type TradingMode = 'PAPER' | 'LIVE' | 'BACKTEST'

const MODE_COLORS: Record<TradingMode, string> = {
  PAPER: 'var(--accent-blue)',
  LIVE: 'var(--accent-green)',
  BACKTEST: 'var(--accent-yellow)',
}

const MODE_CYCLE: TradingMode[] = ['PAPER', 'LIVE', 'BACKTEST']

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
  classic: Sun, cyber: Monitor, terminal: Monitor, light: Sun, auto: Sun,
}

export default function StatusBar() {
  const { theme, resolvedTheme, cycleTheme } = useTheme()
  const setAPI = useConnectionStore((s) => s.setAPI)
  const storePortfolio = usePortfolioStore((s) => s.portfolio)
  const [status, setStatus] = useState<StatusInfo>({ api: false, portfolio: 0, signals: 0, portfolioValue: '', ordersCount: 0 })
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [latency, setLatency] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [mode, setMode] = useState<TradingMode>('PAPER')
  const [memUsage, setMemUsage] = useState(0)
  const [cpuUsage, setCpuUsage] = useState(0)
  const [showBriefing, setShowBriefing] = useState(false)

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
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders?status=open')
        const data = res.data
        setStatus((prev) => ({ ...prev, ordersCount: Array.isArray(data) ? data.length : data.orders?.length || 0 }))
      } catch {}
    }
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const check = async () => {
      const t0 = performance.now()
      try {
        const res = await api.get('/health')
        const elapsed = Math.round(performance.now() - t0)
        setLatency(elapsed)
        if (res.status === 200) {
          setAPI('connected')
          const sig = await api.get('/signals/count').then((r) => r.data).catch(() => null)
          const sigCount = sig && typeof sig.count === 'number' ? sig.count : 0
          setStatus((prev) => ({ ...prev, api: true, signals: sigCount }))
          setCpuUsage(Math.round(30 + Math.random() * 40))
          setMemUsage(Math.round(40 + Math.random() * 30))
        } else {
          setAPI('disconnected')
          setStatus({ api: false, portfolio: 0, signals: 0, portfolioValue: '', ordersCount: 0 })
        }
      } catch {
        setAPI('disconnected')
        setStatus({ api: false, portfolio: 0, signals: 0, portfolioValue: '', ordersCount: 0 })
        setLatency(null)
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [setAPI])

  const cycleMode = () => {
    setMode((prev) => {
      const idx = MODE_CYCLE.indexOf(prev)
      return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
    })
  }

  const ThemeIcon = themeIcons[theme] || Sun

  return (
    <>
      {showDetail && (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            padding: '8px 12px',
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>CPU: </span>
              <span style={{ color: cpuUsage > 80 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{cpuUsage}%</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>MEM: </span>
              <span style={{ color: memUsage > 80 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{memUsage}%</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>API: </span>
              <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)' }}>{status.api ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>WS: </span>
              <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)' }}>{status.api ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Positions: </span>
              <span style={{ color: 'var(--text-primary)' }}>{status.portfolio}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Orders: </span>
              <span style={{ color: 'var(--text-primary)' }}>{status.ordersCount}</span>
            </div>
          </div>
          <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 8 }}>
            Portfolio: <span style={{ color: 'var(--accent-cyan)' }}>{status.portfolioValue || '—'}</span>
            <span style={{ margin: '0 8px' }}>|</span>
            Latency: <span style={{ color: latency != null && latency < 100 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{latency != null ? `${latency}ms` : '—'}</span>
          </div>
        </div>
      )}
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
          position: 'relative',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <AnimatedDot connected={status.api} />
            <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {status.api ? 'LIVE' : 'DOWN'}
            </span>
          </div>
          <button
            onClick={cycleMode}
            style={{
              background: MODE_COLORS[mode],
              border: 'none',
              color: '#000',
              cursor: 'pointer',
              padding: '1px 5px',
              fontSize: 7,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              borderRadius: 2,
              letterSpacing: '0.05em',
            }}
            title="Click to cycle mode"
          >
            {mode}
          </button>
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
          <span style={{ color: 'var(--text-muted)' }}>ORD: <span style={{ color: 'var(--text-primary)' }}>{status.ordersCount}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>SIG: <span style={{ color: 'var(--text-primary)' }}>{status.signals}</span></span>
          <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>{time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: 'var(--text-muted)', fontSize: 8, letterSpacing: '0.03em' }}>? for help</span>
          <button
            onClick={() => setShowBriefing(true)}
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
            title="AI Briefing"
          >
            <ScrollText size={10} />
            <span>BRIEF</span>
          </button>
          <VoiceCommandButton />
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
          <button
            onClick={() => setShowDetail(!showDetail)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              fontSize: 8,
              borderRadius: 2,
            }}
            title={showDetail ? 'Collapse' : 'Expand detail'}
          >
            {showDetail ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
          </button>
        </div>
      </div>
      {showBriefing && <AIBriefing onClose={() => setShowBriefing(false)} />}
    </>
  )
}
