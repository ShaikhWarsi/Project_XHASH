import type { IndicatorInput, SingleLineOutput } from './types'

export function computeTWAP(data: IndicatorInput[]): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  let cumVwap = 0
  let cumVol = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const vol = d.volume ?? 0
    const typicalPrice = (d.high + d.low + d.close) / 3
    cumVwap += typicalPrice * vol
    cumVol += vol
    const twap = cumVol > 0 ? cumVwap / cumVol : d.close
    result.push({ time: d.time, value: twap })
  }
  return result
}
