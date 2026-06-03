import { useNavigate } from 'react-router-dom'

interface FnKey {
  key: string
  label: string
  action: () => void
  color?: string
}

const FN_KEYS: { key: string; label: string; path?: string; color?: string }[] = [
  { key: 'F1', label: 'BUY', color: 'var(--accent-green)' },
  { key: 'F2', label: 'SELL', color: 'var(--accent-red)' },
  { key: 'F3', label: 'FLAT', color: 'var(--accent-yellow)' },
  { key: 'F4', label: 'CANCEL ALL', color: 'var(--accent-orange)' },
  { key: 'F5', label: 'NEW ORDER', color: 'var(--accent-blue)' },
  { key: 'F6', label: 'CHART', path: '/markets/chart' },
  { key: 'F7', label: 'OPTIONS', path: '/markets/options' },
  { key: 'F8', label: 'NEWS', path: '/research/geo' },
  { key: 'F9', label: 'MESSAGE', path: '/ai/llm' },
  { key: 'F10', label: 'HELP' },
  { key: 'F11', label: 'ALERTS', path: '/alerts' },
  { key: 'F12', label: 'SETTINGS', path: '/settings' },
]

export default function FunctionKeyRibbon() {
  const navigate = useNavigate()

  const handleAction = (item: typeof FN_KEYS[number]) => {
    if (item.path) {
      navigate(item.path)
    } else if (item.key === 'F1') {
      navigate('/trading/paper-trading')
    } else if (item.key === 'F2') {
      navigate('/trading/paper-trading')
    } else if (item.key === 'F3') {
      navigate('/trading/orders')
    } else if (item.key === 'F4') {
      navigate('/trading/orders')
    } else if (item.key === 'F5') {
      navigate('/trading/orders')
    } else if (item.key === 'F10') {
      window.dispatchEvent(new CustomEvent('opencode:help'))
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
