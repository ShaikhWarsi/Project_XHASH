import { useState, useCallback, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, Plus, FlaskConical, Activity, Bell, BarChart3 } from 'lucide-react'
import Sidebar from './Sidebar'
import MarketTickerBar from './MarketTickerBar'
import CommandPalette from './CommandPalette'
import KeyboardShortcutListener from './KeyboardShortcuts'
import BreakingNewsBanner from './BreakingNewsBanner'
import StatusBar from './StatusBar'
import Breadcrumbs from './Breadcrumbs'
import FavoritesBar from './FavoritesBar'
import OfflineBanner from './OfflineBanner'
import { useTheme } from '../contexts/ThemeContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import useHelp from '../hooks/useHelp'

const quickActions = [
  { label: 'New Backtest', path: '/strategy/backtest', icon: BarChart3 },
  { label: 'New Strategy', path: '/strategy/lab', icon: FlaskConical },
  { label: 'New Alert', path: '/markets/chart', icon: Bell },
  { label: 'New Signal', path: '/markets/signals', icon: Activity },
]

const SWIPE_THRESHOLD = 80

export default function Layout() {
  const { setTheme } = useTheme()
  const [showNews] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const { isMobile } = useBreakpoint()
  const { helpOverlay } = useHelp()
  const navigate = useNavigate()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
  }, [])

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }} onTouchStart={isMobile ? handleTouchStart : undefined} onTouchEnd={isMobile ? handleTouchEnd : undefined}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <MarketTickerBar />
        {showNews && <BreakingNewsBanner />}
        <OfflineBanner />
        <FavoritesBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--bg-primary)' }}>
          <div className="flex items-center gap-2 mb-2">
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="flex items-center gap-1 shrink-0 px-3 rounded-md cursor-pointer"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    minHeight: 36,
                    minWidth: 44,
                    fontSize: 13,
                  }}
                  aria-label="Open sidebar"
                >
                  <Menu size={18} />
                  Menu
                </button>
              )}
            <div className="relative">
              <button
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-sm cursor-pointer font-mono text-[10px] font-bold"
                style={{
                  background: 'var(--accent-cyan)',
                  border: 'none',
                  color: '#000',
                }}
                aria-label="Quick create"
              >
                <Plus size={14} />
                New
              </button>
              {showQuickCreate && (
                <div
                  className="absolute top-full left-0 mt-1 z-40 overflow-hidden rounded-md"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    minWidth: 160,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        setShowQuickCreate(false)
                        navigate(action.path)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-[10px] font-mono text-left cursor-pointer"
                      style={{
                        color: 'var(--text-primary)',
                        background: 'none',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <action.icon size={12} style={{ color: 'var(--text-muted)' }} />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Breadcrumbs />
          <div style={{ animation: 'page-fade-in 0.2s ease' }}>
            <Outlet />
          </div>
        </main>
        <StatusBar />
      </div>
      <CommandPalette onThemeChange={setTheme} />
      <KeyboardShortcutListener />
      {helpOverlay}
    </div>
  )
}
