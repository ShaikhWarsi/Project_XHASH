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
  const weakRefs = useRef<Map<EventHandler, WeakRef<EventHandler>>>(new Map())

  const sweep = useCallback(() => {
    handlersRef.current.forEach((handlers, event) => {
      handlers.forEach((h) => {
        const ref = weakRefs.current.get(h)
        if (ref && ref.deref() === undefined) {
          handlers.delete(h)
          weakRefs.current.delete(h)
          console.warn(`[EventBus] Stale handler detected and removed for event "${event}"`)
        }
      })
    })
  }, [])

  const on = useCallback((event: string, handler: EventHandler) => {
    sweep()
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)
    weakRefs.current.set(handler, new WeakRef(handler))
    return () => { handlersRef.current.get(event)?.delete(handler); weakRefs.current.delete(handler) }
  }, [sweep])

  const emit = useCallback((event: string, ...args: unknown[]) => {
    handlersRef.current.get(event)?.forEach((handler) => {
      try { handler(...args) } catch { /* silent */ }
    })
  }, [])

  const off = useCallback((event: string, handler: EventHandler) => {
    handlersRef.current.get(event)?.delete(handler)
    weakRefs.current.delete(handler)
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
