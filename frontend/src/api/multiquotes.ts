export interface MultiQuoteEntry {
  symbol: string
  exchange: string
  ltp: number
  last_price: number
  open: number
  high: number
  low: number
  close: number
  prev_close: number
  volume: number
  bid: number
  ask: number
  bid_qty: number
  ask_qty: number
  change: number
  change_percent: number
  total_buy_qty: number
  total_sell_qty: number
  lower_circuit: number
  upper_circuit: number
  '52_week_high': number
  '52_week_low': number
}

export interface MultiQuotesResponse {
  status: string
  results: MultiQuoteEntry[]
  errors: Array<{ symbol: string; exchange: string; error: string }> | null
  total: number
  failed: number
}

export async function fetchMultiQuotes(symbols: { symbol: string; exchange?: string }[]): Promise<MultiQuotesResponse> {
  const body = JSON.stringify({ symbols: symbols.map(s => ({ symbol: s.symbol, exchange: s.exchange || 'NSE' })) })
  const res = await fetch('/openalgo/multiquotes/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  if (!res.ok) throw new Error(`MultiQuotes failed: ${res.status}`)
  return res.json()
}
