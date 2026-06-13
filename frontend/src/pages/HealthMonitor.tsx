import { useEffect, useState } from 'react'
import Card, { CardGrid } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchHealthStatus, fetchHealthHistory, type HealthStatus, type HealthPoint } from '../api/openalgo'
import Button from '../components/ui/Button'
import { Heart, Database, Wifi, RefreshCw, Clock, Activity } from 'lucide-react'

const WIDTH = 600
const HEIGHT = 60

function MiniSparkline({ data, color = 'var(--accent-green)' }: { data: HealthPoint[]; color?: string }) {
  if (!data.length) return null
  const values = data.map((d) => d.response_time_ms)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = data.length > 1 ? WIDTH / (data.length - 1) : WIDTH
  const colorVal = color

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ display: 'block' }}>
      {values.map((v, i) => {
        const x = i * stepX
        const y = HEIGHT - 10 - ((v - min) / range) * (HEIGHT - 20)
        return <circle key={i} cx={x} cy={y} r={1.5} fill={colorVal} opacity={0.6} />
      })}
      {values.length > 1 && (
        <polyline
          points={values.map((v, i) => `${i * stepX},${HEIGHT - 10 - ((v - min) / range) * (HEIGHT - 20)}`).join(' ')}
          fill="none" stroke={colorVal} strokeWidth={1} opacity={0.4}
        />
      )}
    </svg>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'var(--accent-green)',
    degraded: 'var(--accent-yellow)',
    down: 'var(--accent-red)',
  }
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[status] || 'var(--text-muted)' }} />
  )
}

export default function HealthMonitor() {
  const [status, setStatus] = useState<HealthStatus | null>(null)
  const [history, setHistory] = useState<HealthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    Promise.all([fetchHealthStatus(), fetchHealthHistory()])
      .then(([s, h]) => { setStatus(s); setHistory(h) })
      .catch((err) => addToast(`Failed to load health data: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-4 gap-1.5">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={100} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Heart size={12} className="inline mr-1" /> Health Monitor
        </h2>
        <Button size="sm" onClick={load}><RefreshCw size={12} /></Button>
      </div>

      <CardGrid cols={4}>
        <Card>
          <div className="flex items-center gap-2">
            <StatusDot status={status?.status || 'down'} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Status</div>
              <div className="text-[11px] font-bold uppercase" style={{ color: status?.status === 'healthy' ? 'var(--accent-green)' : status?.status === 'degraded' ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                {status?.status || 'Unknown'}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Database size={14} style={{ color: status?.db_connected ? 'var(--accent-green)' : 'var(--accent-red)' }} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Database</div>
              <Badge label={status?.db_connected ? 'Connected' : 'Disconnected'} variant={status?.db_connected ? 'success' : 'error'} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Wifi size={14} style={{ color: status?.broker_connected ? 'var(--accent-green)' : 'var(--accent-red)' }} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Broker</div>
              <Badge label={status?.broker_connected ? 'Connected' : 'Disconnected'} variant={status?.broker_connected ? 'success' : 'error'} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Uptime</div>
              <div className="text-[10px] font-mono font-bold">
                {status ? `${Math.floor(status.uptime_seconds / 60)}m ${status.uptime_seconds % 60}s` : '—'}
              </div>
            </div>
          </div>
        </Card>
      </CardGrid>

      <Card title="Response Time">
        <MiniSparkline data={history} />
      </Card>

      {status?.checks && Object.keys(status.checks).length > 0 && (
        <Card title="Component Checks">
          <div className="flex flex-col gap-1">
            {Object.entries(status.checks).map(([name, check]) => (
              <div key={name} className="flex items-center justify-between py-0.5 px-1 rounded-sm" style={{ background: 'var(--bg-hover)' }}>
                <div className="flex items-center gap-2">
                  <StatusDot status={check.status} />
                  <span className="text-[10px] font-mono font-semibold">{name}</span>
                </div>
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>{check.latency_ms.toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
