import { useState } from 'react'
import Card from '../components/ui/Card'
import Breadcrumbs from '../components/Breadcrumbs'
import Spinner from '../components/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { useApiQuery } from '../hooks/useApiQuery'

interface CalendarEvent {
  symbol: string
  date?: string
  exDate?: string
  payDate?: string
  amount?: number
  type: 'earnings' | 'dividend'
}

const FONT_DATA = 'font-mono-data text-[11px]'

export default function MarketsCalendarPage() {
  const [tab, setTab] = useState<'earnings' | 'dividends'>('earnings')
  const endpoint = tab === 'earnings' ? '/calendar/earnings' : '/calendar/dividends'
  const { data: raw, isLoading, error } = useApiQuery<any>(endpoint)
  const events: CalendarEvent[] = raw?.events ?? []
  const errorMessage = error ? (error as any)?.response?.data?.message || `Failed to load ${tab}` : ''

  return (
    <div className="flex flex-col gap-2 p-2">
      <Breadcrumbs />
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Markets Calendar</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('earnings')}
            className="px-3 py-1 text-[10px] font-mono cursor-pointer border-none rounded-sm"
            style={{ background: tab === 'earnings' ? 'var(--accent-blue)' : 'var(--bg-hover)', color: tab === 'earnings' ? '#fff' : 'var(--text-muted)' }}
          >Earnings</button>
          <button
            onClick={() => setTab('dividends')}
            className="px-3 py-1 text-[10px] font-mono cursor-pointer border-none rounded-sm"
            style={{ background: tab === 'dividends' ? 'var(--accent-blue)' : 'var(--bg-hover)', color: tab === 'dividends' ? '#fff' : 'var(--text-muted)' }}
          >Dividends</button>
        </div>
      </div>

      {isLoading && <Spinner label="Loading calendar..." />}
      {errorMessage && <EmptyState title={errorMessage} />}
      {!isLoading && !errorMessage && events.length === 0 && (
        <EmptyState
          title={`No ${tab} in the forecast period`}
          sampleAction={{ label: `Load AAPL ${tab}`, onClick: () => window.open('/markets/chart?symbol=AAPL', '_self') }}
        />
      )}
      {!isLoading && events.length > 0 && (
        <Card title={`UPCOMING ${tab.toUpperCase()} (${events.length})`}>
          <div className="flex items-center border-b border-default py-0.5 font-mono-data text-[9px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-16">Date</span>
            <span className="w-20">Symbol</span>
            <span className="w-12">Type</span>
            {tab === 'dividends' && <span className="w-16 text-right">Amount</span>}
            {tab === 'dividends' && <span className="w-16 text-right">Pay Date</span>}
          </div>
          {events.map((evt, i) => (
            <div key={i} className="flex items-center border-b border-default py-0.5 font-mono-data text-[11px]" style={{ color: 'var(--text-primary)' }}>
              <span className="w-16" style={{ color: 'var(--text-muted)' }}>{evt.date || evt.exDate || '-'}</span>
              <span className="w-20" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{evt.symbol}</span>
              <span className="w-12" style={{ color: evt.type === 'earnings' ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>{evt.type === 'earnings' ? '📊' : '💰'}</span>
              {tab === 'dividends' && (
                <>
                  <span className="w-16 text-right" style={{ color: 'var(--accent-green)' }}>${evt.amount?.toFixed(4) ?? '-'}</span>
                  <span className="w-16 text-right" style={{ color: 'var(--text-muted)' }}>{evt.payDate || '-'}</span>
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
