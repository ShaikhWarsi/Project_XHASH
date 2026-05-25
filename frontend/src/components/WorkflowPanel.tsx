import { useEffect } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Skeleton from './Skeleton'
import { useWorkflowStore } from '../store/workflows'
import { useToastStore } from '../store/toast'

const TEXT_SM = "font-mono-data text-[10px]"
const TEXT_DATA = "font-mono-data text-[11px]"
const TEXT_LABEL = "text-[9px] font-mono-data tracking-wider"

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch { return ts }
}

export default function WorkflowPanel() {
  const workflows = useWorkflowStore((s) => s.workflows)
  const runsMap = useWorkflowStore((s) => s.runs)
  const loading = useWorkflowStore((s) => s.loading)
  const runningId = useWorkflowStore((s) => s.runningId)
  const load = useWorkflowStore((s) => s.load)
  const loadRuns = useWorkflowStore((s) => s.loadRuns)
  const triggerRun = useWorkflowStore((s) => s.triggerRun)
  const startPolling = useWorkflowStore((s) => s.startPolling)
  const stopPolling = useWorkflowStore((s) => s.stopPolling)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    startPolling(5000)
    return () => stopPolling()
  }, [startPolling, stopPolling])

  useEffect(() => {
    if (workflows.length > 0 && !runsMap[workflows[0].id]) {
      workflows.forEach((wf) => loadRuns(wf.id))
    }
  }, [workflows, runsMap, loadRuns])

  const handleRun = async (id: string, name: string) => {
    try {
      await triggerRun(id)
      addToast(`Workflow "${name}" started`, 'info')
      setTimeout(() => loadRuns(id), 1000)
    } catch (err: any) {
      addToast(err?.message || 'Run failed', 'error')
    }
  }

  const toggleExpand = (id: string) => {
    if (!runsMap[id]) loadRuns(id)
  }

  const activeRuns = Object.values(runsMap).flat().filter((r) => r.status === 'running').length

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Card title="WORKFLOW ORCHESTRATION">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-1.5">
              <Skeleton width={140} height={14} />
              <Skeleton width={200} height={10} style={{ marginTop: 4 }} />
            </div>
          ))}
        </Card>
      </div>
    )
  }

  if (!loading && workflows.length === 0) {
    return (
      <Card title="WORKFLOW ORCHESTRATION">
        <div className="py-6 text-center text-[11px] font-mono text-muted">
          No workflows configured yet
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Card title={`WORKFLOW ORCHESTRATION (${workflows.length})`}>
        <div className="flex items-center gap-2 mb-2 text-muted font-mono-data text-[10px]">
          {activeRuns > 0 && (
            <Badge label={`${activeRuns} active`} variant="warning" />
          )}
          <span className="text-[9px]">Polling every 5s</span>
        </div>

        <div className="flex flex-col gap-1">
          {workflows.map((wf) => {
            const runs = runsMap[wf.id]
            const isRunning = runningId === wf.id
            const hasActiveRun = runs?.some((r) => r.status === 'running')
            return (
              <div key={wf.id} className="border border-default rounded-sm">
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
                  onClick={() => toggleExpand(wf.id)}
                >
                  <span className="text-muted text-[9px]">&#9654;</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-data text-[11px] font-semibold text-primary">{wf.name}</span>
                      <Badge label={`${wf.steps.length} steps`} variant="info" />
                      <Badge label={wf.enabled ? 'ENABLED' : 'DISABLED'} variant={wf.enabled ? 'success' : 'error'} />
                      {hasActiveRun && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse bg-up" />
                      )}
                    </div>
                    {wf.description && <div className="font-mono-data text-[10px] text-muted mt-0.5">{wf.description}</div>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRun(wf.id, wf.name) }}
                    disabled={isRunning || !wf.enabled}
                    className="text-black border-none font-mono-data text-[10px] font-semibold px-3 py-0.5 rounded-sm whitespace-nowrap"
                    style={{
                      background: 'var(--accent-cyan)',
                      cursor: isRunning || !wf.enabled ? 'not-allowed' : 'pointer',
                      opacity: isRunning ? 0.6 : 1,
                    }}
                  >
                    {isRunning ? 'RUNNING...' : 'RUN'}
                  </button>
                </div>
                {runs && (
                  <div className="border-t border-default px-2 py-1.5 pl-6">
                    <div className="text-muted text-[9px] font-mono-data tracking-wider mb-1">RECENT RUNS</div>
                    {runs.length === 0 ? (
                      <div className="font-mono-data text-[10px] text-muted">No runs yet</div>
                    ) : (
                      <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
                        {runs.slice(0, 15).map((run) => (
                          <div key={run.id} className="flex items-center gap-1.5 font-mono-data text-[10px] text-secondary">
                            <Badge
                              label={run.status}
                              variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'error' : 'warning'}
                              size="sm"
                            />
                            <span className="text-muted text-[9px]">{formatTime(run.started_at)}</span>
                            {run.completed_at && <span className="text-muted text-[9px]">&rarr; {formatTime(run.completed_at)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
