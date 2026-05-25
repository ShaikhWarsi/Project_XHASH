export interface IndicatorInput {
  time: any
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface SingleLineOutput {
  time: any
  value: number
}

export interface MultiLineOutput {
  time: any
  value1: number
  value2: number
  value3?: number
  value4?: number
}

export function validateOutput(data: SingleLineOutput[]): SingleLineOutput[] {
  return data.filter((d) => d.value != null && !isNaN(d.value) && isFinite(d.value))
}
