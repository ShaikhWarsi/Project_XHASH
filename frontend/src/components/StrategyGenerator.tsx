import { useState } from 'react'
import Card from './ui/Card'
import Skeleton from './Skeleton'
import { generateStrategy, evaluateStrategy } from '../api/llm'

export default function StrategyGenerator() {
  const [description, setDescription] = useState('')
  const [symbol, setSymbol] = useState('AAPL')
  const [generating, setGenerating] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [code, setCode] = useState('')
  const [explanation, setExplanation] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [needsReview, setNeedsReview] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)
    setCode('')
    setExplanation('')
    setWarnings([])
    setNeedsReview(false)
    setResults(null)

    try {
      const res = await generateStrategy(description, symbol)
      setCode(res.code)
      setExplanation(res.explanation)
      setWarnings(res.warnings || [])
      setNeedsReview(true)
    } catch (err: any) {
      setError(err.message)
    }
    setGenerating(false)
  }

  const handleRunBacktest = async () => {
    if (!code.trim()) return
    setEvaluating(true)
    setError(null)
    setResults(null)

    try {
      const res = await evaluateStrategy(code, symbol)
      setResults(res)
    } catch (err: any) {
      setError(err.message)
    }
    setEvaluating(false)
  }

  return (
    <Card title="AI Strategy Generator" className="font-mono-data">
      <div className="space-y-2">
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none uppercase"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted block mb-0.5">Strategy Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Buy when RSI crosses below 30 and 50-day SMA is above 200-day SMA. Sell after 5 bars."
            rows={4}
            className="w-full bg-input border border-input text-primary font-mono-data text-[10px] px-2 py-1 outline-none resize-vertical"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
          className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full"
          style={{
            background: 'var(--accent-blue)',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Generating...' : 'Generate Strategy'}
        </button>

        {error && <div className="text-down text-[10px]">{error}</div>}

        {warnings.length > 0 && (
          <div className="text-accent-yellow text-[9px]">{warnings.join('; ')}</div>
        )}

        {code && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted font-semibold tracking-wider uppercase">Generated Code</span>
              {needsReview && (
                <span className="text-[8px] text-accent-yellow px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.15)' }}>
                  Review Required
                </span>
              )}
            </div>
            <pre className="bg-black/40 border border-default rounded-sm p-2 overflow-x-auto max-h-[200px] overflow-y-auto">
              <code className="text-[9px] font-mono-data text-primary whitespace-pre">{code}</code>
            </pre>
            {explanation && (
              <div className="text-[9px] text-muted mt-1">{explanation}</div>
            )}

            {needsReview && (
              <div className="flex items-center gap-1 mt-1.5 p-1.5 rounded-sm" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
                <span className="text-[9px] text-accent-yellow">⚠ Review the generated code before running. Ensure it uses only allowed functions.</span>
              </div>
            )}

            <button
              onClick={handleRunBacktest}
              disabled={evaluating}
              className="text-white border-none font-mono-data text-[10px] font-semibold px-3 py-1 rounded-sm w-full mt-1.5"
              style={{
                background: 'var(--accent-green)',
                cursor: evaluating ? 'not-allowed' : 'pointer',
                opacity: evaluating ? 0.6 : 1,
              }}
            >
              {evaluating ? 'Running Backtest...' : 'Review & Run Backtest'}
            </button>
          </div>
        )}

        {evaluating && (
          <div className="space-y-1.5">
            <Skeleton width="100%" height={10} />
            <Skeleton width="80%" height={10} />
          </div>
        )}

        {results && results.error && (
          <div className="text-down text-[10px]">{results.error}</div>
        )}

        {results && results.metrics && (
          <div>
            <div className="text-[9px] text-muted mb-1 font-semibold tracking-wider uppercase">Results</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(results.metrics).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between px-2 py-0.5 rounded-sm" style={{ background: 'var(--bg-hover)' }}>
                  <span className="text-[8px] text-muted uppercase tracking-wider">{key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-semibold text-primary">{String(val)}</span>
                </div>
              ))}
            </div>
            {results.trades && results.trades.length > 0 && (
              <div className="mt-1">
                <span className="text-[9px] text-muted tracking-wider uppercase">{results.trades.length} trades</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
