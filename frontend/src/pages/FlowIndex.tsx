import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchWorkflows, createWorkflow, deleteWorkflow } from '../api/flow'
import type { FlowWorkflow } from '../types/flow'
import { Workflow, Plus, Play, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'

export default function FlowIndex() {
  const [workflows, setWorkflows] = useState<FlowWorkflow[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const load = useCallback(() => {
    setLoading(true)
    fetchWorkflows()
      .then(setWorkflows)
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    try {
      const wf = await createWorkflow(`Flow ${workflows.length + 1}`)
      addToast('Workflow created', 'success')
      navigate(`/openalgo/flow/edit/${wf.id}`)
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await deleteWorkflow(id)
      addToast('Deleted', 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        {[1, 2].map((i) => <Skeleton key={i} height={48} variant="rect" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Workflow size={12} className="inline mr-1" /> Flow Builder
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={handleCreate}><Plus size={12} /> New Flow</Button>
        </div>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-6">
            <AlertTriangle size={24} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No workflows yet</span>
            <Button variant="primary" size="sm" onClick={handleCreate}><Plus size={12} /> Create your first flow</Button>
          </div>
        </Card>
      ) : (
        workflows.map((wf) => (
          <Card key={wf.id}>
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => navigate(`/openalgo/flow/edit/${wf.id}`)}
              >
                <Workflow size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{wf.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    {wf.nodes?.length || 0} nodes · {wf.edges?.length || 0} edges · {wf.trigger_type || 'manual'}
                  </span>
                </div>
                <Badge label={wf.is_active ? 'Active' : 'Inactive'} variant={wf.is_active ? 'success' : 'default'} />
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/openalgo/flow/edit/${wf.id}`)}><Play size={10} /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(wf.id, wf.name)}><Trash2 size={10} /></Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
