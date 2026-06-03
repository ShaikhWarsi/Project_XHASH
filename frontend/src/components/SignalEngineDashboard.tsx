import { useState, useMemo } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }
const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

type EngineTab = 'spectre' | 'tsfresh' | 'rl'

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text-primary)',
  ...FONT_SM,
  padding: '2px 6px',
  outline: 'none',
  width: '100%',
}

interface EngineState {
  id: string
  enabled: boolean
  weight: number
  lastFire: string | null
  accuracy: number
}

const INITIAL_ENGINES: EngineState[] = [
  { id: 'spectre', enabled: true, weight: 80, lastFire: '2 min ago', accuracy: 87 },
  { id: 'tsfresh', enabled: true, weight: 60, lastFire: '15 min ago', accuracy: 73 },
  { id: 'rl', enabled: false, weight: 40, lastFire: '1h ago', accuracy: 65 },
]

function ConfidenceGauge({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? Math.min(value / maxValue, 1) : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...FONT_LABEL, color: 'var(--text-secondary)', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{typeof value === 'number' ? value.toFixed(4) : value}</span>
      </div>
      <div style={{ width: '100%', height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: 6, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

function HistogramBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? Math.abs(value) / maxValue : 0
  const isNeg = value < 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ width: 80, ...FONT_LABEL, color: 'var(--text-muted)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 14, background: 'var(--bg-hover)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          [isNeg ? 'right' : 'left']: '50%',
          width: `${pct * 50}%`,
          height: 14,
          background: color,
          borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute',
          top: 0, left: '50%',
          width: 1, height: 14,
          background: 'var(--border-color)',
        }} />
      </div>
      <span style={{ width: 60, ...FONT_DATA, color: 'var(--text-primary)', textAlign: 'right' }}>{value.toFixed(4)}</span>
    </div>
  )
}

type ResultValue = Record<string, number | string>
type ResultEntry = [string, number | string]

function isNumeric(v: unknown): v is number { return typeof v === 'number' && !Number.isNaN(v) }

export default function SignalEngineDashboard() {
  const [tab, setTab] = useState<EngineTab>('spectre')
  const [symbol, setSymbol] = useState('AAPL')
  const [result, setResult] = useState<ResultValue | null>(null)
  const [loading, setLoading] = useState(false)
  const [engines, setEngines] = useState<EngineState[]>(INITIAL_ENGINES)
  const addToast = useToastStore((s) => s.addToast)

  const toggleEngine = (id: string) => {
    setEngines((prev) => prev.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e))
  }

  const setWeight = (id: string, weight: number) => {
    setEngines((prev) => prev.map((e) => e.id === id ? { ...e, weight } : e))
  }

  const testOnAAPL = async (engineId: string) => {
    const start = Date.now()
    addToast(`Testing ${engineId} on AAPL...`, 'info')
    try {
      await api.post('/signal/test', { engine: engineId, symbol: 'AAPL' })
      const elapsed = (Date.now() - start) / 1000
      setEngines((prev) => prev.map((e) => e.id === engineId ? { ...e, lastFire: 'Just now', enabled: true } : e))
      addToast(`${engineId} test passed (${elapsed.toFixed(1)}s)`, 'success')
    } catch (err: any) {
      const elapsed = (Date.now() - start) / 1000
      addToast(`${engineId} test failed after ${elapsed.toFixed(1)}s: ${err.message}`, 'error')
    }
  }

  const runEngine = async () => {
    setLoading(true)
    setResult(null)
    try {
      const endpoints: Record<EngineTab, string> = {
        spectre: '/signals/spectre',
        tsfresh: '/signals/tsfresh',
        rl: '/rl-training/train',
      }
      const payloads: Record<EngineTab, any> = {
        spectre: { symbol, timeframe: '1d' },
        tsfresh: { symbol, interval: '1d', period: 100 },
        rl: { symbol, algo: 'ppo', total_timesteps: 5000 },
      }
      const { data } = await api.post(endpoints[tab], payloads[tab])
      setResult(data)
      setEngines((prev) => prev.map((e) => e.id === tab ? { ...e, lastFire: 'Just now' } : e))
    } catch (err: any) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  const metrics = useMemo(() => {
    if (!result || result.error) return null
    const entries = Object.entries(result) as ResultEntry[]
    const numericValues = entries.filter(([, v]) => isNumeric(v)).map(([, v]) => Math.abs(v as number))
    const maxAbs = numericValues.length > 0 ? Math.max(...numericValues) : 1
    return { entries, maxAbs }
  }, [result])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '4px 8px' }}>
        <Badge label="SIGNAL ENGINES" variant="info" />
        {(['spectre', 'tsfresh', 'rl'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null) }}
            style={{
              background: tab === t ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'none',
              border: 'none',
              color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
              ...FONT_SM,
              padding: '2px 10px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {t === 'spectre' ? 'Spectre GPU' : t === 'tsfresh' ? 'tsfresh' : 'RL Agent'}
          </button>
        ))}
      </div>

      <Card title="CONFIG" padding="compact">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4, alignItems: 'end' }}>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>SYMBOL</div>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} style={INPUT_STYLE} />
          </div>
          <button
            onClick={runEngine}
            disabled={loading}
            style={{
              background: 'var(--accent-purple)',
              color: '#fff',
              border: 'none',
              padding: '4px 16px',
              ...FONT_SM,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {loading ? 'RUNNING...' : `${tab.toUpperCase()}`}
          </button>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="font-mono-data text-[10px] font-bold text-up mb-1">ENGINE STATUS</div>
        {engines.map((engine) => (
          <div key={engine.id} className="bg-card border border-default rounded px-2.5 py-1.5 font-mono-data text-[10px] flex items-center gap-2">
            <button onClick={() => toggleEngine(engine.id)}
              style={{
                width: 28, height: 14, borderRadius: 7, border: 'none', cursor: 'pointer', position: 'relative',
                background: engine.enabled ? 'var(--accent-green)' : 'var(--bg-app)',
                transition: 'background 0.2s',
              }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                left: engine.enabled ? 16 : 2, transition: 'left 0.2s',
              }} />
            </button>
            <span className="font-semibold text-primary w-[60px]">{engine.id}</span>
            <div className="flex items-center gap-1 flex-1">
              <span className="text-muted text-[9px]">Wt:</span>
              <input type="range" min={0} max={100} value={engine.weight}
                onChange={(e) => setWeight(engine.id, Number(e.target.value))}
                className="flex-1 h-1 accent-accent-cyan" style={{ maxWidth: 80 }} />
              <span className="text-primary w-[28px] text-right">{engine.weight}%</span>
            </div>
            <span className="text-muted text-[9px]">Last: {engine.lastFire || 'Never'}</span>
            <span className="text-muted text-[9px]">Acc: </span>
            <span className="text-primary font-semibold">{engine.accuracy}%</span>
            <button onClick={() => testOnAAPL(engine.id)}
              style={{
                background: 'var(--accent-cyan)', color: '#000', border: 'none',
                padding: '2px 8px', cursor: 'pointer', ...FONT_SM, fontSize: 9, fontWeight: 600, borderRadius: 2,
              }}>
              TEST ON AAPL
            </button>
          </div>
        ))}
      </div>

      <Card title="RESULTS">
        {!result && !loading && (
          <div style={{ padding: 12, textAlign: 'center', ...FONT_SM, color: 'var(--text-muted)' }}>
            {tab === 'spectre' && 'Run Spectre GPU factor analysis — results shown as confidence bars'}
            {tab === 'tsfresh' && 'Run tsfresh feature extraction — top features ranked by importance'}
            {tab === 'rl' && 'Train a reinforcement learning agent — policy and reward metrics'}
          </div>
        )}
        {loading && (
          <div style={{ padding: 12, textAlign: 'center', ...FONT_SM, color: 'var(--text-muted)' }}>
            <div className="animate-pulse-glow" style={{ width: '100%', height: 4, background: 'var(--accent-blue)', borderRadius: 2, marginBottom: 8 }} />
            Processing signal engine...
          </div>
        )}
        {result?.error && (
          <div style={{ ...FONT_SM, color: 'var(--accent-red)' }}>Error: {result.error}</div>
        )}
        {metrics && !result?.error && (
          <div>
            {tab === 'spectre' && (
              <div style={{ marginBottom: 8 }}>
                {metrics.entries.map(([k, v]) => (
                  isNumeric(v) ? (
                    <HistogramBar
                      key={k}
                      label={k.replace(/_/g, ' ')}
                      value={v}
                      maxValue={metrics.maxAbs}
                      color={v >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    />
                  ) : (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', ...FONT_DATA, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ ...FONT_LABEL, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(v).slice(0, 60)}</span>
                    </div>
                  )
                ))}
              </div>
            )}
            {tab === 'tsfresh' && (
              <div>
                {metrics.entries.slice(0, 10).map(([k, v], i) => (
                  isNumeric(v) ? (
                    <ConfidenceGauge
                      key={k}
                      label={`#${i + 1} ${k.replace(/_/g, ' ')}`}
                      value={v}
                      maxValue={metrics.maxAbs}
                      color={i === 0 ? 'var(--accent-green)' : i < 3 ? 'var(--accent-blue)' : 'var(--accent-cyan)'}
                    />
                  ) : null
                ))}
              </div>
            )}
            {tab === 'rl' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6, marginBottom: 8 }}>
                  {metrics.entries.map(([k, v]) => (
                    isNumeric(v) ? (
                      <div key={k} style={{ textAlign: 'center', padding: '6px 4px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{v.toFixed(2)}</div>
                        <div style={{ ...FONT_LABEL, color: 'var(--text-muted)', marginTop: 2 }}>{k.replace(/_/g, ' ')}</div>
                      </div>
                    ) : null
                  ))}
                </div>
                <div style={{ width: '100%', height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
                  <div className="animate-pulse-glow" style={{ width: '60%', height: 4, background: 'var(--accent-green)', borderRadius: 2 }} />
                </div>
                <div style={{ ...FONT_LABEL, color: 'var(--text-muted)', marginTop: 4 }}>Training progress indicator</div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
