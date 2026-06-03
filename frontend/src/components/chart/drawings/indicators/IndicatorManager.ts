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

  async addIndicator(config: IndicatorConfig): Promise<IndicatorResult | null> {
    const supportsWorker = typeof Worker !== 'undefined'
    let result: IndicatorResult | null = null

    if (supportsWorker) {
      try {
        result = await this.useWorker(config.name, config.params, this.dataCache)
      } catch {
        result = this.compute(config.name, config.params)
      }
    } else {
      result = this.compute(config.name, config.params)
    }

    if (!result) return null

    result.config = config
    this.indicators.set(config.id, result)
    return result
  }

  private useWorker(indicator: string, params: any, data: any[]): Promise<IndicatorResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('../../../../workers/indicatorWorker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e) => {
          const plugin = getPlugin(indicator)
          if (!plugin) {
            reject(new Error(`Indicator plugin "${indicator}" not found`))
            worker.terminate()
            return
          }
          const mergedParams: IndicatorParams = { ...plugin.defaultParams, ...params }
          const rawData = e.data.result
          const signals = plugin.signals
            ? plugin.signals(this.dataCache, rawData, mergedParams)
            : undefined
          const result: IndicatorResult = {
            id: plugin.id,
            name: plugin.name,
            type: plugin.outputType,
            data: rawData,
            config: { id: plugin.id, name: plugin.name, type: plugin.outputType as any, params: mergedParams as Record<string, number>, paneId: '', visible: true, style: {} },
            signals: signals && signals.length > 0 ? signals : undefined,
          }
          resolve(result)
          worker.terminate()
        }
        worker.onerror = (e) => {
          reject(e)
          worker.terminate()
        }
        worker.postMessage({ type: 'compute', id: indicator, indicator, params, data })
      } catch {
        reject(new Error('Web Worker not available'))
      }
    })
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
      config: { id: plugin.id, name: plugin.name, type: plugin.outputType as any, params: mergedParams as Record<string, number>, paneId: '', visible: true, style: {} },
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

export type { IndicatorParams } from './IndicatorPlugin'

import type { IndicatorParams as IP } from './IndicatorPlugin'
export const PRESET_INDICATORS: IP[] = IndicatorManager.getPresets() as any
