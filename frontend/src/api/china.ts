export interface ChinaMarketData {
  symbol: string
  name: string
  exchange: 'SH' | 'SZ' | 'HK'
  price: number
  change: number
  volume: number
  timestamp: string
}

export async function fetchChinaStocks(): Promise<{ stocks: ChinaMarketData[] }> {
  const res = await fetch('/api/china/stocks')
  if (!res.ok) throw new Error('Failed to fetch China stocks')
  return res.json()
}

export async function fetchChinaIndices(): Promise<{ indices: ChinaMarketData[] }> {
  const res = await fetch('/api/china/indices')
  if (!res.ok) throw new Error('Failed to fetch China indices')
  return res.json()
}
