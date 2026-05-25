import type { IndicatorInput, SingleLineOutput } from './types'

export function computeATR(data: IndicatorInput[], period = 14): SingleLineOutput[] {
  if (data.length < 2) return []

  const trValues: number[] = []
  for (let i = 1; i < data.length; i++) {
    const highLow = data[i].high - data[i].low
    const highClose = Math.abs(data[i].high - data[i - 1].close)
    const lowClose = Math.abs(data[i].low - data[i - 1].close)
    trValues.push(Math.max(highLow, highClose, lowClose))
  }

  const result: SingleLineOutput[] = []
  for (let i = 0; i < trValues.length; i++) {
    const idx = i + 1
    if (idx < period) {
      result.push({ time: data[idx].time, value: 0 })
      continue
    }
    if (idx === period) {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += trValues[j]
      }
      result.push({ time: data[idx].time, value: sum / period })
    } else {
      const prev = result[result.length - 1].value
      const atr = (prev * (period - 1) + trValues[i]) / period
      result.push({ time: data[idx].time, value: atr })
    }
  }
  return result
}
