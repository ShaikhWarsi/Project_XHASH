import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu, Plus, FlaskConical, Activity, Bell, BarChart3 } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileLayout from './MobileLayout'
import MarketTickerBar from './MarketTickerBar'
import CommandPalette from './CommandPalette'
import KeyboardShortcutListener from './KeyboardShortcuts'
import FunctionKeyRibbon from './FunctionKeyRibbon'
import GoCommandBar from './GoCommandBar'
import TimeOfDayBar from './TimeOfDayBar'
import StatusStrip from './StatusStrip'
import GlobalSymbolSearch from './GlobalSymbolSearch'
import BreakingNewsBanner from './BreakingNewsBanner'
import StatusBar from './StatusBar'
import Breadcrumbs from './Breadcrumbs'
import FavoritesBar from './FavoritesBar'
import OfflineBanner from './OfflineBanner'
import TabBar from './TabBar'
import MenuBar from './MenuBar'
import ChatModeInterface from './ChatModeInterface'
import RightSidebar from './rightsidebar/RightSidebar'
import MotdBanner from './rightsidebar/MotdBanner'
import { DistractionFreeProvider, useDistractionFree } from '../contexts/DistractionFreeContext'
import { MultiWindowProvider } from '../contexts/MultiWindowContext'
import { useMultiWindow } from '../hooks/useMultiWindow'
import { TabProvider } from '../contexts/TabContext'
import { useTheme } from '../contexts/ThemeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import useHelp from '../hooks/useHelp'
import ErrorBoundary from './ErrorBoundary'

const quickActions = [
  { label: 'New Backtest', path: '/strategy/backtest', icon: BarChart3 },
  { label: 'New Strategy', path: '/strategy/lab', icon: FlaskConical },
  { label: 'New Alert', path: '/markets/chart', icon: Bell },
  { label: 'New Signal', path: '/markets/signals', icon: Activity },
]

const SWIPE_THRESHOLD = 80

function TerminalLayout() {
  const { setTheme, theme: currentTheme } = useTheme()
  const [showNews] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const { isMobile } = useBreakpoint()
  const { toggleMode } = useInterfaceMode()
  const { helpOverlay } = useHelp()
  const navigate = useNavigate()
  const { distractionFree, toggleDistractionFree } = useDistractionFree()
  const { broadcast } = useMultiWindow({
    onEvent: (event) => {
      if (event.type === 'THEME_CHANGED') {
        setTheme(event.payload.theme as any)
      }
    },
  })
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        toggleMode()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        setRightSidebarOpen((v) => !v)
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        toggleDistractionFree()
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        window.open(window.location.origin, '_blank')
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        window.open(window.location.origin, '_blank')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleMode, toggleDistractionFree])

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

  const quickCreateLayout = showQuickCreate ? (
    <div className="flex h-screen"
      style={{ background: 'var(--bg-primary)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {isMobile ? (
        <MobileLayout>
          <ErrorBoundary category="page">
            <Outlet />
          </ErrorBoundary>
        </MobileLayout>
      ) : (
        <div style={{ display: 'contents' }}>
          {!distractionFree && <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />}
          <div className="flex-1 flex flex-col min-w-0">
            {!distractionFree && <StatusStrip />}
            {!distractionFree && <MenuBar />}
            {!distractionFree && <FunctionKeyRibbon />}
            {!distractionFree && <GoCommandBar />}
            {!distractionFree && <MarketTickerBar />}
            {!distractionFree && <TimeOfDayBar />}
            {!distractionFree && <MotdBanner />}
            {!distractionFree && showNews && <BreakingNewsBanner />}
            {!distractionFree && <OfflineBanner />}
            {!distractionFree && <FavoritesBar />}
            {!distractionFree && <TabBar />}
            <main
              className="flex-1 overflow-y-auto"
              style={{
                background: 'var(--bg-primary)',
                padding: 'var(--space-4)',
              }}
            >
              {!distractionFree && (
                <div className="flex items-center gap-2 mb-2">
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
              {!distractionFree && <Breadcrumbs />}
              <div style={{ animation: 'page-fade-in 0.2s ease' }}>
                <ErrorBoundary category="page">
                  <Outlet />
                </ErrorBoundary>
              </div>
            </main>
            {!distractionFree && <StatusBar />}
          </div>
          {!distractionFree && <RightSidebar open={rightSidebarOpen} onToggle={() => setRightSidebarOpen((v) => !v)} />}
        </div>
      )}
      {distractionFree && (
        <button
          onClick={toggleDistractionFree}
          title="Exit distraction-free mode (Ctrl+Shift+D)"
          className="fixed top-2 right-2 z-50 text-[9px] px-2 py-1 rounded-sm opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          Exit Focus
        </button>
      )}
    </div>
  ) : null

  const content = (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {!distractionFree && <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} isMobile={isMobile} />}
      <div className="flex-1 flex flex-col min-w-0">
        {!distractionFree && isMobile ? null : <StatusStrip />}
        {!distractionFree && isMobile ? null : <MenuBar />}
        {!distractionFree && isMobile ? null : <FunctionKeyRibbon />}
        {!distractionFree && isMobile ? null : <GoCommandBar />}
        {!distractionFree && isMobile ? null : <MarketTickerBar />}
        {!distractionFree && isMobile ? null : <TimeOfDayBar />}
        {!distractionFree && isMobile ? null : <MotdBanner />}
        {!distractionFree && isMobile ? null : showNews && <BreakingNewsBanner />}
        {!distractionFree && isMobile ? null : <OfflineBanner />}
        {!distractionFree && isMobile ? null : <FavoritesBar />}
        {!distractionFree && isMobile ? null : <TabBar />}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            background: 'var(--bg-primary)',
            padding: isMobile ? 'var(--space-2)' : 'var(--space-4)',
          }}
        >
          {!distractionFree && !isMobile && (
            <div className="flex items-center gap-2 mb-2">
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
                {quickCreateLayout}
              </div>
            </div>
          )}
          {!distractionFree && <Breadcrumbs />}
          <div style={{ animation: 'page-fade-in 0.2s ease' }}>
            <ErrorBoundary category="page">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        {!distractionFree && <StatusBar />}
      </div>
      {!distractionFree && <RightSidebar open={rightSidebarOpen} onToggle={() => setRightSidebarOpen((v) => !v)} />}
      {distractionFree && (
        <button
          onClick={toggleDistractionFree}
          title="Exit distraction-free mode (Ctrl+Shift+D)"
          className="fixed top-2 right-2 z-50 text-[9px] px-2 py-1 rounded-sm opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          Exit Focus
        </button>
      )}
      <CommandPalette onThemeChange={setTheme} />
      <GlobalSymbolSearch />
      <KeyboardShortcutListener />
      {helpOverlay}
    </div>
  )

  return content
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
          <MultiWindowProvider>
            <DistractionFreeProvider>
              <TerminalLayout />
            </DistractionFreeProvider>
          </MultiWindowProvider>
        </TabProvider>
      )
  }
}
