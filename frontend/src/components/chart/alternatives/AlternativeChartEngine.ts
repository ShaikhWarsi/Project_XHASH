import type { Time, CandlestickData } from 'lightweight-charts'
import type { ChartThemeColors } from '../ChartTheme'

export type AlternativeChartType = 'renko' | 'kagi' | 'range' | 'tick' | 'heikin_ashi' | 'pnf' | 'three_line_break'

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

export interface HeikinAshiBrick {
  time: Time
  open: number
  high: number
  low: number
  close: number
  up: boolean
}

export interface PnFColumn {
  time: Time
  price: number
  type: 'x' | 'o'
  count: number
  high: number
  low: number
}

export interface ThreeLineBreakLine {
  time: Time
  price: number
  direction: 'up' | 'down'
  high: number
  low: number
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

  convertToHeikinAshi(data: CandlestickData[]): HeikinAshiBrick[] {
    if (data.length === 0) return []
    const bricks: HeikinAshiBrick[] = []
    let haOpen = data[0].open
    for (const bar of data) {
      const haClose = (bar.open + bar.high + bar.low + bar.close) / 4
      const haHigh = Math.max(bar.high, haOpen, haClose)
      const haLow = Math.min(bar.low, haOpen, haClose)
      bricks.push({ time: bar.time, open: haOpen, high: haHigh, low: haLow, close: haClose, up: haClose >= haOpen })
      haOpen = (haOpen + haClose) / 2
    }
    return bricks
  }

  convertToPointFigure(data: CandlestickData[], boxSize?: number, reversal?: number): PnFColumn[] {
    const box = boxSize ?? 0.5
    const rev = reversal ?? 3
    if (data.length === 0 || box <= 0) return []
    const columns: PnFColumn[] = []
    let currentCol: PnFColumn | null = null

    for (const bar of data) {
      if (!currentCol) {
        const firstX = Math.round(bar.close / box) * box
        currentCol = { time: bar.time, price: firstX, type: 'x', count: 1, high: firstX, low: firstX }
        columns.push(currentCol)
        continue
      }

      if (currentCol.type === 'x') {
        const upBoxes = Math.floor((bar.high - currentCol.price) / box)
        if (upBoxes > 0) {
          currentCol.price += upBoxes * box
          currentCol.count += upBoxes
          currentCol.high = currentCol.price
        } else {
          const downBoxes = Math.floor((currentCol.price - bar.low) / box)
          if (downBoxes >= rev) {
            const newPrice = currentCol.price - downBoxes * box
            currentCol = { time: bar.time, price: newPrice, type: 'o', count: downBoxes, high: currentCol.price, low: newPrice }
            columns.push(currentCol)
          }
        }
      } else {
        const downBoxes = Math.floor((currentCol.price - bar.low) / box)
        if (downBoxes > 0) {
          currentCol.price -= downBoxes * box
          currentCol.count += downBoxes
          currentCol.low = currentCol.price
        } else {
          const upBoxes = Math.floor((bar.high - currentCol.price) / box)
          if (upBoxes >= rev) {
            const newPrice = currentCol.price + upBoxes * box
            currentCol = { time: bar.time, price: newPrice, type: 'x', count: upBoxes, high: newPrice, low: currentCol.price }
            columns.push(currentCol)
          }
        }
      }
    }
    return columns
  }

  convertToThreeLineBreak(data: CandlestickData[], lineCount?: number): ThreeLineBreakLine[] {
    const count = lineCount ?? 3
    if (data.length === 0) return []
    const lines: ThreeLineBreakLine[] = []
    const first = data[0]
    lines.push({ time: first.time, price: first.close, direction: 'up', high: first.high, low: first.low })

    for (let i = 1; i < data.length; i++) {
      const bar = data[i]
      const last = lines[lines.length - 1]

      if (bar.close >= last.price) {
        const prevHighs = lines.slice(-count).map(l => l.high)
        const highest = Math.max(...prevHighs, bar.high)
        const prevData = lines.slice(-count)
        const allUp = prevData.every(l => l.direction === 'up')
        if (!allUp && lines.length >= count) {
          const threshold = lines[lines.length - count].price
          if (bar.close > threshold) {
            lines.push({ time: bar.time, price: bar.close, direction: 'up', high: highest, low: last.low })
            continue
          }
        }
        if (bar.close > last.price) {
          lines.push({ time: bar.time, price: bar.close, direction: 'up', high: highest, low: last.low })
        }
      } else {
        const prevLows = lines.slice(-count).map(l => l.low)
        const lowest = Math.min(...prevLows, bar.low)
        const prevData = lines.slice(-count)
        const allDown = prevData.every(l => l.direction === 'down')
        if (!allDown && lines.length >= count) {
          const threshold = lines[lines.length - count].price
          if (bar.close < threshold) {
            lines.push({ time: bar.time, price: bar.close, direction: 'down', high: last.high, low: lowest })
            continue
          }
        }
        if (bar.close < last.price) {
          lines.push({ time: bar.time, price: bar.close, direction: 'down', high: last.high, low: lowest })
        }
      }
    }
    return lines
  }

  renderHeikinAshi(
    ctx: CanvasRenderingContext2D,
    bricks: HeikinAshiBrick[],
    layout: RenderLayout,
    mapper: CoordMapper,
    theme: { up: string; down: string }
  ): void {
    ctx.save()
    const brickWidth = Math.max(4, Math.min(20, (layout.width - layout.padding.left - layout.padding.right) / bricks.length * 0.6))
    for (const b of bricks) {
      const x = mapper.timeToX(b.time)
      const yOpen = mapper.priceToY(b.open)
      const yClose = mapper.priceToY(b.close)
      const yHigh = mapper.priceToY(b.high)
      const yLow = mapper.priceToY(b.low)
      if (x == null || yOpen == null || yClose == null || yHigh == null || yLow == null) continue
      const color = b.up ? theme.up : theme.down
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
      ctx.globalAlpha = 0.7
      ctx.fillRect(x - brickWidth / 2, bodyTop, brickWidth, bodyHeight)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  renderPnF(
    ctx: CanvasRenderingContext2D,
    columns: PnFColumn[],
    _layout: RenderLayout,
    mapper: CoordMapper,
    theme: { up: string; down: string }
  ): void {
    ctx.save()
    const colW = Math.max(6, Math.min(24, (400) / columns.length * 0.7))
    const gap = 2
    for (const col of columns) {
      const x = mapper.timeToX(col.time)
      if (x == null) continue
      const y = mapper.priceToY(col.price)
      if (y == null) continue
      const color = col.type === 'x' ? theme.up : theme.down
      const colHeight = col.count * 4
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.fillRect(x - colW / 2, y - colHeight + 4, colW - gap, colHeight)
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5
      ctx.strokeRect(x - colW / 2, y - colHeight + 4, colW - gap, colHeight)
      ctx.font = '7px JetBrains Mono, monospace'
      ctx.fillStyle = color
      ctx.fillText(col.type.toUpperCase(), x - 2, y + 3)
    }
    ctx.restore()
  }

  renderThreeLineBreak(
    ctx: CanvasRenderingContext2D,
    lines: ThreeLineBreakLine[],
    layout: RenderLayout,
    mapper: CoordMapper,
    theme: { up: string; down: string }
  ): void {
    ctx.save()
    const barW = Math.max(4, Math.min(20, (layout.width - layout.padding.left - layout.padding.right) / lines.length * 0.6))
    for (const line of lines) {
      const x = mapper.timeToX(line.time)
      const yHigh = mapper.priceToY(line.high)
      const yLow = mapper.priceToY(line.low)
      if (x == null || yHigh == null || yLow == null) continue
      const color = line.direction === 'up' ? theme.up : theme.down
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, yHigh)
      ctx.lineTo(x, yLow)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.globalAlpha = 0.6
      ctx.fillRect(x - barW / 2, yHigh, barW, Math.max(1, yLow - yHigh))
      ctx.globalAlpha = 1
    }
    ctx.restore()
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
    _layout: RenderLayout,
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
