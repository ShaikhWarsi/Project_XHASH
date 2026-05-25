import { api } from './client'

export interface PairlistFilter {
  name: string
  description: string
}

export interface PairlistApplyResult {
  total: number
  passed: number
  passing_symbols: string[]
  results: { symbol: string; passed: boolean; reason: string }[]
}

export async function fetchPairlistFilters(): Promise<{ filters: PairlistFilter[] }> {
  const { data } = await api.get('/pairlists/filters')
  return data
}

export async function applyPairlistFilters(params: {
  symbols: string[]
  prices?: Record<string, number>
  volumes?: Record<string, number>
  market_caps?: Record<string, number>
  volatility?: Record<string, number>
  spreads?: Record<string, number>
  min_volume?: number
  max_volume?: number
  min_volatility?: number
  max_volatility?: number
  max_spread_pct?: number
  min_price?: number
  max_price?: number
  min_market_cap?: number
  max_market_cap?: number
}): Promise<PairlistApplyResult> {
  const { data } = await api.post('/pairlists/apply', null, { params })
  return data
}
