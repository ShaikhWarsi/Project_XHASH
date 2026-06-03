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

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  transitional: { clarifyTimeoutError: true },
})

const NO_RETRY_PATTERNS = [/\/market\/(news|quotes)/, /\/signals\//]

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (!config || config._retryCount >= 1) return Promise.reject(error)
    if (!error.response || error.response.status < 500) return Promise.reject(error)
    if (NO_RETRY_PATTERNS.some((p) => p.test(config.url))) return Promise.reject(error)
    config._retryCount = (config._retryCount || 0) + 1
    const delay = 1000
    await new Promise((resolve) => setTimeout(resolve, delay))
    return api(config)
  },
)

const DEDUP_MAP = new Map<string, Promise<any>>()
const DEDUP_MAX = 100

function dedupKey(url: string): string {
  if (DEDUP_MAP.size >= DEDUP_MAX) {
    const oldest = DEDUP_MAP.keys().next().value
    if (oldest) DEDUP_MAP.delete(oldest)
  }
  return url
}

export function dedupGet<T = any>(url: string, params?: Record<string, any>): Promise<T> {
  const key = dedupKey(url) + '?' + JSON.stringify(params ?? {})
  if (!DEDUP_MAP.has(key)) {
    DEDUP_MAP.set(key, api.get(url, { params }).then((res) => {
      DEDUP_MAP.delete(key)
      return res.data
    }).catch((err) => {
      DEDUP_MAP.delete(key)
      throw err
    }))
  }
  return DEDUP_MAP.get(key)!
}

let _apiKey: string | null = null

const API_KEY_PATHS = ['/orders', '/portfolio', '/backtest', '/signals', '/hypotheses', '/config', '/strategies', '/swarm', '/agents']

api.interceptors.request.use((config) => {
  if (_apiKey && config.url) {
    const needsAuth = API_KEY_PATHS.some((p) => config.url!.startsWith(p))
    if (needsAuth) {
      config.headers.Authorization = `Bearer ${_apiKey}`
    }
  }
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

const RATE_LIMIT_MAP = new Map<string, number>()
const RATE_LIMIT_DEFAULTS: Record<string, number> = {
  backtest: 5000,
  order: 500,
}

export function checkRateLimit(action: string): boolean {
  const now = Date.now()
  const lastCall = RATE_LIMIT_MAP.get(action) || 0
  const cooldown = RATE_LIMIT_DEFAULTS[action] || 1000
  if (now - lastCall < cooldown) return false
  RATE_LIMIT_MAP.set(action, now)
  return true
}

export function clearAuthState() {
  _apiKey = null
  delete api.defaults.headers.common['Authorization']
}

export function setApiKey(key: string | null) {
  if (!key) {
    clearAuthState()
    return
  }
  _apiKey = key
}

export function getApiKey(): string | null {
  return _apiKey
}

export async function rotateApiKey(): Promise<string | null> {
  try {
    const { data } = await api.post('/auth/rotate-key')
    const newKey = data.api_key || data.key
    if (newKey) {
      setApiKey(newKey)
    }
    return newKey
  } catch {
    clearAuthState()
    return null
  }
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
  const { data } = await api.get('/signals/')
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
  if (!checkRateLimit('backtest')) {
    throw new Error('Please wait before running another backtest')
  }
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

const OHLCV_CACHE = new Map<string, { data: BarData[]; timestamp: number }>()
const OHLCV_CACHE_TTL = 120_000
const OHLCV_CACHE_MAX = 50

export async function fetchOHLCV(symbol: string, interval = '1d', range = '1mo', signal?: AbortSignal): Promise<BarData[]> {
  const key = `${symbol}_${interval}_${range}`
  const cached = OHLCV_CACHE.get(key)
  if (cached && Date.now() - cached.timestamp < OHLCV_CACHE_TTL) {
    return cached.data
  }
  const { data } = await api.get(`/bars/${symbol}`, { params: { interval, range }, timeout: 30000, signal })
  if (OHLCV_CACHE.size >= OHLCV_CACHE_MAX) {
    const oldest = OHLCV_CACHE.keys().next().value
    if (oldest) OHLCV_CACHE.delete(oldest)
  }
  OHLCV_CACHE.set(key, { data, timestamp: Date.now() })
  return data
}

export function connectDashboardSSE(
  onUpdate: (snapshot: DashboardSnapshot) => void,
  onStale?: (isStale: boolean) => void,
): { close: () => void } {
  let retryCount = 0
  const maxRetries = 10
  const baseDelay = 1000
  let disconnected = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null
  let gaveUp = false
  let connecting = false
  let currentEs: EventSource | null = null
  let recoveryGuard = false

  function createConnection(): EventSource {
    const source = new EventSource('/api/stream/live')
    let hasEverConnected = false

    source.onmessage = (event) => {
      try {
        const snapshot: DashboardSnapshot = JSON.parse(event.data)
        onUpdate(snapshot)
        if (!hasEverConnected) {
          hasEverConnected = true
          retryCount = 0
          gaveUp = false
          onStale?.(false)
        }
      } catch {
        console.debug('SSE parse error (non-critical)')
      }
    }

    source.onopen = () => {
      hasEverConnected = true
      retryCount = 0
      gaveUp = false
      connecting = false
      onStale?.(false)
    }

    source.onerror = () => {
      console.debug('SSE connection lost — data may be stale')
      onStale?.(true)
      source.close()

      if (disconnected || connecting) return
      connecting = true

      if (retryCount < maxRetries) {
        retryCount++
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 30000)
        const jitter = delay * (0.5 + Math.random() * 0.5)
        console.debug(`SSE reconnecting in ${Math.round(jitter)}ms (attempt ${retryCount}/${maxRetries})`)
        reconnectTimer = setTimeout(() => {
          if (!disconnected) {
            if (currentEs) currentEs.close()
            currentEs = createConnection()
          }
          connecting = false
        }, jitter)
      } else if (!disconnected) {
        console.debug('SSE max retries reached, giving up')
        gaveUp = true
        connecting = false
        onStale?.(true)
        scheduleRecovery()
      }
    }

    return source
  }

  function scheduleRecovery() {
    if (recoveryGuard || disconnected) return
    recoveryGuard = true
    clearTimeout(recoveryTimer ?? undefined)
    recoveryTimer = setTimeout(() => {
      recoveryGuard = false
      if (!disconnected && gaveUp) {
        console.debug('SSE recovery check — attempting reconnect')
        retryCount = 0
        gaveUp = false
        if (currentEs) currentEs.close()
        currentEs = createConnection()
      }
    }, 30000)
  }

  function onNetworkOnline() {
    if (!disconnected) {
      console.debug('SSE network recovered — reconnecting')
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (recoveryTimer) clearTimeout(recoveryTimer)
      retryCount = 0
      gaveUp = false
      connecting = false
      if (currentEs) currentEs.close()
      currentEs = createConnection()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', onNetworkOnline)
  }

  currentEs = createConnection()
  return {
    close() {
      disconnected = true
      recoveryGuard = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (recoveryTimer) clearTimeout(recoveryTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onNetworkOnline)
      }
      if (currentEs) currentEs.close()
      currentEs = null
    },
  }
}

export async function searchStocks(query: string): Promise<{ symbol: string; description: string; type: string }[]> {
  if (!query.trim()) return []
  const { data } = await api.get('/market/search', { params: { q: query } })
  return data.results || []
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote> {
  const { data } = await api.get(`/market/quote/${symbol}`)
  return data
}

export async function fetchQuotes(symbols: string[], signal?: AbortSignal): Promise<Record<string, FinnhubQuote | null>> {
  const { data } = await api.get('/market/quotes', { params: { symbols: symbols.join(',') }, signal })
  return data
}

export async function fetchWatchlist(userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.get('/market/watchlist', { params: { user_id: userId } })
  return data.watchlist || []
}

export async function addToWatchlist(symbol: string, company = '', userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.post('/market/watchlist', { user_id: userId, symbol, company })
  return data.watchlist || []
}

export async function removeFromWatchlist(symbol: string, userId = 'default'): Promise<WatchlistItem[]> {
  const { data } = await api.delete(`/market/watchlist/${symbol}`, { params: { user_id: userId } })
  return data.watchlist || []
}

export async function getAlerts(userId = 'default'): Promise<Alert[]> {
  const { data } = await api.get('/market/alerts', { params: { user_id: userId } })
  return data.alerts || []
}

export async function createAlert(symbol: string, targetPrice: number, condition: 'ABOVE' | 'BELOW', userId = 'default'): Promise<Alert> {
  const { data } = await api.post('/market/alerts', { user_id: userId, symbol, target_price: targetPrice, condition })
  return data.alert
}

export async function deleteAlert(alertId: number, userId = 'default'): Promise<boolean> {
  const { data } = await api.delete(`/market/alerts/${alertId}`, { params: { user_id: userId } })
  return data.success
}

export async function fetchCompanyProfile(symbol: string): Promise<Record<string, unknown>> {
  const { data } = await api.get(`/market/profile/${symbol}`)
  return data
}

export async function fetchCompanyNews(symbol: string): Promise<{ headline: string; summary: string; url: string; source: string; datetime: number; image: string }[]> {
  const { data } = await api.get(`/market/news/${symbol}`)
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
  const { data } = await api.get(`/structure/${symbol}`, { params: { timeframe } })
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

export async function listStrategyTemplates(): Promise<{ name: string; description: string }[]> {
  const { data } = await api.get('/finscript/templates')
  return data.templates
}

export async function getStrategyTemplate(name: string): Promise<{ name: string; code: string }> {
  const { data } = await api.get(`/finscript/templates/${name}`)
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

// ── Screener ─────────────────────────────────────────────

export async function getScreenerPresets(): Promise<Record<string, { name: string; description: string; filters: Record<string, any> }>> {
  const { data } = await api.get('/screener/presets')
  return data.presets
}

export async function scanSymbols(
  symbols: string[],
  filters?: Record<string, any>,
): Promise<{ results: any[]; total: number; matches: number; errors: string[] }> {
  const { data } = await api.get('/screener/scan', {
    params: { symbols: symbols.join(','), ...filters },
  })
  return data
}

export async function scanWithPreset(
  presetName: string,
  symbols = 'AAPL,MSFT,GOOGL,AMZN,TSLA,META,NVDA',
): Promise<{ results: any[]; total: number; matches: number; errors: string[] }> {
  const { data } = await api.get(`/screener/preset/${presetName}`, {
    params: { symbols },
  })
  return data
}

// ── TA Compute ───────────────────────────────────────────

export async function computeIndicators(
  symbol: string,
  indicators: Record<string, any>,
  interval = '1d',
  periodDays = 100,
  signals = false,
): Promise<{ symbol: string; indicators: Record<string, any>; signals?: Record<string, any> }> {
  const { data } = await api.post('/chart/ta/compute', {
    symbol, interval, period_days: periodDays, indicators, signals,
  })
  return data
}
