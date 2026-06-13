import { useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api/client'
import { useToastStore } from '../store/toast'


type PipelineNodeData = {
  label: string
  stage: 'source' | 'process' | 'storage' | 'compute' | 'output'
  status: 'idle' | 'running' | 'completed' | 'error'
  detail?: string
  lastRun?: string
  errorCount?: number
}

type PipelineNode = Node<PipelineNodeData>

type PipelineRun = {
  id: string
  started: string
  duration: string
  status: 'success' | 'failed' | 'running'
  errors: number
}

const FONT = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }

const STAGE_CONFIG: Record<string, { bg: string; border: string; icon: string }> = {
  source: { bg: 'color-mix(in srgb, var(--accent-blue) 20%, var(--bg-card))', border: 'var(--accent-blue)', icon: '\u{1F4E1}' },
  process: { bg: 'color-mix(in srgb, var(--accent-green) 20%, var(--bg-card))', border: 'var(--accent-green)', icon: '\u2699\uFE0F' },
  compute: { bg: 'color-mix(in srgb, var(--accent-purple) 20%, var(--bg-card))', border: 'var(--accent-purple)', icon: '\u{1F5B1}\uFE0F' },
  storage: { bg: 'color-mix(in srgb, var(--accent-yellow) 20%, var(--bg-card))', border: 'var(--accent-yellow)', icon: '\u{1F4BE}' },
  output: { bg: 'color-mix(in srgb, var(--accent-red) 20%, var(--bg-card))', border: 'var(--accent-red)', icon: '\u{1F4CA}' },
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
  { id: 'exchange', type: 'pipeline', position: { x: 50, y: 50 }, data: { label: 'Exchange API', stage: 'source', status: 'completed', detail: 'Binance WebSocket', lastRun: '2 min ago', errorCount: 0 } },
  { id: 'sensor', type: 'pipeline', position: { x: 50, y: 200 }, data: { label: 'Sensor Bot', stage: 'process', status: 'running', detail: 'Collecting ticks', lastRun: 'Just now', errorCount: 0 } },
  { id: 'storage', type: 'pipeline', position: { x: 50, y: 350 }, data: { label: 'Data Storage', stage: 'storage', status: 'completed', detail: 'ArcticDB / Parquet', lastRun: '5 min ago', errorCount: 1 } },
  { id: 'candles-1m', type: 'pipeline', position: { x: 350, y: 50 }, data: { label: 'Candle Generator (1m)', stage: 'compute', status: 'completed', detail: 'OHLCV from ticks', lastRun: '2 min ago', errorCount: 0 } },
  { id: 'candles-1h', type: 'pipeline', position: { x: 350, y: 200 }, data: { label: 'Candle Generator (1H)', stage: 'compute', status: 'running', detail: 'Aggregating 1m→1H', lastRun: 'Just now', errorCount: 0 } },
  { id: 'indicator', type: 'pipeline', position: { x: 350, y: 350 }, data: { label: 'Indicator Bot', stage: 'compute', status: 'idle', detail: 'SMA, EMA, RSI, MACD', lastRun: '15 min ago', errorCount: 2 } },
  { id: 'study', type: 'pipeline', position: { x: 650, y: 200 }, data: { label: 'Study Bot', stage: 'output', status: 'idle', detail: 'Market analysis', lastRun: 'Never', errorCount: 0 } },
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
  const [nodes, setNodes] = useState<PipelineNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [runsExpanded, setRunsExpanded] = useState(false)
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([])
  const [edgeTransformLogic, setEdgeTransformLogic] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(true)
    api.get('/data/pipeline')
      .then((res: any) => {
        if (res.data) {
          if (Array.isArray(res.data.nodes)) setNodes(res.data.nodes)
          if (Array.isArray(res.data.edges)) setEdges(res.data.edges)
          if (res.data.edgeTransforms) setEdgeTransformLogic(res.data.edgeTransforms)
          if (Array.isArray(res.data.runs)) setPipelineRuns(res.data.runs)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode(node as PipelineNode)
    setSelectedEdge(null)
  }, [])

  const onEdgeClick = useCallback((_event: any, edge: Edge) => {
    setSelectedEdge(edge)
    setSelectedNode(null)
  }, [])

  const runPipeline = useCallback(async () => {
    try {
      const res = await api.post('/data/pipeline/run')
      const run = res.data?.run || { id: `run-${Date.now()}`, started: new Date().toLocaleTimeString(), duration: '0s', status: 'success' as const, errors: 0 }
      setPipelineRuns((prev) => [run, ...prev].slice(0, 20))
    } catch (e) {
      useToastStore.getState().addToast(`Pipeline run failed: ${(e as Error).message}`, 'error')
      const newRun: PipelineRun = { id: `run-${Date.now()}`, started: new Date().toLocaleTimeString(), duration: '0s', status: 'failed', errors: 1 }
      setPipelineRuns((prev) => [newRun, ...prev].slice(0, 20))
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <span style={{ ...FONT, fontWeight: 700, color: 'var(--accent-green)' }}>
          DATA PIPELINE
        </span>
        <span style={{ ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
          Visual data flow from exchange → storage → indicators → analysis
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={runPipeline}
          style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '3px 12px', cursor: 'pointer', ...FONT, fontSize: 10, fontWeight: 600, borderRadius: 3 }}>
          RUN PIPELINE
        </button>
      </div>
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Loading pipeline data...</div>
      ) : (
      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 4 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            style={{ background: 'var(--bg-app)' }}
          >
            <Controls showInteractive={false} />
            <Background gap={20} size={1} color="var(--border-color)" />
            <MiniMap style={{ background: 'var(--bg-card)' }} />
          </ReactFlow>
        </div>
        <div className="bg-card border border-default rounded p-2 w-[260px] flex flex-col gap-2 overflow-auto" style={{ ...FONT }}>
          {selectedNode && (
            <div>
              <div className="font-bold text-[10px] text-up mb-1">NODE DETAILS</div>
              <div className="flex flex-col gap-1 text-[10px]">
                <div className="flex justify-between"><span className="text-muted">Name</span><span className="text-primary font-semibold">{selectedNode.data.label}</span></div>
                <div className="flex justify-between"><span className="text-muted">Stage</span><span className="text-primary">{selectedNode.data.stage}</span></div>
                <div className="flex justify-between"><span className="text-muted">Status</span><span style={{ color: selectedNode.data.status === 'running' ? 'var(--accent-green)' : selectedNode.data.status === 'error' ? 'var(--accent-red)' : 'var(--text-muted)' }}>{selectedNode.data.status}</span></div>
                <div className="flex justify-between"><span className="text-muted">Last Run</span><span className="text-primary">{selectedNode.data.lastRun || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-muted">Errors</span><span style={{ color: (selectedNode.data.errorCount || 0) > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{selectedNode.data.errorCount || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted">Detail</span><span className="text-secondary">{selectedNode.data.detail || '-'}</span></div>
              </div>
            </div>
          )}
          {selectedEdge && (
            <div>
              <div className="font-bold text-[10px] text-up mb-1">TRANSFORM LOGIC</div>
              <div className="text-[10px] text-primary bg-app border border-default rounded p-2">
                {edgeTransformLogic[selectedEdge.id] || 'No transform logic defined'}
              </div>
              <div className="text-[9px] text-muted mt-1">
                {selectedEdge.id.replace('e-', '').replace('-', ' → ')}
              </div>
            </div>
          )}
          {!selectedNode && !selectedEdge && (
            <div className="text-muted text-[10px] text-center py-4">Click a node or edge to inspect</div>
          )}
        </div>
      </div>
      )}
      <div style={{ display: 'flex', gap: 12, padding: '4px 0', ...FONT, fontSize: 10, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} /> Running</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)' }} /> Completed</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} /> Error</span>
      </div>
      <div className="bg-card border border-default rounded">
        <button onClick={() => setRunsExpanded((v) => !v)}
          className="flex items-center gap-2 w-full text-left px-3 py-1.5 border-0 bg-transparent cursor-pointer font-mono-data text-[10px]"
          style={{ color: 'var(--text-primary)' }}>
          <span className="font-bold">PIPELINE RUNS</span>
          <span className="text-muted">({pipelineRuns.length})</span>
          <span style={{ marginLeft: 'auto', transform: runsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
        </button>
        {runsExpanded && (
          <div className="px-3 pb-2">
            {pipelineRuns.length === 0 ? (
              <div className="text-muted text-[10px] py-2 text-center">No runs yet. Click "Run Pipeline" to simulate a run.</div>
            ) : (
              <table className="w-full border-collapse font-mono-data text-[10px]">
                <thead>
                  <tr className="text-muted" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-1 pr-2">Run ID</th>
                    <th className="text-left py-1 pr-2">Started</th>
                    <th className="text-left py-1 pr-2">Duration</th>
                    <th className="text-left py-1 pr-2">Status</th>
                    <th className="text-left py-1">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineRuns.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-1 pr-2 text-accent-cyan">{run.id}</td>
                      <td className="py-1 pr-2 text-secondary">{run.started}</td>
                      <td className="py-1 pr-2 text-secondary">{run.duration}</td>
                      <td className="py-1 pr-2">
                        <span style={{ color: run.status === 'success' ? 'var(--accent-green)' : run.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{run.status}</span>
                      </td>
                      <td className="py-1" style={{ color: run.errors > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{run.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
