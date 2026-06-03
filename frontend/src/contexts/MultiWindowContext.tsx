import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useMultiWindow } from '../hooks/useMultiWindow'
import type { SyncEvent } from '../utils/broadcastChannels'

interface MultiWindowContextType {
  broadcast: (type: SyncEvent['type'], payload?: Record<string, unknown>) => void
}

const MultiWindowContext = createContext<MultiWindowContextType>({
  broadcast: () => {},
})

export function MultiWindowProvider({ children }: { children: ReactNode }) {
  const { broadcast } = useMultiWindow()

  return (
    <MultiWindowContext.Provider value={{ broadcast }}>
      {children}
    </MultiWindowContext.Provider>
  )
}

export function useBroadcast(): MultiWindowContextType {
  return useContext(MultiWindowContext)
}
