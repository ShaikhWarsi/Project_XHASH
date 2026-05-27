import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  shortcut?: string
  onClick?: () => void
  divider?: boolean
  disabled?: boolean
  danger?: boolean
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
  id: string
}

export default function ContextMenu({ items, position, onClose, id }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [adjustedPos, setAdjustedPos] = useState(position)
  const [submenu, setSubmenu] = useState<{
    items: ContextMenuItem[]
    position: { x: number; y: number }
  } | null>(null)
  const [adjustedSubPos, setAdjustedSubPos] = useState<{
    x: number
    y: number
  } | null>(null)

  const focusableIndices = useCallback(() => {
    return items.reduce<number[]>((acc, item, i) => {
      if (!item.divider && !item.disabled) acc.push(i)
      return acc
    }, [])
  }, [items])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (submenu) {
          setSubmenu(null)
        } else {
          onClose()
        }
        return
      }

      const focusable = focusableIndices()
      if (focusable.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const idx = focusable.indexOf(highlightedIndex)
        setHighlightedIndex(focusable[(idx + 1) % focusable.length])
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = focusable.indexOf(highlightedIndex)
        setHighlightedIndex(focusable[(idx - 1 + focusable.length) % focusable.length])
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        const item = items[highlightedIndex]
        if (item && !item.disabled && !item.divider && !item.submenu) {
          item.onClick?.()
          onClose()
        }
      } else if (e.key === 'ArrowRight' && highlightedIndex >= 0) {
        e.preventDefault()
        const item = items[highlightedIndex]
        if (item?.submenu && !item.disabled && menuRef.current) {
          const el = menuRef.current.children[highlightedIndex] as HTMLElement
          if (el) {
            const rect = el.getBoundingClientRect()
            setSubmenu({
              items: item.submenu,
              position: { x: rect.right, y: rect.top },
            })
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSubmenu(null)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-context-menu]')) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleClickOutside, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [items, highlightedIndex, focusableIndices, onClose, submenu])

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const { innerWidth, innerHeight } = window
    let x = position.x
    let y = position.y
    if (x + rect.width > innerWidth - 8) x = Math.max(8, innerWidth - rect.width - 8)
    if (y + rect.height > innerHeight - 8) y = Math.max(8, innerHeight - rect.height - 8)
    setAdjustedPos({ x, y })
  }, [position])

  useEffect(() => {
    if (!submenu || !submenuRef.current) {
      setAdjustedSubPos(null)
      return
    }
    const rect = submenuRef.current.getBoundingClientRect()
    const { innerWidth, innerHeight } = window
    let x = submenu.position.x
    let y = submenu.position.y
    if (x + rect.width > innerWidth - 8) x = Math.max(8, submenu.position.x - rect.width)
    if (y + rect.height > innerHeight - 8) y = Math.max(8, innerHeight - rect.height - 8)
    setAdjustedSubPos({ x, y })
  }, [submenu])

  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled || item.divider || item.submenu) return
      item.onClick?.()
      onClose()
    },
    [onClose],
  )

  const handleItemMouseEnter = useCallback(
    (e: React.MouseEvent, item: ContextMenuItem) => {
      if (item.submenu && item.submenu.length > 0) {
        const rect = e.currentTarget.getBoundingClientRect()
        setSubmenu({
          items: item.submenu,
          position: { x: rect.right, y: rect.top },
        })
      }
    },
    [],
  )

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      data-context-menu
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 9999,
        minWidth: 160,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        boxShadow: 'var(--shadow-lg)',
        padding: '2px 0',
        maxHeight: 320,
        overflowY: 'auto',
        overflowX: 'visible',
      }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return (
            <div
              key={`${id}-div-${i}`}
              style={{
                height: 1,
                background: 'var(--border-color)',
                margin: '2px 0',
              }}
            />
          )
        }

        const isHighlighted = highlightedIndex === i
        const isDisabled = item.disabled
        const isDanger = item.danger
        const hasSubmenu = item.submenu && item.submenu.length > 0

        return (
          <div
            key={`${id}-item-${i}`}
            onMouseEnter={(e) => {
              setHighlightedIndex(i)
              handleItemMouseEnter(e, item)
            }}
            onClick={() => handleItemClick(item)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              height: 22,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: isDisabled ? 'default' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              background:
                isHighlighted && !isDisabled
                  ? isDanger
                    ? 'rgba(239,68,68,0.15)'
                    : 'var(--bg-hover)'
                  : 'transparent',
              color: isDanger ? 'var(--accent-red)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
              gap: 6,
              userSelect: 'none',
            }}
          >
            {item.icon && (
              <span
                style={{
                  width: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                {item.icon}
              </span>
            )}
            <span
              style={{
                flex: 1,
                lineHeight: '22px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </span>
            {item.shortcut && (
              <span
                style={{
                  color: 'var(--text-muted)',
                  marginLeft: 16,
                  lineHeight: '22px',
                  fontSize: 9,
                }}
              >
                {item.shortcut}
              </span>
            )}
            {hasSubmenu && (
              <span
                style={{
                  color: 'var(--text-muted)',
                  marginLeft: 6,
                  lineHeight: '22px',
                }}
              >
                &gt;
              </span>
            )}
          </div>
        )
      })}

      {submenu && adjustedSubPos && (
        <div
          ref={submenuRef}
          data-context-menu
          style={{
            position: 'fixed',
            left: adjustedSubPos.x,
            top: adjustedSubPos.y,
            zIndex: 10000,
            minWidth: 140,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            boxShadow: 'var(--shadow-lg)',
            padding: '2px 0',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {submenu.items.map((item, i) => (
            <div
              key={`${id}-sub-${i}`}
              onClick={() => handleItemClick(item)}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.background = item.danger
                  ? 'rgba(239,68,68,0.15)'
                  : 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                height: 22,
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: item.disabled ? 'default' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
                color: item.danger
                  ? 'var(--accent-red)'
                  : 'var(--text-primary)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                lineHeight: '22px',
              }}
            >
              {item.icon && (
                <span
                  style={{
                    width: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  {item.icon}
                </span>
              )}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span
                  style={{
                    color: 'var(--text-muted)',
                    marginLeft: 16,
                    fontSize: 9,
                  }}
                >
                  {item.shortcut}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
