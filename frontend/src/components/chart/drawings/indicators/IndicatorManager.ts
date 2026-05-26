import type { IndicatorConfig } from '../../DrawingTypes'
import type { IndicatorInput } from './compute/types'
import type { IndicatorSignal, IndicatorParams } from './IndicatorPlugin'
import { getAllPlugins, getPlugin, getPluginsByCategory, getPluginCategories } from './IndicatorPlugin'
import './plugins'

export interface IndicatorResult {
  id: string
  name: string
  type: 'line' | 'histogram' | 'multi_line'
  data: any[]
  config: IndicatorConfig
  signals?: IndicatorSignal[]
}

export class IndicatorManager {
  private indicators: Map<string, IndicatorResult> = new Map()
  private dataCache: IndicatorInput[] = []

  setData(data: IndicatorInput[]) {
    this.dataCache = data
  }

  addIndicator(config: IndicatorConfig): IndicatorResult | null {
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
    const plugin = getPlugin(name)
    if (!plugin) return null

    const mergedParams: IndicatorParams = { ...plugin.defaultParams, ...params }
    const data = plugin.computeFn(this.dataCache, mergedParams)
    if (!data || data.length === 0) return null

    const signals = plugin.signals
      ? plugin.signals(this.dataCache, data, mergedParams)
      : undefined

    return {
      id: plugin.id,
      name: plugin.name,
      type: plugin.outputType,
      data,
      config: { id: plugin.id, name: plugin.name, params: mergedParams as Record<string, number>, paneId: '', visible: true, style: {} },
      signals: signals && signals.length > 0 ? signals : undefined,
    }
  }

  updateConfig(id: string, params: Record<string, number>) {
    const ind = this.indicators.get(id)
    if (!ind) return
    ind.config.params = { ...ind.config.params, ...params }
    const result = this.compute(ind.name, ind.config.params)
    if (result) {
      ind.data = result.data
      ind.signals = result.signals
    }
  }

  refreshAll() {
    for (const [id, ind] of this.indicators) {
      const result = this.compute(ind.name, ind.config.params)
      if (result) {
        ind.data = result.data
        ind.signals = result.signals
      }
    }
  }

  static getPresets() {
    return getAllPlugins().map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      defaultParams: p.defaultParams,
      paramsMeta: p.paramsMeta,
      outputType: p.outputType,
      paneType: p.paneType,
      color: p.color,
    }))
  }

  static getByCategory(category: string) {
    return getPluginsByCategory(category as any)
  }

  static getCategories() {
    return getPluginCategories()
  }
}

export type { IndicatorPreset } from './IndicatorPlugin'

import type { IndicatorPreset as IP } from './IndicatorPlugin'
export const PRESET_INDICATORS: IP[] = IndicatorManager.getPresets() as any
