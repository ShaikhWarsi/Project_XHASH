import { useEffect, useState, useCallback } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/Skeleton'
import { useToastStore } from '../../store/toast'
import { fetchChartinkStrategies, deleteChartinkStrategy, updateChartinkStrategy } from '../../api/chartink'
import type { ChartinkStrategy } from '../../types/chartink'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, Settings, ArrowLeft } from 'lucide-react'

export default function ChartinkIndex() {
  const [strategies, setStrategies] = useState<ChartinkStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    fetchChartinkStrategies()
      .then(setStrategies)
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  useEffect(() => { load() }, [load])

  const handleToggle = async (s: ChartinkStrategy) => {
    try {
      await updateChartinkStrategy(s.id, { enabled: !s.enabled })
      addToast(`Strategy ${s.enabled ? 'disabled' : 'enabled'}`, 'success')
      load()
    } catch (err: any) {
      addToast(`Toggle failed: ${err?.message}`, 'error')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete strategy "${name}"?`)) return
    try {
      await deleteChartinkStrategy(id)
      addToast('Strategy deleted', 'success')
      load()
    } catch (err: any) {
      addToast(`Delete failed: ${err?.message}`, 'error')
    }
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
          <Settings size={12} className="inline mr-1" /> ChartInk Strategies
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/webhook-bridges')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/openalgo/chartink/new')}><Plus size={12} /> New Strategy</Button>
        </div>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No ChartInk strategies yet</span>
            <Button variant="primary" size="sm" onClick={() => navigate('/openalgo/chartink/new')}><Plus size={12} /> Create your first strategy</Button>
          </div>
        </Card>
      ) : (
        strategies.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>{s.symbol} · {s.exchange} · {s.action} · Qty {s.quantity}</span>
                </div>
                {s.enabled ? <Badge label="Enabled" variant="success" /> : <Badge label="Disabled" variant="default" />}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleToggle(s)}>
                  {s.enabled ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/openalgo/chartink/view/${s.id}`)}><Settings size={10} /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id, s.name)}><Trash2 size={10} /></Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
