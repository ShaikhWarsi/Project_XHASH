import type { IndicatorInput, MultiLineOutput } from './types'

export function computeIchimoku(data: IndicatorInput[], tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52): MultiLineOutput[] {
  const lines: MultiLineOutput[] = []
  for (let i = 0; i < data.length; i++) {
    const tenkanHigh = Math.max(...data.slice(Math.max(0, i - tenkanPeriod + 1), i + 1).map((d) => d.high))
    const tenkanLow = Math.min(...data.slice(Math.max(0, i - tenkanPeriod + 1), i + 1).map((d) => d.low))
    const tenkan = (tenkanHigh + tenkanLow) / 2

    const kijunHigh = Math.max(...data.slice(Math.max(0, i - kijunPeriod + 1), i + 1).map((d) => d.high))
    const kijunLow = Math.min(...data.slice(Math.max(0, i - kijunPeriod + 1), i + 1).map((d) => d.low))
    const kijun = (kijunHigh + kijunLow) / 2

    const sbHigh = Math.max(...data.slice(Math.max(0, i - senkouBPeriod + 1), i + 1).map((d) => d.high))
    const sbLow = Math.min(...data.slice(Math.max(0, i - senkouBPeriod + 1), i + 1).map((d) => d.low))
    const senkouB = (sbHigh + sbLow) / 2

    lines.push({
      time: data[i].time,
      value1: tenkan,
      value2: kijun,
      value3: (tenkan + kijun) / 2,
      value4: senkouB,
      value5: i + kijunPeriod < data.length ? data[i + kijunPeriod].close : data[i].close,
    })
  }
  return lines
}
