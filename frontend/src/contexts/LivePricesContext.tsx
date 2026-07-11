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
  const { connected, lastData } = useWebSocket<{ type: string; data: Record<string, PriceData | null> }>('/ws/prices', { maxRetries: 20, retryDelay: 2000 })

  useEffect(() => {
    if (lastData?.type === 'prices' && lastData?.data && Object.keys(lastData.data).length > 0) {
      setPrices(prev => ({ ...prev, ...lastData.data }))
    }
  }, [lastData])



  const getPrice = (symbol: string): PriceData | null => {
    const p = prices[symbol]
    if (!p) return null
    return {
      price: p.price ?? 0,
      change: p.change ?? 0,
      changePercent: p.changePercent ?? 0,
      volume: p.volume ?? 0,
      marketCap: p.marketCap ?? 0,
    }
  }

  const getQuote = (symbol: string): { c: number; d: number; dp: number } | null => {
    const p = prices[symbol]
    if (!p) return null
    return { c: p.price ?? 0, d: p.change ?? 0, dp: p.changePercent ?? 0 }
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
