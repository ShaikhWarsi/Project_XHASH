import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Brain, TrendingUp, Shield, Eye, Percent, User, BarChart3, Sparkles } from 'lucide-react'
import type { AgentNodeData } from './types'

const iconMap: Record<string, typeof Brain> = {
  brain: Brain,
  shield: Shield,
  eye: Eye,
  trending: TrendingUp,
  percent: Percent,
  user: User,
  chart: BarChart3,
  sparkles: Sparkles,
}

const statusColors: Record<string, string> = {
  idle: 'border-[#2a2d3e]',
  running: 'border-purple-500 animate-pulse',
  done: 'border-green-500',
  error: 'border-red-500',
}

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const Icon = iconMap[data.icon || 'brain'] || Brain

  return (
    <div className={`bg-[#1e2235] border-2 ${statusColors[data.status || 'idle']} rounded-xl p-3 min-w-[180px] shadow-lg`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-purple-500" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-white">{data.label}</div>
          <div className="text-[10px] text-[#9aa0a6]">{data.description}</div>
        </div>
      </div>
      {data.status === 'running' && (
        <div className="flex items-center gap-1.5 text-[10px] text-purple-400 mt-1">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          Analyzing {data.ticker || '...'}
        </div>
      )}
      {data.signal && (
        <div className={`mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded inline-block ${
          data.signal === 'bullish' ? 'bg-green-500/10 text-green-400'
          : data.signal === 'bearish' ? 'bg-red-500/10 text-red-400'
          : 'bg-yellow-500/10 text-yellow-400'
        }`}>
          {data.signal.toUpperCase()} {data.confidence ? `(${(data.confidence * 100).toFixed(0)}%)` : ''}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-purple-500" />
    </div>
  )
}

export default memo(AgentNode)
