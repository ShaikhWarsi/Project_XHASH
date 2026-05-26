import type { SingleLineOutput, MultiLineOutput, IndicatorInput } from './compute/types'

export type IndicatorOutputType = 'line' | 'histogram' | 'multi_line'
export type IndicatorPaneType = 'overlay' | 'separate'
export type IndicatorCategory = 'overlap' | 'momentum' | 'volatility' | 'volume'

export interface IndicatorParams {
  [key: string]: number | number[]
}

export interface IndicatorSignal {
  name: string
  value: string | number | null
  direction: number
  strength: number
  metadata?: Record<string, unknown>
}

export interface IndicatorPluginMeta {
  id: string
  name: string
  description: string
  category: IndicatorCategory
  defaultParams: IndicatorParams
  paramsMeta: Record<string, { label: string; type: 'int' | 'float'; min?: number; max?: number; default: number }>
  outputType: IndicatorOutputType
  paneType: IndicatorPaneType
  color: string
  computeFn: (data: IndicatorInput[], params: IndicatorParams) => SingleLineOutput[] | MultiLineOutput[]
  signals?: (data: IndicatorInput[], output: SingleLineOutput[] | MultiLineOutput[], params: IndicatorParams) => IndicatorSignal[]
}

const PLUGIN_REGISTRY: Map<string, IndicatorPluginMeta> = new Map()

export function registerPlugin(meta: IndicatorPluginMeta): void {
  PLUGIN_REGISTRY.set(meta.id, meta)
}

export function getPlugin(id: string): IndicatorPluginMeta | undefined {
  return PLUGIN_REGISTRY.get(id)
}

export function getAllPlugins(): IndicatorPluginMeta[] {
  return Array.from(PLUGIN_REGISTRY.values())
}

export function getPluginsByCategory(category: IndicatorCategory): IndicatorPluginMeta[] {
  return getAllPlugins().filter((p) => p.category === category)
}

export function getPluginCategories(): IndicatorCategory[] {
  const cats = new Set(getAllPlugins().map((p) => p.category))
  return Array.from(cats)
}

export function indicator(meta: Omit<IndicatorPluginMeta, 'computeFn' | 'signals'> & {
  computeFn: (data: IndicatorInput[], params: IndicatorParams) => SingleLineOutput[] | MultiLineOutput[]
  signals?: (data: IndicatorInput[], output: SingleLineOutput[] | MultiLineOutput[], params: IndicatorParams) => IndicatorSignal[]
}): void {
  registerPlugin(meta)
}
