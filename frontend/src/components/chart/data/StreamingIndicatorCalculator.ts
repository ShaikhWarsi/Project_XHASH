import type { IndicatorConfig } from "../DrawingTypes"

export class StreamingIndicatorCalculator {
  private _results: Map<string, number[]> = new Map()

  calculate(symbol: string, indicators: IndicatorConfig[]): Map<string, number[]> {
    return this._results
  }

  getResult(key: string): number[] | undefined {
    return this._results.get(key)
  }

  reset(): void {
    this._results.clear()
  }
}
