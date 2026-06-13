import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import DataTable from '../components/ui/DataTable'
import { useToastStore } from '../store/toast'
import { fetchMasterContractStatus, triggerMasterContractDownload, type MasterContractStatus } from '../api/openalgo'
import { BookMarked, RefreshCw, Download } from 'lucide-react'

export default function MasterContractStatusPage() {
  const [statuses, setStatuses] = useState<MasterContractStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  const load = () => {
    setLoading(true)
    fetchMasterContractStatus()
      .then(setStatuses)
      .catch((err) => addToast(`Failed to load: ${err?.message}`, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDownload = async (exchange: string) => {
    setDownloading(exchange)
    try {
      await triggerMasterContractDownload(exchange)
      addToast(`Download started for ${exchange}`, 'success')
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setDownloading(null)
    }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'error' }> = {
      up_to_date: { label: 'Up to Date', variant: 'success' },
      stale: { label: 'Stale', variant: 'warning' },
      downloading: { label: 'Downloading', variant: 'info' },
      not_downloaded: { label: 'Not Downloaded', variant: 'error' },
    }
    const c = map[s] || { label: s, variant: 'default' as const }
    return <Badge label={c.label} variant={c.variant} />
  }

  const columns = [
    { key: 'exchange', label: 'Exchange', render: (s: MasterContractStatus) => <span className="font-bold text-[10px]">{s.exchange}</span>, sortable: true, sortValue: (s: MasterContractStatus) => s.exchange },
    { key: 'symbols', label: 'Symbols', render: (s: MasterContractStatus) => s.symbol_count.toLocaleString(), align: 'right' as const, sortable: true, sortValue: (s: MasterContractStatus) => s.symbol_count },
    { key: 'status', label: 'Status', render: (s: MasterContractStatus) => statusBadge(s.status) },
    { key: 'last', label: 'Last Download', render: (s: MasterContractStatus) => s.last_download ? new Date(s.last_download).toLocaleString() : '—' },
    { key: 'next', label: 'Next Scheduled', render: (s: MasterContractStatus) => s.next_scheduled ? new Date(s.next_scheduled).toLocaleString() : '—' },
    { key: 'actions', label: 'Actions', render: (s: MasterContractStatus) => (
      <Button variant="secondary" size="sm" onClick={() => handleDownload(s.exchange)} disabled={downloading === s.exchange}>
        <Download size={10} /> {downloading === s.exchange ? '...' : 'Download'}
      </Button>
    )},
  ]

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={200} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <BookMarked size={12} className="inline mr-1" /> Master Contract Status
        </h2>
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
      </div>

      <Card>
        <DataTable columns={columns as any} data={statuses as any} searchable={false} exportable={false} />
      </Card>
    </div>
  )
}
