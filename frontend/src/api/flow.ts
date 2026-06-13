import { api } from './client'
import type { FlowWorkflow, ScheduleConfig, PriceAlertConfig } from '../types/flow'

export async function fetchWorkflows(): Promise<FlowWorkflow[]> {
  const { data } = await api.get('/openalgo/flow/workflows')
  return data
}

export async function fetchWorkflow(id: string): Promise<FlowWorkflow> {
  const { data } = await api.get(`/openalgo/flow/workflows/${id}`)
  return data
}

export async function createWorkflow(name: string, description?: string): Promise<FlowWorkflow> {
  const { data } = await api.post('/openalgo/flow/workflows', { name, description })
  return data
}

export async function updateWorkflow(id: string, payload: Partial<FlowWorkflow>): Promise<FlowWorkflow> {
  const { data } = await api.put(`/openalgo/flow/workflows/${id}`, payload)
  return data
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.delete(`/openalgo/flow/workflows/${id}`)
}

export async function activateWorkflow(id: string, payload: {
  trigger_type: string
  api_key?: string
  schedule_config?: ScheduleConfig
  price_alert_config?: PriceAlertConfig
}): Promise<{ status: string; webhook_token?: string }> {
  const { data } = await api.post(`/openalgo/flow/workflows/${id}/activate`, payload)
  return data
}

export async function deactivateWorkflow(id: string): Promise<void> {
  await api.post(`/openalgo/flow/workflows/${id}/deactivate`)
}

export async function executeWorkflow(id: string, webhookData?: any): Promise<any> {
  const { data } = await api.post(`/openalgo/flow/workflows/${id}/execute`, webhookData)
  return data
}

export async function fetchExecutions(id: string): Promise<any[]> {
  const { data } = await api.get(`/openalgo/flow/workflows/${id}/executions`)
  return data
}
