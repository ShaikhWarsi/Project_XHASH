import { useRef, useState, useCallback, useMemo, type ReactNode } from 'react'
import { Download, Search, Eye, EyeOff } from 'lucide-react'
import { useToastStore } from '../../store/toast'

interface Column<T> {
  key: string
  label: string
  render: (item: T) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  sortValue?: (item: T) => number | string
  filterable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowHeight?: number
  visibleRows?: number
  onRowClick?: (item: T) => void
  emptyMessage?: string
  searchable?: boolean
  searchPlaceholder?: string
  exportable?: boolean
  exportFilename?: string
  filterable?: boolean
  columnVisibility?: boolean
  compact?: boolean
}

export default function DataTable<T extends { id?: string }>({
  columns, data, rowHeight = 28, visibleRows = 20,
  onRowClick, emptyMessage = 'No data',
  searchable = true, searchPlaceholder = 'Search...',
  exportable = true, exportFilename = 'export',
  filterable = true, columnVisibility = true,
  compact = false,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, true]))
  )
  const [showColMenu, setShowColMenu] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const addToast = useToastStore((s) => s.addToast)

  const activeCols = columns.filter((c) => visibleCols[c.key] !== false)

  const filtered = useMemo(() => {
    let result = [...data]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((item) =>
        columns.some((c) => {
          const v = c.render(item)
          return String(v).toLowerCase().includes(q)
        })
      )
    }

    for (const [key, val] of Object.entries(filterValues)) {
      if (!val) continue
      const q = val.toLowerCase()
      result = result.filter((item) => {
        const col = columns.find((c) => c.key === key)
        if (!col) return true
        return String(col.render(item)).toLowerCase().includes(q)
      })
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      if (col?.sortValue) {
        result.sort((a, b) => {
          const va = col.sortValue!(a)
          const vb = col.sortValue!(b)
          const cmp = va < vb ? -1 : va > vb ? 1 : 0
          return sortDir === 'asc' ? cmp : -cmp
        })
      }
    }

    return result
  }, [data, search, sortKey, sortDir, columns, filterValues])

  const totalHeight = filtered.length * rowHeight
  const startIdx = Math.floor(scrollTop / rowHeight)
  const endIdx = Math.min(startIdx + visibleRows + 5, filtered.length)

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop)
  }, [])

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleExport = () => {
    try {
      if (filtered.length === 0) {
        addToast('No data to export', 'error')
        return
      }
      const headers = activeCols.map((c) => c.label)
      const rows = filtered.map((row) =>
        activeCols.map((c) => {
          const v = c.render(row)
          const s = typeof v === 'string' ? v : String(v ?? '')
          return s.includes(',') ? `"${s}"` : s
        }).join(',')
      )
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addToast(`Exported ${filtered.length} rows`, 'success')
    } catch {
      addToast('Export failed', 'error')
    }
  }

  const colGrid = activeCols.map((c) => c.width || '1fr').join(' ')

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: compact ? 9 : 10 }}>
      {/* Toolbar */}
      {(searchable || exportable || columnVisibility) && (
        <div className="flex items-center gap-2 mb-1.5" style={{ minHeight: 24 }}>
          {searchable && (
            <div className="flex items-center gap-1 flex-1">
              <Search size={10} style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 px-1.5 py-0.5 text-[10px] font-mono outline-none rounded-sm"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--input-text)',
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-1">
            {filtered.length !== data.length && (
              <span className="text-[9px] font-mono px-1 py-0.5 rounded-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                {filtered.length}/{data.length}
              </span>
            )}
            {exportable && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm"
                style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              >
                <Download size={8} />
                CSV
              </button>
            )}
            {columnVisibility && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowColMenu(!showColMenu)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm"
                  style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                >
                  {showColMenu ? <EyeOff size={8} /> : <Eye size={8} />}
                  Cols
                </button>
                {showColMenu && (
                  <div
                    className="absolute top-full right-0 z-30 mt-0.5 rounded-sm p-1"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      minWidth: 120,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {columns.map((c) => (
                      <label
                        key={c.key}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <input
                          type="checkbox"
                          checked={visibleCols[c.key] !== false}
                          onChange={() => setVisibleCols((v) => ({ ...v, [c.key]: v[c.key] === false }))}
                          style={{ accentColor: 'var(--accent-cyan)' }}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: colGrid,
          borderBottom: '1px solid var(--border-color)',
          color: 'var(--text-muted)', fontSize: compact ? 8 : 9,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
      >
        {activeCols.map((c) => (
          <div
            key={c.key}
            onClick={() => c.sortable && toggleSort(c.key)}
            style={{
              padding: compact ? '2px 6px' : '4px 8px', textAlign: c.align || 'left',
              cursor: c.sortable ? 'pointer' : 'default',
              color: sortKey === c.key ? 'var(--accent-cyan)' : undefined,
            }}
          >
            {c.label}{sortKey === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
          </div>
        ))}
      </div>

      {/* Body */}
      <div ref={containerRef} onScroll={handleScroll} style={{ overflowY: 'auto', maxHeight: rowHeight * visibleRows, position: 'relative' }}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {filtered.slice(startIdx, endIdx).map((item, i) => (
            <div
              key={(item as any).id || startIdx + i}
              onClick={() => onRowClick?.(item)}
              style={{
                position: 'absolute', top: (startIdx + i) * rowHeight, left: 0, right: 0,
                height: rowHeight, display: 'grid', gridTemplateColumns: colGrid,
                alignItems: 'center', borderBottom: '1px solid var(--border-color)',
                cursor: onRowClick ? 'pointer' : 'default',
                fontSize: compact ? 9 : 10,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {activeCols.map((c) => (
                <div key={c.key} style={{ padding: compact ? '1px 6px' : '2px 8px', textAlign: c.align || 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.render(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: compact ? 12 : 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: compact ? 9 : 10 }}>
            {search || Object.keys(filterValues).length ? 'No matching results' : emptyMessage}
          </div>
        )}
      </div>
    </div>
  )
}
