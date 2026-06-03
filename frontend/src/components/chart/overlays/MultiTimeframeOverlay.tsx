import { useEffect, useRef, useState, useCallback } from 'react'
import type { CandlestickData } from 'lightweight-charts'
import { createChart, LineSeries, type IChartApi, type ISeriesApi, type LineData, type Time } from 'lightweight-charts'
import { fetchOHLCV } from '../../../api/client'

type HigherTimeframe = '1h' | '4h' | '1d' | '1w'

type IndicatorType = 'SMA 20' | 'EMA 50' | 'VWAP'

interface IndicatorConfig {
  type: IndicatorType
  timeframe: HigherTimeframe
  color: string
  dash: number[]
  label: string
  glow?: boolean
}

const INDICATOR_CONFIGS: Record<HigherTimeframe, IndicatorConfig> = {
  '4h': { type: 'EMA 50', timeframe: '4h', color: '#00bcd4', dash: [], label: '4h(50)', glow: false },
  '1h': { type: 'EMA 50', timeframe: '1h', color: '#00bcd4', dash: [], label: '1h(50)', glow: false },
  '1d': { type: 'SMA 20', timeframe: '1d', color: '#ff9800', dash: [8, 4], label: 'D(20)', glow: false },
  '1w': { type: 'SMA 20', timeframe: '1w', color: '#ab47bc', dash: [4, 4], label: 'W(20)', glow: true },
}

function computeSMA(data: CandlestickData[], period: number): { time: Time; value: number }[] {
  if (data.length < period) return []
  const result: { time: Time; value: number }[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    result.push({ time: data[i].time, value: sum / period })
  }
  return result
}

function computeEMA(data: CandlestickData[], period: number): { time: Time; value: number }[] {
  if (data.length < period) return []
  const result: { time: Time; value: number }[] = []
  const multiplier = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period
  result.push({ time: data[period - 1].time, value: ema })
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema
    result.push({ time: data[i].time, value: ema })
  }
  return result
}

function computeVWAP(data: CandlestickData[]): { time: Time; value: number }[] {
  const result: { time: Time; value: number }[] = []
  let cumVol = 0
  let cumPV = 0
  for (const d of data) {
    const vol = (d as any).volume ?? 0
    const typical = (d.high + d.low + d.close) / 3
    cumPV += typical * vol
    cumVol += vol
    if (cumVol > 0) {
      result.push({ time: d.time, value: cumPV / cumVol })
    }
  }
  return result
}

function computeIndicator(data: CandlestickData[], config: IndicatorConfig): { time: Time; value: number }[] {
  switch (config.type) {
    case 'SMA 20': return computeSMA(data, 20)
    case 'EMA 50': return computeEMA(data, 50)
    case 'VWAP': return computeVWAP(data)
  }
}

function mapHtfToCtf(
  htfValues: { time: Time; value: number }[],
  ctfData: CandlestickData[]
): LineData[] {
  if (htfValues.length === 0 || ctfData.length === 0) return []

  const htfTimeSet = new Set(htfValues.map((v) => +v.time))
  const htfMap = new Map<number, number>()
  for (const v of htfValues) {
    htfMap.set(+v.time, v.value)
  }

  let currentHtfValue: number | null = null
  const result: LineData[] = []

  for (const ctf of ctfData) {
    const ctfTime = +ctf.time
    if (htfTimeSet.has(ctfTime)) {
      currentHtfValue = htfMap.get(ctfTime) ?? currentHtfValue
    }
    if (currentHtfValue !== null) {
      result.push({ time: ctf.time, value: currentHtfValue })
    }
  }

  return result
}

const OVERLAY_OPTIONS: { value: HigherTimeframe; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
]

const containerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 8px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
}

const selectStyles: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #1a2332',
  borderRadius: 4,
  color: '#e8eaed',
  padding: '4px 8px',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  cursor: 'pointer',
}

const buttonBase: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #1a2332',
  borderRadius: 4,
  color: '#5d6b7e',
  padding: '4px 8px',
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  cursor: 'pointer',
  transition: 'all 0.15s',
}

interface MultiTimeframeOverlayProps {
  chartEngine: { chart: IChartApi } | null
  data: CandlestickData[]
  visible: boolean
  higherTimeframeData?: CandlestickData[]
  symbol: string
}

export default function MultiTimeframeOverlay({
  chartEngine,
  data,
  visible,
  higherTimeframeData: preFetchedHtfData,
  symbol,
}: MultiTimeframeOverlayProps) {
  const [selectedTF, setSelectedTF] = useState<HigherTimeframe | null>(null)
  const [htfData, setHtfData] = useState<CandlestickData[]>(preFetchedHtfData ?? [])
  const [loading, setLoading] = useState(false)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const labelRef = useRef<HTMLDivElement | null>(null)

  const [enabled, setEnabled] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (preFetchedHtfData && preFetchedHtfData.length > 0) {
      setHtfData(preFetchedHtfData)
    }
  }, [preFetchedHtfData])

  const fetchHtf = useCallback(async (tf: HigherTimeframe) => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    try {
      const response = await fetchOHLCV(symbol, tf, '6mo', ac.signal)
      if (ac.signal.aborted) return
      const mapped = Array.isArray(response)
        ? response.map((r: any) => ({
            time: (r.time ?? r.t ?? Math.floor(new Date(r.date ?? r.timestamp).getTime() / 1000)) as Time,
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
            volume: r.volume ?? 0,
          }))
        : []
      setHtfData(mapped as CandlestickData[])
    } catch (err) {
      if (ac.signal.aborted) return
      console.warn('[MultiTimeframeOverlay] Failed to fetch HTF data:', err)
      setHtfData([])
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    if (!selectedTF || !visible || !enabled) {
      if (seriesRef.current && chartEngine) {
        try {
          chartEngine.chart.removeSeries(seriesRef.current)
        } catch {}
        seriesRef.current = null
      }
      return
    }

    if (htfData.length === 0) {
      fetchHtf(selectedTF)
      return
    }

    const config = INDICATOR_CONFIGS[selectedTF]
    const rawValues = computeIndicator(htfData, config)
    const mapped = mapHtfToCtf(rawValues, data)

    if (mapped.length === 0) return

    if (seriesRef.current) {
      try {
        seriesRef.current.setData(mapped)
        seriesRef.current.applyOptions({
          color: config.color,
          lineWidth: 2,
          lineStyle: config.dash.length > 0 ? 2 : 0,
        })
      } catch {}
      return
    }

    if (!chartEngine) return
    seriesRef.current = chartEngine.chart.addSeries(LineSeries, {
      color: config.color,
      lineWidth: 2,
      lineStyle: config.dash.length > 0 ? 2 : 0,
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      title: config.label,
    })
    seriesRef.current.setData(mapped)

    if (labelRef.current && config.glow) {
      labelRef.current.style.boxShadow = `0 0 8px ${config.color}66`
    }

    return () => {
      if (seriesRef.current) {
        try {
          chartEngine?.chart.removeSeries(seriesRef.current)
        } catch {}
        seriesRef.current = null
      }
    }
  }, [selectedTF, enabled, visible, htfData, data, chartEngine, fetchHtf])

  useEffect(() => {
    if (!visible || !enabled) {
      if (seriesRef.current && chartEngine) {
        try {
          chartEngine.chart.removeSeries(seriesRef.current)
        } catch {}
        seriesRef.current = null
      }
    }
  }, [visible, enabled, chartEngine])

  const handleTFChange = (value: string) => {
    const tf = value as HigherTimeframe
    setSelectedTF(tf)
    if (value === '') {
      setSelectedTF(null)
      if (seriesRef.current && chartEngine) {
        try {
          chartEngine.chart.removeSeries(seriesRef.current)
        } catch {}
        seriesRef.current = null
      }
    }
  }

  if (!visible) return null

  return (
    <div style={containerStyles}>
      <button
        style={{
          ...buttonBase,
          color: enabled ? '#22c55e' : '#5d6b7e',
          borderColor: enabled ? '#22c55e44' : '#1a2332',
        }}
        onClick={() => setEnabled((e) => !e)}
        title="Toggle multi-timeframe overlay"
      >
        {enabled ? 'HTF: ON' : 'HTF: OFF'}
      </button>
      <select
        style={selectStyles}
        value={selectedTF ?? ''}
        onChange={(e) => handleTFChange(e.target.value)}
        disabled={!enabled}
      >
        <option value="">Overlay: —</option>
        {OVERLAY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {loading && (
        <span style={{ color: '#5d6b7e', fontSize: 10 }}>loading...</span>
      )}
      {selectedTF && enabled && htfData.length > 0 && (
        <div
          ref={labelRef}
          style={{
            color: INDICATOR_CONFIGS[selectedTF].color,
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: 3,
            background: `${INDICATOR_CONFIGS[selectedTF].color}15`,
            transition: 'box-shadow 0.3s',
          }}
        >
          {INDICATOR_CONFIGS[selectedTF].label}
        </div>
      )}
    </div>
  )
}
