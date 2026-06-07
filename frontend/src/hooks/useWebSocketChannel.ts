import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocketProvider } from '../contexts/WebSocketProvider'

interface UseWebSocketChannelOptions<T = unknown> {
  onMessage?: (data: T) => void
  throttleMs?: number
}

const DEFAULT_THROTTLE = 100

export function useWebSocketChannel<T = unknown>(
  endpoint: string,
  options: UseWebSocketChannelOptions<T> = {},
) {
  const { subscribe, send: providerSend, getConnected } = useWebSocketProvider()
  const [lastData, setLastData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const lastDataRef = useRef<T | null>(null)
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(options.onMessage)
  onMessageRef.current = options.onMessage
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE

  useEffect(() => {
    const unsub = subscribe(endpoint, (data: T) => {
      lastDataRef.current = data
      onMessageRef.current?.(data)
      if (throttleMs > 0) {
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setTimeout(() => {
            throttleTimerRef.current = null
            setLastData(lastDataRef.current)
          }, throttleMs)
        }
      } else {
        setLastData(data)
      }
    })
    return () => {
      unsub()
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
      }
    }
  }, [endpoint, subscribe, throttleMs])

  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(getConnected(endpoint))
    }, 1000)
    return () => clearInterval(interval)
  }, [endpoint, getConnected])

  const send = useCallback((data: T | string) => {
    providerSend(endpoint, data)
  }, [endpoint, providerSend])

  return { connected, lastData, send }
}
