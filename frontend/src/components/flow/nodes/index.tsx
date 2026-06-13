import type { NodeProps } from '@xyflow/react'
import BaseNode from './BaseNode'
import { NODE_DEFINITIONS, type NodeDefinition } from '../../../types/flow'

export function getNodeDef(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS.find((d) => d.type === type)
}

function createNodeRenderer() {
  return function GenericNode(props: NodeProps) {
    const def = getNodeDef(props.type)
    const d = props.data as Record<string, unknown> || {}
    return (
      <BaseNode nodeProps={props}>
        <div className="flex flex-col gap-0.5">
          {def?.category === 'trigger' && <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Trigger</span>}
          {def?.category === 'action' && <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Action</span>}
          {def?.category === 'data' ? <span className="text-[8px]">{String(d.symbol ?? '')} {String(d.exchange ?? '')}</span> : null}
          {def?.category === 'condition' ? <span className="text-[8px]">{String(d.operator ?? '')} {String(d.value ?? '')}</span> : null}
          {def?.category === 'utility' ? <span className="text-[8px] truncate max-w-[120px]">{String(d.message ?? '')}</span> : null}
          {def?.category === 'action' ? <span className="text-[8px]">{String(d.action ?? '')} {String(d.quantity ?? '')} {String(d.symbol ?? '')}</span> : null}
          {!d.symbol && !d.message && !d.operator ? (
            <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Configure...</span>
          ) : null}
        </div>
      </BaseNode>
    )
  }
}

export const nodeTypes: Record<string, React.ComponentType<NodeProps>> = {
  start: createNodeRenderer(),
  webhookTrigger: createNodeRenderer(),
  priceAlert: createNodeRenderer(),
  placeOrder: createNodeRenderer(),
  smartOrder: createNodeRenderer(),
  basketOrder: createNodeRenderer(),
  splitOrder: createNodeRenderer(),
  cancelAllOrders: createNodeRenderer(),
  closePositions: createNodeRenderer(),
  placeGtt: createNodeRenderer(),
  getQuote: createNodeRenderer(),
  getFunds: createNodeRenderer(),
  openPosition: createNodeRenderer(),
  orderBook: createNodeRenderer(),
  gttOrderbook: createNodeRenderer(),
  priceCondition: createNodeRenderer(),
  positionCheck: createNodeRenderer(),
  fundCheck: createNodeRenderer(),
  timeWindow: createNodeRenderer(),
  andGate: createNodeRenderer(),
  orGate: createNodeRenderer(),
  notGate: createNodeRenderer(),
  telegramAlert: createNodeRenderer(),
  delay: createNodeRenderer(),
  variable: createNodeRenderer(),
  mathExpression: createNodeRenderer(),
  log: createNodeRenderer(),
  httpRequest: createNodeRenderer(),
}
