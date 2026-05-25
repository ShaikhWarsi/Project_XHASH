import { api } from './client'

export interface AlphaFactor {
  id: string
  name: string
  description: string
  category: string
  ic: number
  sharpe: number
  turnover: number
}

export interface AlphaBenchmark {
  alpha_id: string
  benchmark: string
  ic: number
  sharpe: number
  returns: number[]
}

export async function fetchAlphaFactors(): Promise<{ alphas: AlphaFactor[] }> {
  const { data } = await api.get('/alphas')
  return data
}

export async function fetchAlphaBenchmark(id: string): Promise<AlphaBenchmark> {
  const { data } = await api.get(`/alphas/${id}/bench`)
  return data
}

export async function fetchAlphaSource(id: string): Promise<{ code: string; language: string }> {
  const { data } = await api.get(`/alphas/${id}/source`)
  return data
}
