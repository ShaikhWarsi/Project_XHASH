import { DrawingTool } from '../DrawingTool'
import type { DrawingEvent, PricePoint, DrawingStyle } from '../../DrawingTypes'
import { drawControlHandle, HIT_THRESHOLD } from '../Utils'
import type { CandlestickData } from 'lightweight-charts'

interface VWAPPoint { time: any; value: number }

function computeAnchoredVWAP(data: CandlestickData[], anchorIndex: number): VWAPPoint[] {
  const result: VWAPPoint[] = []
  let cumPV = 0
  let cumVol = 0
  for (let i = anchorIndex; i < data.length; i++) {
    const d = data[i]
    const typicalPrice = (d.high + d.low + d.close) / 3
    const vol = (d as any).volume ?? 0
    cumPV += typicalPrice * vol
    cumVol += vol
    result.push({ time: d.time, value: cumVol > 0 ? cumPV / cumVol : typicalPrice })
  }
  return result
}

const BAND_COLORS = ['rgba(234,179,8,0.08)', 'rgba(234,179,8,0.05)', 'rgba(234,179,8,0.03)']

export class AnchoredVWAPTool extends DrawingTool {
  static readonly pointCount = 1
  data: CandlestickData[] = []

  constructor(id: string, type?: string, points?: PricePoint[], style?: Partial<DrawingStyle>) {
    super(id, (type || 'anchored_vwap') as any, points, style)
  }

  get pointCount() { return AnchoredVWAPTool.pointCount }

  setChartData(data: CandlestickData[]) { this.data = data }

  render(ctx: CanvasRenderingContext2D, mapper: { timeToX: (t: any) => number | null; priceToY: (p: number, pi?: number) => number | null }, paneIndex: number) {
    if (this.points.length < 1 || this.data.length === 0) return
    const anchor = this.points[0]
    const anchorIdx = this.data.findIndex((d) => String(d.time) === String(anchor.time))
    if (anchorIdx < 0) return

    const vwapData = computeAnchoredVWAP(this.data, anchorIdx)
    if (vwapData.length === 0) return

    const firstX = mapper.timeToX(vwapData[0].time)
    const firstY = mapper.priceToY(vwapData[0].value, paneIndex)
    if (firstX == null || firstY == null) return

    ctx.beginPath()
    ctx.moveTo(firstX, firstY)
    for (let i = 1; i < vwapData.length; i++) {
      const x = mapper.timeToX(vwapData[i].time)
      const y = mapper.priceToY(vwapData[i].value, paneIndex)
      if (x != null && y != null) ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#eab308'
    ctx.lineWidth = 1.5
    ctx.stroke()

    const anchorX = mapper.timeToX(anchor.time)
    const anchorY = mapper.priceToY(vwapData[0].value, paneIndex)
    if (anchorX != null && anchorY != null) {
      ctx.beginPath()
      ctx.moveTo(anchorX, anchorY)
      ctx.lineTo(anchorX - 5, anchorY + 8)
      ctx.lineTo(anchorX + 5, anchorY + 8)
      ctx.closePath()
      ctx.fillStyle = '#eab308'
      ctx.fill()
    }

    if (this.isSelected || this.isHovered) {
      drawControlHandle(ctx, anchorX!, anchorY!, this.style.color, this.isSelected)
    }
  }

  hitTest(x: number, y: number, mapper: { timeToX: (t: any) => number | null; priceToY: (p: number, pi?: number) => number | null }, paneIndex: number): boolean {
    if (this.points.length < 1) return false
    const px = mapper.timeToX(this.points[0].time)
    const py = mapper.priceToY(this.points[0].price, paneIndex)
    if (px == null || py == null) return false
    return Math.abs(x - px) < HIT_THRESHOLD && Math.abs(y - py) < HIT_THRESHOLD
  }
}
