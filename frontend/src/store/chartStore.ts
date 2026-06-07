import { create } from 'zustand'
import type { CandlestickData } from 'lightweight-charts'
import type { ToolType, IndicatorConfig } from '../components/chart/DrawingTypes'

export type ChartStyleType = 'candle' | 'line' | 'area'
export type LayoutMode = 'single' | '2x1' | '1x2' | '2x2'

interface ChartStore {
  symbol: string
  interval: string
  data: CandlestickData[]
  loading: boolean
  error: string

  chartStyle: ChartStyleType
  showDelta: boolean
  showVolumeProfile: boolean

  activeTool: ToolType | null
  indicators: IndicatorConfig[]
  comparisonSymbols: string[]

  showStructure: boolean
  showDepth: boolean
  showSignals: boolean
  showAnalysis: boolean
  showTimeMachine: boolean
  showCorrelation: boolean
  showSignalTimeline: boolean
  showLayerPanel: boolean
  snapToOHLC: boolean

  replayIndex: number | null
  replayPlaying: boolean

  layoutMode: LayoutMode
  focusedCell: number
  isFullscreen: boolean

  setSymbol: (symbol: string) => void
  setInterval: (interval: string) => void
  setData: (data: CandlestickData[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  setChartStyle: (style: ChartStyleType) => void
  toggleDelta: () => void
  toggleVolumeProfile: () => void
  setActiveTool: (tool: ToolType | null) => void
  addIndicator: (config: IndicatorConfig) => void
  removeIndicator: (id: string) => void
  toggleStructure: () => void
  toggleDepth: () => void
  toggleSignals: () => void
  toggleAnalysis: () => void
  toggleTimeMachine: () => void
  toggleCorrelation: () => void
  toggleSignalTimeline: () => void
  toggleLayerPanel: () => void
  toggleSnapToOHLC: () => void
  setReplayIndex: (index: number | null) => void
  setReplayPlaying: (playing: boolean) => void
  setLayoutMode: (mode: LayoutMode) => void
  setFocusedCell: (cell: number) => void
  toggleFullscreen: () => void
  addComparison: (symbol: string) => void
  removeComparison: (symbol: string) => void
  reset: (symbol?: string) => void
}

const initialState = {
  symbol: 'AAPL',
  interval: '1D',
  data: [] as CandlestickData[],
  loading: false,
  error: '',
  chartStyle: 'candle' as ChartStyleType,
  showDelta: false,
  showVolumeProfile: true,
  activeTool: null as ToolType | null,
  indicators: [] as IndicatorConfig[],
  comparisonSymbols: [] as string[],
  showStructure: false,
  showDepth: false,
  showSignals: false,
  showAnalysis: false,
  showTimeMachine: false,
  showCorrelation: false,
  showSignalTimeline: false,
  showLayerPanel: true,
  snapToOHLC: false,
  replayIndex: null as number | null,
  replayPlaying: false,
  layoutMode: 'single' as LayoutMode,
  focusedCell: 0,
  isFullscreen: false,
}

export const useChartStore = create<ChartStore>()((set) => ({
  ...initialState,

  setSymbol: (symbol) => set({ symbol }),
  setInterval: (interval) => set({ interval }),
  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setChartStyle: (chartStyle) => set({ chartStyle }),
  toggleDelta: () => set((s) => ({ showDelta: !s.showDelta })),
  toggleVolumeProfile: () => set((s) => ({ showVolumeProfile: !s.showVolumeProfile })),

  setActiveTool: (activeTool) => set({ activeTool }),
  addIndicator: (indicator) =>
    set((s) => ({ indicators: [...s.indicators, indicator] })),
  removeIndicator: (id) =>
    set((s) => ({ indicators: s.indicators.filter((i) => i.id !== id) })),

  toggleStructure: () => set((s) => ({ showStructure: !s.showStructure })),
  toggleDepth: () => set((s) => ({ showDepth: !s.showDepth })),
  toggleSignals: () => set((s) => ({ showSignals: !s.showSignals })),
  toggleAnalysis: () => set((s) => ({ showAnalysis: !s.showAnalysis })),
  toggleTimeMachine: () => set((s) => ({ showTimeMachine: !s.showTimeMachine })),
  toggleCorrelation: () => set((s) => ({ showCorrelation: !s.showCorrelation })),
  toggleSignalTimeline: () => set((s) => ({ showSignalTimeline: !s.showSignalTimeline })),
  toggleLayerPanel: () => set((s) => ({ showLayerPanel: !s.showLayerPanel })),
  toggleSnapToOHLC: () => set((s) => ({ snapToOHLC: !s.snapToOHLC })),

  setReplayIndex: (replayIndex) => set({ replayIndex }),
  setReplayPlaying: (replayPlaying) => set({ replayPlaying }),

  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setFocusedCell: (focusedCell) => set({ focusedCell }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  addComparison: (symbol) =>
    set((s) => ({
      comparisonSymbols: s.comparisonSymbols.includes(symbol)
        ? s.comparisonSymbols
        : [...s.comparisonSymbols, symbol],
    })),
  removeComparison: (symbol) =>
    set((s) => ({
      comparisonSymbols: s.comparisonSymbols.filter((s) => s !== symbol),
    })),

  reset: (symbol?: string) =>
    set(symbol ? { ...initialState, symbol, data: [], error: '' } : { ...initialState }),
}))
