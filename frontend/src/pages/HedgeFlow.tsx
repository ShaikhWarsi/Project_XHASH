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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Save, Play, FolderOpen, Download } from 'lucide-react'

import { nodeTypes, defaultNodes, defaultEdges } from '../components/hedge-flow/nodes'
import type { AppNode, InputNodeData, OutputNodeData } from '../components/hedge-flow/types'
import type { Flow } from '../api/hedgeFund'
import HedgeFlowSidebar from '../components/hedge-flow/Sidebar'
import { createFlow, getFlows, getFlow, updateFlow, runHedgeFund } from '../api/hedgeFund'

let nodeId = 100

interface DraggedTemplate {
  type: string
  label: string
  key?: string
  description?: string
  subtype?: string
}

export default function HedgeFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [flowName, setFlowName] = useState('My Hedge Fund')
  const [flowId, setFlowId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [savedFlows, setSavedFlows] = useState<Flow[]>([])
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<{ fitView: () => void } | null>(null)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const onDrop = useCallback(
    (template: DraggedTemplate) => {
      const position = { x: Math.random() * 300, y: Math.random() * 300 }
      const id = `${template.type}-${++nodeId}`

      const baseData = {
        label: template.label || '',
      }

      let data: AppNode['data']
      if (template.type === 'input') {
        data = { ...baseData, tickers: 'AAPL', startDate: '', endDate: '', initialCash: 100000 } as InputNodeData
      } else if (template.type === 'output') {
        data = { ...baseData, type: (template.subtype as OutputNodeData['type']) || 'portfolio' } as OutputNodeData
      } else {
        data = { ...baseData, agentKey: template.key || '', description: template.description || '' }
      }

      const newNode: AppNode = { id, type: template.type, position, data }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes],
  )

  const handleSave = useCallback(async () => {
    try {
      if (flowId) {
        await updateFlow(flowId, { name: flowName, nodes, edges })
        setOutput((o) => [...o, '✓ Flow updated'])
      } else {
        const created = await createFlow({ name: flowName, nodes, edges })
        setFlowId(created.id)
        setOutput((o) => [...o, `✓ Flow saved (id: ${created.id})`])
      }
    } catch (e: unknown) {
      setOutput((o) => [...o, `✗ Save failed: ${(e as Error).message}`])
    }
  }, [flowName, nodes, edges, flowId])

  const handleOpenLoadModal = useCallback(async () => {
    try {
      const flows = await getFlows()
      setSavedFlows(flows)
      setLoadModalOpen(true)
    } catch {
      setOutput((o) => [...o, '✗ Failed to load flow list'])
    }
  }, [])

  const handleLoadFlow = useCallback(async (id: number) => {
    try {
      const flow = await getFlow(id)
      setNodes(flow.nodes as AppNode[])
      setEdges(flow.edges)
      setFlowName(flow.name)
      setFlowId(flow.id)
      setLoadModalOpen(false)
      setOutput((o) => [...o, `✓ Loaded flow: ${flow.name}`])
    } catch (e: unknown) {
      setOutput((o) => [...o, `✗ Load failed: ${(e as Error).message}`])
    }
  }, [setNodes, setEdges])

  const handleExportFlow = useCallback(() => {
    const json = JSON.stringify({ name: flowName, nodes, edges }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowName.replace(/\s+/g, '_')}.flow.json`
    a.click()
    URL.revokeObjectURL(url)
    setOutput((o) => [...o, '✓ Flow exported'])
  }, [flowName, nodes, edges])

  const handleRun = useCallback(async () => {
    setRunning(true)
    setOutput([])
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'agent') {
          return { ...n, data: { ...n.data, status: 'running' as const } }
        }
        return n
      })
    )

    try {
      const inputNode = nodes.find((n) => n.type === 'input') as (AppNode & { data: InputNodeData }) | undefined
      const inputData = inputNode?.data
      const tickers = typeof inputData?.tickers === 'string'
        ? inputData.tickers.split(',').map((t: string) => t.trim())
        : ['AAPL']

      const reader = await runHedgeFund({
        tickers,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        initial_cash: (inputData as InputNodeData)?.initialCash || 100000,
        graph_nodes: nodes,
        graph_edges: edges,
      })

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'progress') {
                setOutput((o) => [...o, `${event.agent}: ${event.status}`])
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.data?.label === event.agent) {
                      return { ...n, data: { ...n.data, status: 'running' as const } }
                    }
                    return n
                  })
                )
              } else if (event.type === 'complete') {
                setOutput((o) => [...o, '✓ Deliberation complete'])
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.type === 'agent' || n.type === 'output') {
                      return { ...n, data: { ...n.data, status: 'done' as const } }
                    }
                    return n
                  })
                )
              } else if (event.type === 'error') {
                setOutput((o) => [...o, `✗ Error: ${event.message}`])
                setNodes((nds) =>
                  nds.map((n) => {
                    if (n.type === 'agent') {
                      return { ...n, data: { ...n.data, status: 'error' as const } } as AppNode
                    }
                    return n
                  })
                )
              }
            } catch {
              console.debug('Failed to parse hedge flow event')
            }
          }
        }
      }
    } catch (e: unknown) {
      setOutput((o) => [...o, `✗ Run failed: ${(e as Error).message}`])
    }

    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'agent') {
          return { ...n, data: { ...n.data, status: 'done' as const } }
        }
        if (n.type === 'output') {
          return { ...n, data: { ...n.data, status: 'done' as const } }
        }
        return n
      })
    )
    setRunning(false)
  }, [nodes, edges, setNodes])

  return (
    <div className="flex h-[calc(100vh-48px)]">
      <HedgeFlowSidebar onDrop={onDrop} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            style={{ background: 'transparent', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500, border: 'none', outline: 'none' }}
          />
          <div className="flex items-center gap-2">
            <button onClick={handleOpenLoadModal} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
              <FolderOpen className="w-3 h-3" /> Load
            </button>
            <button onClick={handleExportFlow} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
              <Save className="w-3 h-3" /> Save
            </button>
            <button onClick={handleRun} disabled={running} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ffffff', background: 'var(--accent-purple)', opacity: running ? 0.5 : 1, border: 'none', cursor: running ? 'not-allowed' : 'pointer', padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}>
              <Play className="w-3 h-3" /> {running ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
        <div className="flex-1 flex">
          <div className="flex-1" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={(instance) => { reactFlowInstance.current = instance }}
              nodeTypes={nodeTypes}
              fitView
              colorMode="dark"
            >
              <Controls />
              <Background color="var(--border-color)" gap={20} />
              <MiniMap
                nodeColor={() => 'var(--border-color)'}
                maskColor="rgba(15, 17, 24, 0.8)"
                style={{ background: 'var(--bg-secondary)' }}
              />
            </ReactFlow>
          </div>
          {output.length > 0 && (
            <div className="w-64 p-3 overflow-y-auto" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Output</div>
              <div className="space-y-1">
                {output.map((line, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loadModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 'var(--z-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLoadModalOpen(false)}
        >
          <div
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', minWidth: 400, maxHeight: '60vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Load Saved Flow
            </h3>
            {savedFlows.length === 0 ? (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No saved flows found.</div>
            ) : (
              <div className="space-y-2">
                {savedFlows.map((flow) => (
                  <div
                    key={flow.id}
                    onClick={() => handleLoadFlow(flow.id)}
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{flow.name}</div>
                    {flow.description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{flow.description}</div>}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                      {flow.nodes?.length || 0} nodes · {flow.edges?.length || 0} edges
                      {flow.updated_at && ` · updated ${new Date(flow.updated_at).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setLoadModalOpen(false)}
              style={{
                marginTop: 'var(--space-4)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
