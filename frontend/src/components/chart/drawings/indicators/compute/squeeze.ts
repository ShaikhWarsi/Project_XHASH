import type { IndicatorInput, MultiLineOutput } from './types'

function sma(data: number[], period: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(0); continue }
    const slice = data.slice(i - period + 1, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / period)
  }
  return result
}

export function computeSqueeze(data: IndicatorInput[], period = 20, bbStd = 2, kcMult = 1.5): MultiLineOutput[] {
  const result: MultiLineOutput[] = []
  const closes = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)

  const bbSma = sma(closes, period)
  const tr: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { tr.push(highs[i] - lows[i]); continue }
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])))
  }
  const atr = sma(tr, period)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value1: 0, value2: 0 })
      continue
    }

    const variance = closes.slice(i - period + 1, i + 1).reduce((sum, c) => sum + (c - bbSma[i]) ** 2, 0) / period
    const std = Math.sqrt(variance)
    const bbUpper = bbSma[i] + bbStd * std
    const bbLower = bbSma[i] - bbStd * std

    const kcUpper = bbSma[i] + kcMult * atr[i]
    const kcLower = bbSma[i] - kcMult * atr[i]

    const squeezeOn = bbUpper < kcUpper && bbLower > kcLower
    const squeezeValue = squeezeOn ? -1 : 1

    const momentumValue = (closes[i] - bbSma[i]) / (atr[i] || 1)

    result.push({ time: data[i].time, value1: squeezeValue, value2: momentumValue })
  }
  return result
}
