import { useEffect, useState, useCallback } from 'react'
import OrderEntryPanel from '../components/OrderEntryPanel'
import OrderBook from '../components/OrderBook'
import PositionTable from '../components/PositionTable'
import TimeAndSales from '../components/TimeAndSales'
import Card from '../components/ui/Card'
import Skeleton from '../components/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ExportButton from '../components/ui/ExportButton'
import ErrorBoundary from '../components/ErrorBoundary'
import BatchOperations from '../components/BatchOperations'
import { fetchOrders, fetchPositions, cancelOrder } from '../api/client'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToastStore } from '../store/toast'
import { useAudio } from '../contexts/AudioAlertContext'
import { useUrlState } from '../hooks/useUrlState'
import { useUndoRedo } from '../components/UndoRedoManager'
import type { OrderResponse, PositionExtended } from '../api/types'

const PAGE_SIZE = 50

export default function Orders() {
  const addToast = useToastStore((s) => s.addToast)
  const { playSuccess, playError } = useAudio()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [positions, setPositions] = useState<PositionExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open')
  const [page, setPage] = useState(0)
  const [filterStatus, setFilterStatus] = useUrlState('filter', 'all')
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelection, setBatchSelection] = useState<string[]>([])
  const { push: pushUndo, undo, redo, canUndo, canRedo, reset: resetUndo } = useUndoRedo<OrderResponse[]>(orders)

  const wsOrders = useWebSocket<{ type: string; data: OrderResponse[] }>('/api/ws/orders', { maxRetries: 999 })

  useEffect(() => {
    if (wsOrders.lastData?.type === 'orders' && Array.isArray(wsOrders.lastData.data)) {
      setOrders(wsOrders.lastData.data)
    }
  }, [wsOrders.lastData])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [fetchedOrders, fetchedPositions] = await Promise.all([
        fetchOrders(),
        fetchPositions(),
      ])
      setOrders(fetchedOrders)
      setPositions(fetchedPositions)
      pushUndo(fetchedOrders, 'load orders')
    } catch (err: any) {
      addToast(`Failed to load order data: ${err?.message || 'Unknown error'}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadData() }, [loadData])

  const handleCancel = async (orderId: string) => {
    try {
      await cancelOrder(orderId)
      addToast('Order cancelled', 'success')
      playSuccess()
      loadData()
    } catch (err: any) {
      addToast(`Failed to cancel order: ${err?.message || 'Unknown error'}`, 'error')
      playError()
    }
  }

  const handleUndo = () => {
    const prev = undo()
    if (prev) setOrders(prev)
  }

  const handleRedo = () => {
    const next = redo()
    if (next) setOrders(next)
  }

  const handleClosePosition = async (symbol: string) => {
    addToast(`Closing position for ${symbol}`, 'info')
  }

  const openOrders = orders.filter((o) => ['NEW', 'PARTIALLY_FILLED', 'ACCEPTED'].includes(o.status))
  const historyOrders = orders.filter((o) => !['NEW', 'PARTIALLY_FILLED', 'ACCEPTED'].includes(o.status))
  const baseOrders = activeTab === 'open' ? openOrders : historyOrders
  const activeOrders = filterStatus === 'all' ? baseOrders : baseOrders.filter((o) => o.status === filterStatus)
  const pagedOrders = activeOrders.slice(0, (page + 1) * PAGE_SIZE)
  const hasMore = pagedOrders.length < activeOrders.length

  return (
    <div className="grid grid-cols-[1fr_2fr] gap-1.5">
      <div className="flex flex-col gap-1.5">
        <ErrorBoundary>
          <Card title="ORDER ENTRY">
            <OrderEntryPanel onOrderPlaced={() => { playSuccess(); loadData() }} />
          </Card>
        </ErrorBoundary>
        <ErrorBoundary>
          <Card title="TIME & SALES">
            <TimeAndSales symbol="AAPL" />
          </Card>
        </ErrorBoundary>
      </div>

      <div className="flex flex-col gap-1.5">
        <ErrorBoundary>
          <Card title={`POSITIONS (${positions.length})`}>
            {loading ? (
              <Skeleton count={3} height={20} />
            ) : (
              <PositionTable positions={positions} onClose={handleClosePosition} />
            )}
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card title={`ORDERS — ${activeTab.toUpperCase()}`} actions={
            <div className="flex gap-1 items-center">
              <button onClick={() => setBatchMode(!batchMode)}
                className={`font-mono-data text-[10px] px-2 py-0.5 cursor-pointer border border-default rounded-sm ${
                  batchMode ? 'bg-accent-cyan text-black' : 'bg-hover text-secondary'
                }`}>
                {batchMode ? 'DONE' : 'BATCH'}
              </button>
              <button onClick={handleUndo} disabled={!canUndo}
                className={`font-mono-data text-[10px] px-2 py-0.5 border border-default rounded-sm ${
                  canUndo ? 'bg-hover text-primary cursor-pointer' : 'cursor-default opacity-40 text-muted'
                }`}>
                UNDO
              </button>
              <button onClick={handleRedo} disabled={!canRedo}
                className={`font-mono-data text-[10px] px-2 py-0.5 border border-default rounded-sm ${
                  canRedo ? 'bg-hover text-primary cursor-pointer' : 'cursor-default opacity-40 text-muted'
                }`}>
                REDO
              </button>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none rounded-sm">
                <option value="all">ALL</option>
                <option value="NEW">NEW</option>
                <option value="PARTIALLY_FILLED">PARTIAL</option>
                <option value="FILLED">FILLED</option>
                <option value="CANCELED">CANCELED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <ExportButton data={activeOrders as unknown as Record<string, unknown>[]} filename={`orders-${activeTab}`} />
            </div>
          }>
            <div className="flex border-b border-default mb-0">
              {(['open', 'history'] as const).map((tab) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setPage(0) }}
                  className={`font-mono-data text-[9px] tracking-wider uppercase px-3 py-1 bg-none border-none cursor-pointer transition-colors ${
                    activeTab === tab ? 'text-accent-cyan border-b-2 border-accent-cyan' : 'text-muted border-b-2 border-transparent'
                  }`}>
                  {tab} ({tab === 'open' ? openOrders.length : historyOrders.length})
                </button>
              ))}
            </div>
            {batchMode && (
              <div className="py-1 border-b border-default mb-1">
                <BatchOperations
                  items={activeOrders.map((o) => ({
                    id: o.id,
                    label: `${o.symbol} ${o.side} ${o.quantity} @ ${o.price || 'MKT'}`,
                    selected: batchSelection.includes(o.id),
                  }))}
                  onSelectionChange={setBatchSelection}
                  onBatchAction={(action, ids) => {
                    if (action === 'cancel') {
                      ids.forEach((id) => handleCancel(id))
                    }
                    if (action === 'modify') {
                      ids.forEach((id) => {
                        const order = activeOrders.find((o) => o.id === id)
                        if (order) {
                          handleCancel(id)
                          addToast(`Order ${id} cancelled for modification`, 'info')
                        }
                      })
                    }
                    setBatchMode(false)
                    setBatchSelection([])
                  }}
                />
              </div>
            )}
            {loading ? (
              <Skeleton count={4} height={16} />
            ) : activeOrders.length > 0 ? (
              <>
                <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.8fr_0.8fr_0.7fr_0.6fr] py-1 border-b border-default font-mono-data text-[9px] tracking-wider text-muted">
                  <span>Symbol</span><span className="text-right">Side</span><span className="text-right">Type</span><span className="text-right">Qty</span><span className="text-right">Filled</span><span className="text-right">Price</span><span className="text-right">Status</span><span className="text-right">Time</span><span />
                </div>
                {pagedOrders.map((order) => (
                  <div key={order.id} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.8fr_0.8fr_0.7fr_0.6fr] py-[3px] border-b border-default font-mono-data text-[11px] text-primary">
                    <span className="text-accent-cyan font-semibold">{order.symbol}</span>
                    <span className={`text-right ${['BUY', 'BUY_TO_COVER'].includes(order.side) ? 'text-up' : 'text-down'}`}>{order.side.replace('_', ' ')}</span>
                    <span className="text-right text-secondary">{order.orderType.replace('_', ' ')}</span>
                    <span className="text-right">{order.quantity}</span>
                    <span className="text-right text-secondary">{order.filledQuantity}</span>
                    <span className="text-right">{order.price ? `$${order.price.toFixed(2)}` : '—'}</span>
                    <span className={`text-right ${
                      order.status === 'FILLED' ? 'text-up' :
                      ['REJECTED', 'CANCELED'].includes(order.status) ? 'text-down' : 'text-accent-yellow'
                    }`}>{order.status.replace('_', ' ')}</span>
                    <span className="text-right text-muted font-mono-data text-[10px]">{new Date(order.createdAt).toLocaleTimeString()}</span>
                    <span className="text-right">
                      {activeTab === 'open' && (
                        <button onClick={() => handleCancel(order.id)}
                          className="font-mono-data text-[10px] px-1.5 py-px cursor-pointer border text-down rounded-sm"
                          style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.3)' }}>
                          CANCEL
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                {hasMore && (
                  <div className="py-1.5 text-center">
                    <button onClick={() => setPage((p) => p + 1)}
                      className="font-mono-data text-[10px] px-3 py-0.5 cursor-pointer text-accent-cyan border border-default bg-none rounded-sm">
                      SHOW MORE ({activeOrders.length - pagedOrders.length})
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title={`No ${activeTab} orders`} compact />
            )}
          </Card>
        </ErrorBoundary>

        <ErrorBoundary>
          <Card title="ORDER BOOK">
            <OrderBook symbol="AAPL" />
          </Card>
        </ErrorBoundary>
      </div>
    </div>
  )
}
