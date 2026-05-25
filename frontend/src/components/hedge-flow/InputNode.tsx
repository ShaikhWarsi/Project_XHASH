import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { BarChart3 } from 'lucide-react'
import type { InputNodeData } from './types'

function InputNode({ data }: NodeProps<Node<InputNodeData>>) {
  return (
    <div className="bg-[#1e2235] border-2 border-blue-500/30 rounded-xl p-3 min-w-[200px] shadow-lg">
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{data.label || 'Input'}</div>
        </div>
      </div>
      <div className="space-y-1 text-[10px] text-[#9aa0a6]">
        <div>Tickers: {data.tickers || '—'}</div>
        <div>Cash: ${(data.initialCash || 100000).toLocaleString()}</div>
      </div>
    </div>
  )
}

export default memo(InputNode)
