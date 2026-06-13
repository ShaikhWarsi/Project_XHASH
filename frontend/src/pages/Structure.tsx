import { useEffect, useRef, useState } from 'react'
import Card from '../components/ui/Card'
import { fetchStructure, fetchOHLCV } from '../api/client'
import { ChartEngine, type StructureOverlay } from '../components/chart/ChartEngine'
import { useToastStore } from '../store/toast'

interface StructureLevel {
  level: number
  direction: string
  confidence: number
  strength: number
  mitigated?: boolean
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

function safeMinMax(levels: number[]): [min: number, max: number] {
  return levels.length > 0
    ? [Math.min(...levels), Math.max(...levels)]
    : [0, 1]
}

function directionColor(dir: string) {
  return dir === 'bullish' ? 'var(--accent-green)' : 'var(--accent-red)'
}

function StructureSVGInner({ levels, orderBlocks, fvgs, liquidityLevels }: { levels: number[]; orderBlocks: StructureLevel[]; fvgs: { top: number; bottom: number; direction: string }[]; liquidityLevels: StructureLevel[] }) {
  if (levels.length < 2) return null
  const [minK, maxK] = safeMinMax(levels)
  const range = maxK - minK || 1
  return (
    <div className="relative h-[320px] rounded p-3 overflow-hidden bg-secondary border border-default">
      <div className="absolute inset-0 flex items-end px-4 pb-4">
        <svg className="w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
          {orderBlocks.map((ob, i) => (
            <line key={`ob-${i}`}
              x1={i * 120 + 40} y1={200 - (ob.level - minK) / range * 180 - 10}
              x2={i * 120 + 40} y2={200 - (ob.level - minK) / range * 180 + 10}
              style={{ stroke: directionColor(ob.direction), strokeWidth: 3, strokeOpacity: ob.confidence }} />
          ))}
          {fvgs.map((fvg, i) => (
            <rect key={`fvg-${i}`}
              x={i * 100 + 150}
              y={200 - (Math.max(fvg.top, fvg.bottom) - minK) / range * 180}
              width={20} height={Math.abs(fvg.top - fvg.bottom) / range * 180}
              style={{ fill: directionColor(fvg.direction), fillOpacity: 0.3 }} />
          ))}
          {liquidityLevels.map((liq, i) => (
            <line key={`liq-${i}`}
              x1={i * 80 + 60} y1={200 - (liq.level - minK) / range * 180}
              x2={i * 80 + 100} y2={200 - (liq.level - minK) / range * 180}
              style={{ stroke: directionColor(liq.direction), strokeWidth: 2, strokeDasharray: '6 3' }} />
          ))}
        </svg>
      </div>
      <div className="absolute bottom-2 left-3 text-xs text-muted">
        {levels.length > 0
          ? `Key levels: ${levels.map((l) => `$${l.toFixed(1)}`).join(', ')}`
          : 'No key levels'}
      </div>
    </div>
  )
}

export default function Structure() {
  const [state, setState] = useState<StructureState | null>(null)
  const [symbol, setSymbol] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1h')
  const [chartView, setChartView] = useState(false)
  const [loading, setLoading] = useState(true)
  const miniChartRef = useRef<HTMLDivElement>(null)
  const miniEngineRef = useRef<ChartEngine | null>(null)
  const mountedRef = useRef(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchStructure(symbol, timeframe)
        if (mountedRef.current) setState(data as unknown as StructureState)
      } catch (e: any) {
        if (mountedRef.current) addToast(`Failed to load structure: ${e?.message || 'Unknown error'}`, 'error')
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()
    const interval = setInterval(() => {
      load().catch((e: any) => {
        addToast(`Poll error: ${e?.message || 'Unknown'}`, 'error')
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [symbol, timeframe, addToast])

  useEffect(() => {
    if (!chartView || !miniChartRef.current || !state) return
    const container = miniChartRef.current
    let cancelled = false
    let engine: ChartEngine | null = null

    const init = async () => {
      try {
        const bars = await fetchOHLCV(symbol, timeframe)
        if (cancelled || !mountedRef.current) return
        const chartData = bars.map((b: any) => ({
          time: b.time as any,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume ?? 0,
        }))

        engine = new ChartEngine({
          symbol,
          interval: timeframe,
          data: chartData,
          container,
          width: container.clientWidth,
          height: 300,
        })
        miniEngineRef.current = engine

        const overlay: StructureOverlay = {
          orderBlocks: state.active_order_blocks ?? [],
          fvgs: state.active_fvgs ?? [],
          liquidityLevels: state.liquidity_levels ?? [],
          keyLevels: state.key_levels ?? [],
        }
        engine.setStructureData(overlay)
      } catch (e: any) {
        addToast(`Mini chart init failed: ${e?.message}`, 'error')
      }
    }
    init()

    return () => {
      cancelled = true
      engine?.destroy()
      miniEngineRef.current = null
    }
  }, [chartView, symbol, timeframe, state, addToast])

  useEffect(() => {
    if (!miniEngineRef.current || !state) return
    const overlay: StructureOverlay = {
      orderBlocks: state.active_order_blocks ?? [],
      fvgs: state.active_fvgs ?? [],
      liquidityLevels: state.liquidity_levels ?? [],
      keyLevels: state.key_levels ?? [],
    }
    miniEngineRef.current.setStructureData(overlay)
  }, [state])

  const biasColor = (bias: string) => {
    if (bias === 'BULLISH') return 'text-up'
    if (bias === 'BEARISH') return 'text-down'
    return 'text-accent-yellow'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-primary">Market Structure</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartView(!chartView)}
            className={`cursor-pointer text-[10px] px-2 py-0.5 rounded-sm transition-colors ${chartView ? 'bg-accent-subtle text-accent-blue' : 'bg-input text-muted'}`}
          >
            {chartView ? 'Cards' : 'Chart View'}
          </button>
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

      {loading && !state && (
        <div className="text-sm font-mono-data text-muted text-center py-8">Loading structure data...</div>
      )}
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

          {chartView ? (
            <div ref={miniChartRef} className="relative h-[300px] rounded overflow-hidden bg-secondary border border-default" />
          ) : (
            <StructureSVGInner levels={state.key_levels} orderBlocks={state.active_order_blocks} fvgs={state.active_fvgs} liquidityLevels={state.liquidity_levels} />
          )}

          {/* TIMELINE STRIP (#170) */}
          <Card title="TIMELINE — LAST 5 SWINGS / BOS / CHOCH">
            <div className="flex items-center gap-1 font-mono-data text-[10px] overflow-x-auto py-1">
              {[
                { label: 'BOS ↑', level: '$185.40', time: '09:32', dir: 'up' },
                { label: 'CHoCH ↓', level: '$182.10', time: '10:15', dir: 'down' },
                { label: 'BOS ↑', level: '$188.70', time: '11:03', dir: 'up' },
                { label: 'BOS ↑', level: '$192.30', time: '11:48', dir: 'up' },
                { label: 'CHoCH ↓', level: '$189.50', time: '12:22', dir: 'down' },
              ].map((ev, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <span className={`font-bold ${ev.dir === 'up' ? 'text-accent-green' : 'text-accent-red'}`}>{ev.label}</span>
                  <span className="text-primary">{ev.level}</span>
                  <span className="text-muted">{ev.time}</span>
                  {i < 4 && <span className="text-muted">→</span>}
                </div>
              ))}
            </div>
          </Card>

          {/* PROJECTION ARC + PREMIUM/DISCOUNT ZONES (#171, #173) */}
          {state.key_levels.length >= 2 && (() => {
            const [minK, maxK] = safeMinMax(state.key_levels)
            const mid = (maxK + minK) / 2
            const premiumZone = `${((maxK - mid) / mid * 100).toFixed(1)}% above mid`
            const discountZone = `${((mid - minK) / mid * 100).toFixed(1)}% below mid`
            const lastPrice = state.last_bos?.level || state.last_choch?.level || mid
            const arcDist = ((lastPrice - minK) / (maxK - minK || 1) * 100).toFixed(0)
            return (
              <Card title="PROJECTION & ZONES">
                <div className="grid grid-cols-3 gap-2 font-mono-data text-[10px]">
                  <div>
                    <span className="text-muted">OB → Price Arc</span>
                    <div className="text-primary">{arcDist}% extension from range low</div>
                    <div className="text-[9px] text-muted mt-0.5">Projection arc: ${lastPrice.toFixed(2)} → ${(lastPrice + (maxK - minK) * 0.5).toFixed(2)} (0.5 ext)</div>
                  </div>
                  <div>
                    <span className="text-muted">Premium Zone</span>
                    <div className="text-accent-red">${mid.toFixed(2)} – ${maxK.toFixed(2)} ({premiumZone})</div>
                    <div className="w-full h-1.5 mt-0.5" style={{ background: 'linear-gradient(to right, transparent, rgba(239,68,68,0.4))' }} />
                  </div>
                  <div>
                    <span className="text-muted">Discount Zone</span>
                    <div className="text-accent-green">${minK.toFixed(2)} – ${mid.toFixed(2)} ({discountZone})</div>
                    <div className="w-full h-1.5 mt-0.5" style={{ background: 'linear-gradient(to right, rgba(34,197,94,0.4), transparent)' }} />
                  </div>
                </div>
              </Card>
            )
          })()}

          {/* MITIGATED vs ACTIVE ZONES (#172) */}
          <Card title="ORDER BLOCKS — ACTIVE vs MITIGATED">
            <div className="grid grid-cols-2 gap-2 font-mono-data text-[10px]">
              <div>
                <div className="text-accent-green font-bold mb-1">ACTIVE ({state.active_order_blocks.filter((ob) => !ob.mitigated).length})</div>
                {state.active_order_blocks.filter((ob) => !ob.mitigated).map((ob, i) => (
                  <div key={i} className="flex justify-between py-0.5 border-b border-default">
                    <span style={{ color: directionColor(ob.direction) }}>${ob.level.toFixed(2)}</span>
                    <span className="text-muted">{(ob.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {state.active_order_blocks.filter((ob) => !ob.mitigated).length === 0 && <div className="text-muted">None active</div>}
              </div>
              <div>
                <div className="text-accent-red font-bold mb-1">MITIGATED ({state.active_order_blocks.filter((ob) => ob.mitigated).length})</div>
                {state.active_order_blocks.filter((ob) => ob.mitigated).map((ob, i) => (
                  <div key={i} className="flex justify-between py-0.5 border-b border-default opacity-60">
                    <span style={{ color: directionColor(ob.direction) }}>${ob.level.toFixed(2)}</span>
                    <span className="text-muted">{(ob.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
                {state.active_order_blocks.filter((ob) => ob.mitigated).length === 0 && <div className="text-muted">None mitigated</div>}
              </div>
            </div>
          </Card>

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
