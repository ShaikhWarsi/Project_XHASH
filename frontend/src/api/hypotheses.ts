export interface Hypothesis {
  id: string
  title: string
  description: string
  tags: string[]
  status: 'draft' | 'active' | 'testing' | 'validated' | 'rejected'
  backtest_ids: string[]
  created_at: string
  updated_at: string
}

export interface CreateHypothesisRequest {
  title: string
  description: string
  tags?: string[]
}

export interface UpdateStatusRequest {
  status: Hypothesis['status']
}

export interface LinkBacktestRequest {
  backtest_id: string
}

const API_BASE = '/api/hypotheses/v2'

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function listHypotheses(
  status?: Hypothesis['status']
): Promise<{ hypotheses: Hypothesis[] }> {
  const params = status ? `?status=${status}` : ''
  return request(params)
}

export async function createHypothesis(
  req: CreateHypothesisRequest
): Promise<{ hypothesis: Hypothesis }> {
  return request('/', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getHypothesis(id: string): Promise<{ hypothesis: Hypothesis }> {
  return request(`/${id}`)
}

export async function updateHypothesisStatus(
  id: string,
  req: UpdateStatusRequest
): Promise<{ hypothesis: Hypothesis }> {
  return request(`/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(req),
  })
}

export async function linkBacktest(
  id: string,
  req: LinkBacktestRequest
): Promise<{ hypothesis: Hypothesis }> {
  return request(`/${id}/backtest`, {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function searchHypotheses(
  query: string
): Promise<{ hypotheses: Hypothesis[] }> {
  return request(`/search?q=${encodeURIComponent(query)}`)
}

export const hypothesesAPI = {
  listHypotheses,
  createHypothesis,
  getHypothesis,
  updateHypothesisStatus,
  linkBacktest,
  searchHypotheses,
}
