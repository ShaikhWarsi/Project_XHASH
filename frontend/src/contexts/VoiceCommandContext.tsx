import { createContext, useContext, useCallback } from 'react'
import { useVoiceCommands } from '../hooks/useVoiceCommands'

interface VoiceCommandContextValue {
  isListening: boolean
  error: string | null
  lastCommand: { command: string; action: string; confidence: number; timestamp: number } | null
  toggleListening: () => void
  onCommand: (handler: (cmd: any) => void) => void
}

const VoiceCommandContext = createContext<VoiceCommandContextValue | null>(null)

export function VoiceCommandProvider({ children }: { children: React.ReactNode }) {
  const {
    isListening, error, lastCommand, toggleListening, onCommand,
  } = useVoiceCommands({ enabled: false })

  return (
    <VoiceCommandContext.Provider value={{ isListening, error, lastCommand, toggleListening, onCommand }}>
      {children}
    </VoiceCommandContext.Provider>
  )
}

export function useVoiceCommandContext(): VoiceCommandContextValue {
  const ctx = useContext(VoiceCommandContext)
  if (!ctx) throw new Error('useVoiceCommandContext must be used within VoiceCommandProvider')
  return ctx
}
