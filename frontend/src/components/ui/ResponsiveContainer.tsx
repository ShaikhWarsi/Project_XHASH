import { type ReactNode, type CSSProperties } from 'react'
import { useBreakpoint } from '../../hooks/useBreakpoint'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  as?: 'div' | 'main' | 'section'
}

export default function ResponsiveContainer({
  children, className = '', style, as: Tag = 'div',
}: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useBreakpoint()
  const pad = isMobile ? '8px' : isTablet ? '12px' : '16px'

  return (
    <Tag
      className={className}
      style={{
        padding: pad,
        width: '100%',
        maxWidth: isMobile ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

export function MobileOnly({ children }: { children: ReactNode }) {
  const { isMobile } = useBreakpoint()
  if (!isMobile) return null
  return <>{children}</>
}

export function DesktopOnly({ children }: { children: ReactNode }) {
  const { isDesktop } = useBreakpoint()
  if (!isDesktop) return null
  return <>{children}</>
}
