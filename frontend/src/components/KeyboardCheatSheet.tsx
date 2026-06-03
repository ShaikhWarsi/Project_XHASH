import { useState } from 'react'

interface ShortcutGroup {
  label: string
  shortcuts: { keys: string; action: string }[]
}

const GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: 'g + d', action: 'Go to Dashboard' },
      { keys: 'g + c', action: 'Go to Chart' },
      { keys: 'g + p', action: 'Go to Portfolio' },
      { keys: 'g + t', action: 'Go to Trades' },
      { keys: 'g + o', action: 'Go to Orders' },
      { keys: 'g + s', action: 'Go to Signals' },
      { keys: 'g + b', action: 'Go to Backtest' },
      { keys: 'g + /', action: 'Search everything' },
    ],
  },
  {
    label: 'Chart',
    shortcuts: [
      { keys: '+ / -', action: 'Zoom in / out' },
      { keys: '← / →', action: 'Pan left / right' },
      { keys: 'Alt + T', action: 'Toggle trendline tool' },
      { keys: 'Alt + F', action: 'Toggle Fibonacci tool' },
      { keys: 'Alt + R', action: 'Toggle rectangle tool' },
      { keys: 'Ctrl + Z', action: 'Undo last drawing' },
      { keys: 'Escape', action: 'Deselect tool / close panel' },
    ],
  },
  {
    label: 'Trading',
    shortcuts: [
      { keys: 'b', action: 'Quick buy / open order entry' },
      { keys: 's', action: 'Quick sell' },
      { keys: 'Ctrl + Enter', action: 'Submit order' },
      { keys: 'f', action: 'Toggle fill/kill mode' },
      { keys: 'p', action: 'Toggle paper/live mode' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: '?', action: 'Toggle this cheat sheet' },
      { keys: 'Ctrl + K', action: 'Command palette' },
      { keys: 'Ctrl + B', action: 'Toggle sidebar' },
      { keys: 'r', action: 'Refresh data' },
      { keys: 'Ctrl + ,', action: 'Open settings' },
      { keys: 't', action: 'Toggle dark/light theme' },
    ],
  },
]

export default function KeyboardCheatSheet() {
  const [visible, setVisible] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Keyboard Shortcuts (?)"
        style={{
          padding: '4px 8px', fontSize: 9, cursor: 'pointer',
          background: 'var(--bg-card, #0d1117)', border: '1px solid var(--border-color, #1a2332)',
          color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace',
          borderRadius: 3,
        }}
      >
        ⌨ Shortcuts
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 10000, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
    }} onClick={() => setVisible(false)}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #0d1117)',
          border: '1px solid var(--border-color, #1a2332)',
          borderRadius: 8, padding: 16, width: 520, maxHeight: '80vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>Keyboard Shortcuts</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 8, marginLeft: 8 }}>Press ? to toggle</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handlePrint} style={{ padding: '4px 10px', borderRadius: 4, fontSize: 9, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>🖨 Print</button>
            <button onClick={() => setVisible(false)} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>✕ Close</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {GROUPS.map(group => (
            <div key={group.label}>
              <div style={{ color: 'var(--accent-blue)', fontSize: 9, fontWeight: 600, marginBottom: 6, borderBottom: '1px solid var(--border-color, #1a2332)', paddingBottom: 3 }}>
                {group.label}
              </div>
              {group.shortcuts.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', fontSize: 9 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
                  <kbd style={{
                    padding: '1px 5px', borderRadius: 3, fontSize: 8,
                    background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color, #1a2332)', fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
