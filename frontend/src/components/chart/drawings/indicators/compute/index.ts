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
}
