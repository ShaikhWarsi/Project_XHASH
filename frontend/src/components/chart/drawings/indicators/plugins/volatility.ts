import { INDICATOR_COMPUTE } from '../compute'
import type { SingleLineOutput, MultiLineOutput, IndicatorInput } from '../compute/types'
import { indicator } from '../IndicatorPlugin'

const { atr: computeATR, ichimoku: computeIchimoku, obv: computeOBV } = INDICATOR_COMPUTE

indicator({
  id: 'atr',
  name: 'ATR',
  description: 'Average True Range',
  category: 'volatility',
  defaultParams: { period: 14 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 100, default: 14 },
  },
  outputType: 'line',
  paneType: 'separate',
  color: '#ec4899',
  computeFn: (data: IndicatorInput[], params) => computeATR(data, params.period as number) as SingleLineOutput[],
  signals: (_data, output, _params) => {
    const results = output as SingleLineOutput[]
    if (results.length < 15) return []
    const recent = results.slice(-14).filter((r) => r.value != null)
    if (recent.length < 14) return []
    const avg = recent.reduce((s, r) => s + r.value, 0) / recent.length
    const last = recent[recent.length - 1]
    if (!last || last.value == null) return []
    if (avg > 0 && last.value > avg * 1.5) {
      return [{ name: 'ATR_Spike', value: 'high_volatility', direction: 0, strength: Math.min((last.value / avg - 1.5) / 2, 1), metadata: { ratio: last.value / avg } }]
    }
    return []
  },
})

indicator({
  id: 'ichimoku',
  name: 'Ichimoku',
  description: 'Ichimoku Cloud',
  category: 'volatility',
  defaultParams: { tenkanPeriod: 9, kijunPeriod: 26, senkouBPeriod: 52 },
  paramsMeta: {
    tenkanPeriod: { label: 'Tenkan Period', type: 'int', min: 1, max: 100, default: 9 },
    kijunPeriod: { label: 'Kijun Period', type: 'int', min: 1, max: 200, default: 26 },
    senkouBPeriod: { label: 'Senkou B Period', type: 'int', min: 1, max: 200, default: 52 },
  },
  outputType: 'multi_line',
  paneType: 'overlay',
  color: '#06b6d4',
  computeFn: (data: IndicatorInput[], params) => computeIchimoku(data, params.tenkanPeriod as number, params.kijunPeriod as number, params.senkouBPeriod as number) as MultiLineOutput[],
})

indicator({
  id: 'obv',
  name: 'OBV',
  description: 'On-Balance Volume',
  category: 'volume',
  defaultParams: {},
  paramsMeta: {},
  outputType: 'line',
  paneType: 'separate',
  color: '#10b981',
  computeFn: (data: IndicatorInput[], _params) => computeOBV(data) as SingleLineOutput[],
})
