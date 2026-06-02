import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
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
import TabBar from './TabBar'
import MenuBar from './MenuBar'
import ChatModeInterface from './ChatModeInterface'
import { TabProvider } from '../contexts/TabContext'
import { useTheme } from '../contexts/ThemeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import useHelp from '../hooks/useHelp'

const quickActions = [
  { label: 'New Backtest', path: '/strategy/backtest', icon: BarChart3 },
  { label: 'New Strategy', path: '/strategy/lab', icon: FlaskConical },
  { label: 'New Alert', path: '/markets/chart', icon: Bell },
  { label: 'New Signal', path: '/markets/signals', icon: Activity },
]

const SWIPE_THRESHOLD = 80

function TerminalLayout() {
  const { setTheme } = useTheme()
  const [showNews] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const { isMobile } = useBreakpoint()
  const { helpOverlay } = useHelp()
  const navigate = useNavigate()
  const location = useLocation()
  const [chartModeOverride, setChartModeOverride] = useState(false)
  const isChartRoute = location.pathname === '/markets/chart'
  const chartMode = isChartRoute || chartModeOverride
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setChartModeOverride(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [isMobile])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > 0) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
  }, [isMobile])

  return (
    <div
      className="flex h-screen"
      data-chart-fullscreen={chartMode ? 'true' : undefined}
      style={{ background: 'var(--bg-primary)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!chartMode && <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />}
      <div className="flex-1 flex flex-col min-w-0">
        {!chartMode && <MenuBar />}
        {!chartMode && <MarketTickerBar />}
        {!chartMode && showNews && <BreakingNewsBanner />}
        {!chartMode && <OfflineBanner />}
        {!chartMode && <FavoritesBar />}
        {!chartMode && <TabBar />}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            background: 'var(--bg-primary)',
            padding: chartMode ? 0 : 'var(--space-4)',
            height: chartMode ? '100vh' : undefined,
            overflow: chartMode ? 'hidden' : undefined,
          }}
        >
          {!chartMode && (
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
          )}
          {!chartMode && <Breadcrumbs />}
          <div style={chartMode ? undefined : { animation: 'page-fade-in 0.2s ease' }}>
            <Outlet />
          </div>
        </main>
        {!chartMode && <StatusBar />}
      </div>
      <CommandPalette onThemeChange={setTheme} />
      <KeyboardShortcutListener />
      {helpOverlay}
    </div>
  )
}

export default function Layout() {
  const { mode } = useInterfaceMode()

  switch (mode) {
    case 'chat':
      return (
        <TabProvider>
          <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
            <ChatModeInterface />
            <CommandPalette onThemeChange={() => {}} />
            <KeyboardShortcutListener />
          </div>
        </TabProvider>
      )
    case 'terminal':
    default:
      return (
        <TabProvider>
          <TerminalLayout />
        </TabProvider>
      )
  }
}
