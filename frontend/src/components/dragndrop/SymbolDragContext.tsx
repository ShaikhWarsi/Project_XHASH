import { createContext, useContext, useCallback, type ReactNode } from 'react'

export interface DraggableSymbolPayload {
  symbol: string
  source?: string
}

type DropZoneKind = 'chart' | 'order' | 'compare' | 'widget'

type DropHandler = (payload: DraggableSymbolPayload) => void

interface SymbolDragContextType {
  registerDropZone: (kind: DropZoneKind, handler: DropHandler) => void
  unregisterDropZone: (kind: DropZoneKind) => void
  getHandler: (kind: DropZoneKind) => DropHandler | null
}

const handlers = new Map<DropZoneKind, DropHandler>()

const SymbolDragContext = createContext<SymbolDragContextType>({
  registerDropZone: (kind, handler) => { handlers.set(kind, handler) },
  unregisterDropZone: (kind) => { handlers.delete(kind) },
  getHandler: (kind) => handlers.get(kind) ?? null,
})

export function SymbolDragProvider({ children }: { children: ReactNode }) {
  const registerDropZone = useCallback((kind: DropZoneKind, handler: DropHandler) => {
    handlers.set(kind, handler)
  }, [])

  const unregisterDropZone = useCallback((kind: DropZoneKind) => {
    handlers.delete(kind)
  }, [])

  const getHandler = useCallback((kind: DropZoneKind) => {
    return handlers.get(kind) ?? null
  }, [])

  return (
    <SymbolDragContext.Provider value={{ registerDropZone, unregisterDropZone, getHandler }}>
      {children}
    </SymbolDragContext.Provider>
  )
}

export function useSymbolDrag(): SymbolDragContextType {
  return useContext(SymbolDragContext)
}

export function makeSymbolDraggable(e: React.DragEvent, symbol: string, source?: string) {
  e.dataTransfer.setData('text/plain', symbol)
  e.dataTransfer.setData('application/x-symbol', JSON.stringify({ symbol, source: source ?? '' }))
  e.dataTransfer.effectAllowed = 'copy'
}

export function extractSymbolFromDrag(e: React.DragEvent): string | null {
  try {
    const raw = e.dataTransfer.getData('application/x-symbol')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.symbol ?? null
    }
  } catch {}
  const plain = e.dataTransfer.getData('text/plain')
  if (plain && plain.length <= 10) return plain
  return null
}
