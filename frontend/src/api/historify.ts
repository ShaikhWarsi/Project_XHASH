import { api } from './client'

export async function fetchOHLCV(symbol: string, exchange: string, timeframe: string, from?: string, to?: string): Promise<unknown> {
  const { data } = await api.get('/openalgo/historify/data', {
    params: { symbol, exchange, timeframe, from_date: from, to_date: to },
  })
  return data
}

export async function downloadHistory(symbol: string, exchange: string, timeframe: string, from: string, to: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/historify/download', { symbol, exchange, timeframe, from_date: from, to_date: to })
  return data
}

export async function fetchDownloadJobs(): Promise<unknown> {
  const { data } = await api.get('/openalgo/historify/download')
  return data
}

export async function cancelJob(jobId: string): Promise<unknown> {
  const { data } = await api.delete(`/openalgo/historify/download/${jobId}`)
  return data
}

export async function fetchWatchlist(): Promise<unknown[]> {
  const { data } = await api.get('/openalgo/historify/watchlist')
  return data.watchlist
}

export async function addToWatchlist(symbol: string, exchange: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/historify/watchlist', { symbol, exchange })
  return data
}

export async function removeFromWatchlist(symbol: string): Promise<unknown> {
  const { data } = await api.delete(`/openalgo/historify/watchlist/${symbol}`)
  return data
}

export async function exportCSV(symbol: string, exchange: string, timeframe: string): Promise<unknown> {
  const { data } = await api.get('/openalgo/historify/export', {
    params: { symbol, exchange, timeframe },
    responseType: 'text',
  })
  return data
}

export async function fetchSchedules(): Promise<unknown[]> {
  const { data } = await api.get('/openalgo/historify/schedules')
  return data.schedules
}

export async function createSchedule(symbol: string, exchange: string, timeframe: string, type: string, time: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/historify/schedules', {
    symbol, exchange, timeframe, schedule_type: type, schedule_time: time,
  })
  return data
}

export async function deleteSchedule(scheduleId: string): Promise<unknown> {
  const { data } = await api.delete(`/openalgo/historify/schedules/${scheduleId}`)
  return data
}
