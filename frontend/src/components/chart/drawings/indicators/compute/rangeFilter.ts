import type { IndicatorInput, SingleLineOutput } from './types'

export function computeRangeFilter(data: IndicatorInput[], period = 14, mult = 2.0): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  let prevFilter = 0

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      prevFilter = data[i].close
      result.push({ time: data[i].time, value: prevFilter })
      continue
    }

    const range = data.slice(Math.max(0, i - period + 1), i + 1)
    const avgRange = range.reduce((s, r) => s + (r.high - r.low), 0) / range.length
    const threshold = avgRange * mult

    const change = data[i].close - prevFilter
    if (Math.abs(change) >= threshold) {
      prevFilter = prevFilter + Math.sign(change) * threshold
    }

    result.push({ time: data[i].time, value: prevFilter })
  }
  return result
}
