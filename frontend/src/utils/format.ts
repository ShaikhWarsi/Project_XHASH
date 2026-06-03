import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(advancedFormat)

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

export function fmtDate(date: string | Date | number): string {
  return dayjs(date).format('MMM D, YYYY')
}

export function fmtTime(date: string | Date | number): string {
  return dayjs(date).format('HH:mm:ss')
}

export function fmtDateTime(date: string | Date | number): string {
  return dayjs(date).format('MMM D, YYYY HH:mm:ss')
}

export function fmtRelative(date: string | Date | number): string {
  const d = dayjs(date)
  const now = dayjs()
  const diff = now.diff(d, 'minute')
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.format('MMM D')
}
