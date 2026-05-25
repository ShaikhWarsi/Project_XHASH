import { useState, useCallback } from 'react'
import { MessageSquare, X, CornerUpRight, Pin, PinOff } from 'lucide-react'

export interface ChartAnnotation {
  id: string
  time: string | number
  text: string
  color: string
  createdAt: string
  pinned?: boolean
  replyTo?: string
}

interface ChartAnnotationsProps {
  annotations: ChartAnnotation[]
  onAdd: (annotation: Omit<ChartAnnotation, 'id' | 'createdAt'>) => void
  onRemove: (id: string) => void
  onPin?: (id: string, pinned: boolean) => void
  currentTime?: string | number
}

const COLORS = ['var(--accent-cyan)', 'var(--accent-green)', 'var(--accent-yellow)', 'var(--accent-purple)', 'var(--accent-orange)']

export default function ChartAnnotations({ annotations, onAdd, onRemove, onPin, currentTime }: ChartAnnotationsProps) {
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const handleAdd = useCallback(() => {
    if (!text.trim() || !currentTime) return
    onAdd({ time: currentTime, text: text.trim(), color: selectedColor, replyTo: replyTo || undefined })
    setText('')
    setReplyTo(null)
  }, [text, selectedColor, currentTime, onAdd, replyTo])

  const startReply = useCallback((id: string) => {
    setReplyTo(id)
    setShowForm(true)
  }, [])

  const pinnedAnns = annotations.filter((a) => a.pinned && !a.replyTo)
  const regularAnns = annotations.filter((a) => !a.pinned && !a.replyTo)
  const replies = (parentId: string) => annotations.filter((a) => a.replyTo === parentId)

  const renderAnnotation = (a: ChartAnnotation, isReply = false) => (
    <div
      key={a.id}
      className="group"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
        padding: '3px 4px',
        borderLeft: `2px solid ${a.color}`,
        marginBottom: 2,
        marginLeft: isReply ? 12 : 0,
        background: a.pinned ? `color-mix(in srgb, ${a.color} 8%, transparent)` : 'var(--bg-hover)',
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-secondary)',
          lineHeight: 1.3,
        }}
      >
        {a.text}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isReply && (
          <button
            onClick={() => startReply(a.id)}
            className="cursor-pointer bg-none border-none p-0.5"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}
            title="Reply"
          >
            <CornerUpRight size={10} />
          </button>
        )}
        {onPin && !isReply && (
          <button
            onClick={() => onPin(a.id, !a.pinned)}
            className="cursor-pointer bg-none border-none p-0.5"
            style={{ color: a.pinned ? 'var(--accent-yellow)' : 'var(--text-muted)', background: 'none', border: 'none' }}
            title={a.pinned ? 'Unpin' : 'Pin'}
          >
            {a.pinned ? <PinOff size={10} /> : <Pin size={10} />}
          </button>
        )}
        <button
          onClick={() => onRemove(a.id)}
          className="cursor-pointer bg-none border-none p-0.5"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none' }}
          title="Remove"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 40 }}>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: 8,
          minWidth: 260,
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notes ({annotations.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowAll(!showAll); setReplyTo(null) }}
              className="cursor-pointer bg-none border-none text-[9px] font-mono px-1"
              style={{ color: showAll ? 'var(--accent-blue)' : 'var(--text-muted)', background: 'none', border: 'none' }}
            >
              {showAll ? 'Collapse' : 'Threads'}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); if (!showForm) setReplyTo(null) }}
              className="cursor-pointer bg-none border-none p-0.5"
              style={{
                background: showForm ? 'rgba(59,130,246,0.15)' : 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <MessageSquare size={12} />
            </button>
          </div>
        </div>

        {showForm && (
          <div style={{ marginBottom: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {replyTo && (
              <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <CornerUpRight size={10} />
                Replying to annotation
                <button
                  onClick={() => setReplyTo(null)}
                  className="cursor-pointer bg-none border-none ml-auto"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: 0 }}
                >
                  <X size={10} />
                </button>
              </div>
            )}
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Write a reply...' : 'Annotation text...'}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 6px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: selectedColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!text.trim()}
                style={{
                  background: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 10px',
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  opacity: text.trim() ? 1 : 0.5,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {replyTo ? 'REPLY' : 'ADD'}
              </button>
            </div>
          </div>
        )}

        {pinnedAnns.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <div className="text-[8px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--accent-yellow)' }}>
              Pinned
            </div>
            {pinnedAnns.map((a) => renderAnnotation(a))}
          </div>
        )}

        {annotations.length === 0 && !showForm && (
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)', textAlign: 'center', padding: 4 }}>
            No annotations — click + to add
          </div>
        )}

        {showAll
          ? annotations.filter((a) => !a.pinned).map((a) => {
              const childReplies = replies(a.id)
              return (
                <div key={a.id}>
                  {renderAnnotation(a)}
                  {childReplies.map((r) => renderAnnotation(r, true))}
                </div>
              )
            })
          : regularAnns.slice(0, 5).map((a) => {
              const childReplies = replies(a.id)
              const visible = a === regularAnns[0] || !childReplies.length || true
              return (
                <div key={a.id}>
                  {renderAnnotation(a)}
                  {childReplies.slice(0, 2).map((r) => renderAnnotation(r, true))}
                  {childReplies.length > 2 && (
                    <div className="text-[9px] font-mono ml-3" style={{ color: 'var(--text-muted)' }}>
                      +{childReplies.length - 2} more replies
                    </div>
                  )}
                </div>
              )
            })}

        {regularAnns.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center text-[9px] font-mono cursor-pointer mt-1"
            style={{ color: 'var(--accent-blue)', background: 'none', border: 'none', padding: '2px 0' }}
          >
            +{regularAnns.length - 5} more
          </button>
        )}
      </div>
    </div>
  )
}
