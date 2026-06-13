import { api } from './client'

export interface StrategyLeg {
  type: 'call' | 'put'
  action: 'buy' | 'sell'
  strike: number
  quantity: number
  price: number
}

export interface StrategyEntry {
  id: number
  name: string
  watchlist: string
  underlying: string
  exchange: string
  expiry: string | null
  legs: StrategyLeg[]
  notes: string
  created_at: string
  updated_at: string
}

export async function listStrategies(watchlist?: string): Promise<StrategyEntry[]> {
  const params: Record<string, string> = {}
  if (watchlist) params.watchlist = watchlist
  const { data } = await api.get('/openalgo/strategy-portfolio/', { params })
  return data.data?.strategies ?? []
}

export async function getStrategy(id: number): Promise<StrategyEntry> {
  const { data } = await api.get(`/openalgo/strategy-portfolio/${id}`)
  return data.data
}

export async function createStrategy(data: Partial<StrategyEntry>): Promise<StrategyEntry> {
  const { data: res } = await api.post('/openalgo/strategy-portfolio/', data)
  return res.data
}

export async function updateStrategy(id: number, data: Partial<StrategyEntry>): Promise<StrategyEntry> {
  const { data: res } = await api.put(`/openalgo/strategy-portfolio/${id}`, data)
  return res.data
}

export async function deleteStrategy(id: number): Promise<void> {
  await api.delete(`/openalgo/strategy-portfolio/${id}`)
}
