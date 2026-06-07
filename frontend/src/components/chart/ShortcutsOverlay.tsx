import { X } from 'lucide-react'

interface Shortcut {
  key: string
  label: string
}

const SHORTCUTS: Shortcut[] = [
  { key: 'Arrow Left/Right', label: 'Move crosshair' },
  { key: 'Arrow Up/Down', label: 'Nudge price' },
  { key: '+ / -', label: 'Zoom in / out' },
  { key: 'Shift + L', label: 'Lock crosshair' },
  { key: 'Escape', label: 'Deselect tool' },
  { key: 'Ctrl + E', label: 'Export chart' },
  { key: 'F', label: 'Toggle fullscreen' },
  { key: 'R', label: 'Toggle replay mode' },
  { key: 'I', label: 'Focus indicator search' },
  { key: 'S', label: 'Toggle structure overlay' },
  { key: 'B', label: 'Open order entry (BUY)' },
  { key: 's', label: 'Open order entry (SELL)' },
  { key: 'D', label: 'Toggle depth chart' },
  { key: 'V', label: 'Toggle volume profile' },
  { key: 'Ctrl + Space', label: 'Open symbol search' },
  { key: 'g', label: 'Start date jump' },
  { key: 'G', label: 'Go to date (after typing digits)' },
  { key: 'Shift+Click Legend', label: 'Solo indicator' },
]

interface ShortcutsOverlayProps {
  onClose: () => void
}

export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 8, padding: 16,
        width: 400, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}>KEYBOARD SHORTCUTS</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          {SHORTCUTS.map((sc, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--accent-cyan)', fontSize: 9, fontWeight: 500 }}>{sc.key}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 9 }}>{sc.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
