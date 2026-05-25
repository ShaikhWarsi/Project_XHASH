import { type Edge } from '@xyflow/react'
import { api } from './client'
import type { AppNode } from '../components/hedge-flow/types'

export interface Agent {
  key: string
  display_name: string
  description: string
}

export interface Flow {
  id: number
  name: string
  description: string | null
  nodes: AppNode[]
  edges: Edge[]
  viewport: { x: number; y: number; zoom: number } | null
  data: Record<string, unknown> | null
  tags: string[] | null
  created_at: string | null
  updated_at: string | null
}

export async function runHedgeFund(request: {
  tickers: string[]
  start_date: string
  end_date: string
  initial_cash: number
  graph_nodes: AppNode[]
  graph_edges: Edge[]
  signal?: AbortSignal
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await fetch('/api/hedge-fund/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: request.signal,
    body: JSON.stringify(request),
  })
  if (!res.ok) throw new Error('Failed to run hedge fund')
  if (!res.body) throw new Error('Response body is null - streaming not supported')
  return res.body.getReader()
}

export async function getFlows(): Promise<Flow[]> {
  const { data } = await api.get('/flows')
  return data
}

export async function getFlow(id: number): Promise<Flow> {
  const { data } = await api.get(`/flows/${id}`)
  return data
}

export async function createFlow(request: {
  name: string
  description?: string
  nodes: AppNode[]
  edges: Edge[]
}): Promise<Flow> {
  const { data } = await api.post('/flows', request)
  return data
}

export async function updateFlow(id: number, request: {
  name?: string
  description?: string
  nodes?: AppNode[]
  edges?: Edge[]
}): Promise<Flow> {
  const { data } = await api.put(`/flows/${id}`, request)
  return data
}

export async function runHedgeFundBacktest(request: {
  tickers: string[]
  start_date: string
  end_date: string
  initial_capital: number
  graph_nodes: AppNode[]
  graph_edges: Edge[]
  signal?: AbortSignal
}): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await fetch('/api/hedge-fund/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: request.signal,
    body: JSON.stringify(request),
  })
  if (!res.ok) throw new Error('Failed to run hedge fund backtest')
  if (!res.body) throw new Error('Response body is null - streaming not supported')
  return res.body.getReader()
}
