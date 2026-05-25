import { api } from './client'

export interface CacheStats {
  size: number
  hits: number
  misses: number
  entries: number
  max_size: number
}

export interface CacheLookupResult {
  hit: boolean
  result?: Record<string, unknown>
}

export async function fetchCacheStats(): Promise<CacheStats> {
  const { data } = await api.get('/backtest-cache/stats')
  return data
}

export async function lookupCache(
  strategy: string,
  symbol: string,
  start: string,
  end: string,
  params: Record<string, unknown> = {},
): Promise<CacheLookupResult> {
  const { data } = await api.get('/backtest-cache/lookup', {
    params: { strategy, symbol, start, end, params: JSON.stringify(params) },
  })
  return data
}

export async function storeCache(
  strategy: string,
  symbol: string,
  start: string,
  end: string,
  result: Record<string, unknown>,
  params: Record<string, unknown> = {},
): Promise<{ key: string; status: string }> {
  const { data } = await api.post('/backtest-cache/store', null, {
    params: {
      strategy,
      symbol,
      start,
      end,
      params: JSON.stringify(params),
      result: JSON.stringify(result),
    },
  })
  return data
}

export async function invalidateCache(strategy?: string, symbol?: string): Promise<{ invalidated: number }> {
  const { data } = await api.delete('/backtest-cache/invalidate', {
    params: { strategy, symbol },
  })
  return data
}
