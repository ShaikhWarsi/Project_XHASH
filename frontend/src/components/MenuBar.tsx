import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'
import { MessageSquare, Terminal } from 'lucide-react'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  separator?: boolean
  disabled?: boolean
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { cycleTheme, density, setDensity, fontSize, setFontSize } = useTheme()
  const { mode, toggleMode } = useInterfaceMode()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    if (openMenu) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [openMenu])

  const closeAll = useCallback(() => setOpenMenu(null), [])

  const menus: MenuGroup[] = [
    {
      label: 'File',
      items: [
        { label: 'New Backtest', shortcut: '^9', action: () => { navigate('/strategy/backtest'); closeAll() } },
        { label: 'New Strategy', shortcut: '', action: () => { navigate('/strategy/lab'); closeAll() } },
        { label: 'New Watchlist', shortcut: '', action: () => { navigate('/markets/watchlist'); closeAll() } },
        { separator: true as any, label: '' },
        { label: 'Toggle Chat Mode', shortcut: '', action: () => { toggleMode(); closeAll() } },
        { separator: true as any, label: '' },
        { label: 'Settings', shortcut: '^O', action: () => { navigate('/settings'); closeAll() } },
      ],
    },
    {
      label: 'Navigate',
      items: [
        { label: 'Dashboard', shortcut: '^1', action: () => { navigate('/'); closeAll() } },
        { label: 'Chart', shortcut: '^2', action: () => { navigate('/markets/chart'); closeAll() } },
        { label: 'Watchlist', shortcut: '^3', action: () => { navigate('/markets/watchlist'); closeAll() } },
        { label: 'Orders', shortcut: '^5', action: () => { navigate('/trading/orders'); closeAll() } },
        { label: 'Portfolio', shortcut: '^6', action: () => { navigate('/trading/portfolio'); closeAll() } },
        { label: 'Risk', shortcut: '^7', action: () => { navigate('/risk'); closeAll() } },
        { label: 'Agents', shortcut: '^8', action: () => { navigate('/ai/agents'); closeAll() } },
        { label: 'Backtest', shortcut: '^9', action: () => { navigate('/strategy/backtest'); closeAll() } },
        { separator: true as any, label: '' },
        { label: 'Alerts', shortcut: '', action: () => { navigate('/alerts'); closeAll() } },
        { label: 'Settings', shortcut: '^O', action: () => { navigate('/settings'); closeAll() } },
      ],
    },
    {
      label: 'View',
      items: [
        {
          label: `Density: ${density === 'compact' ? 'Compact' : 'Normal'}`,
          action: () => { setDensity(density === 'compact' ? 'normal' : 'compact'); closeAll() },
        },
        {
          label: `Font: ${fontSize}px`,
          action: () => { setFontSize(fontSize === 14 ? 12 : fontSize === 12 ? 14 : 14); closeAll() },
        },
        { separator: true as any, label: '' },
        {
          label: 'Cycle Theme',
          shortcut: '',
          action: () => { cycleTheme(); closeAll() },
        },
        { separator: true as any, label: '' },
        {
          label: 'Keyboard Shortcuts',
          shortcut: '?',
          action: () => { closeAll(); window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })) },
        },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', action: () => { closeAll(); window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })) } },
        { separator: true as any, label: '' },
        { label: `Mode: ${mode === 'terminal' ? 'Terminal' : 'Chat'}`, action: () => { toggleMode(); closeAll() } },
      ],
    },
  ]

  return (
    <div
      ref={menuRef}
      style={{
        height: 'var(--menubar-height)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center px-2 shrink-0" style={{ width: 'var(--sidebar-width)' }}>
        <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em' }}>
          TRADEMANIA
        </span>
      </div>
      <div className="flex items-center gap-0 flex-1">
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => { if (openMenu) setOpenMenu(menu.label) }}
              style={{
                padding: '0 10px',
                height: 'var(--menubar-height)',
                background: openMenu === menu.label ? 'var(--bg-hover)' : 'transparent',
                color: openMenu === menu.label ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                whiteSpace: 'nowrap',
              }}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  minWidth: 200,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  zIndex: 60,
                  padding: 4,
                }}
              >
                {menu.items.map((item, i) => {
                  if (item.separator) {
                    return <div key={i} style={{ height: 1, background: 'var(--border-color)', margin: '3px 4px' }} />
                  }
                  return (
                    <button
                      key={i}
                      onClick={item.action}
                      disabled={item.disabled}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '4px 10px',
                        background: 'none',
                        border: 'none',
                        color: item.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        textAlign: 'left',
                        gap: 8,
                        opacity: item.disabled ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.shortcut && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 16 }}>{item.shortcut}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3">
        <button
          onClick={toggleMode}
          title={`Switch to ${mode === 'terminal' ? 'Chat' : 'Terminal'} mode`}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '1px 6px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            borderRadius: 2,
          }}
        >
          {mode === 'terminal' ? <MessageSquare size={9} /> : <Terminal size={9} />}
          <span>{mode === 'terminal' ? 'Chat' : 'Term'}</span>
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, minWidth: 72, textAlign: 'right' }}>
          {time}
        </span>
      </div>
    </div>
  )
}
