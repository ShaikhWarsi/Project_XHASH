import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BacktestResult } from '../api/types'
import { runBacktest, fetchBacktestEngines } from '../api/client'
import { eventBus, EVENTS } from '../utils/eventBus'

const ENGINE_DEFAULT_LEVERAGE: Record<string, number> = {
  default: 1.0, us_equity: 1.0, hk_equity: 1.0, china_a: 1.0,
  crypto: 1.0, forex: 100.0, china_futures: 10.0, global_futures: 10.0,
}

interface BacktestStore {
  result: BacktestResult | null
  running: boolean
  error: string | null
  engines: { id: string; label: string; description: string }[]
  config: {
    tickers: string
    start: string
    end: string
    capital: number
    strategy: string
    engine_type: string
    leverage: number
    agents: string[]
  }
  setConfig: (config: Partial<BacktestStore['config']>) => void
  run: () => Promise<void>
  clear: () => void
  loadEngines: () => Promise<void>
}

export const useBacktestStore = create<BacktestStore>()(
  persist(
    (set, get) => ({
      result: null,
      running: false,
      error: null,
      engines: [],
      config: {
        tickers: 'AAPL,MSFT,GOOGL',
        start: '2024-01-01',
        end: '2024-12-31',
        capital: 100000,
        strategy: 'hybrid',
        engine_type: 'default',
        leverage: 1.0,
        agents: ['buffett', 'burry', 'druckenmiller'],
      },

      setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

      loadEngines: async () => {
        try {
          const engines = await fetchBacktestEngines()
          set({ engines })
        } catch {
          // fallback if API unavailable
        }
      },

      run: async () => {
        const { config } = get()
        set({ running: true, error: null })
        try {
          const body: Record<string, unknown> = {
            tickers: config.tickers.split(',').map((t) => t.trim()),
            start: config.start,
            end: config.end,
            capital: config.capital,
            strategy: config.strategy,
            engine_type: config.engine_type,
            agents: config.agents,
          }
          const engineDefault = ENGINE_DEFAULT_LEVERAGE[config.engine_type] ?? 1.0
          if (config.leverage !== engineDefault) body.leverage = config.leverage
          const result = await runBacktest(body as any)
          set({ result, running: false })
          eventBus.emit(EVENTS.BACKTEST_COMPLETE, result)
        } catch (err) {
          set({ error: String(err), running: false })
        }
      },

      clear: () => set({ result: null, error: null }),
    }),
    { name: 'te-backtest-config' },
  ),
)
