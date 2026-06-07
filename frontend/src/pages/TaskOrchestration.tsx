import { useState, useCallback } from 'react'
import { api } from '../api/client'
import { Play, Square, RefreshCw, Activity, AlertCircle, CheckCircle, Clock, ListOrdered } from 'lucide-react'

// const FONT = "font-mono-data text-[11px]"

interface Task {
  id: string
  name: string
  type: 'backtest' | 'data_collection' | 'optimization' | 'signal_generation'
  status: 'idle' | 'running' | 'completed' | 'failed'
  progress: number
  startedAt?: string
  completedAt?: string
  queuedAt?: string
}

interface Worker {
  id: string
  status: 'idle' | 'busy'
  currentTask: string | null
}

const INITIAL_TASKS: Task[] = [
  { id: 'task-1', name: 'AAPL Backtest 2024', type: 'backtest', status: 'completed', progress: 100, startedAt: '2024-01-01 09:00', completedAt: '2024-01-01 09:02' },
  { id: 'task-2', name: 'MSFT Data Collection', type: 'data_collection', status: 'running', progress: 65, startedAt: '2024-01-01 09:05' },
  { id: 'task-3', name: 'Portfolio Optimization', type: 'optimization', status: 'idle', progress: 0 },
  { id: 'task-4', name: 'RSI Signal Generation', type: 'signal_generation', status: 'failed', progress: 30, startedAt: '2024-01-01 08:55', completedAt: '2024-01-01 08:56' },
]

const INITIAL_WORKERS: Worker[] = [
  { id: 'w1', status: 'busy', currentTask: 'task-2' },
  { id: 'w2', status: 'idle', currentTask: null },
  { id: 'w3', status: 'idle', currentTask: null },
]

const STATUS_CONFIG = {
  idle: { icon: Clock, color: 'var(--text-muted)' },
  running: { icon: Activity, color: 'var(--accent-green)' },
  completed: { icon: CheckCircle, color: 'var(--accent-blue)' },
  failed: { icon: AlertCircle, color: 'var(--accent-red)' },
}

const TYPE_COLORS: Record<string, string> = {
  backtest: 'var(--accent-blue)',
  data_collection: 'var(--accent-green)',
  optimization: 'var(--accent-purple)',
  signal_generation: 'var(--accent-yellow)',
}

type TabType = 'list' | 'queue'

export default function TaskOrchestration() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS)
  const [parallelCount, setParallelCount] = useState(3)
  const [logs, setLogs] = useState<string[]>([])
  const [tab, setTab] = useState<TabType>('list')

  const assignToWorker = useCallback((taskId: string) => {
    setWorkers((prev) => {
      const idle = prev.find((w) => w.status === 'idle')
      if (!idle) return prev
      return prev.map((w) => w.id === idle.id ? { ...w, status: 'busy' as const, currentTask: taskId } : w)
    })
  }, [])

  const releaseWorker = useCallback((taskId: string) => {
    setWorkers((prev) =>
      prev.map((w) => w.currentTask === taskId ? { ...w, status: 'idle' as const, currentTask: null } : w)
    )
  }, [])

  const startTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'running', progress: 0, startedAt: new Date().toLocaleTimeString() } : t))
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} started`])
    assignToWorker(taskId)

    try {
      const { data: _data } = await api.post('/backtest/run', {
        tickers: ['AAPL'],
        start: '2024-01-01',
        end: '2024-12-31',
        capital: 100000,
        strategy: 'sma_cross',
        entryConditions: [{ source: 'price', indicator: 'sma_fast', operator: 'crosses_above', value: 'sma_slow' }],
        exitConditions: [{ source: 'price', indicator: 'sma_fast', operator: 'crosses_below', value: 'sma_slow' }],
        commission_pct: 0.001,
      })
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'completed', progress: 100, completedAt: new Date().toLocaleTimeString() } : t))
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} completed`])
      releaseWorker(taskId)
    } catch (e: any) {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'failed', progress: 0 } : t))
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} failed: ${e?.message || 'Unknown'}`])
      releaseWorker(taskId)
    }
  }, [assignToWorker, releaseWorker])

  const stopTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'idle', progress: 0 } : t))
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Task ${taskId} stopped`])
    releaseWorker(taskId)
  }

  const queueTask = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status !== 'idle') return
    const queuedAt = new Date().toLocaleTimeString()
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, queuedAt } : t))
    setLogs((prev) => [...prev, `[${queuedAt}] Task ${taskId} queued`])
    const idleWorker = workers.find((w) => w.status === 'idle')
    if (idleWorker) {
      startTask(taskId)
    }
  }, [tasks, workers, startTask])

  const runAll = () => {
    tasks.filter((t) => t.status === 'idle').forEach((t) => queueTask(t.id))
  }

  const stopAll = () => {
    tasks.filter((t) => t.status === 'running').forEach((t) => stopTask(t.id))
  }

  const queuedTasks = tasks.filter((t) => t.status === 'idle' && t.queuedAt)
    .sort((a, b) => {
      if (!a.queuedAt || !b.queuedAt) return 0
      return a.queuedAt.localeCompare(b.queuedAt)
    })

  const runningTasks = tasks.filter((t) => t.status === 'running')

  return (
    <div className="flex flex-col h-full gap-1.5">
      <div className="flex items-center gap-2 py-1">
        <span className="font-mono-data text-[11px] font-bold text-up">TASK ORCHESTRATOR</span>
        <span className="font-mono-data text-[10px] text-muted">Run multiple tasks in parallel</span>
        <div className="flex-1" />
        <div className="flex gap-1 mr-2">
          <button onClick={() => setTab('list')}
            className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${tab === 'list' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>
            LIST
          </button>
          <button onClick={() => setTab('queue')}
            className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${tab === 'queue' ? 'bg-accent-cyan text-black' : 'bg-card text-primary'}`}>
            QUEUE
          </button>
        </div>
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
        {tab === 'list' && (
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
                      <button onClick={() => queueTask(task.id)} className="bg-transparent border-none text-accent-cyan cursor-pointer font-mono-data text-[10px] px-1.5 py-0.5">RUN</button>
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
                      <div className="h-full rounded transition-all duration-500" style={{ width: `${task.progress}%`, background: task.status === 'running' ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {tab === 'queue' && (
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex gap-2">
              {workers.map((w) => {
                const task = tasks.find((t) => t.id === w.currentTask)
                return (
                  <div key={w.id} className="flex-1 bg-card border border-default rounded p-2 font-mono-data text-[10px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: w.status === 'busy' ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                      <span className="font-bold text-primary">{w.id.toUpperCase()}</span>
                    </div>
                    <div className="text-muted text-[9px]">{w.status === 'busy' ? (task?.name || 'Busy') : 'Idle'}</div>
                  </div>
                )
              })}
            </div>
            <div className="font-mono-data text-[10px] font-bold text-up flex items-center gap-1">
              <ListOrdered size={12} /> QUEUED ({queuedTasks.length})
            </div>
            <div className="flex flex-col gap-1 flex-1 overflow-auto">
              {queuedTasks.length === 0 && (
                <div className="font-mono-data text-[10px] text-muted text-center py-4">No queued tasks</div>
              )}
              {queuedTasks.map((task) => (
                <div key={task.id} className="bg-card border border-default rounded p-2 font-mono-data text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-muted" />
                    <span className="font-semibold text-primary">{task.name}</span>
                    <span className="text-[9px] uppercase px-1 rounded-sm" style={{ color: TYPE_COLORS[task.type], background: `${TYPE_COLORS[task.type]}22` }}>{task.type.replace('_', ' ')}</span>
                    <div className="flex-1" />
                    <span className="text-[8px] text-muted">Queued: {task.queuedAt}</span>
                    <button onClick={() => startTask(task.id)} className="bg-transparent border-none text-accent-cyan cursor-pointer font-mono-data text-[9px] px-1">START</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="font-mono-data text-[10px] font-bold text-up flex items-center gap-1">
              <Activity size={12} /> RUNNING ({runningTasks.length})
            </div>
            <div className="flex flex-col gap-1">
              {runningTasks.length === 0 && (
                <div className="font-mono-data text-[10px] text-muted text-center py-2">No running tasks</div>
              )}
              {runningTasks.map((task) => {
                const worker = workers.find((w) => w.currentTask === task.id)
                return (
                  <div key={task.id} className="bg-card border border-default rounded p-2 font-mono-data text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <Activity size={12} style={{ color: 'var(--accent-green)' }} />
                      <span className="font-semibold text-primary">{task.name}</span>
                      {worker && <span className="text-[9px] text-muted">on {worker.id.toUpperCase()}</span>}
                      <div className="flex-1" />
                      <button onClick={() => stopTask(task.id)} className="bg-transparent border-none text-down cursor-pointer font-mono-data text-[9px] px-1">STOP</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
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
