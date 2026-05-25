import { useConnectionStore, type ConnectionState } from '../store/connection'

function stateColor(state: ConnectionState): string {
  switch (state) {
    case 'connected': return 'var(--accent-green)'
    case 'connecting': return 'var(--accent-orange)'
    case 'error': return 'var(--accent-red)'
    case 'disconnected': return 'var(--text-muted)'
  }
}

function stateLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'error': return 'Error'
    case 'disconnected': return 'Disconnected'
  }
}

export default function ConnectionIndicator() {
  const sse = useConnectionStore((s) => s.sse)
  const api = useConnectionStore((s) => s.api)

  const worst = [sse, api].reduce<ConnectionState>((a, b) => {
    const order: Record<ConnectionState, number> = { connected: 0, connecting: 1, error: 2, disconnected: 3 }
    return order[b] > order[a] ? b : a
  }, 'connected')

  return (
    <span
      title={`SSE: ${stateLabel(sse)} | API: ${stateLabel(api)}`}
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: stateColor(worst),
        transition: 'background 0.3s ease',
        cursor: 'help',
      }}
    />
  )
}
