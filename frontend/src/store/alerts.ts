import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { eventBus, EVENTS } from '../utils/eventBus'

interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: string
  read: boolean
}

interface AlertState {
  alerts: Alert[]
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => void
  markRead: (id: string) => void
  clearAll: () => void
  unreadCount: number
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      addAlert: (alert) => {
        const id = `alert-${Date.now()}`
        set((s) => ({
          alerts: [{ ...alert, id, timestamp: new Date().toISOString(), read: false }, ...s.alerts].slice(0, 100),
        }))
        eventBus.emit(EVENTS.REFRESH_REQUESTED, { id, ...alert })
      },
      markRead: (id) => set((s) => ({
        alerts: s.alerts.map((a) => a.id === id ? { ...a, read: true } : a),
      })),
      clearAll: () => set({ alerts: [] }),
      get unreadCount() { return get().alerts.filter((a) => !a.read).length },
    }),
    {
      name: 'te-alerts-storage',
      version: 1,
      migrate: (state: unknown) => state as Partial<AlertState>,
    },
  ),
)
