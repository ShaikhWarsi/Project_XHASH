import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import KpiCard from '../components/ui/KpiCard'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { useToastStore } from '../store/toast'
import { fetchTrafficStats, fetchTrafficLogs, banIp, unbanIp, type TrafficStats, type TrafficLog } from '../api/openalgo'
import { Activity, Shield, ShieldOff, RefreshCw, AlertTriangle } from 'lucide-react'

export default function TrafficDashboard() {
  const [stats, setStats] = useState<TrafficStats | null>(null)
  const [logs, setLogs] = useState<TrafficLog[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    Promise.all([fetchTrafficStats(), fetchTrafficLogs()])
      .then(([s, l]) => { setStats(s); setLogs(l) })
      .catch((err) => addToast(`Failed to load traffic data: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleBanIp = async (ip: string) => {
    try {
      await banIp(ip)
      addToast(`Banned IP ${ip}`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleUnbanIp = async (ip: string) => {
    try {
      await unbanIp(ip)
      addToast(`Unbanned IP ${ip}`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const statusBadge = (code: number) => {
    if (code < 300) return <Badge label={`${code}`} variant="success" />
    if (code < 400) return <Badge label={`${code}`} variant="info" />
    if (code < 500) return <Badge label={`${code}`} variant="warning" />
    return <Badge label={`${code}`} variant="error" />
  }

  const logColumns = [
    { key: 'time', label: 'Time', render: (r: TrafficLog) => new Date(r.timestamp).toLocaleTimeString(), sortable: true, sortValue: (r: TrafficLog) => r.timestamp },
    { key: 'method', label: 'Method', render: (r: TrafficLog) => <span className="font-mono text-[9px] font-bold">{r.method}</span> },
    { key: 'endpoint', label: 'Endpoint', render: (r: TrafficLog) => <span className="font-mono text-[9px]">{r.endpoint}</span>, sortable: true, sortValue: (r: TrafficLog) => r.endpoint },
    { key: 'status', label: 'Status', render: (r: TrafficLog) => statusBadge(r.status_code) },
    { key: 'ms', label: 'Time', render: (r: TrafficLog) => `${r.response_ms}ms`, align: 'right' as const, sortable: true, sortValue: (r: TrafficLog) => r.response_ms },
    { key: 'ip', label: 'IP', render: (r: TrafficLog) => <span className="font-mono text-[9px]">{r.client_ip}</span> },
    { key: 'actions', label: 'Actions', render: (r: TrafficLog) => (
      <Button variant="danger" size="sm" onClick={() => handleBanIp(r.client_ip)}>
        <ShieldOff size={8} /> Ban
      </Button>
    )},
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <div className="grid grid-cols-4 gap-1.5">
          {[1,2,3,4].map((i) => <Skeleton key={i} height={64} variant="rect" />)}
        </div>
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Activity size={12} className="inline mr-1" /> Traffic Dashboard
        </h2>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <KpiCard label="Total Requests" value={`${stats?.total_requests || 0}`} icon={<Activity size={14} />} />
        <KpiCard label="Errors" value={`${stats?.total_errors || 0}`} icon={<AlertTriangle size={14} />} trend={stats && stats.total_errors > 0 ? 'down' : 'neutral'} />
        <KpiCard label="Error Rate" value={`${(stats?.error_rate ?? 0).toFixed(1)}%`} trend={stats && (stats.error_rate ?? 0) > 5 ? 'down' : 'neutral'} />
        <KpiCard label="Avg Response" value={`${(stats?.avg_response_ms ?? 0).toFixed(0)}ms`} icon={<Activity size={14} />} />
      </div>

      {stats?.banned_ips && stats.banned_ips.length > 0 && (
        <Card title={`Banned IPs (${stats.banned_ips.length})`} variant="highlight">
          <div className="flex flex-wrap gap-1">
            {stats.banned_ips.map((ip) => (
              <div key={ip} className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-mono" style={{ background: 'color-mix(in srgb, var(--accent-red) 15%, transparent)', color: 'var(--accent-red)' }}>
                <Shield size={8} />
                {ip}
                <button onClick={() => handleUnbanIp(ip)} className="cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--accent-red)', padding: 0, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Recent Requests">
        {logs.length === 0 ? (
          <EmptyState title="No traffic data" variant="no_data" />
        ) : (
          <DataTable columns={logColumns as any} data={logs as any} searchable exportFilename="traffic-logs" />
        )}
      </Card>
    </div>
  )
}
