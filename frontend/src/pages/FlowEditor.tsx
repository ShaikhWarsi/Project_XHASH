import { useEffect, useCallback, type DragEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap, Panel, type Node, type Connection,
  ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import NodePalette from '../components/flow/panels/NodePalette'
import ConfigPanel from '../components/flow/panels/ConfigPanel'
import { nodeTypes } from '../components/flow/nodes'
import { useFlowWorkflowStore } from '../stores/flowWorkflowStore'
import { useToastStore } from '../store/toast'
import { fetchWorkflow, updateWorkflow, executeWorkflow, activateWorkflow, deactivateWorkflow } from '../api/flow'
import { NODE_DEFAULTS } from '../types/flow'
import { ArrowLeft, Play, Save, Power, PowerOff, Workflow } from 'lucide-react'

let nodeIdCounter = 0
function getNodeId() {
  return `node_${++nodeIdCounter}_${Date.now()}`
}

function FlowEditorContent() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    workflow, nodes, edges, isModified, executionResult,
    setWorkflow, onNodesChange, onEdgesChange, onConnect, addNode, reset,
    selectNode, setExecutionResult,
  } = useFlowWorkflowStore()
  const { screenToFlowPosition } = useReactFlow()
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    if (!id) return
    nodeIdCounter = 0
    fetchWorkflow(id).then(setWorkflow).catch((err) => addToast(`Failed: ${err?.message}`, 'error'))
    return () => { reset() }
  }, [id, setWorkflow, reset, addToast])

  const handleSave = async () => {
    if (!id || !workflow) return
    try {
      await updateWorkflow(id, { nodes: nodes as any, edges: edges as any })
      addToast('Workflow saved', 'success')
    } catch (err: any) {
      addToast(`Save failed: ${err?.message}`, 'error')
    }
  }

  const handleExecute = async () => {
    if (!id) return
    try {
      await handleSave()
      const result = await executeWorkflow(id)
      setExecutionResult(result)
      addToast(`Executed: ${result.status} (${result.node_count || 0} nodes)`, 'success')
    } catch (err: any) {
      addToast(`Execute failed: ${err?.message}`, 'error')
    }
  }

  const handleToggleActive = async () => {
    if (!id || !workflow) return
    try {
      if (workflow.is_active) {
        await deactivateWorkflow(id)
        addToast('Workflow deactivated', 'success')
      } else {
        const result = await activateWorkflow(id, { trigger_type: 'manual' })
        addToast('Workflow activated', 'success')
      }
      const updated = await fetchWorkflow(id)
      setWorkflow(updated)
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type || !NODE_DEFAULTS[type]) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const newNode: Node = {
      id: getNodeId(),
      type,
      position,
      data: { ...NODE_DEFAULTS[type] },
    }
    addNode(newNode)
  }, [screenToFlowPosition, addNode])

  const onNodeClick = useCallback((_: any, node: Node) => {
    selectNode(node)
  }, [selectNode])

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  if (!workflow) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={500} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Workflow size={12} className="inline mr-1" /> {workflow.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/flow')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="ghost" size="sm" onClick={handleToggleActive}>
            {workflow.is_active ? <><PowerOff size={12} /> Deactivate</> : <><Power size={12} /> Activate</>}
          </Button>
          <Button variant="primary" size="sm" onClick={handleExecute}><Play size={12} /> Run</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!isModified}><Save size={12} /> Save</Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-1" style={{ minHeight: '500px' }}>
        <NodePalette />

        <div
          className="flex-1 rounded-sm overflow-hidden"
          style={{ border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Backspace"
            defaultEdgeOptions={{ animated: true }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              style={{ background: 'var(--bg-secondary)' }}
            />
            <Panel position="bottom-center">
              <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {nodes.length} nodes · {edges.length} edges {isModified ? '· unsaved' : ''}
              </span>
            </Panel>
          </ReactFlow>
        </div>

        <ConfigPanel />
      </div>

      {executionResult && (
        <Card title={`Execution (${executionResult.node_count || 0} nodes)`}>
          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
            {(executionResult.logs || []).map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[8px] font-mono">
                <span style={{ color: log.status === 'ok' ? 'var(--accent-green)' : log.status === 'error' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                  [{log.status?.toUpperCase()}]
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{log.node_type}:</span>
                <span style={{ color: 'var(--text-primary)' }}>{log.message}</span>
              </div>
            ))}
            {(!executionResult.logs || executionResult.logs.length === 0) && (
              <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>No log entries</span>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorContent />
    </ReactFlowProvider>
  )
}
