import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { Activity, Square, RefreshCw } from 'lucide-react'
import Spinner from '../components/Spinner'

interface Run {
  run_id: string
  preset_name: string
  status: string
  created_at: string
  completed_at: string | null
  error: string | null
  tasks: any[]
  final_report: string | null
}

export default function SwarmDashboard() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [runDetails, setRunDetails] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)

  const fetchRuns = async () => {
    try {
      const r = await api.get('/swarm/runs')
      setRuns(r.data.runs || [])
    } catch { }
    try {
      const h = await api.get('/swarm/health')
      setHealth(h.data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchRuns() }, [])

  const fetchRunDetails = async (id: string) => {
    try {
      const r = await api.get(`/swarm/runs/${id}`)
      setRunDetails(r.data)
    } catch { }
  }

  const cancelRun = async (id: string) => {
    try {
      await api.delete(`/swarm/runs/${id}`)
      fetchRuns()
    } catch { }
  }

  const reapStale = async () => {
    try {
      await api.post('/swarm/reap')
      fetchRuns()
    } catch { }
  }

  const statusColor = (s: string) => {
    const m: Record<string, string> = { running: '#3b82f6', completed: '#22c55e', failed: '#ef4444', cancelled: '#5d6b7e', pending: '#f59e0b' }
    return m[s] || '#5d6b7e'
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <Activity size={12} /><span className="font-bold text-[13px]">SWARM DASHBOARD</span>
        <span className="text-muted">|</span>
        {health && (
          <>
            <span className="text-[9px] text-muted">{health.total_runs} runs</span>
            <span className="text-[9px] text-accent-blue">{health.running} running</span>
            {health.stale_count > 0 && <span className="text-[9px] text-down">{health.stale_count} stale</span>}
          </>
        )}
        <div className="flex-1" />
        <button onClick={reapStale} className="bg-[rgba(239,68,68,0.1)] border border-down text-down cursor-pointer px-2 py-0.5 text-[9px] rounded-sm">
          REAP STALE
        </button>
        <button onClick={fetchRuns} className="bg-transparent border border-accent-blue text-accent-blue cursor-pointer px-2 py-0.5 text-[9px] rounded-sm">
          <RefreshCw size={10} className="mr-1" />REFRESH
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[45%] border-r border-default overflow-auto">
          {loading ? (
            <Spinner label="Loading swarm data..." />
          ) : runs.length === 0 ? (
            <div className="p-3 text-muted text-[10px]">No swarm runs yet. Create a run via POST /api/swarm/runs</div>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="text-muted border-b border-default">
                  <th className="px-1.5 py-1 text-left">Status</th>
                  <th className="px-1.5 py-1 text-left">ID</th>
                  <th className="px-1.5 py-1 text-left">Preset</th>
                  <th className="px-1.5 py-1 text-left">Created</th>
                  <th className="px-1.5 py-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.run_id} onClick={() => { setSelectedRun(run.run_id); fetchRunDetails(run.run_id) }}
                    className="border-b border-[rgba(26,35,50,0.3)] cursor-pointer"
                    style={{
                      background: selectedRun === run.run_id ? 'rgba(59,130,246,0.1)' : 'transparent',
                    }}>
                    <td className="px-1.5 py-0.5">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: statusColor(run.status) }} />
                      {run.status}
                    </td>
                    <td className="px-1.5 py-0.5 text-accent-blue">{run.run_id}</td>
                    <td className="px-1.5 py-0.5">{run.preset_name || '-'}</td>
                    <td className="px-1.5 py-0.5 text-muted text-[9px]">{run.created_at ? new Date(run.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-1.5 py-0.5 text-right">
                      {run.status === 'running' && (
                        <button onClick={(e) => { e.stopPropagation(); cancelRun(run.run_id) }}
                          className="bg-transparent border-none cursor-pointer text-down p-0.5">
                          <Square size={10} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {selectedRun && runDetails ? (
            <div>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                <div className="bg-card border border-default px-2.5 py-1.5 rounded">
                  <div className="text-[9px] text-muted">STATUS</div>
                  <div className="text-sm font-bold" style={{ color: statusColor(runDetails.status) }}>{runDetails.status.toUpperCase()}</div>
                </div>
                {runDetails.error && (
                  <div className="bg-card border border-down px-2.5 py-1.5 rounded">
                    <div className="text-[9px] text-down">ERROR</div>
                    <div className="text-[10px] text-down">{runDetails.error}</div>
                  </div>
                )}
              </div>

              {runDetails.tasks && runDetails.tasks.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-muted mb-1">TASKS ({runDetails.tasks.length})</div>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="text-muted border-b border-default">
                        <th className="px-1.5 py-0.5 text-left">ID</th>
                        <th className="px-1.5 py-0.5 text-left">Status</th>
                        <th className="px-1.5 py-0.5 text-left">Agent</th>
                        <th className="px-1.5 py-0.5 text-left">Depends On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runDetails.tasks.map((t: any) => (
                        <tr key={t.id} className="border-b border-[rgba(26,35,50,0.3)]">
                          <td className="px-1.5 py-0.5 text-accent-blue">{t.id}</td>
                          <td className="px-1.5 py-0.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: statusColor(t.status) }} />
                            {t.status}
                          </td>
                          <td className="px-1.5 py-0.5">{t.agent_id || '-'}</td>
                          <td className="px-1.5 py-0.5 text-muted">{(t.depends_on || []).join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-[10px]">
              Select a run to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
