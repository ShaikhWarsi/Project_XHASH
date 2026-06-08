import { create } from 'zustand'
import type { ReportBundle, ScrapeBundle, RunSummary, TradingAgentsEvent, RunStatus } from '../api/types'

interface TradingAgentsState {
  ticker: string
  activeRunId: string | null
  status: 'idle' | 'scraping' | 'analyzing' | 'done' | 'error'
  scrapeBundle: ScrapeBundle | null
  report: ReportBundle | null
  runHistory: RunSummary[]
  events: TradingAgentsEvent[]
  error: string | null

  // Pipeline live state
  currentStage: string | null
  currentNode: string | null
  toolCallCount: number
  elapsedMs: number
  stageStates: Record<string, 'pending' | 'running' | 'done' | 'failed'>
  sseConnected: boolean

  setTicker: (ticker: string) => void
  setActiveRunId: (id: string | null) => void
  setStatus: (status: TradingAgentsState['status']) => void
  setScrapeBundle: (bundle: ScrapeBundle | null) => void
  setReport: (report: ReportBundle | null) => void
  setRunHistory: (runs: RunSummary[]) => void
  addEvent: (event: TradingAgentsEvent) => void
  setError: (error: string | null) => void
  updateFromStatus: (status: RunStatus) => void
  setStageState: (stage: string, state: 'pending' | 'running' | 'done' | 'failed') => void
  setSseConnected: (connected: boolean) => void
  reset: () => void
}

const initialState = {
  ticker: '',
  activeRunId: null,
  status: 'idle' as const,
  scrapeBundle: null,
  report: null,
  runHistory: [],
  events: [],
  error: null,
  currentStage: null,
  currentNode: null,
  toolCallCount: 0,
  elapsedMs: 0,
  stageStates: {} as Record<string, 'pending' | 'running' | 'done' | 'failed'>,
  sseConnected: false,
}

export const useTradingAgentsStore = create<TradingAgentsState>((set) => ({
  ...initialState,

  setTicker: (ticker) => set({ ticker }),
  setActiveRunId: (id) => set({ activeRunId: id }),
  setStatus: (status) => set({ status }),
  setScrapeBundle: (bundle) => set({ scrapeBundle: bundle }),
  setReport: (report) => set({ report }),
  setRunHistory: (runs) => set({ runHistory: runs }),
  addEvent: (event) => set((s) => {
    const events = [...s.events.slice(-100), event]
    // Track stage state from stage_update events
    const stageStates = { ...s.stageStates }
    if (event.event === 'stage_update') {
      const stage = event.data.stage as string
      if (stage) stageStates[stage] = 'running'
    }
    if (event.event === 'pipeline_start') {
      stageStates['scraping'] = 'running'
    }
    if (event.event === 'run_complete') {
      stageStates['final'] = 'done'
      Object.keys(stageStates).forEach(k => {
        if (stageStates[k] === 'running') stageStates[k] = 'done'
      })
    }
    if (event.event === 'pipeline_error' || event.event === 'pipeline_cancelled') {
      Object.keys(stageStates).forEach(k => {
        if (stageStates[k] === 'running') stageStates[k] = 'failed'
      })
    }
    return { events, stageStates }
  }),
  setError: (error) => set({ error }),
  updateFromStatus: (status) => set({
    currentStage: status.current_stage,
    currentNode: status.current_node,
    toolCallCount: status.tool_call_count,
    elapsedMs: status.elapsed_ms,
  }),
  setStageState: (stage, state) => set((s) => ({
    stageStates: { ...s.stageStates, [stage]: state },
  })),
  setSseConnected: (connected) => set({ sseConnected: connected }),
  reset: () => set(initialState),
}))
