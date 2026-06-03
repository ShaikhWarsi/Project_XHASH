import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'

type ChannelType = 'prices' | 'signals' | 'orders' | 'trades' | 'motd' | 'news' | 'calendar' | 'chat'

interface ChannelData {
  [channel: string]: unknown
}

interface WebSocketContextValue {
  useChannel: (channel: ChannelType) => { data: unknown; connected: boolean }
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}/ws`
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const channelDataRef = useRef<Record<string, unknown>>({})
  const listenersRef = useRef<Set<() => void>>(new Set())
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const maxRetries = 10

  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach((fn) => fn())
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)

    const url = getWebSocketUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setConnected(true)
      retryCountRef.current = 0
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(event.data) as { channel?: string; data?: unknown }
        if (msg.channel) {
          channelDataRef.current[msg.channel] = msg.data
          notifyListeners()
        }
      } catch { /* silent */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
        const jitter = delay * (0.5 + Math.random() * 0.5)
        retryCountRef.current++
        retryTimerRef.current = setTimeout(connect, jitter)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [notifyListeners])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  const useChannel = (channel: ChannelType) => {
    const [, forceUpdate] = useState(0)
    const prevDataRef = useRef(channelDataRef.current[channel])

    useEffect(() => {
      const handler = () => {
        const newData = channelDataRef.current[channel]
        if (newData !== prevDataRef.current) {
          prevDataRef.current = newData
          forceUpdate((n) => n + 1)
        }
      }
      listenersRef.current.add(handler)
      return () => { listenersRef.current.delete(handler) }
    }, [channel])

    return { data: channelDataRef.current[channel], connected }
  }

  return (
    <WebSocketContext.Provider value={{ useChannel }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useChannel(channel: ChannelType) {
  const ctx = useContext(WebSocketContext)
  if (!ctx) {
    throw new Error('useChannel must be used within a WebSocketProvider')
  }
  return ctx.useChannel(channel)
}
