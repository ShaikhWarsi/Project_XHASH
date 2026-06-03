import type { IndicatorInput } from './types'

export interface VSAOutput {
  time: any
  value: number  // VSA strength: positive = bullish, negative = bearish
  upVolume: number
  downVolume: number
  spread: number
}

export function computeVSA(data: IndicatorInput[]): VSAOutput[] {
  const result: VSAOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const spread = d.high - d.low
    const vol = d.volume ?? 0
    const isUp = d.close > d.open
    const isDown = d.close < d.open
    const bodyRatio = Math.abs(d.close - d.open) / (spread || 1)
    
    // VSA logic: analyze spread, volume, and close position
    // Wide spread + high volume = strength in direction
    // Narrow spread + low volume = weakness / consolidation
    const upVolume = isUp ? vol : 0
    const downVolume = isDown ? vol : 0
    
    // VSA score: combine factors
    let score = 0
    if (isUp && vol > 0) {
      if (spread > 0) {
        // Up bar with spread: bullish if close is near high
        const closePos = (d.close - d.low) / spread
        score = (closePos * vol / 1000000) 
      }
    } else if (isDown && vol > 0) {
      if (spread > 0) {
        const closePos = (d.high - d.close) / spread
        score = -(closePos * vol / 1000000)
      }
    }
    
    result.push({
      time: d.time,
      value: score,
      upVolume,
      downVolume,
      spread,
    })
  }
  return result
}
