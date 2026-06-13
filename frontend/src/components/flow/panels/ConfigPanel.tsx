import Input from '../../ui/Input'
import Select from '../../ui/Select'
import { useFlowWorkflowStore } from '../../../stores/flowWorkflowStore'
import { getNodeDef } from '../nodes'
import { NODE_DEFAULTS } from '../../../types/flow'

const SYMBOL_FIELDS = ['symbol', 'source', 'target']
const NUMBER_FIELDS = ['quantity', 'price', 'value', 'threshold', 'seconds', 'min_balance', 'min_quantity', 'total_quantity', 'split_count']
const TEXT_FIELDS = ['name', 'message', 'expression', 'variable', 'url', 'strategy']
const SELECT_FIELDS: Record<string, { value: string; label: string }[]> = {
  exchange: [
    { value: 'NSE', label: 'NSE' },
    { value: 'BSE', label: 'BSE' },
    { value: 'NFO', label: 'NFO' },
    { value: 'MCX', label: 'MCX' },
  ],
  action: [
    { value: 'BUY', label: 'BUY' },
    { value: 'SELL', label: 'SELL' },
  ],
  product: [
    { value: 'MIS', label: 'MIS' },
    { value: 'CNC', label: 'CNC' },
    { value: 'NRML', label: 'NRML' },
  ],
  pricetype: [
    { value: 'MARKET', label: 'MARKET' },
    { value: 'LIMIT', label: 'LIMIT' },
    { value: 'SL', label: 'SL' },
    { value: 'SL-M', label: 'SL-M' },
  ],
  trigger_type: [
    { value: 'SINGLE', label: 'SINGLE' },
    { value: 'OCO', label: 'OCO' },
  ],
  operator: [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'equals', label: 'Equals' },
  ],
  condition: [
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'crossing_up', label: 'Crosses Above' },
    { value: 'crossing_down', label: 'Crosses Below' },
  ],
  method: [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
  ],
}

export default function ConfigPanel() {
  const selectedNode = useFlowWorkflowStore((s) => s.selectedNode)
  const updateNodeData = useFlowWorkflowStore((s) => s.updateNodeData)

  if (!selectedNode) {
    return (
      <div
        className="rounded-sm p-3 text-[9px] font-mono"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
          width: 220,
        }}
      >
        Select a node to configure
      </div>
    )
  }

  const def = selectedNode.type ? getNodeDef(selectedNode.type) : null
  const data = selectedNode.data || {}
  const defaults = selectedNode.type ? (NODE_DEFAULTS[selectedNode.type] || {}) : {}

  const set = (key: string, value: any) => {
    updateNodeData(selectedNode.id, { [key]: value })
  }

  const keys = Object.keys(defaults)

  return (
    <div
      className="rounded-sm flex flex-col"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        width: 220,
        maxHeight: '60vh',
        overflow: 'auto',
      }}
    >
      <div
        className="text-[9px] font-semibold font-mono px-2.5 py-1.5 border-b uppercase tracking-wider"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
      >
        {def?.label || selectedNode.type}
      </div>

      <div className="flex flex-col gap-2 p-2.5">
        {keys.map((key) => {
          const val = data[key] ?? defaults[key] ?? ''

          if (SELECT_FIELDS[key]) {
            const opts = SELECT_FIELDS[key]
            return (
              <Select
                key={key}
                label={key}
                options={opts}
                value={String(val)}
                onChange={(e) => set(key, e.target.value)}
              />
            )
          }
          if (NUMBER_FIELDS.includes(key)) {
            return (
              <Input
                key={key}
                label={key}
                type="number"
                step="any"
                value={val}
                onChange={(e) => set(key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            )
          }
          if (SYMBOL_FIELDS.includes(key) || TEXT_FIELDS.includes(key) || typeof val === 'string') {
            return (
              <Input
                key={key}
                label={key}
                value={String(val)}
                onChange={(e) => set(key, e.target.value)}
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
