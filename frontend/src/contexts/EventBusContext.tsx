import { createContext, useContext, type ReactNode } from 'react'
import { eventBus as singleton, EVENTS } from '../utils/eventBus'

export { EVENTS }
export type EventHandler = (...args: unknown[]) => void

const EventBusContext = createContext<typeof singleton | null>(null)

export function EventBusProvider({ children }: { children: ReactNode }) {
  return (
    <EventBusContext.Provider value={singleton}>
      {children}
    </EventBusContext.Provider>
  )
}

export function useEventBus() {
  const ctx = useContext(EventBusContext)
  if (!ctx) throw new Error('useEventBus must be used within EventBusProvider')
  return ctx
}
