import { api } from './client'

export interface IntegrationStatus {
  name: string
  enabled: boolean
  connected: boolean
  last_active: string | null
  config: Record<string, unknown>
}

export async function fetchIntegrations(): Promise<{ integrations: IntegrationStatus[] }> {
  const { data } = await api.get('/config/integrations')
  return data
}

export async function toggleIntegration(
  name: string,
  enabled: boolean,
  config?: Record<string, unknown>,
): Promise<{ success: boolean }> {
  const { data } = await api.post('/config/integrations/toggle', {
    name,
    enabled,
    config: config ?? {},
  })
  return data
}

export async function testIntegration(name: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post(`/config/integrations/test/${name}`)
  return data
}
