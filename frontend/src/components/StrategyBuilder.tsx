import { useState } from 'react'
import { Plus, Save, Play, FolderOpen, FileCode, Settings2, Copy } from 'lucide-react'
import StrategyCondition from './StrategyCondition'
import { useToastStore } from '../store/toast'

interface Condition {
  id: string
  source: 'indicator' | 'price' | 'volume' | 'signal'
  indicator: string
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses_above' | 'crosses_below'
  value: string
  logic?: 'AND' | 'OR'
}

interface Strategy {
  id: string
  name: string
  description: string
  entryConditions: Condition[]
  exitConditions: Condition[]
  tickers: string[]
  timeframe: string
  createdAt: string
}

const PRESET_STRATEGIES: Omit<Strategy, 'id' | 'createdAt'>[] = [
  {
    name: 'Golden Cross',
    description: 'Buy when 50 SMA crosses above 200 SMA',
    entryConditions: [
      { id: '1', source: 'indicator', indicator: 'sma', operator: 'crosses_above', value: '50' },
      { id: '2', source: 'indicator', indicator: 'sma', operator: 'crosses_above', value: '200' },
    ],
    exitConditions: [
      { id: '3', source: 'indicator', indicator: 'sma', operator: 'crosses_below', value: '50' },
    ],
    tickers: ['SPY'],
    timeframe: '1d',
  },
  {
    name: 'RSI Oversold Bounce',
    description: 'Buy when RSI crosses below 30 and moves above',
    entryConditions: [
      { id: '1', source: 'indicator', indicator: 'rsi', operator: 'crosses_below', value: '30' },
    ],
    exitConditions: [
      { id: '3', source: 'indicator', indicator: 'rsi', operator: 'crosses_above', value: '70' },
    ],
    tickers: ['AAPL'],
    timeframe: '1d',
  },
  {
    name: 'Mean Reversion',
    description: 'Buy when price is below lower Bollinger Band',
    entryConditions: [
      { id: '1', source: 'price', indicator: 'sma', operator: '<', value: 'bb_lower' },
    ],
    exitConditions: [
      { id: '3', source: 'price', indicator: 'sma', operator: '>', value: 'bb_middle' },
    ],
    tickers: ['QQQ'],
    timeframe: '1d',
  },
]

interface StrategyBuilderProps {
  onRunBacktest?: (strategy: Strategy) => void
}

export default function StrategyBuilder({ onRunBacktest }: StrategyBuilderProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [entryConditions, setEntryConditions] = useState<Condition[]>([])
  const [exitConditions, setExitConditions] = useState<Condition[]>([])
  const [tickers, setTickers] = useState('')
  const [timeframe, setTimeframe] = useState('1d')
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>(() => {
    try { return JSON.parse(localStorage.getItem('te_strategies') || '[]') } catch (err) { console.warn('[StrategyBuilder] Failed to load strategies:', err); return [] }
  })

  const persist = (strategies: Strategy[]) => {
    localStorage.setItem('te_strategies', JSON.stringify(strategies))
    setSavedStrategies(strategies)
  }

  const addEntryCondition = () => {
    setEntryConditions((prev) => [
      ...prev,
      { id: `ec_${Date.now()}`, source: 'price', indicator: 'sma', operator: '>', value: '0' },
    ])
  }

  const addExitCondition = () => {
    setExitConditions((prev) => [
      ...prev,
      { id: `xc_${Date.now()}`, source: 'price', indicator: 'sma', operator: '<', value: '0' },
    ])
  }

  const updateCondition = (list: 'entry' | 'exit') => (id: string, updates: Partial<Condition>) => {
    const setter = list === 'entry' ? setEntryConditions : setExitConditions
    setter((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  const removeCondition = (list: 'entry' | 'exit') => (id: string) => {
    const setter = list === 'entry' ? setEntryConditions : setExitConditions
    setter((prev) => prev.filter((c) => c.id !== id))
  }

  const loadPreset = (preset: typeof PRESET_STRATEGIES[0]) => {
    setName(preset.name)
    setDescription(preset.description)
    setEntryConditions(preset.entryConditions.map((c) => ({ ...c, id: `ec_${Date.now()}_${Math.random()}` })))
    setExitConditions(preset.exitConditions.map((c) => ({ ...c, id: `xc_${Date.now()}_${Math.random()}` })))
    setTickers(preset.tickers.join(','))
    setTimeframe(preset.timeframe)
  }

  const saveStrategy = () => {
    if (!name.trim() || entryConditions.length === 0) {
      addToast('Strategy needs a name and at least one entry condition', 'warning')
      return
    }
    const strategy: Strategy = {
      id: `strat_${Date.now()}`,
      name,
      description,
      entryConditions,
      exitConditions,
      tickers: tickers.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
      timeframe,
      createdAt: new Date().toISOString(),
    }
    persist([...savedStrategies, strategy])
    addToast(`Strategy "${name}" saved`, 'success')
  }

  const loadStrategy = (strategy: Strategy) => {
    setName(strategy.name)
    setDescription(strategy.description)
    setEntryConditions(strategy.entryConditions)
    setExitConditions(strategy.exitConditions)
    setTickers(strategy.tickers.join(', '))
    setTimeframe(strategy.timeframe)
    addToast(`Loaded strategy "${strategy.name}"`, 'info')
  }

  const deleteStrategy = (id: string) => {
    persist(savedStrategies.filter((s) => s.id !== id))
    addToast('Strategy deleted', 'info')
  }

  const runStrategy = () => {
    if (!name.trim() || entryConditions.length === 0) {
      addToast('Set up strategy conditions first', 'warning')
      return
    }
    const strategy: Strategy = {
      id: `strat_${Date.now()}`,
      name,
      description,
      entryConditions,
      exitConditions,
      tickers: tickers.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean),
      timeframe,
      createdAt: new Date().toISOString(),
    }
    onRunBacktest?.(strategy)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 8px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }} className="overflow-hidden">
      <div style={{ padding: 'var(--card-padding)', borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Strategy Builder</h3>
      </div>

      <div style={{ padding: 'var(--card-padding)' }} className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {PRESET_STRATEGIES.map((ps) => (
            <button
              key={ps.name}
              onClick={() => loadPreset(ps)}
              title={ps.description}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: '10px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <FileCode className="w-3 h-3 inline mr-1" />
              {ps.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Strategy Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Golden Cross" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={inputStyle}>
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1wk', '1mo'].map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Strategy description..." style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tickers (comma-separated)</label>
          <input value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="SPY, QQQ, AAPL" style={inputStyle} />
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Entry Conditions <span style={{ color: 'var(--accent-green)' }}>●</span>
            </h4>
            <button
              onClick={addEntryCondition}
              style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent-green)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
            >
              <Plus className="w-3 h-3 inline mr-1" />Add Condition
            </button>
          </div>
          <div className="space-y-2">
            {entryConditions.map((c, i) => (
              <StrategyCondition
                key={c.id}
                condition={c}
                index={i}
                onChange={updateCondition('entry')}
                onRemove={removeCondition('entry')}
                showLogic
              />
            ))}
            {entryConditions.length === 0 && (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                No entry conditions — strategy will never trigger
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Exit Conditions <span style={{ color: 'var(--accent-red)' }}>●</span>
            </h4>
            <button
              onClick={addExitCondition}
              style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '10px', cursor: 'pointer' }}
            >
              <Plus className="w-3 h-3 inline mr-1" />Add Condition
            </button>
          </div>
          <div className="space-y-2">
            {exitConditions.map((c, i) => (
              <StrategyCondition
                key={c.id}
                condition={c}
                index={i}
                onChange={updateCondition('exit')}
                onRemove={removeCondition('exit')}
                showLogic
              />
            ))}
            {exitConditions.length === 0 && (
              <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                No exit conditions — position held indefinitely
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveStrategy}
            className="flex items-center gap-1.5"
            style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Save className="w-4 h-4" /> Save Strategy
          </button>
          <button
            onClick={runStrategy}
            className="flex items-center gap-1.5"
            style={{ background: 'var(--accent-green)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Play className="w-4 h-4" /> Run Backtest
          </button>
        </div>

        {savedStrategies.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
            <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              <FolderOpen className="w-3.5 h-3.5 inline mr-1" /> Saved Strategies
            </h4>
            <div className="space-y-1">
              {savedStrategies.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {s.entryConditions.length} entry / {s.exitConditions.length} exit · {s.timeframe} · {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadStrategy(s)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: 4, fontSize: '10px' }} title="Load">
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => {
                      const clone: Strategy = {
                        id: `strat_${Date.now()}`,
                        name: `${s.name} (copy)`,
                        description: s.description,
                        entryConditions: s.entryConditions.map((c) => ({ ...c, id: `ec_${Date.now()}_${Math.random()}` })),
                        exitConditions: s.exitConditions.map((c) => ({ ...c, id: `xc_${Date.now()}_${Math.random()}` })),
                        tickers: s.tickers,
                        timeframe: s.timeframe,
                        createdAt: new Date().toISOString(),
                      }
                      persist([...savedStrategies, clone])
                      addToast(`Duplicated "${s.name}"`, 'success')
                    }} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: 4, fontSize: '10px' }} title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteStrategy(s.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 4, fontSize: '10px' }} title="Delete">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
