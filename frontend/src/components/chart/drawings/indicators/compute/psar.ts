import type { IndicatorInput } from './types'

export interface PSAROutput {
  time: any
  value: number
  trend: 'up' | 'down'
}

export function computePSAR(data: IndicatorInput[], step = 0.02, maxStep = 0.2): PSAROutput[] {
  if (data.length < 2) return []

  const result: PSAROutput[] = []
  let af = step
  let isUp = data[1].high > data[0].high
  let ep = isUp ? data[1].high : data[1].low
  let sar = isUp
    ? Math.min(data[0].low, data[1].low)
    : Math.max(data[0].high, data[1].high)

  for (let i = 0; i < data.length; i++) {
    if (i < 2) {
      result.push({ time: data[i].time, value: data[i].close, trend: isUp ? 'up' : 'down' })
      continue
    }

    if (isUp) {
      if (data[i].low < sar) {
        // Switch to downtrend
        isUp = false
        sar = ep
        ep = data[i].low
        af = step
      } else {
        if (data[i].high > ep) {
          ep = data[i].high
          af = Math.min(af + step, maxStep)
        }
        sar = sar + af * (ep - sar)
        const prevSar = result[i - 1]?.value ?? sar
        sar = Math.min(sar, Math.min(data[i - 1].low, data[i - 2]?.low ?? data[i - 1].low))
        if (sar > data[i].low) sar = prevSar
      }
    } else {
      if (data[i].high > sar) {
        // Switch to uptrend
        isUp = true
        sar = ep
        ep = data[i].high
        af = step
      } else {
        if (data[i].low < ep) {
          ep = data[i].low
          af = Math.min(af + step, maxStep)
        }
        sar = sar + af * (ep - sar)
        const prevSar = result[i - 1]?.value ?? sar
        sar = Math.max(sar, Math.max(data[i - 1].high, data[i - 2]?.high ?? data[i - 1].high))
        if (sar < data[i].high) sar = prevSar
      }
    }

    result.push({ time: data[i].time, value: sar, trend: isUp ? 'up' : 'down' })
  }
  return result
}
