import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { generateStrategy, evaluateStrategy } from '../api/llm'
import { Play, Sparkles, RotateCcw, Copy } from 'lucide-react'

export default function AIStrategyGenerator() {
  const [description, setDescription] = useState('')
  const [symbol, setSymbol] = useState('AAPL')
  const [start, setStart] = useState('2024-01-01')
  const [end, setEnd] = useState('2024-12-31')
  const [code, setCode] = useState('')
  const [explanation, setExplanation] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [evalResult, setEvalResult] = useState<any>(null)
  const [evalLoading, setEvalLoading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return
    setLoading(true)
    setCode('')
    setExplanation('')
    setWarnings([])
    setEvalResult(null)
    try {
      const res = await generateStrategy(description, symbol)
      setCode(res.code)
      setExplanation(res.explanation)
      setWarnings(res.warnings)
    } catch (e: unknown) {
      setWarnings([(e as Error).message])
    }
    setLoading(false)
  }, [description, symbol])

  const handleEvaluate = useCallback(async () => {
    if (!code) return
    setEvalLoading(true)
    setEvalResult(null)
    try {
      const res = await evaluateStrategy(code, symbol, start, end)
      setEvalResult(res)
    } catch (e: unknown) {
      setEvalResult({ error: (e as Error).message })
    }
    setEvalLoading(false)
  }, [code, symbol, start, end])

  const copyCode = () => navigator.clipboard.writeText(code)

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2">
        <Sparkles size={20} /> AI Strategy Generator
      </h1>
      <p className="text-sm text-muted">Describe a trading strategy in plain English and get executable FinScript code.</p>

      <Card title="Describe Your Strategy">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded-md px-3 py-2 text-sm text-primary outline-none min-h-[80px]"
          placeholder="e.g. Buy when the 20-day SMA crosses above the 50-day SMA, sell when it crosses below. Use 100 shares and a $100k initial capital."
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <div>
            <label className="block text-[10px] text-muted">Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-primary w-20 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-muted">Start</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-primary outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-muted">End</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-primary outline-none" />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading || !description.trim()}
          className="mt-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          {loading ? 'Generating...' : 'Generate Strategy'}
        </button>
      </Card>

      {warnings.length > 0 && (
        <div className="bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.3)] rounded-md px-3 py-2 text-xs text-accent-yellow">
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      {code && (
        <>
          <Card title="Generated Strategy">
            {explanation && <div className="text-xs text-muted mb-2">{explanation}</div>}
            <div className="relative">
              <pre className="bg-[var(--bg-hover)] border border-default rounded-md p-3 text-[11px] font-mono overflow-auto max-h-[400px] text-primary">{code}</pre>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={copyCode} className="bg-card border border-default px-2 py-1 rounded text-[10px] cursor-pointer text-muted hover:text-primary"><Copy size={12} /></button>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleEvaluate} disabled={evalLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-[var(--accent-green)] text-white border-none cursor-pointer disabled:opacity-50">
                <Play size={14} /> {evalLoading ? 'Evaluating...' : 'Run Backtest'}
              </button>
              <button onClick={() => { setCode(''); setEvalResult(null); setExplanation(''); setWarnings([]) }}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-card border border-default text-muted cursor-pointer">
                <RotateCcw size={14} /> Clear
              </button>
            </div>
          </Card>

          {evalResult && (
            <Card title="Backtest Results">
              {evalResult.error ? (
                <div className="text-accent-red text-xs">{evalResult.error}</div>
              ) : (
                <div className="space-y-3">
                  {evalResult.metrics && Object.keys(evalResult.metrics).length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(evalResult.metrics).map(([k, v]) => (
                        <div key={k} className="bg-card border border-default rounded px-2 py-1">
                          <div className="text-[9px] text-muted">{k.replace(/_/g, ' ')}</div>
                          <div className="font-mono text-sm font-bold text-primary">{typeof v === 'number' ? v.toFixed(4) : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {evalResult.signals && evalResult.signals.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted mb-1">Signals ({evalResult.signals.length})</div>
                      <pre className="bg-[var(--bg-hover)] border border-default rounded p-2 text-[10px] font-mono max-h-[200px] overflow-auto text-primary">
                        {JSON.stringify(evalResult.signals, null, 2)}
                      </pre>
                    </div>
                  )}
                  {evalResult.trades && evalResult.trades.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted mb-1">Trades ({evalResult.trades.length})</div>
                      <pre className="bg-[var(--bg-hover)] border border-default rounded p-2 text-[10px] font-mono max-h-[200px] overflow-auto text-primary">
                        {JSON.stringify(evalResult.trades, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
