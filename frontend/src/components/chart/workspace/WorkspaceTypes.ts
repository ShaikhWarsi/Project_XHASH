export interface IndicatorConfig {
  id: string
  type: string
  params: Record<string, number | string | boolean>
  paneId?: string
  color?: string
}

export interface WorkspaceLayout {
  id: string
  name: string
  symbol: string
  interval: string
  chartStyle: 'candle' | 'line' | 'area' | 'tpo'
  layoutMode: 'single' | '2x1' | '1x2' | '2x2' | 'custom'
  theme: string
  indicators: IndicatorConfig[]
  drawingIds: string[]
  comparisonSymbols: string[]
  paneSizes?: number[]
  createdAt: number
  updatedAt: number
}

export interface DetachedWindow {
  id: string
  symbol: string
  interval: string
  chartType: 'candle' | 'line' | 'area' | 'tpo'
  windowRef?: Window | null
  bounds?: { x: number; y: number; width: number; height: number }
}
