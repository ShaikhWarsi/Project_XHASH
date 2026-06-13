import { create } from 'zustand'
import {
  addEdge, applyEdgeChanges, applyNodeChanges, type Connection,
  type Edge, type EdgeChange, type Node, type NodeChange,
} from '@xyflow/react'
import type { FlowWorkflow } from '../types/flow'

interface FlowWorkflowState {
  workflow: FlowWorkflow | null
  nodes: Node[]
  edges: Edge[]
  isModified: boolean
  selectedNode: Node | null
  executionResult: any | null

  setWorkflow: (wf: FlowWorkflow) => void
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  updateNodeData: (nodeId: string, data: Record<string, any>) => void
  selectNode: (node: Node | null) => void
  setExecutionResult: (result: any) => void
  reset: () => void
}

export const useFlowWorkflowStore = create<FlowWorkflowState>((set, get) => ({
  workflow: null,
  nodes: [],
  edges: [],
  isModified: false,
  selectedNode: null,
  executionResult: null,

  setWorkflow: (wf) => set({
    workflow: wf,
    nodes: (wf.nodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data || {},
    })),
    edges: (wf.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type || 'smoothstep',
      animated: e.animated ?? true,
    })),
    isModified: false,
  }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => set((state) => ({
    nodes: applyNodeChanges(changes, state.nodes),
    isModified: true,
  })),

  onEdgesChange: (changes) => set((state) => ({
    edges: applyEdgeChanges(changes, state.edges),
    isModified: true,
  })),

  onConnect: (connection) => set((state) => ({
    edges: addEdge({ ...connection, id: `edge-${Date.now()}`, type: 'smoothstep', animated: true }, state.edges),
    isModified: true,
  })),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
    isModified: true,
  })),

  updateNodeData: (nodeId, data) => set((state) => ({
    nodes: state.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
    isModified: true,
  })),

  selectNode: (node) => set({ selectedNode: node }),

  setExecutionResult: (result) => set({ executionResult: result }),

  reset: () => set({
    workflow: null,
    nodes: [],
    edges: [],
    isModified: false,
    selectedNode: null,
    executionResult: null,
  }),
}))
