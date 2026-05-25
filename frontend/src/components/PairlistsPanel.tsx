import { useEffect, useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import { fetchPairlistFilters, applyPairlistFilters } from '../api/pairlists'
import type { PairlistFilter, PairlistApplyResult } from '../api/pairlists'
import { useToastStore } from '../store/toast'

const FONT_SM = { fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }
const FONT_LABEL = { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }

const DEFAULT_SYMBOLS = 'AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,MA,UNH,HD,DIS,KO,PEP,NFLX,INTC,AMD,BA,CAT'

export default function PairlistsPanel() {
  const addToast = useToastStore((s) => s.addToast)
  const [filters, setFilters] = useState<PairlistFilter[]>([])
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOLS)
  const [minVol, setMinVol] = useState(0)
  const [maxVol, _setMaxVol] = useState(0)
  const [maxSpread, setMaxSpread] = useState(0.01)
  const [minPrice, setMinPrice] = useState(1)
  const [result, setResult] = useState<PairlistApplyResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPairlistFilters()
      .then((r) => setFilters(r.filters))
      .catch((err) => { console.warn('PairlistsPanel: filters failed', err); addToast('Failed to load pairlist filters', 'error') })
  }, [])

  const run = async () => {
    setLoading(true)
    setResult(null)
    try {
      const symbols = symbolInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      const res = await applyPairlistFilters({
        symbols,
        min_volume: minVol,
        max_volume: maxVol || undefined,
        max_spread_pct: maxSpread,
        min_price: minPrice,
      })
      setResult(res)
    } catch (err) {
      addToast('Pairlist filtering failed', 'error')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Card title="SYMBOL FILTER" padding="compact">
        <div>
          <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>SYMBOLS (comma-separated)</div>
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
              ...FONT_SM,
              padding: '2px 6px',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginTop: 4 }}>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MIN VOLUME</div>
            <input
              type="number"
              value={minVol}
              onChange={(e) => setMinVol(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MAX SPREAD</div>
            <input
              type="number"
              value={maxSpread}
              onChange={(e) => setMaxSpread(Number(e.target.value))}
              step={0.001}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
          <div>
            <div style={{ ...FONT_LABEL, color: 'var(--text-muted)' }}>MIN PRICE $</div>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                ...FONT_SM,
                padding: '2px 6px',
                outline: 'none',
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <button
            onClick={run}
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent-cyan)',
              color: '#000',
              border: 'none',
              padding: '4px 0',
              ...FONT_SM,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'FILTERING...' : 'APPLY FILTERS'}
          </button>
        </div>
      </Card>

      {result && (
        <Card title={`RESULTS (${result.passed}/${result.total} PASSED)`} padding="compact">
          {result.passing_symbols.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {result.passing_symbols.map((sym) => (
                <Badge key={sym} label={sym} variant="success" />
              ))}
            </div>
          ) : (
            <div style={{ ...FONT_SM, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
              No symbols passed all filters
            </div>
          )}
          {result.results.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ ...FONT_LABEL, color: 'var(--text-muted)', marginBottom: 4 }}>DETAILS</div>
              {result.results.filter((r) => !r.passed).slice(0, 10).map((r) => (
                <div key={r.symbol} style={{ display: 'flex', justifyContent: 'space-between', ...FONT_SM, padding: '1px 0', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-cyan)' }}>{r.symbol}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{r.reason}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {filters.length > 0 && (
        <Card title="AVAILABLE FILTERS" padding="compact">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {filters.map((f) => (
              <div
                key={f.name}
                style={{
                  padding: '2px 8px',
                  background: 'var(--bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  ...FONT_SM,
                  color: 'var(--text-muted)',
                }}
                title={f.description}
              >
                {f.name}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
