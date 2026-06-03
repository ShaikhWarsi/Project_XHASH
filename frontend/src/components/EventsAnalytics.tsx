import { useState } from 'react'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Spinner from './Spinner'

export default function EventsAnalytics() {
  const [tab, setTab] = useState<'calendar' | 'transcripts' | 'sentiment' | 'signals'>('calendar')

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 bg-card border border-default px-2 py-1 flex-wrap">
        <Badge label="EVENTS" variant="info" />
        {(['calendar', 'transcripts', 'sentiment', 'signals'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="font-mono-data text-[10px] px-2.5 py-0.5 cursor-pointer"
            style={{ background: tab === t ? 'rgba(59,130,246,0.15)' : 'none', border: 'none', color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
            {t === 'calendar' ? 'CALENDAR' : t === 'transcripts' ? 'TRANSCRIPTS' : t === 'sentiment' ? 'SENTIMENT' : 'SIGNALS'}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <>
          <Card title="SPLITS CALENDAR">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-left">Company</th><th className="text-right">Ex-Date</th><th className="text-right">Ratio</th><th className="text-right">Type</th></tr></thead>
                <tbody>
                  {[
                    { s: 'NVDA', c: 'NVIDIA Corp', d: '2025-06-09', r: '10:1', t: 'Forward' },
                    { s: 'AMZN', c: 'Amazon.com', d: '2025-07-15', r: '20:1', t: 'Forward' },
                    { s: 'COST', c: 'Costco Wholesale', d: '2025-05-20', r: '3:1', t: 'Forward' },
                    { s: 'BRK.B', c: 'Berkshire Hathaway', d: '2025-08-01', r: '50:1', t: 'Forward' },
                    { s: 'NFLX', c: 'Netflix Inc', d: '2025-04-12', r: '1:5', t: 'Reverse' },
                  ].map((r) => (
                    <tr key={r.s}>
                      <td className="text-left text-accent-cyan">{r.s}</td>
                      <td className="text-left text-primary">{r.c}</td>
                      <td className="text-right">{r.d}</td>
                      <td className="text-right">{r.r}</td>
                      <td className={`text-right ${r.t === 'Forward' ? 'text-accent-green' : 'text-accent-red'}`}>{r.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 text-[9px] text-muted flex gap-2">
                <span className="text-accent-green">Forward splits</span>
                <span className="text-accent-red">Reverse splits</span>
              </div>
            </div>
          </Card>

          <Card title="EARNINGS SURPRISE">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-left">Quarter</th><th className="text-right">Estimate</th><th className="text-right">Actual</th><th className="text-right">Surprise</th><th className="text-right">Move</th></tr></thead>
                <tbody>
                  {[
                    { s: 'AAPL', q: 'Q2 2025', e: 1.53, a: 1.88, m: '+4.2%' },
                    { s: 'MSFT', q: 'Q2 2025', e: 2.94, a: 3.12, m: '+2.8%' },
                    { s: 'TSLA', q: 'Q1 2025', e: 0.52, a: 0.38, m: '-8.7%' },
                    { s: 'NVDA', q: 'Q1 2025', e: 5.64, a: 6.71, m: '+9.3%' },
                    { s: 'AMZN', q: 'Q1 2025', e: 0.83, a: 0.98, m: '+3.1%' },
                    { s: 'GOOGL', q: 'Q1 2025', e: 1.89, a: 1.72, m: '-5.2%' },
                  ].map((r) => {
                    const surp = ((r.a - r.e) / Math.abs(r.e) * 100).toFixed(1)
                    return (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-left text-primary">{r.q}</td>
                        <td className="text-right">${r.e.toFixed(2)}</td>
                        <td className="text-right">${r.a.toFixed(2)}</td>
                        <td className={`text-right ${+surp >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{+surp >= 0 ? '+' : ''}{surp}%</td>
                        <td className={`text-right ${r.m.startsWith('+') ? 'text-accent-green' : 'text-accent-red'}`}>{r.m}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-1.5">
            <Card title="WHALE WATCH — LARGE BLOCK DETECTION">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Size</th><th className="text-right">Price</th><th className="text-right">Value</th><th className="text-left">Venue</th></tr></thead>
                  <tbody>
                    {[
                      { s: 'SPY', sz: '500K', p: 543.20, v: '$271.6M', ven: 'Dark Pool' },
                      { s: 'QQQ', sz: '200K', p: 475.80, v: '$95.2M', ven: 'Off-Exch' },
                      { s: 'AAPL', sz: '85K', p: 198.50, v: '$16.9M', ven: 'ATS' },
                      { s: 'TSLA', sz: '120K', p: 245.30, v: '$29.4M', ven: 'Dark Pool' },
                      { s: 'NVDA', sz: '95K', p: 890.10, v: '$84.6M', ven: 'Off-Exch' },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-right">{r.sz}</td>
                        <td className="text-right">${r.p.toFixed(2)}</td>
                        <td className="text-right text-accent-yellow">{r.v}</td>
                        <td className="text-left text-muted">{r.ven}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-muted">Blocks &gt;$5M flagged in real-time via dark pool + off-exchange feeds</div>
              </div>
            </Card>

            <Card title="LIQUIDITY SWEEP DETECTOR">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Time</th><th className="text-left">Pair</th><th className="text-right">Side</th><th className="text-right">Volume</th><th className="text-right">Liq. Taken</th><th className="text-left">Type</th></tr></thead>
                  <tbody>
                    {[
                      { t: '09:32:15', p: 'BTC/USD', s: 'BUY', v: '2,450', l: '$147M', ty: 'Level Sweep' },
                      { t: '09:45:02', p: 'ETH/USD', s: 'SELL', v: '1,200', l: '$38M', ty: 'Iceberg' },
                      { t: '10:12:44', p: 'SPY', s: 'BUY', v: '850K', l: '$462M', ty: 'VWAP Sweep' },
                      { t: '11:03:18', p: 'AAPL', s: 'SELL', v: '210K', l: '$42M', ty: 'Level Sweep' },
                      { t: '11:30:55', p: 'TSLA', s: 'BUY', v: '95K', l: '$23M', ty: 'Stop Run' },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td className="text-left text-muted">{r.t}</td>
                        <td className="text-left text-accent-cyan">{r.p}</td>
                        <td className={`text-right ${r.s === 'BUY' ? 'text-accent-green' : 'text-accent-red'}`}>{r.s}</td>
                        <td className="text-right">{r.v}</td>
                        <td className="text-right text-accent-yellow">{r.l}</td>
                        <td className="text-left text-muted">{r.ty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-muted">Detects liquidity sweeps, icebergs, and stop runs via order book + tape analysis</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Card title="SPREAD MONITOR — BID-ASK WIDENING ALERTS">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Bid</th><th className="text-right">Ask</th><th className="text-right">Spread</th><th className="text-right">Baseline</th><th className="text-right">Z-Score</th></tr></thead>
                  <tbody>
                    {[
                      { s: 'SPY', b: 543.18, a: 543.22, sp: 0.04, bl: 0.02, z: 3.2 },
                      { s: 'AAPL', b: 198.45, a: 198.55, sp: 0.10, bl: 0.04, z: 4.1 },
                      { s: 'TSLA', b: 245.10, a: 245.50, sp: 0.40, bl: 0.12, z: 5.8 },
                      { s: 'NVDA', b: 889.90, a: 890.30, sp: 0.40, bl: 0.18, z: 3.5 },
                      { s: 'GME', b: 25.40, a: 26.80, sp: 1.40, bl: 0.35, z: 6.2 },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-right">${r.b.toFixed(2)}</td>
                        <td className="text-right">${r.a.toFixed(2)}</td>
                        <td className={`text-right ${r.z > 3 ? 'text-accent-red' : r.z > 2 ? 'text-accent-yellow' : 'text-accent-green'}`}>${r.sp.toFixed(2)}</td>
                        <td className="text-right text-muted">${r.bl.toFixed(2)}</td>
                        <td className={`text-right ${r.z > 3 ? 'text-accent-red' : r.z > 2 ? 'text-accent-yellow' : 'text-accent-green'}`}>{r.z.toFixed(1)}σ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-muted">Alerts trigger when spread exceeds 3σ from trailing 5d average</div>
              </div>
            </Card>

            <Card title="INSIDER CLUSTER — MULTI-BUYER PATTERN">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-left">Window</th><th className="text-right">Buyers</th><th className="text-right">Total Vol</th><th className="text-right">Avg Price</th><th className="text-left">Signal</th></tr></thead>
                  <tbody>
                    {[
                      { s: 'AAPL', w: '30d', b: 4, v: 125000, p: 192.50, sig: 'Bullish' },
                      { s: 'MSFT', w: '60d', b: 6, v: 234000, p: 415.20, sig: 'Bullish' },
                      { s: 'META', w: '30d', b: 3, v: 45000, p: 478.30, sig: 'Bullish' },
                      { s: 'NFLX', w: '90d', b: 2, v: 12000, p: 625.40, sig: 'Neutral' },
                      { s: 'AMD', w: '30d', b: 1, v: 5000, p: 155.80, sig: 'Neutral' },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-left">{r.w}</td>
                        <td className="text-right">{r.b}</td>
                        <td className="text-right">{r.v.toLocaleString()}</td>
                        <td className="text-right">${r.p.toFixed(2)}</td>
                        <td className={`text-left ${r.sig === 'Bullish' ? 'text-accent-green' : 'text-accent-yellow'}`}>{r.sig}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-1 text-[9px] text-muted">Detects &ge;3 distinct insiders buying within 30/60/90d window with cluster signal</div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Card title="SHORT SQUEEZE CANDIDATES">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">SI % Float</th><th className="text-right">DTC</th><th className="text-right">CTB</th><th className="text-right">Score</th><th className="text-left">Signal</th></tr></thead>
                  <tbody>
                    {[
                      { s: 'GME', si: 42.5, dtc: 8.2, ctb: 35.4, sc: 86, sig: 'HIGH' },
                      { s: 'AMC', si: 28.3, dtc: 6.1, ctb: 22.8, sc: 72, sig: 'HIGH' },
                      { s: 'BBBYQ', si: 18.7, dtc: 4.5, ctb: 15.2, sc: 55, sig: 'MODERATE' },
                      { s: 'RIVN', si: 15.2, dtc: 3.8, ctb: 12.1, sc: 48, sig: 'MODERATE' },
                      { s: 'CVNA', si: 22.1, dtc: 5.3, ctb: 18.5, sc: 61, sig: 'HIGH' },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-right">{r.si.toFixed(1)}%</td>
                        <td className="text-right">{r.dtc.toFixed(1)}</td>
                        <td className="text-right">{r.ctb.toFixed(1)}%</td>
                        <td className="text-right">{r.sc}</td>
                        <td className={`text-left ${r.sig === 'HIGH' ? 'text-accent-red' : 'text-accent-yellow'}`}>{r.sig}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="ANALYST RATINGS">
              <div className="font-mono-data text-[10px]">
                <table className="w-full">
                  <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Buy</th><th className="text-right">Hold</th><th className="text-right">Sell</th><th className="text-right">Target</th><th className="text-right">Consensus</th></tr></thead>
                  <tbody>
                    {[
                      { s: 'AAPL', b: 28, h: 4, se: 1, t: 250, c: 'BUY' },
                      { s: 'MSFT', b: 32, h: 2, se: 0, t: 500, c: 'BUY' },
                      { s: 'TSLA', b: 15, h: 12, se: 8, t: 220, c: 'HOLD' },
                      { s: 'NVDA', b: 35, h: 3, se: 0, t: 950, c: 'BUY' },
                      { s: 'META', b: 25, h: 6, se: 2, t: 550, c: 'BUY' },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="text-left text-accent-cyan">{r.s}</td>
                        <td className="text-right text-accent-green">{r.b}</td>
                        <td className="text-right text-accent-yellow">{r.h}</td>
                        <td className="text-right text-accent-red">{r.se}</td>
                        <td className="text-right">${r.t}</td>
                        <td className={`text-right ${r.c === 'BUY' ? 'text-accent-green' : 'text-accent-yellow'}`}>{r.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="ESTIMATES vs CONSENSUS">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Metric</th><th className="text-right">Qtr</th><th className="text-right">Consensus</th><th className="text-right">High</th><th className="text-right">Low</th><th className="text-right">Our Est</th></tr></thead>
                <tbody>
                  {[
                    { s: 'AAPL', m: 'EPS', q: 'Q3 2025', c: 1.35, h: 1.42, l: 1.28, o: 1.38 },
                    { s: 'AAPL', m: 'Revenue', q: 'Q3 2025', c: 89500, h: 92000, l: 87000, o: 90500 },
                    { s: 'MSFT', m: 'EPS', q: 'Q3 2025', c: 2.82, h: 2.95, l: 2.74, o: 2.88 },
                    { s: 'MSFT', m: 'Revenue', q: 'Q3 2025', c: 65500, h: 68000, l: 64000, o: 66800 },
                    { s: 'NVDA', m: 'EPS', q: 'Q2 2025', c: 5.64, h: 5.85, l: 5.42, o: 5.72 },
                    { s: 'NVDA', m: 'Revenue', q: 'Q2 2025', c: 28500, h: 30000, l: 27500, o: 29200 },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td className="text-left text-accent-cyan">{r.s}</td>
                      <td className="text-left text-primary">{r.m}</td>
                      <td className="text-right">{r.q}</td>
                      <td className="text-right">{r.m === 'EPS' ? `$${r.c.toFixed(2)}` : `$${(r.c / 1000).toFixed(1)}B`}</td>
                      <td className="text-right text-accent-green">{r.m === 'EPS' ? `$${r.h.toFixed(2)}` : `$${(r.h / 1000).toFixed(1)}B`}</td>
                      <td className="text-right text-accent-red">{r.m === 'EPS' ? `$${r.l.toFixed(2)}` : `$${(r.l / 1000).toFixed(1)}B`}</td>
                      <td className="text-right text-accent-cyan">{r.m === 'EPS' ? `$${r.o.toFixed(2)}` : `$${(r.o / 1000).toFixed(1)}B`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'transcripts' && (
        <Card title="TRANSCRIPTS READER">
          <div className="font-mono-data text-[10px]">
            <div className="flex gap-1 mb-1">
              {['AAPL', 'MSFT', 'NVDA', 'TSLA'].map((s) => (
                <button key={s}
                  className="font-mono-data text-[9px] px-2 py-0.5 cursor-pointer"
                  style={{ background: 'rgba(59,130,246,0.15)', border: 'none', color: 'var(--accent-blue)' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--border-color)', padding: 8, maxHeight: 400, overflowY: 'auto' }}>
              <div className="text-[9px] text-muted mb-1">APPLE INC. (AAPL) — Q2 2025 EARNINGS CALL — APRIL 24, 2025</div>
              <p className="text-primary mb-1"><span className="text-accent-green">Tim Cook (CEO):</span> Thank you, and good afternoon everyone. We're pleased to report our strongest June quarter ever, with revenue of $89.5 billion, up 8% year-over-year. Services revenue reached an all-time high of $24.2 billion.</p>
              <p className="text-primary mb-1"><span className="text-accent-yellow">Luca Maestri (CFO):</span> Our installed base of active devices reached a new all-time high across all geographic segments. We generated $26 billion in operating cash flow and returned over $25 billion to shareholders.</p>
              <p className="text-primary mb-1"><span className="text-accent-red">Analyst (Morgan Stanley):</span> Tim, can you comment on the AI monetization opportunity and how it's reflected in the Services growth trajectory?</p>
              <p className="text-primary mb-1"><span className="text-accent-green">Tim Cook:</span> We see AI as a transformative technology. Apple Intelligence will unlock new capabilities across our ecosystem and we're investing significantly. The Services growth reflects both increased installed base and higher engagement per user.</p>
              <div className="mt-1 flex gap-2 text-[9px]">
                <span className="text-muted" style={{ background: 'rgba(59,130,246,0.1)', padding: '2px 4px' }}>Topic: AI</span>
                <span className="text-muted" style={{ background: 'rgba(34,197,94,0.1)', padding: '2px 4px' }}>Topic: Services</span>
                <span className="text-muted" style={{ background: 'rgba(234,179,8,0.1)', padding: '2px 4px' }}>Topic: Guidance</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'sentiment' && (
        <Card title="NEWS SENTIMENT BY TICKER">
          <div className="font-mono-data text-[10px]">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { s: 'AAPL', sc: 78, n: 245, l: 'Bullish', t: 'AI growth, Services strong' },
                { s: 'MSFT', sc: 82, n: 312, l: 'Bullish', t: 'Azure acceleration, Copilot demand' },
                { s: 'TSLA', sc: 32, n: 458, l: 'Bearish', t: 'Delivery miss, margin pressure' },
                { s: 'NVDA', sc: 91, n: 567, l: 'Bullish', t: 'Data center boom, Blackwell ramp' },
                { s: 'META', sc: 65, n: 189, l: 'Neutral', t: 'Ad revenue solid, capex concerns' },
                { s: 'AMZN', sc: 72, n: 278, l: 'Bullish', t: 'AWS growth, retail margin expansion' },
              ].map((r) => (
                <div key={r.s} style={{ border: '1px solid var(--border-color)', padding: 8 }}>
                  <div className="flex justify-between items-center">
                    <span className="text-accent-cyan font-bold">{r.s}</span>
                    <span className={`${r.sc >= 60 ? 'text-accent-green' : r.sc >= 40 ? 'text-accent-yellow' : 'text-accent-red'} font-bold`}>{r.sc}/100</span>
                  </div>
                  <div className="text-[9px] text-muted">{r.n} articles • {r.l}</div>
                  <div className="text-primary mt-0.5">{r.t}</div>
                  <div className="mt-1 w-full h-1 bg-border overflow-hidden rounded-full">
                    <div className="h-full" style={{ width: `${r.sc}%`, background: r.sc >= 60 ? 'var(--accent-green)' : r.sc >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {tab === 'signals' && (
        <div className="grid grid-cols-2 gap-1.5">
          <Card title="WHALE WATCH — LARGE BLOCK DETECTION">
            <div className="font-mono-data text-[10px]">
              <div className="flex items-center gap-2 mb-1">
                <input type="text" placeholder="FILTER SYMBOL..." className="bg-transparent border border-default px-1 py-0.5 text-[10px] text-primary w-24" />
                <span className="text-[9px] text-muted">Min block: $5M</span>
              </div>
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Symbol</th><th className="text-right">Size</th><th className="text-right">Value</th><th className="text-right">Side</th><th className="text-left">Venue</th><th className="text-right">Time</th></tr></thead>
                <tbody>
                  {[
                    { s: 'SPY', sz: '500K', v: '$271.6M', sd: 'BUY', ven: 'Dark Pool', t: '09:31:15' },
                    { s: 'QQQ', sz: '200K', v: '$95.2M', sd: 'BUY', ven: 'Off-Exch', t: '09:32:44' },
                    { s: 'AAPL', sz: '85K', v: '$16.9M', sd: 'SELL', ven: 'ATS', t: '09:35:02' },
                    { s: 'IWM', sz: '150K', v: '$31.5M', sd: 'BUY', ven: 'Dark Pool', t: '09:38:55' },
                    { s: 'TSLA', sz: '120K', v: '$29.4M', sd: 'SELL', ven: 'Off-Exch', t: '09:42:10' },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td className="text-left text-accent-cyan">{r.s}</td>
                      <td className="text-right">{r.sz}</td>
                      <td className="text-right text-accent-yellow">{r.v}</td>
                      <td className={`text-right ${r.sd === 'BUY' ? 'text-accent-green' : 'text-accent-red'}`}>{r.sd}</td>
                      <td className="text-left text-muted">{r.ven}</td>
                      <td className="text-right text-muted">{r.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="SHORT SQUEEZE RANKING">
            <div className="font-mono-data text-[10px]">
              <table className="w-full">
                <thead><tr className="text-[9px] text-muted"><th className="text-left">Rank</th><th className="text-left">Symbol</th><th className="text-right">SI % Float</th><th className="text-right">DTC</th><th className="text-right">CTB</th><th className="text-right">Squeeze Score</th></tr></thead>
                <tbody>
                  {[
                    { r: 1, s: 'GME', si: 42.5, dtc: 8.2, ctb: 35.4, sc: 86 },
                    { r: 2, s: 'AMC', si: 28.3, dtc: 6.1, ctb: 22.8, sc: 72 },
                    { r: 3, s: 'CVNA', si: 22.1, dtc: 5.3, ctb: 18.5, sc: 61 },
                    { r: 4, s: 'UPST', si: 19.8, dtc: 4.9, ctb: 16.2, sc: 55 },
                    { r: 5, s: 'RIVN', si: 15.2, dtc: 3.8, ctb: 12.1, sc: 48 },
                  ].map((r) => (
                    <tr key={r.r}>
                      <td className="text-left text-muted">#{r.r}</td>
                      <td className="text-left text-accent-cyan">{r.s}</td>
                      <td className="text-right">{r.si.toFixed(1)}%</td>
                      <td className="text-right">{r.dtc.toFixed(1)}</td>
                      <td className="text-right">{r.ctb.toFixed(1)}%</td>
                      <td className={`text-right ${r.sc >= 70 ? 'text-accent-red' : r.sc >= 50 ? 'text-accent-yellow' : 'text-accent-green'}`}>{r.sc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 text-[9px] text-muted">Squeeze Score = weighted combo of SI%, DTC, CTB, volume surge, and gamma exposure</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
