import { api } from './client'
import type { ChartinkStrategy, ChartinkSymbolMapping } from '../types/chartink'

export async function fetchChartinkStrategies(): Promise<ChartinkStrategy[]> {
  const { data } = await api.get('/openalgo/chartink/strategies')
  return data
}

export async function fetchChartinkStrategy(id: string): Promise<ChartinkStrategy> {
  const { data } = await api.get(`/openalgo/chartink/strategies/${id}`)
  return data
}

export async function createChartinkStrategy(payload: {
  name: string
  symbol: string
  exchange: string
  action: string
  quantity: number
  product: string
  pricetype: string
  intraday: boolean
}): Promise<ChartinkStrategy> {
  const { data } = await api.post('/openalgo/chartink/strategies', payload)
  return data
}

export async function updateChartinkStrategy(id: string, payload: Partial<ChartinkStrategy>): Promise<ChartinkStrategy> {
  const { data } = await api.put(`/openalgo/chartink/strategies/${id}`, payload)
  return data
}

export async function deleteChartinkStrategy(id: string): Promise<void> {
  await api.delete(`/openalgo/chartink/strategies/${id}`)
}

export async function fetchChartinkSymbolMappings(): Promise<ChartinkSymbolMapping[]> {
  const { data } = await api.get('/openalgo/chartink/symbols')
  return data
}

export async function createChartinkSymbolMapping(payload: {
  chartink_symbol: string
  trading_symbol: string
  exchange: string
}): Promise<ChartinkSymbolMapping> {
  const { data } = await api.post('/openalgo/chartink/symbols', payload)
  return data
}

export async function deleteChartinkSymbolMapping(id: string): Promise<void> {
  await api.delete(`/openalgo/chartink/symbols/${id}`)
}

export async function sendChartinkWebhook(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post('/openalgo/chartink/webhook', payload)
  return data
}

export async function sendTradingViewWebhook(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post('/openalgo/tradingview/webhook', payload)
  return data
}

export async function sendGoChartingWebhook(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await api.post('/openalgo/gocharting/webhook', payload)
  return data
}
