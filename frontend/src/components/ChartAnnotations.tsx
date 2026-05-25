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
      className="group flex items-start gap-1 px-1 py-0.5 mb-0.5"
      style={{
        borderLeft: `2px solid ${a.color}`,
        marginLeft: isReply ? 12 : 0,
        background: a.pinned ? `color-mix(in srgb, ${a.color} 8%, transparent)` : 'var(--bg-hover)',
      }}
    >
      <span className="flex-1 text-[10px] font-mono-data text-secondary leading-tight">
        {a.text}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isReply && (
          <button
            onClick={() => startReply(a.id)}
            className="cursor-pointer bg-transparent border-none p-0.5 text-muted"
            title="Reply"
          >
            <CornerUpRight size={10} />
          </button>
        )}
        {onPin && !isReply && (
          <button
            onClick={() => onPin(a.id, !a.pinned)}
            className="cursor-pointer bg-transparent border-none p-0.5"
            style={{ color: a.pinned ? 'var(--accent-yellow)' : 'var(--text-muted)' }}
            title={a.pinned ? 'Unpin' : 'Pin'}
          >
            {a.pinned ? <PinOff size={10} /> : <Pin size={10} />}
          </button>
        )}
        <button
          onClick={() => onRemove(a.id)}
          className="cursor-pointer bg-transparent border-none p-0.5 text-muted"
          title="Remove"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="absolute bottom-full right-0 z-40">
      <div className="bg-card border border-default rounded-md p-2 min-w-[260px] max-h-[400px] overflow-y-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-mono-data text-muted uppercase tracking-wider">
            Notes ({annotations.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowAll(!showAll); setReplyTo(null) }}
              className="cursor-pointer bg-transparent border-none text-[9px] font-mono px-1"
              style={{ color: showAll ? 'var(--accent-blue)' : 'var(--text-muted)' }}
            >
              {showAll ? 'Collapse' : 'Threads'}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); if (!showForm) setReplyTo(null) }}
              className="cursor-pointer border-none p-0.5 text-accent-blue"
              style={{ background: showForm ? 'rgba(59,130,246,0.15)' : 'transparent' }}
            >
              <MessageSquare size={12} />
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-1.5 flex flex-col gap-1">
            {replyTo && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-muted">
                <CornerUpRight size={10} />
                Replying to annotation
                <button
                  onClick={() => setReplyTo(null)}
                  className="cursor-pointer bg-transparent border-none ml-auto p-0 text-muted"
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
              className="w-full bg-input border border-input text-primary text-[10px] font-mono-data px-1.5 py-0.5 outline-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-0.5">
                {COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className="w-3 h-3 rounded-full cursor-pointer"
                    style={{ background: c, border: selectedColor === c ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!text.trim()}
                className="text-white border-none px-2 py-0.5 text-[9px] font-mono-data rounded-sm"
                style={{
                  background: 'var(--accent-blue)',
                  cursor: text.trim() ? 'pointer' : 'not-allowed',
                  opacity: text.trim() ? 1 : 0.5,
                }}
              >
                {replyTo ? 'REPLY' : 'ADD'}
              </button>
            </div>
          </div>
        )}

        {pinnedAnns.length > 0 && (
          <div className="mb-1">
            <div className="text-[8px] font-mono uppercase tracking-wider mb-1 text-accent-yellow">
              Pinned
            </div>
            {pinnedAnns.map((a) => renderAnnotation(a))}
          </div>
        )}

        {annotations.length === 0 && !showForm && (
          <div className="text-[9px] font-mono-data text-muted text-center p-1">
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
              return (
                <div key={a.id}>
                  {renderAnnotation(a)}
                  {childReplies.slice(0, 2).map((r) => renderAnnotation(r, true))}
                  {childReplies.length > 2 && (
                    <div className="text-[9px] font-mono ml-3 text-muted">
                      +{childReplies.length - 2} more replies
                    </div>
                  )}
                </div>
              )
            })}

        {regularAnns.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-center text-[9px] font-mono cursor-pointer mt-1 bg-transparent border-none text-accent-blue py-0.5"
          >
            +{regularAnns.length - 5} more
          </button>
        )}
      </div>
    </div>
  )
}
