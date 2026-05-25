import { api } from './client'

export interface ProtectionDef {
  name: string
  description: string
}

export interface ProtectionCheckResult {
  protection: string
  passed: boolean
  reason: string
}

export interface ProtectionsCheckResponse {
  passed: boolean
  results: ProtectionCheckResult[]
}

export interface ProtectionConfig {
  max_drawdown_pct: number
  max_consecutive_losses: number
  max_daily_loss_pct: number
}

export async function fetchAvailableProtections(): Promise<{ protections: ProtectionDef[] }> {
  const { data } = await api.get('/protections/available')
  return data
}

export async function checkProtections(
  config: ProtectionConfig & {
    initial_capital: number
    current_equity: number
    peak_equity: number
    total_trades?: number
    consecutive_losses?: number
    current_drawdown_pct?: number
    daily_returns?: number[]
  },
): Promise<ProtectionsCheckResponse> {
  const { data } = await api.post('/protections/check', null, {
    params: {
      initial_capital: config.initial_capital,
      current_equity: config.current_equity,
      peak_equity: config.peak_equity,
      total_trades: config.total_trades ?? 0,
      consecutive_losses: config.consecutive_losses ?? 0,
      current_drawdown_pct: config.current_drawdown_pct ?? 0,
      max_drawdown_pct: config.max_drawdown_pct,
      max_consecutive_losses: config.max_consecutive_losses,
      max_daily_loss_pct: config.max_daily_loss_pct,
    },
  })
  return data
}
