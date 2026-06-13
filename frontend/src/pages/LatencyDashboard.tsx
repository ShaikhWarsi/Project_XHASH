import { useEffect, useState } from 'react'
import Card, { CardGrid } from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchLatencyStats, fetchLatencyHistory, type LatencyStats, type LatencyPoint } from '../api/openalgo'
import { Activity, Zap, Gauge, Clock } from 'lucide-react'

const WIDTH = 600
const HEIGHT = 160
const BAR_GAP = 2

function MiniBarChart({ data, color = 'var(--accent-cyan)' }: { data: LatencyPoint[]; color?: string }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.avg_ms), 1)
  const barW = Math.max(2, (WIDTH - data.length * BAR_GAP) / data.length)

  return (
    <svg width={WIDTH} height={HEIGHT} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = (d.avg_ms / max) * (HEIGHT - 20)
        return (
          <g key={i}>
            <rect
              x={i * (barW + BAR_GAP)} y={HEIGHT - 10 - h}
              width={barW} height={h} fill={color} opacity={0.7} rx={1}
            />
            {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
              <text x={i * (barW + BAR_GAP)} y={HEIGHT - 2} fontSize={7} fill="var(--text-muted)" fontFamily="'JetBrains Mono', monospace">
                {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            )}
          </g>
        )
      })}
      {data.length > 0 && (
        <text x={0} y={9} fontSize={7} fill="var(--text-muted)" fontFamily="'JetBrains Mono', monospace">
          max: {max.toFixed(0)}ms
        </text>
      )}
    </svg>
  )
}

export default function LatencyDashboard() {
  const [stats, setStats] = useState<LatencyStats | null>(null)
  const [history, setHistory] = useState<LatencyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    Promise.all([fetchLatencyStats(), fetchLatencyHistory()])
      .then(([s, h]) => { setStats(s); setHistory(h) })
      .catch((err) => addToast(`Failed to load latency data: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-4 gap-1.5">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
        <Activity size={12} className="inline mr-1" /> Latency Dashboard
      </h2>

      <CardGrid cols={4}>
        <KpiCard label="Avg Latency" value={`${stats?.avg_latency_ms.toFixed(1) || '0'}ms`} icon={<Zap size={14} />} />
        <KpiCard label="P95" value={`${stats?.p95_ms.toFixed(1) || '0'}ms`} icon={<Gauge size={14} />} />
        <KpiCard label="P99" value={`${stats?.p99_ms.toFixed(1) || '0'}ms`} icon={<Gauge size={14} />} />
        <KpiCard label="Total Requests" value={`${stats?.total_requests || 0}`} icon={<Clock size={14} />} />
      </CardGrid>

      <Card title="Latency Over Time">
        {history.length > 0 ? <MiniBarChart data={history} /> : <div className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No data</div>}
      </Card>

      {stats?.by_broker && Object.keys(stats.by_broker).length > 0 && (
        <Card title="By Broker">
          <div className="flex flex-col gap-2">
            {Object.entries(stats.by_broker).map(([broker, info]) => (
              <div key={broker} className="flex items-center justify-between p-1 rounded-sm" style={{ background: 'var(--bg-hover)' }}>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{broker}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{info.count} req</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{info.avg_ms.toFixed(1)}ms avg</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
