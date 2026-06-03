import { useState, useEffect, useCallback } from 'react'

const PREFIX = 'te_'

function migrateKey(key: string): string {
  const namespaced = `${PREFIX}${key}`
  const oldVal = localStorage.getItem(key)
  if (oldVal !== null && localStorage.getItem(namespaced) === null) {
    localStorage.setItem(namespaced, oldVal)
    localStorage.removeItem(key)
  }
  return namespaced
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
): [T, (val: T | ((prev: T) => T)) => void] {
  const storageKey = migrateKey(key)
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue) as T)
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [storageKey])

  const setValue = useCallback((val: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof val === 'function' ? (val as (prev: T) => T)(prev) : val
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch { /* quota exceeded */ }
      return next
    })
  }, [storageKey])

  return [state, setValue]
}
