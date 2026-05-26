import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Breadcrumbs from '../components/Breadcrumbs'
import AuditLog from '../components/AuditLog'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit/logs')
        if (!cancelled) setLogs(res.data.logs || res.data || [])
      } catch {
        if (!cancelled) setLogs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Breadcrumbs />
        <div className="font-mono-data text-[11px] text-muted p-4">Loading audit logs...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <AuditLog logs={logs} />
    </div>
  )
}
