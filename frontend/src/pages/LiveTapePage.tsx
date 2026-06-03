import { useState } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
const HEADLINES = [
  { time: '09:31', source: 'Reuters', headline: 'Fed Minutes Signal Caution on Rate Cuts', sentiment: 'negative', symbols: 'SPY,QQQ' },
  { time: '09:28', source: 'Bloomberg', headline: 'AAPL Reports Record Services Revenue in Q2', sentiment: 'positive', symbols: 'AAPL' },
  { time: '09:25', source: 'CNBC', headline: 'Oil Extends Gains on Middle East Tensions', sentiment: 'positive', symbols: 'CL=F,XOM' },
  { time: '09:22', source: 'WSJ', headline: 'Treasury Yields Rise Ahead of 10Y Auction', sentiment: 'negative', symbols: 'TLT' },
]

const SENTIMENT_TICKERS = [
  { s: 'SPY', sc: 72, n: 1254, l: 'Bullish' },
  { s: 'AAPL', sc: 78, n: 892, l: 'Bullish' },
  { s: 'TSLA', sc: 32, n: 1453, l: 'Bearish' },
  { s: 'NVDA', sc: 88, n: 2104, l: 'Bullish' },
  { s: 'META', sc: 61, n: 567, l: 'Neutral' },
]

export default function LiveTapePage() {
  const [keyword, setKeyword] = useState('')
  const [sentimentTicker, setSentimentTicker] = useState('')
  const filtered = HEADLINES.filter(h => !keyword || h.headline.toLowerCase().includes(keyword.toLowerCase()) || h.symbols.toLowerCase().includes(keyword.toLowerCase()))
  const filteredSentiment = SENTIMENT_TICKERS.filter(t => !sentimentTicker || t.s.includes(sentimentTicker.toUpperCase()))
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="NEWS SENTIMENT BY TICKER" actions={<input value={sentimentTicker} onChange={e => setSentimentTicker(e.target.value)} placeholder="Filter ticker..." className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm w-24" />}>
        <div className="flex gap-1.5">
          {filteredSentiment.map((t) => (
            <div key={t.s} style={{ border: '1px solid var(--border-color)', padding: '4px 8px', flex: 1 }}>
              <div className="flex justify-between items-center">
                <span className="text-accent-cyan font-mono-data text-[10px] font-bold">{t.s}</span>
                <span className={`font-mono-data text-[10px] font-bold ${t.sc >= 60 ? 'text-accent-green' : t.sc >= 40 ? 'text-accent-yellow' : 'text-accent-red'}`}>{t.sc}</span>
              </div>
              <div className="font-mono-data text-[9px] text-muted">{t.n} articles</div>
              <div className="w-full h-1 bg-border mt-0.5 overflow-hidden rounded-full">
                <div className="h-full" style={{ width: `${t.sc}%`, background: t.sc >= 60 ? 'var(--accent-green)' : t.sc >= 40 ? 'var(--accent-yellow)' : 'var(--accent-red)' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="LIVE TAPE" actions={<input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Filter keyword..." className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm w-40" />}>
        {filtered.map((h, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 border-b border-default last:border-b-0">
            <span className="text-[9px] font-mono-data text-muted shrink-0 w-10">{h.time}</span>
            <Badge label={h.source} variant="info" size="sm" />
            <span className="text-[10px] font-mono-data text-primary flex-1">{h.headline}</span>
            <Badge label={h.sentiment} variant={h.sentiment === 'positive' ? 'success' : 'error'} size="sm" />
            <span className="text-[9px] font-mono-data text-accent-cyan shrink-0 cursor-pointer hover:underline">{h.symbols}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
