import type { Time, CandlestickData } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

export type AlternativeChartType = 'renko' | 'kagi' | 'range' | 'tick'

export interface Tick {
  time: Time
  price: number
  volume: number
  side: 'buy' | 'sell'
}

export interface RenkoBrick {
  time: Time
  open: number
  close: number
  high: number
  low: number
  direction: 'up' | 'down'
  wickSize: number
}

export interface KagiLine {
  time: Time
  price: number
  direction: 'yang' | 'yin'
  isReverse: boolean
  thickness: 'thin' | 'thick'
}

export interface RangeBar {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
  tickCount: number
}

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

interface RenderLayout {
  width: number
  height: number
  padding: { top: number; bottom: number; left: number; right: number }
}

const DEFAULT_BRICK_SIZE = 0.50
const DEFAULT_REVERSAL = 1.0
const DEFAULT_RANGE_SIZE = 0.25
const DEFAULT_TICKS_PER_BAR = 144

export class AlternativeChartEngine {
  convertToRenko(data: CandlestickData[], brickSize?: number): RenkoBrick[] {
    const size = brickSize ?? this.estimateATR(data, 14) ?? DEFAULT_BRICK_SIZE
    if (data.length === 0 || size <= 0) return []

    const bricks: RenkoBrick[] = []
    let prevClose = data[0].close

    for (const bar of data) {
      const { high, low } = bar
      let currentPrice = prevClose

      const upBricks = Math.floor((high - currentPrice) / size)
      const downBricks = Math.floor((currentPrice - low) / size)

      for (let i = 0; i < upBricks; i++) {
        const open = currentPrice
        const close = currentPrice + size
        bricks.push({
          time: bar.time,
          open,
          close,
          high: Math.max(open, close),
          low: Math.min(open, close),
          direction: 'up',
          wickSize: Math.max(0, high - close),
        })
        currentPrice = close
      }

      for (let i = 0; i < downBricks; i++) {
        const open = currentPrice
        const close = currentPrice - size
        bricks.push({
          time: bar.time,
          open,
          close,
          high: Math.max(open, close),
          low: Math.min(open, close),
          direction: 'down',
          wickSize: Math.max(0, open - low),
        })
        currentPrice = close
      }

      prevClose = currentPrice
    }

    return bricks
  }

  convertToKagi(data: CandlestickData[], reversalAmount?: number): KagiLine[] {
    const amount = reversalAmount ?? DEFAULT_REVERSAL
    if (data.length === 0 || amount <= 0) return []

    const lines: KagiLine[] = []
    let prevPrice = data[0].close
    let direction: 'yang' | 'yin' = 'yang'
    let prevHigh = data[0].high
    let prevLow = data[0].low

    lines.push({ time: data[0].time, price: prevPrice, direction, isReverse: false, thickness: 'thin' })

    for (let i = 1; i < data.length; i++) {
      const bar = data[i]
      const priceMove = bar.close - prevPrice
      const absMove = Math.abs(priceMove)

      if (absMove >= amount) {
        const newDirection = priceMove > 0 ? 'yang' : 'yin'

        if (newDirection !== direction) {
          const reversalLine: KagiLine = {
            time: bar.time,
            price: prevPrice,
            direction,
            isReverse: true,
            thickness: 'thin',
          }
          lines.push(reversalLine)

          direction = newDirection
        }

        const isBreak = direction === 'yang'
          ? bar.high > prevHigh
          : bar.low < prevLow

        lines.push({
          time: bar.time,
          price: bar.close,
          direction,
          isReverse: false,
          thickness: isBreak ? 'thick' : 'thin',
        })

        prevPrice = bar.close
        if (bar.high > prevHigh) prevHigh = bar.high
        if (bar.low < prevLow) prevLow = bar.low
      }
    }

    return lines
  }

  convertToRange(data: CandlestickData[], rangeSize?: number): RangeBar[] {
    const size = rangeSize ?? DEFAULT_RANGE_SIZE
    if (data.length === 0 || size <= 0) return []

    const bars: RangeBar[] = []
    let currentOpen: number | null = null
    let currentHigh = -Infinity
    let currentLow = Infinity
    let currentVolume = 0
    let tickCount = 0
    let currentTime: Time = data[0].time

    for (const bar of data) {
      if (currentOpen === null) {
        currentOpen = bar.open
      }

      currentHigh = Math.max(currentHigh, bar.high)
      currentLow = Math.min(currentLow, bar.low)
      currentVolume += (bar as any).volume ?? 0
      tickCount++
      currentTime = bar.time

      if (currentHigh - currentLow >= size) {
        const close = bar.close
        bars.push({
          time: currentTime,
          open: currentOpen,
          high: currentHigh,
          low: currentLow,
          close,
          volume: currentVolume,
          tickCount,
        })
        currentOpen = close
        currentHigh = close
        currentLow = close
        currentVolume = 0
        tickCount = 0
      }
    }

    return bars
  }

  convertToTickBars(ticks: Tick[], ticksPerBar: number = DEFAULT_TICKS_PER_BAR): CandlestickData[] {
    if (ticks.length === 0 || ticksPerBar <= 0) return []

    const bars: CandlestickData[] = []

    for (let i = 0; i < ticks.length; i += ticksPerBar) {
      const chunk = ticks.slice(i, i + ticksPerBar)
      if (chunk.length === 0) continue

      const open = chunk[0].price
      let high = -Infinity
      let low = Infinity
      let volume = 0

      for (const t of chunk) {
        if (t.price > high) high = t.price
        if (t.price < low) low = t.price
        volume += t.volume
      }

      const close = chunk[chunk.length - 1].price

      bars.push({
        time: chunk[0].time,
        open,
        high,
        low,
        close,
      })
    }

    return bars
  }

  renderRenko(
    ctx: CanvasRenderingContext2D,
    bricks: RenkoBrick[],
    layout: RenderLayout,
    mapper: CoordMapper,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    const brickWidth = Math.max(8, Math.min(30, (layout.width - layout.padding.left - layout.padding.right) / bricks.length * 0.6))
    const gap = 2

    for (const brick of bricks) {
      const x = mapper.timeToX(brick.time)
      const yOpen = mapper.priceToY(brick.open)
      const yClose = mapper.priceToY(brick.close)
      const yWick = mapper.priceToY(brick.direction === 'up' ? brick.high : brick.low)

      if (x == null || yOpen == null || yClose == null) continue

      const bodyTop = Math.min(yOpen, yClose)
      const bodyBottom = Math.max(yOpen, yClose)
      const bodyHeight = Math.max(2, bodyBottom - bodyTop)

      const isUp = brick.direction === 'up'
      const color = isUp ? theme.up : theme.down

      ctx.fillStyle = color + 'CC'
      ctx.fillRect(x - brickWidth / 2, bodyTop, brickWidth - gap, bodyHeight)

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.strokeRect(x - brickWidth / 2, bodyTop, brickWidth - gap, bodyHeight)

      if (brick.wickSize > 0 && yWick != null) {
        ctx.strokeStyle = isUp ? theme.up : theme.down
        ctx.lineWidth = 1
        ctx.beginPath()
        if (isUp) {
          ctx.moveTo(x, bodyTop)
          ctx.lineTo(x, yWick)
        } else {
          ctx.moveTo(x, bodyBottom)
          ctx.lineTo(x, yWick)
        }
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  renderKagi(
    ctx: CanvasRenderingContext2D,
    lines: KagiLine[],
    layout: RenderLayout,
    mapper: CoordMapper,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const x = mapper.timeToX(line.time)
      const y = mapper.priceToY(line.price)
      if (x == null || y == null) continue

      const isYang = line.direction === 'yang'
      const baseColor = isYang ? theme.up : theme.down
      const lineWidth = line.thickness === 'thick' ? 3 : 1.5

      ctx.strokeStyle = baseColor
      ctx.lineWidth = lineWidth
      ctx.beginPath()

      if (i > 0) {
        const prev = lines[i - 1]
        const prevX = mapper.timeToX(prev.time)
        const prevY = mapper.priceToY(prev.price)
        if (prevX != null && prevY != null) {
          ctx.moveTo(prevX, prevY)
          if (line.isReverse) {
            ctx.lineTo(x, prevY)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(x, prevY)
            ctx.lineTo(x, y)
          }
        }
      } else {
        ctx.moveTo(x, y)
      }

      if (!line.isReverse) {
        ctx.lineTo(x, y)
      }

      ctx.stroke()
    }

    ctx.restore()
  }

  renderRangeBars(
    ctx: CanvasRenderingContext2D,
    bars: RangeBar[],
    layout: RenderLayout,
    mapper: CoordMapper,
    theme: ChartThemeColors
  ): void {
    ctx.save()

    if (bars.length === 0) {
      ctx.restore()
      return
    }

    const chartWidth = layout.width - layout.padding.left - layout.padding.right
    const barWidth = Math.max(2, Math.min(15, chartWidth / bars.length - 1))

    for (const bar of bars) {
      const x = mapper.timeToX(bar.time)
      const yOpen = mapper.priceToY(bar.open)
      const yHigh = mapper.priceToY(bar.high)
      const yLow = mapper.priceToY(bar.low)
      const yClose = mapper.priceToY(bar.close)

      if (x == null || yOpen == null || yHigh == null || yLow == null || yClose == null) continue

      const isUp = bar.close >= bar.open
      const color = isUp ? theme.up : theme.down
      const bodyTop = Math.min(yOpen, yClose)
      const bodyBottom = Math.max(yOpen, yClose)
      const bodyHeight = Math.max(1, bodyBottom - bodyTop)

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()

      ctx.fillStyle = color
      ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight)
    }

    ctx.restore()
  }

  private estimateATR(data: CandlestickData[], period: number): number | null {
    if (data.length < period + 1) return null
    let sum = 0
    for (let i = 1; i <= period; i++) {
      const high = data[i].high
      const low = data[i].low
      const prevClose = data[i - 1].close
      sum += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose))
    }
    return sum / period
  }
}
