import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWebSocketOptions<T = unknown> {
  onMessage?: (data: T) => void
  onError?: (error: Event) => void
  maxRetries?: number
  retryDelay?: number
}

export function useWebSocket<T = unknown>(url: string, options: UseWebSocketOptions<T> = {}) {
  const { onMessage, onError, maxRetries = 10, retryDelay = 1000 } = options
  const [connected, setConnected] = useState(false)
  const [lastData, setLastData] = useState<T | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current) wsRef.current.close()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const fullUrl = url.startsWith('ws') ? url : `${protocol}//${host}${url}`

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
        setLastData(data)
        onMessage?.(data)
      } catch { /* silent */ }
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setConnected(false)
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(retryDelay * Math.pow(2, retryCountRef.current), 30000)
        retryCountRef.current++
        retryTimerRef.current = setTimeout(connect, delay)
      }
    }
  }, [url, onMessage, onError, maxRetries, retryDelay])

  useEffect(() => {
    connect()
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const send = useCallback((data: T | string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }, [])

  const close = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    if (wsRef.current) wsRef.current.close()
    setConnected(false)
  }, [])

  return { connected, lastData, send, close, reconnect: connect }
}
