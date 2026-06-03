import type { IndicatorInput, SingleLineOutput } from './types'

function emaCloses(data: IndicatorInput[], period: number, currentIdx: number): number {
  if (currentIdx < period - 1) return data[currentIdx].close
  const k = 2 / (period + 1)
  let result = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period
  for (let i = period; i <= currentIdx; i++) {
    result = data[i].close * k + result * (1 - k)
  }
  return result
}

export function computePriceOscillator(data: IndicatorInput[], fastPeriod = 12, slowPeriod = 26): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const fastEma = emaCloses(data, fastPeriod, i)
    const slowEma = emaCloses(data, slowPeriod, i)
    const osc = slowEma > 0 ? ((fastEma - slowEma) / slowEma) * 100 : 0
    result.push({ time: data[i].time, value: osc })
  }
  return result
}
