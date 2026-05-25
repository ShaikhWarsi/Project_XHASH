import { forwardRef, useRef, useState, useEffect, useImperativeHandle, type ReactNode, type CSSProperties } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  className?: string
  style?: CSSProperties
  maxHeight?: number | string
  keyExtractor?: (item: T, index: number) => string | number
}

function VirtualListInner<T>(
  {
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    className,
    style,
    maxHeight = 300,
    keyExtractor = (_, i) => i,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(300)

  useImperativeHandle(ref, () => containerRef.current!, [containerRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    setContainerHeight(el.clientHeight || 300)
    return () => observer.disconnect()
  }, [])

  const handleScroll = () => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = items.length * itemHeight

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{ ...style, maxHeight, overflowY: 'auto', position: 'relative', willChange: 'scroll-position' }}
    >
      {items.length === 0 ? null : (
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item, i) => (
            <div
              key={keyExtractor(item, startIndex + i)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: itemHeight,
                transform: `translateY(${(startIndex + i) * itemHeight}px)`,
              }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof VirtualListInner>

export default VirtualList
