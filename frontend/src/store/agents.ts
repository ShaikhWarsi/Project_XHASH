import { create } from 'zustand'

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

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      set({ agents: data.agents || [], loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },
  setAgents: (agents) => set({ agents }),
}))
