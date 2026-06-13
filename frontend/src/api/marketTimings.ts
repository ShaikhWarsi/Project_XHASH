export interface ExchangeTiming {
  open: string
  close: string
  status: 'open' | 'closed'
  description: string
}

export interface MarketTimingsResponse {
  status: string
  date: string
  day: string
  is_weekend: boolean
  market_status: 'open' | 'closed'
  timings: Record<string, ExchangeTiming>
}

export async function fetchMarketTimings(date?: string): Promise<MarketTimingsResponse> {
  const body = JSON.stringify({ date: date || '' })
  const res = await fetch('/openalgo/market-timings/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error(`Market timings failed: ${res.status}`)
  return res.json()
}
