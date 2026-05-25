import { useEffect, useState, useCallback } from 'react'
import { usePaperTradingStore } from '../store/paperTrading'
import Card from '../components/ui/Card'
import VirtualList from '../components/VirtualList'
import { startPaperSimulation, stopPaperSimulation, resetPaperAccount } from '../api/client'
import { useToastStore } from '../store/toast'
import { useLivePrices } from '../contexts/LivePricesContext'

const ROW_HEIGHT = 22

export default function PaperTrading() {
  const { account, trades, addTrade, updateAccount } = usePaperTradingStore()
  const addToast = useToastStore((s) => s.addToast)
  const { getPrice, connected: wsConnected } = useLivePrices()

  const [symbol, setSymbol] = useState('AAPL')
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [qty, setQty] = useState(100)
  const [price, setPrice] = useState(0)
  const [running, setRunning] = useState(account.isRunning)

  useEffect(() => {
    const live = getPrice(symbol.toUpperCase())
    setPrice(live?.price ?? (price || 150))
  }, [symbol])

  useEffect(() => {
    setRunning(account.isRunning)
  }, [account.isRunning])

  const handleStart = async () => {
    try {
      await startPaperSimulation()
      usePaperTradingStore.getState().startSimulation()
      setRunning(true)
      addToast('Paper trading simulation started', 'success')
    } catch (err: any) {
      addToast(`Failed to start: ${err?.message || 'Error'}`, 'error')
    }
  }

  const handleStop = async () => {
    try {
      await stopPaperSimulation()
      usePaperTradingStore.getState().stopSimulation()
      setRunning(false)
      addToast('Simulation stopped', 'info')
    } catch (err: any) {
      addToast(`Failed to stop: ${err?.message || 'Error'}`, 'error')
    }
  }

  const handleReset = async () => {
    try {
      await resetPaperAccount()
      usePaperTradingStore.getState().resetAccount()
      setRunning(false)
      addToast('Account reset', 'success')
    } catch (err: any) {
      addToast(`Failed to reset: ${err?.message || 'Error'}`, 'error')
    }
  }

  const handleTrade = () => {
    const currentPrice = getPrice(symbol.toUpperCase())?.price ?? price
    const trade = {
      id: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      symbol: symbol.toUpperCase(),
      side,
      quantity: qty,
      price: currentPrice,
      timestamp: new Date().toISOString(),
      type: side,
    }
    const pnl = side === 'SELL' ? (currentPrice - price) * qty : 0
    const prevEquity = account.equity
    const newEquity = prevEquity + pnl
    addTrade(trade)
    updateAccount({
      equity: newEquity,
      balance: account.balance + (side === 'SELL' ? currentPrice * qty : -currentPrice * qty),
      openPnl: side === 'BUY' ? (currentPrice - price) * qty : 0,
      totalReturn: ((newEquity - 100000) / 100000),
      winRate: pnl >= 0 ? (account.winRate * account.totalTrades + 1) / (account.totalTrades + 1) : (account.winRate * account.totalTrades) / (account.totalTrades + 1),
    })
    addToast(`${side} ${qty} ${symbol} @ ${currentPrice.toFixed(2)}`, 'success')
  }

  const renderTrade = useCallback((trade: { id: string; symbol: string; side: string; quantity: number; price: number; timestamp: string }) => (
    <div key={trade.id} className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.6fr_0.7fr] border-b border-default font-mono-data text-[11px] text-primary px-2" style={{ height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}>
      <span className="text-muted font-mono-data text-[10px]">{new Date(trade.timestamp).toLocaleTimeString()}</span>
      <span className="text-accent-cyan font-semibold">{trade.symbol}</span>
      <span className="text-center" style={{ color: trade.side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{trade.side}</span>
      <span className="text-right">{trade.quantity}</span>
      <span className="text-right">${trade.price.toFixed(2)}</span>
    </div>
  ), [])

  return (
    <div className="flex flex-col gap-1.5">
      {/* ACCOUNT METRICS */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'BALANCE', value: `$${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'EQUITY', value: `$${account.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
          { label: 'BUY POWER', value: `$${account.buyingPower.toLocaleString()}` },
          { label: 'OPEN P&L', value: `${account.openPnl >= 0 ? '+' : ''}$${account.openPnl.toFixed(2)}`, col: account.openPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
        ].map(m => (
          <div key={m.label} className="bg-card border border-default px-2.5 py-1.5">
            <div className="text-[9px] font-mono-data tracking-wider text-muted">{m.label}</div>
            <div className="font-mono-data text-[11px] font-bold" style={{ color: m.col || 'var(--text-primary)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* SECOND METRIC ROW */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'TOTAL RETURN', value: `${(account.totalReturn * 100).toFixed(1)}%`, col: account.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
          { label: 'TRADES', value: String(account.totalTrades) },
          { label: 'WIN RATE', value: `${(account.winRate * 100).toFixed(0)}%` },
          { label: 'STATUS', value: running ? 'RUNNING' : 'STOPPED', col: running ? 'var(--accent-green)' : 'var(--text-muted)' },
        ].map(m => (
          <div key={m.label} className="bg-card border border-default px-2.5 py-1.5">
            <div className="text-[9px] font-mono-data tracking-wider text-muted">{m.label}</div>
            <div className="font-mono-data text-[11px] font-bold" style={{ color: m.col || 'var(--text-primary)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* CONTROLS + TRADE ENTRY */}
      <div className="grid grid-cols-2 gap-1.5">
        <Card title="CONTROLS">
          <div className="flex gap-1">
            <button onClick={handleStart} disabled={running}
              className="flex-1 border-none font-mono-data text-[11px] font-semibold py-1" style={{ background: running ? 'var(--border-color)' : 'var(--accent-green)', color: running ? 'var(--text-muted)' : '#000', cursor: running ? 'default' : 'pointer' }}>
              START
            </button>
            <button onClick={handleStop} disabled={!running}
              className="flex-1 border-none font-mono-data text-[11px] font-semibold py-1" style={{ background: !running ? 'var(--border-color)' : 'var(--accent-red)', color: !running ? 'var(--text-muted)' : '#fff', cursor: !running ? 'default' : 'pointer' }}>
              STOP
            </button>
            <button onClick={handleReset}
              className="flex-1 bg-card text-secondary border border-default font-mono-data text-[11px] py-0.5 cursor-pointer">
              RESET
            </button>
          </div>
          <div className="flex gap-0.5 font-mono-data text-[10px] text-muted mt-1">
            <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: wsConnected ? 'var(--accent-green)' : 'var(--accent-red)' }} />
            {wsConnected ? 'WS CONNECTED' : 'WS DISCONNECTED'}
          </div>
        </Card>

        <Card title="QUICK TRADE">
          <div className="grid grid-cols-[1fr_1fr_0.6fr_0.8fr_0.5fr] gap-1">
            <div><div className="text-[9px] font-mono-data tracking-wider text-muted">SYMBOL</div><input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
            <div><div className="text-[9px] font-mono-data tracking-wider text-muted">SIDE</div>
              <select value={side} onChange={(e) => setSide(e.target.value as 'BUY' | 'SELL')} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full cursor-pointer appearance-none">
                <option value="BUY">BUY</option><option value="SELL">SELL</option>
              </select>
            </div>
            <div><div className="text-[9px] font-mono-data tracking-wider text-muted">QTY</div><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} min={1} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
            <div><div className="text-[9px] font-mono-data tracking-wider text-muted">PRICE</div><input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} step={0.01} className="bg-card border border-default text-primary font-mono-data text-[10px] px-1.5 py-0.5 outline-none w-full" /></div>
            <div className="flex items-end">
              <button onClick={handleTrade}
                className="w-full border-none font-mono-data text-[11px] font-bold py-0.5 cursor-pointer" style={{ background: side === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)', color: '#000' }}>
                {side}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* TRADE HISTORY */}
      <Card title={`TRADE LOG (${trades.length})`}>
        <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.6fr_0.7fr] px-2 py-1 border-b border-default text-[9px] font-mono-data tracking-wider text-muted">
          <span>Time</span><span>Symbol</span><span className="text-center">Side</span><span className="text-right">Qty</span><span className="text-right">Price</span>
        </div>
        {trades.length > 0 ? (
          <VirtualList items={trades} itemHeight={ROW_HEIGHT} renderItem={renderTrade} maxHeight={360} keyExtractor={(t) => t.id} />
        ) : (
          <div className="py-6 text-center font-mono-data text-[10px] text-muted">No trades yet</div>
        )}
      </Card>
    </div>
  )
}
