import { useState } from 'react'
import Card from '../components/ui/Card'
import { trainRL } from '../api/client'
import type { RLTrainResult } from '../api/types'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-hover)',
  border: '1px solid var(--input-border)',
  borderRadius: 'var(--radius-md)',
  padding: '6px 12px',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
}

const FONT_DATA = { fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--text-sm)' }

export default function RLTrainer() {
  const [priceInput, setPriceInput] = useState('')
  const [timestamps, setTimestamps] = useState('')
  const [algo, setAlgo] = useState('ppo')
  const [totalTimesteps, setTotalTimesteps] = useState(10000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RLTrainResult | null>(null)

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const prices = priceInput.split(',').map(Number).filter(n => !isNaN(n))
      const ts = timestamps.split(',').map(s => s.trim()).filter(Boolean)
      if (prices.length === 0) throw new Error('Enter price data')
      if (ts.length === 0) throw new Error('Enter timestamps')
      const res = await trainRL(prices, ts, algo, totalTimesteps)
      setResult(res)
    } catch (e: unknown) {
      setError((e as Error).message || 'Training failed')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
        RL Trading Agent
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Train deep reinforcement learning agents (PPO / SAC / DDPG / A2C) on price data for automated trading &mdash; powered by stable-baselines3.
      </p>

      <Card title="Training Configuration">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Algorithm</label>
            <select value={algo} onChange={(e) => setAlgo(e.target.value)} style={inputStyle}>
              <option value="ppo">PPO</option>
              <option value="sac">SAC</option>
              <option value="ddpg">DDPG</option>
              <option value="a2c">A2C</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Total Timesteps</label>
            <input type="number" value={totalTimesteps} onChange={(e) => setTotalTimesteps(Number(e.target.value))} style={inputStyle} min={1000} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={run} disabled={loading} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
              fontWeight: 500, background: 'var(--accent-blue)', color: '#fff', border: 'none', width: '100%',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Training...' : 'Start Training'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3" style={{ marginTop: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Prices (comma-separated)</label>
            <textarea value={priceInput} onChange={(e) => setPriceInput(e.target.value)} style={{ ...inputStyle, minHeight: 60, fontFamily: "'JetBrains Mono', monospace" }} placeholder="100,101,102,..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Timestamps (comma-separated ISO dates)</label>
            <textarea value={timestamps} onChange={(e) => setTimestamps(e.target.value)} style={{ ...inputStyle, minHeight: 60, fontFamily: "'JetBrains Mono', monospace" }} placeholder="2024-01-01,2024-01-02,..." />
          </div>
        </div>
      </Card>

      {error && (
        <div style={{ background: 'var(--accent-red)10', border: '1px solid var(--accent-red)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {result && (
        <Card title="Training Complete">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Algorithm</div>
              <div style={FONT_DATA}>{result.algo.toUpperCase()}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Timesteps</div>
              <div style={FONT_DATA}>{result.total_timesteps.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Model Saved</div>
              <div style={{ ...FONT_DATA, fontSize: '10px' }}>{result.model_path}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: 'var(--accent-green)10', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>
            Model saved to {result.model_path}. Use <code>evaluate</code> endpoint to test it.
          </div>
        </Card>
      )}
    </div>
  )
}
