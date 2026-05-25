import { useState, useCallback, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { fetchExperiments, createExperiment, runExperiment, structuredTune, aiOptimize } from '../api/experiments'
import type { Experiment } from '../api/experiments'
import { useToastStore } from '../store/toast'

const FONT_MONO = { fontFamily: "'JetBrains Mono', monospace" }
const FONT_SM = { ...FONT_MONO, fontSize: 10 }
const FONT_DATA = { ...FONT_MONO, fontSize: 11 }
const FONT_LABEL = { fontSize: 9, ...FONT_MONO, letterSpacing: '0.05em' }

type Tab = 'experiments' | 'tune' | 'ai_optimize'

export default function ExperimentLab() {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<Tab>('experiments')
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [runningId, setRunningId] = useState<string | null>(null)

  // New experiment form
  const [newName, setNewName] = useState('')
  const [newConfig, setNewConfig] = useState('{\n  "strategy": "momentum",\n  "tickers": ["SPY"],\n  "lookback": 20\n}')

  // Structured tune form
  const [tuneConfig, setTuneConfig] = useState('{\n  "strategy": "mean_reversion",\n  "params": {\n    "lookback": {"min": 5, "max": 50, "type": "int"},\n    "threshold": {"min": 0.5, "max": 3.0, "type": "float"}\n  },\n  "metric": "sharpe_ratio"\n}')

  // AI optimize form
  const [aiConfig, setAiConfig] = useState('{\n  "objective": "maximize_sharpe",\n  "constraints": {\n    "max_drawdown": 0.2,\n    "min_trades": 10\n  },\n  "search_space": {\n    "lookback": {"low": 5, "high": 100},\n    "entry_threshold": {"low": 0.5, "high": 2.0}\n  }\n}')

  const loadExperiments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchExperiments()
      setExperiments(res.experiments || [])
    } catch (err: any) {
      addToast(err?.message || 'Failed to load experiments', 'error')
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { loadExperiments() }, [loadExperiments])

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return
    try {
      let config: any
      try { config = JSON.parse(newConfig) } catch { config = {} }
      const exp = await createExperiment({ name: newName.trim(), config })
      setExperiments((prev) => [exp, ...prev])
      setNewName('')
      addToast('Experiment created', 'success')
    } catch (err: any) {
      addToast(err?.message || 'Create failed', 'error')
    }
  }, [newName, newConfig, addToast])

  const handleRun = useCallback(async (id: string) => {
    setRunningId(id)
    try {
      await runExperiment(id)
      addToast('Experiment started', 'info')
      setTimeout(loadExperiments, 2000)
    } catch (err: any) {
      addToast(err?.message || 'Run failed', 'error')
    }
    setRunningId(null)
  }, [addToast, loadExperiments])

  const handleStructuredTune = useCallback(async () => {
    try {
      const config = JSON.parse(tuneConfig)
      const exp = await structuredTune(config)
      setExperiments((prev) => [exp, ...prev])
      addToast('Structured tune started', 'info')
    } catch (err: any) {
      addToast(err?.message || 'Tune failed', 'error')
    }
  }, [tuneConfig, addToast])

  const handleAiOptimize = useCallback(async () => {
    try {
      const config = JSON.parse(aiConfig)
      const exp = await aiOptimize(config)
      setExperiments((prev) => [exp, ...prev])
      addToast('AI optimization started', 'info')
    } catch (err: any) {
      addToast(err?.message || 'AI optimize failed', 'error')
    }
  }, [aiConfig, addToast])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="flex items-center gap-2 mb-1">
        {(['experiments', 'tune', 'ai_optimize'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1 text-[10px] font-mono font-semibold cursor-pointer rounded-sm"
            style={{
              background: tab === t ? 'var(--accent-cyan)' : 'var(--bg-hover)',
              color: tab === t ? '#000' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {t === 'experiments' ? 'Experiments' : t === 'tune' ? 'Structured Tune' : 'AI Optimize'}
          </button>
        ))}
      </div>

      {tab === 'experiments' && (
        <>
          <Card title="NEW EXPERIMENT">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Experiment name"
                className="px-2 py-1 text-[10px] font-mono outline-none rounded-sm"
                style={{
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  color: 'var(--input-text)',
                }}
              />
              <textarea
                value={newConfig}
                onChange={(e) => setNewConfig(e.target.value)}
                className="font-mono text-[10px] p-2 outline-none rounded-sm"
                style={{
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  color: 'var(--input-text)', minHeight: 100, resize: 'vertical',
                }}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="self-start px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
                style={{
                  background: 'var(--accent-blue)', color: '#fff', border: 'none',
                  opacity: newName.trim() ? 1 : 0.5,
                }}
              >
                CREATE
              </button>
            </div>
          </Card>

          <Card title={`EXPERIMENTS (${experiments.length})`}>
            {loading ? (
              <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Loading...</div>
            ) : experiments.length === 0 ? (
              <div className="py-6 text-center text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>No experiments yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {experiments.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-sm"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ ...FONT_DATA, color: 'var(--text-primary)' }}>{exp.name}</span>
                        <Badge
                          label={exp.status}
                          variant={exp.status === 'completed' ? 'success' : exp.status === 'failed' ? 'error' : exp.status === 'running' ? 'warning' : 'info'}
                          size="sm"
                        />
                      </div>
                      <div style={{ ...FONT_SM, color: 'var(--text-muted)' }}>
                        {new Date(exp.created_at).toLocaleString()} · {exp.id.slice(0, 8)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRun(exp.id)}
                      disabled={runningId === exp.id || exp.status === 'running'}
                      className="px-2.5 py-0.5 text-[9px] font-mono font-semibold cursor-pointer rounded-sm"
                      style={{
                        background: 'var(--accent-cyan)', color: '#000', border: 'none',
                        opacity: runningId === exp.id ? 0.6 : 1,
                      }}
                    >
                      {runningId === exp.id ? '...' : 'RUN'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'tune' && (
        <Card title="STRUCTURED TUNE">
          <div className="text-[9px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
            Define parameter search space for hyperparameter optimization
          </div>
          <textarea
            value={tuneConfig}
            onChange={(e) => setTuneConfig(e.target.value)}
            className="w-full font-mono text-[10px] p-2 outline-none rounded-sm mb-2"
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              color: 'var(--input-text)', minHeight: 150, resize: 'vertical',
            }}
          />
          <button
            onClick={handleStructuredTune}
            className="px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
            style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
          >
            START TUNE
          </button>
        </Card>
      )}

      {tab === 'ai_optimize' && (
        <Card title="AI OPTIMIZE">
          <div className="text-[9px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
            AI-driven strategy optimization with objective function and constraints
          </div>
          <textarea
            value={aiConfig}
            onChange={(e) => setAiConfig(e.target.value)}
            className="w-full font-mono text-[10px] p-2 outline-none rounded-sm mb-2"
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--input-border)',
              color: 'var(--input-text)', minHeight: 150, resize: 'vertical',
            }}
          />
          <button
            onClick={handleAiOptimize}
            className="px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm"
            style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}
          >
            START OPTIMIZATION
          </button>
        </Card>
      )}
    </div>
  )
}
