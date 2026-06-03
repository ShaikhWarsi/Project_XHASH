import type { IndicatorInput, SingleLineOutput } from './types'

export function computeADOscillator(data: IndicatorInput[], period = 14): SingleLineOutput[] {
  const result: SingleLineOutput[] = []
  let ad = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const hl = d.high - d.low
    if (hl > 0) {
      const mfm = ((d.close - d.low) - (d.high - d.close)) / hl
      ad += mfm * (d.volume ?? 0)
    }

    if (i < period) {
      result.push({ time: d.time, value: 0 })
      continue
    }

    const adSlice = [ad]
    for (let j = i - period + 1; j < i; j++) {
      let pad = 0
      const pd = data[j]
      const phl = pd.high - pd.low
      if (phl > 0) {
        const pmfm = ((pd.close - pd.low) - (pd.high - pd.close)) / phl
        pad += pmfm * (pd.volume ?? 0)
      }
      adSlice.push(pad)
    }

    const adSma = adSlice.reduce((s, v) => s + v, 0) / adSlice.length
    const osc = adSma > 0 ? ((ad - adSma) / adSma) * 100 : 0

    result.push({ time: d.time, value: osc })
  }
  return result
}
