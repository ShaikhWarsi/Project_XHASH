import type { Time, CandlestickData } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

export interface TPOLetter {
  price: number
  letter: string
  timePeriod: string
}

export interface MarketProfileData {
  tpoLetters: TPOLetter[]
  valueAreaHigh: number
  valueAreaLow: number
  pointOfControl: number
  initialBalance: { high: number; low: number }
  dayType: 'trend' | 'normal' | 'doubleDistribution'
}

interface CoordMapper {
  priceToY(price: number): number | null
}

interface RenderLayout {
  width: number
  height: number
}

const PERIOD_MINUTES = 30
const SESSION_START = '09:30'
const SESSION_END = '16:00'
const VALUE_AREA_PCT = 0.7

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function generateLetter(index: number): string {
  let letter = ''
  let n = index
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

export class MarketProfile {
  generateTPO(
    data: CandlestickData[],
    timezone: string,
    sessionStart: string = SESSION_START,
    sessionEnd: string = SESSION_END
  ): MarketProfileData {
    const startMinutes = timeToMinutes(sessionStart)
    const endMinutes = timeToMinutes(sessionEnd)
    const periodMinutes = PERIOD_MINUTES

    const priceBuckets = new Map<number, Map<number, string>>()
    const allPrices = new Set<number>()
    let ibHigh = -Infinity
    let ibLow = Infinity

    for (const bar of data) {
      const barTime = new Date((bar.time as number) * 1000)
      const barMinutes = barTime.getUTCHours() * 60 + barTime.getUTCMinutes()

      if (barMinutes < startMinutes || barMinutes > endMinutes) continue

      if (data.indexOf(bar) === 0) {
        ibHigh = bar.high
        ibLow = bar.low
      }

      const periodIndex = Math.floor((barMinutes - startMinutes) / periodMinutes)
      const letter = generateLetter(periodIndex)
      const periodLabel = minutesToTimeLabel(startMinutes + periodIndex * periodMinutes)

      const priceStep = this.estimatePriceStep(data)
      const priceLevel = Math.round(bar.high / priceStep) * priceStep
      const lowLevel = Math.round(bar.low / priceStep) * priceStep

      for (let p = lowLevel; p <= priceLevel; p += priceStep) {
        const roundedP = Math.round(p * 100) / 100
        if (!priceBuckets.has(roundedP)) {
          priceBuckets.set(roundedP, new Map())
        }
        const bucket = priceBuckets.get(roundedP)!
        if (!bucket.has(periodIndex)) {
          bucket.set(periodIndex, letter)
          allPrices.add(roundedP)
        }
      }

      if (bar.high > ibHigh) ibHigh = bar.high
      if (bar.low < ibLow) ibLow = bar.low
    }

    const sortedPrices = Array.from(allPrices).sort((a, b) => b - a)
    const tpoLetters: TPOLetter[] = []

    for (const price of sortedPrices) {
      const bucket = priceBuckets.get(price)
      if (!bucket) continue
      const sortedPeriods = Array.from(bucket.keys()).sort((a, b) => a - b)
      for (const periodIdx of sortedPeriods) {
        const label = minutesToTimeLabel(startMinutes + periodIdx * periodMinutes)
        tpoLetters.push({
          price,
          letter: bucket.get(periodIdx)!,
          timePeriod: label,
        })
      }
    }

    const priceCounts = new Map<number, number>()
    for (const { price } of tpoLetters) {
      priceCounts.set(price, (priceCounts.get(price) ?? 0) + 1)
    }

    let poc = sortedPrices[0]
    let maxCount = 0
    for (const [price, count] of priceCounts) {
      if (count > maxCount) {
        maxCount = count
        poc = price
      }
    }

    const totalLetters = tpoLetters.length
    const sortedByCount = Array.from(priceCounts.entries()).sort((a, b) => b[1] - a[1])
    let cumulative = 0
    let vaHigh = -Infinity
    let vaLow = Infinity
    for (const [price, count] of sortedByCount) {
      cumulative += count
      if (cumulative <= totalLetters * VALUE_AREA_PCT) {
        if (price > vaHigh) vaHigh = price
        if (price < vaLow) vaLow = price
      }
    }
    if (vaHigh === -Infinity) vaHigh = poc
    if (vaLow === Infinity) vaLow = poc

    const pocIndex = sortedPrices.indexOf(poc)
    const upperCount = sortedPrices.slice(0, pocIndex).length
    const lowerCount = sortedPrices.slice(pocIndex + 1).length
    const ratio = upperCount / Math.max(1, lowerCount)

    let dayType: 'trend' | 'normal' | 'doubleDistribution' = 'normal'
    if (ratio > 2 || ratio < 0.5) {
      dayType = 'trend'
    } else {
      const letterPeriods = new Set(tpoLetters.map((t) => t.timePeriod))
      const periodCount = letterPeriods.size
      if (periodCount >= 10) {
        dayType = 'doubleDistribution'
      }
    }

    return {
      tpoLetters,
      valueAreaHigh: vaHigh,
      valueAreaLow: vaLow,
      pointOfControl: poc,
      initialBalance: { high: ibHigh, low: ibLow },
      dayType,
    }
  }

  renderTPO(
    ctx: CanvasRenderingContext2D,
    data: MarketProfileData,
    layout: RenderLayout,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    const { width, height } = layout
    const margin = { top: 20, bottom: 20, left: 60, right: 20 }
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom

    const uniquePrices = Array.from(new Set(data.tpoLetters.map((t) => t.price))).sort((a, b) => b - a)
    const uniquePeriods = Array.from(new Set(data.tpoLetters.map((t) => t.timePeriod))).sort()
    const cellSize = Math.min(
      plotWidth / Math.max(1, uniquePeriods.length),
      plotHeight / Math.max(1, uniquePrices.length),
      14
    )

    const gridWidth = uniquePeriods.length * cellSize
    const gridHeight = uniquePrices.length * cellSize
    const gridX = margin.left + (plotWidth - gridWidth) / 2
    const gridY = margin.top

    if (uniquePrices.length === 0 || uniquePeriods.length === 0) {
      ctx.restore()
      return
    }

    const vaTop = uniquePrices.findIndex((p) => p <= data.valueAreaHigh)
    const vaBottom = uniquePrices.findIndex((p) => p >= data.valueAreaLow)
    const vaStartIdx = vaTop >= 0 ? vaTop : 0
    const vaEndIdx = vaBottom >= 0 ? vaBottom : uniquePrices.length - 1

    if (vaStartIdx <= vaEndIdx) {
      ctx.fillStyle = 'rgba(59,130,246,0.06)'
      ctx.fillRect(
        gridX,
        gridY + vaStartIdx * cellSize,
        gridWidth,
        (vaEndIdx - vaStartIdx + 1) * cellSize
      )
    }

    const pocY = gridY + uniquePrices.indexOf(data.pointOfControl) * cellSize
    ctx.fillStyle = 'rgba(255,213,79,0.15)'
    ctx.fillRect(gridX, pocY, gridWidth, cellSize)

    ctx.font = `${Math.max(7, cellSize - 4)}px JetBrains Mono, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const tpo of data.tpoLetters) {
      const priceIdx = uniquePrices.indexOf(tpo.price)
      const periodIdx = uniquePeriods.indexOf(tpo.timePeriod)
      if (priceIdx < 0 || periodIdx < 0) continue

      const x = gridX + periodIdx * cellSize + cellSize / 2
      const y = gridY + priceIdx * cellSize + cellSize / 2

      ctx.fillStyle = data.pointOfControl === tpo.price
        ? theme.accentYellow
        : theme.text
      ctx.fillText(tpo.letter, x, y)
    }

    ctx.strokeStyle = theme.border
    ctx.lineWidth = 1
    for (let i = 0; i <= uniquePrices.length; i++) {
      const y = gridY + i * cellSize
      ctx.beginPath()
      ctx.moveTo(gridX, y)
      ctx.lineTo(gridX + gridWidth, y)
      ctx.stroke()
    }
    for (let i = 0; i <= uniquePeriods.length; i++) {
      const x = gridX + i * cellSize
      ctx.beginPath()
      ctx.moveTo(x, gridY)
      ctx.lineTo(x, gridY + gridHeight)
      ctx.stroke()
    }

    ctx.font = '9px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < uniquePrices.length; i++) {
      const y = gridY + i * cellSize + cellSize / 2
      ctx.fillStyle = theme.text
      ctx.fillText(uniquePrices[i].toFixed(2), gridX - 4, y)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i < uniquePeriods.length; i++) {
      const x = gridX + i * cellSize + cellSize / 2
      ctx.fillStyle = theme.text
      ctx.fillText(uniquePeriods[i], x, gridY + gridHeight + 4)
    }

    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    const ibHighY = gridY + Math.max(0, Math.min(uniquePrices.length - 1, uniquePrices.findIndex((p) => p <= data.initialBalance.high))) * cellSize
    const ibLowY = gridY + Math.max(0, Math.min(uniquePrices.length - 1, uniquePrices.findIndex((p) => p >= data.initialBalance.low))) * cellSize
    ctx.beginPath()
    ctx.moveTo(gridX, ibHighY)
    ctx.lineTo(gridX + gridWidth, ibHighY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(gridX, ibLowY)
    ctx.lineTo(gridX + gridWidth, ibLowY)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = theme.accent
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.font = '9px JetBrains Mono, monospace'
    ctx.fillText(`IB ${data.initialBalance.high.toFixed(2)}`, gridX + 4, ibHighY - 2)
    ctx.textBaseline = 'top'
    ctx.fillText(`IB ${data.initialBalance.low.toFixed(2)}`, gridX + 4, ibLowY + 2)

    ctx.fillStyle = theme.accentYellow
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.font = 'bold 9px JetBrains Mono, monospace'
    ctx.fillText(`POC ${data.pointOfControl.toFixed(2)}`, gridX + gridWidth + 4, pocY + cellSize - 2)

    ctx.fillStyle = theme.text
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.font = '8px JetBrains Mono, monospace'
    ctx.fillText(`VAH ${data.valueAreaHigh.toFixed(2)}`, gridX + gridWidth, gridY + vaStartIdx * cellSize + 2)
    ctx.fillText(`VAL ${data.valueAreaLow.toFixed(2)}`, gridX + gridWidth, gridY + (vaEndIdx + 1) * cellSize - 2)

    ctx.restore()
  }

  private estimatePriceStep(data: CandlestickData[]): number {
    const prices = data.flatMap((d) => [d.high, d.low, d.open, d.close])
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const range = maxPrice - minPrice
    const step = Math.pow(10, Math.floor(Math.log10(range / 30)))
    return Math.max(step, 0.01)
  }
}
