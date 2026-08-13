export class TickEngine {
  private _symbol: string = ""
  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _callback: ((tick: { price: number; size: number; time: string; side: "buy" | "sell" }) => void) | null = null

  connect(symbol: string, callback: (tick: { price: number; size: number; time: string; side: "buy" | "sell" }) => void): void {
    this._symbol = symbol
    this._callback = callback
  }

  disconnect(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
    this._callback = null
  }

  isConnected(): boolean {
    return this._callback !== null
  }
}
