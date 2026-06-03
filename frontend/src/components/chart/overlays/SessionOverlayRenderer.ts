import type { Time, CandlestickData } from 'lightweight-charts'
import type { SessionTemplate } from '../../../data/sessionTemplates'

interface CoordMapper {
  timeToX(time: Time): number | null
  priceToY(price: number): number | null
}

function parseHHMM(str: string): number {
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}

function timeToMinutes(time: Time): number | null {
  const s = String(time)
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

export function renderSessionOverlay(
  ctx: CanvasRenderingContext2D,
  data: CandlestickData[],
  mapper: CoordMapper,
  canvasHeight: number,
  template: SessionTemplate
): void {
  if (data.length === 0) return

  ctx.save()

  const sessionColorMap = new Map<string, string>()
  const sessionColors = [
    'rgba(59,130,246,0.06)',
    'rgba(34,197,94,0.06)',
    'rgba(239,83,80,0.06)',
    'rgba(168,85,247,0.06)',
  ]
  template.sessions.forEach((s, i) => {
    sessionColorMap.set(s.label, sessionColors[i % sessionColors.length])
  })

  const bandCache = new Map<string, { left: number; width: number }>()

  for (let i = 0; i < data.length; i++) {
    const t = timeToMinutes(data[i].time)
    if (t == null) continue

    const activeSessions = template.sessions.filter((s) => {
      const open = parseHHMM(s.open)
      const close = parseHHMM(s.close)
      if (open < close) return t >= open && t < close
      return t >= open || t < close
    })

    if (activeSessions.length === 0) continue

    const label = activeSessions[0].label
    const x = mapper.timeToX(data[i].time)
    if (x == null) continue

    if (!bandCache.has(label)) {
      bandCache.set(label, { left: x, width: 0 })
    }
    const cached = bandCache.get(label)!
    cached.width = x - cached.left + 2
  }

  for (const [label, { left, width }] of bandCache) {
    const session = template.sessions.find((s) => s.label === label)
    if (!session) continue

    const fillColor = sessionColorMap.get(label) || 'rgba(59,130,246,0.06)'
    ctx.fillStyle = fillColor
    ctx.fillRect(left, 0, width, canvasHeight)

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left + width, 0)
    ctx.lineTo(left + width, canvasHeight)
    ctx.stroke()

    if (session.killZoneStart && session.killZoneEnd) {
      const kzOpen = parseHHMM(session.killZoneStart)
      const kzClose = parseHHMM(session.killZoneEnd)
      const kzData = data.filter((d) => {
        const mins = timeToMinutes(d.time)
        if (mins == null) return false
        if (kzOpen < kzClose) return mins >= kzOpen && mins < kzClose
        return mins >= kzOpen || mins < kzClose
      })
      if (kzData.length > 0) {
        const firstX = mapper.timeToX(kzData[0].time)
        const lastX = mapper.timeToX(kzData[kzData.length - 1].time)
        if (firstX != null && lastX != null) {
          ctx.fillStyle = 'rgba(239,83,80,0.08)'
          ctx.fillRect(firstX, 0, lastX - firstX + 2, canvasHeight)
        }
      }
    }
  }

  ctx.restore()
}
