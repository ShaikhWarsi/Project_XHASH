import { useState, useCallback } from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { explainStop } from '../api/llm'
import { ShieldAlert, Sparkles } from 'lucide-react'

export default function ExplainableStops() {
  const [symbol, setSymbol] = useState('AAPL')
  const [entryPrice, setEntryPrice] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [side, setSide] = useState('long')
  const [atr, setAtr] = useState('')
  const [vol, setVol] = useState('')
  const [regime, setRegime] = useState('neutral')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExplain = useCallback(async () => {
    if (!entryPrice || !stopPrice) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await explainStop({
        symbol, side,
        entry_price: parseFloat(entryPrice),
        current_price: currentPrice ? parseFloat(currentPrice) : parseFloat(entryPrice),
        stop_price: parseFloat(stopPrice),
        position_size: 100,
        atr_value: atr ? parseFloat(atr) : undefined,
        volatility_percent: vol ? parseFloat(vol) : undefined,
        market_regime: regime,
      })
      setResult(res)
    } catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }, [symbol, entryPrice, currentPrice, stopPrice, side, atr, vol, regime])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2"><ShieldAlert size={20} /> Explainable Stops</h1>
      <p className="text-sm text-muted">Understand why your stop loss is set at a specific level based on volatility, structure, and risk parameters.</p>

      <Card title="Position Details">
        <div className="grid grid-cols-3 gap-2">
          <div><label className="block text-[10px] text-muted">Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
          <div><label className="block text-[10px] text-muted">Side</label>
            <select value={side} onChange={(e) => setSide(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none"><option value="long">Long</option><option value="short">Short</option></select></div>
          <div><label className="block text-[10px] text-muted">Regime</label>
            <select value={regime} onChange={(e) => setRegime(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none">
              <option value="bull">Bull</option><option value="bear">Bear</option><option value="range">Range</option><option value="high_vol">High Vol</option><option value="neutral">Neutral</option></select></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div><label className="block text-[10px] text-muted">Entry Price</label>
            <input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
          <div><label className="block text-[10px] text-muted">Current Price</label>
            <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
          <div><label className="block text-[10px] text-muted">Stop Price</label>
            <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div><label className="block text-[10px] text-muted">ATR Value (optional)</label>
            <input type="number" step="0.01" value={atr} onChange={(e) => setAtr(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
          <div><label className="block text-[10px] text-muted">Volatility % (optional)</label>
            <input type="number" step="0.1" value={vol} onChange={(e) => setVol(e.target.value)} className="w-full bg-[var(--bg-hover)] border border-[var(--input-border)] rounded px-2 py-1.5 text-sm text-primary outline-none" /></div>
        </div>
        <button onClick={handleExplain} disabled={loading || !entryPrice || !stopPrice}
          className="mt-2 flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer disabled:opacity-50">
          <Sparkles size={14} /> {loading ? 'Analyzing...' : 'Explain Stop'}
        </button>
      </Card>

      {error && <div className="text-accent-red text-xs">{error}</div>}

      {result && (
        <>
          <Card title="Stop Explanation">
            <div className="flex items-center gap-2 mb-2">
              <Badge label={result.method_used} variant="info" />
              <Badge label={`${(result.confidence * 100).toFixed(0)}% confidence`} variant={result.confidence > 0.7 ? 'success' : result.confidence > 0.3 ? 'warning' : 'error'} />
            </div>
            <div className="text-sm text-primary leading-relaxed">{result.explanation}</div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            {result.risk_amount != null && <Card title="Risk Amount"><div className="text-lg font-mono font-bold" style={{ color: result.risk_amount < 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>${Math.abs(result.risk_amount).toFixed(2)}</div></Card>}
            {result.risk_pct != null && <Card title="Risk %"><div className="text-lg font-mono font-bold" style={{ color: result.risk_pct > 2 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>{result.risk_pct.toFixed(2)}%</div></Card>}
            {result.key_factors?.length > 0 && <Card title="Key Factors"><div className="text-xs text-muted">{result.key_factors.join(', ')}</div></Card>}
          </div>
        </>
      )}
    </div>
  )
}
