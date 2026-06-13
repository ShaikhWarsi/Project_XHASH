import { useState, type DragEvent } from 'react'
import { GripVertical } from 'lucide-react'
import { NODE_DEFINITIONS, type NodeCategory, type NodeDefinition } from '../../../types/flow'

const TABS: { key: NodeCategory; label: string }[] = [
  { key: 'trigger', label: 'Trigger' },
  { key: 'action', label: 'Action' },
  { key: 'data', label: 'Data' },
  { key: 'condition', label: 'Logic' },
  { key: 'utility', label: 'Utility' },
]

export default function NodePalette() {
  const [tab, setTab] = useState<NodeCategory>('trigger')

  const filtered = NODE_DEFINITIONS.filter((d) => d.category === tab)

  const onDragStart = (e: DragEvent, def: NodeDefinition) => {
    e.dataTransfer.setData('application/reactflow', def.type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="rounded-sm flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        width: 180,
        maxHeight: '60vh',
      }}
    >
      <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 text-[8px] uppercase tracking-wider py-1.5 font-mono outline-none transition-colors"
            style={{
              background: tab === t.key ? 'var(--accent-cyan)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col overflow-y-auto p-1">
        {filtered.map((def) => (
          <div
            key={def.type}
            draggable
            onDragStart={(e) => onDragStart(e, def)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm cursor-grab text-[9px] font-mono transition-colors hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
          >
            <GripVertical size={10} style={{ color: 'var(--text-muted)' }} />
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: def.color }}
            />
            {def.label}
          </div>
        ))}
      </div>
    </div>
  )
}
