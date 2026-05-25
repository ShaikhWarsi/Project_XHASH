import { useState, useCallback } from 'react'

interface BatchItem {
  id: string
  label: string
  selected?: boolean
}

interface BatchOperationsProps {
  items: BatchItem[]
  onSelectionChange: (ids: string[]) => void
  onBatchAction: (action: string, ids: string[]) => void
}

const btnBase: React.CSSProperties = {
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '5px 12px',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export default function BatchOperations({ items, onSelectionChange, onBatchAction }: BatchOperationsProps) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    items.forEach((item) => { if (item.selected) initial.add(item.id) })
    return initial
  })

  const notify = useCallback((next: Set<string>) => {
    onSelectionChange(Array.from(next))
  }, [onSelectionChange])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      notify(next)
      return next
    })
  }

  const selectAll = () => {
    const next = new Set(items.map((i) => i.id))
    setSelected(next)
    notify(next)
  }

  const deselectAll = () => {
    const next = new Set<string>()
    setSelected(next)
    notify(next)
  }

  const batchAction = (action: string) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    onBatchAction(action, ids)
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={selectAll} style={{ ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            Select All
          </button>
          <button onClick={deselectAll} style={{ ...btnBase, background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            Deselect All
          </button>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
          {selected.size} / {items.length} selected
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }}>
        {items.map((item) => (
          <label
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: selected.has(item.id) ? 'var(--bg-hover)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (!selected.has(item.id)) e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { if (!selected.has(item.id)) e.currentTarget.style.background = 'transparent' }}
          >
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--text-primary)', fontSize: 11, flex: 1 }}>
              {item.label}
            </span>
            {item.selected !== undefined && (
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>
                {item.selected ? 'active' : 'inactive'}
              </span>
            )}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          onClick={() => batchAction('cancel')}
          disabled={selected.size === 0}
          style={{
            ...btnBase,
            background: selected.size === 0 ? 'var(--bg-hover)' : 'var(--accent-red)',
            color: selected.size === 0 ? 'var(--text-muted)' : '#fff',
            opacity: selected.size === 0 ? 0.4 : 1,
            flex: 1,
          }}
        >
          Cancel Selected ({selected.size})
        </button>
        <button
          onClick={() => batchAction('modify')}
          disabled={selected.size === 0}
          style={{
            ...btnBase,
            background: selected.size === 0 ? 'var(--bg-hover)' : 'var(--accent-cyan)',
            color: selected.size === 0 ? 'var(--text-muted)' : '#000',
            opacity: selected.size === 0 ? 0.4 : 1,
            flex: 1,
          }}
        >
          Modify Selected ({selected.size})
        </button>
      </div>
    </div>
  )
}
