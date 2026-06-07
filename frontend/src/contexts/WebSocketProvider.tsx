import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getApiKey } from '../api/client'

const HEARTBEAT_INTERVAL = 25000
const MAX_RETRIES = 20
const BASE_DELAY = 1000

interface ManagedConnection {
  ws: WebSocket | null
  connected: boolean
  subscribers: Set<(data: any) => void>
  retryCount: number
  retryTimer: ReturnType<typeof setTimeout> | null
  heartbeatTimer: ReturnType<typeof setInterval> | null
  disconnectTimer: ReturnType<typeof setTimeout> | null
  pendingMessages: string[]
  lastActivity: number
}

interface WebSocketContextType {
  subscribe: (endpoint: string, handler: (data: any) => void) => () => void
  send: (endpoint: string, data: unknown) => void
  connected: boolean
  getConnected: (endpoint: string) => boolean
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

const connections = new Map<string, ManagedConnection>()

function buildUrl(endpoint: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  let url = endpoint.startsWith('ws') ? endpoint : `${protocol}//${host}/api${endpoint}`
  const apiKey = getApiKey()
  if (apiKey) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}api_key=${encodeURIComponent(apiKey)}`
  }
  return url
}

function createConnection(endpoint: string) {
  const conn = connections.get(endpoint)
  if (!conn) return

  if (conn.ws) {
    conn.ws.close()
  }
  if (conn.heartbeatTimer) {
    clearInterval(conn.heartbeatTimer)
    conn.heartbeatTimer = null
  }
  if (conn.disconnectTimer) {
    clearTimeout(conn.disconnectTimer)
    conn.disconnectTimer = null
  }

  const url = buildUrl(endpoint)
  const ws = new WebSocket(url)
  conn.ws = ws

  ws.onopen = () => {
    conn.connected = true
    conn.retryCount = 0
    conn.lastActivity = Date.now()
    conn.heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && Date.now() - conn.lastActivity > HEARTBEAT_INTERVAL / 2) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, HEARTBEAT_INTERVAL)
    if (conn.pendingMessages.length > 0) {
      for (const msg of conn.pendingMessages.splice(0)) {
        ws.send(msg)
      }
    }
  }

  ws.onmessage = (event) => {
    conn.lastActivity = Date.now()
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return }
      if (data.type === 'pong') return
      conn.subscribers.forEach((handler) => {
        try { handler(data) } catch { /* handler error */ }
      })
    } catch { /* silent */ }
  }

  ws.onclose = () => {
    conn.connected = false
    if (conn.heartbeatTimer) {
      clearInterval(conn.heartbeatTimer)
      conn.heartbeatTimer = null
    }
    if (conn.retryCount < MAX_RETRIES) {
      const delay = Math.min(BASE_DELAY * Math.pow(2, conn.retryCount), 30000)
      const jitter = delay * (0.5 + Math.random() * 0.5)
      conn.retryCount++
      conn.retryTimer = setTimeout(() => createConnection(endpoint), jitter)
    }
  }

  ws.onerror = () => {
    conn.connected = false
  }
}

function ensureConnection(endpoint: string): ManagedConnection {
  let conn = connections.get(endpoint)
  if (!conn) {
    conn = {
      ws: null,
      connected: false,
      subscribers: new Set(),
      retryCount: 0,
      retryTimer: null,
      heartbeatTimer: null,
      disconnectTimer: null,
      pendingMessages: [],
      lastActivity: 0,
    }
    connections.set(endpoint, conn)
    createConnection(endpoint)
  }
  return conn
}

function scheduleDisconnect(endpoint: string) {
  const conn = connections.get(endpoint)
  if (!conn) return
  if (conn.disconnectTimer) clearTimeout(conn.disconnectTimer)
  conn.disconnectTimer = setTimeout(() => {
    if (conn.subscribers.size === 0) {
      if (conn.heartbeatTimer) clearInterval(conn.heartbeatTimer)
      if (conn.retryTimer) clearTimeout(conn.retryTimer)
      if (conn.ws) conn.ws.close()
      connections.delete(endpoint)
    }
  }, 5000)
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const anyConnected = Array.from(connections.values()).some((c) => c.connected)
      setConnected(anyConnected)
    }, 2000)
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
    }
  }, [])

  const subscribe = useCallback((endpoint: string, handler: (data: any) => void) => {
    const conn = ensureConnection(endpoint)
    conn.subscribers.add(handler)
    if (conn.disconnectTimer) {
      clearTimeout(conn.disconnectTimer)
      conn.disconnectTimer = null
    }
    return () => {
      conn.subscribers.delete(handler)
      if (conn.subscribers.size === 0) {
        scheduleDisconnect(endpoint)
      }
    }
  }, [])

  const send = useCallback((endpoint: string, data: unknown) => {
    const conn = connections.get(endpoint)
    if (conn?.ws?.readyState === WebSocket.OPEN) {
      conn.ws.send(typeof data === 'string' ? data : JSON.stringify(data))
      return
    }
    if (conn) {
      const msg = typeof data === 'string' ? data : JSON.stringify(data)
      conn.pendingMessages.push(msg)
      if (conn.pendingMessages.length > 50) {
        conn.pendingMessages.shift()
      }
    }
  }, [])

  const getConnected = useCallback((endpoint: string) => {
    return connections.get(endpoint)?.connected ?? false
  }, [])

  return (
    <WebSocketContext.Provider value={{ subscribe, send, connected, getConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketProvider() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocketProvider must be used within WebSocketProvider')
  return ctx
}
