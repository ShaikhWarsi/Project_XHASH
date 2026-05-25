import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { eventBus, EVENTS } from '../utils/eventBus'

interface PaperTrade {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number
  timestamp: string
  type: 'BUY' | 'SELL'
}

interface PaperAccount {
  balance: number
  equity: number
  buyingPower: number
  totalReturn: number
  totalTrades: number
  winRate: number
  openPnl: number
  isRunning: boolean
}

interface PaperTradingStore {
  account: PaperAccount
  trades: PaperTrade[]
  startSimulation: () => void
  stopSimulation: () => void
  resetAccount: () => void
  addTrade: (trade: PaperTrade) => void
  updateAccount: (updates: Partial<PaperAccount>) => void
}

const DEFAULT_ACCOUNT: PaperAccount = {
  balance: 100000,
  equity: 100000,
  buyingPower: 200000,
  totalReturn: 0,
  totalTrades: 0,
  winRate: 0,
  openPnl: 0,
  isRunning: false,
}

export const usePaperTradingStore = create<PaperTradingStore>()(
  persist(
    (set) => ({
      account: { ...DEFAULT_ACCOUNT },
      trades: [],

      startSimulation: () =>
        set((state) => ({ account: { ...state.account, isRunning: true } })),

      stopSimulation: () =>
        set((state) => ({ account: { ...state.account, isRunning: false } })),

      resetAccount: () =>
        set({ account: { ...DEFAULT_ACCOUNT }, trades: [] }),

      addTrade: (trade) => {
        set((state) => ({
          trades: [trade, ...state.trades].slice(0, 200),
          account: {
            ...state.account,
            totalTrades: state.account.totalTrades + 1,
          },
        }))
        eventBus.emit(EVENTS.ORDER_PLACED, trade)
      },

      updateAccount: (updates) =>
        set((state) => ({ account: { ...state.account, ...updates } })),
    }),
    { name: 'te-paper-trading' }
  )
)
