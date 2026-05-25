interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  count?: number
  variant?: 'text' | 'rect' | 'circle'
  style?: React.CSSProperties
}

export default function Skeleton({
  className = '',
  width,
  height,
  count = 1,
  variant = 'text',
  style,
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    background: 'var(--bg-hover)',
    borderRadius: variant === 'circle' ? '50%' : '6px',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    width: width || (variant === 'circle' ? height || 40 : '100%'),
    height: height || (variant === 'text' ? 16 : 40),
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={className}
          style={{
            ...baseStyle,
            ...style,
            marginBottom: i < count - 1 ? 8 : 0,
          }}
        />
      ))}
    </>
  )
}
