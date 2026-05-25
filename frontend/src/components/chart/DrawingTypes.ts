import type { ISeriesApi, Time } from 'lightweight-charts'

export type ToolType =
  | 'cursor' | 'crosshair'
  | 'trendline' | 'ray' | 'extended_line'
  | 'horizontal_line' | 'vertical_line'
  | 'fib_retracement' | 'fib_extension' | 'fib_timezone'
  | 'rectangle' | 'ellipse' | 'triangle' | 'parallelogram'
  | 'channel'
  | 'text_label' | 'arrow'
  | 'brush'
  | 'gann_fan'
  | 'long_marker' | 'short_marker'

export interface Point {
  x: number
  y: number
}

export interface PricePoint {
  time: Time
  price: number
}

export interface DrawingStyle {
  color: string
  width: number
  opacity: number
  fillColor?: string
  fillOpacity?: number
  textColor?: string
  fontSize?: number
}

export interface DrawingData {
  id: string
  type: ToolType
  points: PricePoint[]
  style: DrawingStyle
  visible: boolean
  createdAt: number
  metadata?: Record<string, unknown>
}

export interface DrawingEvent {
  x: number
  y: number
  time: Time | null
  price: number | null
  paneIndex: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export interface PaneConfig {
  id: string
  height: number
  type: 'price' | 'indicator'
  indicatorId?: string
  series?: ISeriesApi<any>
}

export interface ChartState {
  symbol: string
  interval: string
  range: string
  drawings: DrawingData[]
  indicators: IndicatorConfig[]
}

export interface IndicatorConfig {
  id: string
  name: string
  params: Record<string, number>
  paneId: string
  visible: boolean
  style: Partial<DrawingStyle>
}

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  color: '#3b82f6',
  width: 2,
  opacity: 1,
  fillColor: '#3b82f6',
  fillOpacity: 0.15,
  textColor: '#e8eaed',
  fontSize: 11,
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2.0, 2.618, 3.618]
export const FIB_EXT_LEVELS = [0, 0.382, 0.618, 1, 1.272, 1.414, 1.618, 2.0, 2.272, 2.414, 2.618, 3.618]
export const FIB_COLORS = [
  '#ff0000', '#ff6600', '#ffcc00', '#00cc00', '#0066ff',
  '#6600cc', '#cc0066', '#ff3399', '#ff9933', '#99ff33',
  '#33ccff', '#9933ff', '#ff33cc',
]
