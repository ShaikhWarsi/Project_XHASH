import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import { useTerminalShortcuts } from '../hooks/useTerminalShortcuts'
import StatusLine from './StatusLine'
import GoCommandBar from './GoCommandBar'
import TabBar from './TabBar'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import MenuBar from './MenuBar'
import MobileLayout from './MobileLayout'
import CommandPalette from './CommandPalette'
import GlobalSymbolSearch from './GlobalSymbolSearch'
import KeyboardShortcutListener from './KeyboardShortcuts'
import OnboardingModal from './OnboardingModal'
import StartupDiagnostic from './StartupDiagnostic'
import ErrorBoundary from './ErrorBoundary'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useNewsOverlay } from './NewsOverlay'
import { useCalendarOverlay } from './CalendarOverlay'
import { useChatOverlay } from './ChatOverlay'
import { registerGoto } from '../commands/goto'
import { registerTheme } from '../commands/theme'
import { registerAlert } from '../commands/alert'
import { registerWorkspace } from '../commands/workspace'
import { registerNew } from '../commands/new'

const SWIPE_THRESHOLD = 80

export default function TerminalShell() {
  const { setTheme } = useTheme()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuHeld, setMenuHeld] = useState(false)
  const news = useNewsOverlay()
  const calendar = useCalendarOverlay()
  const chat = useChatOverlay()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const menuTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useTerminalShortcuts()

  useEffect(() => {
    registerGoto(navigate)
    registerTheme(setTheme)
    registerAlert()
    registerWorkspace()
    registerNew(navigate)
  }, [navigate, setTheme])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Alt' && e.type === 'keydown' && !menuHeld) {
        e.preventDefault()
        setMenuHeld(true)
        setShowMenu(true)
        menuTimer.current = setTimeout(() => setMenuHeld(false), 2000)
      }
      if (e.key === 'Alt' && e.type === 'keyup') {
        if (menuTimer.current) clearTimeout(menuTimer.current)
        if (!menuHeld) setShowMenu(false)
        setMenuHeld(false)
      }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', handler)
    }
  }, [menuHeld])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); news.toggle() }
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); calendar.toggle() }
      if (e.ctrlKey && e.key === 'j') { e.preventDefault(); chat.toggle() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [news, calendar, chat])

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

  if (isMobile) {
    return (
      <div className="flex h-screen bg-primary" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <MobileLayout>
          <ErrorBoundary category="page">
            <Outlet />
          </ErrorBoundary>
        </MobileLayout>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-primary">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <StatusLine />
        {showMenu && <MenuBar />}
        <GoCommandBar />
        <TabBar />

        <main className="flex-1 overflow-y-auto bg-primary p-4">
          <div style={{ animation: 'page-fade-in 0.2s ease' }}>
            <ErrorBoundary category="page">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        <StatusBar />
      </div>

      <CommandPalette onThemeChange={setTheme} />
      <GlobalSymbolSearch />
      <KeyboardShortcutListener />
      <OnboardingModal />
      <StartupDiagnostic />

      {news.panel}
      {calendar.panel}
      {chat.panel}
    </div>
  )
}
