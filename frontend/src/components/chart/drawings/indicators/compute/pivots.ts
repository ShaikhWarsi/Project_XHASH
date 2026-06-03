import type { IndicatorInput, MultiLineOutput } from './types'

export interface PivotResult {
  pivot: number
  r1: number
  r2: number
  r3: number
  s1: number
  s2: number
  s3: number
}

function calculateStandardPivot(high: number, low: number, close: number): PivotResult {
  const pivot = (high + low + close) / 3
  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  }
}

function calculateCamarillaPivot(high: number, low: number, close: number): PivotResult {
  const range = high - low
  const pivot = close
  return {
    pivot,
    r1: close + range * 1.1 / 12,
    r2: close + range * 1.1 / 6,
    r3: close + range * 1.1 / 4,
    s1: close - range * 1.1 / 12,
    s2: close - range * 1.1 / 6,
    s3: close - range * 1.1 / 4,
  }
}

function calculateWoodiePivot(high: number, low: number, open: number): PivotResult {
  const pivot = (high + low + 2 * open) / 4
  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
  }
}

function calculateDeMarkPivot(high: number, low: number, close: number, open: number): PivotResult {
  let pivot: number
  if (close < open) {
    pivot = high + 2 * low + close
  } else if (close > open) {
    pivot = 2 * high + low + close
  } else {
    pivot = high + low + 2 * close
  }
  const base = pivot / 2
  return {
    pivot: base,
    r1: base - low + high,
    r2: base + (high - low),
    r3: 0,
    s1: base - (high - low),
    s2: base - (high - low) * 1.5,
    s3: 0,
  }
}

export type PivotType = 'standard' | 'camarilla' | 'woodie' | 'demark'

export function computePivots(data: IndicatorInput[], type: PivotType = 'standard'): MultiLineOutput[] {
  const result: MultiLineOutput[] = []
  const period = 1

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push({ time: data[i].time, value1: 0, value2: 0, value3: 0 })
      continue
    }

    const prev = data[i - 1]
    let pivots: PivotResult

    switch (type) {
      case 'camarilla':
        pivots = calculateCamarillaPivot(prev.high, prev.low, prev.close)
        break
      case 'woodie':
        pivots = calculateWoodiePivot(prev.high, prev.low, prev.open)
        break
      case 'demark':
        pivots = calculateDeMarkPivot(prev.high, prev.low, prev.close, prev.open)
        break
      default:
        pivots = calculateStandardPivot(prev.high, prev.low, prev.close)
    }

    result.push({
      time: data[i].time,
      value1: pivots.pivot,
      value2: pivots.r1,
      value3: pivots.s1,
      value4: pivots.r2,
      value5: pivots.s2,
    })
  }
  return result
}
