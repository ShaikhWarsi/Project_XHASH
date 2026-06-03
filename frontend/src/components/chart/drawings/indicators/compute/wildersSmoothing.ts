import type { IndicatorInput, SingleLineOutput } from './types'

export function computeWildersSmoothing(data: IndicatorInput[], period = 14): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  const closes = data.map(d => d.close)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: closes[i] })
      continue
    }

    if (i === period - 1) {
      const sma = closes.slice(0, period).reduce((s, c) => s + c, 0) / period
      result.push({ time: data[i].time, value: sma })
      continue
    }

    const prev = result[result.length - 1].value
    const smoothed = prev + (closes[i] - prev) / period
    result.push({ time: data[i].time, value: smoothed })
  }
  return result
}
