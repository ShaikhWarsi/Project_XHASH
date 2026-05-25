import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useUrlState(key: string, defaultValue = '') {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (newValue && newValue !== defaultValue) {
            next.set(key, newValue)
          } else {
            next.delete(key)
          }
          return next
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue] as const
}
