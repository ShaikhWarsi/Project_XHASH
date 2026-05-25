import type { IndicatorInput, SingleLineOutput } from './types'

export function computeEMA(data: IndicatorInput[], period: number): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  const k = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push({ time: data[i].time, value: data[i].close })
      continue
    }
    if (i < period) {
      result.push({ time: data[i].time, value: data[i].close })
      continue
    }
    const prev = result[i - 1].value
    const ema = (data[i].close - prev) * k + prev
    result.push({ time: data[i].time, value: ema })
  }
  return result
}
