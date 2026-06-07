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
  const [tab, setTab] = useState<'details' | 'messages' | 'graph'>('details')

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
    const m: Record<string, string> = { running: 'var(--accent-blue)', completed: 'var(--accent-green)', failed: 'var(--accent-red)', cancelled: 'var(--text-muted)', pending: 'var(--accent-yellow)' }
    return m[s] || '#5d6b7e'
  }

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] text-primary bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1 border-b border-default">
        <Activity size={12} /><span className="font-bold text-[13px]">SWARM DASHBOARD</span>
        <span className="bg-[rgba(234,179,8,0.15)] text-[var(--accent-yellow)] px-1 py-0.5 text-[8px] font-bold rounded-sm">DEMO</span>
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
          <div className="flex gap-4 mb-2 border-b border-default">
            <button onClick={() => setTab('details')} className={`text-[10px] pb-1 ${tab === 'details' ? 'text-accent-blue border-b border-accent-blue' : 'text-muted'}`}>DETAILS</button>
            <button onClick={() => setTab('messages')} className={`text-[10px] pb-1 ${tab === 'messages' ? 'text-accent-blue border-b border-accent-blue' : 'text-muted'}`}>MESSAGES</button>
            <button onClick={() => setTab('graph')} className={`text-[10px] pb-1 ${tab === 'graph' ? 'text-accent-blue border-b border-accent-blue' : 'text-muted'}`}>GRAPH</button>
          </div>
          {tab === 'details' ? (
            selectedRun && runDetails ? (
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
            )
          ) : tab === 'graph' ? (
            <AgentGraph runDetails={runDetails} />
          ) : (
            <MessagesPanel runDetails={runDetails} />
          )}
        </div>
      </div>
    </div>
  )
}

function MessagesPanel({ runDetails }: { runDetails: any }) {
  const messages: Array<{ timestamp: string; from: string; content: string }> = []

  if (runDetails?.messages) {
    for (const m of runDetails.messages) {
      messages.push({
        timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '',
        from: m.agent_id ?? m.from ?? 'system',
        content: m.content ?? m.message ?? '',
      })
    }
  } else if (runDetails?.tasks) {
    for (const t of runDetails.tasks) {
      if (t.result) {
        messages.push({
          timestamp: t.completed_at ? new Date(t.completed_at).toLocaleTimeString() : '',
          from: t.agent_id ?? t.id ?? 'task',
          content: typeof t.result === 'string' ? t.result : JSON.stringify(t.result),
        })
      }
    }
  }

  return (
    <div className="space-y-1 font-mono text-[10px]">
      {messages.length === 0 ? (
        <div className="text-muted text-[10px] p-2">
          {runDetails ? 'No messages in this run.' : 'Select a run to view messages.'}
        </div>
      ) : (
        messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2 border-b border-[rgba(26,35,50,0.3)] py-1.5">
            <span className="text-muted shrink-0 w-14">{m.timestamp}</span>
            <span className="text-accent-blue shrink-0 w-20">{m.from}</span>
            <span className="text-primary flex-1">{m.content}</span>
          </div>
        ))
      )}
    </div>
  )
}

function AgentGraph({ runDetails }: { runDetails: any }) {
  if (!runDetails?.tasks?.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-[10px]">
        {runDetails ? 'No task graph available.' : 'Select a run to view graph.'}
      </div>
    )
  }

  const tasks = runDetails.tasks
  const nodeIds = tasks.map((t: any) => t.id ?? t.agent_id ?? `task-${Math.random()}`)
  const nodeStatuses = tasks.map((t: any) => t.status)
  const edges: Array<{ from: number; to: number }> = []
  for (let i = 0; i < tasks.length; i++) {
    const deps = tasks[i].depends_on ?? []
    for (const dep of deps) {
      const j = nodeIds.indexOf(dep)
      if (j >= 0) edges.push({ from: j, to: i })
    }
  }

  const n = tasks.length
  const w = 500, h = Math.max(200, n * 50)
  const cols = Math.ceil(Math.sqrt(n))
  const positions = tasks.map((_: any, i: number) => ({
    x: 40 + (i % cols) * (w - 80) / Math.max(cols - 1, 1),
    y: 30 + Math.floor(i / cols) * 50,
  }))

  const statusColors: Record<string, string> = {
    running: '#3b82f6', completed: '#22c55e', failed: '#ef4444',
    cancelled: '#6b7280', pending: '#eab308',
  }

  return (
    <div className="overflow-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {edges.map((e, i) => {
          const f = positions[e.from], t = positions[e.to]
          const mx = (f.x + t.x) / 2
          const my = (f.y + t.y) / 2
          return (
            <g key={i}>
              <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#3d4050" strokeWidth="1.5" />
              <polygon
                points={`${t.x - 6},${t.y - 4} ${t.x - 6},${t.y + 4} ${t.x},${t.y}`}
                fill="#3d4050"
                transform={`rotate(${Math.atan2(t.y - f.y, t.x - f.x) * 180 / Math.PI}, ${t.x}, ${t.y})`}
              />
            </g>
          )
        })}
        {tasks.map((t: any, i: number) => {
          const pos = positions[i]
          const sc = statusColors[nodeStatuses[i]] ?? '#6b7280'
          return (
            <g key={i}>
              <rect x={pos.x - 40} y={pos.y - 10} width={80} height={20} rx={4} fill="var(--bg-card)" stroke={sc} strokeWidth="1.5" />
              <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill={sc} fontSize="8" fontFamily="monospace">
                {(t.agent_id ?? t.id ?? '').slice(0, 12)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
