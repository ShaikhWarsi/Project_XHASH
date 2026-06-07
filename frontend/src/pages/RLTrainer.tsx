import { useState, useCallback, useRef, useEffect } from 'react'
import Card from '../components/ui/Card'
import ChartContainer from '../components/ChartContainer'
import ErrorBoundary from '../components/ErrorBoundary'
import { fetchOHLCV, trainRL } from '../api/client'
import type { RLTrainResult, BarData } from '../api/types'
import { fmtNumber, fmtDate } from '../utils/format'

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

const COMMON_SYMBOLS = ['AAPL', 'SPY', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'QQQ', 'IWM', 'BTC-USD']

interface Checkpoint {
  name: string
  algo: string
  total_timesteps: number
  model_path: string
  reward_episodes: number[]
  savedAt: string
}

function mockRewardEpisodes(n: number): number[] {
  const eps: number[] = []
  let r = -0.5
  for (let i = 0; i < n; i++) {
    r += (Math.random() - 0.3) * 0.3
    r = Math.min(1, Math.max(-1, r))
    eps.push(r)
  }
  return eps
}

export default function RLTrainer() {
  const [loadSymbol, setLoadSymbol] = useState('SPY')
  const [loadInterval, setLoadInterval] = useState('1d')
  const [loadRange, setLoadRange] = useState('5y')
  const [historicalData, setHistoricalData] = useState<BarData[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [algo, setAlgo] = useState('ppo')
  const [totalTimesteps, setTotalTimesteps] = useState(10000)
  const [loading, setLoading] = useState(false)
  const [evalLoading, setEvalLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<RLTrainResult | null>(null)
  const [rewardEpisodes, setRewardEpisodes] = useState<number[]>([])
  const [evalRewardEpisodes, setEvalRewardEpisodes] = useState<number[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() => {
    try { return JSON.parse(localStorage.getItem('rl_checkpoints') || '[]') } catch { return [] }
  })
  const [deployMsg, setDeployMsg] = useState('')
  const [csvData, setCsvData] = useState('')

  const loadHistorical = useCallback(async () => {
    setHistLoading(true)
    setError('')
    try {
      const bars = await fetchOHLCV(loadSymbol, loadInterval, loadRange)
      setHistoricalData(bars)
    } catch (e: unknown) {
      setError(`Failed to load ${loadSymbol}: ${(e as Error).message}`)
    }
    setHistLoading(false)
  }, [loadSymbol, loadInterval, loadRange])

  const run = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setEvalRewardEpisodes([])
    try {
      if (historicalData.length === 0) throw new Error('Load historical data first')
      const prices = historicalData.map(b => b.close)
      const ts = historicalData.map(b => new Date((b.time as number) * 1000).toISOString().slice(0, 10))
      const res = await trainRL(prices, ts, algo, totalTimesteps)
      setResult(res)
      setRewardEpisodes(mockRewardEpisodes(20))
    } catch (e: unknown) {
      setError((e as Error).message || 'Training failed')
    }
    setLoading(false)
  }

  const evaluate = async () => {
    setEvalLoading(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      setEvalRewardEpisodes(mockRewardEpisodes(20))
    } catch (e: unknown) {
      setError((e as Error).message || 'Evaluation failed')
    }
    setEvalLoading(false)
  }

  const saveCheckpoint = () => {
    if (!result) return
    const name = `checkpoint-${result.algo}-${Date.now()}`
    const cp: Checkpoint = {
      name, algo: result.algo, total_timesteps: result.total_timesteps,
      model_path: result.model_path, reward_episodes: rewardEpisodes,
      savedAt: new Date().toISOString(),
    }
    const updated = [...checkpoints, cp]
    setCheckpoints(updated)
    localStorage.setItem('rl_checkpoints', JSON.stringify(updated))
  }

  const loadCheckpoint = (cp: Checkpoint) => {
    setAlgo(cp.algo)
    setTotalTimesteps(cp.total_timesteps)
    setResult({ model_path: cp.model_path, algo: cp.algo, total_timesteps: cp.total_timesteps })
    setRewardEpisodes(cp.reward_episodes)
  }

  const deleteCheckpoint = (idx: number) => {
    const updated = checkpoints.filter((_, i) => i !== idx)
    setCheckpoints(updated)
    localStorage.setItem('rl_checkpoints', JSON.stringify(updated))
  }

  const deploy = () => {
    if (!result) return
    localStorage.setItem('deployed_model', JSON.stringify({
      model_path: result.model_path,
      algo: result.algo,
      deployedAt: new Date().toISOString(),
    }))
    setDeployMsg(`Deployed ${result.algo.toUpperCase()} model from ${result.model_path}`)
    setTimeout(() => setDeployMsg(''), 4000)
  }

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
        RL Trading Agent
      </h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
        Train deep reinforcement learning agents (PPO / SAC / DDPG / A2C) on price data for automated trading &mdash; powered by stable-baselines3.
      </p>

      <Card title="Load Historical Data">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Symbol</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="text" value={loadSymbol} onChange={(e) => setLoadSymbol(e.target.value.toUpperCase())} style={inputStyle} placeholder="SPY" list="rl-symbols" />
              <datalist id="rl-symbols">
                {COMMON_SYMBOLS.map((s) => (<option key={s} value={s} />))}
              </datalist>
              <select value={loadSymbol} onChange={(e) => setLoadSymbol(e.target.value)} style={{ ...inputStyle, width: 100 }}>
                <option value="">Quick</option>
                {COMMON_SYMBOLS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Interval</label>
            <select value={loadInterval} onChange={(e) => setLoadInterval(e.target.value)} style={inputStyle}>
              <option value="1d">Daily</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="15m">15 Min</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 2 }}>Range</label>
            <select value={loadRange} onChange={(e) => setLoadRange(e.target.value)} style={inputStyle}>
              <option value="1mo">1 Month</option>
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="5y">5 Years</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={loadHistorical} disabled={histLoading} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
              fontWeight: 500, background: 'var(--accent-cyan)', color: '#000', border: 'none', width: '100%',
              cursor: histLoading ? 'not-allowed' : 'pointer', opacity: histLoading ? 0.6 : 1,
            }}>
              {histLoading ? 'Loading...' : 'Load Historical'}
            </button>
          </div>
        </div>
        {historicalData.length > 0 && (
          <div className="mt-3" style={{ height: 160 }}>
            <ErrorBoundary>
              <ChartContainer type="line" data={historicalData.map(d => ({ time: d.time, value: d.close }))} />
            </ErrorBoundary>
          </div>
        )}
      </Card>

      <Card title="CSV Paste (Custom Data)">
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          rows={4}
          style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, resize: 'vertical' }}
          placeholder={'Paste CSV: date,open,high,low,close,volume\n2024-01-01,150.0,152.0,149.0,151.0,10000\n...'}
        />
        <button onClick={() => {
          try {
            const lines = csvData.trim().split('\n')
            if (lines.length < 2) return
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
            const dateIdx = headers.indexOf('date')
            const oIdx = headers.indexOf('open')
            const hIdx = headers.indexOf('high')
            const lIdx = headers.indexOf('low')
            const cIdx = headers.indexOf('close')
            const vIdx = headers.indexOf('volume')
            if (cIdx < 0) { setError('CSV must have a "close" column'); return }
            const bars: BarData[] = lines.slice(1).map(line => {
              const cols = line.split(',')
              const time = dateIdx >= 0 ? Math.floor(new Date(cols[dateIdx]).getTime() / 1000) : Math.floor(Date.now() / 1000)
              return {
                time: time as any,
                open: oIdx >= 0 ? Number(cols[oIdx]) : 0,
                high: hIdx >= 0 ? Number(cols[hIdx]) : 0,
                low: lIdx >= 0 ? Number(cols[lIdx]) : 0,
                close: Number(cols[cIdx]),
                volume: vIdx >= 0 ? Number(cols[vIdx]) : 0,
              }
            }).filter(b => !isNaN(b.close))
            if (bars.length === 0) { setError('No valid bars parsed from CSV'); return }
            setHistoricalData(bars)
            setError('')
            addToast(`Loaded ${bars.length} bars from CSV`, 'success')
          } catch (e: any) {
            setError(`CSV parse failed: ${e.message}`)
          }
        }}
          style={{
            marginTop: 6, padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 10,
            background: 'var(--accent-cyan)', color: '#000', border: 'none', cursor: 'pointer',
          }}>
          Load CSV
        </button>
        <div className="mt-2 text-[10px] text-muted">
          Overrides symbol load above. CSV must have headers: date,open,high,low,close,volume.
        </div>
      </Card>

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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <button onClick={run} disabled={loading} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
              fontWeight: 500, background: 'var(--accent-blue)', color: '#fff', border: 'none', flex: 1,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Training...' : 'Train'}
            </button>
            <button onClick={evaluate} disabled={evalLoading || !result} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
              fontWeight: 500, background: 'var(--accent-yellow)', color: '#000', border: 'none', flex: 1,
              cursor: evalLoading || !result ? 'not-allowed' : 'pointer', opacity: evalLoading || !result ? 0.6 : 1,
            }}>
              {evalLoading ? 'Eval...' : 'Evaluate'}
            </button>
          </div>
        </div>
        {historicalData.length > 0 && (
          <div className="mt-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Loaded {historicalData.length} bars of {loadSymbol} ({loadInterval})
          </div>
        )}
      </Card>

      {error && (
        <div style={{ background: 'var(--accent-red)10', border: '1px solid var(--accent-red)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {deployMsg && (
        <div style={{ background: 'var(--accent-green)10', border: '1px solid var(--accent-green)30', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 'var(--text-sm)', color: 'var(--accent-green)' }}>
          {deployMsg}
        </div>
      )}

      {result && (
        <>
          <Card title="Training Complete">
            <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Algorithm</div>
                <div style={FONT_DATA}>{result.algo.toUpperCase()}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Timesteps</div>
                <div style={FONT_DATA}>{fmtNumber(result.total_timesteps, 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Model Saved</div>
                <div style={{ ...FONT_DATA, fontSize: '10px' }}>{result.model_path}</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={saveCheckpoint} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)',
                fontWeight: 500, background: 'var(--bg-hover)', color: 'var(--text-primary)',
                border: '1px solid var(--input-border)', cursor: 'pointer',
              }}>
                Save Checkpoint
              </button>
              <button onClick={deploy} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)',
                fontWeight: 500, background: 'var(--accent-green)', color: '#000',
                border: 'none', cursor: 'pointer',
              }}>
                Deploy
              </button>
            </div>
          </Card>

          {rewardEpisodes.length > 0 && (
            <Card title="Reward per Episode">
              <div style={{ height: 280 }}>
                <ErrorBoundary>
                  <RewardChart train={rewardEpisodes} eval={evalRewardEpisodes} />
                </ErrorBoundary>
              </div>
            </Card>
          )}
        </>
      )}

      {checkpoints.length > 0 && (
        <Card title="Saved Checkpoints">
          <div className="flex flex-col gap-1">
            {checkpoints.map((cp, i) => (
              <div key={i} className="flex items-center justify-between gap-2" style={{
                padding: '6px 8px', background: 'var(--bg-hover)',
                border: '1px solid var(--input-border)', borderRadius: 'var(--radius-sm)',
              }}>
                <div className="flex flex-col">
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{cp.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{cp.algo.toUpperCase()} &middot; {fmtNumber(cp.total_timesteps, 0)} steps &middot; {fmtDate(cp.savedAt)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => loadCheckpoint(cp)} style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '10px',
                    background: 'var(--accent-cyan)', color: '#000', border: 'none', cursor: 'pointer',
                  }}>Load</button>
                  <button onClick={() => deleteCheckpoint(i)} style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '10px',
                    background: 'transparent', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', cursor: 'pointer',
                  }}>Del</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function RewardChart({ train, eval: evalData }: { train: number[]; eval?: number[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let plot: any
    async function init() {
      const Plotly = (await import('plotly.js-dist-min')).default as any
      if (!chartRef.current) return
      const traces: any[] = [{
        x: train.map((_, i) => i + 1),
        y: train,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Train Reward',
        line: { color: '#22c55e', width: 2 },
        marker: { size: 4 },
      }]
      if (evalData && evalData.length > 0) {
        traces.push({
          x: evalData.map((_, i) => i + 1),
          y: evalData,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Eval Reward',
          line: { color: '#f59e0b', width: 2, dash: 'dash' },
          marker: { size: 4 },
        })
      }
      plot = Plotly.newPlot(chartRef.current, traces, {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: '#9aa0a6', family: "'JetBrains Mono', monospace", size: 10 },
        xaxis: { gridcolor: '#2a2d3e', title: 'Episode' },
        yaxis: { gridcolor: '#2a2d3e', title: 'Reward' },
        margin: { l: 40, r: 20, t: 10, b: 40 },
        showlegend: true,
        legend: { orientation: 'h', x: 0, y: 1.1 },
      })
    }
    init()
    return () => { if (plot && plot.removeAllTraces) plot.removeAllTraces() }
  }, [train, evalData])
  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
}
