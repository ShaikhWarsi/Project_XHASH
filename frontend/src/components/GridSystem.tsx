import type { ReactNode } from 'react'

interface GridSystemProps {
  cols?: 1 | 2 | 3 | 4
  gap?: number
  children: ReactNode
}

export default function GridSystem({ cols = 2, gap, children }: GridSystemProps) {
  return (
    <div
      className={`responsive-grid-cols-${cols}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: gap != null ? `${gap}px` : 'var(--space-3)',
      }}
    >
      {children}
    </div>
  )
}
