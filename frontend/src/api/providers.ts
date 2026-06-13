import type {
  DataProviderName,
  OHLCV,
  Quote,
  FundamentalData,
  MarketNews,
  ProviderResponse,
  ProviderCapabilities,
} from '@/types/provider'

export interface OHLCVParams {
  symbol: string
  timeframe?: string
  startDate?: string
  endDate?: string
  limit?: number
}

const API_BASE = '/api/providers/v2'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function listProviders(): Promise<{
  providers: Array<{ name: string; enabled: boolean; capabilities: ProviderCapabilities }>
}> {
  return request('/')
}

export async function getProviderStats(): Promise<Record<string, unknown>> {
  const result = await request<{ stats: Record<string, unknown> }>('/stats')
  return result.stats
}

export async function getOHLCV(
  params: OHLCVParams
): Promise<ProviderResponse<unknown> & { data?: { bars: OHLCV[] } }> {
  return request('/ohlcv', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getQuote(symbol: string): Promise<ProviderResponse<unknown> & { data?: Quote }> {
  return request('/quote', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
  })
}

export async function getFundamentals(
  symbol: string
): Promise<ProviderResponse<unknown> & { data?: FundamentalData }> {
  return request('/fundamentals', {
    method: 'POST',
    body: JSON.stringify({ symbol }),
  })
}

export async function getNews(
  symbol?: string,
  limit = 50
): Promise<ProviderResponse<unknown> & { data?: { articles: MarketNews[] } }> {
  return request('/news', {
    method: 'POST',
    body: JSON.stringify({ symbol, limit }),
  })
}

export async function searchSymbols(
  query: string
): Promise<ProviderResponse<unknown> & { data?: { symbols: string[] } }> {
  return request(`/search?q=${encodeURIComponent(query)}`, {
    method: 'POST',
  })
}

export async function enableProvider(name: DataProviderName): Promise<void> {
  await request(`/${name}/enable`, { method: 'POST' })
}

export async function disableProvider(name: DataProviderName): Promise<void> {
  await request(`/${name}/disable`, { method: 'POST' })
}

export const providerAPI = {
  listProviders,
  getProviderStats,
  getOHLCV,
  getQuote,
  getFundamentals,
  getNews,
  searchSymbols,
  enableProvider,
  disableProvider,
}
