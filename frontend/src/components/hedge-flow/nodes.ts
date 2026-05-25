import AgentNode from './AgentNode'
import InputNode from './InputNode'
import OutputNode from './OutputNode'
import { type AppNode } from './types'

export const nodeTypes = {
  agent: AgentNode,
  input: InputNode,
  output: OutputNode,
}

export const defaultNodes: AppNode[] = [
  {
    id: 'input-1',
    type: 'input',
    position: { x: 250, y: 0 },
    data: {
      label: 'Stock Input',
      tickers: 'AAPL, MSFT',
      startDate: '',
      endDate: '',
      initialCash: 100000,
    },
  },
  {
    id: 'agent-buffett',
    type: 'agent',
    position: { x: 100, y: 175 },
    data: {
      label: 'Warren Buffett',
      agentKey: 'warren_buffett',
      description: 'Value / Moat',
      icon: 'brain',
      status: 'idle',
    },
  },
  {
    id: 'agent-graham',
    type: 'agent',
    position: { x: 300, y: 175 },
    data: {
      label: 'Ben Graham',
      agentKey: 'ben_graham',
      description: 'Deep Value',
      icon: 'shield',
      status: 'idle',
    },
  },
  {
    id: 'output-1',
    type: 'output',
    position: { x: 200, y: 375 },
    data: {
      label: 'Portfolio Manager',
      type: 'portfolio',
      status: 'idle',
    },
  },
]

export const defaultEdges = [
  { id: 'e-input-buffett', source: 'input-1', target: 'agent-buffett' },
  { id: 'e-input-graham', source: 'input-1', target: 'agent-graham' },
  { id: 'e-buffett-output', source: 'agent-buffett', target: 'output-1' },
  { id: 'e-graham-output', source: 'agent-graham', target: 'output-1' },
]
