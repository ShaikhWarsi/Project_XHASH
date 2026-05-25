import type { IndicatorInput } from './types'

export interface IchimokuOutput {
  time: any
  tenkan: number
  kijun: number
  senkouA: number
  senkouB: number
  chikou: number
}

export function computeIchimoku(data: IndicatorInput[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52): IchimokuOutput[] {
  const result: IchimokuOutput[] = []
  for (let i = 0; i < data.length; i++) {
    // Tenkan-sen (Conversion Line)
    const tenkanHigh = Math.max(...data.slice(Math.max(0, i - tenkanPeriod + 1), i + 1).map((d) => d.high))
    const tenkanLow = Math.min(...data.slice(Math.max(0, i - tenkanPeriod + 1), i + 1).map((d) => d.low))
    const tenkan = (tenkanHigh + tenkanLow) / 2

    // Kijun-sen (Base Line)
    const kijunHigh = Math.max(...data.slice(Math.max(0, i - kijunPeriod + 1), i + 1).map((d) => d.high))
    const kijunLow = Math.min(...data.slice(Math.max(0, i - kijunPeriod + 1), i + 1).map((d) => d.low))
    const kijun = (kijunHigh + kijunLow) / 2

    // Senkou Span B
    const sbHigh = Math.max(...data.slice(Math.max(0, i - senkouBPeriod + 1), i + 1).map((d) => d.high))
    const sbLow = Math.min(...data.slice(Math.max(0, i - senkouBPeriod + 1), i + 1).map((d) => d.low))
    const senkouB = (sbHigh + sbLow) / 2

    result.push({
      time: data[i].time,
      tenkan,
      kijun,
      senkouA: (tenkan + kijun) / 2,
      senkouB,
      chikou: i + kijunPeriod < data.length ? data[i + kijunPeriod].close : data[i].close,
    })
  }
  return result
}
