import type { IndicatorInput, SingleLineOutput } from './types'
import { computeEMA } from './ema'

export function computeRSI(data: IndicatorInput[], period: number): SingleLineOutput[] {
  if (data.length < 2) return []

  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }

  const avgGainData = gains.map((v) => ({ time: data[0].time, value: v }))
  const avgLossData = losses.map((v) => ({ time: data[0].time, value: v }))

  // Use EMA smoothing for avg gain/loss
  const avgGains = computeEMA(avgGainData as any, period)
  const avgLosses = computeEMA(avgLossData as any, period)

  const result: SingleLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push({ time: data[i].time, value: 50 })
      continue
    }
    const gain = avgGains[i - 1]?.value ?? 0
    const loss = avgLosses[i - 1]?.value ?? 0
    if (loss === 0) {
      result.push({ time: data[i].time, value: 100 })
    } else {
      const rs = gain / loss
      result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) })
    }
  }
  return result
}
