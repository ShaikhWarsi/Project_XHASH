import { useState, useCallback, type ReactNode } from 'react'

interface PriceDragPayload {
  symbol: string
  price: number
  source?: string
}

interface PriceDragTargetProps {
  onDrop: (payload: PriceDragPayload) => void
  children: ReactNode
}

export function extractPriceFromDrag(e: React.DragEvent): PriceDragPayload | null {
  try {
    const raw = e.dataTransfer.getData('application/x-price-level')
    if (raw) return JSON.parse(raw) as PriceDragPayload
  } catch {}
  return null
}

export function makePriceDraggable(e: React.DragEvent, symbol: string, price: number, source?: string) {
  e.dataTransfer.setData('application/x-price-level', JSON.stringify({ symbol, price, source: source ?? '' }))
  e.dataTransfer.effectAllowed = 'copy'
}

export default function PriceDragTarget({ onDrop, children }: PriceDragTargetProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    const payload = extractPriceFromDrag(e)
    if (payload) onDrop(payload)
  }, [onDrop])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: 'inline-flex',
        position: 'relative',
        transition: 'all 0.15s',
        ...(isOver ? {
          outline: '2px dashed var(--accent-red)',
          outlineOffset: 2,
          borderRadius: 4,
        } : {}),
      }}
    >
      {isOver && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 8,
            color: 'var(--accent-red)',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-card)',
            padding: '1px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            marginBottom: 2,
          }}
        >
          Drop to create alert
        </div>
      )}
      {children}
    </div>
  )
}
