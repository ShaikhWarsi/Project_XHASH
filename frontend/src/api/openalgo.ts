import { api } from './client'

export interface ApiKey {
  id: string
  key_preview: string
  label: string
  created_at: string
  expires_at: string | null
  last_used: string | null
  is_active: boolean
  order_mode: 'live' | 'paper'
  permissions: string[]
}

export interface LatencyStats {
  avg_latency_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  min_ms: number
  max_ms: number
  total_requests: number
  by_broker: Record<string, { avg_ms: number; count: number }>
}

export interface LatencyPoint {
  timestamp: string
  avg_ms: number
  p95_ms: number
  p99_ms: number
  endpoint: string
}

export interface TrafficStats {
  total_requests: number
  total_errors: number
  error_rate: number
  avg_response_ms: number
  by_endpoint: Record<string, { count: number; errors: number; avg_ms: number }>
  banned_ips: string[]
}

export interface TrafficLog {
  id: number
  timestamp: string
  method: string
  endpoint: string
  status_code: number
  response_ms: number
  client_ip: string
  user_id: string | null
}

export interface PnLPosition {
  symbol: string
  quantity: number
  avg_entry: number
  current_price: number
  pnl: number
  pnl_percent: number
}

export interface PnLPoint {
  timestamp: string
  pnl: number
  unrealized_pnl: number
  realized_pnl: number
}

export interface PendingOrder {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  order_type: string
  strategy: string
  submitted_at: string
  reason: string
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down'
  uptime_seconds: number
  db_connected: boolean
  broker_connected: boolean
  last_check: string
  checks: Record<string, { status: string; latency_ms: number }>
}

export interface HealthPoint {
  timestamp: string
  status: string
  response_time_ms: number
  db_ok: boolean
  broker_ok: boolean
}

export interface MasterContractStatus {
  exchange: string
  symbol_count: number
  last_download: string | null
  status: 'up_to_date' | 'stale' | 'downloading' | 'not_downloaded'
  next_scheduled: string | null
}

export interface SandboxConfig {
  enabled: boolean
  initial_balance: number
  leverage: number
  allowed_symbols: string[]
  max_position_size: number
  fee_rate: number
  slippage_model: string
}

export interface AnalyzerLog {
  id: number
  timestamp: string
  method: string
  endpoint: string
  status_code: number
  response_ms: number
  request_body: string | null
  response_body: string | null
  error_message: string | null
}

// ── API Key Management ────────────────────────────────

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const { data } = await api.get('/openalgo/apikey')
  return data.keys
}

export async function generateApiKey(label: string, permissions: string[]): Promise<ApiKey> {
  const { data } = await api.post('/openalgo/apikey', { label, permissions })
  return data
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await api.post(`/openalgo/apikey/${keyId}/revoke`)
}

export async function toggleOrderMode(mode: 'live' | 'paper'): Promise<void> {
  await api.put('/openalgo/apikey/toggle-order-mode', { mode })
}

// ── Latency ──────────────────────────────────────────

export async function fetchLatencyStats(): Promise<LatencyStats> {
  const { data } = await api.get('/openalgo/latency/stats')
  return data
}

export async function fetchLatencyHistory(minutes = 60): Promise<LatencyPoint[]> {
  const { data } = await api.get('/openalgo/latency/history', { params: { minutes } })
  return data.history
}

// ── Traffic ──────────────────────────────────────────

export async function fetchTrafficStats(): Promise<TrafficStats> {
  const { data } = await api.get('/openalgo/traffic/stats')
  return data
}

export async function fetchTrafficLogs(limit = 100, offset = 0): Promise<TrafficLog[]> {
  const { data } = await api.get('/openalgo/traffic/logs', { params: { limit, offset } })
  return data.logs
}

export async function banIp(ip: string): Promise<void> {
  await api.post('/openalgo/traffic/ban-ip', { ip })
}

export async function unbanIp(ip: string): Promise<void> {
  await api.post('/openalgo/traffic/unban-ip', { ip })
}

// ── PnL Tracker ──────────────────────────────────────

export async function fetchPnLPositions(): Promise<PnLPosition[]> {
  const { data } = await api.get('/openalgo/pnl/positions')
  return data.positions
}

export async function fetchPnLHistory(): Promise<PnLPoint[]> {
  const { data } = await api.get('/openalgo/pnl/history')
  return data.history
}

// ── Action Center ────────────────────────────────────

export async function fetchPendingOrders(): Promise<PendingOrder[]> {
  const { data } = await api.get('/openalgo/action-center/pending')
  return data.orders
}

export async function approveOrder(orderId: string): Promise<void> {
  await api.post(`/openalgo/action-center/${orderId}/approve`)
}

export async function rejectOrder(orderId: string, reason?: string): Promise<void> {
  await api.post(`/openalgo/action-center/${orderId}/reject`, { reason })
}

// ── Health ───────────────────────────────────────────

export async function fetchHealthStatus(): Promise<HealthStatus> {
  const { data } = await api.get('/openalgo/health/status')
  return data
}

export async function fetchHealthHistory(): Promise<HealthPoint[]> {
  const { data } = await api.get('/openalgo/health/history')
  return data.history
}

// ── Master Contract ──────────────────────────────────

export async function fetchMasterContractStatus(): Promise<MasterContractStatus[]> {
  const { data } = await api.get('/openalgo/master-contract/status')
  return data.statuses
}

export async function triggerMasterContractDownload(exchange: string): Promise<void> {
  await api.post('/openalgo/master-contract/download', { exchange })
}

// ── Sandbox ──────────────────────────────────────────

export async function fetchSandboxConfig(): Promise<SandboxConfig> {
  const { data } = await api.get('/openalgo/sandbox/config')
  return data
}

export async function updateSandboxConfig(config: Partial<SandboxConfig>): Promise<void> {
  await api.post('/openalgo/sandbox/config', config)
}

// ── Analyzer ─────────────────────────────────────────

export async function fetchAnalyzerLogs(limit = 100, offset = 0): Promise<AnalyzerLog[]> {
  const { data } = await api.get('/openalgo/analyzer/logs', { params: { limit, offset } })
  return data.logs
}

export async function fetchAnalyzerLogDetail(logId: number): Promise<AnalyzerLog> {
  const { data } = await api.get(`/openalgo/analyzer/log/${logId}`)
  return data
}

// ── Security Dashboard ──────────────────────────────

export interface SecuritySettings {
  auto_ban_enabled: boolean
  '404_threshold': number
  '404_ban_duration': number
  api_threshold: number
  api_ban_duration: number
  repeat_offender_limit: number
}

export interface SecurityStats {
  total_bans: number
  permanent_bans: number
  temporary_bans: number
  suspicious_ips: number
  near_threshold: number
}

export interface BannedIP {
  ip_address: string
  ban_reason: string
  banned_at: string
  expires_at: string
  is_permanent: boolean
  ban_count: number
  created_by: string
}

export interface SuspiciousIP {
  ip_address: string
  error_count: number
  first_error_at: string
  last_error_at: string
  paths_attempted: string
}

export interface APIAbuseIP {
  ip_address: string
  attempt_count: number
  first_attempt_at: string
  last_attempt_at: string
  api_keys_tried: string
}

export interface LoginAttemptEntry {
  username: string
  ip_address: string | null
  device_info: string | null
  status: string
  login_type: string | null
  broker: string | null
  failure_reason: string | null
  timestamp: string | null
}

export async function fetchSecuritySettings(): Promise<SecuritySettings> {
  const { data } = await api.get('/openalgo/security/settings')
  return data
}

export async function updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
  await api.post('/openalgo/security/settings', settings)
}

export async function fetchSecurityStats(): Promise<SecurityStats> {
  const { data } = await api.get('/openalgo/security/stats')
  return data
}

export async function fetchSecurityData(): Promise<{
  banned_ips: BannedIP[]
  suspicious_ips: SuspiciousIP[]
  api_abuse_ips: APIAbuseIP[]
  security_settings: SecuritySettings
}> {
  const { data } = await api.get('/openalgo/security/data')
  return data
}

export async function banIpSecurity(ip: string, reason?: string, durationHours?: number): Promise<void> {
  await api.post('/openalgo/security/ban-ip', { ip, reason, duration_hours: durationHours })
}

export async function unbanIpSecurity(ip: string): Promise<void> {
  await api.post('/openalgo/security/unban-ip', { ip })
}

export async function clearSuspiciousIP(ip: string): Promise<void> {
  await api.post('/openalgo/security/clear-suspicious', { ip })
}

export async function clearAPIAbuseIP(ip: string): Promise<void> {
  await api.post('/openalgo/security/clear-api-abuse', { ip })
}

export async function fetchLoginActivity(): Promise<LoginAttemptEntry[]> {
  const { data } = await api.get('/openalgo/security/login-activity')
  return data.attempts
}

export async function clearLoginHistory(): Promise<void> {
  await api.post('/openalgo/security/login-activity/clear')
}

// ── GTT Orders ──

export interface GTTTrigger {
  gtt_id: string
  status: string
  trigger_type: string
  symbol: string
  exchange: string
  action: string
  product: string
  quantity: number
  pricetype: string
  price: number
  trigger_price: number
  triggerprice_sl: number
  triggerprice_tg: number
  stoploss: number | null
  target: number | null
  strategy: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface GTTPlaceRequest {
  strategy: string
  trigger_type: 'SINGLE' | 'OCO'
  exchange: string
  symbol: string
  action: 'BUY' | 'SELL'
  product: 'CNC' | 'NRML'
  quantity: number
  pricetype?: 'LIMIT' | 'MARKET'
  price: number
  triggerprice_sl?: number
  triggerprice_tg?: number
  stoploss?: number
  target?: number
  expires_at?: string
}

export interface GTTModifyRequest extends GTTPlaceRequest {
  trigger_id: string
}

export interface GTTCancelRequest {
  strategy: string
  trigger_id: string
}

export async function placeGTT(data: GTTPlaceRequest): Promise<{ status: string; trigger_id: string }> {
  const { data: res } = await api.post('/openalgo/gtt/place', data)
  return res
}

export async function modifyGTT(data: GTTModifyRequest): Promise<{ status: string; trigger_id: string }> {
  const { data: res } = await api.post('/openalgo/gtt/modify', data)
  return res
}

export async function cancelGTT(trigger_id: string): Promise<{ status: string; trigger_id: string }> {
  const { data: res } = await api.post('/openalgo/gtt/cancel', { trigger_id })
  return res
}

export async function fetchGTTOrderbook(): Promise<{ status: string; data: GTTTrigger[] }> {
  const { data } = await api.post('/openalgo/gtt/orderbook')
  return data
}
