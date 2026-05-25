export interface LLMModel {
  id: string
  name: string
  provider: string
  capabilities: string[]
  enabled: boolean
}

export interface LLMCompletion {
  model: string
  content: string
  usage: { prompt_tokens: number; completion_tokens: number }
  reasoning?: string
}

export async function fetchLLMModels(): Promise<{ models: LLMModel[] }> {
  const res = await fetch('/api/llm/models')
  if (!res.ok) throw new Error('Failed to fetch LLM models')
  return res.json()
}

export async function llmComplete(model: string, prompt: string, options?: { temperature?: number; max_tokens?: number; reasoning?: boolean }): Promise<LLMCompletion> {
  const res = await fetch('/api/llm/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, ...options }),
  })
  if (!res.ok) throw new Error('LLM completion failed')
  return res.json()
}
