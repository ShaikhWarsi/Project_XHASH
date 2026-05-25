import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import { fetchStructure } from '../api/client'
import { useToastStore } from '../store/toast'

interface StructureLevel {
  level: number
  direction: string
  confidence: number
  strength: number
}

interface StructureState {
  symbol: string
  timeframe: string
  composite_bias: string
  composite_confidence: number
  active_order_blocks: StructureLevel[]
  active_fvgs: { top: number; bottom: number; direction: string }[]
  liquidity_levels: StructureLevel[]
  last_bos: { direction: string; level: number } | null
  last_choch: { direction: string; level: number } | null
  key_levels: number[]
  regime: string
  total_signals: number
  bullish_count: number
  bearish_count: number
}

export default function Structure() {
  const [state, setState] = useState<StructureState | null>(null)
  const [symbol, setSymbol] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1h')
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStructure(symbol, timeframe)
        setState(data as unknown as StructureState)
      } catch (e: any) {
        addToast(`Failed to load structure: ${e?.message || 'Unknown error'}`, 'error')
      }
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [symbol, timeframe, addToast])

  const biasColor = (bias: string) => {
    if (bias === 'BULLISH') return 'text-up'
    if (bias === 'BEARISH') return 'text-down'
    return 'text-accent-yellow'
  }

  const directionColor = (dir: string) =>
    dir === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-primary">Market Structure</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-20 px-2 py-1 text-sm text-center rounded-sm outline-none bg-input border border-input text-primary focus:border-accent-blue"
          />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-2 py-1 text-sm rounded-sm outline-none bg-input border border-input text-primary focus:border-accent-blue"
          >
            {['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'].map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
      </div>

      {state && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card title="Composite Bias">
              <div className={`text-lg font-bold ${biasColor(state.composite_bias)}`}>
                {state.composite_bias}
              </div>
              <div className="text-xs text-secondary">
                {(state.composite_confidence * 100).toFixed(0)}% confidence
              </div>
            </Card>
            <Card title="Regime">
              <div className="text-lg font-bold text-primary">{state.regime}</div>
            </Card>
            <Card title="Signals">
              <div className="flex gap-2 text-sm">
                <span className="text-up">{state.bullish_count} ▲</span>
                <span className="text-down">{state.bearish_count} ▼</span>
                <span className="text-secondary">{state.total_signals} total</span>
              </div>
            </Card>
            <Card title="Structure">
              <div className="space-y-1 text-xs">
                {state.last_bos && (
                  <div style={{ color: directionColor(state.last_bos.direction) }}>
                    BOS: {state.last_bos.direction} @ ${state.last_bos.level.toFixed(2)}
                  </div>
                )}
                {state.last_choch && (
                  <div style={{ color: directionColor(state.last_choch.direction) }}>
                    CHOCH: {state.last_choch.direction} @ ${state.last_choch.level.toFixed(2)}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="relative h-[320px] rounded p-3 overflow-hidden bg-secondary border border-default">
            <div className="absolute inset-0 flex items-end px-4 pb-4">
              {state.key_levels.length > 0 && (
                <svg className="w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
                  {state.active_order_blocks.map((ob, i) => (
                    <line
                      key={`ob-${i}`}
                      x1={i * 120 + 40}
                      y1={200 - (ob.level - Math.min(...state.key_levels)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180 - 10}
                      x2={i * 120 + 40}
                      y2={200 - (ob.level - Math.min(...state.key_levels)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180 + 10}
                      style={{
                        stroke: directionColor(ob.direction),
                        strokeWidth: 3,
                        strokeOpacity: ob.confidence,
                      }}
                    />
                  ))}
                  {state.active_fvgs.map((fvg, i) => (
                    <rect
                      key={`fvg-${i}`}
                      x={i * 100 + 150}
                      y={200 - (Math.max(fvg.top, fvg.bottom) - Math.min(...state.key_levels)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180}
                      width={20}
                      height={(Math.abs(fvg.top - fvg.bottom)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180}
                      style={{
                        fill: directionColor(fvg.direction),
                        fillOpacity: 0.3,
                      }}
                    />
                  ))}
                  {state.liquidity_levels.map((liq, i) => (
                    <line
                      key={`liq-${i}`}
                      x1={i * 80 + 60}
                      y1={200 - (liq.level - Math.min(...state.key_levels)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180}
                      x2={i * 80 + 100}
                      y2={200 - (liq.level - Math.min(...state.key_levels)) / (Math.max(...state.key_levels) - Math.min(...state.key_levels)) * 180}
                      style={{
                        stroke: directionColor(liq.direction),
                        strokeWidth: 2,
                        strokeDasharray: '6 3',
                      }}
                    />
                  ))}
                </svg>
              )}
            </div>
            <div className="absolute bottom-2 left-3 text-xs text-muted">
              Key levels: {state.key_levels.map((l) => `$${l.toFixed(1)}`).join(', ')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Order Blocks">
              {state.active_order_blocks.length > 0 ? (
                <div className="space-y-1.5">
                  {state.active_order_blocks.map((ob, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span style={{ color: directionColor(ob.direction) }}>
                        ${ob.level.toFixed(2)}
                      </span>
                      <span className="text-secondary">
                        {(ob.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">No active order blocks</div>
              )}
            </Card>
            <Card title="Fair Value Gaps">
              {state.active_fvgs.length > 0 ? (
                <div className="space-y-1.5">
                  {state.active_fvgs.map((fvg, i) => (
                    <div key={i} className="text-sm">
                      <span style={{ color: directionColor(fvg.direction) }}>
                        ${fvg.bottom.toFixed(2)} – ${fvg.top.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">No fair value gaps</div>
              )}
            </Card>
            <Card title="Liquidity Zones">
              {state.liquidity_levels.length > 0 ? (
                <div className="space-y-1.5">
                  {state.liquidity_levels.map((liq, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span style={{ color: directionColor(liq.direction) }}>
                        ${liq.level.toFixed(2)}
                      </span>
                      <span className="text-secondary">
                        {(liq.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted">No liquidity levels</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
