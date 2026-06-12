import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWebSocketOptions<T = unknown> {
  onMessage?: (data: T) => void
  onError?: (error: Event) => void
  maxRetries?: number
  retryDelay?: number
  throttleMs?: number
}

const DEFAULT_THROTTLE_MS = 100

export function useWebSocket<T = unknown>(url: string, options: UseWebSocketOptions<T> = {}) {
  const { onMessage, onError, maxRetries = 10, retryDelay = 1000, throttleMs = DEFAULT_THROTTLE_MS } = options
  const [connected, setConnected] = useState(false)
  const [lastData, setLastData] = useState<T | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const urlRef = useRef(url)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)
  onMessageRef.current = onMessage
  onErrorRef.current = onError
  const lastDataRef = useRef<T | null>(null)
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    urlRef.current = url
  }, [url])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
      }
    }
  }, [])

  const flushData = useCallback(() => {
    throttleTimerRef.current = null
    if (mountedRef.current) {
      setLastData(lastDataRef.current)
    }
  }, [])

  const connect = useCallback(() => {
    const currentUrl = urlRef.current
    if (!mountedRef.current) return
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    if (!currentUrl) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const fullUrl = currentUrl.startsWith('ws') ? currentUrl : `${protocol}//${host}${currentUrl}`

    const ws = new WebSocket(fullUrl)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setConnected(true)
      retryCountRef.current = 0
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(event.data)
        lastDataRef.current = data
        onMessageRef.current?.(data)
        if (throttleMs > 0) {
          if (!throttleTimerRef.current) {
            throttleTimerRef.current = setTimeout(flushData, throttleMs)
          }
        } else {
          setLastData(data)
        }
      } catch (e) { console.warn('[useWebSocket] message processing error:', e) }
    }

    ws.onerror = (event) => {
      if (!mountedRef.current) return
      setConnected(false)
      onErrorRef.current?.(event)
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      if (retryCountRef.current < maxRetries) {
        const baseDelay = Math.min(retryDelay * Math.pow(2, retryCountRef.current), 30000)
        const jitter = Math.random() * 2000
        retryCountRef.current++
        retryTimerRef.current = setTimeout(connect, baseDelay + jitter)
      }
    }
  }, [maxRetries, retryDelay, throttleMs, flushData])

  useEffect(() => {
    if (!url) return
    connect()
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
    }
  }, [connect, url])

  const send = useCallback((data: T | string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }, [])

  const close = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current)
    if (wsRef.current) wsRef.current.close()
    setConnected(false)
  }, [])

  return { connected, lastData, send, close, reconnect: connect }
}
