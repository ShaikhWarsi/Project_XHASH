export interface ChartinkStrategy {
  id: string
  name: string
  symbol: string
  exchange: string
  action: string
  quantity: number
  product: string
  pricetype: string
  intraday: boolean
  enabled: boolean
  created_at: string
}

export interface ChartinkSymbolMapping {
  id: string
  chartink_symbol: string
  trading_symbol: string
  exchange: string
}

export interface TradingViewWebhookResult {
  status: string
  data?: any
  error?: string
}

export interface GoChartingWebhookResult {
  status: string
  data?: any
  error?: string
}
