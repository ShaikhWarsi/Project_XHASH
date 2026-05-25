import { useState, useMemo } from 'react'

interface AuditEntry {
  id: string
  action: string
  timestamp: string
  details: string
  user?: string
}

interface AuditLogProps {
  logs: AuditEntry[]
  maxHeight?: number
}

const ACTION_ICONS: Record<string, string> = {
  CREATE: '+',
  UPDATE: '~',
  DELETE: '-',
  EXECUTE: '>',
  LOGIN: '>',
  LOGOUT: '<',
  APPROVE: 'ok',
  REJECT: 'xx',
  CANCEL: 'x',
}

function getActionIcon(action: string): string {
  const upper = action.toUpperCase()
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (upper.includes(key)) return icon
  }
  return '*'
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return ts
  }
}

export default function AuditLog({ logs, maxHeight = 400 }: AuditLogProps) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return logs
    const q = filter.toLowerCase()
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        (l.user && l.user.toLowerCase().includes(q)) ||
        l.id.toLowerCase().includes(q)
    )
  }, [logs, filter])

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      }}
    >
      <div
        style={{
          marginBottom: 6,
          position: 'relative',
        }}
      >
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter audit log..."
          aria-label="Filter audit log entries"
          style={{
            width: '100%',
            padding: '4px 8px',
            paddingLeft: 20,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: 4,
            color: 'var(--input-text)',
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            fontSize: 9,
            pointerEvents: 'none',
          }}
        >
          /
        </span>
      </div>
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 10,
            }}
          >
            {logs.length === 0 ? 'No audit entries' : 'No entries match filter'}
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '4px 8px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(42,45,62,0.3)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  fontSize: 7,
                  fontWeight: 700,
                  background: 'var(--bg-hover)',
                  color: 'var(--accent-cyan)',
                  flexShrink: 0,
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                {getActionIcon(entry.action)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {entry.action}
                  </span>
                  {entry.user && (
                    <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>
                      {entry.user}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 8, marginLeft: 'auto' }}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 9,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.details}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
