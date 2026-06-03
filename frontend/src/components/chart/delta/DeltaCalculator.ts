import type { Time, CandlestickData } from 'lightweight-charts'

export interface DeltaBar {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
  buyVolume: number
  sellVolume: number
  delta: number
  cumulativeDelta: number
  buyRatio: number
}

export function calculateDeltaPerBar(data: CandlestickData[]): DeltaBar[] {
  let cumDelta = 0
  const result: DeltaBar[] = []

  for (const bar of data) {
    const { time, open, high, low, close } = bar
    const volume = (bar as any).volume ?? 0
    const range = high - low || 1
    let buyVolume: number
    let sellVolume: number

    if (close > open) {
      buyVolume = volume * (0.5 + 0.4 * (close - open) / range)
      sellVolume = volume - buyVolume
    } else if (close < open) {
      sellVolume = volume * (0.5 + 0.4 * (open - close) / range)
      buyVolume = volume - sellVolume
    } else {
      buyVolume = volume / 2
      sellVolume = volume / 2
    }

    const delta = buyVolume - sellVolume
    cumDelta += delta

    result.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      buyVolume: Math.round(buyVolume * 100) / 100,
      sellVolume: Math.round(sellVolume * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      cumulativeDelta: Math.round(cumDelta * 100) / 100,
      buyRatio: volume > 0 ? buyVolume / volume : 0.5,
    })
  }

  return result
}

export function calculateCumulativeDelta(
  data: CandlestickData[]
): { time: Time; delta: number; cumulative: number; buyVol: number; sellVol: number; buyRatio: number }[] {
  const deltaBars = calculateDeltaPerBar(data)
  return deltaBars.map((b) => ({
    time: b.time,
    delta: b.delta,
    cumulative: b.cumulativeDelta,
    buyVol: b.buyVolume,
    sellVol: b.sellVolume,
    buyRatio: b.buyRatio,
  }))
}

export function getDeltaColor(_delta: number, _cumulative: number, buyRatio: number): string {
  if (buyRatio > 0.65) return '#22c55e'
  if (buyRatio > 0.55) return '#4ade80'
  if (buyRatio < 0.35) return '#ef4444'
  if (buyRatio < 0.45) return '#f87171'
  return '#6b7280'
}
