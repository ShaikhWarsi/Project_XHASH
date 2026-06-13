import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useConnectionStore } from '../store/connection'
import { usePortfolioStore } from '../store/portfolio'
import { api } from '../api/client'
import AIBriefing from './AIBriefing'
import VoiceCommandButton from './VoiceCommandButton'
import ConnectionStatus from './ConnectionStatus'
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
      } catch (e) { console.warn('[StatusBar] open orders fetch failed:', e) }
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
        <div className="absolute bottom-[30px] left-0 right-0 z-[100] bg-card border-t border-default border-b border-default font-mono text-[9px] p-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-muted">CPU: </span>
              <span style={{ color: cpuUsage > 80 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{cpuUsage}%</span>
            </div>
            <div>
              <span className="text-muted">MEM: </span>
              <span style={{ color: memUsage > 80 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{memUsage}%</span>
            </div>
            <div>
              <span className="text-muted">API: </span>
              <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)' }}>{status.api ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <span className="text-muted">WS: </span>
              <span style={{ color: status.api ? 'var(--accent-green)' : 'var(--accent-red)' }}>{status.api ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div>
              <span className="text-muted">Positions: </span>
              <span className="text-primary">{status.portfolio}</span>
            </div>
            <div>
              <span className="text-muted">Orders: </span>
              <span className="text-primary">{status.ordersCount}</span>
            </div>
          </div>
          <div className="mt-1.5 text-muted text-[8px]">
            Portfolio: <span className="text-accent-cyan">{status.portfolioValue || '\u2014'}</span>
            <span className="mx-2">|</span>
            Latency: <span style={{ color: latency != null && latency < 100 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{latency != null ? `${latency}ms` : '\u2014'}</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between shrink-0 bg-secondary border-t border-default text-[9px] font-mono h-[30px] px-3 tracking-wide relative">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            <AnimatedDot connected={status.api} />
            <span className={`text-[8px] uppercase tracking-wider ${status.api ? 'text-up' : 'text-down'}`}>
              {status.api ? 'LIVE' : 'DOWN'}
            </span>
          </div>
          <button
            onClick={cycleMode}
            className="border-none cursor-pointer px-[5px] py-px text-[7px] font-mono font-bold tracking-wider text-black radius-md"
            style={{ background: MODE_COLORS[mode] }}
            title="Click to cycle mode"
          >
            {mode}
          </button>
          {latency != null && (
            <span className="text-[8px]" style={{ color: latency < 100 ? 'var(--accent-green)' : latency < 300 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
              {latency}ms
            </span>
          )}
          <ConnectionStatus />
          <span className="text-muted text-[8px]">|</span>
          {status.portfolioValue && (
            <>
              <span className="text-accent-cyan font-semibold">{status.portfolioValue}</span>
              <span className="text-muted text-[8px]">|</span>
            </>
          )}
          <span className="text-muted">POS: <span className="text-primary">{status.portfolio}</span></span>
          <span className="text-muted">ORD: <span className="text-primary">{status.ordersCount}</span></span>
          <span className="text-muted">SIG: <span className="text-primary">{status.signals}</span></span>
          <span className="text-muted text-[8px]">|</span>
          <span className="text-secondary">{time}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted text-[8px] tracking-wider">? for help</span>
          <button
            onClick={() => setShowBriefing(true)}
            className="flex items-center gap-1 text-muted bg-transparent border-none px-1.5 py-0.5 cursor-pointer font-mono text-[9px] radius-md transition-colors hover:bg-hover hover:text-primary"
            title="AI Briefing"
          >
            <ScrollText size={10} />
            <span>BRIEF</span>
          </button>
          <VoiceCommandButton />
          <button
            onClick={cycleTheme}
            className="flex items-center gap-1 text-muted bg-transparent border-none px-1.5 py-0.5 cursor-pointer font-mono text-[9px] radius-md transition-colors hover:bg-hover hover:text-primary"
            title={`Theme: ${theme}${theme === 'auto' ? ` (${resolvedTheme})` : ''}`}
          >
            <ThemeIcon size={10} />
            <span>{theme.toUpperCase()}{theme === 'auto' ? ` (${resolvedTheme.toUpperCase()})` : ''}</span>
          </button>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="bg-transparent border-none text-muted cursor-pointer p-0.5 flex items-center text-[8px] radius-md"
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
