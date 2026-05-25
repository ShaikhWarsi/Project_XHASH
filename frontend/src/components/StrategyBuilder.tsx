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
    try { return JSON.parse(localStorage.getItem('te_strategies') || '[]') } catch (err) { console.warn('[StrategyBuilder] Failed to load strategies:', err); addToast('Failed to load saved strategies', 'error'); return [] }
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

  const inputClass = "w-full bg-[var(--bg-primary)] border border-default rounded-sm px-2 py-1.5 text-xs text-primary outline-none"

  return (
    <div className="bg-card border border-default rounded-lg overflow-hidden">
      <div className="p-5 border-b border-default">
        <h3 className="text-sm font-semibold text-primary">Strategy Builder</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {PRESET_STRATEGIES.map((ps) => (
            <button
              key={ps.name}
              onClick={() => loadPreset(ps)}
              title={ps.description}
              className="bg-hover border border-default rounded-sm px-2.5 py-1 text-[10px] text-secondary cursor-pointer"
            >
              <FileCode className="w-3 h-3 inline mr-1" />
              {ps.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted">Strategy Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Golden Cross" className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-muted">Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={inputClass}>
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1wk', '1mo'].map((tf) => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Strategy description..." className={inputClass} />
        </div>

        <div>
          <label className="text-[10px] text-muted">Tickers (comma-separated)</label>
          <input value={tickers} onChange={(e) => setTickers(e.target.value)} placeholder="SPY, QQQ, AAPL" className={inputClass} />
        </div>

        <div className="border-t border-default pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-primary">
              Entry Conditions <span className="text-up">●</span>
            </h4>
            <button
              onClick={addEntryCondition}
              style={{ background: 'rgba(34,197,94,0.15)' }}
              className="text-up border-none rounded-sm px-2 py-1 text-[10px] cursor-pointer"
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
              <div className="p-3 text-center text-muted text-[11px] border border-dashed border-default rounded-sm">
                No entry conditions — strategy will never trigger
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-default pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-primary">
              Exit Conditions <span className="text-down">●</span>
            </h4>
            <button
              onClick={addExitCondition}
              style={{ background: 'rgba(239,68,68,0.15)' }}
              className="text-down border-none rounded-sm px-2 py-1 text-[10px] cursor-pointer"
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
              <div className="p-3 text-center text-muted text-[11px] border border-dashed border-default rounded-sm">
                No exit conditions — position held indefinitely
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveStrategy}
            className="flex items-center gap-1.5 rounded-sm px-4 py-2 text-xs font-semibold cursor-pointer text-white border-none"
            style={{ background: 'var(--accent-blue)' }}
          >
            <Save className="w-4 h-4" /> Save Strategy
          </button>
          <button
            onClick={runStrategy}
            className="flex items-center gap-1.5 rounded-sm px-4 py-2 text-xs font-semibold cursor-pointer text-white border-none"
            style={{ background: 'var(--accent-green)' }}
          >
            <Play className="w-4 h-4" /> Run Backtest
          </button>
        </div>

        {savedStrategies.length > 0 && (
          <div className="border-t border-default pt-3">
            <h4 className="text-xs font-semibold text-primary mb-2">
              <FolderOpen className="w-3.5 h-3.5 inline mr-1" /> Saved Strategies
            </h4>
            <div className="space-y-1">
              {savedStrategies.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-hover"
                >
                  <div>
                    <div className="text-xs font-medium text-primary">{s.name}</div>
                    <div className="text-[10px] text-muted">
                      {s.entryConditions.length} entry / {s.exitConditions.length} exit · {s.timeframe} · {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => loadStrategy(s)} className="bg-none border-none text-accent-blue cursor-pointer p-1 text-[10px]" title="Load">
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
                    }} className="bg-none border-none text-accent-cyan cursor-pointer p-1 text-[10px]" title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteStrategy(s.id)} className="bg-none border-none text-down cursor-pointer p-1 text-[10px]" title="Delete">
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
