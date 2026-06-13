import type { ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getNodeDef } from './index'

interface BaseNodeWrapperProps {
  nodeProps: NodeProps
  children: ReactNode
  icon?: ReactNode
}

export default function BaseNode({ nodeProps, children, icon }: BaseNodeWrapperProps) {
  const def = getNodeDef(nodeProps.type)
  const color = def?.color || '#6b7280'

  return (
    <div
      className="rounded-sm text-[10px] font-mono"
      style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${nodeProps.selected ? color : 'var(--border-color)'}`,
        minWidth: 140,
        boxShadow: nodeProps.selected ? `0 0 0 1px ${color}` : 'none',
      }}
    >
      {def && def.inputs > 0 && (
        <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      )}

      <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {icon && <span>{icon}</span>}
        <span style={{ color, fontWeight: 600 }}>{def?.label || nodeProps.type}</span>
      </div>

      <div className="px-2 py-1.5">{children}</div>

      {def && def.outputs > 0 && (
        def.hasConditionalOutputs ? (
          <>
            <Handle type="source" position={Position.Bottom} id="true" style={{ background: '#22c55e', width: 8, height: 8, left: '30%' }} />
            <Handle type="source" position={Position.Bottom} id="false" style={{ background: '#ef4444', width: 8, height: 8, left: '70%' }} />
          </>
        ) : (
          <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
        )
      )}
    </div>
  )
}
