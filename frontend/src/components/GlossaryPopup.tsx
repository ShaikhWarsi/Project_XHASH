import { useState, useRef, useEffect } from 'react'
import { getGlossaryEntry, searchGlossary, type GlossaryEntry } from '../data/glossary'

interface Props {
  children: React.ReactNode
  term: string
  position?: 'top' | 'bottom'
}

export default function GlossaryPopup({ children, term, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false)
  const [entry, setEntry] = useState<GlossaryEntry | null>(null)
  const [searchResults, setSearchResults] = useState<GlossaryEntry[]>([])
  const popupRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  const handleMouseEnter = () => {
    timerRef.current = window.setTimeout(() => {
      const found = getGlossaryEntry(term)
      if (found) {
        setEntry(found)
        setSearchResults([])
      } else {
        setEntry(null)
        setSearchResults(searchGlossary(term))
      }
      setVisible(true)
    }, 400)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const content = entry || searchResults[0]

  return (
    <span
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderBottom: '1px dashed var(--accent-blue, #3b82f6)',
        cursor: 'help',
        color: 'var(--accent-blue, #3b82f6)',
        display: 'inline',
      }}
    >
      {children}
      {visible && content && (
        <div
          ref={popupRef}
          style={{
            position: 'absolute',
            zIndex: 10000,
            [position]: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 260,
            background: 'var(--bg-card, #0d1117)',
            border: '1px solid var(--border-color, #1a2332)',
            borderRadius: 6,
            padding: 8,
            marginTop: position === 'bottom' ? 4 : undefined,
            marginBottom: position === 'top' ? 4 : undefined,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 10, marginBottom: 3 }}>
            {content.term}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 8, lineHeight: 1.4, marginBottom: 4 }}>
            {content.definition}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7 }}>
            <span style={{
              padding: '1px 4px', borderRadius: 2,
              background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
            }}>
              {content.category}
            </span>
            {content.related && content.related.length > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                Related: {content.related.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </span>
  )
}
