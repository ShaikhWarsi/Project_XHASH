import { useEffect, useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import Modal from '../components/ui/Modal'
import { useToastStore } from '../store/toast'
import { searchSymbols, getExchanges, getFreezeQty, setFreezeQty, getMarketHolidays, getMarketTimings, type getSymbolInfo } from '../api/symbols'
import { BookMarked, RefreshCw, Search, Snowflake, Calendar, Clock, ChevronDown, ChevronRight } from 'lucide-react'

interface SymbolRow {
  symbol: string
  brsymbol: string
  name: string | null
  exchange: string
  brexchange: string | null
  token: string | null
  lotsize: number | null
  tick_size: number | null
  instrumenttype: string | null
  contract_value: number | null
  expiry: string | null
  strike: number | null
  freeze_qty?: number
}

export default function MasterContractView() {
  const [query, setQuery] = useState('')
  const [exchange, setExchange] = useState('')
  const [exchanges, setExchanges] = useState<string[]>([])
  const [results, setResults] = useState<SymbolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolRow | null>(null)
  const [freezeModal, setFreezeModal] = useState<{ symbol: string; exchange: string; qty: number } | null>(null)
  const [holidays, setHolidays] = useState<any[] | null>(null)
  const [timings, setTimings] = useState<any | null>(null)
  const [showSidebar, setShowSidebar] = useState<'holidays' | 'timings' | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    getExchanges()
      .then(setExchanges)
      .catch((err) => console.warn('[MasterContractView] failed:', err))
  }, [])

  const doSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchSymbols(query, exchange || undefined, 50) as SymbolRow[]
      const enriched = await Promise.all(
        data.map(async (r: SymbolRow) => {
          try {
            const fq = await getFreezeQty(r.symbol, r.exchange)
            return { ...r, freeze_qty: fq }
          } catch {
            return { ...r, freeze_qty: 1000 }
          }
        })
      )
      setResults(enriched)
    } catch (err: any) {
      addToast(`Search failed: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [query, exchange, addToast])

  const loadHolidays = async () => {
    try {
      const res: any = await getMarketHolidays(new Date().getFullYear())
      setHolidays(res.data || [])
      setShowSidebar('holidays')
    } catch (err: any) {
      addToast(`Failed to load holidays: ${err?.message}`, 'error')
    }
  }

  const loadTimings = async () => {
    try {
      const res = await getMarketTimings()
      setTimings(res)
      setShowSidebar('timings')
    } catch (err: any) {
      addToast(`Failed to load timings: ${err?.message}`, 'error')
    }
  }

  const handleSetFreeze = async () => {
    if (!freezeModal) return
    try {
      await setFreezeQty(freezeModal.symbol, freezeModal.exchange, freezeModal.qty)
      addToast(`Freeze qty updated for ${freezeModal.symbol}`, 'success')
      setFreezeModal(null)
      doSearch()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const insTypeBadge = (t: string | null) => {
    const map: Record<string, { label: string; variant: 'info' | 'success' | 'warning' | 'default' }> = {
      spot: { label: 'Spot', variant: 'success' },
      perpetual: { label: 'Perp', variant: 'warning' },
      futures: { label: 'Futures', variant: 'info' },
      option: { label: 'Option', variant: 'default' },
    }
    const c = map[t?.toLowerCase() || ''] || { label: t || '—', variant: 'default' }
    return <Badge label={c.label} variant={c.variant as any} />
  }

  return (
    <div className="flex flex-col gap-1.5" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <BookMarked size={12} className="inline mr-1" /> Master Contract
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={loadHolidays} title="Market Holidays">
            <Calendar size={12} />
          </Button>
          <Button variant="ghost" size="sm" onClick={loadTimings} title="Market Timings">
            <Clock size={12} />
          </Button>
          <Button variant="ghost" size="sm" onClick={doSearch} disabled={loading}>
            <RefreshCw size={12} />
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5" style={{ flex: 1, minHeight: 0 }}>
        {/* Main */}
        <div className="flex flex-col gap-1.5" style={{ flex: 1, minWidth: 0 }}>
          {/* Search */}
          <Card padding="compact">
            <div className="flex items-center gap-2">
              <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Search symbol, name, or broker symbol..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'var(--font-size-xs)',
                }}
              />
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '2px 6px',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                }}
              >
                <option value="">All exchanges</option>
                {exchanges.map((ex) => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
              <Button variant="primary" size="sm" onClick={doSearch} disabled={loading || !query.trim()}>
                Search
              </Button>
            </div>
          </Card>

          {/* Results */}
          <div style={{ flex: 1, overflow: 'auto' }}>
          <Card padding="none">
            {loading ? (
              <div className="flex flex-col gap-1" style={{ padding: 8 }}>
                {[1,2,3,4,5].map((i) => <Skeleton key={i} height={24} variant="rect" />)}
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                {query ? 'No results found' : 'Search for a symbol to begin'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Symbol', 'Exchange', 'Name', 'Token', 'Type', 'Lot', 'Tick', 'Freeze Qty', ''].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 9, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={`${r.symbol}-${r.exchange}-${i}`}
                      onClick={() => setSelectedSymbol(selectedSymbol?.symbol === r.symbol && selectedSymbol?.exchange === r.exchange ? null : r)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: selectedSymbol?.symbol === r.symbol && selectedSymbol?.exchange === r.exchange ? 'var(--bg-hover)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (selectedSymbol?.symbol !== r.symbol || selectedSymbol?.exchange !== r.exchange) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { if (selectedSymbol?.symbol !== r.symbol || selectedSymbol?.exchange !== r.exchange) e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '4px 6px', fontWeight: 600 }}>{r.symbol}</td>
                      <td style={{ padding: '4px 6px' }}>{r.exchange}</td>
                      <td style={{ padding: '4px 6px', color: 'var(--text-secondary)' }}>{r.name || '—'}</td>
                      <td style={{ padding: '4px 6px' }}>{r.token || '—'}</td>
                      <td style={{ padding: '4px 6px' }}>{insTypeBadge(r.instrumenttype)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.lotsize ?? '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.tick_size ?? '—'}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.freeze_qty ?? '—'}</td>
                      <td style={{ padding: '4px 6px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFreezeModal({ symbol: r.symbol, exchange: r.exchange, qty: r.freeze_qty || 1000 })
                          }}
                        >
                          <Snowflake size={10} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          </div>

          {/* Detail panel */}
          {selectedSymbol && (
            <Card padding="compact">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{selectedSymbol.symbol}</span>
                <Badge label={selectedSymbol.exchange} variant="info" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 10 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> {selectedSymbol.name || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Broker Sym:</span> {selectedSymbol.brsymbol}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Token:</span> {selectedSymbol.token || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Broker Ex:</span> {selectedSymbol.brexchange || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> {selectedSymbol.instrumenttype || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Lot Size:</span> {selectedSymbol.lotsize ?? '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tick Size:</span> {selectedSymbol.tick_size ?? '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Contract Val:</span> {selectedSymbol.contract_value ?? '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Expiry:</span> {selectedSymbol.expiry || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Strike:</span> {selectedSymbol.strike ?? '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Freeze Qty:</span> {selectedSymbol.freeze_qty ?? '—'}</div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <Card
              title={showSidebar === 'holidays' ? 'Market Holidays' : 'Market Timings'}
              actions={
                <Button variant="ghost" size="sm" onClick={() => setShowSidebar(null)}>
                  <ChevronRight size={12} />
                </Button>
              }
              padding="compact"
            >
              {showSidebar === 'holidays' && holidays && (
                <div style={{ maxHeight: 400, overflow: 'auto', fontSize: 10 }}>
                  {holidays.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No holidays</div>
                  ) : (
                    holidays.map((h, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span>{h.date}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{h.description}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {showSidebar === 'timings' && timings && (
                <div style={{ fontSize: 10 }}>
                  <div className="mb-1"><span style={{ color: 'var(--text-muted)' }}>Indian Markets:</span></div>
                  <div style={{ paddingLeft: 8 }}>
                    <div>Status: <Badge label={timings.indian?.status || '—'} variant={timings.indian?.status === 'open' ? 'success' : 'warning'} /></div>
                    {timings.indian?.open && <div>Open: {timings.indian.open}</div>}
                    {timings.indian?.close && <div>Close: {timings.indian.close}</div>}
                    {timings.indian?.reason && <div style={{ color: 'var(--text-muted)' }}>{timings.indian.reason}</div>}
                  </div>
                  <div className="mt-1 mb-1"><span style={{ color: 'var(--text-muted)' }}>Crypto Markets (24/7):</span></div>
                  {(timings.crypto || []).map((c: any, i: number) => (
                    <div key={i} style={{ paddingLeft: 8 }}>{c.exchange}: {c.open} - {c.close} {c.timezone}</div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Freeze Qty Modal */}
      <Modal
        open={!!freezeModal}
        onClose={() => setFreezeModal(null)}
        title="Set Freeze Quantity"
        width={400}
      >
        {freezeModal && (
          <div className="flex flex-col gap-2" style={{ fontSize: 'var(--font-size-sm)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Symbol:</span>{' '}
              <span className="font-bold">{freezeModal.symbol}</span>
              {' '}<Badge label={freezeModal.exchange} variant="info" />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10 }}>Freeze Quantity</label>
              <input
                type="number"
                value={freezeModal.qty}
                onChange={(e) => setFreezeModal({ ...freezeModal, qty: parseInt(e.target.value) || 0 })}
                min={1}
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 'var(--font-size-sm)',
                  outline: 'none',
                  marginTop: 4,
                }}
              />
            </div>
            <div className="flex justify-end gap-1 mt-1">
              <Button variant="secondary" size="sm" onClick={() => setFreezeModal(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSetFreeze}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
