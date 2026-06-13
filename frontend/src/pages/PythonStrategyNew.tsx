import { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { useToastStore } from '../store/toast'
import { createStrategy } from '../api/pythonStrategy'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Terminal } from 'lucide-react'

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'CDS', 'MCX', 'CRYPTO']
const DAYS = [
  { value: 0, label: 'Mon' }, { value: 1, label: 'Tue' }, { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' }, { value: 4, label: 'Fri' }, { value: 5, label: 'Sat' }, { value: 6, label: 'Sun' },
]
const DEFAULT_CODE = `import time
from openalgo import api

# Your strategy logic here
# Use OPENALGO_API_KEY from environment for auth

def main():
    print("Strategy started")
    while True:
        # Add your trading logic
        time.sleep(60)

if __name__ == "__main__":
    main()
`

export default function PythonStrategyNew() {
  const [name, setName] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [code, setCode] = useState(DEFAULT_CODE)
  const [scheduleStart, setScheduleStart] = useState('09:15')
  const [scheduleStop, setScheduleStop] = useState('15:30')
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4])
  const [submitting, setSubmitting] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const toggleDay = (d: number) => {
    setScheduleDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())
  }

  const handleSubmit = async () => {
    if (!name.trim()) { addToast('Strategy name is required', 'error'); return }
    setSubmitting(true)
    try {
      const result = await createStrategy({
        name: name.trim(),
        exchange,
        schedule_start: scheduleStart,
        schedule_stop: scheduleStop,
        schedule_days: scheduleDays,
        filename: `${name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}.py`,
        content: code,
      })
      addToast('Strategy created', 'success')
      navigate(`/openalgo/python-strategy/edit/${result.id}`)
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Terminal size={12} className="inline mr-1" /> New Python Strategy
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Card title="Configuration">
          <div className="flex flex-col gap-3">
            <Input label="Strategy Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My EMA Crossover" />
            <Select label="Exchange" options={EXCHANGES.map((e) => ({ value: e, label: e }))} value={exchange} onChange={(e) => setExchange(e.target.value)} />
            <Input label="Schedule Start" type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} />
            <Input label="Schedule Stop" type="time" value={scheduleStop} onChange={(e) => setScheduleStop(e.target.value)} />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Active Days</span>
              <div className="flex gap-1">
                {DAYS.map((d) => (
                  <button key={d.value} onClick={() => toggleDay(d.value)}
                    className="px-2 py-1 text-[9px] font-mono rounded-sm outline-none transition-colors"
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
          </div>
        </Card>

        <div style={{ gridColumn: 'span 2' }}>
        <Card title="Strategy Code">
          <div className="flex flex-col gap-2">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full font-mono rounded-sm outline-none resize-none"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '8px',
                fontSize: '10px',
                lineHeight: '1.5',
                minHeight: '300px',
                tabSize: 4,
              }}
              spellCheck={false}
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
                <Plus size={12} /> Create Strategy
              </Button>
            </div>
          </div>
        </Card>
        </div>
      </div>
    </div>
  )
}
