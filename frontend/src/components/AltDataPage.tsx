import { useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Breadcrumbs from './Breadcrumbs'

interface AltDataSource {
  id: string
  name: string
  description: string
  provider: string
  frequency: string
  coverage: string
  dataType: 'numeric' | 'categorical' | 'text' | 'trend'
  available: boolean
}

const ALT_DATA_SOURCES: AltDataSource[] = [
  { id: 'quiver', name: 'Quiver Quantitative', description: 'Government contracts, congressional trading, lobbying, patents', provider: 'Quiver Quantitative', frequency: 'Weekly', coverage: 'US Stocks', dataType: 'numeric', available: false },
  { id: 'foot-traffic', name: 'Foot Traffic', description: 'Retail store visits, footfall trends by chain (PlaceIQ / Safegraph)', provider: 'PlaceIQ', frequency: 'Daily', coverage: 'US Retail', dataType: 'numeric', available: false },
  { id: 'web-traffic', name: 'Web Traffic', description: 'Similarweb estimated visits, bounce rate, pages/session', provider: 'Similarweb', frequency: 'Monthly', coverage: 'Global', dataType: 'trend', available: false },
  { id: 'app-rank', name: 'App Rank', description: 'App Store / Google Play rank trends for company apps', provider: 'App Annie / Sensor Tower', frequency: 'Daily', coverage: 'Global', dataType: 'numeric', available: false },
  { id: 'job-postings', name: 'Job Postings', description: 'LinkedIn / Indeed job posting volume, roles, locations', provider: 'LinkUp / Indeed', frequency: 'Daily', coverage: 'Global', dataType: 'trend', available: false },
  { id: 'github-stars', name: 'GitHub Stars', description: 'Star growth for company OSS repos — a leading indicator of developer mindshare', provider: 'GitHub API', frequency: 'Daily', coverage: 'Public Repos', dataType: 'numeric', available: false },
  { id: 'tonal-glassdoor', name: 'Tonal / Glassdoor', description: 'Employee sentiment, management rating, CEO approval, culture score', provider: 'Glassdoor API', frequency: 'Quarterly', coverage: 'US', dataType: 'numeric', available: false },
]

type AltTab = 'overview' | 'quiver' | 'foot-traffic' | 'web-traffic' | 'app-rank' | 'jobs' | 'github' | 'tonal'

export default function AltDataPage() {
  const [tab, setTab] = useState<AltTab>('overview')
  const [signal, setSignal] = useState('')

  return (
    <div className="flex flex-col gap-1.5 p-2">
      <Breadcrumbs />
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="ALT DATA" variant="info" />
        {(['overview', 'quiver', 'foot-traffic', 'web-traffic', 'app-rank', 'jobs', 'github', 'tonal'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[9px] px-2 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'overview' ? 'OVERVIEW' : t === 'quiver' ? 'QUIVER' : t === 'foot-traffic' ? 'FOOT TRAFFIC' : t === 'web-traffic' ? 'WEB TRAFFIC' : t === 'app-rank' ? 'APP RANK' : t === 'jobs' ? 'JOBS' : t === 'github' ? 'GITHUB' : 'TONAL'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-1.5">
          {ALT_DATA_SOURCES.map((src) => (
            <Card key={src.id} title={src.name}>
              <div className="font-mono-data text-[10px]">
                <div className="text-muted mb-1">{src.description}</div>
                <div className="flex justify-between"><span className="text-muted">Provider</span><span className="text-primary">{src.provider}</span></div>
                <div className="flex justify-between"><span className="text-muted">Frequency</span><span className="text-primary">{src.frequency}</span></div>
                <div className="flex justify-between"><span className="text-muted">Coverage</span><span className="text-primary">{src.coverage}</span></div>
                <div className="mt-1">
                  {src.available ? (
                    <span className="text-accent-green text-[9px]">✓ Available</span>
                  ) : (
                    <span className="text-accent-yellow text-[9px]">⚠ API key required — subscribe at {src.provider}</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'quiver' && (
        <Card title="QUIVER QUANTITATIVE — SIGNAL BROWSER">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="SEARCH TICKER..." value={signal} onChange={(e) => setSignal(e.target.value.toUpperCase())}
                className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-24" />
              <span className="text-[9px] text-muted self-center">Requires Quiver Quantitative API key</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {['Government Contracts', 'Congressional Trading', 'Lobbying', 'Patent Filings', 'Insider Trading'].map((cat) => (
                <div key={cat} style={{ border: '1px solid var(--border-color)', padding: 6 }}>
                  <div className="text-primary font-bold">{cat}</div>
                  <div className="text-[9px] text-muted mt-0.5">Signal type: {cat.includes('Patent') ? 'Innovation' : cat.includes('Gov') ? 'Revenue Visibility' : cat.includes('Congress') ? 'Political Intelligence' : 'Governance'}</div>
                  <div className="text-accent-yellow text-[9px] mt-0.5">Pending API integration</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === 'foot-traffic' && (
        <Card title="FOOT TRAFFIC — RETAIL VISITOR TRENDS">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="TICKER..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-24" />
              <span className="text-[9px] text-muted self-center">Select a US retail chain</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { s: 'WMT', n: 'Walmart', tc: '-2.1%', ty: 'YoY' },
                { s: 'TGT', n: 'Target', tc: '+3.4%', ty: 'YoY' },
                { s: 'MCD', n: "McDonald's", tc: '+1.2%', ty: 'YoY' },
                { s: 'SBUX', n: 'Starbucks', tc: '-4.5%', ty: 'YoY' },
                { s: 'HD', n: 'Home Depot', tc: '-1.8%', ty: 'YoY' },
                { s: 'LOW', n: "Lowe's", tc: '+2.0%', ty: 'YoY' },
              ].map((r) => (
                <div key={r.s} style={{ border: '1px solid var(--border-color)', padding: 6 }}>
                  <div className="flex justify-between"><span className="text-accent-cyan">{r.s}</span><span className="text-primary">{r.n}</span></div>
                  <div className={`${r.tc.startsWith('+') ? 'text-accent-green' : 'text-accent-red'} mt-0.5`}>{r.tc} {r.ty}</div>
                </div>
              ))}
            </div>
            <div className="mt-1 text-[9px] text-muted">Requires PlaceIQ / Safegraph API subscription for live data</div>
          </div>
        </Card>
      )}

      {tab === 'web-traffic' && (
        <Card title="WEB TRAFFIC — SIMILARWEB ESTIMATES">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="DOMAIN..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-32" />
              <span className="text-[9px] text-muted self-center">e.g., amazon.com, tesla.com</span>
            </div>
            <table className="w-full">
              <thead><tr className="text-[9px] text-muted"><th className="text-left">Site</th><th className="text-right">Monthly Visits</th><th className="text-right">Bounce Rate</th><th className="text-right">Pages/Session</th><th className="text-right">Trend</th></tr></thead>
              <tbody>
                {[
                  { s: 'amazon.com', v: '2.8B', b: '32%', p: '8.5', t: '+5.2%' },
                  { s: 'walmart.com', v: '485M', b: '38%', p: '5.2', t: '+2.1%' },
                  { s: 'tesla.com', v: '125M', b: '45%', p: '4.1', t: '-8.5%' },
                  { s: 'nike.com', v: '210M', b: '35%', p: '6.3', t: '+1.8%' },
                  { s: 'target.com', v: '178M', b: '40%', p: '5.8', t: '+3.2%' },
                ].map((r) => (
                  <tr key={r.s}>
                    <td className="text-left text-accent-cyan">{r.s}</td>
                    <td className="text-right">{r.v}</td>
                    <td className="text-right">{r.b}</td>
                    <td className="text-right">{r.p}</td>
                    <td className={`text-right ${r.t.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[9px] text-muted">Requires Similarweb API subscription</div>
          </div>
        </Card>
      )}

      {tab === 'app-rank' && (
        <Card title="APP RANK TRENDS">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="APP NAME..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-32" />
              <span className="text-[9px] text-muted self-center">e.g., Instagram, Uber, DoorDash</span>
            </div>
            <table className="w-full">
              <thead><tr className="text-[9px] text-muted"><th className="text-left">App</th><th className="text-left">Company</th><th className="text-right">iOS Rank</th><th className="text-right">Android Rank</th><th className="text-right">30d Change</th></tr></thead>
              <tbody>
                {[
                  { a: 'Instagram', c: 'META', ios: 4, and: 5, ch: '+2' },
                  { a: 'Uber', c: 'UBER', ios: 12, and: 8, ch: '-3' },
                  { a: 'DoorDash', c: 'DASH', ios: 18, and: 22, ch: '+1' },
                  { a: 'Robinhood', c: 'HOOD', ios: 7, and: 11, ch: '+5' },
                  { a: 'Cash App', c: 'SQ', ios: 15, and: 19, ch: '-2' },
                ].map((r) => (
                  <tr key={r.a}>
                    <td className="text-left text-accent-cyan">{r.a}</td>
                    <td className="text-left text-primary">{r.c}</td>
                    <td className="text-right">#{r.ios}</td>
                    <td className="text-right">#{r.and}</td>
                    <td className={`text-right ${r.ch.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>{r.ch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[9px] text-muted">Requires App Annie / Sensor Tower API</div>
          </div>
        </Card>
      )}

      {tab === 'jobs' && (
        <Card title="JOB POSTINGS TRENDS">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="TICKER..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-24" />
              <span className="text-[9px] text-muted self-center">Hiring as leading indicator of growth</span>
            </div>
            <table className="w-full">
              <thead><tr className="text-[9px] text-muted"><th className="text-left">Company</th><th className="text-right">Open Roles</th><th className="text-right">MoM Change</th><th className="text-right">Avg. Salary</th><th className="text-right">Top Dept</th></tr></thead>
              <tbody>
                {[
                  { c: 'Amazon', r: 14200, m: '+8.2%', s: '$175K', d: 'AWS / Cloud' },
                  { c: 'Alphabet', r: 8900, m: '+12.4%', s: '$190K', d: 'AI / ML' },
                  { c: 'Meta', r: 6200, m: '+5.1%', s: '$185K', d: 'AI / Research' },
                  { c: 'Microsoft', r: 10500, m: '+3.8%', s: '$170K', d: 'Cloud / Azure' },
                  { c: 'NVIDIA', r: 4800, m: '+22.5%', s: '$210K', d: 'CUDA / Hardware' },
                ].map((r) => (
                  <tr key={r.c}>
                    <td className="text-left text-accent-cyan">{r.c}</td>
                    <td className="text-right">{r.r.toLocaleString()}</td>
                    <td className={`text-right ${r.m.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>{r.m}</td>
                    <td className="text-right">{r.s}</td>
                    <td className="text-right text-muted">{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[9px] text-muted">Requires LinkUp / Indeed API subscription</div>
          </div>
        </Card>
      )}

      {tab === 'github' && (
        <Card title="GITHUB STARS — DEVELOPER MIND SHARE">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              <input type="text" placeholder="ORG..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-32" />
              <span className="text-[9px] text-muted self-center">e.g., facebook, google, microsoft</span>
            </div>
            <table className="w-full">
              <thead><tr className="text-[9px] text-muted"><th className="text-left">Organization</th><th className="text-right">Total Stars</th><th className="text-right">Top Repo</th><th className="text-right">Quarterly Δ</th><th className="text-right">Rank</th></tr></thead>
              <tbody>
                {[
                  { o: 'Microsoft', s: 14500000, r: 'vscode (168K)', d: '+8.2%', rk: '#1' },
                  { o: 'Google', s: 9800000, r: 'tensorflow (187K)', d: '+3.1%', rk: '#2' },
                  { o: 'Meta', s: 5200000, r: 'react (230K)', d: '+5.4%', rk: '#3' },
                  { o: 'Netflix', s: 890000, r: 'zuul (13K)', d: '+1.2%', rk: '#12' },
                  { o: 'NVIDIA', s: 720000, r: 'cuda-samples (5K)', d: '+22.8%', rk: '#15' },
                ].map((r) => (
                  <tr key={r.o}>
                    <td className="text-left text-accent-cyan">{r.o}</td>
                    <td className="text-right">{(r.s / 1000000).toFixed(1)}M</td>
                    <td className="text-right text-primary">{r.r}</td>
                    <td className={`text-right ${r.d.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>{r.d}</td>
                    <td className="text-right text-muted">{r.rk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 text-[9px] text-muted">Free via GitHub public API — no subscription needed</div>
          </div>
        </Card>
      )}

      {tab === 'tonal' && (
        <Card title="TONAL / GLASSDOOR — EMPLOYEE SENTIMENT">
          <div className="font-mono-data text-[10px]">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { c: 'Microsoft', ov: 4.3, ceo: 92, rec: 85, cul: 78, wl: 88 },
                { c: 'Google', ov: 4.1, ceo: 78, rec: 82, cul: 70, wl: 85 },
                { c: 'Meta', ov: 3.8, ceo: 65, rec: 72, cul: 62, wl: 75 },
                { c: 'Amazon', ov: 3.4, ceo: 55, rec: 60, cul: 52, wl: 65 },
                { c: 'Netflix', ov: 4.0, ceo: 82, rec: 75, cul: 80, wl: 72 },
                { c: 'NVIDIA', ov: 4.6, ceo: 95, rec: 90, cul: 92, wl: 94 },
              ].map((r) => (
                <div key={r.c} style={{ border: '1px solid var(--border-color)', padding: 8 }}>
                  <div className="text-primary font-bold">{r.c}</div>
                  <div className="flex justify-between text-[9px] mt-0.5"><span className="text-muted">Rating</span><span className={`${r.ov >= 4 ? 'text-accent-green' : r.ov >= 3.5 ? 'text-accent-yellow' : 'text-accent-red'}`}>{r.ov}/5</span></div>
                  <div className="flex justify-between text-[9px]"><span className="text-muted">CEO Approval</span><span className={`${r.ceo >= 80 ? 'text-accent-green' : r.ceo >= 60 ? 'text-accent-yellow' : 'text-accent-red'}`}>{r.ceo}%</span></div>
                  <div className="flex justify-between text-[9px]"><span className="text-muted">Recommend</span><span className="text-primary">{r.rec}%</span></div>
                  <div className="flex justify-between text-[9px]"><span className="text-muted">Culture</span><span className="text-primary">{r.cul}%</span></div>
                  <div className="flex justify-between text-[9px]"><span className="text-muted">Work/Life</span><span className="text-primary">{r.wl}%</span></div>
                </div>
              ))}
            </div>
            <div className="mt-1 text-[9px] text-muted">Requires Glassdoor API key — free tier available</div>
          </div>
        </Card>
      )}
    </div>
  )
}
