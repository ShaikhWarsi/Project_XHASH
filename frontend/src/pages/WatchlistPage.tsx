import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Trash2, AlertCircle } from 'lucide-react'
import Card from '../components/ui/Card'
import StockSearch from '../components/StockSearch'
import AlertsPanel from '../components/AlertsPanel'
import { fetchWatchlist, removeFromWatchlist, fetchQuote, fetchCompanyProfile } from '../api/client'
import type { WatchlistItem } from '../api/types'
import { useToastStore } from '../store/toast'

export default function WatchlistPage() {
  const [items, setItems] = useState<(WatchlistItem & { price?: number; change?: number; changePercent?: number; profile?: Record<string, unknown> })[]>([])
  const [quoteError, setQuoteError] = useState(false)
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const userId = 'default'

  const load = async () => {
    try {
      const data = await fetchWatchlist(userId)
      let anyQuoteFailed = false
      const enriched = await Promise.all(
        data.map(async (item) => {
          let price: number | undefined
          let change: number | undefined
          let changePercent: number | undefined
          let profile: Record<string, unknown> | undefined
          try {
            const quote = await fetchQuote(item.symbol)
            price = quote.c; change = quote.d; changePercent = quote.dp
          } catch (err) { anyQuoteFailed = true }
          try {
            profile = await fetchCompanyProfile(item.symbol)
          } catch (_) { /* non-critical */ }
          return { ...item, price, change, changePercent, profile }
        })
      )
      setItems(enriched)
      setQuoteError(anyQuoteFailed)
    } catch (err) { addToast('Failed to load watchlist', 'error') }
  }

  useEffect(() => { load() }, [])

  const handleRemove = async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol, userId)
      load()
    } catch (_) { addToast('Failed to remove item', 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Watchlist
        </h1>
        <StockSearch renderAs="button" label="Add Stock" />
      </div>

      {quoteError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red)' }}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Some price data unavailable — market data service may be down</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            {items.length === 0 ? (
              <div className="text-center py-8 text-[#5f6368]">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Your watchlist is empty</p>
                <p className="text-xs mt-1">Search for stocks above to add them</p>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map(item => (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2a2d3e]/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/chart?symbol=${item.symbol}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#2a2d3e] flex items-center justify-center text-xs font-bold text-[#9aa0a6]">
                        {item.symbol[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{item.symbol}</div>
                        <div className="text-xs text-[#9aa0a6]">{item.company || item.symbol}</div>
                        {item.profile && (
                          <div className="flex items-center gap-2 mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {(item.profile.sector as string | undefined) && <span>{item.profile.sector as string}</span>}
                            {(item.profile.marketCapitalization as number | undefined) && (
                              <span>MCap: ${((item.profile.marketCapitalization as number) / 1e9).toFixed(1)}B</span>
                            )}
                            {(item.profile.peRatio as number | undefined) && (
                              <span>P/E: {(item.profile.peRatio as number).toFixed(1)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.price && (
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">${item.price.toFixed(2)}</div>
                          {item.changePercent !== undefined && (
                            <div className={`text-xs ${(item.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(item.changePercent || 0) >= 0 ? '+' : ''}{item.changePercent?.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleRemove(item.symbol) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-[#9aa0a6] hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <AlertsPanel />
        </div>
      </div>
    </div>
  )
}