import { api } from './client'

export interface ProviderInfo {
  id: string
  name: string
  type: string
  models?: string[]
  enabled: boolean
}

export interface ProviderDefaults {
  default_provider: string
  providers: ProviderInfo[]
}

export async function fetchProviders(): Promise<{ providers: ProviderInfo[] }> {
  const { data } = await api.get('/providers')
  return data
}

export async function fetchProviderModels(): Promise<{ models: string[] }> {
  const { data } = await api.get('/providers/models')
  return data
}

export async function fetchProviderDefaults(): Promise<ProviderDefaults> {
  const { data } = await api.get('/providers/defaults')
  return data
}

export async function queryProvider(provider: string, params: Record<string, unknown>): Promise<any> {
  const { data } = await api.post('/providers/query', { provider, ...params })
  return data
}
