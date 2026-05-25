import { create } from 'zustand'
import type { WorkflowDefinition, WorkflowRun } from '../api/workflows'
import { fetchWorkflows, fetchWorkflowRuns, runWorkflow } from '../api/workflows'

interface WorkflowState {
  workflows: WorkflowDefinition[]
  runs: Record<string, WorkflowRun[]>
  loading: boolean
  runningId: string | null
  pollInterval: number | null
  load: () => Promise<void>
  loadRuns: (id: string) => Promise<void>
  triggerRun: (id: string) => Promise<void>
  startPolling: (intervalMs?: number) => void
  stopPolling: () => void
  refreshRuns: () => Promise<void>
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  runs: {},
  loading: false,
  runningId: null,
  pollInterval: null,

  load: async () => {
    set({ loading: true })
    try {
      const res = await fetchWorkflows()
      set({ workflows: res.workflows || [], loading: false })
    } catch { set({ loading: false }) }
  },

  loadRuns: async (id: string) => {
    try {
      const res = await fetchWorkflowRuns(id)
      set((s) => ({ runs: { ...s.runs, [id]: res.runs || [] } }))
    } catch {}
  },

  triggerRun: async (id: string) => {
    const state = get()
    if (state.runningId === id) return
    set({ runningId: id })
    try {
      await runWorkflow(id)
      const res = await fetchWorkflowRuns(id)
      set((s) => ({
        runningId: null,
        runs: { ...s.runs, [id]: res.runs || [] },
      }))
    } catch {
      set({ runningId: null })
    }
  },

  refreshRuns: async () => {
    const { workflows, runs } = get()
    const ids = workflows.map((w) => w.id)
    for (const id of ids) {
      try {
        const res = await fetchWorkflowRuns(id)
        const existing = runs[id]
        const updated = res.runs || []
        if (existing && updated.length > existing.length) {
          set((s) => ({ runs: { ...s.runs, [id]: updated } }))
        } else {
          set((s) => ({ runs: { ...s.runs, [id]: updated } }))
        }
      } catch {}
    }
  },

  startPolling: (intervalMs = 5000) => {
    const state = get()
    if (state.pollInterval) return
    const id = window.setInterval(() => get().refreshRuns(), intervalMs)
    set({ pollInterval: id })
  },

  stopPolling: () => {
    const state = get()
    if (state.pollInterval != null) {
      clearInterval(state.pollInterval)
      set({ pollInterval: null })
    }
  },
}))
