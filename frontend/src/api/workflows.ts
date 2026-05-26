export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  type: 'signal' | 'trade' | 'analysis' | 'alert' | 'custom'
  config: Record<string, any>
}

export interface WorkflowRun {
  id: string
  workflow_id: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  result?: any
}

export async function fetchWorkflows(): Promise<{ workflows: WorkflowDefinition[] }> {
  const res = await fetch('/api/workflows/list')
  if (!res.ok) throw new Error('Failed to fetch workflows')
  return res.json()
}

export async function fetchWorkflow(id: string): Promise<WorkflowDefinition> {
  const res = await fetch(`/api/workflows/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch workflow ${id}`)
  return res.json()
}

export async function runWorkflow(id: string, params?: Record<string, any>): Promise<WorkflowRun> {
  const symbol = params?.symbol || 'AAPL'
  const res = await fetch(`/api/workflows/run?symbol=${encodeURIComponent(symbol)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Failed to run workflow for ${symbol}`)
  return res.json()
}

export async function fetchWorkflowRuns(id: string): Promise<{ runs: WorkflowRun[] }> {
  const workflow = await fetchWorkflow(id)
  return { runs: workflow ? [{ id, workflow_id: id, status: workflow.status || 'completed', started_at: workflow.created_at || new Date().toISOString() }] : [] }
}

export async function fetchProviders(): Promise<{ providers: { name: string; type: string; enabled: boolean; status: string }[] }> {
  const res = await fetch('/api/providers')
  if (!res.ok) throw new Error('Failed to fetch providers')
  return res.json()
}

export async function fetchMcpTools(): Promise<{ tools: { name: string; description: string; parameters: Record<string, any> }[] }> {
  const res = await fetch('/api/mcp/tools')
  if (!res.ok) throw new Error('Failed to fetch MCP tools')
  return res.json()
}
