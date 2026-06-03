import type { IndicatorInput, SingleLineOutput } from './types'

export function computeMFI(data: IndicatorInput[], period = 14): SingleLineOutput[] {
  const result: SingleLineOutput[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push({ time: data[i].time, value: 50 })
      continue
    }

    const slice = data.slice(i - period, i + 1)
    let positiveFlow = 0
    let negativeFlow = 0

    for (let j = 1; j < slice.length; j++) {
      const typicalPrice = (slice[j].high + slice[j].low + slice[j].close) / 3
      const prevTypical = (slice[j - 1].high + slice[j - 1].low + slice[j - 1].close) / 3
      const rawFlow = typicalPrice * (slice[j].volume ?? 0)

      if (typicalPrice > prevTypical) {
        positiveFlow += rawFlow
      } else {
        negativeFlow += rawFlow
      }
    }

    const mfi = negativeFlow > 0 ? 100 - 100 / (1 + positiveFlow / negativeFlow) : 100
    result.push({ time: data[i].time, value: mfi })
  }
  return result
}
