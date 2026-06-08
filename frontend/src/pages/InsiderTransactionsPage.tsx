import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

interface InsiderTransaction {
  date: string
  insider: string
  title: string
  transaction: string
  shares: number
  ownership: string
  type: string
}

export default function InsiderTransactionsPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [data, setData] = useState<{ symbol: string; transactions: InsiderTransaction[]; summary: { totalTransactions: number; buys: number; sells: number; sentiment: string } } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/alt-data/insider-transactions?symbol=${symbol}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load insider data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [symbol])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="INSIDER TRANSACTIONS (FORM 4)">
        <div className="flex items-center gap-2 mb-2">
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            className="bg-secondary border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary w-24"
            placeholder="Symbol"
          />
          <button onClick={fetchData} className="bg-accent-cyan/20 text-accent-cyan px-2 py-1 rounded text-[10px] font-mono-data hover:bg-accent-cyan/30">
            Load
          </button>
          {loading && <span className="text-[10px] text-muted animate-pulse">Loading...</span>}
          {error && <span className="text-[10px] text-red-400">{error}</span>}
        </div>

        {data?.summary && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">TOTAL</div>
              <div className="text-lg font-bold text-primary">{data.summary.totalTransactions}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">BUYS</div>
              <div className="text-lg font-bold text-green-400">{data.summary.buys}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SELLS</div>
              <div className="text-lg font-bold text-red-400">{data.summary.sells}</div>
            </div>
            <div className="bg-secondary rounded p-2 text-center">
              <div className="text-[9px] text-muted font-mono-data">SENTIMENT</div>
              <Badge
                label={data.summary.sentiment}
                variant={data.summary.sentiment === 'bullish' ? 'success' : data.summary.sentiment === 'bearish' ? 'error' : 'default'}
                size="sm"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_0.5fr_0.5fr] gap-1 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Date</span><span>Insider</span><span>Title</span><span>Transaction</span><span>Shares</span><span>Type</span>
        </div>

        {data?.transactions?.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_0.5fr_0.5fr] gap-1 py-1 border-b border-default text-[10px] font-mono-data text-primary">
            <span>{t.date}</span>
            <span className="font-semibold text-accent-cyan">{t.insider}</span>
            <span className="text-muted truncate">{t.title}</span>
            <span style={{ color: t.transaction?.toLowerCase().includes('buy') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {t.transaction}
            </span>
            <span>{t.shares.toLocaleString()}</span>
            <span className="text-muted truncate">{t.type}</span>
          </div>
        ))}

        {!data?.transactions?.length && !loading && <div className="py-6 text-center text-[10px] font-mono-data text-muted">Enter a symbol to view insider transactions.</div>}
      </Card>
    </div>
  )
}
