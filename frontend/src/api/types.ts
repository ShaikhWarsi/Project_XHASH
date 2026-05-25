export interface PortfolioState {
  cash: number
  total_value: number
  margin_used: number
  margin_req: number
  realized_gains: number
  positions: Record<string, Position>
}

export interface Position {
  symbol: string
  quantity: number
  side: 'LONG' | 'SHORT'
  entry_price: number
  current_price: number
  unrealized_pnl: number
  realized_pnl: number
  market_value: number
}

export interface QuantSignal {
  type: string
  direction: number
  strength: number
  confidence: number
  symbol: string
  timeframe: string
  timestamp: string
  price: number
  level: number | null
  metadata: Record<string, unknown>
}

export interface SignalMatrix {
  timestamp: string
  signals: Record<string, QuantSignal[]>
  composite_scores: Record<string, number>
  regime: RegimeState | null
}

export interface RegimeState {
  primary: string
  confidence: number
  wasserstein_cluster: number
  vol_regime: string
}

export interface Trade {
  id: number
  symbol: string
  side: string
  quantity: number
  price: number
  commission: number
  timestamp: string
  pnl: number | null
  pnl_pct: number | null
}

export interface PerformanceMetrics {
  total_return: number
  annualized_return: number
  annualized_vol: number
  sharpe_ratio: number
  sortino_ratio: number
  calmar_ratio: number
  max_drawdown: number
  max_drawdown_duration: number
  win_rate: number
  profit_factor: number
  total_trades: number
  var_95: number
  cvar_95: number
}

export interface BacktestResult {
  total_return: number
  annualized_return: number
  sharpe_ratio: number
  sortino_ratio: number
  max_drawdown: number
  win_rate: number
  profit_factor: number
  total_trades: number
  equity_curve: number[]
  timestamps: string[]
}

export interface AgentSignal {
  agent: string
  ticker: string
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reasoning: string
}

export interface DashboardSnapshot {
  portfolio: PortfolioState
  signals: SignalMatrix
  metrics: PerformanceMetrics
  attribution: Record<string, unknown>
  open_orders: { symbol: string; side: string; quantity: number; price: number }[]
  timestamp: string
}

export interface BarData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Order {
  symbol: string
  side: string
  quantity: number
  order_type: string
  price: number
  reason: string
}

export interface Gain {
  daily: number | null
  weekly: number | null
  monthly: number | null
  quarterly: number | null
  yearly: number | null
}

export interface Rsi {
  daily: number | null
  weekly: number | null
  monthly: number | null
}

export interface Macd {
  macd: number | null
  signal: number | null
  histogram: number | null
}

export interface BollingerBands {
  upper: number | null
  middle: number | null
  lower: number | null
}

export interface MovingAverages {
  sma50: number | null
  sma200: number | null
  ema50: number | null
  ema200: number | null
}

export interface Analysis {
  symbol: string
  name: string
  date: string
  lastPrice: number
  gain: Gain
  rsi: Rsi
  macd: Macd
  bollingerBands: BollingerBands
  movingAverages: MovingAverages
  atr: number | null
  dividendYield: number | null
  peRatio: number | null
  pbRatio: number | null
  eps: number | null
  roe: number | null
  marketCap: number | null
  recommendation: string | null
  analystCount: number | null
  fiftyTwoWeekHigh: number | null
  fiftyTwoWeekLow: number | null
  beta: number | null
  sector: string | null
  industry: string | null
  earningsDate: string | null
}

export interface HistoricalPrice {
  date: string
  open: number
  close: number
  low: number
  high: number
  volume: number
}

export interface Alert {
  id: number
  symbol: string
  targetPrice: number
  condition: 'ABOVE' | 'BELOW'
  active: boolean
  triggered: boolean
  createdAt: string
  expiresAt: string
}

export interface WatchlistItem {
  symbol: string
  company: string | null
  addedAt: string
}

export interface FinnhubQuote {
  c: number
  d: number
  dp: number
  h: number
  l: number
  o: number
  pc: number
}

export interface FinnhubSearchResult {
  description: string
  symbol: string
  type: string
}

export interface TradingViewWidget {
  symbol: string
  width?: string | number
  height?: string | number
  theme?: 'dark' | 'light'
  interval?: string
}

export interface OrderRequest {
  symbol: string
  side: 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT'
  quantity: number
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'OCO'
  price?: number
  stopPrice?: number
  limitPrice?: number
  trailingStop?: number
  timeInForce?: 'DAY' | 'GTC' | 'IOC' | 'FOK'
  ocoSymbol?: string
  ocoPrice?: number
  ocoStopPrice?: number
  bracketTakeProfit?: number
  bracketStopLoss?: number
  reduceOnly?: boolean
  goodUntil?: string
}

export interface OrderResponse {
  id: string
  symbol: string
  side: string
  quantity: number
  orderType: string
  price: number | null
  status: string
  filledQuantity: number
  remainingQuantity: number
  averageFillPrice: number | null
  createdAt: string
  updatedAt: string
}

export interface PositionExtended {
  symbol: string
  quantity: number
  side: 'LONG' | 'SHORT'
  entryPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  realizedPnl: number
  dayPnl: number
  dayPnlPercent: number
  exposure: number
  exposurePercent: number
  beta: number
}

export interface RiskMetrics {
  totalExposure: number
  totalExposurePercent: number
  longExposure: number
  shortExposure: number
  netExposure: number
  grossExposure: number
  buyingPower: number
  cashAvailable: number
  marginUsed: number
  marginRequirement: number
  var95: number
  cvar95: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  beta: number
  portfolioHeatmap: { sector: string; exposure: number; return: number; color: string }[]
}

export interface PaperAccount {
  balance: number
  equity: number
  buyingPower: number
  openPnl: number
  totalReturn: number
  totalTrades: number
  winRate: number
  isRunning: boolean
}

export interface OrderHistoryItem {
  id: string
  symbol: string
  side: string
  quantity: number
  price: number | null
  filledQuantity: number
  averageFillPrice: number | null
  orderType: string
  status: string
  reason?: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioOptResult {
  weights: Record<string, number>
  stats: {
    expected_return: number
    expected_risk: number
    sharpe_ratio: number
    n_assets: number
  }
  model: string
  risk_measure: string
}

export interface EfficientFrontierPoint {
  return: number
  risk: number
}

export interface FactorAnalysisResult {
  mean_ic: number
  ic_std: number
  ic_ir: number
  spread_return: number | null
  quantile_returns: Record<string, unknown>[] | null
  ic_series: Record<string, unknown>[] | null
}

export interface FactorDecayItem {
  period: number
  mean_ic: number
}

export interface RLTrainResult {
  model_path: string
  algo: string
  total_timesteps: number
}

export interface RLEvalResult {
  mean_return: number
  std_return: number
  max_return: number
  min_return: number
  episodes: number
}

export interface WhatIfResult {
  cost: number
  turnover: number
  tax_impact: number
  total_cost: number
}
