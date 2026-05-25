import { useState, useCallback, useEffect } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import CorrelationHeatmap from '../components/CorrelationHeatmap'
import { fetchTables, runQuery, fetchDailyReturns, fetchCorrelation } from '../api/research'
import type { TableInfo, QueryResult, DailyReturns } from '../api/research'

export default function SqlResearch() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [query, setQuery] = useState('SELECT * FROM market_data LIMIT 10')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [querying, setQuerying] = useState(false)
  const [dailyReturns, setDailyReturns] = useState<DailyReturns[]>([])
  const [corrAssets, setCorrAssets] = useState('AAPL,MSFT,GOOGL')
  const [corrMatrix, setCorrMatrix] = useState<number[][] | null>(null)
  const [tab, setTab] = useState<'query' | 'correlation' | 'daily'>('query')

  useEffect(() => {
    fetchTables().then((res) => setTables(res.tables)).catch(() => {})
  }, [])

  const handleQuery = useCallback(async () => {
    setQuerying(true)
    setQueryError(null)
    setResult(null)
    try {
      const res = await runQuery(query)
      setResult(res)
    } catch (err: any) {
      setQueryError(err?.message || 'Query failed')
    }
    setQuerying(false)
  }, [query])

  const handleCorrelation = useCallback(async () => {
    try {
      const assets = corrAssets.split(',').map((s) => s.trim()).filter(Boolean)
      const res = await fetchCorrelation(assets)
      setCorrMatrix(res.matrix)
    } catch (err: any) {
      setQueryError(err?.message || 'Correlation failed')
    }
  }, [corrAssets])

  const loadDailyReturns = useCallback(async () => {
    try {
      const res = await fetchDailyReturns()
      setDailyReturns(res.data)
    } catch (err: any) {
      setQueryError(err?.message || 'Failed to load daily returns')
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        {(['query', 'correlation', 'daily'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-[10px] font-mono font-semibold cursor-pointer rounded-sm border border-default ${
              tab === t ? 'bg-accent-cyan text-black' : 'bg-hover text-secondary'
            }`}
          >
            {t === 'query' ? 'SQL Query' : t === 'correlation' ? 'Correlation' : 'Daily Returns'}
          </button>
        ))}
        <Badge label={`${tables.length} tables`} variant="info" />
      </div>

      {tab === 'query' && (
        <div className="flex flex-col gap-1.5">
          {tables.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {tables.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setQuery(`SELECT * FROM ${t.name} LIMIT 10`)}
                  className="px-2 py-0.5 text-[9px] font-mono cursor-pointer rounded-sm bg-hover border border-default text-secondary"
                >
                  {t.name} ({t.columns.length} cols)
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 font-mono text-[11px] p-2 outline-none rounded-sm bg-input border border-input text-primary min-h-[60px] resize-y"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuery() }}
            />
          </div>

          <button
            onClick={handleQuery}
            disabled={querying}
            className="self-start px-4 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm bg-accent-blue text-white border-none disabled:opacity-60"
          >
            {querying ? 'RUNNING...' : 'RUN (⌘⏎)'}
          </button>

          {queryError && (
            <div className="text-[10px] font-mono p-2 rounded-sm text-down" style={{ background: 'rgba(239,68,68,0.1)' }}>
              {queryError}
            </div>
          )}

          {result && (
            <Card title={`RESULTS (${result.rows.length} rows)`}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono-data text-[10px]">
                  <thead>
                    <tr className="border-b-2 border-default">
                      {result.columns.map((col) => (
                        <th key={col} className="px-2 py-1 text-left whitespace-nowrap font-mono-data text-[9px] tracking-wider text-muted">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-b border-default">
                        {row.map((val: any, j: number) => (
                          <td key={j} className="px-2 py-0.5 whitespace-nowrap text-secondary">
                            {val === null ? <span className="text-muted">NULL</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'correlation' && (
        <Card title="ASSET CORRELATION">
          <div className="flex items-center gap-2 mb-3">
            <input
              value={corrAssets}
              onChange={(e) => setCorrAssets(e.target.value)}
              className="flex-1 px-2 py-1 text-[10px] font-mono outline-none rounded-sm bg-input border border-input text-primary"
              placeholder="AAPL,MSFT,GOOGL"
            />
            <button
              onClick={handleCorrelation}
              className="px-3 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm bg-accent-blue text-white border-none"
            >
              COMPUTE
            </button>
          </div>
          {corrMatrix && (
            <CorrelationHeatmap
              data={{
                symbols: corrAssets.split(',').map((s) => s.trim()).filter(Boolean),
                matrix: corrMatrix,
              }}
              cellSize={44}
            />
          )}
        </Card>
      )}

      {tab === 'daily' && (
        <Card title="DAILY RETURNS">
          <button
            onClick={loadDailyReturns}
            className="mb-3 px-3 py-1 text-[10px] font-mono font-bold cursor-pointer rounded-sm bg-accent-blue text-white border-none"
          >
            LOAD DATA
          </button>
          {dailyReturns.length > 0 && (
            <div className="overflow-x-auto" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="w-full border-collapse font-mono-data text-[10px]">
                <thead>
                  <tr className="border-b-2 border-default">
                    <th className="px-2 py-1 text-left sticky top-0 font-mono-data text-[9px] tracking-wider text-muted" style={{ background: 'var(--bg-card)' }}>Date</th>
                    {Object.keys(dailyReturns[0].returns).map((asset) => (
                      <th key={asset} className="px-2 py-1 text-right sticky top-0 font-mono-data text-[9px] tracking-wider text-muted" style={{ background: 'var(--bg-card)' }}>
                        {asset}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyReturns.map((d) => (
                    <tr key={d.date} className="border-b border-default">
                      <td className="px-2 py-0.5 font-medium text-primary">{d.date}</td>
                      {Object.entries(d.returns).map(([asset, ret]) => (
                        <td
                          key={asset}
                          className={`px-2 py-0.5 text-right font-mono-data text-[10px] ${ret >= 0 ? 'text-up' : 'text-down'}`}
                        >
                          {(ret * 100).toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
