import { useState, useCallback, useRef } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
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
  input: '#3b82f6', indicator: '#22c55e', condition: '#f59e0b',
  signal: '#a855f7', order: '#ef4444',
}
const NODE_COLORS: Record<string, string> = {
  input: 'text-[#3b82f6]', indicator: 'text-[#22c55e]', condition: 'text-[#f59e0b]',
  signal: 'text-[#a855f7]', order: 'text-[#ef4444]',
}
const NODE_TITLES: Record<string, string> = {
  input: 'Input', indicator: 'Indicator', condition: 'Condition',
  signal: 'Signal', order: 'Order',
}

function BaseNode({ data, type }: { data: StrategyNodeData; type: string }) {
  return (
    <div className="bg-card rounded-md p-2 min-w-[140px] font-mono-data text-[11px]"
      style={{ border: `1px solid ${NODE_BORDERS[type]}`, borderRadius: 6 }}>
      <div className={`font-bold text-[10px] uppercase ${NODE_COLORS[type]}`}>{NODE_TITLES[type]}</div>
      <div className="text-primary mt-0.5">{data.label}</div>
      {data.params && Object.entries(data.params).map(([k, v]) => (
        <div key={k} className="text-[10px] text-muted mt-px">{k}: {v}</div>
      ))}
    </div>
  )
}

function StrategyInputNode({ data }: { data: StrategyNodeData }) { return <BaseNode data={data} type="input" /> }
function IndicatorNode({ data }: { data: StrategyNodeData }) { return <BaseNode data={data} type="indicator" /> }
function ConditionNode({ data }: { data: StrategyNodeData }) { return <BaseNode data={data} type="condition" /> }
function SignalNode({ data }: { data: StrategyNodeData }) { return <BaseNode data={data} type="signal" /> }
function OrderNode({ data }: { data: StrategyNodeData }) { return <BaseNode data={data} type="order" /> }

const nodeTypes = {
  input: StrategyInputNode,
  indicator: IndicatorNode,
  condition: ConditionNode,
  signal: SignalNode,
  order: OrderNode,
}

const defaultNodes: StrategyNode[] = [
  {
    id: 'input-1', type: 'input', position: { x: 250, y: 0 },
    data: { label: 'AAPL Daily', type: 'input', params: { symbol: 'AAPL', timeframe: '1d' } },
  },
  {
    id: 'indicator-1', type: 'indicator', position: { x: 100, y: 150 },
    data: { label: 'SMA(20)', type: 'indicator', params: { period: '20' } },
  },
  {
    id: 'indicator-2', type: 'indicator', position: { x: 400, y: 150 },
    data: { label: 'SMA(50)', type: 'indicator', params: { period: '50' } },
  },
  {
    id: 'condition-1', type: 'condition', position: { x: 220, y: 300 },
    data: { label: 'SMA 20 > SMA 50', type: 'condition' },
  },
  {
    id: 'order-1', type: 'order', position: { x: 220, y: 430 },
    data: { label: 'Buy 100 shares', type: 'order', params: { qty: '100', side: 'Buy' } },
  },
]

const defaultEdges: Edge[] = [
  { id: 'e-i1-ind1', source: 'input-1', target: 'indicator-1' },
  { id: 'e-i1-ind2', source: 'input-1', target: 'indicator-2' },
  { id: 'e-ind1-cond', source: 'indicator-1', target: 'condition-1' },
  { id: 'e-ind2-cond', source: 'indicator-2', target: 'condition-1' },
  { id: 'e-cond-order', source: 'condition-1', target: 'order-1' },
]

const NODE_PALETTE = [
  { type: 'input', label: 'Data Input', color: '#3b82f6' },
  { type: 'indicator', label: 'Indicator', color: '#22c55e' },
  { type: 'condition', label: 'Condition', color: '#f59e0b' },
  { type: 'signal', label: 'Signal', color: '#a855f7' },
  { type: 'order', label: 'Order', color: '#ef4444' },
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
