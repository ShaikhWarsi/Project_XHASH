import { INDICATOR_COMPUTE } from '../compute'
import type { SingleLineOutput, MultiLineOutput, IndicatorInput } from '../compute/types'
import { indicator } from '../IndicatorPlugin'

const { rsi: computeRSI, macd: computeMACD, stochastic: computeStochastic, psar: computePSAR } = INDICATOR_COMPUTE

indicator({
  id: 'rsi',
  name: 'RSI',
  description: 'Relative Strength Index',
  category: 'momentum',
  defaultParams: { period: 14 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 100, default: 14 },
  },
  outputType: 'line',
  paneType: 'separate',
  color: '#f59e0b',
  computeFn: (data: IndicatorInput[], params) => computeRSI(data, params.period as number) as SingleLineOutput[],
  signals: (_data, output, _params) => {
    const results = output as SingleLineOutput[]
    if (results.length < 2) return []
    const last = results[results.length - 1]
    if (!last || last.value == null) return []
    if (last.value > 70) {
      return [{ name: 'RSI_Overbought', value: 'overbought', direction: -1, strength: Math.min((last.value - 70) / 30, 1) }]
    }
    if (last.value < 30) {
      return [{ name: 'RSI_Oversold', value: 'oversold', direction: 1, strength: Math.min((30 - last.value) / 30, 1) }]
    }
    return []
  },
})

indicator({
  id: 'macd',
  name: 'MACD',
  description: 'Moving Average Convergence Divergence',
  category: 'momentum',
  defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  paramsMeta: {
    fastPeriod: { label: 'Fast Period', type: 'int', min: 1, max: 100, default: 12 },
    slowPeriod: { label: 'Slow Period', type: 'int', min: 1, max: 200, default: 26 },
    signalPeriod: { label: 'Signal Period', type: 'int', min: 1, max: 100, default: 9 },
  },
  outputType: 'multi_line',
  paneType: 'separate',
  color: '#3b82f6',
  computeFn: (data: IndicatorInput[], params) => computeMACD(data, params.fastPeriod as number, params.slowPeriod as number, params.signalPeriod as number) as MultiLineOutput[],
  signals: (_data, output, _params) => {
    const results = output as MultiLineOutput[]
    if (results.length < 3) return []
    const curr = results[results.length - 1]
    const prev = results[results.length - 2]
    if (!curr || !prev) return []
    if (curr.value3 != null && prev.value3 != null) {
      if (curr.value3 > 0 && prev.value3 <= 0) {
        return [{ name: 'MACD_Bullish_Cross', value: 'bullish', direction: 1, strength: 0.8 }]
      }
      if (curr.value3 < 0 && prev.value3 >= 0) {
        return [{ name: 'MACD_Bearish_Cross', value: 'bearish', direction: -1, strength: 0.8 }]
      }
    }
    return []
  },
})

indicator({
  id: 'stochastic',
  name: 'Stochastic',
  description: 'Stochastic Oscillator',
  category: 'momentum',
  defaultParams: { kPeriod: 14, dPeriod: 3 },
  paramsMeta: {
    kPeriod: { label: '%K Period', type: 'int', min: 1, max: 100, default: 14 },
    dPeriod: { label: '%D Period', type: 'int', min: 1, max: 100, default: 3 },
  },
  outputType: 'multi_line',
  paneType: 'separate',
  color: '#8b5cf6',
  computeFn: (data: IndicatorInput[], params) => computeStochastic(data, params.kPeriod as number, params.dPeriod as number) as MultiLineOutput[],
})

indicator({
  id: 'psar',
  name: 'Parabolic SAR',
  description: 'Parabolic Stop and Reverse',
  category: 'momentum',
  defaultParams: { step: 0.02, maxStep: 0.2 },
  paramsMeta: {
    step: { label: 'Step', type: 'float', min: 0.001, max: 0.5, default: 0.02 },
    maxStep: { label: 'Max Step', type: 'float', min: 0.01, max: 1, default: 0.2 },
  },
  outputType: 'line',
  paneType: 'overlay',
  color: '#10b981',
  computeFn: (data: IndicatorInput[], params) => computePSAR(data, params.step as number, params.maxStep as number) as SingleLineOutput[],
})
