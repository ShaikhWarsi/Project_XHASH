import type { CandlestickData, Time } from 'lightweight-charts'

interface CoordMapper {
  timeToX?(time: Time): number | null
  priceToY(price: number): number | null
}

interface VolumeBucket {
  priceLow: number
  priceHigh: number
  volume: number
  buyVolume: number
  sellVolume: number
}

interface RenderOptions {
  bucketCount?: number
  width?: number
}

export function renderVolumeProfile(
  ctx: CanvasRenderingContext2D,
  data: CandlestickData[],
  mapper: CoordMapper,
  layout: { width: number; height: number; rightMargin: number },
  options?: RenderOptions
): void {
  ctx.save()

  const bucketCount = options?.bucketCount ?? 30
  const histWidth = options?.width ?? 50
  const rightMargin = layout.rightMargin ?? 60
  const histLeft = layout.width - rightMargin - histWidth
  const histRight = histLeft + histWidth

  if (data.length === 0) {
    ctx.restore()
    return
  }

  const prices = data.flatMap((d) => [d.high, d.low])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice
  if (range === 0) {
    ctx.restore()
    return
  }

  const bucketSize = range / bucketCount
  const buckets: VolumeBucket[] = []

  for (let i = 0; i < bucketCount; i++) {
    const low = minPrice + i * bucketSize
    const high = low + bucketSize
    buckets.push({ priceLow: low, priceHigh: high, volume: 0, buyVolume: 0, sellVolume: 0 })
  }

  for (const bar of data) {
    const avgPrice = (bar.high + bar.low) / 2
    const idx = Math.min(Math.floor((avgPrice - minPrice) / bucketSize), bucketCount - 1)
    if (idx < 0 || idx >= bucketCount) continue
    const vol = (bar as any).volume ?? 0
    buckets[idx].volume += vol

    const barRange = bar.high - bar.low || 1
    let buyVol: number
    let sellVol: number
    if (bar.close > bar.open) {
      buyVol = vol * (0.5 + 0.4 * (bar.close - bar.open) / barRange)
      sellVol = vol - buyVol
    } else if (bar.close < bar.open) {
      sellVol = vol * (0.5 + 0.4 * (bar.open - bar.close) / barRange)
      buyVol = vol - sellVol
    } else {
      buyVol = vol / 2
      sellVol = vol / 2
    }
    buckets[idx].buyVolume += buyVol
    buckets[idx].sellVolume += sellVol
  }

  const maxVol = Math.max(...buckets.map((b) => b.volume), 1)

  let poc = buckets[0]
  for (const b of buckets) {
    if (b.volume > poc.volume) poc = b
  }

  const totalVolume = buckets.reduce((s, b) => s + b.volume, 0)
  const sortedByVol = [...buckets].sort((a, b) => b.volume - a.volume)
  let cumulative = 0
  let valueAreaHigh = -Infinity
  let valueAreaLow = Infinity
  for (const b of sortedByVol) {
    cumulative += b.volume
    if (cumulative <= totalVolume * 0.7) {
      valueAreaHigh = Math.max(valueAreaHigh, b.priceHigh)
      valueAreaLow = Math.min(valueAreaLow, b.priceLow)
    }
  }
  if (valueAreaHigh === -Infinity) {
    valueAreaHigh = poc.priceHigh
    valueAreaLow = poc.priceLow
  }

  const vaYTop = mapper.priceToY(valueAreaLow)
  const vaYBottom = mapper.priceToY(valueAreaHigh)
  if (vaYTop != null && vaYBottom != null) {
    ctx.fillStyle = 'rgba(59,130,246,0.06)'
    ctx.fillRect(histLeft, Math.min(vaYTop, vaYBottom), histWidth, Math.abs(vaYBottom - vaYTop))
  }

  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const avgPrice = (bucket.priceLow + bucket.priceHigh) / 2
    const y = mapper.priceToY(avgPrice)
    if (y == null) continue

    const pct = bucket.volume / maxVol
    const barW = Math.min(pct * histWidth, 50)

    const totalBv = bucket.buyVolume + bucket.sellVolume || 1
    const ratio = bucket.buyVolume / totalBv
    let color: string
    if (ratio > 0.55) color = 'rgba(38,166,154,0.5)'
    else if (ratio < 0.45) color = 'rgba(239,83,80,0.5)'
    else color = 'rgba(107,114,128,0.4)'

    if (bucket === poc) {
      color = 'rgba(255,213,79,0.6)'
    }

    ctx.fillStyle = color
    ctx.fillRect(histRight - barW, y - 1, barW, 2)

    if (bucket === poc) {
      ctx.strokeStyle = '#ffd54f'
      ctx.lineWidth = 1.5
      ctx.strokeRect(histRight - barW, y - 1.5, barW, 3)
    }
  }

  ctx.font = '8px JetBrains Mono, monospace'
  ctx.textBaseline = 'middle'

  if (poc) {
    const pocY = mapper.priceToY((poc.priceLow + poc.priceHigh) / 2)
    if (pocY != null) {
      ctx.fillStyle = '#ffd54f'
      ctx.textAlign = 'left'
      ctx.fillText(`POC ${((poc.priceLow + poc.priceHigh) / 2).toFixed(2)}`, histRight + 4, pocY)
    }
  }

  ctx.strokeStyle = 'rgba(59,130,246,0.4)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])

  const vahY = mapper.priceToY(valueAreaHigh)
  const valY = mapper.priceToY(valueAreaLow)
  if (vahY != null) {
    ctx.beginPath()
    ctx.moveTo(histLeft, vahY)
    ctx.lineTo(layout.width, vahY)
    ctx.stroke()
    ctx.fillStyle = 'rgba(59,130,246,0.6)'
    ctx.textAlign = 'left'
    ctx.fillText(`VAH ${valueAreaHigh.toFixed(2)}`, histRight + 4, vahY)
  }
  if (valY != null) {
    ctx.beginPath()
    ctx.moveTo(histLeft, valY)
    ctx.lineTo(layout.width, valY)
    ctx.stroke()
    ctx.fillStyle = 'rgba(59,130,246,0.6)'
    ctx.textAlign = 'left'
    ctx.fillText(`VAL ${valueAreaLow.toFixed(2)}`, histRight + 4, valY)
  }

  ctx.setLineDash([])
  ctx.restore()
}
