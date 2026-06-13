import { useEffect, useState } from 'react'
import Card, { CardGrid } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import {
  fetchOHLCV, downloadHistory, fetchDownloadJobs, cancelJob,
  fetchWatchlist, addToWatchlist, removeFromWatchlist, exportCSV,
  fetchSchedules, createSchedule, deleteSchedule,
} from '../api/historify'
import { Database, Download, Eye, Trash2, Plus, Clock, RefreshCw, XCircle, BarChart3 } from 'lucide-react'

const EXCHANGES = [
  { value: 'NSE', label: 'NSE' },
  { value: 'BSE', label: 'BSE' },
  { value: 'NYSE', label: 'NYSE' },
  { value: 'NASDAQ', label: 'NASDAQ' },
  { value: 'BINANCE', label: 'Binance' },
]

const TIMEFRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
  { value: '1M', label: '1M' },
]

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'weekly', label: 'Weekly' },
]

interface OHLCVRow {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Job {
  job_id: string
  symbol: string
  exchange: string
  timeframe: string
  status: string
  progress: number
  created_at: string
  rows?: number
}

interface WatchlistItem {
  symbol: string
  exchange: string
}

interface Schedule {
  schedule_id: string
  symbol: string
  exchange: string
  timeframe: string
  schedule_type: string
  schedule_time: string
  status: string
}

export default function Historify() {
  const addToast = useToastStore((s) => s.addToast)

  const [symbol, setSymbol] = useState('')
  const [exchange, setExchange] = useState('NSE')
  const [timeframe, setTimeframe] = useState('1d')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [chartSymbol, setChartSymbol] = useState('')
  const [chartExchange, setChartExchange] = useState('NSE')
  const [chartTimeframe, setChartTimeframe] = useState('1d')

  const [ohlcvData, setOhlcvData] = useState<OHLCVRow[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState({ data: false, jobs: false, watchlist: false, schedules: false })
  const [wsSymbol, setWsSymbol] = useState('')
  const [schedSymbol, setSchedSymbol] = useState('')
  const [schedTime, setSchedTime] = useState('09:15')
  const [schedType, setSchedType] = useState('daily')

  const loadData = async () => {
    if (!chartSymbol) return
    setLoading((p) => ({ ...p, data: true }))
    try {
      const res: any = await fetchOHLCV(chartSymbol, chartExchange, chartTimeframe, undefined, undefined)
      setOhlcvData(res.data || [])
    } catch (err: any) {
      addToast(`Failed to load data: ${err?.message}`, 'error')
    } finally {
      setLoading((p) => ({ ...p, data: false }))
    }
  }

  const loadJobs = async () => {
    setLoading((p) => ({ ...p, jobs: true }))
    try {
      const res: any = await fetchDownloadJobs()
      setJobs(res.jobs || [])
    } catch (err: any) {
      addToast(`Failed to load jobs: ${err?.message}`, 'error')
    } finally {
      setLoading((p) => ({ ...p, jobs: false }))
    }
  }

  const loadWatchlist = async () => {
    setLoading((p) => ({ ...p, watchlist: true }))
    try {
      const wl: any = await fetchWatchlist()
      setWatchlist(wl || [])
    } catch (err: any) {
      addToast(`Failed to load watchlist: ${err?.message}`, 'error')
    } finally {
      setLoading((p) => ({ ...p, watchlist: false }))
    }
  }

  const loadSchedules = async () => {
    setLoading((p) => ({ ...p, schedules: true }))
    try {
      const s: any = await fetchSchedules()
      setSchedules(s || [])
    } catch (err: any) {
      addToast(`Failed to load schedules: ${err?.message}`, 'error')
    } finally {
      setLoading((p) => ({ ...p, schedules: false }))
    }
  }

  useEffect(() => { loadData() }, [chartSymbol, chartExchange, chartTimeframe])
  useEffect(() => { loadJobs(); loadWatchlist(); loadSchedules() }, [])

  const handleDownload = async () => {
    if (!symbol) { addToast('Enter a symbol', 'warning'); return }
    try {
      const res: any = await downloadHistory(symbol, exchange, timeframe, fromDate || '2024-01-01', toDate || new Date().toISOString().slice(0, 10))
      addToast(`Downloaded ${res.rows || 0} rows for ${symbol.toUpperCase()}`, 'success')
      loadJobs()
    } catch (err: any) {
      addToast(`Download failed: ${err?.message}`, 'error')
    }
  }

  const handleCancelJob = async (jobId: string) => {
    try {
      await cancelJob(jobId)
      addToast('Job cancelled', 'info')
      loadJobs()
    } catch (err: any) {
      addToast(`Failed to cancel: ${err?.message}`, 'error')
    }
  }

  const handleAddWatchlist = async () => {
    if (!wsSymbol) { addToast('Enter a symbol', 'warning'); return }
    try {
      const res: any = await addToWatchlist(wsSymbol, exchange)
      setWatchlist(res.watchlist || [])
      setWsSymbol('')
      addToast('Added to watchlist', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleRemoveWatchlist = async (sym: string) => {
    try {
      const res: any = await removeFromWatchlist(sym)
      setWatchlist(res.watchlist || [])
      addToast('Removed from watchlist', 'info')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleCreateSchedule = async () => {
    if (!schedSymbol) { addToast('Enter a symbol', 'warning'); return }
    try {
      await createSchedule(schedSymbol, exchange, timeframe, schedType, schedTime)
      addToast('Schedule created', 'success')
      setSchedSymbol('')
      loadSchedules()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id)
      addToast('Schedule deleted', 'info')
      loadSchedules()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const handleExport = async () => {
    if (!chartSymbol) { addToast('Select a symbol first', 'warning'); return }
    try {
      const csv: any = await exportCSV(chartSymbol, chartExchange, chartTimeframe)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${chartSymbol}_${chartTimeframe}.csv`; a.click()
      URL.revokeObjectURL(url)
      addToast('CSV exported', 'success')
    } catch (err: any) {
      addToast(`Export failed: ${err?.message}`, 'error')
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      completed: 'success', running: 'info', failed: 'error', cancelled: 'warning', active: 'info',
    }
    return <Badge label={status} variant={map[status] || 'default'} />
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Database size={12} className="inline mr-1" /> Historify
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { loadJobs(); loadWatchlist(); loadSchedules() }}>
            <RefreshCw size={12} />
          </Button>
          {chartSymbol && (
            <a href={`/openalgo/historify/charts?symbol=${chartSymbol}&exchange=${chartExchange}&timeframe=${chartTimeframe}`}>
              <Button variant="secondary" size="sm"><BarChart3 size={12} /> Charts</Button>
            </a>
          )}
        </div>
      </div>

      <CardGrid cols={3} gap={6}>
        <Card title="Download Data">
          <div className="flex flex-col gap-2">
            <Input label="Symbol" placeholder="RELIANCE" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
            <Select label="Exchange" options={EXCHANGES} value={exchange} onChange={(e) => setExchange(e.target.value)} />
            <Select label="Timeframe" options={TIMEFRAMES} value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />
            <Input label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button size="sm" onClick={handleDownload}><Download size={10} /> Download</Button>
          </div>
        </Card>

        <Card title="OHLCV Data"
          actions={
            <div className="flex items-center gap-1">
              <Select options={TIMEFRAMES} value={chartTimeframe} onChange={(e) => setChartTimeframe(e.target.value)} />
              <Button variant="ghost" size="sm" onClick={handleExport}><Download size={10} /></Button>
            </div>
          }
        >
          <div className="flex gap-1 mb-2">
            <Input placeholder="Symbol" value={chartSymbol} onChange={(e) => setChartSymbol(e.target.value.toUpperCase())} />
            <Select options={EXCHANGES} value={chartExchange} onChange={(e) => setChartExchange(e.target.value)} />
          </div>
          {loading.data ? (
            <Skeleton height={120} variant="rect" />
          ) : ohlcvData.length > 0 ? (
            <div style={{ maxHeight: 240, overflowY: 'auto', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                    <th style={{ textAlign: 'left', padding: '2px 4px' }}>Time</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>O</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>H</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>L</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>C</th>
                    <th style={{ textAlign: 'right', padding: '2px 4px' }}>V</th>
                  </tr>
                </thead>
                <tbody>
                  {ohlcvData.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '2px 4px', color: 'var(--text-secondary)' }}>{row.timestamp.slice(0, 10)}</td>
                      <td style={{ textAlign: 'right', padding: '2px 4px' }}>{row.open.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '2px 4px', color: 'var(--accent-green)' }}>{row.high.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '2px 4px', color: 'var(--accent-red)' }}>{row.low.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 600 }}>{row.close.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', padding: '2px 4px', color: 'var(--text-muted)' }}>{(row.volume / 1000).toFixed(0)}K</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Enter a symbol to view data</div>
          )}
        </Card>

        <Card title="Watchlist"
          actions={
            <div className="flex items-center gap-1">
              <Input placeholder="Symbol" value={wsSymbol} onChange={(e) => setWsSymbol(e.target.value.toUpperCase())} />
              <Button variant="ghost" size="sm" onClick={handleAddWatchlist}><Plus size={10} /></Button>
            </div>
          }
        >
          {loading.watchlist ? (
            <Skeleton height={80} variant="rect" />
          ) : watchlist.length > 0 ? (
            <div className="flex flex-col gap-1">
              {watchlist.map((w, i) => (
                <div key={i} className="flex items-center justify-between" style={{ padding: '2px 0' }}>
                  <div className="flex items-center gap-2">
                    <Eye size={10} style={{ color: 'var(--accent-cyan)' }} />
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{w.symbol}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{w.exchange}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setChartSymbol(w.symbol); setChartExchange(w.exchange); loadData() }}>
                      <Eye size={8} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveWatchlist(w.symbol)}>
                      <Trash2 size={8} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No watched symbols</div>
          )}
        </Card>
      </CardGrid>

      <CardGrid cols={2} gap={6}>
        <Card title="Download Jobs">
          {loading.jobs ? (
            <Skeleton height={80} variant="rect" />
          ) : jobs.length > 0 ? (
            <div className="flex flex-col gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {jobs.map((job) => (
                <div key={job.job_id} className="flex items-center justify-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{job.symbol}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{job.timeframe} {job.exchange}</span>
                    {statusBadge(job.status)}
                    {job.status === 'running' && <span className="text-[8px]" style={{ color: 'var(--accent-cyan)' }}>{job.progress}%</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    {job.rows && <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{job.rows} rows</span>}
                    {job.status === 'running' && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancelJob(job.job_id)}>
                        <XCircle size={8} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No download jobs</div>
          )}
        </Card>

        <Card title="Schedules"
          actions={
            <div className="flex items-center gap-1">
              <Input placeholder="Symbol" value={schedSymbol} onChange={(e) => setSchedSymbol(e.target.value.toUpperCase())} />
              <Select options={SCHEDULE_TYPES} value={schedType} onChange={(e) => setSchedType(e.target.value)} />
              <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} style={{ width: 80 }} />
              <Button variant="ghost" size="sm" onClick={handleCreateSchedule}><Plus size={10} /></Button>
            </div>
          }
        >
          {loading.schedules ? (
            <Skeleton height={80} variant="rect" />
          ) : schedules.length > 0 ? (
            <div className="flex flex-col gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {schedules.map((s) => (
                <div key={s.schedule_id} className="flex items-center justify-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2">
                    <Clock size={10} style={{ color: 'var(--accent-cyan)' }} />
                    <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{s.symbol}</span>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{s.timeframe} {s.schedule_type} @ {s.schedule_time}</span>
                    {statusBadge(s.status)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteSchedule(s.schedule_id)}>
                    <Trash2 size={8} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No schedules</div>
          )}
        </Card>
      </CardGrid>
    </div>
  )
}
