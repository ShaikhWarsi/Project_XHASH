import { INDICATOR_COMPUTE } from '../compute'
import type { SingleLineOutput, MultiLineOutput, IndicatorInput } from '../compute/types'
import { indicator } from '../IndicatorPlugin'

const { sma: computeSMA, ema: computeEMA, bollinger: computeBollinger, vwap: computeVWAP } = INDICATOR_COMPUTE

indicator({
  id: 'sma',
  name: 'SMA',
  description: 'Simple Moving Average',
  category: 'overlap',
  defaultParams: { period: 20 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 500, default: 20 },
  },
  outputType: 'line',
  paneType: 'overlay',
  color: '#3b82f6',
  computeFn: (data: IndicatorInput[], params) => computeSMA(data, params.period as number) as SingleLineOutput[],
})

indicator({
  id: 'ema',
  name: 'EMA',
  description: 'Exponential Moving Average',
  category: 'overlap',
  defaultParams: { period: 20 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 500, default: 20 },
  },
  outputType: 'line',
  paneType: 'overlay',
  color: '#f59e0b',
  computeFn: (data: IndicatorInput[], params) => computeEMA(data, params.period as number) as SingleLineOutput[],
})

indicator({
  id: 'bollinger',
  name: 'Bollinger Bands',
  description: 'Bollinger Bands',
  category: 'overlap',
  defaultParams: { period: 20, stdDev: 2 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 200, default: 20 },
    stdDev: { label: 'Std Dev', type: 'float', min: 0.5, max: 5, default: 2 },
  },
  outputType: 'multi_line',
  paneType: 'overlay',
  color: '#8b5cf6',
  computeFn: (data: IndicatorInput[], params) => computeBollinger(data, params.period as number, params.stdDev as number) as MultiLineOutput[],
  signals: (_data, output, _params) => {
    const results = output as MultiLineOutput[]
    if (results.length < 2) return []
    const last = results[results.length - 1]
    if (!last) return []
    if (last.value1 != null && last.value2 != null && last.value3 != null) {
      if (last.value1 >= last.value3) {
        return [{ name: 'BB_Touch_Upper', value: 'overextended_up', direction: -1, strength: 0.6 }]
      }
      if (last.value1 <= last.value2) {
        return [{ name: 'BB_Touch_Lower', value: 'overextended_down', direction: 1, strength: 0.6 }]
      }
    }
    return []
  },
})

indicator({
  id: 'vwap',
  name: 'VWAP',
  description: 'Volume Weighted Average Price',
  category: 'overlap',
  defaultParams: {},
  paramsMeta: {},
  outputType: 'line',
  paneType: 'overlay',
  color: '#06b6d4',
  computeFn: (data: IndicatorInput[], _params) => computeVWAP(data) as SingleLineOutput[],
  signals: (_data, output, _params) => {
    const results = output as SingleLineOutput[]
    if (results.length < 2) return []
    const last = results[results.length - 1]
    if (!last || last.value == null) return []
    return [{
      name: last.value > 0 ? 'Above_VWAP' : 'Below_VWAP',
      value: last.value > 0 ? 'bullish' : 'bearish',
      direction: last.value > 0 ? 1 : -1,
      strength: 0.4,
    }]
  },
})
