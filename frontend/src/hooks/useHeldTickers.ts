import { useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolio'

export function useHeldTickers(): string[] {
  const portfolio = usePortfolioStore((s) => s.portfolio)

  const tickers = useMemo(() => {
    const set = new Set<string>()

    if (portfolio?.positions) {
      for (const sym of Object.keys(portfolio.positions)) {
        set.add(sym)
      }
    }

    return Array.from(set).sort()
  }, [portfolio])

  return tickers
}
