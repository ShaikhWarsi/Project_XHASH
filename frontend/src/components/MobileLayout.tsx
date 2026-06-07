import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CandlestickChart, Wallet, ArrowLeftRight,
  Bot, Star, Settings,
} from 'lucide-react'

const TABS = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Chart', path: '/markets/chart', icon: CandlestickChart },
  { label: 'Portfolio', path: '/trading/portfolio', icon: Wallet },
  { label: 'Orders', path: '/trading/orders', icon: ArrowLeftRight },
  { label: 'Agents', path: '/ai/council', icon: Bot },
  { label: 'Watchlist', path: '/markets/watchlist', icon: Star },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function MobileLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      <main className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-2)', paddingBottom: 0 }}>
        {children}
      </main>
      <nav className="flex items-center justify-around shrink-0 border-t border-default bg-card z-50" style={{ minHeight: 52 }}>
        {TABS.map((t) => {
          const active = location.pathname === t.path || (t.path !== '/' && location.pathname.startsWith(t.path))
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1 cursor-pointer border-none"
              style={{
                background: 'transparent',
                color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
              aria-label={t.label}
              role="tab"
              aria-selected={active}
            >
              <t.icon size={18} />
              <span className="text-[8px] font-mono-data font-bold">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
