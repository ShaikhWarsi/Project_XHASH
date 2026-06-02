import type { Time } from 'lightweight-charts'

export interface SignalPoint {
  time: Time
  type: 'buy' | 'sell' | 'strong_buy' | 'strong_sell' | 'neutral'
  price: number
  strength: number
  label?: string
  source?: string
}

export interface HitTestRect {
  x: number
  y: number
  width: number
  height: number
  signal: SignalPoint
}

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

interface SignalTheme {
  up: string
  down: string
  accentYellow: string
  text: string
}

const TRIANGLE_HALF = 8
const STRONG_SCALE = 1.6
const LABEL_FONT = '9px JetBrains Mono, monospace'
const CLUSTER_GAP = 14
const NEUTRAL_DOT_RADIUS = 3

function isStrong(type: SignalPoint['type']): boolean {
  return type === 'strong_buy' || type === 'strong_sell'
}

function isBuy(type: SignalPoint['type']): boolean {
  return type === 'buy' || type === 'strong_buy'
}

function getSignalColor(type: SignalPoint['type'], theme: SignalTheme): string {
  if (isBuy(type)) return theme.up
  if (type === 'neutral') return theme.text
  return theme.down
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  pointingDown: boolean,
  color: string,
) {
  const half = size / 2
  ctx.beginPath()
  if (pointingDown) {
    ctx.moveTo(x - half, y - half)
    ctx.lineTo(x, y + half)
    ctx.lineTo(x + half, y - half)
  } else {
    ctx.moveTo(x - half, y + half)
    ctx.lineTo(x, y - half)
    ctx.lineTo(x + half, y + half)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.beginPath()
  ctx.arc(x, y, NEUTRAL_DOT_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, pulsePhase: number) {
  const pulse = 0.15 + Math.sin(pulsePhase * 4) * 0.08
  const glowSize = size * 2.2
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize)
  gradient.addColorStop(0, color + Math.round(pulse * 60).toString(16).padStart(2, '0'))
  gradient.addColorStop(1, color + '00')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, glowSize, 0, Math.PI * 2)
  ctx.fill()
}

export function renderSignalsOnChart(
  ctx: CanvasRenderingContext2D,
  signals: SignalPoint[],
  mapper: CoordMapper,
  theme: SignalTheme,
  canvasWidth: number,
  time?: number,
): HitTestRect[] {
  const hits: HitTestRect[] = []
  const phase = time ? time / 1000 : 0

  const placed: { x: number; type: SignalPoint['type']; signal: SignalPoint }[] = []

  for (const sig of signals) {
    const x = mapper.timeToX(sig.time)
    const y = mapper.priceToY(sig.price)
    if (x == null || y == null) continue

    placed.push({ x, type: sig.type, signal: sig })
  }

  const stacks = new Map<string, { x: number; items: typeof placed }>()
  for (const p of placed) {
    const key = `${Math.round(p.x / 8)}`
    if (!stacks.has(key)) stacks.set(key, { x: p.x, items: [] })
    stacks.get(key)!.items.push(p)
  }

  for (const [, stack] of stacks) {
    if (stack.items.length === 0) continue

    const sorted = stack.items.sort((a, b) => {
      const aPrice = a.signal.price
      const bPrice = b.signal.price
      return aPrice - bPrice
    })

    if (sorted.length === 1) {
      const item = sorted[0]
      const s = renderSingle(ctx, item, theme, canvasWidth, phase, hits)
      if (s === 'buy') {
        ctx.strokeStyle = theme.up + '60'
      } else if (s === 'sell') {
        ctx.strokeStyle = theme.down + '60'
      }
      continue
    }

    const midX = sorted.reduce((s, i) => s + i.x, 0) / sorted.length

    ctx.strokeStyle = theme.text + '40'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    const baseY = sorted.reduce((s, i) => {
      const yVal = mapper.priceToY(i.signal.price)
      return s + (yVal ?? 0)
    }, 0) / sorted.length

    const totalHeight = (sorted.length - 1) * CLUSTER_GAP
    const startY = baseY - totalHeight / 2

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      const cy = startY + i * CLUSTER_GAP

      ctx.beginPath()
      ctx.moveTo(midX, baseY)
      ctx.lineTo(midX, cy)
      ctx.stroke()

      const origX = item.x
      item.x = midX
      renderSingleAt(ctx, item, midX, cy, theme, canvasWidth, phase, hits)
      item.x = origX
    }
    ctx.setLineDash([])
  }

  return hits
}

type SignalSide = 'buy' | 'sell' | 'neutral'
function renderSingle(
  ctx: CanvasRenderingContext2D,
  item: { x: number; type: SignalPoint['type']; signal: SignalPoint },
  theme: SignalTheme,
  canvasWidth: number,
  phase: number,
  hits: HitTestRect[],
): SignalSide {
  const sig = item.signal
  const x = item.x
  const y = item.signal.price
  const yPx = ctx.canvas ? mapperPriceY(ctx, item.signal.price) : 48
  const price = sig.price

  const isStr = isStrong(sig.type)
  const isB = isBuy(sig.type)
  const color = getSignalColor(sig.type, theme)
  const baseSize = TRIANGLE_HALF * 2 * (sig.strength * 0.5 + 0.5)
  const size = isStr ? baseSize * STRONG_SCALE : baseSize
  const label = sig.label || sig.source || ''
  const strengthPct = Math.round(sig.strength * 100)

  ctx.save()

  if (sig.type === 'neutral') {
    drawDot(ctx, x, yPx, color)
    ctx.restore()
    return 'neutral'
  }

  if (isStr) {
    drawGlow(ctx, x, yPx, size, color, phase)
  } else {
    ctx.shadowColor = color
    ctx.shadowBlur = 6
  }

  const pointingDown = !isB
  const offset = isB ? size / 2 + 2 : -(size / 2 + 2)
  drawTriangle(ctx, x, yPx + offset, size, pointingDown, color)

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.fillStyle = theme.text

  const textY = isB ? yPx + offset + size / 2 + 12 : yPx + offset - size / 2 - 4
  const text = label ? `${label} ${strengthPct}%` : `${strengthPct}%`
  ctx.fillText(text, x, textY)

  const textMetrics = ctx.measureText(text)
  const hitY = textY - 8
  hits.push({
    x: x - textMetrics.width / 2 - 2,
    y: hitY,
    width: textMetrics.width + 4,
    height: 12,
    signal: sig,
  })

  ctx.restore()
  return isB ? 'buy' : 'sell'
}

function renderSingleAt(
  ctx: CanvasRenderingContext2D,
  item: { x: number; type: SignalPoint['type']; signal: SignalPoint },
  x: number,
  yPx: number,
  theme: SignalTheme,
  canvasWidth: number,
  phase: number,
  hits: HitTestRect[],
): SignalSide {
  const sig = item.signal
  const isStr = isStrong(sig.type)
  const isB = isBuy(sig.type)
  const color = getSignalColor(sig.type, theme)
  const baseSize = TRIANGLE_HALF * 2 * (sig.strength * 0.5 + 0.5)
  const size = isStr ? baseSize * STRONG_SCALE : baseSize

  ctx.save()

  if (isStr) {
    drawGlow(ctx, x, yPx, size, color, phase)
  } else {
    ctx.shadowColor = color
    ctx.shadowBlur = 4
  }

  const pointingDown = !isB
  const offset = isB ? size / 2 + 2 : -(size / 2 + 2)
  drawTriangle(ctx, x, yPx + offset, size, pointingDown, color)

  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  ctx.restore()
  return isB ? 'buy' : 'sell'
}

function mapperPriceY(ctx: CanvasRenderingContext2D, _price: number): number {
  const canvas = ctx.canvas
  return canvas ? canvas.height / 2 : 48
}

export function renderSignalLegend(
  ctx: CanvasRenderingContext2D,
  signals: SignalPoint[],
  x: number,
  y: number,
  theme: SignalTheme,
): void {
  let buyCount = 0
  let sellCount = 0
  let totalStrength = 0

  for (const sig of signals) {
    if (isBuy(sig.type)) buyCount++
    else if (sig.type === 'sell' || sig.type === 'strong_sell') sellCount++
    totalStrength += sig.strength
  }

  const avgStrength = signals.length > 0 ? Math.round((totalStrength / signals.length) * 100) : 0

  ctx.save()
  ctx.font = '10px JetBrains Mono, monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  ctx.fillStyle = theme.up
  ctx.fillText(`▲ ${buyCount}`, x, y)

  ctx.fillStyle = theme.text
  const buyW = ctx.measureText(`▲ ${buyCount}  `).width
  ctx.fillStyle = theme.down
  ctx.fillText(`▼ ${sellCount}`, x + buyW, y)

  ctx.fillStyle = theme.text
  const sellW = ctx.measureText(`▼ ${sellCount}  `).width
  ctx.fillStyle = theme.accentYellow
  ctx.fillText(`⚡ ${avgStrength}%`, x + buyW + sellW, y)

  ctx.restore()
}
