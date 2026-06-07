import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useEffect, useMemo } from 'react'

interface UseApiQueryOptions {
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false
}

const URL_PRESETS: Record<string, { staleTime?: number; refetchInterval?: number; refetchOnWindowFocus?: boolean }> = {
  '/watchlist': { staleTime: 30_000 },
  '/signals': { staleTime: 5_000, refetchInterval: 5_000, refetchOnWindowFocus: true },
  '/portfolio': { staleTime: 60_000, refetchInterval: 30_000, refetchOnWindowFocus: true },
  '/backtest': { staleTime: 300_000, refetchOnWindowFocus: false },
}

export function useApiQuery<T>(
  url: string | null | undefined,
  params?: Record<string, unknown>,
  options?: UseApiQueryOptions,
) {
  const queryClient = useQueryClient()
  const queryKey: unknown[] = url ? [url, params] : []

  const presets = useMemo(() => {
    if (!url) return {}
    const matched = Object.entries(URL_PRESETS).find(([key]) => url.startsWith(key))
    return matched?.[1] ?? {}
  }, [url])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await api.get(url!, { params, signal })
      return res.data
    },
    enabled: !!url && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? presets.staleTime ?? 30_000,
    refetchInterval: options?.refetchInterval ?? (presets.refetchInterval as any),
    refetchOnWindowFocus: presets.refetchOnWindowFocus ?? false,
  })

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey })
    }
  }, [queryKey[0], queryClient])

  return {
    data: data as T | undefined,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
