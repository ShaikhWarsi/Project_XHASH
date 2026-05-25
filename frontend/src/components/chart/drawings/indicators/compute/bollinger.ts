import type { IndicatorInput } from './types'

export interface BollingerOutput {
  time: any
  upper: number
  middle: number
  lower: number
}

export function computeBollinger(data: IndicatorInput[], period = 20, stdDev = 2): BollingerOutput[] {
  const result: BollingerOutput[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, upper: 0, middle: 0, lower: 0 })
      continue
    }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close
    }
    const middle = sum / period
    let sqSum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (data[j].close - middle) ** 2
    }
    const std = Math.sqrt(sqSum / period)
    result.push({
      time: data[i].time,
      upper: middle + stdDev * std,
      middle,
      lower: middle - stdDev * std,
    })
  }
  return result
}
