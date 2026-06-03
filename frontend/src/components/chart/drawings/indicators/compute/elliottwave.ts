import type { IndicatorInput } from './types'

export interface ElliottWaveOutput {
  time: any
  value: number
  waveType: 'impulse' | 'corrective' | 'none'
  waveNumber: number
}

function findPeaks(data: IndicatorInput[], period: number): number[] {
  const peaks: number[] = []
  for (let i = period; i < data.length - period; i++) {
    const window = data.slice(i - period, i + period + 1)
    const isPeak = data[i].high >= Math.max(...window.map(w => w.high))
    const isTrough = data[i].low <= Math.min(...window.map(w => w.low))
    if (isPeak) peaks.push(i)
    if (isTrough) peaks.push(i)
  }
  return [...new Set(peaks)].sort((a, b) => a - b)
}

export function computeElliottWave(data: IndicatorInput[]): ElliottWaveOutput[] {
  const result: ElliottWaveOutput[] = []
  if (data.length < 30) {
    return data.map(d => ({ time: d.time, value: 0, waveType: 'none', waveNumber: 0 }))
  }

  const pivotPeriod = 5
  const peakIndices = findPeaks(data, pivotPeriod)

  for (let i = 0; i < data.length; i++) {
    const isPivot = peakIndices.includes(i)
    if (!isPivot) {
      result.push({ time: data[i].time, value: 0, waveType: 'none', waveNumber: 0 })
      continue
    }

    const nearby = peakIndices.filter(p => Math.abs(p - i) <= 10)
    const idxInNearby = nearby.indexOf(i)

    let waveNumber = 0
    let waveType: ElliottWaveOutput['waveType'] = 'none'
    let value = 0

    if (idxInNearby >= 0) {
      const isUpWave = idxInNearby % 2 === 0
      const prevPivot = idxInNearby > 0 ? data[nearby[idxInNearby - 1]] : null
      const nextPivot = idxInNearby < nearby.length - 1 ? data[nearby[idxInNearby + 1]] : null

      if (isUpWave && prevPivot && data[i].high > prevPivot.high) {
        if (idxInNearby < 5) {
          waveNumber = idxInNearby + 1
          waveType = 'impulse'
          value = data[i].high
        }
      } else if (!isUpWave && prevPivot && data[i].low < prevPivot.low) {
        if (idxInNearby < 5) {
          waveNumber = idxInNearby + 1
          waveType = 'impulse'
          value = -data[i].low
        }
      }

      if (waveType === 'none' && nearby.length >= 3) {
        const a = data[nearby[idxInNearby - 2]]
        const b = data[nearby[idxInNearby - 1]]
        const c = data[i]
        if (a && b && c) {
          const aToB = Math.abs(b.high - a.low)
          const bToC = Math.abs(c.high - b.low)
          if (bToC > aToB * 0.618 && bToC < aToB * 1.618) {
            waveNumber = idxInNearby <= 2 ? idxInNearby + 1 : 0
            waveType = 'corrective'
            value = idxInNearby % 2 === 0 ? c.high : -c.low
          }
        }
      }
    }

    result.push({ time: data[i].time, value, waveType, waveNumber })
  }

  return result
}
