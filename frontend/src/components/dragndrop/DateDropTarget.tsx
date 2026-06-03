import { useState, useCallback, type ReactNode } from 'react'

interface DateDragPayload {
  date: string
  source?: string
}

interface DateDropTargetProps {
  onDrop: (payload: DateDragPayload) => void
  children: ReactNode
  label?: string
}

export function extractDateFromDrag(e: React.DragEvent): DateDragPayload | null {
  try {
    const raw = e.dataTransfer.getData('application/x-date')
    if (raw) return JSON.parse(raw) as DateDragPayload
  } catch {}
  return null
}

export function makeDateDraggable(e: React.DragEvent, date: string, source?: string) {
  e.dataTransfer.setData('application/x-date', JSON.stringify({ date, source: source ?? '' }))
  e.dataTransfer.effectAllowed = 'copy'
}

export default function DateDropTarget({ onDrop, children, label }: DateDropTargetProps) {
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
    const payload = extractDateFromDrag(e)
    if (payload) onDrop(payload)
  }, [onDrop])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        transition: 'all 0.15s',
        ...(isOver ? {
          outline: '2px dashed var(--accent-cyan)',
          outlineOffset: 2,
          background: 'rgba(6,182,212,0.08)',
          borderRadius: 4,
        } : {}),
      }}
    >
      {label && isOver && (
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: 4,
            fontSize: 8,
            color: 'var(--accent-cyan)',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-card)',
            padding: '0 4px',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}
