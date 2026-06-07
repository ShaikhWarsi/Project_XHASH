import { useEffect, useRef, useCallback, useState } from 'react'

interface UseEventSourceOptions {
  onMessage?: (data: unknown) => void
  onError?: (error: Event) => void
  maxRetries?: number
  retryDelay?: number
}

export function useEventSource<T = unknown>(
  url: string | null,
  options: UseEventSourceOptions = {},
) {
  const { onMessage, onError, maxRetries = 10, retryDelay = 1000 } = options
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(true)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  onMessageRef.current = onMessage
  onErrorRef.current = onError

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const connect = useCallback(() => {
    if (!url || !mountedRef.current) return
    esRef.current?.close()
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      if (!mountedRef.current) { es.close(); return }
      setConnected(true)
      retryCountRef.current = 0
    }

    es.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(e.data) as T
        onMessageRef.current?.(data)
      } catch { /* ignore parse errors */ }
    }

    es.onerror = (err) => {
      if (!mountedRef.current) return
      es.close()
      setConnected(false)
      onErrorRef.current?.(err)

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++
        const delay = Math.min(retryDelay * Math.pow(2, retryCountRef.current - 1), 30000)
        setTimeout(() => { if (mountedRef.current) connect() }, delay)
      }
    }
  }, [url, maxRetries, retryDelay])

  useEffect(() => {
    if (!url) return
    connect()
    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [url, connect])

  const close = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setConnected(false)
  }, [])

  return { connected, close }
}
