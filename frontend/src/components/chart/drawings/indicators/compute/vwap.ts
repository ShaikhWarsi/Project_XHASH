import type { IndicatorInput, SingleLineOutput } from './types'

export function computeVWAP(data: IndicatorInput[]): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  let cumVol = 0
  let cumPV = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const typicalPrice = (d.high + d.low + d.close) / 3
    const vol = d.volume ?? 0
    cumVol += vol
    cumPV += typicalPrice * vol
    result.push({
      time: d.time,
      value: cumVol > 0 ? cumPV / cumVol : typicalPrice,
    })
  }
  return result
}
