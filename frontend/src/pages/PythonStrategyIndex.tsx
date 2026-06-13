import { useEffect, useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import {
  fetchStrategies, startStrategy, stopStrategy, deleteStrategy, subscribeToSSE,
  type PythonStrategy,
} from '../api/pythonStrategy'
import { useNavigate } from 'react-router-dom'
import { Play, Square, Trash2, Plus, RefreshCw, FileText, AlertTriangle, Terminal } from 'lucide-react'

export default function PythonStrategyIndex() {
  const [strategies, setStrategies] = useState<PythonStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    fetchStrategies()
      .then(setStrategies)
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  useEffect(() => { load(); const unsub = subscribeToSSE(() => load()); return unsub }, [load])

  const handleStart = async (id: string) => {
    try { await startStrategy(id); addToast('Strategy started', 'success'); load() }
    catch (err: any) { addToast(`Start failed: ${err?.message}`, 'error') }
  }

  const handleStop = async (id: string) => {
    try { await stopStrategy(id); addToast('Strategy stopped', 'success'); load() }
    catch (err: any) { addToast(`Stop failed: ${err?.message}`, 'error') }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete strategy "${name}"?`)) return
    try { await deleteStrategy(id); addToast('Strategy deleted', 'success'); load() }
    catch (err: any) { addToast(`Delete failed: ${err?.message}`, 'error') }
  }

  const statusBadge = (s: PythonStrategy) => {
    if (s.is_running) return <Badge label="Running" variant="success" />
    if (s.last_error) return <Badge label="Error" variant="error" />
    if (s.manually_stopped) return <Badge label="Stopped" variant="warning" />
    if (s.is_scheduled) return <Badge label="Scheduled" variant="info" />
    return <Badge label="Inactive" variant="default" />
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={250} height={16} />
        {[1, 2, 3].map((i) => <Skeleton key={i} height={48} variant="rect" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Terminal size={12} className="inline mr-1" /> Python Strategy Host
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/openalgo/python-strategy/new')}><Plus size={12} /> New Strategy</Button>
        </div>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-6">
            <AlertTriangle size={24} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No strategies yet</span>
            <Button variant="primary" size="sm" onClick={() => navigate('/openalgo/python-strategy/new')}><Plus size={12} /> Create your first strategy</Button>
          </div>
        </Card>
      ) : (
        strategies.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.filename} · {s.exchange} · {s.schedule_start}-{s.schedule_stop}</span>
                </div>
                {statusBadge(s)}
              </div>
              <div className="flex items-center gap-1">
                {s.is_running ? (
                  <Button variant="ghost" size="sm" onClick={() => handleStop(s.id)}><Square size={10} /></Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => handleStart(s.id)} disabled={!!s.last_error}><Play size={10} /></Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate(`/openalgo/python-strategy/edit/${s.id}`)}><Terminal size={10} /></Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/openalgo/python-strategy/logs/${s.id}`)}><FileText size={10} /></Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/openalgo/python-strategy/schedule/${s.id}`)}><RefreshCw size={10} /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id, s.name)}><Trash2 size={10} /></Button>
              </div>
            </div>
            {s.last_error && <p className="text-[9px] font-mono mt-1" style={{ color: 'var(--accent-red)' }}>{s.last_error}</p>}
          </Card>
        ))
      )}
    </div>
  )
}
