export interface BrinsonAttribution {
  sector: string
  allocation_effect: number
  selection_effect: number
  interaction_effect: number
  total_effect: number
}

export interface FixedIncomeMetrics {
  yield: number
  duration: number
  convexity: number
  credit_spread: number
  ytm: number
}

export interface DerivativeGreeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

export async function fetchAttribution(portfolioId: string): Promise<{ attribution: BrinsonAttribution[] }> {
  const res = await fetch(`/api/analytics/attribution/${portfolioId}`)
  if (!res.ok) throw new Error('Failed to fetch attribution')
  return res.json()
}

export async function fetchFixedIncome(portfolioId: string): Promise<FixedIncomeMetrics> {
  const res = await fetch(`/api/analytics/fixed-income/${portfolioId}`)
  if (!res.ok) throw new Error('Failed to fetch fixed income')
  return res.json()
}

export async function fetchDerivatives(portfolioId: string): Promise<{ positions: { symbol: string; greeks: DerivativeGreeks }[] }> {
  const res = await fetch(`/api/analytics/derivatives/${portfolioId}`)
  if (!res.ok) throw new Error('Failed to fetch derivatives')
  return res.json()
}

export async function fetchGeopoliticalImpact(): Promise<{ events: { event: string; impact: number; description: string }[] }> {
  const res = await fetch('/api/analytics/geopolitical')
  if (!res.ok) throw new Error('Failed to fetch geopolitical')
  return res.json()
}

export async function runSqlQuery(query: string): Promise<{ columns: string[]; rows: any[][] }> {
  const res = await fetch('/api/analytics/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error('SQL query failed')
  return res.json()
}

export async function fetchFastAnalysis(market: string, horizon: string): Promise<{ summary: string; metrics: Record<string, number> }> {
  const res = await fetch(`/api/analytics/fast?market=${market}&horizon=${horizon}`)
  if (!res.ok) throw new Error('Failed to fetch fast analysis')
  return res.json()
}
