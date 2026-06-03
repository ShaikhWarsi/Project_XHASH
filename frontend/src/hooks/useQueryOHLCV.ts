import { useQuery } from '@tanstack/react-query'
import { fetchOHLCV } from '../api/client'
import type { BarData } from '../api/types'

export function useOHLCV(symbol: string, interval: string, range = '1mo') {
  return useQuery<BarData[]>({
    queryKey: ['ohlcv', symbol, interval, range],
    queryFn: ({ signal }) => fetchOHLCV(symbol, interval, range, signal),
    enabled: !!symbol && !!interval,
  })
}

export function useSignals(symbol: string) {
  return useQuery({
    queryKey: ['signals', symbol],
    queryFn: async () => {
      const mod = await import('../api/client')
      const data = await mod.fetchSignals()
      return data.signals?.[symbol] ?? []
    },
    enabled: !!symbol,
  })
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const mod = await import('../api/client')
      return mod.getAlerts()
    },
  })
}
