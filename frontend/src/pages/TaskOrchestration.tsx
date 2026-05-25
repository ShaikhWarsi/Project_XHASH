import { useState, useCallback } from 'react'
import { api } from '../api/client'
import { Play, Square, RefreshCw, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'

const FONT = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

interface Task {
  id: string
  name: string
  type: 'backtest' | 'data_collection' | 'optimization' | 'signal_generation'
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt?: string
  completedAt?: string
}

const INITIAL_TASKS: Task[] = [
  { id: 'task-1', name: 'AAPL Backtest 2024', type: 'backtest', status: 'completed', progress: 100, startedAt: '2024-01-01 09:00', completedAt: '2024-01-01 09:02' },
  { id: 'task-2', name: 'MSFT Data Collection', type: 'data_collection', status: 'running', progress: 65, startedAt: '2024-01-01 09:05' },
  { id: 'task-3', name: 'Portfolio Optimization', type: 'optimization', status: 'idle', progress: 0 },
  { id: 'task-4', name: 'RSI Signal Generation', type: 'signal_generation', status: 'failed', progress: 30, startedAt: '2024-01-01 08:55', completedAt: '2024-01-01 08:56' },
]

const STATUS_CONFIG = {
  idle: { icon: Clock, color: 'var(--text-muted)' },
  running: { icon: Activity, color: '#22c55e' },
  completed: { icon: CheckCircle, color: '#3b82f6' },
  failed: { icon: AlertCircle, color: '#ef4444' },
}

const TYPE_COLORS = {
  backtest: '#3b82f6',
  data_collection: '#22c55e',
  optimization: '#a855f7',
  signal_generation: '#f59e0b',
}

export default function TaskOrchestration() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [parallelCount, setParallelCount] = useState(3)
  const [logs, setLogs] = useState<string[]>([])

  const startTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'running', progress: 0, startedAt: new Date().toLocaleTimeString() } : t))
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} started`])

    try {
      const { data: _data } = await api.post('/backtest/run', {
        tickers: ['AAPL'],
        start: '2024-01-01',
        end: '2024-12-31',
        capital: 100000,
        strategy: 'hybrid',
      })
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'completed', progress: 100, completedAt: new Date().toLocaleTimeString() } : t))
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} completed`])
    } catch (e: any) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'failed', progress: 0 } : t))
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} failed: ${e?.message || 'Unknown'}`])
    }
  }, [])

  const stopTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'idle', progress: 0 } : t))
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} stopped`])
  }

  const runAll = () => {
    tasks.filter((t) => t.status === 'idle').forEach((t) => startTask(t.id))
  }

  const stopAll = () => {
    tasks.filter((t) => t.status === 'running').forEach((t) => stopTask(t.id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ ...FONT, fontWeight: 700, color: 'var(--accent-green)' }}>TASK ORCHESTRATOR</span>
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>Run multiple tasks in parallel</span>
        <div style={{ flex: 1 }} />
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>Parallel: </span>
        <select value={parallelCount} onChange={(e) => setParallelCount(Number(e.target.value))}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', ...FONT, fontSize: 10, padding: '2px 4px', outline: 'none' }}>
          {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={runAll}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-cyan)', color: '#000', border: 'none', ...FONT, fontWeight: 600, padding: '3px 10px', cursor: 'pointer' }}>
          <Play size={12} /> RUN ALL
        </button>
        <button onClick={stopAll}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--accent-red)', ...FONT, padding: '3px 10px', cursor: 'pointer' }}>
          <Square size={12} /> STOP ALL
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status]
            const Icon = cfg.icon
            return (
              <div key={task.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '8px 10px', ...FONT, fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={14} style={{ color: cfg.color }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.name}</span>
                  <span style={{ fontSize: 9, color: TYPE_COLORS[task.type], background: `${TYPE_COLORS[task.type]}22`, padding: '1px 5px', borderRadius: 3, textTransform: 'uppercase' }}>{task.type.replace('_', ' ')}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, color: cfg.color, textTransform: 'uppercase' }}>{task.status}</span>
                  {task.startedAt && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{task.startedAt}</span>}
                  {task.status === 'idle' && (
                    <button onClick={() => startTask(task.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', ...FONT, fontSize: 10, padding: '2px 6px' }}>RUN</button>
                  )}
                  {task.status === 'running' && (
                    <button onClick={() => stopTask(task.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', ...FONT, fontSize: 10, padding: '2px 6px' }}>STOP</button>
                  )}
                  {task.status === 'failed' && (
                    <button onClick={() => startTask(task.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', ...FONT, fontSize: 10, padding: '2px 6px' }}>RETRY</button>
                  )}
                  {task.status === 'completed' && (
                    <RefreshCw size={12} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => startTask(task.id)} />
                  )}
                </div>
                {(task.status === 'running' || task.status === 'failed') && (
                  <div style={{ marginTop: 6, height: 4, background: 'var(--bg-app)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${task.progress}%`, background: task.status === 'running' ? '#22c55e' : '#ef4444', borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ width: 300, border: '1px solid var(--border-color)', borderRadius: 4, padding: 8, overflow: 'auto', ...FONT, fontSize: 10, background: 'var(--bg-card)' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4, fontSize: 10 }}>TASK LOGS</div>
          {logs.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No logs yet. Run a task to see output.</div>}
          {logs.map((log, i) => (
            <div key={i} style={{ color: 'var(--text-secondary)', padding: '1px 0', borderBottom: '1px solid var(--border-color)' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
