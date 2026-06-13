import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useInterfaceMode } from '../contexts/InterfaceModeContext'

const shortcuts: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; action: string }[] = [
  { key: '1', ctrl: true, shift: false, action: '/markets/dashboard' },
  { key: '2', ctrl: true, shift: false, action: '/trading/portfolio' },
  { key: '3', ctrl: true, shift: false, action: '/trading/orders' },
  { key: '4', ctrl: true, shift: false, action: '/markets/chart' },
  { key: '5', ctrl: true, shift: false, action: '/strategy/backtest' },
  { key: '6', ctrl: true, shift: false, action: '/ai/agents' },
  { key: '7', ctrl: true, shift: false, action: '/risk' },
  { key: '8', ctrl: true, shift: false, action: '/settings' },
]

export function useTerminalShortcuts() {
  const navigate = useNavigate()
  const { cycleTheme } = useTheme()
  const { toggleMode } = useInterfaceMode()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (
          e.key === s.key &&
          e.ctrlKey === !!s.ctrl &&
          e.shiftKey === !!s.shift &&
          e.altKey === !!s.alt
        ) {
          e.preventDefault()
          navigate(s.action)
          return
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        cycleTheme()
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        toggleMode()
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        window.open(window.location.origin, '_blank')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, cycleTheme, toggleMode])
}
