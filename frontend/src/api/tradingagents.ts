import { api } from './client'
import type {
  ScrapeBundle,
  AnalyzeRequest,
  AnalyzeResponse,
  ReportBundle,
  RunSummary,
  TradingAgentsEvent,
  RunStatus,
} from './types'

export async function scrapeOnly(ticker: string, days = 7): Promise<ScrapeBundle> {
  const { data } = await api.post('/v1/tradingagents/scrape', { ticker, days }, { timeout: 60000 })
  return data
}

export async function startAnalysis(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { data } = await api.post('/v1/tradingagents/analyze', req)
  return data
}

export async function getRun(runId: string): Promise<ReportBundle> {
  const { data } = await api.get(`/v1/tradingagents/runs/${runId}`)
  return data
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
  const { data } = await api.get(`/v1/tradingagents/runs/${runId}/status`)
  return data
}

export async function cancelRun(runId: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post(`/v1/tradingagents/runs/${runId}/cancel`)
  return data
}

export async function getRunEvents(runId: string, limit = 200): Promise<{ events: any[]; total: number }> {
  const { data } = await api.get(`/v1/tradingagents/runs/${runId}/events?limit=${limit}`)
  return data
}

export async function listRuns(limit = 20): Promise<RunSummary[]> {
  const { data } = await api.get(`/v1/tradingagents/runs?limit=${limit}`)
  return data.runs
}

export async function getDebugInfo(): Promise<any> {
  const { data } = await api.get('/v1/tradingagents/debug')
  return data
}

export function streamRun(
  runId: string,
  onEvent: (event: TradingAgentsEvent) => void,
  onError?: (err: Error) => void,
  onReconnect?: () => void,
): () => void {
  const baseUrl = api.defaults.baseURL || ''
  const url = `${baseUrl}/v1/tradingagents/runs/${runId}/stream`
  let source: EventSource | null = null
  let retryCount = 0
  const maxRetries = 10
  let disconnected = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const eventTypes = [
    'pipeline_start', 'scrape_complete', 'node_start', 'node_complete',
    'analyst_complete', 'analyst_started', 'debate_round', 'debate_started',
    'stage_update', 'tool_call', 'tool_result',
    'research_manager_decision', 'trader_decision', 'pm_decision',
    'run_complete', 'pipeline_error', 'pipeline_cancelled', 'ping',
  ]

  function createConnection(): EventSource {
    const es = new EventSource(url)
    const handlers: Record<string, (e: MessageEvent) => void> = {}

    const addHandler = (eventType: string) => {
      handlers[eventType] = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as Record<string, unknown>
          onEvent({ event: eventType, data, ts: (data.ts as string) || '' })
        } catch {
          // ignore parse errors
        }
      }
      es.addEventListener(eventType, handlers[eventType])
    }

    eventTypes.forEach(addHandler)

    es.onopen = () => {
      retryCount = 0
      onReconnect?.()
    }

    es.onerror = () => {
      es.close()
      if (disconnected) return

      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000)
        const jitter = delay * (0.5 + Math.random() * 0.5)
        reconnectTimer = setTimeout(() => {
          if (!disconnected) {
            source = createConnection()
          }
        }, jitter)
      } else {
        onError?.(new Error('SSE connection failed after max retries'))
      }
    }

    return es
  }

  source = createConnection()

  return () => {
    disconnected = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (source) source.close()
    source = null
  }
}
