import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface DistractionFreeContextType {
  distractionFree: boolean
  setDistractionFree: (v: boolean) => void
  toggleDistractionFree: () => void
}

const DistractionFreeContext = createContext<DistractionFreeContextType | null>(null)

const STORAGE_KEY = 'te_distraction_free'

function getStored(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true' }
  catch { return false }
}

function store(v: boolean) {
  try { localStorage.setItem(STORAGE_KEY, String(v)) }
  catch {}
}

export function DistractionFreeProvider({ children }: { children: ReactNode }) {
  const [distractionFree, setDistractionFreeState] = useState(getStored)

  const setDistractionFree = useCallback((v: boolean) => {
    setDistractionFreeState(v)
    store(v)
  }, [])

  const toggleDistractionFree = useCallback(() => {
    setDistractionFreeState((prev) => {
      const next = !prev
      store(next)
      return next
    })
  }, [])

  return (
    <DistractionFreeContext.Provider value={{ distractionFree, setDistractionFree, toggleDistractionFree }}>
      {children}
    </DistractionFreeContext.Provider>
  )
}

export function useDistractionFree(): DistractionFreeContextType {
  const ctx = useContext(DistractionFreeContext)
  if (!ctx) throw new Error('useDistractionFree must be used within DistractionFreeProvider')
  return ctx
}
