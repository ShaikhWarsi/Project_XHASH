import { api } from './client'

export interface PythonStrategy {
  id: string
  name: string
  filename: string
  exchange: string
  is_running: boolean
  pid: number | null
  is_scheduled: boolean
  manually_stopped: boolean
  last_error: string | null
  schedule_start: string
  schedule_stop: string
  schedule_days: number[]
  created_at: string
}

export interface LogFile {
  name: string
  size: number
  modified: string
}

export async function fetchStrategies(): Promise<PythonStrategy[]> {
  const { data } = await api.get('/openalgo/python-strategy/strategies')
  return data
}

export async function fetchStrategy(id: string): Promise<PythonStrategy> {
  const { data } = await api.get(`/openalgo/python-strategy/strategies/${id}`)
  return data
}

export async function createStrategy(payload: {
  name: string
  exchange: string
  schedule_start: string
  schedule_stop: string
  schedule_days: number[]
  filename: string
  content: string
}): Promise<PythonStrategy> {
  const { data } = await api.post('/openalgo/python-strategy/strategies', payload)
  return data
}

export async function fetchStrategyContent(id: string): Promise<string> {
  const { data } = await api.get(`/openalgo/python-strategy/strategies/${id}/content`)
  return data.content
}

export async function updateStrategyContent(id: string, content: string): Promise<void> {
  await api.put(`/openalgo/python-strategy/strategies/${id}/content`, { content })
}

export async function startStrategy(id: string): Promise<void> {
  await api.post(`/openalgo/python-strategy/strategies/${id}/start`)
}

export async function stopStrategy(id: string): Promise<void> {
  await api.post(`/openalgo/python-strategy/strategies/${id}/stop`)
}

export async function deleteStrategy(id: string): Promise<void> {
  await api.delete(`/openalgo/python-strategy/strategies/${id}`)
}

export async function updateSchedule(id: string, payload: {
  schedule_start: string
  schedule_stop: string
  schedule_days: number[]
}): Promise<void> {
  await api.put(`/openalgo/python-strategy/strategies/${id}/schedule`, payload)
}

export async function fetchLogFiles(id: string): Promise<LogFile[]> {
  const { data } = await api.get(`/openalgo/python-strategy/strategies/${id}/logs`)
  return data
}

export async function fetchLogContent(id: string, logName: string): Promise<string> {
  const { data } = await api.get(`/openalgo/python-strategy/strategies/${id}/logs/${logName}`)
  return data.content
}

export async function clearLogs(id: string): Promise<void> {
  await api.post(`/openalgo/python-strategy/strategies/${id}/logs/clear`)
}

export function subscribeToSSE(onEvent: (data: any) => void): () => void {
  const token = localStorage.getItem('token')
  const url = token
    ? `/api/openalgo/python-strategy/events?token=${token}`
    : '/api/openalgo/python-strategy/events'
  const es = new EventSource(url)
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)) } catch {}
  }
  es.onerror = () => {}
  return () => es.close()
}
