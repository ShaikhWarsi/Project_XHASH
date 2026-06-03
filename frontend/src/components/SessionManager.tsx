import { useState } from 'react'
import { DEFAULT_SESSION_TEMPLATES, type SessionTemplate } from '../data/sessionTemplates'

interface Props {
  onSelectTemplate?: (template: SessionTemplate) => void
  onToggleKillZone?: (show: boolean) => void
}

export default function SessionManager({ onSelectTemplate, onToggleKillZone }: Props) {
  const [templates] = useState(DEFAULT_SESSION_TEMPLATES)
  const [activeId, setActiveId] = useState<string>(DEFAULT_SESSION_TEMPLATES[0]?.id ?? '')
  const [showKillZones, setShowKillZones] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const active = templates.find(t => t.id === activeId) ?? templates[0]

  const handleSelect = (id: string) => {
    setActiveId(id)
    const tpl = templates.find(t => t.id === id)
    if (tpl) onSelectTemplate?.(tpl)
  }

  const handleToggleKill = () => {
    const next = !showKillZones
    setShowKillZones(next)
    onToggleKillZone?.(next)
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          padding: '2px 6px', fontSize: 9, cursor: 'pointer',
          background: 'var(--bg-card, #0d1117)', border: '1px solid var(--border-color, #1a2332)',
          color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        SESSIONS ▸
      </button>
    )
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 4, padding: 8, width: 240,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 9 }}>SESSIONS</span>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}
        >
          ▾
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 6 }}>
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            style={{
              padding: '2px 6px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
              background: activeId === t.id ? t.color : 'transparent',
              border: `1px solid ${activeId === t.id ? t.color : 'var(--border-color, #1a2332)'}`,
              color: activeId === t.id ? '#000' : 'var(--text-secondary)',
              fontWeight: activeId === t.id ? 600 : 400,
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {active && (
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 8, marginBottom: 4 }}>{active.description}</div>
          {active.sessions.map((s, i) => {
            const isKz = showKillZones && s.killZoneStart && s.killZoneEnd
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '2px 4px', borderRadius: 2, marginBottom: 1,
                background: isKz ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderLeft: isKz ? `2px solid ${active.color}` : '2px solid transparent',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {s.open}–{s.close}
                </span>
                {isKz && (
                  <span style={{ color: '#ef4444', fontSize: 7 }}>
                    ⚡{s.killZoneStart}–{s.killZoneEnd}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 8 }}>
          <input
            type="checkbox"
            checked={showKillZones}
            onChange={handleToggleKill}
            style={{ accentColor: '#ef4444' }}
          />
          Show Kill Zones
        </label>
      </div>
    </div>
  )
}
