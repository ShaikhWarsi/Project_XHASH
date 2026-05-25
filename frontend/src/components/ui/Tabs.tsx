import { useState, type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || '')

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: active === t.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: active === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
              padding: '8px 16px',
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        {tabs.find((t) => t.id === active)?.content}
      </div>
    </div>
  )
}
