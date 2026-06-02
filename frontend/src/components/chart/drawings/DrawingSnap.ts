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
  threshold = 6
): { price: number; time: Time } | null {
  const times = data.map((d) => d.time as any)
  const timeValue = times[Math.round(crosshairX)]
  if (timeValue && data[Math.round(crosshairX)]) {
    const bar = data[Math.round(crosshairX)]
    return { price: bar.close, time: bar.time }
  }
  return null
}

export function snapToLevel(price: number, levels: number[], threshold = 6): number | null {
  let closest: number | null = null
  let minDist = Infinity
  for (const level of levels) {
    const dist = Math.abs(price - level)
    if (dist < minDist && dist <= threshold * 0.1) {
      minDist = dist
      closest = level
    }
  }
  return closest
}

export function snapToRoundNumber(price: number): number {
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
