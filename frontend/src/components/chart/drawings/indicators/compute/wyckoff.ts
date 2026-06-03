import type { IndicatorInput } from './types'

export interface WyckoffOutput {
  time: any
  value: number
  phase: 'accumulation' | 'distribution' | 'markup' | 'markdown' | 'neutral'
}

export function computeWyckoff(data: IndicatorInput[]): WyckoffOutput[] {
  const result: WyckoffOutput[] = []
  const period = 20

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push({ time: data[i].time, value: 0, phase: 'neutral' })
      continue
    }

    const slice = data.slice(i - period, i + 1)
    const closes = slice.map(d => d.close)
    const volumes = slice.map(d => d.volume ?? 0)
    const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length
    const recentVol = volumes[volumes.length - 1]
    const volRatio = recentVol / (avgVol || 1)

    const highs = slice.map(d => d.high)
    const lows = slice.map(d => d.low)
    const maxHigh = Math.max(...highs)
    const minLow = Math.min(...lows)
    const range = maxHigh - minLow || 1
    const closePos = (data[i].close - minLow) / range
    const closePosPrev = (data[i - 1].close - minLow) / range

    const rangeNarrowing = (highs[highs.length - 1] - lows[lows.length - 1]) < (highs[0] - lows[0])
    const higherLows = data[i].low > data[i - 3].low && data[i - 3].low > data[i - 5].low
    const volClimax = volRatio > 2.0

    const lowerHighs = data[i].high < data[i - 3].high && data[i - 3].high < data[i - 5].high
    const wideRange = (data[i].high - data[i].low) > (avgVol / 100000)

    let score = 0
    let phase: WyckoffOutput['phase'] = 'neutral'

    if (rangeNarrowing && higherLows && volClimax) {
      score = Math.min(volRatio * 0.3, 0.8)
      phase = 'accumulation'
    } else if (closePos > 0.7 && volClimax && rangeNarrowing) {
      score = 0.4
      phase = 'markup'
    } else if (lowerHighs && wideRange && volClimax) {
      score = -Math.min(volRatio * 0.3, 0.8)
      phase = 'distribution'
    } else if (closePos < 0.3 && volClimax) {
      score = -0.4
      phase = 'markdown'
    } else if (rangeNarrowing && !volClimax) {
      score = 0.2
      phase = 'accumulation'
    } else if (closePos < closePosPrev && data[i].volume > avgVol) {
      score += -0.1
    }

    result.push({ time: data[i].time, value: score, phase })
  }
  return result
}
