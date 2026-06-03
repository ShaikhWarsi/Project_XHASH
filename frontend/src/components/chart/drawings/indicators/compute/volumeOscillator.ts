import type { IndicatorInput, SingleLineOutput } from './types'

function smaVol(data: IndicatorInput[], period: number, currentIdx: number): number {
  if (currentIdx < period - 1) return 0
  let sum = 0
  for (let i = currentIdx - period + 1; i <= currentIdx; i++) {
    sum += data[i].volume ?? 0
  }
  return sum / period
}

export function computeVolumeOscillator(data: IndicatorInput[], fastPeriod = 5, slowPeriod = 13): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const fastSma = smaVol(data, fastPeriod, i)
    const slowSma = smaVol(data, slowPeriod, i)
    const osc = slowSma > 0 ? ((fastSma - slowSma) / slowSma) * 100 : 0
    result.push({ time: data[i].time, value: osc })
  }
  return result
}
