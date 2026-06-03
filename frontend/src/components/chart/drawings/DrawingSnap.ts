import type { Time, CandlestickData } from 'lightweight-charts'

export interface CoordMapper {
  timeToX: (time: Time) => number | null
  priceToY: (price: number, paneIndex?: number) => number | null
  xToTime: (x: number) => Time | null
  yToPrice: (y: number, paneIndex?: number) => number | null
}

export function findNearestPrice(
  crosshairX: number,
  data: CandlestickData[],
  mapper: CoordMapper,
  threshold = 6
): { price: number; time: Time } | null {
  const t = mapper.xToTime(crosshairX)
  if (t == null) return null
  let closest: CandlestickData | null = null
  let minDist = Infinity
  for (const bar of data) {
    const bx = mapper.timeToX(bar.time)
    if (bx == null) continue
    const dist = Math.abs(bx - crosshairX)
    if (dist < minDist && dist <= threshold) {
      minDist = dist
      closest = bar
    }
  }
  return closest ? { price: closest.close, time: closest.time } : null
}

export function snapToLevel(price: number, levels: number[], threshold = 6): number | null {
  let closest: number | null = null
  let minDist = Infinity
  const snapThresh = Math.max(0.01, (threshold ?? 6) * 0.1)
  for (const level of levels) {
    const dist = Math.abs(price - level)
    if (dist < minDist && dist <= snapThresh) {
      minDist = dist
      closest = level
    }
  }
  return closest
}

export function snapToRoundNumber(price: number): number {
  if (price === 0 || !isFinite(price)) return 0
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(price))))
  const roundTo = magnitude
  return Math.round(price / roundTo) * roundTo
}

export function findOHLCProximity(
  x: number,
  y: number,
  data: CandlestickData[],
  mapper: CoordMapper
): { price: number; time: Time; which: 'open' | 'high' | 'low' | 'close' } | null {
  let closest: { price: number; time: Time; which: 'open' | 'high' | 'low' | 'close' } | null = null
  let minDist = Infinity

  for (const bar of data) {
    const bx = mapper.timeToX(bar.time)
    if (bx == null) continue

    for (const which of ['open', 'high', 'low', 'close'] as const) {
      const price = which === 'open' ? bar.open : which === 'high' ? bar.high : which === 'low' ? bar.low : bar.close
      const by = mapper.priceToY(price, 0)
      if (by == null) continue

      const dist = Math.sqrt((bx - x) ** 2 + (by - y) ** 2)
      if (dist < minDist) {
        minDist = dist
        closest = { price, time: bar.time, which }
      }
    }
  }

  return closest
}
