import { useEffect, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

interface User {
  id: string
  name: string
  online: boolean
  lastActive?: string
}

interface CollaborationPanelProps {
  users?: User[]
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: online ? 'var(--accent-green)' : 'var(--text-muted)',
        boxShadow: online ? '0 0 4px var(--accent-green)' : 'none',
        flexShrink: 0,
      }}
    />
  )
}

export default function CollaborationPanel({ users: initialUsers }: CollaborationPanelProps) {
  const [localUsers, setLocalUsers] = useState<User[]>(initialUsers || [])
  const { lastData } = useWebSocket<{ type: string; users: User[] }>('/api/ws/collaboration', { maxRetries: 3 })

  useEffect(() => {
    if (lastData?.type === 'presence' && Array.isArray(lastData.users)) {
      setLocalUsers(lastData.users)
    }
  }, [lastData])

  const users = lastData?.users || localUsers || initialUsers || []
  const online = users.filter((u) => u.online)
  const offline = users.filter((u) => !u.online)

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--card-radius)',
        padding: '10px 12px',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        Workspace — {online.length} online
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[...online, ...offline].map((user) => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              color: user.online ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <StatusDot online={user.online} />
            <span style={{ fontWeight: user.online ? 600 : 400 }}>
              {user.name}
            </span>
            {user.lastActive && !user.online && (
              <span style={{ color: 'var(--text-muted)', fontSize: 9, marginLeft: 'auto' }}>
                {user.lastActive}
              </span>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}
        >
          No collaborators
        </div>
      )}
    </div>
  )
}
