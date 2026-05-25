import { useState, useCallback } from 'react'
import { api } from '../api/client'
import { Play, Square, RefreshCw, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react'

const FONT = "font-mono-data text-[11px]"

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
    <div className="flex flex-col h-full gap-1.5">
      <div className="flex items-center gap-2 py-1">
        <span className="font-mono-data text-[11px] font-bold text-up">TASK ORCHESTRATOR</span>
        <span className="font-mono-data text-[10px] text-muted">Run multiple tasks in parallel</span>
        <div className="flex-1" />
        <span className="font-mono-data text-[10px] text-muted">Parallel: </span>
        <select value={parallelCount} onChange={(e) => setParallelCount(Number(e.target.value))}
          className="bg-card border border-default text-primary font-mono-data text-[10px] px-1 py-0.5 outline-none">
          {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={runAll}
          className="flex items-center gap-1 bg-[var(--accent-cyan)] text-black border-none font-mono-data text-[11px] font-semibold px-2.5 py-0.5 cursor-pointer">
          <Play size={12} /> RUN ALL
        </button>
        <button onClick={stopAll}
          className="flex items-center gap-1 bg-card border border-default text-down font-mono-data text-[11px] px-2.5 py-0.5 cursor-pointer">
          <Square size={12} /> STOP ALL
        </button>
      </div>
      <div className="flex gap-1.5 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-1">
          {tasks.map((task) => {
            const cfg = STATUS_CONFIG[task.status]
            const Icon = cfg.icon
            return (
              <div key={task.id} className="bg-card border border-default rounded p-2 font-mono-data text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} style={{ color: cfg.color }} />
                  <span className="font-semibold text-primary">{task.name}</span>
                  <span className="text-[9px] uppercase px-1 rounded-sm" style={{ color: TYPE_COLORS[task.type], background: `${TYPE_COLORS[task.type]}22` }}>{task.type.replace('_', ' ')}</span>
                  <div className="flex-1" />
                  <span className="text-[9px] uppercase" style={{ color: cfg.color }}>{task.status}</span>
                  {task.startedAt && <span className="text-[9px] text-muted">{task.startedAt}</span>}
                  {task.status === 'idle' && (
                    <button onClick={() => startTask(task.id)} className="bg-transparent border-none text-accent-cyan cursor-pointer font-mono-data text-[10px] px-1.5 py-0.5">RUN</button>
                  )}
                  {task.status === 'running' && (
                    <button onClick={() => stopTask(task.id)} className="bg-transparent border-none text-down cursor-pointer font-mono-data text-[10px] px-1.5 py-0.5">STOP</button>
                  )}
                  {task.status === 'failed' && (
                    <button onClick={() => startTask(task.id)} className="bg-transparent border-none text-accent-cyan cursor-pointer font-mono-data text-[10px] px-1.5 py-0.5">RETRY</button>
                  )}
                  {task.status === 'completed' && (
                    <RefreshCw size={12} className="text-muted cursor-pointer" onClick={() => startTask(task.id)} />
                  )}
                </div>
                {(task.status === 'running' || task.status === 'failed') && (
                  <div className="mt-1.5 h-1 bg-[var(--bg-app)] rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-500" style={{ width: `${task.progress}%`, background: task.status === 'running' ? '#22c55e' : '#ef4444' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="w-[300px] border border-default rounded p-2 overflow-auto font-mono-data text-[10px] bg-card">
          <div className="font-bold text-up mb-1 text-[10px]">TASK LOGS</div>
          {logs.length === 0 && <div className="text-muted">No logs yet. Run a task to see output.</div>}
          {logs.map((log, i) => (
            <div key={i} className="text-secondary py-0.5 border-b border-default">{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
