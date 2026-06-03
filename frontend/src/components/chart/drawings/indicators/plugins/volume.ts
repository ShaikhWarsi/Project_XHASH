import { INDICATOR_COMPUTE } from '../compute'
import type { SingleLineOutput, MultiLineOutput, IndicatorInput } from '../compute/types'
import { indicator } from '../IndicatorPlugin'

const { obv: computeOBV, vsa: computeVSA, wyckoff: computeWyckoff } = INDICATOR_COMPUTE

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

indicator({
  id: 'vsa',
  name: 'VSA',
  description: 'Volume Spread Analysis',
  category: 'volume',
  defaultParams: {},
  paramsMeta: {},
  outputType: 'line',
  paneType: 'separate',
  color: '#f97316',
  computeFn: (data: IndicatorInput[], _params) => computeVSA(data) as unknown as SingleLineOutput[],
})

indicator({
  id: 'wyckoff',
  name: 'Wyckoff',
  description: 'Wyckoff Accumulation/Distribution',
  category: 'volume',
  defaultParams: {},
  paramsMeta: {},
  outputType: 'line',
  paneType: 'separate',
  color: '#a855f7',
  computeFn: (data: IndicatorInput[], _params) => computeWyckoff(data) as unknown as SingleLineOutput[],
})
