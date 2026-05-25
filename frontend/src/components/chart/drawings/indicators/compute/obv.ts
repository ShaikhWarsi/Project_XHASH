import type { IndicatorInput, SingleLineOutput } from './types'

export function computeOBV(data: IndicatorInput[]): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  let obv = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const vol = d.volume ?? 0
    if (i === 0) {
      obv = vol
    } else {
      if (d.close > data[i - 1].close) {
        obv += vol
      } else if (d.close < data[i - 1].close) {
        obv -= vol
      }
    }
    result.push({ time: d.time, value: obv })
  }
  return result
}
