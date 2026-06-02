import type { Time, CandlestickData } from 'lightweight-charts'

interface VWAPPoint {
  time: Time
  value: number
}

interface VWAPBandsResult {
  upper: VWAPPoint[][]
  middle: VWAPPoint[]
  lower: VWAPPoint[][]
}

export interface CoordMapper {
  timeToX: (time: Time) => number | null
  priceToY: (price: number, paneIndex?: number) => number | null
}

export function computeAnchoredVWAP(data: CandlestickData[], anchorIndex: number): VWAPPoint[] {
  const result: VWAPPoint[] = []
  let cumPV = 0
  let cumVol = 0

  for (let i = anchorIndex; i < data.length; i++) {
    const d = data[i]
    const typicalPrice = (d.high + d.low + d.close) / 3
    const vol = (d as any).volume ?? 0
    cumPV += typicalPrice * vol
    cumVol += vol

    result.push({
      time: d.time,
      value: cumVol > 0 ? cumPV / cumVol : typicalPrice,
    })
  }

  return result
}

export function computeVWAPBands(
  data: CandlestickData[],
  anchorIndex: number,
  stdDevs = [1, 2, 3]
): VWAPBandsResult {
  const middle = computeAnchoredVWAP(data, anchorIndex)
  const upper: VWAPPoint[][] = stdDevs.map(() => [])
  const lower: VWAPPoint[][] = stdDevs.map(() => [])
  let cumPV = 0
  let cumVol = 0
  let cumSqDiff = 0

  for (let i = anchorIndex; i < data.length; i++) {
    const d = data[i]
    const typicalPrice = (d.high + d.low + d.close) / 3
    const vol = (d as any).volume ?? 0
    cumPV += typicalPrice * vol
    cumVol += vol

    const vwap = cumVol > 0 ? cumPV / cumVol : typicalPrice
    cumSqDiff += vol * (typicalPrice - vwap) ** 2
    const variance = cumVol > 0 ? cumSqDiff / cumVol : 0
    const stdDev = Math.sqrt(variance)

    for (let s = 0; s < stdDevs.length; s++) {
      const mult = stdDevs[s]
      upper[s].push({ time: d.time, value: vwap + mult * stdDev })
      lower[s].push({ time: d.time, value: vwap - mult * stdDev })
    }
  }

  return { upper, middle, lower }
}

export function renderAnchoredVWAP(
  ctx: CanvasRenderingContext2D,
  data: CandlestickData[],
  mapper: CoordMapper,
  anchorIndex: number
): void {
  const { upper, middle, lower } = computeVWAPBands(data, anchorIndex)
  if (middle.length === 0) return

  const bandColors = [
    'rgba(59,130,246,0.08)',
    'rgba(59,130,246,0.05)',
    'rgba(59,130,246,0.03)',
  ]

  for (let s = upper.length - 1; s >= 0; s--) {
    const upperLine = upper[s]
    const lowerLine = lower[s]
    if (upperLine.length === 0 || lowerLine.length === 0) continue

    ctx.beginPath()
    const uFirstX = mapper.timeToX(upperLine[0].time)
    const uFirstY = mapper.priceToY(upperLine[0].value, 0)
    if (uFirstX == null || uFirstY == null) continue
    ctx.moveTo(uFirstX, uFirstY)
    for (let i = 1; i < upperLine.length; i++) {
      const x = mapper.timeToX(upperLine[i].time)
      const y = mapper.priceToY(upperLine[i].value, 0)
      if (x != null && y != null) ctx.lineTo(x, y)
    }
    for (let i = lowerLine.length - 1; i >= 0; i--) {
      const x = mapper.timeToX(lowerLine[i].time)
      const y = mapper.priceToY(lowerLine[i].value, 0)
      if (x != null && y != null) ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = bandColors[s] ?? 'rgba(59,130,246,0.05)'
    ctx.fill()
  }

  ctx.beginPath()
  const mFirstX = mapper.timeToX(middle[0].time)
  const mFirstY = mapper.priceToY(middle[0].value, 0)
  if (mFirstX == null || mFirstY == null) return
  ctx.moveTo(mFirstX, mFirstY)
  for (let i = 1; i < middle.length; i++) {
    const x = mapper.timeToX(middle[i].time)
    const y = mapper.priceToY(middle[i].value, 0)
    if (x != null && y != null) ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#eab308'
  ctx.lineWidth = 1.5
  ctx.stroke()

  const anchor = data[anchorIndex]
  if (anchor) {
    const ax = mapper.timeToX(anchor.time)
    const ay = mapper.priceToY(middle[0].value, 0)
    if (ax != null && ay != null) {
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax - 5, ay + 8)
      ctx.lineTo(ax + 5, ay + 8)
      ctx.closePath()
      ctx.fillStyle = '#eab308'
      ctx.fill()
    }
  }
}
