import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'

type EventHandler = (...args: unknown[]) => void

interface EventBus {
  on: (event: string, handler: EventHandler) => () => void
  emit: (event: string, ...args: unknown[]) => void
  off: (event: string, handler: EventHandler) => void
}

const EventBusContext = createContext<EventBus | null>(null)

export const EVENTS = {
  SIGNAL_SELECTED: 'signal:selected',
  SYMBOL_CHANGED: 'symbol:changed',
  REGIME_CHANGED: 'regime:changed',
  BACKTEST_COMPLETE: 'backtest:complete',
  ORDER_PLACED: 'order:placed',
  THEME_CHANGED: 'theme:changed',
  TAB_CHANGED: 'tab:changed',
  REFRESH_REQUESTED: 'refresh:requested',
} as const

export function EventBusProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())

  const on = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)
    return () => { handlersRef.current.get(event)?.delete(handler) }
  }, [])

  const emit = useCallback((event: string, ...args: unknown[]) => {
    handlersRef.current.get(event)?.forEach((handler) => {
      try { handler(...args) } catch { /* silent */ }
    })
  }, [])

  const off = useCallback((event: string, handler: EventHandler) => {
    handlersRef.current.get(event)?.delete(handler)
  }, [])

  return (
    <EventBusContext.Provider value={{ on, emit, off }}>
      {children}
    </EventBusContext.Provider>
  )
}

export function useEventBus() {
  const ctx = useContext(EventBusContext)
  if (!ctx) throw new Error('useEventBus must be used within EventBusProvider')
  return ctx
}
