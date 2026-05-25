import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { TrendingUp, FileText, Code } from 'lucide-react'
import type { OutputNodeData } from './types'

const iconMap = {
  portfolio: TrendingUp,
  report: FileText,
  json: Code,
}

function OutputNode({ data }: NodeProps<Node<OutputNodeData>>) {
  const Icon = iconMap[data.type || 'portfolio'] || TrendingUp
  const statusColor = data.status === 'done' ? 'border-green-500' : data.status === 'running' ? 'border-yellow-500' : 'border-[#2a2d3e]'

  return (
    <div className={`bg-[#1e2235] border-2 ${statusColor} rounded-xl p-3 min-w-[160px] shadow-lg`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-green-500" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-green-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{data.label}</div>
          <div className="text-[10px] text-[#9aa0a6] capitalize">{data.type} output</div>
        </div>
      </div>
      {data.status === 'done' && (
        <div className="text-[10px] text-green-400 mt-1">✓ Ready</div>
      )}
    </div>
  )
}

export default memo(OutputNode)
