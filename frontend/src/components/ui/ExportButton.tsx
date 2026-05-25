import { Download } from 'lucide-react'
import { useToastStore } from '../../store/toast'

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename?: string
  label?: string
}

export default function ExportButton({ data, filename = 'export', label = 'CSV' }: ExportButtonProps) {
  const addToast = useToastStore((s) => s.addToast)

  const handleExport = () => {
    try {
      if (data.length === 0) {
        addToast('No data to export', 'error')
        return
      }
      const headers = Object.keys(data[0])
      const rows = data.map((row) =>
        headers.map((h) => {
          const v = row[h]
          return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v ?? '')
        }).join(',')
      )
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addToast(`Exported ${data.length} rows`, 'success')
    } catch {
      addToast('Export failed', 'error')
    }
  }

  return (
    <button
      onClick={handleExport}
      title="Export to CSV"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        padding: '2px 8px',
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <Download size={10} />
      {label}
    </button>
  )
}
