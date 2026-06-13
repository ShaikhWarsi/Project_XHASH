import { api } from './client'

export async function searchSymbols(q: string, exchange?: string, limit?: number): Promise<any[]> {
  const params: Record<string, any> = { q }
  if (exchange) params.exchange = exchange
  if (limit) params.limit = limit
  const { data } = await api.get('/openalgo/symbols/search', { params })
  return data.data || []
}

export async function getSymbolInfo(symbol: string, exchange: string): Promise<any> {
  const { data } = await api.get(`/openalgo/symbols/${encodeURIComponent(symbol)}`, { params: { exchange } })
  return data.data
}

export async function getExchanges(): Promise<string[]> {
  const { data } = await api.get('/openalgo/symbols/exchanges')
  return data.data || []
}

export async function getFreezeQty(symbol: string, exchange: string): Promise<number> {
  const { data } = await api.get('/openalgo/symbols/freeze-qty', { params: { symbol, exchange } })
  return data.freeze_qty
}

export async function setFreezeQty(symbol: string, exchange: string, qty: number): Promise<any> {
  const { data } = await api.post('/openalgo/symbols/freeze-qty', { symbol, exchange, qty })
  return data
}

export async function getMarketHolidays(year?: number): Promise<any> {
  const { data } = await api.get('/openalgo/symbols/holidays', { params: { year: year || new Date().getFullYear() } })
  return data
}

export async function getMarketTimings(date?: string): Promise<any> {
  const { data } = await api.get('/openalgo/symbols/timings', { params: { date } })
  return data
}
