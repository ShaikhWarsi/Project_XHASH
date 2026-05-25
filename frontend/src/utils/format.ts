/** Currency formatting with locale support for multi-currency display. */

const LOCALE_MAP: Record<string, string> = {
  'USD': 'en-US', 'EUR': 'de-DE', 'GBP': 'en-GB', 'JPY': 'ja-JP',
  'CNY': 'zh-CN', 'HKD': 'en-HK', 'SGD': 'en-SG', 'CHF': 'de-CH',
  'CAD': 'en-CA', 'AUD': 'en-AU', 'BTC': 'en-US', 'ETH': 'en-US',
}

export function fmtCurrency(value: number, currency = 'USD'): string {
  if (!Number.isFinite(value)) return '—'
  const locale = LOCALE_MAP[currency] || 'en-US'
  if (currency === 'BTC' || currency === 'ETH') {
    return `${value < 0 ? '-' : ''}${currency} ${Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}

export function fmtPercent(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function fmtNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  return value.toFixed(decimals)
}

export function fmtDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
