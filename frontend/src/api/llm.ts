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

export async function strategyHealthCheck(strategyName: string, strategyCode: string, recentPerformance: any[], currentRegime: string): Promise<any> {
  const res = await fetch('/api/ai/strategy-health', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy_name: strategyName, strategy_code: strategyCode, recent_performance: recentPerformance, current_regime: currentRegime }),
  })
  if (!res.ok) throw new Error('Strategy health check failed')
  return res.json()
}

export async function autoTagTrades(trades: any[]): Promise<{ tagged_trades: any[] }> {
  const res = await fetch('/api/ai/auto-tag-trades', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trades }),
  })
  if (!res.ok) throw new Error('Auto-tag trades failed')
  return res.json()
}

export async function explainPnL(period: string, trades: any[], portfolioValueHistory: any[], marketRegime: string, topPerformers: string[], worstPerformers: string[]): Promise<any> {
  const res = await fetch('/api/ai/explain-pnl', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period, trades, portfolio_value_history: portfolioValueHistory, market_regime: marketRegime, top_performers: topPerformers, worst_performers: worstPerformers }),
  })
  if (!res.ok) throw new Error('P&L explanation failed')
  return res.json()
}

export async function listPrompts(): Promise<{ prompts: any[]; total: number }> {
  const res = await fetch('/api/ai/prompts')
  if (!res.ok) throw new Error('Failed to list prompts')
  return res.json()
}

export async function createPrompt(data: any): Promise<any> {
  const res = await fetch('/api/ai/prompts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create prompt')
  return res.json()
}

export async function updatePrompt(id: string, data: any): Promise<any> {
  const res = await fetch(`/api/ai/prompts/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update prompt')
  return res.json()
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await fetch(`/api/ai/prompts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete prompt')
}

export async function clonePrompt(id: string): Promise<any> {
  const res = await fetch(`/api/ai/prompts/${id}/clone`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to clone prompt')
  return res.json()
}

export async function compareLeaderboard(aiTrades: any[], humanTrades: any[], period: string): Promise<any> {
  const res = await fetch('/api/ai/leaderboard/compare', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ai_trades: aiTrades, human_trades: humanTrades, period }),
  })
  if (!res.ok) throw new Error('Leaderboard comparison failed')
  return res.json()
}

export async function explainStop(data: any): Promise<any> {
  const res = await fetch('/api/ai/explain-stop', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Stop explanation failed')
  return res.json()
}

export async function tradeCoach(trade: any, recentTrades: any[]): Promise<any> {
  const res = await fetch('/api/ai/trade-coach', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trade, recent_trades: recentTrades }),
  })
  if (!res.ok) throw new Error('Trade coaching failed')
  return res.json()
}

export async function generateRiskReport(email: string | null, period: string, portfolioData: any, trades: any[], marketRegime: string): Promise<any> {
  const res = await fetch('/api/ai/risk-report', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, period, portfolio_data: portfolioData, trades, market_regime: marketRegime }),
  })
  if (!res.ok) throw new Error('Risk report generation failed')
  return res.json()
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
