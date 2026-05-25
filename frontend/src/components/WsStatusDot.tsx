import { useWebSocket } from '../hooks/useWebSocket'

interface WsStatusDotProps {
  channel: string
}

export default function WsStatusDot({ channel }: WsStatusDotProps) {
  const prefix = channel.startsWith('/ws/') ? '' : '/ws/'
  const { connected } = useWebSocket(`${prefix}${channel}`)
  return (
    <span
      style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
        background: connected ? 'var(--accent-green)' : 'var(--accent-red)',
        boxShadow: connected ? '0 0 4px var(--accent-green)' : '0 0 4px var(--accent-red)',
        transition: 'background 0.3s',
      }}
      title={`WS ${channel}: ${connected ? 'connected' : 'disconnected'}`}
    />
  )
}
