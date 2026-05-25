import type { IndicatorInput, SingleLineOutput } from './types'
import { computeEMA } from './ema'

export interface MACDOutput {
  time: any
  macd: number
  signal: number
  histogram: number
}

export function computeMACD(data: IndicatorInput[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MACDOutput[] {
  const emaFast = computeEMA(data, fastPeriod)
  const emaSlow = computeEMA(data, slowPeriod)

  const macdLine: SingleLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const fast = emaFast[i]?.value ?? 0
    const slow = emaSlow[i]?.value ?? 0
    macdLine.push({ time: data[i].time, value: fast - slow })
  }

  const signalLine = computeEMA(
    macdLine.map((m) => ({ time: m.time as number, open: 0, high: 0, low: 0, close: m.value })),
    signalPeriod
  )

  const result: MACDOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const macd = macdLine[i]?.value ?? 0
    const signal = signalLine[i]?.value ?? 0
    result.push({
      time: data[i].time,
      macd,
      signal,
      histogram: macd - signal,
    })
  }
  return result
}
