import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { Play, Square, RefreshCw, Wifi } from 'lucide-react'

interface ProxyHealth {
  running: boolean
  clients?: number
  subscriptions?: number
  messages_processed?: number
}

const API = '/api/openalgo/ws-proxy'

export default function WebSocketProxyDashboard() {
  const [health, setHealth] = useState<ProxyHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API}/health`)
      const data = await res.json()
      setHealth(data)
    } catch {
      addToast('Failed to fetch proxy health', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 5000); return () => clearInterval(t) }, [])

  const toggle = async () => {
    setToggling(true)
    try {
      const action = health?.running ? 'stop' : 'start'
      const res = await fetch(`${API}/${action}`, { method: 'POST' })
      const data = await res.json()
      addToast(`Proxy ${action}ed`, 'success')
      await fetchHealth()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={180} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Wifi size={12} className="inline mr-1" /> WebSocket Proxy
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchHealth}><RefreshCw size={12} /></Button>
          <Button variant={health?.running ? 'danger' : 'primary'} size="sm" onClick={toggle} loading={toggling}>
            {health?.running ? <><Square size={12} /> Stop</> : <><Play size={12} /> Start</>}
          </Button>
        </div>
      </div>
      <Card title={`Status: ${health?.running ? 'Running' : 'Stopped'}`}>
        <div className="flex items-center gap-3 mb-3">
          <Badge label={health?.running ? 'Online' : 'Offline'} variant={health?.running ? 'success' : 'error'} />
          {health?.running && <Badge label="ws://127.0.0.1:8765" variant="info" />}
        </div>
        {health?.running && (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-lg font-mono font-bold" style={{ color: 'var(--accent)' }}>{health.clients ?? 0}</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Clients</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-lg font-mono font-bold" style={{ color: 'var(--accent)' }}>{health.subscriptions ?? 0}</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Subscriptions</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-lg font-mono font-bold" style={{ color: 'var(--accent)' }}>{(health.messages_processed ?? 0).toLocaleString()}</span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>Messages</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
