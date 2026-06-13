import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchStrategy, updateSchedule, type PythonStrategy } from '../api/pythonStrategy'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'

const DAYS = [
  { value: 0, label: 'Mon' }, { value: 1, label: 'Tue' }, { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' }, { value: 4, label: 'Fri' }, { value: 5, label: 'Sat' }, { value: 6, label: 'Sun' },
]

export default function PythonStrategySchedule() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [strategy, setStrategy] = useState<PythonStrategy | null>(null)
  const [scheduleStart, setScheduleStart] = useState('09:15')
  const [scheduleStop, setScheduleStop] = useState('15:30')
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchStrategy(id)
      .then((s) => {
        setStrategy(s)
        setScheduleStart(s.schedule_start || '09:15')
        setScheduleStop(s.schedule_stop || '15:30')
        setScheduleDays(s.schedule_days || [0, 1, 2, 3, 4])
      })
      .catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }, [id, addToast])

  const toggleDay = (d: number) => {
    setScheduleDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateSchedule(id, { schedule_start: scheduleStart, schedule_stop: scheduleStop, schedule_days: scheduleDays })
      addToast('Schedule updated', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  if (!strategy) {
    return (
      <Card>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Strategy not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <RefreshCw size={12} className="inline mr-1" /> Schedule: {strategy.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving}><Save size={12} /> Save</Button>
        </div>
      </div>

      <Card title="Schedule Configuration">
        <div className="flex flex-col gap-3 max-w-md">
          <Input label="Start Time" type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
          <Input label="Stop Time" type="time" value={scheduleStop} onChange={(e) => setScheduleStop(e.target.value)} />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Active Days</span>
            <div className="flex gap-1">
              {DAYS.map((d) => (
                <button key={d.value} onClick={() => toggleDay(d.value)}
                  className="px-3 py-1 text-[9px] font-mono rounded-sm outline-none transition-colors"
                  style={{
                    background: scheduleDays.includes(d.value) ? 'var(--accent-cyan)' : 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: scheduleDays.includes(d.value) ? '#fff' : 'var(--text-primary)',
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Exchange: {strategy.exchange} · {strategy.filename}
          </p>
        </div>
      </Card>
    </div>
  )
}
