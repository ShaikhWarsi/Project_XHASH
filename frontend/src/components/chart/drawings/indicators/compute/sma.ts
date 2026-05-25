import type { IndicatorInput, SingleLineOutput } from './types'

export function computeSMA(data: IndicatorInput[], period: number): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: 0 })
      continue
    }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close
    }
    result.push({ time: data[i].time, value: sum / period })
  }
  return result
}
