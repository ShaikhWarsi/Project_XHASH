export interface OptunaStudy {
  id: string
  name: string
  direction: 'minimize' | 'maximize'
  status: 'running' | 'completed' | 'stopped'
  best_value?: number
  total_trials: number
  created_at: string
}

export interface OptunaTrial {
  number: number
  value: number
  params: Record<string, any>
  state: 'complete' | 'pruned' | 'failed'
  datetime_start: string
  datetime_complete?: string
}

export async function fetchStudies(): Promise<{ studies: OptunaStudy[] }> {
  const res = await fetch('/api/hyperopt/studies')
  if (!res.ok) throw new Error('Failed to fetch studies')
  return res.json()
}

export async function createStudy(name: string, direction: 'minimize' | 'maximize'): Promise<OptunaStudy> {
  const res = await fetch('/api/hyperopt/studies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, direction }),
  })
  if (!res.ok) throw new Error('Failed to create study')
  return res.json()
}

export async function fetchTrials(studyId: string): Promise<{ trials: OptunaTrial[] }> {
  const res = await fetch(`/api/hyperopt/studies/${studyId}/trials`)
  if (!res.ok) throw new Error('Failed to fetch trials')
  return res.json()
}

export async function suggestParams(studyId: string, params: Record<string, any>): Promise<Record<string, any>> {
  const res = await fetch(`/api/hyperopt/studies/${studyId}/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params }),
  })
  if (!res.ok) throw new Error('Failed to suggest params')
  return res.json()
}
