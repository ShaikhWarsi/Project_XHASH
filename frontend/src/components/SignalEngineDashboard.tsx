import { useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { api } from '../api/client'

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

export default function SignalEngineDashboard() {
  const [tab, setTab] = useState<EngineTab>('spectre')
  const [symbol, setSymbol] = useState('AAPL')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

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
    } catch (err: any) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '4px 8px' }}>
        <Badge label="SIGNAL ENGINES" variant="info" />
        {(['spectre', 'tsfresh', 'rl'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null) }}
            style={{
              background: tab === t ? 'rgba(59,130,246,0.15)' : 'none',
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

      <Card title="RESULTS">
        {result ? (
          result.error ? (
            <div style={{ ...FONT_SM, color: 'var(--accent-red)' }}>Error: {result.error}</div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {Object.entries(result).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                    borderBottom: '1px solid var(--border-color)',
                    ...FONT_DATA,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', ...FONT_LABEL, textTransform: 'capitalize' }}>
                    {k.replace(/_/g, ' ')}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {typeof v === 'number' ? (Math.abs(v) > 100 ? v.toFixed(2) : v.toFixed(4)) : String(v).slice(0, 60)}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ padding: 12, textAlign: 'center', ...FONT_SM, color: 'var(--text-muted)' }}>
            {tab === 'spectre' && 'Run Spectre GPU factor analysis'}
            {tab === 'tsfresh' && 'Run tsfresh feature extraction'}
            {tab === 'rl' && 'Train a reinforcement learning agent'}
          </div>
        )}
      </Card>
    </div>
  )
}
