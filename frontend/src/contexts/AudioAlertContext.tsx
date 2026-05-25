import { createContext, useContext, type ReactNode } from 'react'
import { useAudioAlert, type AlertSound } from '../hooks/useAudioAlert'

interface AudioAlertContextType {
  play: (sound: AlertSound) => void
  playSuccess: () => void
  playError: () => void
  playAlert: () => void
  playNotification: () => void
}

const AudioAlertContext = createContext<AudioAlertContextType | null>(null)

export function AudioAlertProvider({ children }: { children: ReactNode }) {
  const audio = useAudioAlert()
  return (
    <AudioAlertContext.Provider value={audio}>
      {children}
    </AudioAlertContext.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioAlertContext)
  if (!ctx) throw new Error('useAudio must be used within AudioAlertProvider')
  return ctx
}
