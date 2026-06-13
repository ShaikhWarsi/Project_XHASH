import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Spinner from '../components/Spinner'
import Badge from '../components/ui/Badge'
import Breadcrumbs from '../components/Breadcrumbs'
import { fetchMultiQuotes, type MultiQuoteEntry } from '../api/multiquotes'

const DEFAULT_SYMBOLS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'WIPRO',
]

export default function MultiQuotesPage() {
  const [symbolsText, setSymbolsText] = useState(DEFAULT_SYMBOLS.join(', '))
  const [quotes, setQuotes] = useState<MultiQuoteEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchQuotes = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const symbols = symbolsText.split(',').map(s => s.trim()).filter(Boolean)
      if (!symbols.length) { setError('Enter at least one symbol'); setLoading(false); return }
      const data = await fetchMultiQuotes(symbols.map(s => ({ symbol: s })))
      if (data.status !== 'success') { setError('API returned error'); setLoading(false); return }
      setQuotes(data.results || [])
      if (data.errors?.length) setError(`${data.errors.length} symbol(s) failed`)
    } catch (e: any) {
      setError(e.message || 'Failed to fetch quotes')
    } finally { setLoading(false) }
  }, [symbolsText])

  return (
    <div style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, height: '100%', overflow: 'auto' }}>
      <Breadcrumbs />
      <h1 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>MultiQuotes</h1>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <input
          value={symbolsText}
          onChange={e => setSymbolsText(e.target.value)}
          placeholder="RELIANCE, TCS, INFY, ..."
          style={{
            flex: 1, padding: '5px 8px', fontSize: 10, fontFamily: 'inherit',
            background: 'var(--bg-card)', border: '1px solid var(--border-color, #1a2332)',
            color: 'var(--text-primary)', borderRadius: 3,
          }}
        />
        <button onClick={fetchQuotes} disabled={loading} style={{
          padding: '5px 14px', fontSize: 10, cursor: 'pointer',
          background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 3,
        }}>{loading ? 'Fetching...' : 'Fetch'}</button>
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: 8 }}>{error}</div>}
      {loading && <Spinner label="Loading quotes..." />}
      {!loading && quotes.length > 0 && (
        <div className="grid gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {quotes.map((q, i) => (
            <Card key={i} title={`${q.symbol} (${q.exchange})`}>
              <QuoteRow label="LTP" value={q.ltp} change={q.change_percent} />
              <QuoteRow label="Open" value={q.open} />
              <QuoteRow label="High" value={q.high} />
              <QuoteRow label="Low" value={q.low} />
              <QuoteRow label="Prev Close" value={q.prev_close} />
              <QuoteRow label="Volume" value={q.volume.toLocaleString()} />
              <QuoteRow label="Bid/Ask" value={`${q.bid} / ${q.ask}`} />
              <QuoteRow label="52W H/L" value={`${q['52_week_high']} / ${q['52_week_low']}`} />
              <Badge label={`${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.change_percent.toFixed(2)}%)`} variant={q.change_percent >= 0 ? 'success' : 'error'} />
            </Card>
          ))}
        </div>
      )}
      {!loading && quotes.length === 0 && !error && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>Enter symbols and click Fetch</div>
      )}
    </div>
  )
}

function QuoteRow({ label, value, change }: { label: string; value: number | string; change?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: change !== undefined ? (change >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-primary)' }}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
}
