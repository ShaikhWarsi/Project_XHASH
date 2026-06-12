import { useState, useEffect } from 'react'
import { api } from '../api/client'
import Spinner from '../components/Spinner'
import { useToastStore } from '../store/toast'

export default function WallClock() {
  const [summary, setSummary] = useState<any>(null)
  const [completed, setCompleted] = useState<any[]>([])
  const [active, setActive] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, a] = await Promise.all([
        api.get('/wall-clock/summary'),
        api.get('/wall-clock/completed'),
        api.get('/wall-clock/active'),
      ])
      setSummary(s.data)
      setCompleted(c.data.completed || [])
      setActive(a.data.active || [])
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err.message || 'Failed to load', 'error')
    }
    setLoading(false)
  }

  const startTimer = async () => {
    const name = prompt('Timer name:', 'deliberation')
    if (!name) return
    try {
      await api.post(`/wall-clock/start?name=${encodeURIComponent(name)}`)
      load()
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err.message || 'Failed to start timer', 'error')
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="h-full flex flex-col font-mono-data text-[11px] bg-[var(--bg-app)]">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-default">
        <span className="font-bold text-[13px]">WALL CLOCK — AGENT TIMING</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <button onClick={startTimer} className="bg-accent-blue text-white px-3 py-1 text-[11px] rounded cursor-pointer">START TIMER</button>
        <button onClick={load} disabled={loading} className="bg-card border border-default px-3 py-1 text-[11px] rounded cursor-pointer disabled:opacity-50">REFRESH</button>
      </div>
      {loading && <div className="flex-1 flex items-center justify-center"><Spinner label="Loading..." /></div>}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {summary && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">SUMMARY</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-card border border-default p-2 rounded">
                <div className="text-[9px] text-muted">TOTAL OPS</div>
                <div className="text-sm font-bold">{summary.total_ops}</div>
              </div>
              <div className="bg-card border border-default p-2 rounded">
                <div className="text-[9px] text-muted">AVG MS</div>
                <div className="text-sm font-bold">{summary.avg_ms?.toFixed(1)}</div>
              </div>
              <div className="bg-card border border-default p-2 rounded">
                <div className="text-[9px] text-muted">ACTIVE</div>
                <div className="text-sm font-bold text-accent-yellow">{active.length}</div>
              </div>
            </div>
            {Object.entries(summary.by_name || {}).map(([name, data]: [string, any]) => (
              <div key={name} className="bg-card border border-default p-2 rounded mb-1 flex items-center justify-between text-[10px]">
                <span className="text-accent-blue font-semibold">{name}</span>
                <div className="flex gap-3 text-muted">
                  <span>{data.count}x</span>
                  <span>avg {data.avg_ms}ms</span>
                  <span>max {data.max_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {active.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">ACTIVE TIMERS</div>
            {active.map((t, i) => (
              <div key={i} className="bg-card border border-default p-2 rounded mb-1 text-[10px] flex justify-between">
                <span className="text-accent-yellow">{t.name}</span>
                <span className="text-muted">started {new Date(t.started_at * 1000).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold text-muted mb-1">RECENT COMPLETED</div>
            {completed.slice().reverse().slice(0, 20).map((t, i) => (
              <div key={i} className="bg-card border border-default p-1.5 rounded mb-0.5 text-[10px] flex justify-between">
                <span className="text-muted">{t.name}</span>
                <span className={t.elapsed_ms > 1000 ? 'text-accent-yellow' : 'text-up'}>{t.elapsed_ms}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
