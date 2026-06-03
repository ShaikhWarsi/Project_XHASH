import { computeSMA } from './sma'
import { computeEMA } from './ema'
import { computeRSI } from './rsi'
import { computeMACD } from './macd'
import { computeBollinger } from './bollinger'
import { computeStochastic } from './stochastic'
import { computeATR } from './atr'
import { computeIchimoku } from './ichimoku'
import { computeVWAP } from './vwap'
import { computeOBV } from './obv'
import { computePSAR } from './psar'
import { computeVSA } from './vsa'
import { computeWyckoff } from './wyckoff'
import { computeElliottWave } from './elliottwave'
import { computeTWAP } from './twap'
import { computePivots } from './pivots'
import { computeMFI } from './mfi'
import { computeSqueeze } from './squeeze'
import { computeRangeFilter } from './rangeFilter'
import { computeVolumeOscillator } from './volumeOscillator'
import { computePriceOscillator } from './priceOscillator'
import { computeADOscillator } from './adOscillator'
import { computeWildersSmoothing } from './wildersSmoothing'

export const INDICATOR_COMPUTE = {
  sma: computeSMA,
  ema: computeEMA,
  rsi: computeRSI,
  macd: computeMACD,
  bollinger: computeBollinger,
  stochastic: computeStochastic,
  atr: computeATR,
  ichimoku: computeIchimoku,
  vwap: computeVWAP,
  obv: computeOBV,
  psar: computePSAR,
  vsa: computeVSA,
  wyckoff: computeWyckoff,
  elliottWave: computeElliottWave,
  twap: computeTWAP,
  pivots: computePivots,
  mfi: computeMFI,
  squeeze: computeSqueeze,
  rangeFilter: computeRangeFilter,
  volumeOscillator: computeVolumeOscillator,
  priceOscillator: computePriceOscillator,
  adOscillator: computeADOscillator,
  wildersSmoothing: computeWildersSmoothing,
}
