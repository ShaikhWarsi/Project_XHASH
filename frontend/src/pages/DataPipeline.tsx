import { useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'


type PipelineNodeData = {
  label: string
  stage: 'source' | 'process' | 'storage' | 'compute' | 'output'
  status: 'idle' | 'running' | 'completed' | 'error'
  detail?: string
}

type PipelineNode = Node<PipelineNodeData>

const FONT = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

const STAGE_CONFIG = {
  source: { bg: 'color-mix(in srgb, var(--accent-blue) 20%, var(--bg-card))', border: 'var(--accent-blue)', icon: 'ðŸ“¡' },
  process: { bg: 'color-mix(in srgb, var(--accent-green) 20%, var(--bg-card))', border: 'var(--accent-green)', icon: 'âš™ï¸' },
  storage: { bg: 'color-mix(in srgb, var(--accent-yellow) 20%, var(--bg-card))', border: 'var(--accent-yellow)', icon: 'ðŸ’¾' },
  output: { bg: 'color-mix(in srgb, var(--accent-red) 20%, var(--bg-card))', border: 'var(--accent-red)', icon: 'ðŸ“Š' },
}

function PipelineNodeComponent({ data }: { data: PipelineNodeData }) {
  const cfg = STAGE_CONFIG[data.stage]
  const statusColor = data.status === 'running' ? 'var(--accent-green)' : data.status === 'error' ? 'var(--accent-red)' : data.status === 'completed' ? 'var(--accent-blue)' : 'var(--text-muted)'
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}66`, borderRadius: 8, padding: '10px 14px', minWidth: 160, ...FONT }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{cfg.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 11, color: 'var(--text-primary)' }}>{data.label}</span>
      </div>
      {data.detail && (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{data.detail}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
        <span style={{ fontSize: 9, color: statusColor, textTransform: 'uppercase' }}>{data.status}</span>
      </div>
    </div>
  )
}

const nodeTypes = { pipeline: PipelineNodeComponent }

const defaultNodes: PipelineNode[] = [
  { id: 'exchange', type: 'pipeline', position: { x: 50, y: 50 }, data: { label: 'Exchange API', stage: 'source', status: 'completed', detail: 'Binance WebSocket' } },
  { id: 'sensor', type: 'pipeline', position: { x: 50, y: 200 }, data: { label: 'Sensor Bot', stage: 'process', status: 'running', detail: 'Collecting ticks' } },
  { id: 'storage', type: 'pipeline', position: { x: 50, y: 350 }, data: { label: 'Data Storage', stage: 'storage', status: 'completed', detail: 'ArcticDB / Parquet' } },
  { id: 'candles-1m', type: 'pipeline', position: { x: 350, y: 50 }, data: { label: 'Candle Generator (1m)', stage: 'compute', status: 'completed', detail: 'OHLCV from ticks' } },
  { id: 'candles-1h', type: 'pipeline', position: { x: 350, y: 200 }, data: { label: 'Candle Generator (1H)', stage: 'compute', status: 'running', detail: 'Aggregating 1mâ†’1H' } },
  { id: 'indicator', type: 'pipeline', position: { x: 350, y: 350 }, data: { label: 'Indicator Bot', stage: 'compute', status: 'idle', detail: 'SMA, EMA, RSI, MACD' } },
  { id: 'study', type: 'pipeline', position: { x: 650, y: 200 }, data: { label: 'Study Bot', stage: 'output', status: 'idle', detail: 'Market analysis' } },
]

const defaultEdges: Edge[] = [
  { id: 'e-exch-sensor', source: 'exchange', target: 'sensor', animated: true },
  { id: 'e-sensor-storage', source: 'sensor', target: 'storage' },
  { id: 'e-storage-c1m', source: 'storage', target: 'candles-1m' },
  { id: 'e-storage-c1h', source: 'storage', target: 'candles-1h' },
  { id: 'e-c1m-ind', source: 'candles-1m', target: 'indicator' },
  { id: 'e-c1h-ind', source: 'candles-1h', target: 'indicator' },
  { id: 'e-ind-study', source: 'indicator', target: 'study' },
]

export default function DataPipeline() {
  const [nodes] = useState(defaultNodes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ ...FONT, fontWeight: 700, color: 'var(--accent-green)' }}>
          DATA PIPELINE
        </span>
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
          Visual data flow from exchange â†’ storage â†’ indicators â†’ analysis
        </span>
      </div>
      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 4 }}>
        <ReactFlow
          nodes={nodes}
          edges={defaultEdges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          style={{ background: 'var(--bg-app)' }}
        >
          <Controls showInteractive={false} />
          <Background gap={20} size={1} color="var(--border-color)" />
          <MiniMap style={{ background: 'var(--bg-card)' }} />
        </ReactFlow>
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '4px 0', ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} /> Running</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)' }} /> Completed</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} /> Error</span>
      </div>
    </div>
  )
}
