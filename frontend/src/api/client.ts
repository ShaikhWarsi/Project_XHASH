import axios from 'axios'
import type {
  PortfolioState,
  SignalMatrix,
  PerformanceMetrics,
  BacktestResult,
  DashboardSnapshot,
  Trade,
  BarData,
  Alert,
  WatchlistItem,
  FinnhubQuote,
  OrderRequest,
  OrderResponse,
  PositionExtended,
  RiskMetrics,
  PortfolioOptResult,
  EfficientFrontierPoint,
  FactorAnalysisResult,
  FactorDecayItem,
  RLTrainResult,
  WhatIfResult,
} from './types'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (!config || config._retryCount >= 3) return Promise.reject(error)
    if (!error.response || error.response.status < 500) return Promise.reject(error)
    config._retryCount = (config._retryCount || 0) + 1
    const delay = Math.min(500 * Math.pow(2, config._retryCount - 1), 10000)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return api(config)
  },
)

let _apiKey: string | null = null

export function setApiKey(key: string) {
  if (key) {
    _apiKey = key
    api.defaults.headers.common['Authorization'] = `Bearer ${key}`
  } else {
    _apiKey = null
    delete api.defaults.headers.common['Authorization']
  }
}

export function getApiKey(): string | null {
  return _apiKey
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (_apiKey) {
    headers['Authorization'] = `Bearer ${_apiKey}`
  }
  return headers
}

export async function fetchPortfolio(): Promise<PortfolioState> {
  const { data } = await api.get('/portfolio')
  return data
}

export async function fetchPortfolioHistory(): Promise<{ timestamp: string; total_value: number }[]> {
  const { data } = await api.get('/portfolio/history')
  return data
}

export async function fetchSignals(): Promise<SignalMatrix> {
  const { data } = await api.get('/signals/latest')
  return data
}

export async function fetchMetrics(): Promise<PerformanceMetrics> {
  const { data } = await api.get('/metrics')
  return data
}

export async function runBacktest(config: {
  tickers: string[]
  start: string
  end: string
  capital: number
  strategy: string
  engine_type?: string
  leverage?: number
  agents?: string[]
}): Promise<BacktestResult> {
  const { data } = await api.post('/backtest/run', config)
  return data
}

export async function fetchBacktestEngines(): Promise<{ id: string; label: string; description: string }[]> {
  const { data } = await api.get('/backtest/engines')
  return data.market_engines || data.engines || data
}

export async function fetchTrades(): Promise<Trade[]> {
  const { data } = await api.get('/trades')
  return data
}

export async function fetchOHLCV(symbol: string, interval = '1d', range = '1mo'): Promise<BarData[]> {
  const { data } = await api.get(`/bars/${symbol}`, { params: { interval, range } })
  return data
}

export function connectDashboardSSE(
  onUpdate: (snapshot: DashboardSnapshot) => void,
  onStale?: (isStale: boolean) => void,
): EventSource {
  let retryCount = 0
  const maxRetries = 10
  const baseDelay = 1000
  let disconnected = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function createConnection(): EventSource {
    const es = new EventSource('/api/stream/live')
    let hasEverConnected = false

    es.onmessage = (event) => {
      try {
        const snapshot: DashboardSnapshot = JSON.parse(event.data)
        onUpdate(snapshot)
        if (!hasEverConnected) {
          hasEverConnected = true
          retryCount = 0
          onStale?.(false)
        }
      } catch {
        console.debug('SSE parse error (non-critical)')
      }
    }

    es.onopen = () => {
      hasEverConnected = true
      retryCount = 0
      onStale?.(false)
    }

    es.onerror = () => {
      console.debug('SSE connection lost — data may be stale')
      onStale?.(true)
      es.close()

      if (!disconnected && retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 30000)
        const jitter = delay * (0.5 + Math.random() * 0.5)
        console.debug(`SSE reconnecting in ${Math.round(jitter)}ms (attempt ${retryCount}/${maxRetries})`)
        reconnectTimer = setTimeout(() => {
          if (!disconnected) {
            esRef.current = createConnection()
          }
        }, jitter)
      } else if (!disconnected) {
        console.debug('SSE max retries reached, giving up')
        onStale?.(true)
      }
    }

    return es
  }

  const esRef: { current: EventSource } = { current: createConnection() }
  return {
    close() {
      disconnected = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      esRef.current.close()
    },
  } as EventSource
}

export async function searchStocks(query: string): Promise<{ symbol: string; description: string; type: string }[]> {
  if (!query.trim()) return []
  const { data } = await api.get('/v1/market/search', { params: { q: query } })
  return data.results || []
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote> {
  const { data } = await api.get(`/v1/market/quote/${symbol}`)
  return data
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, FinnhubQuote | null>> {
  const { data } = await api.get('/v1/market/quotes', { params: { symbols: symbols.join(',') } })
  return data
}

export async function fetchWatchlist(userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.get('/v1/market/watchlist', { params: { user_id: userId } })
  return data.watchlist || []
}

export async function addToWatchlist(symbol: string, company = '', userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.post('/v1/market/watchlist', { user_id: userId, symbol, company })
  return data.watchlist || []
}

export async function removeFromWatchlist(symbol: string, userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.delete(`/v1/market/watchlist/${symbol}`, { params: { user_id: userId } })
  return data.watchlist || []
}

export async function getAlerts(userId = 'default'): Promise<Alert[]> {
  const { data } = await api.get('/v1/market/alerts', { params: { user_id: userId } })
  return data.alerts || []
}

export async function createAlert(symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW', userId = 'default'): Promise<Alert> {
  const { data } = await api.post('/v1/market/alerts', { user_id: userId, symbol, target_price: targetPrice, condition })
  return data.alert
}

export async function deleteAlert(alertId: number, userId = 'default'): Promise<boolean> {
  const { data } = await api.delete(`/v1/market/alerts/${alertId}`, { params: { user_id: userId } })
  return data.success
}

export async function fetchCompanyProfile(symbol: string): Promise<Record<string, unknown>> {
  const { data } = await api.get(`/v1/market/profile/${symbol}`)
  return data
}

export async function fetchCompanyNews(symbol: string): Promise<{ headline: string; summary: string; url: string; source: string; datetime: number; image: string }[]> {
  const { data } = await api.get(`/v1/market/news/${symbol}`)
  return data.articles || []
}

export async function fetchTechnicalAnalysis(symbol: string, interval = '1d', periodDays = 50, provider = 'yfinance'): Promise<string> {
  const { data } = await api.get(`/chart/${symbol}`, { params: { interval, period_days: periodDays, provider } })
  return data
}

export async function fetchTAChart(
  symbol: string,
  interval: string,
  periodDays: number,
  indicators: Record<string, Record<string, number | number[]>>
): Promise<{ figure_json: any; symbol: string }> {
  const { data } = await api.post('/chart/ta', {
    symbol,
    interval,
    period_days: periodDays,
    provider: 'yfinance',
    indicators,
  })
  return data
}

export async function fetchAvailableIndicators(): Promise<{ indicators: Record<string, any>; categories: string[] }> {
  const { data } = await api.get('/chart/ta/available-indicators')
  return data
}

export async function fetchRawSignals(): Promise<SignalMatrix> {
  const { data } = await api.get('/signals/')
  return data
}

export async function fetchMMCAnalysis(symbol = 'BTC-USD', period = '1mo', interval = '15m'): Promise<Record<string, unknown>> {
  const { data } = await api.get('/mmc/analyze', { params: { symbol, period, interval } })
  return data
}

export async function fetchStructure(symbol: string, timeframe: string): Promise<Record<string, unknown>> {
  const { data } = await api.get(`/v1/structure/${symbol}`, { params: { timeframe } })
  return data
}

export async function placeOrder(order: OrderRequest): Promise<OrderResponse> {
  const { data } = await api.post('/orders', order)
  return data
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/orders/${orderId}`)
  return data
}

export async function fetchOrders(): Promise<OrderResponse[]> {
  const { data } = await api.get('/orders')
  return data
}

export async function fetchPositions(): Promise<PositionExtended[]> {
  const { data } = await api.get('/positions')
  return data
}

export async function fetchPaperAccount(): Promise<{ balance: number; equity: number; buyingPower: number }> {
  const { data } = await api.get('/paper/account')
  return data
}

export async function startPaperSimulation(): Promise<{ success: boolean }> {
  const { data } = await api.post('/paper/start')
  return data
}

export async function stopPaperSimulation(): Promise<{ success: boolean }> {
  const { data } = await api.post('/paper/stop')
  return data
}

export async function resetPaperAccount(): Promise<{ success: boolean }> {
  const { data } = await api.post('/paper/reset')
  return data
}

export async function fetchRiskMetrics(): Promise<RiskMetrics> {
  const { data } = await api.get('/risk')
  return data
}

export async function optimizePortfolio(
  prices: number[],
  symbols: string[],
  model = 'mean-risk',
  riskMeasure = 'CVaR',
): Promise<PortfolioOptResult> {
  const { data } = await api.post('/portfolio-optimization/optimize', {
    prices, symbols, model, risk_measure: riskMeasure,
  })
  return data
}

export async function computeEfficientFrontier(
  prices: number[],
  symbols: string[],
  nPoints = 30,
): Promise<{ frontier: EfficientFrontierPoint[] }> {
  const { data } = await api.post('/portfolio-optimization/efficient-frontier', {
    prices, symbols, n_points: nPoints,
  })
  return data
}

export async function computeHrp(prices: number[], symbols: string[]): Promise<{ weights: Record<string, number>; model: string }> {
  const { data } = await api.post('/portfolio-optimization/hrp', { prices, symbols })
  return data
}

export async function analyzeFactor(
  prices: number[],
  factorValues: number[],
  timestamps: string[],
  symbols: string[],
  periods = '1,5,21',
): Promise<FactorAnalysisResult> {
  const { data } = await api.post('/factor-analysis/analyze', {
    prices, factor_values: factorValues, timestamps, symbols, periods,
  })
  return data
}

export async function computeFactorDecay(
  prices: number[],
  factorValues: number[],
  timestamps: string[],
  symbols: string[],
  periods = '1,5,10,21,63',
): Promise<{ decay: FactorDecayItem[] }> {
  const { data } = await api.post('/factor-analysis/decay', {
    prices, factor_values: factorValues, timestamps, symbols, periods,
  })
  return data
}

export async function evaluateFinScript(code: string, symbol = 'AAPL', start = '2024-01-01', end = '2024-12-31') {
  const { data } = await api.post('/finscript/evaluate', { code, symbol, start, end })
  return data
}

export async function portfolioWhatIf(
  current_weights: Record<string, number>,
  target_weights: Record<string, number>,
  rebalance_cost = 0.001,
): Promise<WhatIfResult> {
  const { data } = await api.post('/portfolio/what-if', {
    current_weights, target_weights, rebalance_cost,
  })
  return data
}

export async function trainRL(
  prices: number[],
  timestamps: string[],
  algo = 'ppo',
  totalTimesteps = 10000,
): Promise<RLTrainResult> {
  const { data } = await api.post('/rl-training/train', {
    prices, timestamps, algo, total_timesteps: totalTimesteps,
  })
  return data
}
