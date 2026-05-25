import { create } from 'zustand'

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error'

interface ConnectionStore {
  sse: ConnectionState
  api: ConnectionState
  setSSE: (state: ConnectionState) => void
  setAPI: (state: ConnectionState) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  sse: 'disconnected',
  api: 'disconnected',
  setSSE: (sse) => set({ sse }),
  setAPI: (api) => set({ api }),
}))
