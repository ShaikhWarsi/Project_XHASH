import { useState, useCallback } from 'react'

const LS_KEY = 'favorite_pages'

interface StarButtonProps {
  pageId: string
  onToggle?: (pageId: string, starred: boolean) => void
}

function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setFavorites(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids))
}

export default function StarButton({ pageId, onToggle }: StarButtonProps) {
  const [starred, setStarred] = useState(() => getFavorites().includes(pageId))

  const handleClick = useCallback(() => {
    setStarred((prev) => {
      const next = !prev
      const favs = getFavorites()
      if (next) {
        if (!favs.includes(pageId)) setFavorites([...favs, pageId])
      } else {
        setFavorites(favs.filter((id) => id !== pageId))
      }
      onToggle?.(pageId, next)
      window.dispatchEvent(new CustomEvent('favorites-changed'))
      return next
    })
  }, [pageId, onToggle])

  return (
    <button
      onClick={handleClick}
      aria-label={starred ? 'Unstar page' : 'Star page'}
      title={starred ? 'Remove from favorites' : 'Add to favorites'}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        width: 16,
        height: 16,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: starred ? 'var(--accent-yellow)' : 'var(--text-muted)',
        transition: 'color 0.15s',
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      {starred ? '\u2605' : '\u2606'}
    </button>
  )
}
