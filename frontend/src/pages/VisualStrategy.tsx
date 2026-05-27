import { useState, useCallback, useRef, memo } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Play } from 'lucide-react'

type StrategyNodeData = {
  label: string
  type: 'input' | 'indicator' | 'condition' | 'signal' | 'order'
  params?: Record<string, string>
}

type StrategyNode = Node<StrategyNodeData>

const NODE_BORDERS: Record<string, string> = {
  input: 'var(--accent-blue)', indicator: 'var(--accent-green)', condition: 'var(--accent-yellow)',
  signal: 'var(--accent-purple)', order: 'var(--accent-red)',
}

const NODE_PALETTE = [
  { type: 'input', label: 'Data Input', color: 'var(--accent-blue)' },
  { type: 'indicator', label: 'Indicator', color: 'var(--accent-green)' },
  { type: 'condition', label: 'Condition', color: 'var(--accent-yellow)' },
  { type: 'signal', label: 'Signal', color: 'var(--accent-purple)' },
  { type: 'order', label: 'Order', color: 'var(--accent-red)' },
]

function StrategyNodeComponent({ data }: NodeProps<StrategyNodeData>) {
  const borderColor = NODE_BORDERS[data.type] || 'var(--accent-blue)'
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        padding: '6px 12px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: 'var(--text-primary)',
        minWidth: 100,
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: borderColor }} />
      <div style={{ fontWeight: 600, color: borderColor }}>{data.label}</div>
      {data.params && Object.entries(data.params).map(([k, v]) => (
        <div key={k} style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{k}: {v}</div>
      ))}
      <Handle type="source" position={Position.Right} style={{ background: borderColor }} />
    </div>
  )
}

const nodeTypes = {
  input: StrategyNodeComponent,
  indicator: StrategyNodeComponent,
  condition: StrategyNodeComponent,
  signal: StrategyNodeComponent,
  order: StrategyNodeComponent,
}

const defaultNodes: StrategyNode[] = [
  {
    id: 'input-1',
    type: 'input',
    position: { x: 50, y: 200 },
    data: { label: 'OHLCV Data', type: 'input' },
  },
  {
    id: 'indicator-1',
    type: 'indicator',
    position: { x: 300, y: 150 },
    data: { label: 'SMA(20)', type: 'indicator', params: { period: '20' } },
  },
  {
    id: 'indicator-2',
    type: 'indicator',
    position: { x: 300, y: 300 },
    data: { label: 'SMA(50)', type: 'indicator', params: { period: '50' } },
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 550, y: 225 },
    data: { label: 'SMA Cross', type: 'condition' },
  },
  {
    id: 'signal-1',
    type: 'signal',
    position: { x: 800, y: 150 },
    data: { label: 'Entry Signal', type: 'signal' },
  },
  {
    id: 'order-1',
    type: 'order',
    position: { x: 1050, y: 150 },
    data: { label: 'Buy Order', type: 'order', params: { shares: '100' } },
  },
]

const defaultEdges: Edge[] = [
  { id: 'e-input-1-indicator-1', source: 'input-1', target: 'indicator-1' },
  { id: 'e-input-1-indicator-2', source: 'input-1', target: 'indicator-2' },
  { id: 'e-indicator-1-condition-1', source: 'indicator-1', target: 'condition-1' },
  { id: 'e-indicator-2-condition-1', source: 'indicator-2', target: 'condition-1' },
  { id: 'e-condition-1-signal-1', source: 'condition-1', target: 'signal-1' },
  { id: 'e-signal-1-order-1', source: 'signal-1', target: 'order-1' },
]

let nodeId = 100

export default function VisualStrategy() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [generatedCode, setGeneratedCode] = useState('')
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      const position = { x: Math.random() * 300, y: Math.random() * 300 }
      const id = `${type}-${++nodeId}`
      const paletteItem = NODE_PALETTE.find((p) => p.type === type)
      const newNode: StrategyNode = {
        id,
        type: type as any,
        position,
        data: { label: paletteItem?.label || type, type: type as any },
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [setNodes],
  )

  const generateCode = () => {
    const codeLines: string[] = [
      '// Generated from Visual Strategy',
      `strategy("Visual Strategy", { initialCapital: 100000 })`,
      '',
    ]
    const indicatorNodes = nodes.filter((n) => n.type === 'indicator')
    const conditionNodes = nodes.filter((n) => n.type === 'condition')

    for (const n of indicatorNodes) {
      const d = n.data as StrategyNodeData
      codeLines.push(`// ${d.label}`)
    }

    if (conditionNodes.length > 0) {
      codeLines.push('')
      codeLines.push('// Entry condition')
      codeLines.push('if (sma(close, 20) > sma(close, 50)) {')
      codeLines.push('  buy("Entry", shares=100)')
      codeLines.push('}')
      codeLines.push('')
      codeLines.push('// Exit condition')
      codeLines.push('if (close < sma(close, 20)) {')
      codeLines.push('  sell("Exit", shares=100)')
      codeLines.push('}')
    }

    if (indicatorNodes.length > 0) {
      codeLines.push('')
      for (const n of indicatorNodes) {
        const d = n.data as StrategyNodeData
        const period = d.params?.period || '14'
        codeLines.push(`plot(sma(close, ${period}), "${d.label}")`)
      }
    }

    setGeneratedCode(codeLines.join('\n'))
  }

  return (
    <div className="flex h-full gap-1.5">
      <div className="w-40 flex flex-col gap-1 pr-1.5 border-r border-default">
        <span className="font-mono-data text-[10px] font-bold text-up uppercase">Node Palette</span>
        {NODE_PALETTE.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/reactflow', item.type)
              e.dataTransfer.effectAllowed = 'move'
            }}
            className="flex items-center gap-1.5 p-1.5 bg-card rounded cursor-grab font-mono-data text-[11px]"
            style={{ border: `1px solid ${item.color}33` }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
        <div className="flex-1" />
        <button onClick={generateCode}
          className="flex items-center gap-1 bg-accent-cyan text-black border-none font-mono-data text-[11px] font-semibold px-2 py-1 cursor-pointer w-full rounded-sm">
          <Play size={12} /> GENERATE
        </button>
      </div>
      <div ref={reactFlowWrapper} className="flex-1 border border-default rounded">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: 'var(--bg-app)' }}
        >
          <Controls />
          <Background gap={20} size={1} color="var(--border-color)" />
          <MiniMap style={{ background: 'var(--bg-card)' }} />
        </ReactFlow>
      </div>
      {generatedCode && (
        <div className="w-[300px] border border-default rounded p-2 overflow-auto font-mono-data text-[11px] whitespace-pre-wrap text-secondary bg-card">
          <div className="font-bold text-up mb-1">GENERATED CODE</div>
          <pre className="m-0">{generatedCode}</pre>
        </div>
      )}
    </div>
  )
}
