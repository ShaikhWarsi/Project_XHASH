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

export async function llmCompleteStream(
  model: string,
  prompt: string,
  onToken: (token: string) => void,
  options?: { temperature?: number; max_tokens?: number }
): Promise<void> {
  const res = await fetch('/api/llm/complete-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, temperature: options?.temperature ?? 0.7, max_tokens: options?.max_tokens ?? 4096 }),
  })
  if (!res.ok) throw new Error('LLM streaming failed')

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body reader')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.done) return
          if (parsed.token) onToken(parsed.token)
        } catch { /* skip malformed */ }
      }
    }
  }
}

export async function briefingGet(): Promise<{ briefing: string; generated_at: string; data_summary: any }> {
  const res = await fetch('/api/ai/briefing')
  if (!res.ok) throw new Error('Failed to fetch briefing')
  return res.json()
}

export async function coMovementGet(headline: string, tickers: string[], priceChanges: Record<string, number>): Promise<{ co_movements: any[]; source: string }> {
  const res = await fetch('/api/ai/co-movement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headline, tickers, price_changes: priceChanges }),
  })
  if (!res.ok) throw new Error('Co-movement analysis failed')
  return res.json()
}

export async function earningsSummaryGet(symbol: string, transcriptText: string): Promise<{ symbol: string; summary: string; generated_at: string }> {
  const res = await fetch('/api/ai/earnings-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, transcript_text: transcriptText }),
  })
  if (!res.ok) throw new Error('Earnings summary failed')
  return res.json()
}

export async function generateStrategy(description: string, symbol?: string): Promise<{ code: string; explanation: string; symbol: string; warnings: string[] }> {
  const res = await fetch('/api/ai/generate-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, symbol }),
  })
  if (!res.ok) throw new Error('Strategy generation failed')
  return res.json()
}

export async function evaluateStrategy(code: string, symbol?: string, start?: string, end?: string): Promise<{ symbol: string; signals: any[]; plots: any; trades: any[]; metrics: any }> {
  const res = await fetch('/api/ai/evaluate-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, symbol: symbol || 'AAPL', start: start || '2024-01-01', end: end || '2024-12-31' }),
  })
  if (!res.ok) throw new Error('Strategy evaluation failed')
  return res.json()
}

export async function generateIndicator(description: string): Promise<{ code: string; name: string; id: string; warnings: string[] }> {
  const res = await fetch('/api/ai/generate-indicator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  if (!res.ok) throw new Error('Indicator generation failed')
  return res.json()
}

export async function inspectPattern(symbol: string, pattern: any, priceDataSummary?: string, recentSignals?: any[]): Promise<Response> {
  const res = await fetch('/api/ai/inspect-pattern', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, pattern, price_data_summary: priceDataSummary || '', recent_signals: recentSignals || [] }),
  })
  if (!res.ok) throw new Error('Pattern inspection failed')
  return res
}

export async function llmQuery(query: string, messageHistory?: { role: string; content: string }[]): Promise<{ response: string; context_used: string[] }> {
  const res = await fetch('/api/llm/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, message_history: messageHistory || [] }),
  })
  if (!res.ok) throw new Error('LLM query failed')
  return res.json()
}
