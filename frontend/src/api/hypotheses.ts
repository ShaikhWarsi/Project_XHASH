export interface Hypothesis { id: string; name: string; description: string; status: string }

export async function fetchHypotheses(): Promise<{ hypotheses: Hypothesis[] }> {
  const res = await fetch('/api/hypotheses')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

export async function runHypothesis(id: string): Promise<any> {
  const res = await fetch(`/api/hypotheses/${id}/run`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}
