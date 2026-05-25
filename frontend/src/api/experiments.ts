import { api } from './client'

export interface Experiment {
  id: string
  name: string
  status: string
  config: any
  results?: any
  created_at: string
}

export async function fetchExperiments(): Promise<{ experiments: Experiment[] }> {
  const { data } = await api.get('/experiments')
  return data
}

export async function createExperiment(config: any): Promise<Experiment> {
  const { data } = await api.post('/experiments', config)
  return data
}

export async function runExperiment(id: string): Promise<Experiment> {
  const { data } = await api.post(`/experiments/${id}/run`)
  return data
}

export async function structuredTune(config: any): Promise<Experiment> {
  const { data } = await api.post('/experiments/structured-tune', config)
  return data
}

export async function aiOptimize(config: any): Promise<Experiment> {
  const { data } = await api.post('/experiments/ai-optimize', config)
  return data
}
