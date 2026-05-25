import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

interface PriceData {
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
}

interface LivePricesContextType {
  prices: Record<string, PriceData | null>
  connected: boolean
  getPrice: (symbol: string) => PriceData | null
  getQuote: (symbol: string) => { c: number; d: number; dp: number } | null
}

const LivePricesContext = createContext<LivePricesContextType | null>(null)

export function LivePricesProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, PriceData | null>>({})
  const { connected, lastData } = useWebSocket<{ type: string; data: Record<string, PriceData | null> }>('/api/ws/prices', { maxRetries: 999 })

  useEffect(() => {
    if (lastData?.type === 'prices' && lastData?.data) {
      setPrices(lastData.data)
    }
  }, [lastData])

  const getPrice = (symbol: string): PriceData | null => prices[symbol] ?? null

  const getQuote = (symbol: string): { c: number; d: number; dp: number } | null => {
    const p = prices[symbol]
    if (!p) return null
    return { c: p.price, d: p.change, dp: p.changePercent }
  }

  return (
    <LivePricesContext.Provider value={{ prices, connected, getPrice, getQuote }}>
      {children}
    </LivePricesContext.Provider>
  )
}

export function useLivePrices() {
  const ctx = useContext(LivePricesContext)
  if (!ctx) throw new Error('useLivePrices must be used within LivePricesProvider')
  return ctx
}
