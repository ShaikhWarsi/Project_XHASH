import { useEffect, useState } from 'react'
import { fetchCompanyProfile, fetchCompanyNews } from '../api/client'
import { useApiQuery } from '../hooks/useApiQuery'

interface SymbolProfile {
  name: string
  sector: string
  industry: string
  market_cap: number
  employees: number
  country: string
  ipo_date: string
  website: string
  description: string
  peers: string[]
  etfs: string[]
}

export default function SymbolInfoPanel({ symbol }: { symbol: string }) {
  const [tab, setTab] = useState<'overview' | 'news'>('overview')
  const { data: raw, isLoading } = useApiQuery<SymbolProfile>(symbol ? `/market/profile/${symbol}` : null)
  const { data: news } = useApiQuery<any[]>(symbol && tab === 'news' ? `/market/news/${symbol}` : null)

  if (isLoading) {
    return (
      <div className="font-mono-data text-[10px] text-muted p-2 text-center">Loading {symbol}...</div>
    )
  }

  if (!raw) {
    return (
      <div className="font-mono-data text-[10px] text-muted p-2 text-center">No data for {symbol}</div>
    )
  }

  const profile: SymbolProfile = raw as any

  return (
    <div className="font-mono-data text-[10px]">
      <div className="flex gap-1 mb-2 border-b border-default pb-1">
        {(['overview', 'news'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[9px] px-2 py-0.5 cursor-pointer border-none rounded-sm uppercase"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'overview' ? (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-primary">{profile.name || symbol}</div>
          {profile.description && <div className="text-[9px] text-muted leading-relaxed">{profile.description}</div>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
            {profile.sector && <><span className="text-muted">Sector</span><span className="text-primary text-right">{profile.sector}</span></>}
            {profile.industry && <><span className="text-muted">Industry</span><span className="text-primary text-right">{profile.industry}</span></>}
            {profile.market_cap && <><span className="text-muted">Market Cap</span><span className="text-primary text-right">${(profile.market_cap / 1e9).toFixed(2)}B</span></>}
            {profile.employees && <><span className="text-muted">Employees</span><span className="text-primary text-right">{profile.employees.toLocaleString()}</span></>}
            {profile.country && <><span className="text-muted">Country</span><span className="text-primary text-right">{profile.country}</span></>}
            {profile.ipo_date && <><span className="text-muted">IPO</span><span className="text-primary text-right">{profile.ipo_date}</span></>}
            {profile.website && <><span className="text-muted">Website</span><span className="text-primary text-right truncate"><a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>{profile.website.replace('https://', '')}</a></span></>}
          </div>
          {profile.peers && profile.peers.length > 0 && (
            <div>
              <div className="text-[9px] text-muted mb-0.5">Peers</div>
              <div className="flex gap-1 flex-wrap">
                {profile.peers.map((p) => (
                  <span key={p} className="px-1.5 py-0.5 rounded-sm text-[9px]" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {profile.etfs && profile.etfs.length > 0 && (
            <div>
              <div className="text-[9px] text-muted mb-0.5">ETFs Holding {symbol}</div>
              <div className="flex gap-1 flex-wrap">
                {profile.etfs.map((e) => (
                  <span key={e} className="px-1.5 py-0.5 rounded-sm text-[9px]" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--accent-yellow)' }}>{e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(!news || news.length === 0) && <div className="text-muted text-center py-2">No recent news</div>}
          {news?.map((article, i) => (
            <div key={i} className="border-b border-default pb-1 last:border-b-0">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-semibold" style={{ color: 'var(--accent-cyan)' }}>{article.headline}</a>
              <div className="text-[8px] text-muted">{article.source} — {article.datetime ? new Date(article.datetime).toLocaleDateString() : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
