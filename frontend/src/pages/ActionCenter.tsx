import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/Skeleton'
import Modal from '../components/ui/Modal'
import { useToastStore } from '../store/toast'
import { fetchPendingOrders, approveOrder, rejectOrder, type PendingOrder } from '../api/openalgo'
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Clock } from 'lucide-react'

export default function ActionCenter() {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<{ order: PendingOrder; reason: string } | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchPendingOrders()
      .then(setOrders)
      .catch((err) => addToast(`Failed to load pending orders: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleApprove = async (id: string) => {
    try {
      await approveOrder(id)
      addToast('Order approved', 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try {
      await rejectOrder(rejectModal.order.id, rejectModal.reason)
      addToast('Order rejected', 'success')
      setRejectModal(null)
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        {[1,2,3].map((i) => <Skeleton key={i} height={80} variant="rect" />)}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
            <AlertTriangle size={12} className="inline mr-1" /> Action Center
          </h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
        </div>
        <Card><EmptyState title="No pending orders" description="All orders have been processed" variant="empty" /></Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <AlertTriangle size={12} className="inline mr-1" /> Action Center
          <Badge label={`${orders.length} pending`} variant="warning" />
        </h2>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
      </div>

      {orders.map((order) => (
        <Card key={order.id} variant="highlight">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>{order.symbol}</span>
                <Badge label={order.side} variant={order.side === 'BUY' ? 'success' : 'error'} />
                <Badge label={order.order_type} variant="info" />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={9} className="inline mr-0.5" />
                  {new Date(order.submitted_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span>Qty: <strong>{order.quantity}</strong></span>
                <span>Price: <strong>{order.price.toFixed(2)}</strong></span>
                <span>Strategy: <strong>{order.strategy}</strong></span>
              </div>
              <div className="mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                {order.reason}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="primary" size="sm" onClick={() => handleApprove(order.id)}>
                <CheckCircle size={10} /> Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejectModal({ order, reason: '' })}>
                <XCircle size={10} /> Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Order" width={360}>
        <div className="flex flex-col gap-3">
          <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Reject {rejectModal?.order.symbol} {rejectModal?.order.side} order?
          </div>
          <input
            className="w-full px-2 py-1 text-[10px] font-mono rounded-sm outline-none"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            placeholder="Reason (optional)"
            value={rejectModal?.reason || ''}
            onChange={(e) => setRejectModal((prev) => prev ? { ...prev, reason: e.target.value } : null)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
