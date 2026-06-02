import type { Time, CandlestickData } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

export type PatternType =
  | 'head_and_shoulders' | 'inverse_head_and_shoulders'
  | 'double_top' | 'double_bottom'
  | 'ascending_triangle' | 'descending_triangle' | 'symmetrical_triangle'
  | 'bullish_flag' | 'bearish_flag'
  | 'wedge' | 'falling_wedge' | 'rising_wedge'
  | 'support' | 'resistance'

export interface DetectedPattern {
  type: PatternType
  startTime: Time
  endTime: Time
  priceTarget: number
  stopLoss: number
  confidence: number
  description: string
  points: { time: Time; price: number }[]
}

export interface SwingHigh {
  index: number
  time: Time
  price: number
  type: 'high' | 'low'
  strength: number
}

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

const MIN_PIVOT_LOOKBACK = 3
const MIN_PATTERN_BARS = 20
const FLAG_MIN_POLE = 5
const WEDGE_MIN_BARS = 10

export class PatternDetector {
  detectAll(data: CandlestickData[]): DetectedPattern[] {
    if (data.length < MIN_PATTERN_BARS) return []

    const patterns: DetectedPattern[] = []
    const detectors: ((data: CandlestickData[]) => DetectedPattern | null)[] = [
      this.detectHeadAndShoulders.bind(this),
      this.detectDoubleTop.bind(this),
      this.detectTriangle.bind(this),
      this.detectFlag.bind(this),
      this.detectWedge.bind(this),
    ]

    for (const detector of detectors) {
      const result = detector(data)
      if (result) patterns.push(result)
    }

    return patterns
  }

  private detectHeadAndShoulders(data: CandlestickData[]): DetectedPattern | null {
    const { swings } = this.findSwingPoints(data)
    const highs = swings.filter((s) => s.type === 'high')

    for (let i = 1; i < highs.length - 1; i++) {
      const leftShoulder = highs[i - 1]
      const head = highs[i]
      const rightShoulder = highs[i + 1]

      if (head.price <= leftShoulder.price || head.price <= rightShoulder.price) continue

      const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price)
      const avgShoulderPrice = (leftShoulder.price + rightShoulder.price) / 2
      if (shoulderDiff / avgShoulderPrice > 0.05) continue

      const leftSwingLow = swings.find(
        (s) => s.type === 'low' && s.index > leftShoulder.index && s.index < head.index
      )
      const rightSwingLow = swings.find(
        (s) => s.type === 'low' && s.index > head.index && s.index < rightShoulder.index
      )

      if (!leftSwingLow || !rightSwingLow) continue

      const neckline = (leftSwingLow.price + rightSwingLow.price) / 2
      const headHeight = head.price - neckline
      const priceTarget = neckline - headHeight
      const stopLoss = head.price + headHeight * 0.1
      const confidence = Math.min(1, (head.price - avgShoulderPrice) / avgShoulderPrice * 5)

      return {
        type: 'head_and_shoulders',
        startTime: leftShoulder.time,
        endTime: rightShoulder.time,
        priceTarget,
        stopLoss,
        confidence: Math.round(confidence * 100) / 100,
        description: `${confidence > 0.7 ? 'Strong' : 'Potential'} Head & Shoulders — target $${priceTarget.toFixed(2)}`,
        points: [
          { time: leftShoulder.time, price: leftShoulder.price },
          { time: head.time, price: head.price },
          { time: rightShoulder.time, price: rightShoulder.price },
          { time: leftSwingLow.time, price: leftSwingLow.price },
          { time: rightSwingLow.time, price: rightSwingLow.price },
        ],
      }
    }

    return null
  }

  private detectDoubleTop(data: CandlestickData[]): DetectedPattern | null {
    const { swings } = this.findSwingPoints(data)
    const highs = swings.filter((s) => s.type === 'high')

    for (let i = 0; i < highs.length - 1; i++) {
      const first = highs[i]
      const second = highs[i + 1]

      if (data[second.index] === undefined) continue

      const priceDiff = Math.abs(first.price - second.price)
      const avgPrice = (first.price + second.price) / 2

      if (priceDiff / avgPrice > 0.03) continue

      const trough = swings.find(
        (s) => s.type === 'low' && s.index > first.index && s.index < second.index
      )
      if (!trough) continue

      const neckline = trough.price
      const height = first.price - neckline
      const priceTarget = neckline - height
      const stopLoss = Math.max(first.price, second.price) + height * 0.1
      const confidence = Math.min(1, height / avgPrice * 8)

      return {
        type: 'double_top',
        startTime: first.time,
        endTime: second.time,
        priceTarget,
        stopLoss,
        confidence: Math.round(confidence * 100) / 100,
        description: `${confidence > 0.7 ? 'Strong' : 'Potential'} Double Top — target $${priceTarget.toFixed(2)}`,
        points: [
          { time: first.time, price: first.price },
          { time: trough.time, price: trough.price },
          { time: second.time, price: second.price },
        ],
      }
    }

    return null
  }

  private detectTriangle(data: CandlestickData[]): DetectedPattern | null {
    const { swings } = this.findSwingPoints(data, 5)
    if (swings.length < 6) return null

    const highs = swings.filter((s) => s.type === 'high')
    const lows = swings.filter((s) => s.type === 'low')

    if (highs.length < 3 || lows.length < 3) return null

    const recentHighs = highs.slice(-5)
    const recentLows = lows.slice(-5)

    const highSlope = this.linearRegressionSlope(recentHighs.map((h) => h.price))
    const lowSlope = this.linearRegressionSlope(recentLows.map((l) => l.price))

    const flatThreshold = 0.001
    const isFlatTop = Math.abs(highSlope) < flatThreshold
    const isFlatBottom = Math.abs(lowSlope) < flatThreshold
    const converging = highSlope < lowSlope

    if (!converging) return null

    const lastHigh = recentHighs[recentHighs.length - 1]
    const lastLow = recentLows[recentLows.length - 1]
    const avgPrice = (lastHigh.price + lastLow.price) / 2
    const height = lastHigh.price - lastLow.price

    if (isFlatTop && lowSlope > 0) {
      const priceTarget = lastHigh.price + height * 0.5
      return {
        type: 'ascending_triangle',
        startTime: recentHighs[0].time,
        endTime: lastLow.time,
        priceTarget,
        stopLoss: lastLow.price - height * 0.2,
        confidence: Math.min(1, height / avgPrice * 6),
        description: `Ascending Triangle — target $${priceTarget.toFixed(2)}`,
        points: [lastHigh, lastLow, recentHighs[0]],
      }
    }

    if (isFlatBottom && highSlope < 0) {
      const priceTarget = lastLow.price - height * 0.5
      return {
        type: 'descending_triangle',
        startTime: recentHighs[0].time,
        endTime: lastLow.time,
        priceTarget,
        stopLoss: lastHigh.price + height * 0.2,
        confidence: Math.min(1, height / avgPrice * 6),
        description: `Descending Triangle — target $${priceTarget.toFixed(2)}`,
        points: [lastHigh, lastLow, recentHighs[0]],
      }
    }

    if (highSlope < 0 && lowSlope > 0) {
      const breakout = lastHigh.price
      const priceTarget = breakout + height * 0.5
      return {
        type: 'symmetrical_triangle',
        startTime: recentHighs[0].time,
        endTime: lastLow.time,
        priceTarget,
        stopLoss: lastLow.price - height * 0.2,
        confidence: Math.min(1, (highSlope - lowSlope) * 100),
        description: `Symmetrical Triangle — target $${priceTarget.toFixed(2)}`,
        points: [recentHighs[0], recentLows[0], lastHigh, lastLow],
      }
    }

    return null
  }

  private detectFlag(data: CandlestickData[]): DetectedPattern | null {
    if (data.length < FLAG_MIN_POLE + 5) return null

    const lookback = Math.min(FLAG_MIN_POLE + 10, data.length)
    const recentBars = data.slice(-lookback)

    const firstClose = recentBars[0].close
    const lastClose = recentBars[recentBars.length - 1].close
    const poleMove = lastClose - firstClose

    if (Math.abs(poleMove) / firstClose < 0.05) return null

    const flagBars = recentBars.slice(-8)
    const flagOpen = flagBars[0].close
    const flagClose = flagBars[flagBars.length - 1].close
    const flagDrift = flagClose - flagOpen

    const isBullish = poleMove > 0 && Math.abs(flagDrift) < Math.abs(poleMove) * 0.3
    const isBearish = poleMove < 0 && Math.abs(flagDrift) < Math.abs(poleMove) * 0.3

    if (!isBullish && !isBearish) return null

    const flagHigh = Math.max(...flagBars.map((b) => b.high))
    const flagLow = Math.min(...flagBars.map((b) => b.low))
    const flagHeight = flagHigh - flagLow
    const poleHeight = Math.abs(poleMove)

    if (flagHeight > poleHeight * 0.6) return null

    const type = isBullish ? 'bullish_flag' as const : 'bearish_flag' as const
    const breakoutPrice = isBullish ? recentBars[0].high : recentBars[0].low
    const priceTarget = isBullish
      ? lastClose + poleHeight
      : lastClose - poleHeight
    const stopLoss = isBullish
      ? flagLow - flagHeight * 0.3
      : flagHigh + flagHeight * 0.3

    return {
      type,
      startTime: recentBars[0].time,
      endTime: recentBars[recentBars.length - 1].time,
      priceTarget,
      stopLoss,
      confidence: Math.min(1, poleHeight / firstClose * 10),
      description: `${isBullish ? 'Bullish' : 'Bearish'} Flag — target $${priceTarget.toFixed(2)}`,
      points: flagBars.map((b) => ({ time: b.time, price: b.close })),
    }
  }

  private detectWedge(data: CandlestickData[]): DetectedPattern | null {
    if (data.length < WEDGE_MIN_BARS) return null

    const { swings } = this.findSwingPoints(data, 5)
    if (swings.length < 4) return null

    const highs = swings.filter((s) => s.type === 'high')
    const lows = swings.filter((s) => s.type === 'low')

    if (highs.length < 2 || lows.length < 2) return null

    const recentHighs = highs.slice(-4)
    const recentLows = lows.slice(-4)

    const highSlope = this.linearRegressionSlope(recentHighs.map((h) => h.price))
    const lowSlope = this.linearRegressionSlope(recentLows.map((l) => l.price))

    const bothUp = highSlope > 0 && lowSlope > 0
    const bothDown = highSlope < 0 && lowSlope < 0

    if (!bothUp && !bothDown) return null

    const converging = Math.abs(highSlope) < Math.abs(lowSlope) ||
                       Math.abs(highSlope) > Math.abs(lowSlope)

    if (!converging) return null

    const lastHigh = recentHighs[recentHighs.length - 1]
    const lastLow = recentLows[recentLows.length - 1]
    const avgPrice = (lastHigh.price + lastLow.price) / 2
    const height = lastHigh.price - lastLow.price

    if (bothUp) {
      const priceTarget = lastLow.price - height * 0.5
      return {
        type: 'rising_wedge',
        startTime: recentHighs[0].time,
        endTime: lastLow.time,
        priceTarget,
        stopLoss: lastHigh.price + height * 0.2,
        confidence: Math.min(1, Math.abs(highSlope - lowSlope) * 80),
        description: `Rising Wedge (bearish) — target $${priceTarget.toFixed(2)}`,
        points: [recentHighs[0], recentLows[0], lastHigh, lastLow],
      }
    }

    if (bothDown) {
      const priceTarget = lastHigh.price + height * 0.5
      return {
        type: 'falling_wedge',
        startTime: recentHighs[0].time,
        endTime: lastLow.time,
        priceTarget,
        stopLoss: lastLow.price - height * 0.2,
        confidence: Math.min(1, Math.abs(highSlope - lowSlope) * 80),
        description: `Falling Wedge (bullish) — target $${priceTarget.toFixed(2)}`,
        points: [recentHighs[0], recentLows[0], lastHigh, lastLow],
      }
    }

    return null
  }

  findSwingPoints(data: CandlestickData[], pivotLookback: number = MIN_PIVOT_LOOKBACK): { swings: SwingHigh[]; pivotLookback: number } {
    const swings: SwingHigh[] = []

    for (let i = pivotLookback; i < data.length - pivotLookback; i++) {
      const current = data[i]

      const leftHighs = data.slice(i - pivotLookback, i).map((d) => d.high)
      const rightHighs = data.slice(i + 1, i + 1 + pivotLookback).map((d) => d.high)
      const leftLows = data.slice(i - pivotLookback, i).map((d) => d.low)
      const rightLows = data.slice(i + 1, i + 1 + pivotLookback).map((d) => d.low)

      const isSwingHigh = current.high > Math.max(...leftHighs) &&
                          current.high > Math.max(...rightHighs)
      const isSwingLow = current.low < Math.min(...leftLows) &&
                         current.low < Math.min(...rightLows)

      if (isSwingHigh) {
        swings.push({
          index: i,
          time: current.time,
          price: current.high,
          type: 'high',
          strength: pivotLookback,
        })
      }

      if (isSwingLow) {
        swings.push({
          index: i,
          time: current.time,
          price: current.low,
          type: 'low',
          strength: pivotLookback,
        })
      }
    }

    return { swings, pivotLookback }
  }

  renderPattern(
    ctx: CanvasRenderingContext2D,
    pattern: DetectedPattern,
    mapper: CoordMapper,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    const isBearish = [
      'head_and_shoulders', 'double_top', 'descending_triangle',
      'bearish_flag', 'rising_wedge', 'resistance',
    ].includes(pattern.type)

    const color = isBearish ? theme.down : theme.up
    const points = pattern.points

    const coords = points
      .map((p) => {
        const x = mapper.timeToX(p.time)
        const y = mapper.priceToY(p.price)
        return x != null && y != null ? { x, y } : null
      })
      .filter(Boolean) as { x: number; y: number }[]

    if (coords.length < 2) {
      ctx.restore()
      return
    }

    ctx.globalAlpha = 0.15
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(coords[0].x, coords[0].y)
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 3])
    ctx.beginPath()
    ctx.moveTo(coords[0].x, coords[0].y)
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    for (const c of coords) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(c.x, c.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = theme.bg
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    const targetY = mapper.priceToY(pattern.priceTarget)
    const stopY = mapper.priceToY(pattern.stopLoss)
    const lastX = coords[coords.length - 1].x

    if (targetY != null) {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(lastX + 10, targetY)
      ctx.lineTo(lastX + 60, targetY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = color
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Target $${pattern.priceTarget.toFixed(2)}`, lastX + 64, targetY)
    }

    if (stopY != null) {
      ctx.strokeStyle = theme.accentOrange
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(lastX + 10, stopY)
      ctx.lineTo(lastX + 60, stopY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = theme.accentOrange
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`SL $${pattern.stopLoss.toFixed(2)}`, lastX + 64, stopY)
    }

    ctx.font = 'bold 10px JetBrains Mono, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    const label = pattern.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const confidencePct = (pattern.confidence * 100).toFixed(0)
    const text = `${label} (${confidencePct}%)`
    const textW = ctx.measureText(text).width

    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(coords[0].x - 4, coords[0].y - 18, textW + 8, 16)

    ctx.fillStyle = theme.textPrimary
    ctx.fillText(text, coords[0].x, coords[0].y - 2)

    ctx.restore()
  }

  private linearRegressionSlope(values: number[]): number {
    if (values.length < 2) return 0
    const n = values.length
    const indices = values.map((_, i) => i)
    const sumX = indices.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0)
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return Number.isFinite(slope) ? slope : 0
  }
}
