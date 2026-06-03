type EventHandler = (...args: unknown[]) => void

export interface EventBus {
  on(event: string, handler: EventHandler): () => void
  off(event: string, handler: EventHandler): void
  emit(event: string, ...data: unknown[]): void
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<EventHandler>>()

  return {
    on(event: string, handler: EventHandler) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
      return () => { handlers.get(event)?.delete(handler) }
    },

    off(event: string, handler: EventHandler) {
      handlers.get(event)?.delete(handler)
    },

    emit(event: string, ...data: unknown[]) {
      if (import.meta.env.DEV) {
        console.debug(`[EventBus] ${event}`, data)
      }
      handlers.get(event)?.forEach((h) => {
        try { h(...data) } catch { /* handler error */ }
      })
    },
  }
}

export const globalEventBus = createEventBus()
