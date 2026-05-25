import { useNavigate } from 'react-router-dom'
import StrategyBuilder from '../components/StrategyBuilder'
import { useToastStore } from '../store/toast'

interface Strategy {
  id: string
  name: string
  description: string
  entryConditions: any[]
  exitConditions: any[]
  tickers: string[]
  timeframe: string
  createdAt: string
}

export default function StrategyLab() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const handleRunBacktest = (strategy: Strategy) => {
    if (strategy.tickers.length === 0) {
      addToast('Add at least one ticker before running backtest', 'warning')
      return
    }
    const params = new URLSearchParams({
      tickers: strategy.tickers.join(','),
      strategy: 'hybrid',
      name: strategy.name,
    })
    navigate(`/backtest?${params.toString()}`)
    addToast(`Running backtest for "${strategy.name}"...`, 'info')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Strategy Lab</h1>
      <StrategyBuilder onRunBacktest={handleRunBacktest} />
    </div>
  )
}
