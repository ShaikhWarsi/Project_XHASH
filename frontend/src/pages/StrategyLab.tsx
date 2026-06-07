import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StrategyBuilder from '../components/StrategyBuilder'
import type { Strategy } from '../components/StrategyBuilder'
import { useToastStore } from '../store/toast'

export default function StrategyLab() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const [translating, setTranslating] = useState(false)

  const handleRunBacktest = async (strategy: Strategy) => {
    if (strategy.tickers.length === 0) {
      addToast('Add at least one ticker before running backtest', 'warning')
      return
    }
    setTranslating(true)
    try {
      const conditions = {
        entry: strategy.entryConditions.map(c => `${c.source}.${c.indicator} ${c.operator} ${c.value}`),
        exit: strategy.exitConditions.map(c => `${c.source}.${c.indicator} ${c.operator} ${c.value}`),
      }
      const res = await fetch('/api/finscript/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tickers: strategy.tickers,
          timeframe: strategy.timeframe,
          entryConditions: strategy.entryConditions,
          exitConditions: strategy.exitConditions,
          name: strategy.name,
        }),
      })
      if (!res.ok) throw new Error('FinScript translation failed')
      const result = await res.json()
      const finscriptCode = result.code || ''
      const params = new URLSearchParams({
        tickers: strategy.tickers.join(','),
        name: strategy.name,
        timeframe: strategy.timeframe,
        code: finscriptCode,
        entryConditions: JSON.stringify(strategy.entryConditions),
        exitConditions: JSON.stringify(strategy.exitConditions),
      })
      navigate(`/backtest?${params.toString()}`)
      addToast(`Running backtest for "${strategy.name}" with ${strategy.entryConditions.length} entry + ${strategy.exitConditions.length} exit conditions`, 'info')
    } catch (e: unknown) {
      addToast(`Failed to translate strategy: ${(e as Error).message}`, 'error')
    }
    setTranslating(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Strategy Lab</h1>
      <StrategyBuilder onRunBacktest={handleRunBacktest} />
      {translating && <div className="text-accent-blue text-[11px] font-mono-data">Translating strategy to FinScript...</div>}
    </div>
  )
}
