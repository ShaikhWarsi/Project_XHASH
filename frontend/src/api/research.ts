export interface TableInfo { name: string; columns: string[] }
export interface QueryResult { columns: string[]; rows: any[][] }
export interface DailyReturns { date: string; returns: Record<string, number> }

export async function fetchTables(): Promise<{ tables: TableInfo[] }> {
  const res = await fetch('/api/research/tables')
  if (!res.ok) throw new Error('Failed to fetch tables')
  return res.json()
}

export async function runQuery(query: string): Promise<QueryResult> {
  const res = await fetch('/api/research/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error('Query failed')
  return res.json()
}

export async function fetchDailyReturns(): Promise<{ data: DailyReturns[] }> {
  const res = await fetch('/api/research/daily-returns')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export async function fetchCorrelation(assets: string[]): Promise<{ matrix: number[][] }> {
  const res = await fetch('/api/research/correlation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets }),
  })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}
