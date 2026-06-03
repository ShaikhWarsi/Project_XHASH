import { useState, useCallback, type ReactNode } from 'react'
import { extractSymbolFromDrag } from './SymbolDragContext'

export type DropZoneKind = 'chart' | 'order' | 'compare' | 'widget'

interface DropZoneProps {
  kind: DropZoneKind
  onDrop: (symbol: string) => void
  children: ReactNode
  label?: string
  className?: string
  disabled?: boolean
}

export default function DropZone({ kind, onDrop, children, label, className, disabled }: DropZoneProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)
    if (disabled) return
    const symbol = extractSymbolFromDrag(e)
    if (symbol) onDrop(symbol)
  }, [disabled, onDrop])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={className}
      data-drop-zone={kind}
      style={{
        position: 'relative',
        transition: 'border-color 0.15s, background 0.15s',
        ...(isOver && !disabled ? {
          borderColor: 'var(--accent-blue)',
          borderStyle: 'dashed',
          background: 'rgba(59,130,246,0.08)',
        } : {}),
      }}
    >
      {label && isOver && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: 4,
            fontSize: 8,
            color: 'var(--accent-blue)',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-card)',
            padding: '0 4px',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          Drop symbol to {label}
        </div>
      )}
      {children}
    </div>
  )
}
