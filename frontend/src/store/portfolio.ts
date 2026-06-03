import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PortfolioState, PerformanceMetrics, Trade } from '../api/types'
import { fetchPortfolio, fetchMetrics, fetchTrades } from '../api/client'
import { eventBus, EVENTS } from '../utils/eventBus'

interface PortfolioStore {
  portfolio: PortfolioState | null
  metrics: PerformanceMetrics | null
  trades: Trade[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  updatePortfolio: (p: PortfolioState) => void
  updateMetrics: (m: PerformanceMetrics) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      portfolio: null,
      metrics: null,
      trades: [],
      loading: false,
      error: null,

      load: async () => {
        set({ loading: true, error: null })
        try {
          const [portfolio, metrics, trades] = await Promise.all([
            fetchPortfolio(),
            fetchMetrics(),
            fetchTrades(),
          ])
          set({ portfolio, metrics, trades, loading: false })
          eventBus.emit(EVENTS.PORTFOLIO_UPDATED, portfolio, metrics)
        } catch (err) {
          set({ error: String(err), loading: false })
        }
      },

      updatePortfolio: (portfolio) => set({ portfolio }),
      updateMetrics: (metrics) => set({ metrics }),
    }),
    {
      name: 'te-portfolio-storage',
      version: 1,
      migrate: (state: unknown) => state as Partial<PortfolioStore>,
    },
  ),
)
