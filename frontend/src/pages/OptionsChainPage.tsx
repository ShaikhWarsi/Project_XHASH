import { useState, useCallback } from 'react'
import Breadcrumbs from '../components/Breadcrumbs'
import Card from '../components/ui/Card'
import Spinner from '../components/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useUrlState } from '../hooks/useUrlState'
import OptionsBuilder from '../components/OptionsBuilder'
import { useApiQuery } from '../hooks/useApiQuery'
import { fmtNumber } from '../utils/format'

interface OptionRow {
  strike: number
  lastPrice: number
  bid: number
  ask: number
  change: number
  percentChange: number
  volume: number
  openInterest: number
  impliedVolatility: number | null
  inTheMoney: boolean
  expiration: string
}

interface ChainData {
  symbol: string
  expiration: string
  expirations: string[]
  calls: OptionRow[]
  puts: OptionRow[]
}

const FONT_DATA = 'font-mono-data text-[11px]'
const FONT_SM = 'font-mono-data text-[10px]'

function OptionRow({ row, side }: { row: OptionRow; side: 'call' | 'put' }) {
  const color = side === 'call' ? 'var(--accent-green)' : 'var(--accent-red)'
  return (
    <div className="flex items-center border-b border-default py-0.5" style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
      <span className="w-20 text-right" style={{ color: row.inTheMoney ? color : 'var(--text-muted)', fontWeight: 600 }}>{row.strike.toFixed(1)}</span>
      <span className="w-16 text-right" style={{ color: 'var(--text-primary)' }}>{row.bid > 0 ? row.bid.toFixed(2) : '-'}</span>
      <span className="w-16 text-right" style={{ color: 'var(--text-primary)' }}>{row.ask > 0 ? row.ask.toFixed(2) : '-'}</span>
      <span className="w-16 text-right" style={{ color: row.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{row.change.toFixed(2)}</span>
      <span className="w-16 text-right" style={{ color: 'var(--text-primary)' }}>{fmtNumber(row.volume, 0)}</span>
      <span className="w-16 text-right" style={{ color: 'var(--accent-yellow)' }}>{fmtNumber(row.openInterest, 0)}</span>
      <span className="w-20 text-right" style={{ color: 'var(--accent-cyan)' }}>{row.impliedVolatility != null ? `${(row.impliedVolatility * 100).toFixed(1)}%` : '-'}</span>
    </div>
  )
}

export default function OptionsChainPage() {
  const [symbol, setSymbol] = useUrlState('symbol', 'SPY')
  const [input, setInput] = useState('SPY')
  const [sortBy, setSortBy] = useUrlState('sort', 'strike') as [string, (v: string) => void]
  const [chainTab, setChainTab] = useState<'chain' | 'builder' | 'scenario'>('chain')

  const { data, isLoading, error } = useApiQuery<ChainData>(symbol ? `/options/chain/${symbol}` : null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSymbol(input.toUpperCase())
  }

  const sortRows = (rows: OptionRow[]) => {
    const sorted = [...rows]
    if (sortBy === 'volume') sorted.sort((a, b) => b.volume - a.volume)
    else if (sortBy === 'oi') sorted.sort((a, b) => b.openInterest - a.openInterest)
    else sorted.sort((a, b) => a.strike - b.strike)
    return sorted.slice(0, 30)
  }

  const calls = data ? sortRows(data.calls) : []
  const puts = data ? sortRows(data.puts) : []

  return (
    <div className="flex flex-col gap-2 p-2">
      <Breadcrumbs />
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1">
        {(['chain', 'builder', 'scenario'] as const).map((t) => (
          <button key={t} onClick={() => setChainTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{
              background: chainTab === t ? 'rgba(59,130,246,0.15)' : 'none',
              border: 'none',
              color: chainTab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
            }}>
            {t === 'chain' ? 'CHAIN' : t === 'builder' ? 'BUILDER' : 'SCENARIO'}
          </button>
        ))}
      </div>

      {chainTab === 'builder' ? (
        <OptionsBuilder />
      ) : chainTab === 'scenario' ? (
        <OptionsBuilder />
      ) : (
      <>
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Options Chain</h1>
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            className="bg-input border border-input text-primary font-mono-data text-[11px] px-2 py-1 outline-none rounded-sm w-24"
            placeholder="Symbol"
          />
          <button type="submit" className="px-2 py-1 text-[10px] font-mono cursor-pointer border-none rounded-sm"
            style={{ background: 'var(--accent-cyan)', color: '#fff' }}>
            Load
          </button>
        </form>
      </div>

      {data && (
        <div className="text-[10px] font-mono-data" style={{ color: 'var(--text-muted)' }}>
          {data.symbol} — Expiration: <span style={{ color: 'var(--accent-cyan)' }}>{data.expiration}</span>
        </div>
      )}

      {isLoading && <Spinner label="Loading options chain..." />}
      {error && <EmptyState title={error.message} />}
      {!isLoading && !error && !data && (
        <EmptyState
          title="Enter a symbol to view options chain"
          sampleAction={{ label: 'Load AAPL options', onClick: () => { setInput('AAPL'); setSymbol('AAPL') } }}
        />
      )}

      {data && (
        <div className="grid grid-cols-2 gap-2">
          <Card title="CALLS">
            <div className="flex items-center border-b border-default py-0.5" style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
              <span className="w-20 text-right cursor-pointer" onClick={() => setSortBy('strike')}>Strike{sortBy === 'strike' ? ' ▼' : ''}</span>
              <span className="w-16 text-right">Bid</span>
              <span className="w-16 text-right">Ask</span>
              <span className="w-16 text-right cursor-pointer" onClick={() => setSortBy('volume')}>Chg{sortBy === 'volume' ? ' ▼' : ''}</span>
              <span className="w-16 text-right cursor-pointer" onClick={() => setSortBy('oi')}>Vol{sortBy === 'volume' ? '' : sortBy === 'oi' ? ' ▼' : ''}</span>
              <span className="w-16 text-right">OI</span>
              <span className="w-20 text-right">IV</span>
            </div>
            {calls.map((r, i) => <OptionRow key={i} row={r} side="call" />)}
            {calls.length === 0 && <div className="text-[10px] font-mono text-muted text-center py-4">No calls</div>}
          </Card>
          <Card title="PUTS">
            <div className="flex items-center border-b border-default py-0.5" style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
              <span className="w-20 text-right cursor-pointer" onClick={() => setSortBy('strike')}>Strike{sortBy === 'strike' ? ' ▼' : ''}</span>
              <span className="w-16 text-right">Bid</span>
              <span className="w-16 text-right">Ask</span>
              <span className="w-16 text-right">Chg</span>
              <span className="w-16 text-right">Vol</span>
              <span className="w-16 text-right">OI</span>
              <span className="w-20 text-right">IV</span>
            </div>
            {puts.map((r, i) => <OptionRow key={i} row={r} side="put" />)}
            {puts.length === 0 && <div className="text-[10px] font-mono text-muted text-center py-4">No puts</div>}
          </Card>
        </div>
      )}
      </>
      )}
    </div>
  )
}
