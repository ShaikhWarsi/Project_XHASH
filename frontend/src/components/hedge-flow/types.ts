import { type Node } from '@xyflow/react'

export type AgentNodeData = {
  label: string
  agentKey: string
  description: string
  icon?: string
  status?: 'idle' | 'running' | 'done' | 'error'
  ticker?: string
  signal?: string
  confidence?: number
  reasoning?: string
}

export type InputNodeData = {
  label: string
  tickers: string
  startDate: string
  endDate: string
  initialCash: number
}

export type OutputNodeData = {
  label: string
  type: 'portfolio' | 'report' | 'json'
  status?: 'idle' | 'running' | 'done'
}

export type AppNode = Node<AgentNodeData | InputNodeData | OutputNodeData>
