import type { IndicatorInput } from './types'

export interface StochasticOutput {
  time: any
  k: number
  d: number
}

export function computeStochastic(data: IndicatorInput[], kPeriod = 14, dPeriod = 3): StochasticOutput[] {
  const result: StochasticOutput[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      result.push({ time: data[i].time, k: 50, d: 50 })
      continue
    }
    let high = -Infinity
    let low = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      high = Math.max(high, data[j].high)
      low = Math.min(low, data[j].low)
    }
    const k = high === low ? 50 : ((data[i].close - low) / (high - low)) * 100
    result.push({ time: data[i].time, k, d: 50 })
  }

  // Smooth to get %D
  for (let i = dPeriod - 1; i < result.length; i++) {
    let sum = 0
    for (let j = i - dPeriod + 1; j <= i; j++) {
      sum += result[j].k
    }
    result[i].d = sum / dPeriod
  }
  return result
}
