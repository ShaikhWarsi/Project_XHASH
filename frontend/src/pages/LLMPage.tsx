import { useState } from 'react'
import Breadcrumbs from '../components/Breadcrumbs'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import LLMPanel from '../components/LLMPanel'

export default function LLMPage() {
  const [nlpInput, setNlpInput] = useState('')
  const [parsed, setParsed] = useState<{ action: string; symbol: string; qty: number; price?: number; stop?: number; condition?: string } | null>(null)

  const handleParse = () => {
    const text = nlpInput.toUpperCase()
    const result: typeof parsed = { action: '', symbol: '', qty: 0 }

    if (text.includes('BUY')) result.action = 'BUY'
    else if (text.includes('SELL')) result.action = 'SELL'
    else if (text.includes('COVER')) result.action = 'COVER'
    else if (text.includes('SHORT')) result.action = 'SHORT'

    const symMatch = text.match(/\b[A-Z]{1,5}\b/)
    if (symMatch) result.symbol = symMatch[0]

    const qtyMatch = text.match(/(\d+)\s*(SHARES|CONTRACTS|QTY)/)
    if (qtyMatch) result.qty = parseInt(qtyMatch[1])

    const stopMatch = text.match(/STOP\s*(?:AT\s*)?\$?(\d+\.?\d*)/)
    if (stopMatch) result.stop = parseFloat(stopMatch[1])

    const priceMatch = text.match(/AT\s*\$?(\d+\.?\d*)/)
    if (priceMatch && !text.includes('STOP')) result.price = parseFloat(priceMatch[1])

    if (text.includes('IF') || text.includes('WHEN')) {
      const condMatch = text.match(/(?:IF|WHEN)\s+(.+?)(?:,|\.|$)/)
      if (condMatch) result.condition = condMatch[1].trim()
    }

    setParsed(result)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Breadcrumbs />
      <Card title="PROMPT-TO-TRADE">
        <div className="flex flex-col gap-1 font-mono-data text-[10px]">
          <div className="flex gap-1">
            <input
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleParse() }}
              placeholder="e.g., Buy 100 AAPL at $198, stop at $192"
              className="flex-1 bg-input border border-input text-primary px-2 py-1 outline-none rounded-sm"
            />
            <button onClick={handleParse}
              className="px-3 py-1 cursor-pointer border-none rounded-sm text-white text-[10px]"
              style={{ background: 'var(--accent-cyan)' }}>
              PARSE
            </button>
          </div>
          <div className="flex flex-wrap gap-1 text-[9px] text-muted">
            <span>Try: "Buy 100 shares of AAPL at $198, stop at $192"</span>
            <span>| "Sell 50 SPY if RSI &lt; 30"</span>
            <span>| "Short 200 TSLA, target $220"</span>
          </div>
          {parsed && (
            <div style={{ background: 'var(--border-color)', padding: 8 }} className="rounded-sm">
              <div className="text-[9px] text-muted mb-1">PARSED ORDER:</div>
              <div className="grid grid-cols-5 gap-1">
                {parsed.action && <div><span className="text-muted">Action:</span> <span className={`${parsed.action === 'BUY' || parsed.action === 'COVER' ? 'text-accent-green' : 'text-accent-red'}`}>{parsed.action}</span></div>}
                {parsed.symbol && <div><span className="text-muted">Symbol:</span> <span className="text-accent-cyan">{parsed.symbol}</span></div>}
                {parsed.qty > 0 && <div><span className="text-muted">Qty:</span> <span className="text-primary">{parsed.qty}</span></div>}
                {parsed.price && <div><span className="text-muted">Price:</span> <span className="text-primary">${parsed.price.toFixed(2)}</span></div>}
                {parsed.stop && <div><span className="text-muted">Stop:</span> <span className="text-accent-red">${parsed.stop.toFixed(2)}</span></div>}
              </div>
              {parsed.condition && <div className="mt-1"><span className="text-muted">Condition:</span> <span className="text-accent-yellow">{parsed.condition}</span></div>}
              <div className="mt-1 flex gap-1">
                <button className="px-2 py-0.5 text-[9px] cursor-pointer border-none rounded-sm" style={{ background: 'rgba(34,197,94,0.2)', color: 'var(--accent-green)' }}>✓ Submit</button>
                <button className="px-2 py-0.5 text-[9px] cursor-pointer border-none rounded-sm" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }} onClick={() => setParsed(null)}>✗ Cancel</button>
              </div>
            </div>
          )}
        </div>
      </Card>
      <LLMPanel />
    </div>
  )
}
