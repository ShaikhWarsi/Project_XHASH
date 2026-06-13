export interface MarketHoliday {
  date: string
  day: string
  description: string
  exchange: string
}

export interface MarketHolidaysResponse {
  status: string
  year: number
  holidays: MarketHoliday[]
}

export async function fetchMarketHolidays(year?: number): Promise<MarketHolidaysResponse> {
  const body = JSON.stringify({ year: year || new Date().getFullYear() })
  const res = await fetch('/openalgo/market-holidays/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error(`Market holidays failed: ${res.status}`)
  return res.json()
}
