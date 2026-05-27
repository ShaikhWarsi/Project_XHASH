import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type InterfaceMode = 'terminal' | 'chat'

interface InterfaceModeContextType {
  mode: InterfaceMode
  setMode: (m: InterfaceMode) => void
  toggleMode: () => void
}

const InterfaceModeContext = createContext<InterfaceModeContextType | null>(null)

export function InterfaceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<InterfaceMode>('terminal')

  const setMode = useCallback((m: InterfaceMode) => setModeState(m), [])
  const toggleMode = useCallback(() => setModeState((prev) => prev === 'terminal' ? 'chat' : 'terminal'), [])

  return (
    <InterfaceModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </InterfaceModeContext.Provider>
  )
}

export function useInterfaceMode() {
  const ctx = useContext(InterfaceModeContext)
  if (!ctx) throw new Error('useInterfaceMode must be used within InterfaceModeProvider')
  return ctx
}
