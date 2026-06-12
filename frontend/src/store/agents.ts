import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

interface Agent {
  id: string
  name: string
  type: string
  status: 'idle' | 'running' | 'completed' | 'error'
  lastRun?: string
  config: Record<string, any>
}

interface AgentState {
  agents: Agent[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  setAgents: (agents: Agent[]) => void
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      agents: [],
      loading: false,
      error: null,
      load: async () => {
        set({ loading: true, error: null })
        try {
          const { data } = await api.get('/agents')
          set({ agents: data.agents || [], loading: false })
        } catch (err: any) {
          set({ error: err?.response?.data?.detail || err.message || 'Failed to load agents', loading: false })
        }
      },
      setAgents: (agents) => set({ agents }),
    }),
    {
      name: 'te-agents-storage',
      version: 1,
      migrate: (state: unknown) => state as Partial<AgentState>,
    },
  ),
)
