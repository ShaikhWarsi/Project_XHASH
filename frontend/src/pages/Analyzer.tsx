import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { useToastStore } from '../store/toast'
import { fetchAnalyzerLogs, fetchAnalyzerLogDetail, type AnalyzerLog } from '../api/openalgo'
import { Search, RefreshCw, Code } from 'lucide-react'

export default function Analyzer() {
  const [logs, setLogs] = useState<AnalyzerLog[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<AnalyzerLog | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchAnalyzerLogs()
      .then(setLogs)
      .catch((err) => addToast(`Failed to load logs: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleViewDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const d = await fetchAnalyzerLogDetail(id)
      setDetail(d)
    } catch (err: any) {
      addToast(`Failed to load detail: ${err?.message}`, 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  const statusBadge = (code: number) => {
    if (code < 300) return <Badge label={`${code}`} variant="success" />
    if (code < 400) return <Badge label={`${code}`} variant="info" />
    if (code < 500) return <Badge label={`${code}`} variant="warning" />
    return <Badge label={`${code}`} variant="error" />
  }

  const columns = [
    { key: 'time', label: 'Time', render: (r: AnalyzerLog) => new Date(r.timestamp).toLocaleTimeString(), sortable: true, sortValue: (r: AnalyzerLog) => r.timestamp },
    { key: 'method', label: 'Method', render: (r: AnalyzerLog) => <span className="font-mono text-[9px] font-bold">{r.method}</span> },
    { key: 'endpoint', label: 'Endpoint', render: (r: AnalyzerLog) => <span className="font-mono text-[9px]">{r.endpoint}</span>, sortable: true, sortValue: (r: AnalyzerLog) => r.endpoint },
    { key: 'status', label: 'Status', render: (r: AnalyzerLog) => statusBadge(r.status_code) },
    { key: 'ms', label: 'Time', render: (r: AnalyzerLog) => `${r.response_ms}ms`, align: 'right' as const, sortable: true, sortValue: (r: AnalyzerLog) => r.response_ms },
    { key: 'error', label: 'Error', render: (r: AnalyzerLog) => r.error_message ? <Badge label="Error" variant="error" /> : null },
    { key: 'actions', label: '', render: (r: AnalyzerLog) => (
      <Button variant="ghost" size="sm" onClick={() => handleViewDetail(r.id)}>
        <Code size={10} />
      </Button>
    )},
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Search size={12} className="inline mr-1" /> API Analyzer
        </h2>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
      </div>

      <Card title="Request/Response Logs">
        {logs.length === 0 ? (
          <EmptyState title="No API logs" description="Logs will appear once API requests are made" variant="empty" />
        ) : (
          <DataTable columns={columns as any} data={logs as any} searchable exportFilename="api-analyzer-logs" />
        )}
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Request Detail`} width={600}>
        {detailLoading ? (
          <Skeleton height={200} variant="rect" />
        ) : detail ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono font-bold">{detail.method}</span>
              <span className="font-mono">{detail.endpoint}</span>
              {statusBadge(detail.status_code)}
              <span>{detail.response_ms}ms</span>
            </div>
            {detail.request_body && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Request Body</div>
                <pre className="text-[9px] font-mono p-2 rounded-sm overflow-x-auto" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxHeight: 200 }}>
                  {JSON.stringify(JSON.parse(detail.request_body), null, 2)}
                </pre>
              </div>
            )}
            {detail.response_body && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Response Body</div>
                <pre className="text-[9px] font-mono p-2 rounded-sm overflow-x-auto" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxHeight: 200 }}>
                  {JSON.stringify(JSON.parse(detail.response_body), null, 2)}
                </pre>
              </div>
            )}
            {detail.error_message && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}>Error</div>
                <div className="text-[10px] font-mono p-2 rounded-sm" style={{ background: 'color-mix(in srgb, var(--accent-red) 10%, transparent)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}>
                  {detail.error_message}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
