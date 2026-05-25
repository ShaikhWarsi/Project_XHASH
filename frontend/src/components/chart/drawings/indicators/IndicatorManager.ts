import * as compute from './compute'
import type { IndicatorInput } from './compute/types'
import type { IndicatorConfig } from '../../DrawingTypes'

export interface IndicatorResult {
  id: string
  name: string
  type: 'line' | 'histogram' | 'multi_line'
  data: any[]
  config: IndicatorConfig
}

export class IndicatorManager {
  private indicators: Map<string, IndicatorResult> = new Map()

  addIndicator(config: IndicatorConfig): IndicatorResult | null {
    const fn = (compute as any)[config.name.toLowerCase().replace(/\s+/g, '_')]
    if (!fn) return null

    const result = this.compute(config.name, config.params)
    if (!result) return null

    this.indicators.set(config.id, result)
    return result
  }

  removeIndicator(id: string) {
    this.indicators.delete(id)
  }

  getIndicator(id: string): IndicatorResult | null {
    return this.indicators.get(id) ?? null
  }

  getAllIndicators(): IndicatorResult[] {
    return Array.from(this.indicators.values())
  }

  compute(name: string, params: Record<string, number>): IndicatorResult | null {
    const config = PRESET_INDICATORS.find((p) => p.name === name)
    if (!config) return null

    const mergedParams = { ...config.defaultParams, ...params }
    const fn = (compute as any)[config.computeFn]
    if (!fn) return null

    const data = [] as IndicatorInput[]
    const result = fn(data, ...Object.values(mergedParams))
    return {
      id: config.id,
      name: config.name,
      type: config.outputType,
      data: result,
      config: { id: config.id, name: config.name, params: mergedParams, paneId: '', visible: true, style: {} },
    }
  }

  updateConfig(id: string, params: Record<string, number>) {
    const ind = this.indicators.get(id)
    if (!ind) return
    ind.config.params = { ...ind.config.params, ...params }
  }
}

export interface IndicatorPreset {
  id: string
  name: string
  description: string
  computeFn: string
  defaultParams: Record<string, number>
  outputType: 'line' | 'histogram' | 'multi_line'
  paneType: 'overlay' | 'separate'
  color: string
}

export const PRESET_INDICATORS: IndicatorPreset[] = [
  { id: 'sma', name: 'SMA', description: 'Simple Moving Average', computeFn: 'sma', defaultParams: { period: 20 }, outputType: 'line', paneType: 'overlay', color: '#3b82f6' },
  { id: 'ema', name: 'EMA', description: 'Exponential Moving Average', computeFn: 'ema', defaultParams: { period: 20 }, outputType: 'line', paneType: 'overlay', color: '#f59e0b' },
  { id: 'bollinger', name: 'Bollinger Bands', description: 'Bollinger Bands', computeFn: 'bollinger', defaultParams: { period: 20, stdDev: 2 }, outputType: 'multi_line', paneType: 'overlay', color: '#8b5cf6' },
  { id: 'vwap', name: 'VWAP', description: 'Volume Weighted Average Price', computeFn: 'vwap', defaultParams: {}, outputType: 'line', paneType: 'overlay', color: '#06b6d4' },
  { id: 'psar', name: 'Parabolic SAR', description: 'Parabolic Stop and Reverse', computeFn: 'psar', defaultParams: { step: 0.02, maxStep: 0.2 }, outputType: 'line', paneType: 'overlay', color: '#10b981' },
  { id: 'rsi', name: 'RSI', description: 'Relative Strength Index', computeFn: 'rsi', defaultParams: { period: 14 }, outputType: 'line', paneType: 'separate', color: '#f59e0b' },
  { id: 'macd', name: 'MACD', description: 'Moving Average Convergence Divergence', computeFn: 'macd', defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }, outputType: 'multi_line', paneType: 'separate', color: '#3b82f6' },
  { id: 'stochastic', name: 'Stochastic', description: 'Stochastic Oscillator', computeFn: 'stochastic', defaultParams: { kPeriod: 14, dPeriod: 3 }, outputType: 'multi_line', paneType: 'separate', color: '#8b5cf6' },
  { id: 'atr', name: 'ATR', description: 'Average True Range', computeFn: 'atr', defaultParams: { period: 14 }, outputType: 'line', paneType: 'separate', color: '#ec4899' },
  { id: 'ichimoku', name: 'Ichimoku', description: 'Ichimoku Cloud', computeFn: 'ichimoku', defaultParams: { tenkanPeriod: 9, kijunPeriod: 26, senkouBPeriod: 52 }, outputType: 'multi_line', paneType: 'overlay', color: '#06b6d4' },
  { id: 'obv', name: 'OBV', description: 'On-Balance Volume', computeFn: 'obv', defaultParams: {}, outputType: 'line', paneType: 'separate', color: '#10b981' },
]
