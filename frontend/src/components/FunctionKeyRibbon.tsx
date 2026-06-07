import { useNavigate } from 'react-router-dom'

interface FnKey {
  key: string
  label: string
  action: () => void
  color?: string
}

const FN_KEYS: { key: string; label: string; path?: string; color?: string; action?: string }[] = [
  { key: 'F1', label: 'HELP', action: 'help' },
  { key: 'F2', label: 'SEARCH', action: 'search' },
  { key: 'F3', label: 'CHART', path: '/markets/chart' },
  { key: 'F4', label: 'BUY', path: '/trading/paper-trading?side=buy', color: 'var(--accent-green)' },
  { key: 'F5', label: 'SELL', path: '/trading/paper-trading?side=sell', color: 'var(--accent-red)' },
  { key: 'F6', label: 'FLAT', path: '/trading/orders' },
  { key: 'F7', label: 'CANCEL', path: '/trading/orders' },
  { key: 'F8', label: 'ORDER', path: '/trading/orders' },
  { key: 'F9', label: 'PORTFOLIO', path: '/trading/portfolio' },
  { key: 'F10', label: 'SETTINGS', path: '/settings' },
  { key: 'F11', label: 'FULLSCREEN', action: 'fullscreen' },
  { key: 'F12', label: 'CMD PALETTE', action: 'command-palette' },
]

export default function FunctionKeyRibbon() {
  const navigate = useNavigate()

  const handleAction = (item: typeof FN_KEYS[number]) => {
    if (item.path) {
      navigate(item.path)
    } else if (item.action === 'help') {
      window.dispatchEvent(new CustomEvent('opencode:help'))
    } else if (item.action === 'search') {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '.' }))
    } else if (item.action === 'fullscreen') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen()
      else document.exitFullscreen()
    } else if (item.action === 'command-palette') {
      window.dispatchEvent(new CustomEvent('opencode:command-palette'))
    }
  }

  return (
    <div className="flex items-stretch gap-0 px-1 py-0.5 bg-card border-b border-default select-none" style={{ minHeight: 22 }}>
      {FN_KEYS.map((item) => (
        <button
          key={item.key}
          onClick={() => handleAction(item)}
          title={`${item.key} — ${item.label}`}
          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono-data font-bold cursor-pointer border-r border-default last:border-r-0 hover:bg-hover transition-colors whitespace-nowrap"
          style={{ color: item.color || 'var(--text-secondary)' }}
        >
          <span className="text-muted text-[7px]">{item.key}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
