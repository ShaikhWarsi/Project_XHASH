import { create } from 'zustand'
import type { SignalMatrix } from '../api/types'
import { fetchSignals } from '../api/client'
import { eventBus, EVENTS } from '../utils/eventBus'

interface SignalStore {
  signals: SignalMatrix | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  update: (s: SignalMatrix) => void
}

export const useSignalStore = create<SignalStore>((set) => ({
  signals: null,
  loading: false,
  error: null,

  load: async () => {
    set((s) => { if (s.loading) return s; return { loading: true, error: null } })
    try {
      const signals = await fetchSignals()
      set({ signals, loading: false })
      eventBus.emit(EVENTS.REFRESH_REQUESTED, signals)
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  update: (incoming) => {
    set((s) => {
      const merged = s.signals ? { ...s.signals, ...incoming } : incoming
      return { signals: merged }
    })
    eventBus.emit(EVENTS.REFRESH_REQUESTED, incoming)
  },
}))
