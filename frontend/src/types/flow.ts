import type { Node, Edge } from '@xyflow/react'

export type NodeCategory = 'trigger' | 'action' | 'condition' | 'data' | 'streaming' | 'utility'

export interface FlowWorkflow {
  id: string
  name: string
  description: string
  user_id: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  trigger_type: string | null
  is_active: boolean
  webhook_token: string | null
  schedule_config: ScheduleConfig | null
  price_alert_config: PriceAlertConfig | null
  created_at: string
  updated_at: string
}

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, any>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  animated?: boolean
}

export interface ScheduleConfig {
  type: 'once' | 'daily' | 'weekly' | 'interval'
  run_at?: string
  hour?: number
  minute?: number
  days?: number[]
  seconds?: number
}

export interface PriceAlertConfig {
  symbol: string
  exchange: string
  condition: string
  threshold: number
}

export interface NodeDefinition {
  type: string
  label: string
  category: NodeCategory
  color: string
  inputs: number
  outputs: number
  hasConditionalOutputs?: boolean
  configFields?: ConfigField[]
}

export interface ConfigField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'toggle'
  required?: boolean
  options?: { value: string; label: string }[]
  defaultValue?: any
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  { type: 'start', label: 'Start', category: 'trigger', color: '#f97316', inputs: 0, outputs: 1 },
  { type: 'webhookTrigger', label: 'Webhook', category: 'trigger', color: '#f97316', inputs: 0, outputs: 1 },
  { type: 'priceAlert', label: 'Price Alert', category: 'trigger', color: '#f97316', inputs: 0, outputs: 1, hasConditionalOutputs: true },
  { type: 'placeOrder', label: 'Place Order', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'smartOrder', label: 'Smart Order', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'basketOrder', label: 'Basket Order', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'splitOrder', label: 'Split Order', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'cancelAllOrders', label: 'Cancel All', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'closePositions', label: 'Close Positions', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'placeGtt', label: 'Place GTT', category: 'action', color: '#3b82f6', inputs: 1, outputs: 1 },
  { type: 'getQuote', label: 'Get Quote', category: 'data', color: '#8b5cf6', inputs: 1, outputs: 1 },
  { type: 'getFunds', label: 'Get Funds', category: 'data', color: '#8b5cf6', inputs: 1, outputs: 1 },
  { type: 'openPosition', label: 'Open Positions', category: 'data', color: '#8b5cf6', inputs: 1, outputs: 1 },
  { type: 'orderBook', label: 'Order Book', category: 'data', color: '#8b5cf6', inputs: 1, outputs: 1 },
  { type: 'gttOrderbook', label: 'GTT Book', category: 'data', color: '#8b5cf6', inputs: 1, outputs: 1 },
  { type: 'priceCondition', label: 'Price Condition', category: 'condition', color: '#a855f7', inputs: 1, outputs: 2, hasConditionalOutputs: true },
  { type: 'positionCheck', label: 'Position Check', category: 'condition', color: '#a855f7', inputs: 1, outputs: 2, hasConditionalOutputs: true },
  { type: 'fundCheck', label: 'Fund Check', category: 'condition', color: '#a855f7', inputs: 1, outputs: 2, hasConditionalOutputs: true },
  { type: 'timeWindow', label: 'Time Window', category: 'condition', color: '#a855f7', inputs: 1, outputs: 2, hasConditionalOutputs: true },
  { type: 'andGate', label: 'AND', category: 'condition', color: '#a855f7', inputs: 2, outputs: 1 },
  { type: 'orGate', label: 'OR', category: 'condition', color: '#a855f7', inputs: 2, outputs: 1 },
  { type: 'notGate', label: 'NOT', category: 'condition', color: '#a855f7', inputs: 1, outputs: 1 },
  { type: 'telegramAlert', label: 'Telegram', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
  { type: 'delay', label: 'Delay', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
  { type: 'variable', label: 'Variable', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
  { type: 'mathExpression', label: 'Math', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
  { type: 'log', label: 'Log', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
  { type: 'httpRequest', label: 'HTTP Request', category: 'utility', color: '#6b7280', inputs: 1, outputs: 1 },
]

export const NODE_DEFAULTS: Record<string, Record<string, any>> = {
  placeOrder: { symbol: '', exchange: 'NSE', action: 'BUY', quantity: 1, pricetype: 'MARKET', product: 'MIS', price: 0 },
  smartOrder: { symbol: '', exchange: 'NSE', action: 'BUY', quantity: 1, pricetype: 'MARKET', product: 'MIS' },
  basketOrder: { orders: [] },
  splitOrder: { symbol: '', exchange: 'NSE', action: 'BUY', total_quantity: 100, split_count: 4 },
  cancelAllOrders: {},
  closePositions: {},
  placeGtt: { strategy: '', trigger_type: 'SINGLE', symbol: '', exchange: 'NSE', action: 'BUY', quantity: 1, price: 0 },
  getQuote: { symbol: '', exchange: 'NSE' },
  getFunds: {},
  openPosition: {},
  orderBook: {},
  gttOrderbook: {},
  priceCondition: { symbol: '', operator: 'greater_than', value: 0 },
  positionCheck: { symbol: '', min_quantity: 1 },
  fundCheck: { min_balance: 0 },
  timeWindow: { start: '09:15', end: '15:30' },
  andGate: {},
  orGate: {},
  notGate: {},
  telegramAlert: { message: 'Alert from Flow' },
  delay: { seconds: 1 },
  variable: { name: '', value: '' },
  mathExpression: { expression: '', variable: 'result' },
  log: { message: '' },
  httpRequest: { url: '', method: 'GET', headers: {}, body: {} },
  priceAlert: { symbol: '', exchange: 'NSE', condition: 'greater_than', threshold: 0 },
  webhookTrigger: {},
  start: {},
}
