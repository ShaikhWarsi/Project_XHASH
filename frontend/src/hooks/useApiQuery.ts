import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useEffect } from 'react'

interface UseApiQueryOptions {
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number | false
}

export function useApiQuery<T>(
  url: string | null | undefined,
  params?: Record<string, unknown>,
  options?: UseApiQueryOptions,
) {
  const queryClient = useQueryClient()
  const queryKey: unknown[] = url ? [url, params] : []

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const res = await api.get(url!, { params, signal })
      return res.data
    },
    enabled: !!url && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30_000,
    refetchInterval: options?.refetchInterval,
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
